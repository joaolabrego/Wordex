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
import wxConfig from "./wxConfig.mjs"

/** @typedef {import("./wdxTypes.mjs").wdxSection} wdxSection */
/** @typedef {import("./wdxTypes.mjs").wdxSectionHeader} wdxSectionHeader */
/** @typedef {import("./wdxTypes.mjs").wdxSectionBody} wdxSectionBody */
/** @typedef {import("./wdxTypes.mjs").wdxSectionFooter} wdxSectionFooter */
/** @typedef {import("./wdxTypes.mjs").wdxPage} wdxPage */
export default class wxPage {
    /** @type {"INS"|"OVR"} */

    /** @type {wxTemplate} */ #template
    /** @type {wdxPage} */ #page
    /** @type {wxSection} */ #header
    /** @type {wxSection} */ #body
    /** @type {wxSection} */ #footer
    /** @type {wxSection[]} */ #sections = []

    /** @param {wxTemplate} owner */
    constructor(owner) {
        this.#template = owner
        this.#page = /** @type {wdxPage} */(document.createElement("div"))
        this.#page.dataset.wdxKind = "page"

        let style = document.createElement("style")
        style.textContent = wxConfig.ScriptPage
        this.#page.appendChild(style)
        
        style = document.createElement("style")
        style.textContent = wxConfig.ScriptPageUI
        this.#page.appendChild(style)

        this.#page.classList.add("page")
        this.#page.style.caretColor = "#0B6E4F"
        this.#page.addEventListener("beforeinput", (e) => {
            if (this.#template.toolbar.isOverwriteMode)
                wxEdit.handleOverwriteInput(e)
        })

        this.#header = new wxSection(this, "header", "Cabeçalho: clique para editar")
        this.#sections.push(this.#header)
        this.#page.appendChild(this.#header.root)
        

        this.#body = new wxSection(this, "body", "Corpo do documento: clique para editar")
        this.#sections.push(this.#body)
        this.#page.appendChild(this.#body.root)

        this.#footer = new wxSection(this, "footer", "Rodapé: clique para editar")
        this.#sections.push(this.#footer)
        this.#page.appendChild(this.#footer.root)
        
        wxSection.setRoot(this.#body.root)

        // Registra handlers de clique para parágrafo, tabela e imagem em cada seção editável
        for (const section of [this.#header, this.#body, this.#footer]) {
            wxParagraph.attach(section.root)
            wxGrid.attach(section.root)
            wxPicture.attach(section.root)
        }

        document.addEventListener("selectionchange", () => wxRange.saveSelection())
    }
    /** @returns {wdxSection|void} */
    selectedSection() {
        const section = this.#sections.find(s => s.isSelected)?.root
        if (section)
            return section
    }
    /** @returns void*/
    unselectSection() {
        const selected = this.selectedSection()
        if (selected instanceof HTMLDivElement)
            delete selected.dataset.wxSelected
    }
    /**
     * @param {"header"|"body"|"footer"} id
     * @returns void*/
    selectSection(id) {
        this.unselectSection()
        const selected = document.getElementById(id)
        if (selected instanceof HTMLDivElement)
            selected.dataset.wxSelected = "1"
    }
    /** @returns {wxTemplate} */
    get owner() {
        return this.#template
    }
    /** @returns {wdxPage} */
    get root() {
        return this.#page
    }
    /** @returns {wdxSectionHeader} */
    get rootHeader() {
        return /** { @type { wdxSectionHeader } } */(this.#header.root)
    }
    /** @returns {wdxSectionBody} */
    get rootBody() {
        return /** { @type { wdxSectionBody } } */(this.#body.root)
    }
    /** @returns {wdxSectionFooter} */
    get rootFooter() {
        return /** { @type { wdxSectionFooter } } */(this.#footer.root)
    }
    /** @returns {wxSection} */
    get header() {
        return this.#header
    }
    /** @returns {wxSection} */
    get body() {
        return this.#body
    }
    /** @returns {wxSection} */
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
        const section = wxSection.getRoot()
        if (section) {
            section.style.color = hex
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