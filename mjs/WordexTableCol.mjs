// @ts-check
"use strict"

import WordexSection from "./WordexSection.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexTable from "./WordexTable.mjs"

/**
 * WordexTableCol
 * - mantém “coluna ativa” e “colunas selecionadas”
 * - seleção provisória: Alt+Click numa célula => toggle da coluna daquela célula
 * - aplica operações na coluna iterando linhas e pegando cellIndex
 *
 * Observação: não trata colspan/rowspan (por enquanto).
 */
export default class WordexTableCol {
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

            WordexTableCol.#setActive(table, idx)

            if (e.altKey) {
                WordexTableCol.toggleSelect(table, idx)
                e.preventDefault()
            }
        })
    }

    /** @returns {boolean} */
    static hasActive() {
        return !!WordexTableCol.#active
    }

    /** @returns {{ table: HTMLTableElement, index: number } | null} */
    static getActive() {
        return WordexTableCol.#active
    }

    /**
     * Se existir célula ativa (WordexTable), retorna a coluna dela.
     * @returns {{ table: HTMLTableElement, index: number } | null}
     */
    static getFromActiveCell() {
        const cell = WordexTable.getActiveCell?.()
        if (!cell) return null
        const table = cell.closest("table")
        if (!(table instanceof HTMLTableElement)) return null
        const idx = cell.cellIndex
        if (idx < 0) return null
        return { table, index: idx }
    }

    /** @param {HTMLTableElement} table */
    static getSelected(table) {
        return Array.from(WordexTableCol.#selected.get(table) ?? [])
    }

    /** @param {HTMLTableElement} table */
    static hasSelection(table) {
        return (WordexTableCol.#selected.get(table)?.size ?? 0) > 0
    }

    /** @param {HTMLTableElement} table */
    static clearSelection(table) {
        const set = WordexTableCol.#selected.get(table)
        if (!set) return
        for (const idx of set) WordexTableCol.#applyClassToColumn(table, idx, "col-selected", false)
        set.clear()
    }

    /**
     * Toggle seleção de coluna
     * @param {HTMLTableElement} table
     * @param {number} idx
     */
    static toggleSelect(table, idx) {
        let set = WordexTableCol.#selected.get(table)
        if (!set) {
            set = new Set()
            WordexTableCol.#selected.set(table, set)
        }

        if (set.has(idx)) {
            set.delete(idx)
            WordexTableCol.#applyClassToColumn(table, idx, "col-selected", false)
            return false
        }

        set.add(idx)
        WordexTableCol.#applyClassToColumn(table, idx, "col-selected", true)
        return true
    }

    /**
     * Alinhamento horizontal na coluna inteira (todas as células daquela coluna).
     * cmd: "left" | "center" | "right" | "justify"
     * @param {"left"|"center"|"right"|"justify"} cmd
     * @param {{ table: HTMLTableElement, index: number } | null} [col]
     */
    static align(cmd, col = null) {
        col = col ?? WordexTableCol.#active
        if (!col) return false

        const val =
            cmd === "left" ? "left" :
                cmd === "center" ? "center" :
                    cmd === "right" ? "right" :
                        "justify"

        for (const cell of WordexTableCol.#iterColumnCells(col.table, col.index)) {
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
        col = col ?? WordexTableCol.#active
        if (!col) return false

        const style = widthPx === "0px" ? "none" : "solid"
        for (const cell of WordexTableCol.#iterColumnCells(col.table, col.index)) {
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
        const prev = WordexTableCol.#active
        if (prev && prev.table === table && prev.index === idx) return

        if (prev) WordexTableCol.#applyClassToColumn(prev.table, prev.index, "col-active", false)

        WordexTableCol.#active = { table, index: idx }
        WordexTableCol.#applyClassToColumn(table, idx, "col-active", true)

        // Opcional: ao ativar coluna, joga caret na 1ª célula “existente”
        const firstCell = WordexTableCol.#findFirstCellInColumn(table, idx)
        if (firstCell) {
            WordexSection.rootSection?.focus({ preventScroll: true })
            const r = document.createRange()
            r.selectNodeContents(firstCell)
            r.collapse(true)
            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(r)
            WordexRange.saveSelection()
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
        for (const cell of WordexTableCol.#iterColumnCells(table, idx)) return cell
        return null
    }

    /**
     * @param {HTMLTableElement} table
     * @param {number} idx
     * @param {string} className
     * @param {boolean} on
     */
    static #applyClassToColumn(table, idx, className, on) {
        for (const cell of WordexTableCol.#iterColumnCells(table, idx)) {
            if (on) cell.classList.add(className)
            else cell.classList.remove(className)
        }
    }
}
