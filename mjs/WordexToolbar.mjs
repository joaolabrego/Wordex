// WordexToolbar.mjs
// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexFormat from "./WordexFormat.mjs"
import WordexPage from "./WordexPage.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexImage from "./WordexImage.mjs"
import WordexSection from "./WordexSection.mjs"

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
    /** @type {HTMLSelectElement} */ #selectFormatSizes
    /** @type {HTMLSelectElement} */ #selectOrientations
    /** @type {HTMLSelectElement} */ #selectBorders
    /** @type {HTMLSelectElement} */ #selectBorderRadius
    /** @type {HTMLButtonElement} */ #buttonInsertImage
    /** @type {HTMLButtonElement} */ #buttonIncrease
    /** @type {HTMLButtonElement} */ #buttonDecrease
    /** @type {HTMLButtonElement} */ #buttonInsertTable
    /** @type {HTMLButtonElement} */ #buttonMoveLeft
    /** @type {HTMLButtonElement} */ #buttonMoveRight
    /** @type {HTMLButtonElement} */ #buttonMoveUp
    /** @type {HTMLButtonElement} */ #buttonMoveDown
    /** @type {HTMLButtonElement} */ #buttonEditMode
    /** @type {HTMLInputElement} */ #inputColor
    /** @type {HTMLInputElement} */ #inputFile
    /** @type {WordexPage} */ #owner

    /** @param {WordexPage} owner */
    constructor(owner) {
        this.#owner = owner
        this.#toolbar = document.createElement("div")
        this.#toolbar.classList.add("toolbar")

        // estilos (b/i/u etc) — por enquanto via execCommand/WordexConfig
        this.#toolbar.appendChild(
            (this.#selectFontStyles = WordexConfig.createSelect(
                document,
                WordexConfig.fontStyleList,
                "Formatar texto/parágrafo selecionado",
                false,
                () => this.#setFontStyle()
            ))
        )

        this.#toolbar.appendChild(
            this.#selectFontFamily = WordexConfig.createSelect(
                document,
                WordexConfig.fontFamilyList,
                "Fonte",
                true,
                () => this.#setFontFamily()
            )
        )

        // tamanho -> WordexPage decide (seleção ou fallback)
        this.#toolbar.appendChild(
            this.#selectFontSize = WordexConfig.createSelect(
                document,
                WordexConfig.fontSizeList,
                "Tamanho da fonte",
                true,
                () => this.#setFontSize()
            )
        )

        // cor -> WordexPage decide
        this.#inputColor = document.createElement("input")
        this.#inputColor.type = "color"
        this.#inputColor.value = "#000000"
        this.#inputColor.title = "Cor do texto e bordas"
        this.#inputColor.classList.add("control")
        this.#inputColor.addEventListener("change", () => this.#owner.setColor(this.#inputColor.value))
        this.#toolbar.appendChild(this.#inputColor)

        // orientação / formato (mexem na largura da página)
        this.#toolbar.appendChild(
            this.#selectOrientations = WordexConfig.createSelect(
                document,
                WordexConfig.pageOrientationList,
                "Orientação da página",
                true,
                () => this.#setOrientation()
            )
        )

        this.#toolbar.appendChild(
            this.#selectFormatSizes = WordexConfig.createSelect(
                document,
                WordexConfig.paperFormatList,
                "Formato da folha",
                true,
                () => this.#setPaperFormat()
            )
        )

        // alinhamento -> WordexPage decide alvo
        this.#toolbar.appendChild(
            (this.#selectAlignments = WordexConfig.createSelect(
                document,
                WordexConfig.alignmentList,
                "Alinhamento",
                true,
                () => {
                    const value = /** @type {"left"|"center"|"right"} */(WordexConfig.getHTMLSelectElementValue(this.#selectAlignments))
                    if (value) WordexPage.align(value)
                }
            ))
        )

        // inserir imagem
        this.#toolbar.appendChild(this.#buttonInsertImage = WordexConfig.createButton("🖼️+", "Inserir imagem", () => this.#inputFile.click()))

        this.#inputFile = document.createElement("input")
        this.#inputFile.type = "file"
        this.#inputFile.accept = "image/*"
        this.#inputFile.style.display = "none"
        this.#inputFile.addEventListener("change", async () => {
            const file = this.#inputFile.files?.[0] ?? null
            await WordexImage.insertImageFromFile(file)
            this.#inputFile.value = ""
        })
        this.#toolbar.appendChild(this.#inputFile)

        // resize / move genéricos -> WordexPage decide alvo
        this.#toolbar.appendChild((this.#buttonIncrease = WordexConfig.createButton("+", "Aumentar", () => WordexPage.increase())))
        this.#toolbar.appendChild((this.#buttonDecrease = WordexConfig.createButton("-", "Diminuir", () => WordexPage.decrease())))
        this.#toolbar.appendChild(this.#buttonInsertTable =
            WordexConfig.createButton("▦+", "Inserir tabela", async () => {
                const rows = WordexConfig.askInteger("Quantidade de linhas:", 3, 1, 50)
                if (rows === null)
                    return
                const cols = WordexConfig.askInteger("Quantidade de colunas:", 3, 1, 20)
                if (cols === null)
                    return
                await WordexPage.insertTable(rows, cols)
            })
        )
        this.#toolbar.appendChild((this.#buttonMoveLeft = WordexConfig.createButton("⬅", "Mover esquerda", () => WordexPage.left())))
        this.#toolbar.appendChild((this.#buttonMoveRight = WordexConfig.createButton("➡", "Mover direita", () => WordexPage.right())))
        this.#toolbar.appendChild((this.#buttonMoveUp = WordexConfig.createButton("⬆", "Mover cima", () => WordexPage.up())))
        this.#toolbar.appendChild((this.#buttonMoveDown = WordexConfig.createButton("⬇", "Mover baixo", () => WordexPage.down())))

        // borda -> WordexPage decide alvo (e recebe cor)
        this.#toolbar.appendChild(
            this.#selectBorders = WordexConfig.createSelect(
                document,
                WordexConfig.borderList,
                "Borda",
                true,
                () => {
                    const value = WordexConfig.getHTMLSelectElementValue(this.#selectBorders)
                    WordexPage.border(value, this.#inputColor.value)
                }
            )
        )

        // radius -> WordexPage decide alvo
        this.#toolbar.appendChild(
            this.#selectBorderRadius = WordexConfig.createSelect(
                document,
                WordexConfig.borderRadiusList,
                "Raio da borda",
                true,
                () => {
                    const value = WordexConfig.getHTMLSelectElementValue(this.#selectBorderRadius)
                    WordexPage.borderRadius(value)
                }
            )
        )

        this.#toolbar.appendChild(this.#buttonEditMode = WordexConfig.createButton(WordexConfig.K_INSERT_MODE, "Modo inserção/sobrescrita",
            () => this.#toggleEditMode()))
        
        this.#initializeDefaults()
    }

    /** @returns {HTMLDivElement} */
    get instance() {
        return this.#toolbar
    }

    #setFontStyle() {
        const value = WordexConfig.getHTMLSelectElementValue(this.#selectFontStyles)
        if (!value)
            return

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
        const value = WordexConfig.getHTMLSelectElementValue(this.#selectFontFamily)
        if (!value)
            return false
        WordexRange.restoreRange(WordexRange.range)

        const selection = window.getSelection()
        if (!!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed)
            return WordexRange.setFontFamily(value)

        const paragraph = WordexPage.getParagraphTarget()
        if (paragraph)
        {
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
        const value = WordexConfig.getHTMLSelectElementValue(this.#selectFontSize)
        if (!value)
            return
        const size = WordexConfig.fontSizeList.find((p) => p.value === value)
        if (!size)
            return

        WordexRange.restoreRange(WordexRange.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection) {
            if (/^[1-7]$/.test(value))
                return !!WordexFormat.setFontSize(value)
            return false
        }

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

    #setOrientation() {
        const value = WordexConfig.getHTMLSelectElementValue(this.#selectOrientations)
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
        const value = WordexConfig.getHTMLSelectElementValue(this.#selectFormatSizes)
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
        dispatchSelected(WordexConfig.paperFormatList, this.#selectFormatSizes)
        dispatchSelected(WordexConfig.pageOrientationList, this.#selectOrientations)
        dispatchSelected(WordexConfig.borderList, this.#selectBorders)
        dispatchSelected(WordexConfig.borderRadiusList, this.#selectBorderRadius)
        this.editMode = WordexConfig.K_INSERT_MODE
    }
    
    #toggleEditMode() {
        this.editMode = this.isInsertMode ? WordexConfig.K_OVERWRITE_MODE : WordexConfig.K_INSERT_MODE
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

    /** @param {string} mode */
    set editMode(mode) {
        this.#buttonEditMode.textContent = mode
        const color = mode === WordexConfig.K_OVERWRITE_MODE ? "#8B0000" : "#006400"
        this.#buttonEditMode.style.background = color
        this.instance.style.caretColor = color
    }
}
