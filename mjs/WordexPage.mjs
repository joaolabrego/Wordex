// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexEdit from "./WordexEdit.mjs"
import WordexImage from "./WordexImage.mjs"
import WordexParagraph from "./WordexParagraph.mjs"
import WordexFormat from "./WordexFormat.mjs"
import WordexTable from "./WordexTable.mjs"
import WordexTableCell from "./WordexTableCell.mjs"
import WordexTableRow from "./WordexTableRow.mjs"
import WordexTableCol from "./WordexTableCol.mjs"
import WordexToolbar from "./WordexToolbar.mjs"
import WordexTemplate from "./WordexTemplate.mjs"
import WordexSection from "./WordexSection.mjs"
import WordexRange from "./WordexRange.mjs"
export default class WordexPage {
    /** @type {"INS"|"OVR"} */

    /** @type {WordexTemplate} */ #template
    /** @type {HTMLDivElement} */ #page
    /** @type {WordexSection} */ #header
    /** @type {WordexSection} */ #body
    /** @type {WordexSection} */ #footer
    /** @type {WordexToolbar} */ #toolbar

    /** @param {WordexTemplate} template */
    constructor(template) {
        this.#template = template
        this.#toolbar = template.toolbar
        this.#page = document.createElement("div")
        this.#page.classList.add("page")
        this.#page.style.caretColor = "#0B6E4F"
        this.#page.addEventListener("beforeinput", (e) => {
            if (this.#toolbar.isOverwriteMode)
                WordexEdit.handleOverwriteInput(e)
        })

        this.#header = new WordexSection(this, "header", "Cabeçalho: clique para editar")
        this.#page.appendChild(this.#header.instance)

        this.#body = new WordexSection(this, "body", "Corpo do documento: clique para editar")
        this.#page.appendChild(this.#body.instance)

        this.#footer = new WordexSection(this, "footer", "Rodapé: clique para editar")
        this.#page.appendChild(this.#footer.instance)
        
        WordexSection.rootSection = this.#body.instance

        // Registra handlers de clique para parágrafo, tabela e imagem em cada seção editável
        for (const section of [this.#header, this.#body, this.#footer]) {
            WordexParagraph.attach(section.instance)
            WordexTable.attach(section.instance)
            WordexImage.attach(section.instance)
        }

        document.addEventListener("selectionchange", () => WordexRange.saveSelection())
    }
    get instance() {
        return this.#page
    }
    get header() {
        return this.#header
    }
    get body() {
        return this.#body
    }
    get footer() {
        return this.#footer
    }
    /** @param {string} hex */
    setColor(hex) {
        if (!hex)
            return false
        WordexRange.restoreRange(WordexRange.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed
        if (hasSelection) {
            return WordexFormat.setFontColor(hex)
        }

        const paragraph = WordexPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.color = hex
            return true
        }
        if (WordexSection.rootSection) {
            WordexSection.rootSection.style.color = hex
            return true
        }

        return false
    }

    /** 
     * @param {number} rows 
     * @param {number} cols
     */
    static async insertTable(rows = 2, cols = 2) {
        if (!WordexTable || typeof WordexTable.insertAtSelection !== "function")
            return false
        return !!WordexTable.insertAtSelection(rows, cols)
    }    

