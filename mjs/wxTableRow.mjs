// @ts-check
"use strict"

import wxSection from "./wxSection.mjs"
import wxRange from "./wxRange.mjs"
import wxTable from "./wxTable.mjs"

/**
 * wxTableRow
 * - mantém estado de “linha ativa” e “linhas selecionadas”
 * - não decide política (wxPage decidirá depois)
 * - opera em HTMLTableRowElement (TR)
 */
export default class wxTableRow {
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

            // mantém o foco de célula do wxTable (se você já estiver usando)
            // (não é obrigatório, mas ajuda a coerência)
            // wxTable já faz isso no attach dele, mas não atrapalha:
            // (deixe comentado se preferir)
            // if (wxTable.getActiveCell?.()) {}

            wxTableRow.#setActive(tr)

            if (e.altKey) {
                // toggle seleção de linha
                wxTableRow.toggleSelect(tr)
                e.preventDefault()
            }
        })
    }

    /** @returns {boolean} */
    static hasActive() {
        return !!wxTableRow.#activeRow
    }

    /** @returns {HTMLTableRowElement|null} */
    static getActive() {
        return wxTableRow.#activeRow
    }

    /** @returns {ReadonlyArray<HTMLTableRowElement>} */
    static getSelected() {
        return Array.from(wxTableRow.#selectedRows)
    }

    /** @returns {boolean} */
    static hasSelection() {
        return wxTableRow.#selectedRows.size > 0
    }

    /** limpa seleção (não mexe na ativa) */
    static clearSelection() {
        for (const tr of wxTableRow.#selectedRows) tr.classList.remove("row-selected")
        wxTableRow.#selectedRows.clear()
    }

    /**
     * Seleciona (ou desmarca) uma linha.
     * @param {HTMLTableRowElement} tr
     */
    static toggleSelect(tr) {
        if (wxTableRow.#selectedRows.has(tr)) {
            wxTableRow.#selectedRows.delete(tr)
            tr.classList.remove("row-selected")
            return false
        }
        wxTableRow.#selectedRows.add(tr)
        tr.classList.add("row-selected")
        return true
    }

    /**
     * Se existir célula ativa (wxTable), retorna a linha dela.
     * @returns {HTMLTableRowElement|null}
     */
    static getFromActiveCell() {
        const cell = wxTable.getActiveCell?.()
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
        tr = tr ?? wxTableRow.#activeRow
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
        tr = tr ?? wxTableRow.#activeRow
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
     * Ativa uma linha e sincroniza caret com wxRange.range (na 1ª célula, se possível).
     * @param {HTMLTableRowElement} tr
     */
    static #setActive(tr) {
        if (wxTableRow.#activeRow === tr) return

        if (wxTableRow.#activeRow) wxTableRow.#activeRow.classList.remove("row-active")
        wxTableRow.#activeRow = tr
        tr.classList.add("row-active")

        // Opcional: se você quiser que ativar linha mova caret para 1ª célula
        const cell = tr.cells?.[0]
        if (cell) {
            // garante que o range fique dentro do escopo atual
            wxSection.rootSection?.focus({ preventScroll: true })

            const r = document.createRange()
            r.selectNodeContents(cell)
            r.collapse(true)

            const sel = window.getSelection()
            sel?.removeAllRanges()
            sel?.addRange(r)
            wxRange.saveSelection()
        }
    }
}
