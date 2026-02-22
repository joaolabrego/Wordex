// WordexToolbar.mjs
// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Format from "./WordexFormat.mjs"
import Page from "./WordexPage.mjs"
import Table from "./WordexTable.mjs"
import Image from "./WordexImage.mjs"

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

export default class Toolbar {
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
    /** @type {Page} */ #owner

    /** @param {Page} owner */
    constructor(owner) {
        this.#owner = owner
        this.#toolbar = document.createElement("div")
        this.#toolbar.classList.add("toolbar")

        // estilos (b/i/u etc) — por enquanto via execCommand/Config
        this.#toolbar.appendChild(
            (this.#selectFontStyles = Config.createSelect(
                document,
                Config.fontStyleList,
                "Formatar texto/parágrafo selecionado",
                false,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectFontStyles)
                    if (!value)
                        return
                    Config.restoreRange(Config.range)
                    Config.exec(value)
                }
            ))
        )

        this.#toolbar.appendChild(
            this.#selectFontFamily = Config.createSelect(
                document,
                Config.fontFamilyList,
                "Fonte",
                true,
                () => this.#setFontFamily()
            )
        )

        // tamanho -> Page decide (seleção ou fallback)
        this.#toolbar.appendChild(
            this.#selectFontSize = Config.createSelect(
                document,
                Config.fontSizeList,
                "Tamanho da fonte",
                true,
                () => this.#setFontSize()
            )
        )

        // cor -> Page decide
        this.#inputColor = document.createElement("input")
        this.#inputColor.type = "color"
        this.#inputColor.value = "#000000"
        this.#inputColor.title = "Cor do texto e bordas"
        this.#inputColor.classList.add("control")
        this.#inputColor.addEventListener("change", () => this.#owner.setColor(this.#inputColor.value))
        this.#toolbar.appendChild(this.#inputColor)

        // orientação / formato (mexem na largura da página)
        this.#toolbar.appendChild(
            this.#selectOrientations = Config.createSelect(
                document,
                Config.pageOrientationList,
                "Orientação da página",
                true,
                () => this.#setOrientation()
            )
        )

        this.#toolbar.appendChild(
            this.#selectFormatSizes = Config.createSelect(
                document,
                Config.paperFormatList,
                "Formato da folha",
                true,
                () => this.#setPaperFormat()
            )
        )

        // alinhamento -> Page decide alvo
        this.#toolbar.appendChild(
            (this.#selectAlignments = Config.createSelect(
                document,
                Config.alignmentList,
                "Alinhamento",
                true,
                () => {
                    const value = /** @type {"left"|"center"|"right"} */(Config.getHTMLSelectElementValue(this.#selectAlignments))
                    if (value) Page.align(value)
                }
            ))
        )

        // inserir imagem
        this.#toolbar.appendChild(
            (this.#buttonInsertImage = Config.createButton("🖼️+", "Inserir imagem", () => this.#inputFile.click()))
        )

        this.#inputFile = document.createElement("input")
        this.#inputFile.type = "file"
        this.#inputFile.accept = "image/*"
        this.#inputFile.style.display = "none"
        this.#inputFile.addEventListener("change", async () => {
            const file = this.#inputFile.files?.[0] ?? null
            await Image.insertImageFromFile(file)
            this.#inputFile.value = ""
        })
        this.#toolbar.appendChild(this.#inputFile)

        // resize / move genéricos -> Page decide alvo
        this.#toolbar.appendChild((this.#buttonIncrease = Config.createButton("+", "Aumentar", () => Page.increase())))
        this.#toolbar.appendChild((this.#buttonDecrease = Config.createButton("-", "Diminuir", () => Page.decrease())))
        this.#toolbar.appendChild(this.#buttonInsertTable =
            Config.createButton("▦+", "Inserir tabela", async () => {
                const rows = Config.askInteger("Quantidade de linhas:", 3, 1, 50)
                if (rows === null)
                    return
                const cols = Config.askInteger("Quantidade de colunas:", 3, 1, 20)
                if (cols === null)
                    return
                await Page.insertTable(rows, cols)
            })
        )
        this.#toolbar.appendChild((this.#buttonMoveLeft = Config.createButton("⬅", "Mover esquerda", () => Page.left())))
        this.#toolbar.appendChild((this.#buttonMoveRight = Config.createButton("➡", "Mover direita", () => Page.right())))
        this.#toolbar.appendChild((this.#buttonMoveUp = Config.createButton("⬆", "Mover cima", () => Page.up())))
        this.#toolbar.appendChild((this.#buttonMoveDown = Config.createButton("⬇", "Mover baixo", () => Page.down())))

        // borda -> Page decide alvo (e recebe cor)
        this.#toolbar.appendChild(
            this.#selectBorders = Config.createSelect(
                document,
                Config.borderList,
                "Borda",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectBorders)
                    Page.border(value, this.#inputColor.value)
                }
            )
        )

        // radius -> Page decide alvo
        this.#toolbar.appendChild(
            this.#selectBorderRadius = Config.createSelect(
                document,
                Config.borderRadiusList,
                "Raio da borda",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectBorderRadius)
                    Page.borderRadius(value)
                }
            )
        )

        this.#toolbar.appendChild(this.#buttonEditMode = Config.createButton(Config.K_INSERT_MODE, "Modo inserção/sobrescrita",
            () => this.#toogleEditMode()))
        
        this.#initializeDefaults()
    }

    /** @returns {HTMLDivElement} */
    get instance() {
        return this.#toolbar
    }

    #setFontFamily() {
        const value = Config.getHTMLSelectElementValue(this.#selectFontFamily)
        if (!value)
            return false
        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        if (!!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed)
            return Format.setFontFamily(value)

        const paragraph = Page.getParagraphTarget()
        if (paragraph)
        {
            paragraph.style.fontFamily = value
            return true
        }
        if (Config.rootSection) {
            Config.rootSection.style.fontFamily = value
            return true
        }

        return false
    }    

    #setFontSize() {
        const value = Config.getHTMLSelectElementValue(this.#selectFontSize)
        if (!value)
            return
        const size = Config.fontSizeList.find((p) => p.value === value)
        if (!size)
            return

        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection) {
            if (/^[1-7]$/.test(value))
                return !!Format.setFontSize(value)
            return false
        }

        const paragraph = Page.getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontSize = size.value
            return true
        }
        if (Config.rootSection) {
            Config.rootSection.style.fontSize = size.value
            return true
        }

        return false
    }

    #setOrientation() {
        const value = Config.getHTMLSelectElementValue(this.#selectOrientations)
        if (!value)
            return
        const paper = Config.paperFormatList.find((p) => p.selected)
        if (!paper)
            return
        if (value === Config.K_LANDSCAPE)
            this.#owner.instance.style.width = paper.height ?? ""
        else
            this.#owner.instance.style.width = paper.width ?? ""

        return true
    }

    #setPaperFormat() {
        const value = Config.getHTMLSelectElementValue(this.#selectFormatSizes)
        if (!value)
            return false

        const orient = Config.pageOrientationList.find(p => p.selected)
        if (!orient)
            return false

        const paper = Config.paperFormatList.find(p => p.value === value)
        if (!paper)
            return false
        this.#owner.instance.style.width = (orient.value === Config.K_LANDSCAPE ? paper.height : paper.width) ?? ""

        return true
    }

    /** aplica os defaults marcados no Config (selected:true) */
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

        dispatchSelected(Config.fontStyleList, this.#selectFontStyles)
        dispatchSelected(Config.alignmentList, this.#selectAlignments)
        dispatchSelected(Config.fontFamilyList, this.#selectFontFamily)
        dispatchSelected(Config.fontSizeList, this.#selectFontSize)
        dispatchSelected(Config.paperFormatList, this.#selectFormatSizes)
        dispatchSelected(Config.pageOrientationList, this.#selectOrientations)
        dispatchSelected(Config.borderList, this.#selectBorders)
        dispatchSelected(Config.borderRadiusList, this.#selectBorderRadius)
        this.editMode = Config.K_INSERT_MODE
    }
    
    #toogleEditMode() {
        this.editMode = this.isInsertMode ? Config.K_OVERWRITE_MODE : Config.K_INSERT_MODE
    }
    get isInsertMode() {
        return this.#buttonEditMode.textContent === Config.K_INSERT_MODE
    }
    get isOverwriteMode() {
        return this.#buttonEditMode.textContent === Config.K_OVERWRITE_MODE
    }
    /** @returns {`${typeof Config.K_INSERT_MODE}|${typeof Config.K_OVERWRITE_MODE}`} */
    get editMode() {
        return /** @type {`${typeof Config.K_INSERT_MODE}|${typeof Config.K_OVERWRITE_MODE}`} */ (this.#buttonEditMode.textContent);
    }

    /** @param {string} mode */
    set editMode(mode) {
        this.#buttonEditMode.textContent = mode
        const color = mode === Config.K_OVERWRITE_MODE ? "#8B0000" : "#006400"
        this.#buttonEditMode.style.background = color
        this.instance.style.caretColor = color
    }
}
