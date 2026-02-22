// WordexToolbar.mjs
// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexPage from "./WordexPage.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexImage from "./WordexImage.mjs"
import WordexSection from "./WordexSection.mjs"
import WordexAlignment from "./WordexAlignment.mjs"

/**
 * @typedef {{
 *   value: string,
 *   text: string,
 *   width?: string,
 *   height?: string,
 *   tag?: string,
 *   selected?: boolean
 * }} Item
 */

export default class WordexToolbar {
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
    /** @type {WordexPage} */ #owner
    /** @type {string} */ #selectedColor = WordexConfig.K_DEFAULT_COLOR

    /** @param {WordexPage} owner */
    constructor(owner) {
        this.#owner = owner
        this.#toolbar = document.createElement("div")
        this.#toolbar.classList.add("toolbar")

        this.#toolbar.appendChild(
            this.#selectFontFamily = this.#createSelect(WordexConfig.fontFamilyList,"Selecionar família da fonte", () => this.#setFontFamily())
        )

        // tamanho -> WordexPage decide (seleção ou fallback)
        this.#toolbar.appendChild(
            this.#selectFontSize = this.#createSelect(WordexConfig.fontSizeList, "Selecionar tamanho da fonte", () => this.#setFontSize())
        )

        // cor -> WordexPage decide
        this.#toolbar.appendChild(this.#createInputColor())

        // estilos (b/i/u etc) — por enquanto via execCommand/WordexConfig
        this.#toolbar.appendChild(
            this.#selectFontStyles = this.#createSelect(WordexConfig.fontStyleList, "Estilizar texto/parágrafo selecionado", () => this.#setFontStyle())
        )

        // orientação / formato (mexem na largura da página)
        this.#toolbar.appendChild(
            this.#selectOrientations = this.#createSelect(WordexConfig.pageOrientationList, "Selecionar orientação da página", () => this.#setOrientation())
        )

        this.#toolbar.appendChild(
            this.#selectPaperFormats = this.#createSelect(WordexConfig.paperFormatList, "Selecionar formato da folha", () => this.#setPaperFormat())
        )

        // alinhamento -> WordexPage decide alvo
        this.#toolbar.appendChild(
            this.#selectAlignments = this.#createSelect(WordexConfig.alignmentList, "Selecionar alinhamento", () => this.#setAlignment())
        )

        // inserir imagem
        this.#toolbar.appendChild(this.#inputFile = this.#createInputFile())
        this.#toolbar.appendChild(this.#createButton("🖼️⬆", "Inserir imagem", () => this.#inputFile.click()))

        // resize / move genéricos -> WordexPage decide alvo
        this.#toolbar.appendChild(this.#createButton("+", "Aumentar", () => WordexPage.increase()))
        this.#toolbar.appendChild(this.#createButton("-", "Diminuir", () => WordexPage.decrease()))
        this.#toolbar.appendChild(this.#createButton("▦+", "Inserir tabela", async () => this.#createTable())
        )
        this.#toolbar.appendChild(this.#createButton("⬅", "Mover esquerda", () => WordexPage.left()))
        this.#toolbar.appendChild(this.#createButton("➡", "Mover direita", () => WordexPage.right()))
        this.#toolbar.appendChild(this.#createButton("⬆", "Mover cima", () => WordexPage.up()))
        this.#toolbar.appendChild(this.#createButton("⬇", "Mover baixo", () => WordexPage.down()))

        // borda -> WordexPage decide alvo (e recebe cor)
        this.#toolbar.appendChild(
            this.#selectBorders = this.#createSelect(WordexConfig.borderList, "Selecionar borda", () => this.#setBorder())
        )

        // radius -> WordexPage decide alvo
        this.#toolbar.appendChild(
            this.#selectBorderRadius = this.#createSelect(WordexConfig.borderRadiusList, "Selecionar raio da borda", () => this.#setBorderRadius())
        )

        this.#toolbar.appendChild(this.#buttonEditMode = this.#createButton(WordexConfig.K_INSERT_MODE, "Modo inserção/sobrescrita", () => this.#toggleEditMode()))
        
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
            WordexRange.clearInlineFormatting()
            return true
        }
        WordexRange.restoreRange(WordexRange.range)

        // 1) Se há seleção de texto → WordexText manda
        if (WordexRange.hasSelection()) {
            WordexRange.applyFontStyle(value)
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
        WordexRange.restoreRange(WordexRange.range)

        const selection = window.getSelection()
        if (!!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed)
            return WordexRange.setFontFamily(value)

        const paragraph = WordexPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontFamily = value
            return true
        }
        if (WordexSection.rootSection) {
            WordexSection.rootSection.style.fontFamily = value
            return true
        }

        return false
    }

    #setFontSize() {
        const value = this.#getHTMLSelectElementValue(this.#selectFontSize)
        if (!value)
            return false
        const size = WordexConfig.fontSizeList.find((p) => p.value === value)
        if (!size)
            return false

        WordexRange.restoreRange(WordexRange.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection)
            return !!WordexRange.setFontSize(value)

        const paragraph = WordexPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontSize = size.value
            return true
        }
        if (WordexSection.rootSection) {
            WordexSection.rootSection.style.fontSize = size.value
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
            await WordexImage.insertImageFromFile(file)
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
        await WordexPage.insertTable(rows, cols)
    }

    #setOrientation() {
        const value = this.#getHTMLSelectElementValue(this.#selectOrientations)
        if (!value)
            return
        const paper = WordexConfig.paperFormatList.find((p) => p.selected)
        if (!paper)
            return
        if (value === WordexConfig.K_LANDSCAPE)
            this.#owner.instance.style.width = paper.height ?? ""
        else
            this.#owner.instance.style.width = paper.width ?? ""

        return true
    }

    #setPaperFormat() {
        const value = this.#getHTMLSelectElementValue(this.#selectPaperFormats)
        if (!value)
            return false

        const orient = WordexConfig.pageOrientationList.find(p => p.selected)
        if (!orient)
            return false

        const paper = WordexConfig.paperFormatList.find(p => p.value === value)
        if (!paper)
            return false
        this.#owner.instance.style.width = (orient.value === WordexConfig.K_LANDSCAPE ? paper.height : paper.width) ?? ""

        return true
    }

    #setAlignment() {
        const value = /** @type {"left"|"center"|"right"|"justify"} */(this.#getHTMLSelectElementValue(this.#selectAlignments))
        if (value)
            WordexAlignment.align(value)
    }

    #setBorder() {
        const value = this.#getHTMLSelectElementValue(this.#selectBorders)
        WordexPage.border(value, this.#selectedColor)
    }

    #setBorderRadius() {
        const value = this.#getHTMLSelectElementValue(this.#selectBorderRadius)
        WordexPage.borderRadius(value)
    }


    /** aplica os defaults marcados no WordexConfig (selected:true) */
    #initializeDefaults() {
        /**
         * @param {readonly Item[]} list
         * @param {HTMLSelectElement} select
         */
        const dispatchSelected = (list, select) => {
            const i = list.findIndex((item) => !!item.selected)
            if (i !== -1) {
                select.selectedIndex = i
                select.dispatchEvent(new Event("change", { bubbles: true }))
            }
        }

        dispatchSelected(WordexConfig.fontStyleList, this.#selectFontStyles)
        dispatchSelected(WordexConfig.alignmentList, this.#selectAlignments)
        dispatchSelected(WordexConfig.fontFamilyList, this.#selectFontFamily)
        dispatchSelected(WordexConfig.fontSizeList, this.#selectFontSize)
        dispatchSelected(WordexConfig.paperFormatList, this.#selectPaperFormats)
        dispatchSelected(WordexConfig.pageOrientationList, this.#selectOrientations)
        dispatchSelected(WordexConfig.borderList, this.#selectBorders)
        dispatchSelected(WordexConfig.borderRadiusList, this.#selectBorderRadius)
        this.editMode = WordexConfig.K_INSERT_MODE

    }
    
    #toggleEditMode() {
        this.editMode = this.isInsertMode ? WordexConfig.K_OVERWRITE_MODE : WordexConfig.K_INSERT_MODE
    }
    /** @param {string} mode */
    set editMode(mode) {
        this.#buttonEditMode.textContent = mode
        const color = mode === WordexConfig.K_OVERWRITE_MODE ? WordexConfig.K_OVERWRITE_COLOR : WordexConfig.K_INSERT_COLOR
        this.#buttonEditMode.style.background = color
        this.instance.style.caretColor = color
    }

    /**
     * @param {ReadonlyArray<Item>} templateList
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
     * @param {ReadonlyArray<Item>} selectList
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
            option.textContent = (item.selected ? WordexConfig.K_OK : "") + item.text
            selectElement.appendChild(option)
        })
        return selectElement
    }

    /**
     * @param {HTMLSelectElement} selectElement
     * @param {ReadonlyArray<Item>} templateList
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
        return this.#buttonEditMode.textContent === WordexConfig.K_INSERT_MODE
    }
    get isOverwriteMode() {
        return this.#buttonEditMode.textContent === WordexConfig.K_OVERWRITE_MODE
    }
    /** @returns {`${typeof WordexConfig.K_INSERT_MODE}|${typeof WordexConfig.K_OVERWRITE_MODE}`} */
    get editMode() {
        return /** @type {`${typeof WordexConfig.K_INSERT_MODE}|${typeof WordexConfig.K_OVERWRITE_MODE}`} */ (this.#buttonEditMode.textContent);
    }
}
