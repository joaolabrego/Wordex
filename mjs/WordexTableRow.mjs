// @ts-check
"use strict"

import WordexSection from "./WordexSection.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexTable from "./WordexTable.mjs"

/**
 * WordexTableRow
 * - mantém estado de “linha ativa” e “linhas selecionadas”
 * - não decide política (WordexPage decidirá depois)
 * - opera em HTMLTableRowElement (TR)
 */
export default class WordexTableRow {
    /** @type {HTMLTableRowElement|null} */
    static #activeRow = null

    /** @type {Set<HTMLTableRowElement>} */
    static #selectedRows = new Set()

    /**
     * Conecta foco/seleção de linha ao container do editor.
     * Convenção provisória (simples):
     * - Alt+Click numa célula => seleciona a linha inteira (toggle)
     * - Click normal numa célula => apenas ativa a linha (sem seleção)
     *
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const cell = t.closest("td, th")
            if (!(cell instanceof HTMLTableCellElement)) return

            const tr = cell.closest("tr")
            if (!(tr instanceof HTMLTableRowElement)) return

            // mantém o foco de célula do WordexTable (se você já estiver usando)
            // (não é obrigatório, mas ajuda a coerência)
            // WordexTable já faz isso no attach dele, mas não atrapalha:
            // (deixe comentado se preferir)
            // if (WordexTable.getActiveCell?.()) {}

            WordexTableRow.#setActive(tr)

            if (e.altKey) {
                // toggle seleção de linha
                WordexTableRow.toggleSelect(tr)
                e.preventDefault()
            }
        })
    }

    /** @returns {boolean} */
    static hasActive() {
        return !!WordexTableRow.#activeRow
    }

    /** @returns {HTMLTableRowElement|null} */
    static getActive() {
        return WordexTableRow.#activeRow
    }

    /** @returns {ReadonlyArray<HTMLTableRowElement>} */
    static getSelected() {
        return Array.from(WordexTableRow.#selectedRows)
    }

    /** @returns {boolean} */
    static hasSelection() {
        return WordexTableRow.#selectedRows.size > 0
    }

    /** limpa seleção (não mexe na ativa) */
    static clearSelection() {
        for (const tr of WordexTableRow.#selectedRows) tr.classList.remove("row-selected")
        WordexTableRow.#selectedRows.clear()
    }

    /**
     * Seleciona (ou desmarca) uma linha.
     * @param {HTMLTableRowElement} tr
     */
    static toggleSelect(tr) {
        if (WordexTableRow.#selectedRows.has(tr)) {
            WordexTableRow.#selectedRows.delete(tr)
            tr.classList.remove("row-selected")
            return false
        }
        WordexTableRow.#selectedRows.add(tr)
        tr.classList.add("row-selected")
        return true
    }

    /**
     * Se existir célula ativa (WordexTable), retorna a linha dela.
     * @returns {HTMLTableRowElement|null}
     */
    static getFromActiveCell() {
        const cell = WordexTable.getActiveCell?.()
        if (!cell) return null
        const tr = cell.closest("tr")
        return tr instanceof HTMLTableRowElement ? tr : null
    }

    /**
     * Aplica alinhamento horizontal à linha inteira (todas as células).
     * cmd: "left" | "center" | "right" | "justify"
     * @param {"left"|"center"|"right"|"justify"} cmd
     * @param {HTMLTableRowElement|null} [tr] se omitido, usa ativa
     */
    static align(cmd, tr = null) {
        tr = tr ?? WordexTableRow.#activeRow
        if (!tr) return false

        const val =
            cmd === "left" ? "left" :
                cmd === "center" ? "center" :
                    cmd === "right" ? "right" :
                        "justify"

        for (const cell of tr.cells) {
            cell.style.textAlign = val
        }
        return true
    }

    /**
     * Aplica border nas células da linha.
     * @param {string} widthPx ex: "1px" | "0px"
     * @param {string} color ex: "#000000"
     * @param {HTMLTableRowElement|null} [tr]
     */
    static applyBorder(widthPx, color, tr = null) {
        tr = tr ?? WordexTableRow.#activeRow
        if (!tr) return false

        const style = widthPx === "0px" ? "none" : "solid"
        for (const cell of tr.cells) {
            cell.style.borderStyle = style
            cell.style.borderWidth = widthPx
            cell.style.borderColor = color
        }
        return true
    }

    /**
     * Ativa uma linha e sincroniza caret com WordexRange.range (na 1ª célula, se possível).
     * @param {HTMLTableRowElement} tr
     */
    static #setActive(tr) {
        if (WordexTableRow.#activeRow === tr) return

        if (WordexTableRow.#activeRow) WordexTableRow.#activeRow.classList.remove("row-active")
        WordexTableRow.#activeRow = tr
        tr.classList.add("row-active")

        // Opcional: se você quiser que ativar linha mova caret para 1ª célula
        const cell = tr.cells?.[0]
        if (cell) {
            // garante que o range fique dentro do escopo atual
            WordexSection.rootSection?.focus({ preventScroll: true })

            const r = document.createRange()
            r.selectNodeContents(cell)
            r.collapse(true)

            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(r)
            WordexRange.saveSelection()
        }
    }
}
