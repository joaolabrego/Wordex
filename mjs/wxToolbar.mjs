// wxToolbar.mjs
// @ts-check
"use strict"

import wxConfig from "./wxConfig.mjs"
import wxPage from "./wxPage.mjs"
import wxRange from "./wxRange.mjs"
import wxPicture from "./wxPicture.mjs"
import wxSection from "./wxSection.mjs"
import wxAlignment from "./wxAlignment.mjs"

/** @typedef {import("./wxTypes.mjs").wxItem} wxItem */

export default class wxToolbar {
    /** @type {HTMLDivElement} */ #toolbar
    /** @type {HTMLSelectElement} */ #selectFontStyles
    /** @type {HTMLSelectElement} */ #selectAlignments
    /** @type {HTMLSelectElement} */ #selectFontFamily
    /** @type {HTMLSelectElement} */ #selectFontSize
    /** @type {HTMLSelectElement} */ #selectPaperFormats
    /** @type {HTMLSelectElement} */ #selectOrientations
    /** @type {HTMLSelectElement} */ #selectBorders
    /** @type {HTMLSelectElement} */ #selectBorderRadius
    /** @type {HTMLButtonElement} */ #buttonEditMode
    /** @type {HTMLInputElement} */ #inputFile
    /** @type {wxPage} */ #owner
    /** @type {string} */ #selectedColor = wxConfig.K_DEFAULT_COLOR

    /** @param {wxPage} owner */
    constructor(owner) {
        this.#owner = owner
        this.#toolbar = document.createElement("div")
        this.#toolbar.classList.add("toolbar")

        this.#toolbar.appendChild(
            this.#selectFontFamily = this.#createSelect(wxConfig.fontFamilyList,"Selecionar família da fonte", () => this.#setFontFamily())
        )

