// @ts-check
"use strict"

import wxMovement from "./wxMovement.mjs"
import wxRange from "./wxRange.mjs"
import wxLayout from "./wxLayout.mjs"
import wxPage from "./wxPage.mjs"

export default class wxGrid {
    /** @type {wxPage} */ #page
    /** @type {HTMLTableCellElement|null} */ static activeCell = null
    /** @type {HTMLTableElement|null} */ static selectedTable = null

    // 0 = table, 1 = row, 2 = col
    static #cycleMode = 0
    
    /** @type {HTMLTableRowElement|null} */ static #selectedRow = null
    /** @type {{table:HTMLTableElement, index:number}|null} */ static #selectedCol = null

    static #SEL_W = 2
    static #SEL_COLOR = "#0AEC0A"


    /** @param {wxPage} page */
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
                wxGrid.#clearAll()
                return
            }

            const table = cell.closest("table")
            if (!(table instanceof HTMLTableElement)) return

            if (e.ctrlKey) {
                // se não era a mesma tabela, apenas seleciona tabela
                if (wxGrid.selectedTable !== table) {
                    wxGrid.#focusTable(table)
                    wxGrid.#clearRowCol()
                    wxGrid.#clearCell()
                    wxGrid.#cycleMode = 0
                    e.preventDefault()
                    return
                }

                // ciclo row -> col -> table
                if (wxGrid.#cycleMode === 0) {
                    wxGrid.#selectRowFromCell(cell)
                    wxGrid.#cycleMode = 1
                } else if (wxGrid.#cycleMode === 1) {
                    wxGrid.#selectColFromCell(cell)
                    wxGrid.#cycleMode = 2
                } else {
                    wxGrid.#clearRowCol()
                    wxGrid.#cycleMode = 0
                }

                // ctrl-click não seleciona célula
                wxGrid.#clearCell()
                e.preventDefault()
                return
            }

            // clique comum: seleciona célula
            wxGrid.#focusTable(table)
            wxGrid.#clearRowCol()
            wxGrid.#cycleMode = 0
            wxGrid.#focusCell(cell)
            wxGrid.#placeCaretInCell(cell)
            wxRange.saveSelection()
        })
    }

    // =========================================================
    // Focus API
    // =========================================================
    static hasFocus() { return !!wxGrid.selectedTable }
  /** @returns {HTMLTableElement|null} */ static getFocused() { return wxGrid.selectedTable }

    static hasActiveCell() { return !!wxGrid.activeCell }
  /** @returns {HTMLTableCellElement|null} */ static getActiveCell() { return wxGrid.activeCell }

    static hasSelectedRow() { return !!wxGrid.#selectedRow }
  /** @returns {HTMLTableRowElement|null} */ static getSelectedRow() { return wxGrid.#selectedRow }

    static hasSelectedCol() { return !!wxGrid.#selectedCol }
  /** @returns {{table:HTMLTableElement, index:number}|null} */ static getSelectedCol() { return wxGrid.#selectedCol }

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
     * Insere tabela na posição do cursor (wxRange.range)
     * @param {number} rows
     * @param {number} cols
     * @returns {boolean}
     */
    static insertAtSelection(rows = 2, cols = 2) {
        wxRange.restoreRange(wxRange.range)

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

        const table = wxGrid.create(rows, cols)

        // se estiver no meio de TextNode, split é automático, mas vamos evitar “surpresas”:
        // insere e garante que não cria nós de espaço.
        range.insertNode(table)

        // nasce selecionada
        wxGrid.#focusTable(table)
        wxGrid.#clearRowCol()
        wxGrid.#clearCell()
        wxGrid.#cycleMode = 0

        const firstCell = table.querySelector("td")
        if (firstCell instanceof HTMLTableCellElement) {
            wxGrid.#focusCell(firstCell)
            wxGrid.#placeCaretInCell(firstCell)
            wxRange.saveSelection()
            return true
        }

        range.setStartAfter(table)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        wxRange.saveSelection()
        return true
    }

    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const t = wxGrid.selectedTable
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

        wxRange.saveSelection()
        return true
    }

    /** @param {HTMLTableElement} table */
    static increase(table) {
        if (!table)
            return
        wxGrid.#resize(table, 1.1)
    }
    
    /** @param {HTMLTableElement} t */
    static decrease(t) {
        if (!t) return
        wxLayout.decrease(t)
    }

    /** @param {HTMLTableElement} t */
    static moveLeftWord(t) {
        if (!t) return
        wxMovement.moveLeftWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveRightWord(t) {
        if (!t) return
        wxMovement.moveRightWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveUp(t) {
        if (!t) return
        wxMovement.moveParagraphUp(t)
    }

    /** @param {HTMLTableElement} t */
    static moveDown(t) {
        if (!t) return
        wxMovement.moveParagraphDown(t)
    }

    // =========================================================
    // Border / Radius (wxPage)
    // prioridade: row/col -> cell -> table
    // =========================================================
    /**
     * @param {string} widthPx
     * @param {string} color
     * @returns {boolean}
     */
    static applyBorder(widthPx, color) {
        const table = wxGrid.selectedTable
        if (!table) return false

        const borderStyle = widthPx === "0px" ? "none" : "solid"

        if (wxGrid.#selectedRow) {
            for (const cell of wxGrid.#selectedRow.cells) {
                cell.style.borderStyle = borderStyle
                cell.style.borderWidth = widthPx
                cell.style.borderColor = color
            }
            return true
        }

        if (wxGrid.#selectedCol) {
            const { table, index } = wxGrid.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (!td) continue
                td.style.borderStyle = borderStyle
                td.style.borderWidth = widthPx
                td.style.borderColor = color
            }
            return true
        }

        if (wxGrid.activeCell) {
            const td = wxGrid.activeCell
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
        wxGrid.#renderSelection(table, true)
        return true
    }

    /**
     * @param {string} radiusPx
     * @returns {boolean}
     */
    static applyBorderRadius(radiusPx) {
        const table = wxGrid.selectedTable
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

        if (wxGrid.#selectedRow) {
            clearCells(allCells)
            const cells = wxGrid.#selectedRow.cells
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

        if (wxGrid.#selectedCol) {
            clearCells(allCells)
            const { index } = wxGrid.#selectedCol
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

        if (wxGrid.activeCell) {
            wxGrid.activeCell.style.borderRadius = radiusPx
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

        wxGrid.#renderSelection(table, true)
        return true
    }

    // =========================================================
    // Internals: selection visuals (outline => não briga com border/radius)
    // =========================================================
    /** @param {HTMLTableElement} table @param {boolean} selected */
    static #renderSelection(table, selected) {
        if (selected) {
            table.style.outline = `${wxGrid.#SEL_W}px solid ${wxGrid.#SEL_COLOR}`
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
        wxGrid.#clearTable()
        wxGrid.selectedTable = table
        table.classList.add("table-selected")
        wxGrid.#renderSelection(table, true)

        // ao selecionar table/row/col, célula deve ser explicitamente clicada
        // então limpamos a célula ativa aqui
        // (se você preferir manter célula no clique comum, ok — aqui é chamado em ambos,
        // então o clique comum vai recolocar via #focusCell)
    }

    /** @param {HTMLTableCellElement} cell */
    static #focusCell(cell) {
        wxGrid.#clearCell()
        wxGrid.activeCell = cell
        cell.classList.add("cell-active")
    }

    static #clearCell() {
        if (wxGrid.activeCell) wxGrid.activeCell.classList.remove("cell-active")
        wxGrid.activeCell = null
    }

    static #clearTable() {
        if (wxGrid.selectedTable) {
            const t = wxGrid.selectedTable
            t.classList.remove("table-selected")
            wxGrid.#renderSelection(t, false)
        }
        wxGrid.selectedTable = null
    }

    static #clearRowCol() {
        if (wxGrid.#selectedRow) {
            wxGrid.#selectedRow.classList.remove("row-selected")
            wxGrid.#selectedRow = null
        }

        if (wxGrid.#selectedCol) {
            const { table, index } = wxGrid.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (td) td.classList.remove("col-selected")
            }
            wxGrid.#selectedCol = null
        }
    }

    static #clearAll() {
        wxGrid.#clearCell()
        wxGrid.#clearRowCol()
        wxGrid.#clearTable()
        wxGrid.#cycleMode = 0
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
        wxGrid.#clearRowCol()
        const tr = cell.parentElement
        if (tr instanceof HTMLTableRowElement) {
            tr.classList.add("row-selected")
            wxGrid.#selectedRow = tr
        }
    }

    /** @param {HTMLTableCellElement} cell */
    static #selectColFromCell(cell) {
        wxGrid.#clearRowCol()
        const table = cell.closest("table")
        if (!(table instanceof HTMLTableElement)) return

        const idx = cell.cellIndex
        for (const r of table.rows) {
            const td = r.cells[idx]
            if (td) td.classList.add("col-selected")
        }
        wxGrid.#selectedCol = { table, index: idx }
    }

  // =========================================================
  // wxAlignment (wrap / center)
  // =========================================================
  /**
   * @param {HTMLTableElement|null} table
   */
  static alignLeft(table = null) {
    const t = table ?? wxGrid.selectedTable
    if (!t) return
    wxLayout.alignObject(t, "left")
    wxGrid.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignRight(table = null) {
    const t = table ?? wxGrid.selectedTable
    if (!t) return
    wxLayout.alignObject(t, "right")
    wxGrid.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignCenter(table = null) {
    const t = table ?? wxGrid.selectedTable
    if (!t) return
    wxLayout.alignObject(t, "center")
    wxGrid.#renderSelection(t, true)
  }

}