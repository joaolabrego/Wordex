// @ts-check
"use strict"

import wxSection from "./wxSection.mjs"
import wxRange from "./wxRange.mjs"
import wxTable from "./wxTable.mjs"

/**
 * wxTableCol
 * - mantém “coluna ativa” e “colunas selecionadas”
 * - seleção provisória: Alt+Click numa célula => toggle da coluna daquela célula
 * - aplica operações na coluna iterando linhas e pegando cellIndex
 *
 * Observação: não trata colspan/rowspan (por enquanto).
 */
export default class wxTableCol {
    /** @type {{ table: HTMLTableElement, index: number } | null} */
    static #active = null

    /** @type {WeakMap<HTMLTableElement, Set<number>>} */
    static #selected = new WeakMap()

    /**
     * Conecta foco/seleção de coluna ao container do editor.
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const cell = t.closest("td, th")
            if (!(cell instanceof HTMLTableCellElement)) return

            const table = cell.closest("table")
            if (!(table instanceof HTMLTableElement)) return

            const idx = cell.cellIndex
            if (idx < 0) return

            wxTableCol.#setActive(table, idx)

            if (e.altKey) {
                wxTableCol.toggleSelect(table, idx)
                e.preventDefault()
            }
        })
    }

    /** @returns {boolean} */
    static hasActive() {
        return !!wxTableCol.#active
    }

    /** @returns {{ table: HTMLTableElement, index: number } | null} */
    static getActive() {
        return wxTableCol.#active
    }

    /**
     * Se existir célula ativa (wxTable), retorna a coluna dela.
     * @returns {{ table: HTMLTableElement, index: number } | null}
     */
    static getFromActiveCell() {
        const cell = wxTable.getActiveCell?.()
        if (!cell) return null
        const table = cell.closest("table")
        if (!(table instanceof HTMLTableElement)) return null
        const idx = cell.cellIndex
        if (idx < 0) return null
        return { table, index: idx }
    }

    /** @param {HTMLTableElement} table */
    static getSelected(table) {
        return Array.from(wxTableCol.#selected.get(table) ?? [])
    }

    /** @param {HTMLTableElement} table */
    static hasSelection(table) {
        return (wxTableCol.#selected.get(table)?.size ?? 0) > 0
    }

    /** @param {HTMLTableElement} table */
    static clearSelection(table) {
        const set = wxTableCol.#selected.get(table)
        if (!set) return
        for (const idx of set) wxTableCol.#applyClassToColumn(table, idx, "col-selected", false)
        set.clear()
    }

    /**
     * Toggle seleção de coluna
     * @param {HTMLTableElement} table
     * @param {number} idx
     */
    static toggleSelect(table, idx) {
        let set = wxTableCol.#selected.get(table)
        if (!set) {
            set = new Set()
            wxTableCol.#selected.set(table, set)
        }

        if (set.has(idx)) {
            set.delete(idx)
            wxTableCol.#applyClassToColumn(table, idx, "col-selected", false)
            return false
        }

        set.add(idx)
        wxTableCol.#applyClassToColumn(table, idx, "col-selected", true)
        return true
    }

    /**
     * Alinhamento horizontal na coluna inteira (todas as células daquela coluna).
     * cmd: "left" | "center" | "right" | "justify"
     * @param {"left"|"center"|"right"|"justify"} cmd
     * @param {{ table: HTMLTableElement, index: number } | null} [col]
     */
    static align(cmd, col = null) {
        col = col ?? wxTableCol.#active
        if (!col) return false

        const val =
            cmd === "left" ? "left" :
                cmd === "center" ? "center" :
                    cmd === "right" ? "right" :
                        "justify"

        for (const cell of wxTableCol.#iterColumnCells(col.table, col.index)) {
            cell.style.textAlign = val
        }
        return true
    }

    /**
     * Aplica border nas células da coluna.
     * @param {string} widthPx ex: "1px" | "0px"
     * @param {string} color ex: "#000000"
     * @param {{ table: HTMLTableElement, index: number } | null} [col]
     */
    static applyBorder(widthPx, color, col = null) {
        col = col ?? wxTableCol.#active
        if (!col) return false

        const style = widthPx === "0px" ? "none" : "solid"
        for (const cell of wxTableCol.#iterColumnCells(col.table, col.index)) {
            cell.style.borderStyle = style
            cell.style.borderWidth = widthPx
            cell.style.borderColor = color
        }
        return true
    }

    // -----------------------------
    // internos
    // -----------------------------

    /**
     * @param {HTMLTableElement} table
     * @param {number} idx
     */
    static #setActive(table, idx) {
        const prev = wxTableCol.#active
        if (prev && prev.table === table && prev.index === idx) return

        if (prev) wxTableCol.#applyClassToColumn(prev.table, prev.index, "col-active", false)

        wxTableCol.#active = { table, index: idx }
        wxTableCol.#applyClassToColumn(table, idx, "col-active", true)

        // Opcional: ao ativar coluna, joga caret na 1ª célula “existente”
        const firstCell = wxTableCol.#findFirstCellInColumn(table, idx)
        if (firstCell) {
            wxSection.rootSection?.focus({ preventScroll: true })
            const r = document.createRange()
            r.selectNodeContents(firstCell)
            r.collapse(true)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(r)
            wxRange.saveSelection()
        }
    }

    /**
     * Itera células “simples” por cellIndex (não trata spans)
     * @param {HTMLTableElement} table
     * @param {number} idx
     */
    static *#iterColumnCells(table, idx) {
        const rows = table.rows
        for (let r = 0; r < rows.length; r++) {
            const row = rows[r]
            const cell = row.cells[idx]
            if (cell) yield cell
        }
    }

    /**
     * @param {HTMLTableElement} table
     * @param {number} idx
     */
    static #findFirstCellInColumn(table, idx) {
        for (const cell of wxTableCol.#iterColumnCells(table, idx)) return cell
        return null
    }

    /**
     * @param {HTMLTableElement} table
     * @param {number} idx
     * @param {string} className
     * @param {boolean} on
     */
    static #applyClassToColumn(table, idx, className, on) {
        for (const cell of wxTableCol.#iterColumnCells(table, idx)) {
            if (on) cell.classList.add(className)
            else cell.classList.remove(className)
        }
    }
}
