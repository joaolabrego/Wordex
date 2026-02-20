// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"

export default class Layout {
    // =========================================================
    // Alignment
    // =========================================================

    /**
     * @param {HTMLImageElement|HTMLTableElement} el
     * @param {"left"|"center"|"right"} mode
     */
    static alignObject(el, mode) {
        if (!el) return false

        // limpa
        el.style.float = ""
        el.style.display = ""
        el.style.margin = ""
        el.style.verticalAlign = ""

        // wrap (ao redor) => float
        if (mode === "left") {
            el.style.float = "left"
            el.style.margin = "4px 10px 6px 0"
            return true
        }

        if (mode === "right") {
            el.style.float = "right"
            el.style.margin = "4px 0 6px 10px"
            return true
        }

        el.style.display = "inline-block"
        el.style.verticalAlign = "baseline"
        el.style.margin = "0"
        return true
    }

    /**
     * @param {HTMLDivElement|null} p
     * @param {"left"|"center"|"right"} mode
     */
    static alignParagraphBox(p, mode) {
        if (!p) return false

        // default: largura automática => sem sentido alinhar box
        // mas quando você reduzir width do parágrafo, isso funciona.
        if (mode === "left") {
            p.style.marginLeft = "0"
            p.style.marginRight = "auto"
            return true
        }
        if (mode === "right") {
            p.style.marginLeft = "auto"
            p.style.marginRight = "0"
            return true
        }
        p.style.marginLeft = "auto"
        p.style.marginRight = "auto"
        return true
    }
    /** @param {HTMLImageElement|HTMLTableElement} el */
    static increase(el) { return Layout.#resize(el, 1.1) }

    /** @param {HTMLImageElement|HTMLTableElement} el */
    static decrease(el) { return Layout.#resize(el, 0.9) }

    /**
     * @param {HTMLImageElement|HTMLTableElement} el 
     * @param {number} factor
     */
    static #resize(el, factor) {
        if (!el) return false

        const w = el.getBoundingClientRect().width
        if (!w) return false

        const newW = Math.max(20, Math.round(w * factor))
        el.style.width = newW + "px"

        if (el instanceof HTMLImageElement) el.style.height = "auto"

        Config.saveSelection()
        return true
    }

    /**
     * @param {string} justifyCmd
     */
    static normalizeJustify(justifyCmd) {
        if (justifyCmd === "justifyLeft") return "left"
        if (justifyCmd === "justifyRight") return "right"
        return "center"
    }
}
