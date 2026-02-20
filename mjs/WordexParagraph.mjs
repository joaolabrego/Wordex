// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"

export default class Paragraph {
    /** @type {HTMLDivElement|null} */
    static #selected = null

    /** @param {HTMLDivElement} p */
    static #applySelectionRing(p) {
        // não encosta em border do parágrafo (é estilo do usuário)
        p.style.outline = ""
        p.style.outlineOffset = ""
        p.style.boxShadow = "inset 0 0 0 2px #0aec0a"
    }

    /** @param {HTMLDivElement} p */
    static #removeSelectionRing(p) {
        // remove só o anel de seleção
        if (p.style.boxShadow === "inset 0 0 0 2px #0aec0a") p.style.boxShadow = ""
    }

    /**
     * Liga seleção de parágrafo ao container do editor.
     * Parágrafo = filho direto do Config.root.
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const root = Config.root
            if (!root) return

            const p = t.closest("div")
            if (!(p instanceof HTMLDivElement) || p.parentElement !== root) {
                Paragraph.#clear()
                return
            }

            Paragraph.#focus(p)
        })
    }

    static hasFocus() { return !!Paragraph.#selected }
    /** @returns {HTMLDivElement|null} */
    static getFocused() { return Paragraph.#selected }

    /** @param {HTMLDivElement} p */
    static #focus(p) {
        Paragraph.#clear()
        Paragraph.#selected = p
        p.classList.add("p-selected")
        Paragraph.#applySelectionRing(p)
    }

    static #clear() {
        if (Paragraph.#selected) {
            Paragraph.#selected.classList.remove("p-selected")
            Paragraph.#removeSelectionRing(Paragraph.#selected)
        }
        Paragraph.#selected = null
    }
    /**
     * @param {HTMLElement} p
     * @param {"start"|"end"} where
     * @returns {boolean}
     */
    static activate(p, where = "end") {
        if (!p) return false
        if (!p.firstChild) p.appendChild(document.createElement("br"))

        const r = document.createRange()
        r.selectNodeContents(p)
        r.collapse(where === "start")

        const sel = window.getSelection()
        if (!sel) return false
        sel.removeAllRanges()
        sel.addRange(r)
        Config.saveSelection()
        return true
    }

    /** garante que o execCommand vai atuar no lugar certo */
    static #restore() {
        return Config.restoreRange(Config.range)
    }

    static alignLeft() { Paragraph.#restore(); return Config.exec("justifyLeft") }
    static alignCenter() { Paragraph.#restore(); return Config.exec("justifyCenter") }
    static alignRight() { Paragraph.#restore(); return Config.exec("justifyRight") }
    static justify() { Paragraph.#restore(); return Config.exec("justifyFull") }

    /** @returns {HTMLDivElement|null} */
    static getActive() {
        Paragraph.#restore()
        const p = Config.getActiveParagraph()
        return /** @type {HTMLDivElement|null} */ (p)
    }

    // =========================================================
    // redimensionamento (largura)
    // =========================================================

    /**
     * Aumenta largura do parágrafo selecionado (ou ativo).
     * @param {number} stepPx
     */
    static increaseWidth(stepPx = 30) {
        const p = Paragraph.#selected ?? Paragraph.getActive()
        if (!p) return false

        const w = Math.round(p.getBoundingClientRect().width) || 0
        p.style.width = (w + stepPx) + "px"
        p.style.display = "inline-block"
        return true
    }

    /**
     * Diminui largura do parágrafo selecionado (ou ativo).
     * @param {number} stepPx
     * @param {number} minPx
     */
    static decreaseWidth(stepPx = 30, minPx = 80) {
        const p = Paragraph.#selected ?? Paragraph.getActive()
        if (!p) return false

        const w = Math.round(p.getBoundingClientRect().width) || 0
        p.style.width = Math.max(minPx, w - stepPx) + "px"
        p.style.display = "inline-block"
        return true
    }

    // =========================================================
    // reposicionamento
    // =========================================================

    /** Move parágrafo selecionado 1 posição para cima (entre irmãos do root). */
    static moveUp() {
        const root = Config.root
        const p = Paragraph.#selected
        if (!root || !p) return false

        const prev = p.previousElementSibling
        if (!(prev instanceof HTMLDivElement)) return false

        root.insertBefore(p, prev)

        Paragraph.activate(p, "start")
        Paragraph.#focus(p)
        return true
    }

    /** Move parágrafo selecionado 1 posição para baixo (entre irmãos do root). */
    static moveDown() {
        const root = Config.root
        const p = Paragraph.#selected
        if (!root || !p) return false

        const next = p.nextElementSibling
        if (!(next instanceof HTMLDivElement)) return false

        root.insertBefore(next, p) // troca

        Paragraph.activate(p, "start")
        Paragraph.#focus(p)
        return true
    }

    /** “Mover para a direita” = indent (margin-left). */
    static indent(stepPx = 20) {
        const p = Paragraph.#selected ?? Paragraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = (cur + stepPx) + "px"
        return true
    }

    /** “Mover para a esquerda” = outdent (margin-left). */
    static outdent(stepPx = 20) {
        const p = Paragraph.#selected ?? Paragraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = Math.max(0, cur - stepPx) + "px"
        return true
    }

    // =========================================================
    // aliases padronizados (mesmos nomes de Image/Table)
    // =========================================================

    /** + (toolbar) */
    static increase(stepPx = 30) {
        return Paragraph.increaseWidth(stepPx)
    }

    /** - (toolbar) */
    static decrease(stepPx = 30, minPx = 80) {
        return Paragraph.decreaseWidth(stepPx, minPx)
    }

    /** ⬅ (toolbar) */
    static left(stepPx = 20) {
        return Paragraph.outdent(stepPx)
    }

    /** ➡ (toolbar) */
    static right(stepPx = 20) {
        return Paragraph.indent(stepPx)
    }

    /** ⬆ (toolbar) */
    static up() {
        return Paragraph.moveUp()
    }

    /** ⬇ (toolbar) */
    static down() {
        return Paragraph.moveDown()
    }
}
