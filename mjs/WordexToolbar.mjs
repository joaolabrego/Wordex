// WordexToolbar.mjs
// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Page from "./WordexPage.mjs"

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
  /** @type {HTMLDivElement} */ #el
  /** @type {HTMLStyleElement} */ #style

  /** @type {HTMLSelectElement} */ #selectFontStyles
  /** @type {HTMLSelectElement} */ #selectAlignments
  /** @type {HTMLSelectElement} */ #selectFontFamily
  /** @type {HTMLSelectElement} */ #selectFontSize
  /** @type {HTMLInputElement} */ #inputColor
  /** @type {HTMLSelectElement} */ #selectFormatSizes
  /** @type {HTMLSelectElement} */ #selectOrientations
  /** @type {HTMLSelectElement} */ #selectBorders
  /** @type {HTMLSelectElement} */ #selectBorderRadius

  /** @type {HTMLButtonElement} */ #buttonInsertImage
  /** @type {HTMLInputElement} */ #inputFile
  /** @type {HTMLButtonElement} */ #buttonIncrease
  /** @type {HTMLButtonElement} */ #buttonDecrease
  /** @type {HTMLButtonElement} */ #buttonInsertTable
  /** @type {HTMLButtonElement} */ #buttonMoveLeft
  /** @type {HTMLButtonElement} */ #buttonMoveRight
  /** @type {HTMLButtonElement} */ #buttonMoveUp
  /** @type {HTMLButtonElement} */ #buttonMoveDown
  /** @type {HTMLButtonElement} */ #buttonEditMode

  /** @type {HTMLDivElement} */ #divPage

    /**
     * @param {HTMLDivElement} divPage 
     */
    constructor(divPage) {
        this.#divPage = divPage
        this.#el = document.createElement("div")
        this.#el.classList.add("toolbar")

        this.#style = document.createElement("style")
        this.#style.textContent = Config.Script
        this.#el.appendChild(this.#style)

        // estilos (b/i/u etc) — por enquanto via execCommand/Config
        this.#el.appendChild(
            (this.#selectFontStyles = Config.createSelect(
                document,
                Config.fontStyleList,
                "Formatar texto selecionado",
                false,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectFontStyles)
                    if (!value) return
                    Config.restoreRange(Config.range)
                    Config.exec(value)
                }
            ))
        )

        // fonte -> Page decide (seleção ou fallback)
        this.#el.appendChild(
            (this.#selectFontFamily = Config.createSelect(
                document,
                Config.fontFamilyList,
                "Fonte",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectFontFamily)
                    if (value) Page.fontFamily(value)
                }
            ))
        )

        // tamanho -> Page decide (seleção ou fallback)
        this.#el.appendChild(
            (this.#selectFontSize = Config.createSelect(
                document,
                Config.fontSizeList,
                "Tamanho da fonte",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectFontSize)
                    if (!value) return
                    const size = Config.fontSizeList.find((p) => p.value === value)
                    if (!size) return
                    Page.fontSize(value, size.text)
                }
            ))
        )

        // cor -> Page decide
        this.#inputColor = document.createElement("input")
        this.#inputColor.type = "color"
        this.#inputColor.value = "#000000"
        this.#inputColor.title = "Cor do texto e bordas"
        this.#inputColor.classList.add("control")
        this.#inputColor.addEventListener("change", () => Page.color(this.#inputColor.value))
        this.#el.appendChild(this.#inputColor)

        // orientação / formato (mexem na largura da página)
        this.#el.appendChild(
            (this.#selectOrientations = Config.createSelect(
                document,
                Config.pageOrientationList,
                "Orientação da página",
                true,
                () => {
                    const paper = Config.paperFormatList.find((p) => p.selected)
                    console.log("paper", paper) 
                    if (!paper)
                        return
                    const value = Config.getHTMLSelectElementValue(this.#selectOrientations)
                    console.log("value", value)
                    const orient = Config.pageOrientationList.find((p) => p.value === value)
                    console.log("orient", orient)
                    if (!orient)
                        return
                    this.#divPage.style.width = (orient.value === "landscape" ? paper.height : paper.width) ?? ""
                }

            ))
        )

        this.#el.appendChild(
            (this.#selectFormatSizes = Config.createSelect(
                document,
                Config.paperFormatList,
                "Formato da folha",
                true,
                () => {
                    const orient = Config.pageOrientationList.find((p) => p.selected)
                    if (!orient)
                        return
                    const value = Config.getHTMLSelectElementValue(this.#selectFormatSizes)
                    const paper = Config.paperFormatList.find((p) => p.value === value)
                    if (!paper)
                        return
                    this.#divPage.style.width = (orient.value === "landscape" ? paper.height : paper.width) ?? ""
                }
            ))
        )

        // alinhamento -> Page decide alvo
        this.#el.appendChild(
            (this.#selectAlignments = Config.createSelect(
                document,
                Config.alignmentList,
                "Alinhamento",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectAlignments)
                    if (value) Page.align(value)
                }
            ))
        )

        // inserir imagem
        this.#el.appendChild(
            (this.#buttonInsertImage = Config.createButton("🖼️+", "Inserir imagem", () => this.#inputFile.click()))
        )

        this.#inputFile = document.createElement("input")
        this.#inputFile.type = "file"
        this.#inputFile.accept = "image/*"
        this.#inputFile.style.display = "none"
        this.#inputFile.addEventListener("change", async () => {
            const file = this.#inputFile.files?.[0] ?? null
            await Page.insertImageFromFile(file)
            this.#inputFile.value = ""
        })
        this.#el.appendChild(this.#inputFile)

        // resize / move genéricos -> Page decide alvo
        this.#el.appendChild((this.#buttonIncrease = Config.createButton("+", "Aumentar", () => Page.increase())))
        this.#el.appendChild((this.#buttonDecrease = Config.createButton("-", "Diminuir", () => Page.decrease())))
        this.#el.appendChild(this.#buttonInsertTable =
            Config.createButton("▦+", "Inserir tabela", async () => {
                const rows = Config.askInteger("Quantidade de linhas:", 3, 1, 50)
                if (rows === null)
                    return
                const cols = Config.askInteger("Quantidade de colunas:", 3, 1, 20)
                if (cols === null)
                    return
                await Page.insertTable(rows, cols)
            }))
        this.#el.appendChild((this.#buttonMoveLeft = Config.createButton("⬅", "Mover esquerda", () => Page.left())))
        this.#el.appendChild((this.#buttonMoveRight = Config.createButton("➡", "Mover direita", () => Page.right())))
        this.#el.appendChild((this.#buttonMoveUp = Config.createButton("⬆", "Mover cima", () => Page.up())))
        this.#el.appendChild((this.#buttonMoveDown = Config.createButton("⬇", "Mover baixo", () => Page.down())))

        // borda -> Page decide alvo (e recebe cor)
        this.#el.appendChild(
            (this.#selectBorders = Config.createSelect(
                document,
                Config.borderList,
                "Borda",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectBorders)
                    Page.border(value, this.#inputColor.value)
                }
            ))
        )

        // radius -> Page decide alvo
        this.#el.appendChild(
            (this.#selectBorderRadius = Config.createSelect(
                document,
                Config.borderRadiusList,
                "Raio da borda",
                true,
                () => {
                    const value = Config.getHTMLSelectElementValue(this.#selectBorderRadius)
                    Page.borderRadius(value)
                }
            ))
        )

        // INS/OVR -> Page (beforeinput já está lá)
        this.#el.appendChild(
            (this.#buttonEditMode = Config.createButton("INS", "Modo INS/OVR", () => {
                const mode = Page.toggleEditMode()
                this.#buttonEditMode.textContent = mode
                this.#buttonEditMode.style.background = mode === "OVR" ? "#8B0000" : "#006400"
            }))
        )
        this.#buttonEditMode.style.color = "#fff"
        this.#buttonEditMode.style.background = "#006400"
    }

    /** @returns {HTMLDivElement} */
    get element() {
        return this.#el
    }

    /** aplica os defaults marcados no Config (selected:true) */
    initializeDefaults() {
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
    }
}
