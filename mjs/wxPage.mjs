// @ts-check
"use strict"

import wxEdit from "./wxEdit.mjs"
import wxPicture from "./wxPicture.mjs"
import wxParagraph from "./wxParagraph.mjs"
import wxGrid from "./wxGrid.mjs"
import wxTableCell from "./wxTableCell.mjs"
import wxTableRow from "./wxTableRow.mjs"
import wxTableCol from "./wxTableCol.mjs"
import wxTemplate from "./wxTemplate.mjs"
import wxSection from "./wxSection.mjs"
import wxRange from "./wxRange.mjs"
export default class wxPage {
    /** @type {"INS"|"OVR"} */

    /** @type {wxTemplate} */ #template
    /** @type {HTMLDivElement} */ #page
    /** @type {wxSection} */ #header
    /** @type {wxSection} */ #body
    /** @type {wxSection} */ #footer

    /** @param {wxTemplate} template */
    constructor(template) {
        this.#template = template
        this.#page = document.createElement("div")
        this.#page.classList.add("page")
        this.#page.style.caretColor = "#0B6E4F"
        this.#page.addEventListener("beforeinput", (e) => {
            if (template.toolbar.isOverwriteMode)
                wxEdit.handleOverwriteInput(e)
        })

        this.#header = new wxSection(this, "header", "Cabeçalho: clique para editar")
        this.#page.appendChild(this.#header.instance)

        this.#body = new wxSection(this, "body", "Corpo do documento: clique para editar")
        this.#page.appendChild(this.#body.instance)

        this.#footer = new wxSection(this, "footer", "Rodapé: clique para editar")
        this.#page.appendChild(this.#footer.instance)
        
        wxSection.rootSection = this.#body.instance

        // Registra handlers de clique para parágrafo, tabela e imagem em cada seção editável
        for (const section of [this.#header, this.#body, this.#footer]) {
            wxParagraph.attach(section.instance)
            wxGrid.attach(section.instance)
            wxPicture.attach(section.instance)
        }

        document.addEventListener("selectionchange", () => wxRange.saveSelection())
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
        wxRange.restoreRange(wxRange.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed
        if (hasSelection) {
            return wxRange.setFontColor(hex)
        }

        const paragraph = wxPage.getParagraphTarget()
        if (paragraph) {
            paragraph.style.color = hex
            return true
        }
        if (wxSection.rootSection) {
            wxSection.rootSection.style.color = hex
            return true
        }

        return false
    }

    /** 
     * @param {number} rows 
     * @param {number} cols
     */
    static async insertTable(rows = 2, cols = 2) {
        if (!wxGrid || typeof wxGrid.insertAtSelection !== "function")
            return false
        return !!wxGrid.insertAtSelection(rows, cols)
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
        const cell = wxPage.#callIfExists(wxTableCell, "getActive")
        if (cell) return /** @type {HTMLTableElement|null} */ (cell.closest("table"))

        const tr = wxPage.#callIfExists(wxTableRow, "getActive")
        if (tr) return /** @type {HTMLTableElement|null} */ (tr.closest("table"))

        const col = wxPage.#callIfExists(wxTableCol, "getActive")
        if (col?.table) return col.table

        return null
    }

    /** @returns {HTMLDivElement|null} */
    static getParagraphTarget() {
        const fp = wxPage.#callIfExists(wxParagraph, "getFocused")
        if (fp) return fp
        wxRange.restoreRange(wxRange.range)

        return wxParagraph.getActive()
    }



    // =========================================================
    // Resolver (Cell -> Row -> Col -> wxPicture -> Text -> wxParagraph)
    // =========================================================
    static selectedTarget() {
        if (wxPage.#callIfExists(wxTableCell, "hasSelection") || wxPage.#callIfExists(wxTableCell, "hasActive"))
            return { kind: "cell", obj: wxTableCell }

        if (wxPage.#callIfExists(wxTableRow, "hasSelection") || wxPage.#callIfExists(wxTableRow, "hasActive"))
            return { kind: "row", obj: wxTableRow }

        const table = wxPage.#getActiveTable()
        if ((table && wxPage.#callIfExists(wxTableCol, "hasSelection", table)) || wxPage.#callIfExists(wxTableCol, "hasActive"))
            return { kind: "col", obj: wxTableCol }

        if (wxPicture.hasFocus()) return { kind: "image", obj: wxPicture }

        if (wxGrid.hasFocus()) return { kind: "table", obj: wxGrid }

        if (wxRange.hasSelection()) return { kind: "text", obj: wxRange }

        return { kind: "paragraph", obj: wxParagraph }
    }

    // =========================================================
    // wxToolbar verbs
    // =========================================================


    /** @param {string} widthPx @param {string} color */
    static border(widthPx, color) {
        wxRange.restoreRange(wxRange.range)

        if (wxGrid.applyBorder(widthPx, color)) return true
        if (wxPicture.applyBorder(widthPx, color)) return true

        const p = wxPage.getParagraphTarget()
        if (!p) return false
        p.style.borderStyle = widthPx === "0px" ? "none" : "solid"
        p.style.borderWidth = widthPx
        p.style.borderColor = color
        p.style.padding = "2px 4px"
        return true
    }
    /** @param {string} radiusPx */
    static borderRadius(radiusPx) {
        wxRange.restoreRange(wxRange.range)

        if (wxGrid.applyBorderRadius(radiusPx)) return true
        if (wxPicture.applyBorderRadius(radiusPx)) return true

        const p = wxPage.getParagraphTarget()
        if (!p) return false
        p.style.borderRadius = radiusPx
        return true
    }

    static increase() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.increase(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.increase(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "increase")
    }

    static decrease() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.decrease(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.decrease(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "decrease")
    }

    static left() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.moveLeftWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.moveLeftWord(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "left")
    }

    static right() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.moveRightWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.moveRightWord(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "right")
    }

    static up() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.moveUp(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.moveUp(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "up")
    }

    static down() {
        const t = wxPage.selectedTarget()
        if (t.kind === "image") { const img = wxPicture.getFocused(); if (img) wxPicture.moveDown(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = wxGrid.getFocused(); if (table) wxGrid.moveDown(table); return true }
        return !wxPage.#callIfExists(wxParagraph, "down")
    }
}