        // tamanho -> wxPage decide (seleção ou fallback)
        this.#toolbar.appendChild(
            this.#selectFontSize = this.#createSelect(wxConfig.fontSizeList, "Selecionar tamanho da fonte", () => this.#setFontSize())
        )

        // cor -> wxPage decide
        this.#toolbar.appendChild(this.#createInputColor())

        // estilos (b/i/u etc) — por enquanto via execCommand/wxConfig
        this.#toolbar.appendChild(
            this.#selectFontStyles = this.#createSelect(wxConfig.fontStyleList, "Estilizar texto/parágrafo selecionado", () => this.#setFontStyle())
        )

        // orientação / formato (mexem na largura da página)
        this.#toolbar.appendChild(
            this.#selectOrientations = this.#createSelect(wxConfig.pageOrientationList, "Selecionar orientação da página", () => this.#setOrientation())
        )

        this.#toolbar.appendChild(
            this.#selectPaperFormats = this.#createSelect(wxConfig.paperFormatList, "Selecionar formato da folha", () => this.#setPaperFormat())
        )

        // alinhamento -> wxPage decide alvo
        this.#toolbar.appendChild(
            this.#selectAlignments = this.#createSelect(wxConfig.alignmentList, "Selecionar alinhamento", () => this.#setAlignment())
        )

        // inserir imagem
        this.#toolbar.appendChild(this.#inputFile = this.#createInputFile())
        this.#toolbar.appendChild(this.#createButton("🖼️⬆", "Inserir imagem", () => this.#inputFile.click()))

        // resize / move genéricos -> wxPage decide alvo
        this.#toolbar.appendChild(this.#createButton("+", "Aumentar", () => wxPage.increase()))
        this.#toolbar.appendChild(this.#createButton("-", "Diminuir", () => wxPage.decrease()))
        this.#toolbar.appendChild(this.#createButton("▦+", "Inserir tabela", async () => this.#createTable())
        )
        this.#toolbar.appendChild(this.#createButton("⬅", "Mover esquerda", () => wxPage.left()))
        this.#toolbar.appendChild(this.#createButton("➡", "Mover direita", () => wxPage.right()))
        this.#toolbar.appendChild(this.#createButton("⬆", "Mover cima", () => wxPage.up()))
        this.#toolbar.appendChild(this.#createButton("⬇", "Mover baixo", () => wxPage.down()))

        // borda -> wxPage decide alvo (e recebe cor)
        this.#toolbar.appendChild(
            this.#selectBorders = this.#createSelect(wxConfig.borderList, "Selecionar borda", () => this.#setBorder())
        )

        // radius -> wxPage decide alvo
        this.#toolbar.appendChild(
            this.#selectBorderRadius = this.#createSelect(wxConfig.borderRadiusList, "Selecionar raio da borda", () => this.#setBorderRadius())
        )

        this.#toolbar.appendChild(this.#buttonEditMode = this.#createButton(wxConfig.K_INSERT_MODE, "Modo inserção/sobrescrita", () => this.#toggleEditMode()))
        
        this.#initializeDefaults()
    }

    /** @returns {HTMLDivElement} */
    get instance() {
        return this.#toolbar
    }

    #setFontStyle() {
        const value = this.#getHTMLSelectElementValue(this.#selectFontStyles)
        if (!value)
            return
        if (value === "none") {
            wxRange.clearInlineFormatting()
            return true
        }
        wxRange.restoreRange(wxRange.range)

        // 1) Se há seleção de texto → WordexText manda
        if (wxRange.hasSelection()) {
            wxRange.applyFontStyle(value)
            return
        }

        // 2) Sem seleção (por enquanto não faz nada)
        // depois você pode decidir comportamento tipo Word:
        // - setar estado futuro
        // - ou aplicar no parágrafo inteiro
    }
    #setFontFamily() {
        const value = this.#getHTMLSelectElementValue(this.#selectFontFamily)
        if (!value)
            return false
        wxRange.restoreRange(wxRange.range)

        const selection = window.getSelection()
        if (!!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed)
            return wxRange.setFontFamily(value)

        const paragraph = wxPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontFamily = value
            return true
        }

        const section = wxSection.getRoot()
        if (section) {
            section.style.fontFamily = value
            return true
        }

        return false
    }

    #setFontSize() {
        const value = this.#getHTMLSelectElementValue(this.#selectFontSize)
        if (!value)
            return false
        const size = wxConfig.fontSizeList.find((p) => p.value === value)
        if (!size)
            return false

        wxRange.restoreRange(wxRange.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection)
            return !!wxRange.setFontSize(value)

        const paragraph = wxPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontSize = size.value
            return true
        }
        const section = wxSection.getRoot()
        if (section) {
            section.style.fontSize = size.value
            return true
        }

        return false
    }

    #createInputColor() {
        const inputColor = document.createElement("input")
        inputColor.type = "color"
        inputColor.value = this.#selectedColor
        inputColor.title = "Selecionar cor de texto e bordas"
        inputColor.classList.add("control")
        inputColor.addEventListener("change", () => {
            this.#selectedColor = inputColor.value
            this.#owner.setColor(this.#selectedColor)
        })

        return inputColor
    }

    #createInputFile() {
        const inputFile = document.createElement("input")
        inputFile.type = "file"
        inputFile.accept = "image/*"
        inputFile.style.display = "none"
        inputFile.addEventListener("change", async () => {
            const file = this.#inputFile.files?.[0] ?? null
            await wxPicture.insertImageFromFile(file)
            this.#inputFile.value = ""
        })
        
        return inputFile
    }

    /**
     * @param {string} msg 
     * @param {number} def 
     * @param {number} min 
     * @param {number} max 
     * @returns 
     */
    #askInteger = (msg, def, min = 1, max = 99) => {
        const s = prompt(msg, String(def))
        if (s === null)
            return null
        const n = parseInt(s.trim(), 10)
        if (!Number.isFinite(n))
            return def
        return Math.min(max, Math.max(min, n))
    }

    async #createTable() {
        const rows = this.#askInteger("Quantidade de linhas:", 3, 1, 50)
        if (rows === null)
            return
        const cols = this.#askInteger("Quantidade de colunas:", 3, 1, 20)
        if (cols === null)
            return
        await wxPage.insertTable(rows, cols)
    }

    #setOrientation() {
        const value = this.#getHTMLSelectElementValue(this.#selectOrientations)
        if (!value)
            return
        const paper = wxConfig.paperFormatList.find((p) => p.selected)
        if (!paper)
            return
        if (value === wxConfig.K_LANDSCAPE)
            this.#owner.instance.style.width = paper.height ?? ""
        else
            this.#owner.instance.style.width = paper.width ?? ""

        return true
    }

    #setPaperFormat() {
        const value = this.#getHTMLSelectElementValue(this.#selectPaperFormats)
        if (!value)
            return false

        const orient = wxConfig.pageOrientationList.find(p => p.selected)
        if (!orient)
            return false

        const paper = wxConfig.paperFormatList.find(p => p.value === value)
        if (!paper)
            return false
        this.#owner.instance.style.width = (orient.value === wxConfig.K_LANDSCAPE ? paper.height : paper.width) ?? ""

        return true
    }

    #setAlignment() {
        const value = /** @type {"left"|"center"|"right"|"justify"} */(this.#getHTMLSelectElementValue(this.#selectAlignments))
        if (value)
            wxAlignment.align(value)
    }

    #setBorder() {
        const value = this.#getHTMLSelectElementValue(this.#selectBorders)
        wxPage.border(value, this.#selectedColor)
    }

    #setBorderRadius() {
        const value = this.#getHTMLSelectElementValue(this.#selectBorderRadius)
        wxPage.borderRadius(value)
    }


    /** aplica os defaults marcados no wxConfig (selected:true) */
    #initializeDefaults() {
        /**
         * @param {readonly wxItem[]} list
         * @param {HTMLSelectElement} select
         */
        const dispatchSelected = (list, select) => {
            const i = list.findIndex((item) => !!item.selected)
            if (i !== -1) {
                select.selectedIndex = i
                select.dispatchEvent(new Event("change", { bubbles: true }))
            }
        }

        dispatchSelected(wxConfig.fontStyleList, this.#selectFontStyles)
        dispatchSelected(wxConfig.alignmentList, this.#selectAlignments)
        dispatchSelected(wxConfig.fontFamilyList, this.#selectFontFamily)
        dispatchSelected(wxConfig.fontSizeList, this.#selectFontSize)
        dispatchSelected(wxConfig.paperFormatList, this.#selectPaperFormats)
        dispatchSelected(wxConfig.pageOrientationList, this.#selectOrientations)
        dispatchSelected(wxConfig.borderList, this.#selectBorders)
        dispatchSelected(wxConfig.borderRadiusList, this.#selectBorderRadius)
        this.editMode = wxConfig.K_INSERT_MODE

    }
    
    #toggleEditMode() {
        this.editMode = this.isInsertMode ? wxConfig.K_OVERWRITE_MODE : wxConfig.K_INSERT_MODE
    }
    /** @param {string} mode */
    set editMode(mode) {
        this.#buttonEditMode.textContent = mode
        const color = mode === wxConfig.K_OVERWRITE_MODE ? wxConfig.K_OVERWRITE_COLOR : wxConfig.K_INSERT_COLOR
        this.#buttonEditMode.style.background = color
        this.instance.style.caretColor = color
    }

    /**
     * @param {ReadonlyArray<wxItem>} templateList
     * @param {string} title
     * @param {(() => void)|undefined} [eventChange]
     * @returns {HTMLSelectElement}
     */
     #createSelect(templateList, title, eventChange = undefined) {
        const select = document.createElement("select")
        select.classList.add("control")
        select.title = title
        select.style.fontSize = "10px"
        select.style.fontWeight = "bold"

        this.#mountSelect(select, templateList)

        select.addEventListener("change", () => {
            if (eventChange)
                eventChange()
            this.#toggleSelectOption(select, templateList)
        })

        return select
    }

    /**
     * @param {HTMLSelectElement} selectElement
     * @param {ReadonlyArray<wxItem>} selectList
     * @param {string} [value]
     * @returns {HTMLSelectElement}
     */
    #mountSelect(selectElement, selectList, value = "") {
        let bold = true
        selectElement.options.length = 0

        selectList?.forEach((item) => {
            const option = document.createElement("option")
            option.style.fontSize = "10px"
            if (bold) {
                option.style.fontWeight = "bold"
                bold = false
            }
            option.value = item.value
            option.textContent = (item.selected ? wxConfig.K_OK : "") + item.text
            selectElement.appendChild(option)
        })
        return selectElement
    }

    /**
     * @param {HTMLSelectElement} selectElement
     * @param {ReadonlyArray<wxItem>} templateList
     */
     #toggleSelectOption(selectElement, templateList) {
        const value = selectElement.options[selectElement.selectedIndex].value
        if (!value) return

        templateList.forEach((item) => (item.selected = item.value === value))

        this.#mountSelect(selectElement, templateList, value)
    }

    /**
     * @param {string} textContent
     * @param {string} title
     * @param {(ev: MouseEvent) => void} functionClick
     * @returns {HTMLButtonElement}
     */
    #createButton(textContent, title, functionClick) {
        const button = document.createElement("button")
        button.textContent = textContent
        button.title = title
        button.classList.add("control")
        button.addEventListener("click", functionClick)
        return button
    }

    /**
     * @param {HTMLSelectElement} select
     */
    #getHTMLSelectElementValue(select) {
        if (select.selectedIndex < 0)
            return ""

        return select.options[select.selectedIndex].value
    }
    
    get isInsertMode() {
        return this.#buttonEditMode.textContent === wxConfig.K_INSERT_MODE
    }
    get isOverwriteMode() {
        return this.#buttonEditMode.textContent === wxConfig.K_OVERWRITE_MODE
    }
    /** @returns {`${typeof wxConfig.K_INSERT_MODE}|${typeof wxConfig.K_OVERWRITE_MODE}`} */
    get editMode() {
        return /** @type {`${typeof wxConfig.K_INSERT_MODE}|${typeof wxConfig.K_OVERWRITE_MODE}`} */ (this.#buttonEditMode.textContent);
    }
}
