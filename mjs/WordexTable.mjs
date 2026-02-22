// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexMovement from "./WordexMovement.mjs"
import WordexLayout from "./WordexLayout.mjs"
import WordexPage from "./WordexPage.mjs"

export default class WordexTable {
    /** @type {WordexPage} */ #page
    /** @type {HTMLTableCellElement|null} */ static activeCell = null
    /** @type {HTMLTableElement|null} */ static selectedTable = null

    // 0 = table, 1 = row, 2 = col
    static #cycleMode = 0
    
    /** @type {HTMLTableRowElement|null} */ static #selectedRow = null
    /** @type {{table:HTMLTableElement, index:number}|null} */ static #selectedCol = null

    static #SEL_W = 2
    static #SEL_COLOR = "#0AEC0A"


    /** @param {WordexPage} page */
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
                WordexTable.#clearAll()
                return
            }

            const table = cell.closest("table")
            if (!(table instanceof HTMLTableElement)) return

            if (e.ctrlKey) {
                // se não era a mesma tabela, apenas seleciona tabela
                if (WordexTable.selectedTable !== table) {
                    WordexTable.#focusTable(table)
                    WordexTable.#clearRowCol()
                    WordexTable.#clearCell()
                    WordexTable.#cycleMode = 0
                    e.preventDefault()
                    return
                }

                // ciclo row -> col -> table
                if (WordexTable.#cycleMode === 0) {
                    WordexTable.#selectRowFromCell(cell)
                    WordexTable.#cycleMode = 1
                } else if (WordexTable.#cycleMode === 1) {
                    WordexTable.#selectColFromCell(cell)
                    WordexTable.#cycleMode = 2
                } else {
                    WordexTable.#clearRowCol()
                    WordexTable.#cycleMode = 0
                }

                // ctrl-click não seleciona célula
                WordexTable.#clearCell()
                e.preventDefault()
                return
            }

            // clique comum: seleciona célula
            WordexTable.#focusTable(table)
            WordexTable.#clearRowCol()
            WordexTable.#cycleMode = 0
            WordexTable.#focusCell(cell)
            WordexTable.#placeCaretInCell(cell)
            WordexConfig.saveSelection()
        })
    }

    // =========================================================
    // Focus API
    // =========================================================
    static hasFocus() { return !!WordexTable.selectedTable }
  /** @returns {HTMLTableElement|null} */ static getFocused() { return WordexTable.selectedTable }

    static hasActiveCell() { return !!WordexTable.activeCell }
  /** @returns {HTMLTableCellElement|null} */ static getActiveCell() { return WordexTable.activeCell }

    static hasSelectedRow() { return !!WordexTable.#selectedRow }
  /** @returns {HTMLTableRowElement|null} */ static getSelectedRow() { return WordexTable.#selectedRow }

    static hasSelectedCol() { return !!WordexTable.#selectedCol }
  /** @returns {{table:HTMLTableElement, index:number}|null} */ static getSelectedCol() { return WordexTable.#selectedCol }

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
     * Insere tabela na posição do cursor (WordexConfig.range)
     * @param {number} rows
     * @param {number} cols
     * @returns {boolean}
     */
    static insertAtSelection(rows = 2, cols = 2) {
        WordexConfig.restoreRange(WordexConfig.range)

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

        const table = WordexTable.create(rows, cols)

        // se estiver no meio de TextNode, split é automático, mas vamos evitar “surpresas”:
        // insere e garante que não cria nós de espaço.
        range.insertNode(table)

        // nasce selecionada
        WordexTable.#focusTable(table)
        WordexTable.#clearRowCol()
        WordexTable.#clearCell()
        WordexTable.#cycleMode = 0

        const firstCell = table.querySelector("td")
        if (firstCell instanceof HTMLTableCellElement) {
            WordexTable.#focusCell(firstCell)
            WordexTable.#placeCaretInCell(firstCell)
            WordexConfig.saveSelection()
            return true
        }

        range.setStartAfter(table)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        WordexConfig.saveSelection()
        return true
    }

    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const t = WordexTable.selectedTable
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

        WordexConfig.saveSelection()
        return true
    }

    /** @param {HTMLTableElement} table */
    static increase(table) {
        if (!table)
            return
        WordexTable.#resize(table, 1.1)
    }
    
    /** @param {HTMLTableElement} t */
    static decrease(t) {
        if (!t) return
        WordexLayout.decrease(t)
    }

    /** @param {HTMLTableElement} t */
    static moveLeftWord(t) {
        if (!t) return
        WordexMovement.moveLeftWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveRightWord(t) {
        if (!t) return
        WordexMovement.moveRightWord(t)
    }

    /** @param {HTMLTableElement} t */
    static moveUp(t) {
        if (!t) return
        WordexMovement.moveParagraphUp(t)
    }

    /** @param {HTMLTableElement} t */
    static moveDown(t) {
        if (!t) return
        WordexMovement.moveParagraphDown(t)
    }

    // =========================================================
    // Border / Radius (WordexPage)
    // prioridade: row/col -> cell -> table
    // =========================================================
    /**
     * @param {string} widthPx
     * @param {string} color
     * @returns {boolean}
     */
    static applyBorder(widthPx, color) {
        const table = WordexTable.selectedTable
        if (!table) return false

        const borderStyle = widthPx === "0px" ? "none" : "solid"

        if (WordexTable.#selectedRow) {
            for (const cell of WordexTable.#selectedRow.cells) {
                cell.style.borderStyle = borderStyle
                cell.style.borderWidth = widthPx
                cell.style.borderColor = color
            }
            return true
        }

        if (WordexTable.#selectedCol) {
            const { table, index } = WordexTable.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (!td) continue
                td.style.borderStyle = borderStyle
                td.style.borderWidth = widthPx
                td.style.borderColor = color
            }
            return true
        }

        if (WordexTable.activeCell) {
            const td = WordexTable.activeCell
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
        WordexTable.#renderSelection(table, true)
        return true
    }

    /**
     * @param {string} radiusPx
     * @returns {boolean}
     */
    static applyBorderRadius(radiusPx) {
        const table = WordexTable.selectedTable
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

        if (WordexTable.#selectedRow) {
            clearCells(allCells)
            const cells = WordexTable.#selectedRow.cells
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

        if (WordexTable.#selectedCol) {
            clearCells(allCells)
            const { index } = WordexTable.#selectedCol
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

        if (WordexTable.activeCell) {
            WordexTable.activeCell.style.borderRadius = radiusPx
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

        WordexTable.#renderSelection(table, true)
        return true
    }

    // =========================================================
    // Internals: selection visuals (outline => não briga com border/radius)
    // =========================================================
    /** @param {HTMLTableElement} table @param {boolean} selected */
    static #renderSelection(table, selected) {
        if (selected) {
            table.style.outline = `${WordexTable.#SEL_W}px solid ${WordexTable.#SEL_COLOR}`
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
        WordexTable.#clearTable()
        WordexTable.selectedTable = table
        table.classList.add("table-selected")
        WordexTable.#renderSelection(table, true)

        // ao selecionar table/row/col, célula deve ser explicitamente clicada
        // então limpamos a célula ativa aqui
        // (se você preferir manter célula no clique comum, ok — aqui é chamado em ambos,
        // então o clique comum vai recolocar via #focusCell)
    }

    /** @param {HTMLTableCellElement} cell */
    static #focusCell(cell) {
        WordexTable.#clearCell()
        WordexTable.activeCell = cell
        cell.classList.add("cell-active")
    }

    static #clearCell() {
        if (WordexTable.activeCell) WordexTable.activeCell.classList.remove("cell-active")
        WordexTable.activeCell = null
    }

    static #clearTable() {
        if (WordexTable.selectedTable) {
            const t = WordexTable.selectedTable
            t.classList.remove("table-selected")
            WordexTable.#renderSelection(t, false)
        }
        WordexTable.selectedTable = null
    }

    static #clearRowCol() {
        if (WordexTable.#selectedRow) {
            WordexTable.#selectedRow.classList.remove("row-selected")
            WordexTable.#selectedRow = null
        }

        if (WordexTable.#selectedCol) {
            const { table, index } = WordexTable.#selectedCol
            for (const tr of table.rows) {
                const td = tr.cells[index]
                if (td) td.classList.remove("col-selected")
            }
            WordexTable.#selectedCol = null
        }
    }

    static #clearAll() {
        WordexTable.#clearCell()
        WordexTable.#clearRowCol()
        WordexTable.#clearTable()
        WordexTable.#cycleMode = 0
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
        WordexTable.#clearRowCol()
        const tr = cell.parentElement
        if (tr instanceof HTMLTableRowElement) {
            tr.classList.add("row-selected")
            WordexTable.#selectedRow = tr
        }
    }

    /** @param {HTMLTableCellElement} cell */
    static #selectColFromCell(cell) {
        WordexTable.#clearRowCol()
        const table = cell.closest("table")
        if (!(table instanceof HTMLTableElement)) return

        const idx = cell.cellIndex
        for (const r of table.rows) {
            const td = r.cells[idx]
            if (td) td.classList.add("col-selected")
        }
        WordexTable.#selectedCol = { table, index: idx }
    }

  // =========================================================
  // WordexAlignment (wrap / center)
  // =========================================================
  /**
   * @param {HTMLTableElement|null} table
   */
  static alignLeft(table = null) {
    const t = table ?? WordexTable.selectedTable
    if (!t) return
    WordexLayout.alignObject(t, "left")
    WordexTable.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignRight(table = null) {
    const t = table ?? WordexTable.selectedTable
    if (!t) return
    WordexLayout.alignObject(t, "right")
    WordexTable.#renderSelection(t, true)
  }

  /**
   * @param {HTMLTableElement|null} table
   */
  static alignCenter(table = null) {
    const t = table ?? WordexTable.selectedTable
    if (!t) return
    WordexLayout.alignObject(t, "center")
    WordexTable.#renderSelection(t, true)
  }

}