    // =========================================================
    // Helpers
    // =========================================================
    /**
     * Chama um método se existir (duck typing), sem TS reclamar.
     * @param {any} obj
     * @param {string} method
     * @param  {...any} args
     */
    static #callIfExists(obj, method, ...args) {
        const fn = obj?.[method]
        if (typeof fn !== "function") return undefined
        return fn.apply(obj, args)
    }

    /** @returns {HTMLTableElement|null} */
    static #getActiveTable() {
        const cell = WordexPage.#callIfExists(WordexTableCell, "getActive")
        if (cell) return /** @type {HTMLTableElement|null} */ (cell.closest("table"))

        const tr = WordexPage.#callIfExists(WordexTableRow, "getActive")
        if (tr) return /** @type {HTMLTableElement|null} */ (tr.closest("table"))

        const col = WordexPage.#callIfExists(WordexTableCol, "getActive")
        if (col?.table) return col.table

        return null
    }

    /** @returns {HTMLDivElement|null} */
    static getParagraphTarget() {
        const fp = WordexPage.#callIfExists(WordexParagraph, "getFocused")
        if (fp) return fp
        WordexRange.restoreRange(WordexRange.range)

        return WordexConfig.getActiveParagraph()
    }

    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const target = WordexPage.selectedTarget()

        // 1) imagem: usa alvo focado
        if (target.kind === "image") {
            WordexImage.align(dir)
            return true
        }

        // 2) tabela (célula/linha/col/tabela inteira)
        if (target.kind === "cell" || target.kind === "row" || target.kind === "col" || target.kind === "table") {
            if (dir === "left")
                WordexTable.alignLeft()
            else if (dir === "right")
                WordexTable.alignRight()
            else
                WordexTable.alignCenter()

            return true
        }

        // 3) parágrafo/texto: execCommand
        if (dir === "left") WordexConfig.exec("justifyLeft")
        if (dir === "center") WordexConfig.exec("justifyCenter")
        if (dir === "right") WordexConfig.exec("justifyRight")
        //if (dir === "full") WordexConfig.exec("justifyFull")
        return true
    }


    // =========================================================
    // Resolver (Cell -> Row -> Col -> WordexImage -> Text -> WordexParagraph)
    // =========================================================
    static selectedTarget() {
        if (WordexPage.#callIfExists(WordexTableCell, "hasSelection") || WordexPage.#callIfExists(WordexTableCell, "hasActive"))
            return { kind: "cell", obj: WordexTableCell }

        if (WordexPage.#callIfExists(WordexTableRow, "hasSelection") || WordexPage.#callIfExists(WordexTableRow, "hasActive"))
            return { kind: "row", obj: WordexTableRow }

        const table = WordexPage.#getActiveTable()
        if ((table && WordexPage.#callIfExists(WordexTableCol, "hasSelection", table)) || WordexPage.#callIfExists(WordexTableCol, "hasActive"))
            return { kind: "col", obj: WordexTableCol }

        if (WordexImage.hasFocus()) return { kind: "image", obj: WordexImage }

        if (WordexTable.hasFocus()) return { kind: "table", obj: WordexTable }

        if (WordexRange.hasSelection()) return { kind: "text", obj: WordexRange }

        return { kind: "paragraph", obj: WordexParagraph }
    }

    // =========================================================
    // WordexToolbar verbs
    // =========================================================


    /** @param {string} widthPx @param {string} color */
    static border(widthPx, color) {
        WordexRange.restoreRange(WordexRange.range)

        if (WordexTable.applyBorder(widthPx, color)) return true
        if (WordexImage.applyBorder(widthPx, color)) return true

        const p = WordexPage.getParagraphTarget()
        if (!p) return false
        p.style.borderStyle = widthPx === "0px" ? "none" : "solid"
        p.style.borderWidth = widthPx
        p.style.borderColor = color
        p.style.padding = "2px 4px"
        return true
    }
    /** @param {string} radiusPx */
    static borderRadius(radiusPx) {
        WordexRange.restoreRange(WordexRange.range)

        if (WordexTable.applyBorderRadius(radiusPx)) return true
        if (WordexImage.applyBorderRadius(radiusPx)) return true

        const p = WordexPage.getParagraphTarget()
        if (!p) return false
        p.style.borderRadius = radiusPx
        return true
    }

    static increase() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.increase(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.increase(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "increase")
    }

    static decrease() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.decrease(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.decrease(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "decrease")
    }

    static left() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.moveLeftWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.moveLeftWord(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "left")
    }

    static right() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.moveRightWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.moveRightWord(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "right")
    }

    static up() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.moveUp(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.moveUp(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "up")
    }

    static down() {
        const t = WordexPage.selectedTarget()
        if (t.kind === "image") { const img = WordexImage.getFocused(); if (img) WordexImage.moveDown(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = WordexTable.getFocused(); if (table) WordexTable.moveDown(table); return true }
        return !WordexPage.#callIfExists(WordexParagraph, "down")
    }
}