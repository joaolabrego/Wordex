// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Movement from "./WordexMovement.mjs"
import Layout from "./WordexLayout.mjs"
import Alignment from "./WordexAlignment.mjs"
import Page from "./WordexPage.mjs"

export default class Table {
    /** @type {Page} */ #page
    /** @type {HTMLTableCellElement|null} */ #activeCell = null
    /** @type {HTMLTableElement|null} */ #selectedTable = null

    // 0 = table, 1 = row, 2 = col
    static #cycleMode = 0
    
    /** @type {HTMLTableRowElement|null} */ static #selectedRow = null
    /** @type {{table:HTMLTableElement, index:number}|null} */ static #selectedCol = null

    static #SEL_W = 2
    static #SEL_COLOR = "#0AEC0A"


    /** @param {Page} page */
    constructor(page) {
        this.#page = page
        
    }

    // =========================================================
    // Attach (mouse)
    // =========================================================
    /** @param {HTMLElement} scope */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)

            const cell = t.closest("td, th")
            if (!(cell instanceof HTMLTableCellElement)) {
                Table.#clearAll()
                return
            }

            const table = cell.closest("table")
            if (!(table instanceof HTMLTableElement)) return

            if (e.ctrlKey) {
                // se não era a mesma tabela, apenas seleciona tabela
                if (Table.#selectedTable !== table) {
                    Table.#focusTable(table)
                    Table.#clearRowCol()
                    Table.#clearCell()
                    Table.#cycleMode = 0
                    e.preventDefault()
                    return
                }

                // ciclo row -> col -> table
                if (Table.#cycleMode === 0) {
                    Table.#selectRowFromCell(cell)
                    Table.#cycleMode = 1
                } else if (Table.#cycleMode === 1) {
                    Table.#selectColFromCell(cell)
                    Table.#cycleMode = 2
                } else {
                    Table.#clearRowCol()
                    Table.#cycleMode = 0
                }

                // ctrl-click não seleciona célula
                Table.#clearCell()
                e.preventDefault()
                return
            }

            // clique comum: seleciona célula
            Table.#focusTable(table)
            Table.#clearRowCol()
            Table.#cycleMode = 0
            Table.#focusCell(cell)
            Table.#placeCaretInCell(cell)
            Config.saveSelection()
        })
    }

    // =========================================================
    // Focus API
    // =========================================================
    static hasFocus() { return !!Table.#selectedTable }
  /** @returns {HTMLTableElement|null} */ static getFocused() { return Table.#selectedTable }

    static hasActiveCell() { return !!Table.#activeCell }
  /** @returns {HTMLTableCellElement|null} */ static getActiveCell() { return Table.#activeCell }

    static hasSelectedRow() { return !!Table.#selectedRow }
  /** @returns {HTMLTableRowElement|null} */ static getSelectedRow() { return Table.#selectedRow }

    static hasSelectedCol() { return !!Table.#selectedCol }
  /** @returns {{table:HTMLTableElement, index:number}|null} */ static getSelectedCol() { return Table.#selectedCol }

    // =========================================================
    // Create / Insert
    // =========================================================
    /**
     * @param {number} rows
     * @param {number} cols
     * @returns {HTMLTableElement}
     */
    static create(rows = 2, cols = 2) {
        rows = Math.max(1, rows | 0)
        cols = Math.max(1, cols | 0)

        const table = document.createElement("table")
        table.classList.add("wx-table")

        // radius externo funcionar nos cantos
        table.style.borderCollapse = "separate"
        table.style.borderSpacing = "0"

        // default: "objeto inline" (mas sem margem lateral pra não criar gap no meio de palavra)
        table.style.display = "inline-table"
        table.style.verticalAlign = "baseline"
        table.style.margin = "0"
        table.style.width = "auto"

        // borda externa real (persistente)
        table.style.borderStyle = "none"
        table.style.borderWidth = "0px"
        table.style.borderColor = ""
        table.style.borderRadius = ""
        table.style.overflow = ""

        const tbody = document.createElement("tbody")

        for (let r = 0; r < rows; r++) {
            const tr = document.createElement("tr")
            for (let c = 0; c < cols; c++) {
                const td = document.createElement("td")
                td.classList.add("wx-cell")
                td.style.border = "1px solid #777"
                td.style.padding = "4px 8px"
                td.style.minWidth = "110px"
                td.appendChild(document.createElement("br"))
                tr.appendChild(td)
            }
            tbody.appendChild(tr)
        }

        table.appendChild(tbody)
        return table
    }

    /**
     * Insere tabela na posição do cursor (Config.range)
     * @param {number} rows
     * @param {number} cols
     * @returns {boolean}
     */
    static insertAtSelection(rows = 2, cols = 2) {
        Config.restoreRange(Config.range)

        const selection = window.getSelection()
        if (!selection || !selection.rangeCount)
            return false
        const range = selection.getRangeAt(0)

        const sc = range.startContainer
        const anchor = sc instanceof Element ? sc : sc.parentElement
        if (anchor?.closest("td, th"))
            return false

        if (!range.collapsed)
            range.deleteContents()

        const table = Table.create(rows, cols)

        // se estiver no meio de TextNode, split é automático, mas vamos evitar “surpresas”:
        // insere e garante que não cria nós de espaço.
        range.insertNode(table)

        // nasce selecionada
        Table.#focusTable(table)
        Table.#clearRowCol()
        Table.#clearCell()
        Table.#cycleMode = 0

        const firstCell = table.querySelector("td")
        if (firstCell instanceof HTMLTableCellElement) {
            Table.#focusCell(firstCell)
            Table.#placeCaretInCell(firstCell)
            Config.saveSelection()
            return true
        }

        range.setStartAfter(table)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        Config.saveSelection()
        return true
    }

    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const t = Table.#selectedTable
        if (!t)
            return false
        // limpa estado anterior
        t.style.float = ""
        t.style.clear = ""
        t.style.display = ""
        t.style.marginLeft = ""
        t.style.marginRight = ""
        t.style.marginTop = ""
        t.style.marginBottom = ""

        // evita “espaço” artificial ao inserir no meio: margem lateral default = 0
        // e só adiciona margem quando float (pra dar respiro do texto)
        if (dir === "left") {
            t.style.float = "left"
            t.style.display = "table"
            t.style.margin = "4px 10px 6px 0"
            return
        }
        if (dir === "right") {
            t.style.float = "right"
            t.style.display = "table"
            t.style.margin = "4px 0 6px 10px"
            return
        }
        // center
        t.style.float = "none"
        t.style.display = "table"
        t.style.margin = "6px auto"
        t.style.clear = "both"

        return true
    }

    /**
     * @param {HTMLTableElement} instance 
     * @param {number} factor
     */
    static #resize(instance, factor) {
        if (!instance)
            return false

        const width = instance.getBoundingClientRect().width
        if (!width)
            return false

        const newWidth = Math.max(20, Math.round(width * factor))
        instance.style.width = newWidth + "px"

        if (instance instanceof HTMLImageElement)
            instance.style.height = "auto"

        Config.saveSelection()
        return true
    }

    /** @param {HTMLTableElement} table */
    static increase(table) {
        if (!table)
            return
        Table.#resize(table, 1.1)
    }
    
    /** @param {HTMLTableElement} t */
    static decrease(t) {
        if (!t) return
        Layout.decrease(t)
    }

    /** @param {HTMLTableElement} t */
    static moveLeftWord(t) {
        if (!t) return
        Movement.moveLeftWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveRightWord(t) {
        if (!t) return
        Movement.moveRightWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveUp(t) {
        if (!t) return
        Movement.moveParagraphUp(t)
    }

    /** @param {HTMLTableElement} t */
    static moveDown(t) {
        if (!t) return
        Movement.moveParagraphDown(t)
    }

    // =========================================================
    // Border / Radius (Page)
    // prioridade: row/col -> cell -> table
    // =========================================================
    /**
     * @param {string} widthPx
     * @param {string} color
     * @returns {boolean}
     */
    static applyBorder(widthPx, color) {
        const table = Table.#selectedTable
        if (!table) return false

        const borderStyle = widthPx === "0px" ? "none" : "solid"

        if (Table.#selectedRow) {
            for (const cell of Table.#selectedRow.cells) {
                cell.style.borderStyle = borderStyle
                cell.style.borderWidth = widthPx
                cell.style.borderColor = color
            }
            return true
        }

        if (Table.#selectedCol) {
            const { table, index } = Table.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (!td) continue
                td.style.borderStyle = borderStyle
                td.style.borderWidth = widthPx
                td.style.borderColor = color
            }
            return true
        }

        if (Table.#activeCell) {
            const td = Table.#activeCell
            td.style.borderStyle = borderStyle
            td.style.borderWidth = widthPx
            td.style.borderColor = color
            return true
        }

        // borda externa real (persistente)
        table.style.borderStyle = borderStyle
        table.style.borderWidth = widthPx
        table.style.borderColor = color

        // mantém seleção verde (outline)
        Table.#renderSelection(table, true)
        return true
    }

    /**
     * @param {string} radiusPx
     * @returns {boolean}
     */
    static applyBorderRadius(radiusPx) {
        const table = Table.#selectedTable
        if (!table) return false

        /** @param {Iterable<HTMLTableCellElement>} cells */
        const clearCells = (cells) => {
            for (const td of cells) {
                td.style.borderRadius = ""
                td.style.borderTopLeftRadius = ""
                td.style.borderTopRightRadius = ""
                td.style.borderBottomLeftRadius = ""
                td.style.borderBottomRightRadius = ""
            }
        }

        const allCells = /** @type {NodeListOf<HTMLTableCellElement>} */ (
            table.querySelectorAll("td,th")
        )

        if (Table.#selectedRow) {
            clearCells(allCells)
            const cells = Table.#selectedRow.cells
            if (!cells.length) return true
            const first = cells[0]
            const last = cells[cells.length - 1]

            first.style.borderTopLeftRadius = radiusPx
            first.style.borderBottomLeftRadius = radiusPx
            last.style.borderTopRightRadius = radiusPx
            last.style.borderBottomRightRadius = radiusPx
            if (first === last) first.style.borderRadius = radiusPx
            return true
        }

        if (Table.#selectedCol) {
            clearCells(allCells)
            const { index } = Table.#selectedCol
            const top = table.rows[0]?.cells[index] ?? null
            const bottom = table.rows[table.rows.length - 1]?.cells[index] ?? null

            if (top) {
                top.style.borderTopLeftRadius = radiusPx
                top.style.borderTopRightRadius = radiusPx
            }
            if (bottom) {
                bottom.style.borderBottomLeftRadius = radiusPx
                bottom.style.borderBottomRightRadius = radiusPx
            }
            if (top && bottom && top === bottom) top.style.borderRadius = radiusPx
            return true
        }

        if (Table.#activeCell) {
            Table.#activeCell.style.borderRadius = radiusPx
            return true
        }

        // table
        clearCells(allCells)
        table.style.borderRadius = radiusPx
        table.style.overflow = (radiusPx === "0px" || radiusPx === "" ? "" : "hidden")

        // “cantos perfeitos” com bordas internas
        const rows = table.rows.length
        const cols = table.rows[0]?.cells.length ?? 0
        if (!rows || !cols) return true

        const tl = table.rows[0].cells[0]
        const tr = table.rows[0].cells[cols - 1]
        const bl = table.rows[rows - 1].cells[0]
        const br = table.rows[rows - 1].cells[cols - 1]

        if (tl) tl.style.borderTopLeftRadius = radiusPx
        if (tr) tr.style.borderTopRightRadius = radiusPx
        if (bl) bl.style.borderBottomLeftRadius = radiusPx
        if (br) br.style.borderBottomRightRadius = radiusPx

        Table.#renderSelection(table, true)
        return true
    }

    // =========================================================
    // Internals: selection visuals (outline => não briga com border/radius)
    // =========================================================
    /** @param {HTMLTableElement} table @param {boolean} selected */
    static #renderSelection(table, selected) {
        if (selected) {
            table.style.outline = `${Table.#SEL_W}px solid ${Table.#SEL_COLOR}`
            table.style.outlineOffset = "2px"
        } else {
            table.style.outline = ""
            table.style.outlineOffset = ""
        }
    }

    // =========================================================
    // Internals: focus
    // =========================================================
    /** @param {HTMLTableElement} table */
    static #focusTable(table) {
        Table.#clearTable()
        Table.#selectedTable = table
        table.classList.add("table-selected")
        Table.#renderSelection(table, true)

        // ao selecionar table/row/col, célula deve ser explicitamente clicada
        // então limpamos a célula ativa aqui
        // (se você preferir manter célula no clique comum, ok — aqui é chamado em ambos,
        // então o clique comum vai recolocar via #focusCell)
    }

    /** @param {HTMLTableCellElement} cell */
    static #focusCell(cell) {
        Table.#clearCell()
        Table.#activeCell = cell
        cell.classList.add("cell-active")
    }

    static #clearCell() {
        if (Table.#activeCell) Table.#activeCell.classList.remove("cell-active")
        Table.#activeCell = null
    }

    static #clearTable() {
        if (Table.#selectedTable) {
            const t = Table.#selectedTable
            t.classList.remove("table-selected")
            Table.#renderSelection(t, false)
        }
        Table.#selectedTable = null
    }

    static #clearRowCol() {
        if (Table.#selectedRow) {
            Table.#selectedRow.classList.remove("row-selected")
            Table.#selectedRow = null
        }

        if (Table.#selectedCol) {
            const { table, index } = Table.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (td) td.classList.remove("col-selected")
            }
            Table.#selectedCol = null
        }
    }

    static #clearAll() {
        Table.#clearCell()
        Table.#clearRowCol()
        Table.#clearTable()
        Table.#cycleMode = 0
    }

    /** @param {HTMLTableCellElement} cell */
    static #placeCaretInCell(cell) {
        if (!cell.firstChild) cell.appendChild(document.createElement("br"))
        const r = document.createRange()
        r.selectNodeContents(cell)
        r.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
    }

    /** @param {HTMLTableCellElement} cell */
    static #selectRowFromCell(cell) {
        Table.#clearRowCol()
        const tr = cell.parentElement
        if (tr instanceof HTMLTableRowElement) {
            tr.classList.add("row-selected")
            Table.#selectedRow = tr
        }
    }

    /** @param {HTMLTableCellElement} cell */
    static #selectColFromCell(cell) {
        Table.#clearRowCol()
        const table = cell.closest("table")
        if (!(table instanceof HTMLTableElement)) return

        const idx = cell.cellIndex
        for (const r of table.rows) {
            const td = r.cells[idx]
            if (td) td.classList.add("col-selected")
        }
        Table.#selectedCol = { table, index: idx }
    }

  // =========================================================
  // Alignment (wrap / center)
  // =========================================================
  /**
   * @param {HTMLTableElement|null} table
   */
  static alignLeft(table = null) {
    const t = table ?? Table.#selectedTable
    if (!t) return
    Layout.alignObject(t, "left")
    Table.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignRight(table = null) {
    const t = table ?? Table.#selectedTable
    if (!t) return
    Layout.alignObject(t, "right")
    Table.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignCenter(table = null) {
    const t = table ?? Table.#selectedTable
    if (!t) return
    Layout.alignObject(t, "center")
    Table.#renderSelection(t, true)
  }

}