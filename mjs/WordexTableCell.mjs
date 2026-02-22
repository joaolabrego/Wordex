// @ts-check
"use strict"

import WordexSection from "./WordexSection.mjs"
import WordexRange from "./WordexRange.mjs"

/**
 * WordexTableCell
 * - mantém célula ativa
 * - (opcional) seleção múltipla de células (Alt+Click = toggle)
 * - aplica operações diretamente no TD/TH (sem execCommand)
 *
 * Obs: por enquanto não lida com rowspan/colspan como “grade lógica”.
 */
export default class WordexTableCell {
    /** @type {HTMLTableCellElement|null} */
    static #activeCell = null

    /** @type {Set<HTMLTableCellElement>} */
    static #selectedCells = new Set()

    /**
     * Conecta foco/seleção de célula ao container do editor.
     * Convenção provisória:
     * - Click em célula => ativa (e limpa seleção múltipla)
     * - Alt+Click => toggle seleção múltipla (mantém ativa também)
     *
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const cell = t.closest("td, th")
            if (!(cell instanceof HTMLTableCellElement)) {
                WordexTableCell.#clearActive()
                return
            }

            WordexTableCell.#setActive(cell)

            if (e.altKey) {
                WordexTableCell.toggleSelect(cell)
                e.preventDefault()
            } else {
                // click normal: se tinha seleção múltipla, zera
                if (WordexTableCell.#selectedCells.size) WordexTableCell.clearSelection()
            }
        })
    }

    // -----------------------------
    // estado
    // -----------------------------
    static hasActive() {
        return !!WordexTableCell.#activeCell
    }

    /** @returns {HTMLTableCellElement|null} */
    static getActive() {
        return WordexTableCell.#activeCell
    }

    static hasSelection() {
        return WordexTableCell.#selectedCells.size > 0
    }

    /** @returns {ReadonlyArray<HTMLTableCellElement>} */
    static getSelected() {
        return Array.from(WordexTableCell.#selectedCells)
    }

    static clearSelection() {
        for (const c of WordexTableCell.#selectedCells) c.classList.remove("cell-selected")
        WordexTableCell.#selectedCells.clear()
    }

    /**
     * @param {HTMLTableCellElement} cell
     */
    static toggleSelect(cell) {
        if (WordexTableCell.#selectedCells.has(cell)) {
            WordexTableCell.#selectedCells.delete(cell)
            cell.classList.remove("cell-selected")
            return false
        }
        WordexTableCell.#selectedCells.add(cell)
        cell.classList.add("cell-selected")
        return true
    }

    // -----------------------------
    // operações típicas
    // -----------------------------
    /**
     * Alinha conteúdo da célula (horizontal).
     * cmd: "left" | "center" | "right" | "justify"
     * @param {"left"|"center"|"right"|"justify"} cmd
     * @param {HTMLTableCellElement|null} [cell]
     */
    static align(cmd, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell) return false

        const val =
            cmd === "left" ? "left" :
                cmd === "center" ? "center" :
                    cmd === "right" ? "right" :
                        "justify"

        // aplica na ativa e/ou nas selecionadas (se existirem)
        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) c.style.textAlign = val
            return true
        }

        cell.style.textAlign = val
        return true
    }

    /**
     * @param {string} widthPx ex: "1px" | "0px"
     * @param {string} color ex: "#000000"
     * @param {HTMLTableCellElement|null} [cell]
     */
    static applyBorder(widthPx, color, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell) return false

        const style = widthPx === "0px" ? "none" : "solid"

        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) {
                c.style.borderStyle = style
                c.style.borderWidth = widthPx
                c.style.borderColor = color
            }
            return true
        }

        cell.style.borderStyle = style
        cell.style.borderWidth = widthPx
        cell.style.borderColor = color
        return true
    }

    /**
     * @param {string} radiusPx
     * @param {HTMLTableCellElement|null} [cell]
     */
    static applyBorderRadius(radiusPx, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell) return false

        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) c.style.borderRadius = radiusPx
            return true
        }

        cell.style.borderRadius = radiusPx
        return true
    }

    /**
     * Cor do texto da célula (não usa execCommand).
     * @param {string} hex
     * @param {HTMLTableCellElement|null} [cell]
     */
    static setTextColor(hex, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell || !hex) return false

        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) c.style.color = hex
            return true
        }

        cell.style.color = hex
        return true
    }

    /**
     * Fonte da célula (não usa execCommand).
     * @param {string} name
     * @param {HTMLTableCellElement|null} [cell]
     */
    static setFontFamily(name, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell || !name) return false

        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) c.style.fontFamily = name
            return true
        }

        cell.style.fontFamily = name
        return true
    }

    /**
     * Tamanho (string CSS, ex "12pt" ou "14px")
     * @param {string} sizeCss
     * @param {HTMLTableCellElement|null} [cell]
     */
    static setFontSize(sizeCss, cell = null) {
        cell = cell ?? WordexTableCell.#activeCell
        if (!cell || !sizeCss) return false

        if (WordexTableCell.#selectedCells.size) {
            for (const c of WordexTableCell.#selectedCells) c.style.fontSize = sizeCss
            return true
        }

        cell.style.fontSize = sizeCss
        return true
    }

    // -----------------------------
    // internos (foco/caret)
    // -----------------------------
    /**
     * @param {HTMLTableCellElement} cell
     */
    static #setActive(cell) {
        if (WordexTableCell.#activeCell === cell) return

        if (WordexTableCell.#activeCell) WordexTableCell.#activeCell.classList.remove("cell-active")
        WordexTableCell.#activeCell = cell
        cell.classList.add("cell-active")

        // garante lugar pro caret
        if (!cell.firstChild) cell.appendChild(document.createElement("br"))

        // joga o caret pra dentro (coerente com seu modelo WordexRange.range)
        WordexSection.rootSection?.focus({ preventScroll: true })
        const r = document.createRange()
        r.selectNodeContents(cell)
        r.collapse(true)

        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)

        WordexRange.saveSelection()
    }

    static #clearActive() {
        if (WordexTableCell.#activeCell) WordexTableCell.#activeCell.classList.remove("cell-active")
        WordexTableCell.#activeCell = null
    }
}
