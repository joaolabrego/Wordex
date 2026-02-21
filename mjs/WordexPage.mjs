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

export default class Page {
    /** @type {"INS"|"OVR"} */

    /** @type {HTMLStyleElement} */ #style
    /** @type {HTMLDivElement} */ #main
    /** @type {HTMLDivElement} */ #header
    /** @type {HTMLDivElement} */ #body
    /** @type {HTMLDivElement} */ #footer

    /** @type {Toolbar} */ #toolbar

    constructor() {
        this.#main = document.createElement("div")
        this.#main.classList.add("page")
        this.#main.style.caretColor = "#0B6E4F"
        this.#main.addEventListener("beforeinput", (e) => {
            if (this.#toolbar.isOverwriteMode)
                Edit.handleOverwriteInput(e)
        })

        this.#style = document.createElement("style")
        this.#style.textContent = Config.Script
        this.#main.appendChild(this.#style)


        this.#header = this.#makeSection("header", "Cabeçalho: clique para editar")
        this.#header.id = "header"

        this.#body = this.#makeSection("body", "Corpo do documento: clique para editar")
        this.#body.id = "body"

        this.#footer = this.#makeSection("footer", "Rodapé: clique para editar")
        this.#footer.id = "footer"
        
        this.#toolbar = new Toolbar(this)
        document.body.append(this.#toolbar.element, this.#main)
        document.body.appendChild(this.#main)

        Config.root = this.#body
        document.addEventListener("selectionchange", () => Config.saveSelection())
    }
    get element() {
        return this.#main
    }
    /**
     * @param {string} cls
     * @param {string} text
     * @returns {HTMLDivElement}
     */
    #makeSection(cls, text) {
        const div = document.createElement("div")
        div.classList.add("editable", "workspace", cls)
        div.textContent = text
        div.contentEditable = "true"

        div.addEventListener("keydown", (e) => Edit.onKeyDown(e))
        div.addEventListener("focus", () => Config.root = div)
        Paragraph.ensureFirstParagraph(div)

        return div
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
    static #getParagraphTarget() {
        const fp = Page.#callIfExists(Paragraph, "getFocused")
        if (fp) return fp
        Config.restoreRange(Config.range)
        return Config.getActiveParagraph()
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

    /** @param {string} value */
    static align(value) {
        const t = Page.selectedTarget()

        // 1) imagem: usa alvo focado
        if (t.kind === "image") {
            const mode = Layout.normalizeJustify(value)
            Image.align(mode)
            return true
        }

        // 2) tabela (célula/linha/col/tabela inteira)
        if (t.kind === "cell" || t.kind === "row" || t.kind === "col" || t.kind === "table") {
            const mode = Layout.normalizeJustify(value)
            if (mode === "left") Table.alignLeft()
            else if (mode === "right") Table.alignRight()
            else Table.alignCenter()
            return true
        }

        // 3) parágrafo/texto: execCommand
        if (value === "justifyLeft") Config.exec("justifyLeft")
        if (value === "justifyCenter") Config.exec("justifyCenter")
        if (value === "justifyRight") Config.exec("justifyRight")
        if (value === "justifyFull") Config.exec("justifyFull")
        return true
    }

    /** @param {string} widthPx @param {string} color */
    static border(widthPx, color) {
        Config.restoreRange(Config.range)

        if (Table.applyBorder(widthPx, color)) return true
        if (Image.applyBorder(widthPx, color)) return true

        const p = Page.#getParagraphTarget()
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

        const p = Page.#getParagraphTarget()
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

    /** @param {string} name */
    setFontFamily(name) {
        if (!name)
            return false
        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection)
            return Format.setFontFamily(name)

        const paragraph = Page.#getParagraphTarget()
        if (paragraph) { paragraph.style.fontFamily = name; return true }
        if (Config.root) { Config.root.style.fontFamily = name; return true }
        return false
    }

    /** 
     * @param {string} value 
     * @param {string} cssText 
     */
    setFontSize(value, cssText = value) {
        if (!value)
            return false
        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        const hasSelection = !!selection && selection.rangeCount && !selection.getRangeAt(0).collapsed

        if (hasSelection) {
            if (/^[1-7]$/.test(value))
                return !!Format.setFontSize(value)
            return false
        }

        // sem seleção: parágrafo/root
        const paragraph = Page.#getParagraphTarget()
        if (paragraph) {
            paragraph.style.fontSize = cssText
            return true
        }
        if (Config.root) {
            Config.root.style.fontSize = cssText
            return true
        }

        return false
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

        const paragraph = Page.#getParagraphTarget()
        if (paragraph) {
            paragraph.style.color = hex
            return true
        }
        
        if (Config.root) {
            Config.root.style.color = hex
            return true
        }

        return false
    }
    /** @param {"portrait"|"landscape"} value */
    setOrientation(value) {
        const paper = Config.paperFormatList.find((p) => p.selected)
        if (!paper)
            return false
        if (value === "landscape") 
            this.#main.style.width = paper.height ?? ""
        else 
            this.#main.style.width = paper.width ?? ""

        return true
    }
    /** @param {string} value */
    setPaperFormat(value) {
        const orient = Config.pageOrientationList.find((p) => p.selected)
        if (!orient)
            return false
        const paper = Config.paperFormatList.find((p) => p.value === value)
        if (!paper)
            return false
        if (orient.value === "landscape")
            this.#main.style.width = paper.height ?? ""
        else
            this.#main.style.width = paper.width ?? ""

        return true
    }
    /** @param {File|null} file */
    static async insertImageFromFile(file) {
        await Image.createFromFile(file)
    }
    /** @param {number} rows @param {number} cols */
    static async insertTable(rows = 2, cols = 2) {
        if (!Table || typeof Table.insertAtSelection !== "function") return false
        return !!Table.insertAtSelection(rows, cols)
    }
}