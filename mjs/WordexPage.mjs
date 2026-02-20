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

export default class Page {
    /** @type {HTMLElement|null} */
    static #scope = null

    /** @type {"INS"|"OVR"} */
    static #editMode = "INS"

  // refs do “mundo”
  /** @type {HTMLDivElement|null} */ static #divPage = null
  /** @type {HTMLDivElement|null} */ static #header = null
  /** @type {HTMLDivElement|null} */ static #body = null
  /** @type {HTMLDivElement|null} */ static #footer = null

    // =========================================================
    // Bootstrap / Mundo (DOM)
    // =========================================================

    /**
     * Cria a estrutura page/header/body/footer e já conecta tudo.
     * Use no Template: const { divPage } = Page.create()
     */
    static create() {
        const divPage = document.createElement("div")
        divPage.classList.add("page")
        divPage.style.caretColor = "#0B6E4F"

        const header = Page.#makeSection("header", "Cabeçalho: clique para editar")
        header.id = "header"

        const body = Page.#makeSection("body", "Corpo do documento: clique para editar")
        body.id = "body"

        const footer = Page.#makeSection("footer", "Rodapé: clique para editar")
        footer.id = "footer"

        divPage.append(header, body, footer)

        Page.#divPage = divPage
        Page.#header = header
        Page.#body = body
        Page.#footer = footer

        // conecta subsistemas globais
        Page.attach(divPage)

        // modo OVR/INS (comportamento do editor, não do template)
        Page.#wireBeforeInput(divPage)

        // seleção global -> Config.range
        document.addEventListener("selectionchange", () => Config.saveSelection())

        // default root/foco
        Config.root = body
        const p = Config.ensureFirstParagraph(body)

        return { divPage, header, body, footer }
    }

    /** @param {"INS"|"OVR"} mode */
    static setEditMode(mode) {
        Page.#editMode = mode
        if (Page.#divPage) {
            Page.#divPage.style.caretColor = mode === "OVR" ? "#8B0000" : "#006400"
        }
    }

    /** @returns {"INS"|"OVR"} */
    static getEditMode() {
        return Page.#editMode
    }

    static toggleEditMode() {
        const mode = Page.getEditMode() === "INS" ? "OVR" : "INS"
        Page.setEditMode(mode)
        return mode
    }

    /** @param {HTMLElement} scope */
    static attach(scope) {
        Page.#scope = scope

        Image.attach(scope)
        Paragraph.attach(scope)
        Table.attach(scope)
        TableCell.attach(scope)
        TableRow.attach(scope)
        TableCol.attach(scope)
    }

    /** @param {HTMLDivElement} divPage */
    static #wireBeforeInput(divPage) {
        divPage.addEventListener("beforeinput", (e) => {
            if (Page.#editMode === "OVR") Edit.handleOverwriteInput(e)
        })
    }

    /**
     * @param {string} cls
     * @param {string} text
     * @returns {HTMLDivElement}
     */
    static #makeSection(cls, text) {
        const div = document.createElement("div")
        div.classList.add("editable", "workspace", cls)
        div.textContent = text
        div.contentEditable = "true"

        div.addEventListener("keydown", (e) => Edit.onKeyDown(e))
        div.addEventListener("focus", () => {
            Config.root = div
        })

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

        if (Page.#callIfExists(Text, "hasSelection")) return { kind: "text", obj: Text }

        return { kind: "paragraph", obj: Paragraph }
    }

    // =========================================================
    // Toolbar verbs
    // =========================================================

    /** @param {string} value */
    static align(value) {
        const t = Page.selectedTarget()

        // 1) objeto (img/table)
        if (t instanceof HTMLImageElement) {
            const mode = Layout.normalizeJustify(value)
            if (mode === "left")
                Image.alignLeft(t)
            else if (mode === "right")
                Image.alignRight(t)
            else
                Image.alignCenter(t)
            return true
        }

        if (t instanceof HTMLTableElement) {
            const mode = Layout.normalizeJustify(value)
            if (mode === "left")
                Table.alignLeft(t)
            else if (mode === "right")
                Table.alignRight(t)
            else
                Table.alignCenter(t)
            return true
        }

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

        if (t instanceof HTMLImageElement) { Image.increase(t); return true }
        if (t instanceof HTMLTableElement) { Table.increase(t); return true }
        return !Page.#callIfExists(Paragraph, "increase")
    }

    static decrease() {
        const t = Page.selectedTarget()
        if (t instanceof HTMLImageElement) { Image.decrease(t); return true }
        if (t instanceof HTMLTableElement) { Table.decrease(t); return true }
        return !Page.#callIfExists(Paragraph, "decrease")
    }

    static left() {
        const t = Page.selectedTarget()
        if (t instanceof HTMLImageElement) { Image.moveLeftWord(t); return true }
        if (t instanceof HTMLTableElement) { Table.moveLeftWord(t); return true }
        return !Page.#callIfExists(Paragraph, "left")
    }

    static right() {
        const t = Page.selectedTarget()
        if (t instanceof HTMLImageElement) { Image.moveRightWord(t); return true }
        if (t instanceof HTMLTableElement) { Table.moveRightWord(t); return true }
        return !Page.#callIfExists(Paragraph, "right")
    }

    static up() {
        const t = Page.selectedTarget()
        if (t instanceof HTMLImageElement) { Image.moveUp(t); return true }
        if (t instanceof HTMLTableElement) { Table.moveUp(t); return true }
        return !Page.#callIfExists(Paragraph, "up")
    }

    static down() {
        const t = Page.selectedTarget()
        if (t instanceof HTMLImageElement) { Image.moveDown(t); return true }
        if (t instanceof HTMLTableElement) { Table.moveDown(t); return true }
        return !Page.#callIfExists(Paragraph, "down")
    }

    // =========================================================
    // Formatação (por enquanto via Format)
    // =========================================================

    /** @param {string} name */
    static fontFamily(name) {
        if (!name) return false
        Config.restoreRange(Config.range)

        const sel = window.getSelection()
        const hasSelection = !!sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed

        // seleção primeiro
        if (hasSelection) {
            if (Format.setFontFamily(name)) return true
            return false
        }

        // sem seleção: parágrafo/root
        const p = Page.#getParagraphTarget()
        if (p) { p.style.fontFamily = name; return true }
        if (Config.root) { Config.root.style.fontFamily = name; return true }
        return false
    }

    /** @param {string} value @param {string} cssText */
    static fontSize(value, cssText = value) {
        if (!value) return false
        Config.restoreRange(Config.range)

        const sel = window.getSelection()
        const hasSelection = !!sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed

        // seleção primeiro
        if (hasSelection) {
            if (/^[1-7]$/.test(value)) return !!Format.setFontSize(value)
            return false
        }

        // sem seleção: parágrafo/root
        const p = Page.#getParagraphTarget()
        if (p) { p.style.fontSize = cssText; return true }
        if (Config.root) { Config.root.style.fontSize = cssText; return true }
        return false
    }

    /** @param {string} hex */
    static color(hex) {
        if (!hex) return false
        Config.restoreRange(Config.range)

        const sel = window.getSelection()
        const hasSelection = !!sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed

        // seleção primeiro
        if (hasSelection) {
            if (Format.setFontColor(hex)) return true
            return false
        }

        // sem seleção: parágrafo/root
        const p = Page.#getParagraphTarget()
        if (p) { p.style.color = hex; return true }
        if (Config.root) { Config.root.style.color = hex; return true }
        return false
    }

    // =========================================================
    // Inserções
    // =========================================================
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
