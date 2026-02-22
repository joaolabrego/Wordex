// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Edit from "./WordexEdit.mjs"
import Image from "./WordexImage.mjs"
import Paragraph from "./WordexParagraph.mjs"
import Format from "./WordexFormat.mjs"
import Table from "./WordexTable.mjs"
import TableCell from "./WordexTableCell.mjs"
import TableRow from "./WordexTableRow.mjs"
import TableCol from "./WordexTableCol.mjs"
import Text from "./WordexText.mjs"
import Layout from "./WordexLayout.mjs"
import Toolbar from "./WordexToolbar.mjs"
import Template from "./WordexTemplate.mjs"
import Section from "./WordexSection.mjs"

export default class Page {
    /** @type {"INS"|"OVR"} */

    /** @type {Template} */ #template
    /** @type {HTMLDivElement} */ #main
    /** @type {Section} */ #header
    /** @type {Section} */ #body
    /** @type {Section} */ #footer
    /** @type {Toolbar} */ #toolbar

    /** @param {Template} template */
    constructor(template) {
        this.#template = template
        this.#toolbar = template.toolbar
        this.#main = document.createElement("div")
        this.#main.classList.add("page")
        this.#main.style.caretColor = "#0B6E4F"
        this.#main.addEventListener("beforeinput", (e) => {
            if (this.#toolbar.isOverwriteMode)
                Edit.handleOverwriteInput(e)
        })

        this.#header = new Section(this, "header", "Cabeçalho: clique para editar")
        this.#main.appendChild(this.#header.instance)

        this.#body = new Section(this, "body", "Corpo do documento: clique para editar")
        this.#main.appendChild(this.#body.instance)

        this.#footer = new Section(this, "footer", "Rodapé: clique para editar")
        this.#main.appendChild(this.#footer.instance)
        
        Config.rootSection = this.#body.instance;

        document.addEventListener("selectionchange", () => Config.saveSelection())
    }
    get instance() {
        return this.#main
    }
    get body() {
        return this.#body
    }
    /** @param {string} hex */
    setColor(hex) {
        if (!hex)
            return false
        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed
        if (hasSelection) {
            return Format.setFontColor(hex)
        }

        const paragraph = Page.getParagraphTarget()
        if (paragraph) {
            paragraph.style.color = hex
            return true
        }
        if (Config.rootSection) {
            Config.rootSection.style.color = hex
            return true
        }

        return false
    }

    /** 
     * @param {number} rows 
     * @param {number} cols
     */
    static async insertTable(rows = 2, cols = 2) {
        if (!Table || typeof Table.insertAtSelection !== "function")
            return false
        return !!Table.insertAtSelection(rows, cols)
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
        const cell = Page.#callIfExists(TableCell, "getActive")
        if (cell) return /** @type {HTMLTableElement|null} */ (cell.closest("table"))

        const tr = Page.#callIfExists(TableRow, "getActive")
        if (tr) return /** @type {HTMLTableElement|null} */ (tr.closest("table"))

        const col = Page.#callIfExists(TableCol, "getActive")
        if (col?.table) return col.table

        return null
    }

    /** @returns {HTMLDivElement|null} */
    static getParagraphTarget() {
        const fp = Page.#callIfExists(Paragraph, "getFocused")
        if (fp) return fp
        Config.restoreRange(Config.range)
        return Config.getActiveParagraph()
    }

    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const target = Page.selectedTarget()

        // 1) imagem: usa alvo focado
        if (target.kind === "image") {
            Image.align(dir)
            return true
        }

        // 2) tabela (célula/linha/col/tabela inteira)
        if (target.kind === "cell" || target.kind === "row" || target.kind === "col" || target.kind === "table") {
            if (dir === "left")
                Table.alignLeft()
            else if (dir === "right")
                Table.alignRight()
            else
                Table.alignCenter()

            return true
        }

        // 3) parágrafo/texto: execCommand
        if (dir === "left") Config.exec("justifyLeft")
        if (dir === "center") Config.exec("justifyCenter")
        if (dir === "right") Config.exec("justifyRight")
        //if (dir === "full") Config.exec("justifyFull")
        return true
    }


    // =========================================================
    // Resolver (Cell -> Row -> Col -> Image -> Text -> Paragraph)
    // =========================================================
    static selectedTarget() {
        if (Page.#callIfExists(TableCell, "hasSelection") || Page.#callIfExists(TableCell, "hasActive"))
            return { kind: "cell", obj: TableCell }

        if (Page.#callIfExists(TableRow, "hasSelection") || Page.#callIfExists(TableRow, "hasActive"))
            return { kind: "row", obj: TableRow }

        const table = Page.#getActiveTable()
        if ((table && Page.#callIfExists(TableCol, "hasSelection", table)) || Page.#callIfExists(TableCol, "hasActive"))
            return { kind: "col", obj: TableCol }

        if (Image.hasFocus()) return { kind: "image", obj: Image }

        if (Table.hasFocus()) return { kind: "table", obj: Table }

        if (Page.#callIfExists(Text, "hasSelection")) return { kind: "text", obj: Text }

        return { kind: "paragraph", obj: Paragraph }
    }

    // =========================================================
    // Toolbar verbs
    // =========================================================


    /** @param {string} widthPx @param {string} color */
    static border(widthPx, color) {
        Config.restoreRange(Config.range)

        if (Table.applyBorder(widthPx, color)) return true
        if (Image.applyBorder(widthPx, color)) return true

        const p = Page.getParagraphTarget()
        if (!p) return false
        p.style.borderStyle = widthPx === "0px" ? "none" : "solid"
        p.style.borderWidth = widthPx
        p.style.borderColor = color
        p.style.padding = "2px 4px"
        return true
    }
    /** @param {string} radiusPx */
    static borderRadius(radiusPx) {
        Config.restoreRange(Config.range)

        if (Table.applyBorderRadius(radiusPx)) return true
        if (Image.applyBorderRadius(radiusPx)) return true

        const p = Page.getParagraphTarget()
        if (!p) return false
        p.style.borderRadius = radiusPx
        return true
    }

    static increase() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.increase(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.increase(table); return true }
        return !Page.#callIfExists(Paragraph, "increase")
    }

    static decrease() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.decrease(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.decrease(table); return true }
        return !Page.#callIfExists(Paragraph, "decrease")
    }

    static left() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.moveLeftWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.moveLeftWord(table); return true }
        return !Page.#callIfExists(Paragraph, "left")
    }

    static right() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.moveRightWord(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.moveRightWord(table); return true }
        return !Page.#callIfExists(Paragraph, "right")
    }

    static up() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.moveUp(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.moveUp(table); return true }
        return !Page.#callIfExists(Paragraph, "up")
    }

    static down() {
        const t = Page.selectedTarget()
        if (t.kind === "image") { const img = Image.getFocused(); if (img) Image.moveDown(img); return true }
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") { const table = Table.getFocused(); if (table) Table.moveDown(table); return true }
        return !Page.#callIfExists(Paragraph, "down")
    }
}