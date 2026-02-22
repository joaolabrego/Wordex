// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexSection from "./WordexSection.mjs"
import WordexRange from "./WordexRange.mjs"

export default class WordexParagraph {
    /** @type {HTMLDivElement|null} */
    static #selected = null

    /** @type {HTMLDivElement} */ #owner
    /** @type {HTMLDivElement} */ #paragraph

    /** @param {HTMLDivElement} owner */
    constructor(owner) {
        this.#owner = owner
        this.#paragraph = document.createElement("div")
        this.#paragraph.classList.add("paragraph")
        this.#paragraph.append(document.createElement("br"))
    }
    get instance() {
        return this.#paragraph
    }
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
     * Parágrafo = filho direto do WordexSection.rootSection.
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const rootSection = WordexSection.rootSection
            if (!rootSection) return

            const p = t.closest("div")
            if (!(p instanceof HTMLDivElement) || p.parentElement !== rootSection) {
                WordexParagraph.#clear()
                return
            }

            WordexParagraph.#focus(p)
        })
    }

    static hasFocus() { return !!WordexParagraph.#selected }
    /** @returns {HTMLDivElement|null} */
    static getFocused() { return WordexParagraph.#selected }

    /** @param {HTMLDivElement} p */
    static #focus(p) {
        WordexParagraph.#clear()
        WordexParagraph.#selected = p
        p.classList.add("p-selected")
        WordexParagraph.#applySelectionRing(p)
    }

    static #clear() {
        if (WordexParagraph.#selected) {
            WordexParagraph.#selected.classList.remove("p-selected")
            WordexParagraph.#removeSelectionRing(WordexParagraph.#selected)
        }
        WordexParagraph.#selected = null
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
        WordexRange.saveSelection()
        return true
    }

    /** garante que o execCommand vai atuar no lugar certo */
    static #restore() {
        return WordexRange.restoreRange(WordexRange.range)
    }

    static alignLeft() { WordexParagraph.#restore(); return WordexConfig.exec("justifyLeft") }
    static alignCenter() { WordexParagraph.#restore(); return WordexConfig.exec("justifyCenter") }
    static alignRight() { WordexParagraph.#restore(); return WordexConfig.exec("justifyRight") }
    static justify() { WordexParagraph.#restore(); return WordexConfig.exec("justifyFull") }

    /**
    * @returns {HTMLDivElement|null}
    */
    static getActiveParagraph() {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0)
            return null
        const r = sel.getRangeAt(0)
        const n = r.startContainer

        /** @type {Element|null} */
        const el =
            n.nodeType === Node.ELEMENT_NODE
                ? /** @type {Element} */ (n)
                : n.parentElement

        const p = el ? el.closest("div") : null
        return /** @type {HTMLDivElement|null} */ (p)
    }

    /** @returns {HTMLDivElement|null} */
    static getActive() {
        WordexParagraph.#restore()
        const p = WordexParagraph.getActiveParagraph()
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
        const p = WordexParagraph.#selected ?? WordexParagraph.getActive()
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
        const p = WordexParagraph.#selected ?? WordexParagraph.getActive()
        if (!p) return false

        const w = Math.round(p.getBoundingClientRect().width) || 0
        p.style.width = Math.max(minPx, w - stepPx) + "px"
        p.style.display = "inline-block"
        return true
    }

    // =========================================================
    // reposicionamento
    // =========================================================

    /** Move parágrafo selecionado 1 posição para cima (entre irmãos do rootSection). */
    static moveUp() {
        const rootSection = WordexSection.rootSection
        const p = WordexParagraph.#selected
        if (!rootSection || !p) return false

        const prev = p.previousElementSibling
        if (!(prev instanceof HTMLDivElement)) return false

        rootSection.insertBefore(p, prev)

        WordexParagraph.activate(p, "start")
        WordexParagraph.#focus(p)
        return true
    }

    /** Move parágrafo selecionado 1 posição para baixo (entre irmãos do rootSection). */
    static moveDown() {
        const rootSection = WordexSection.rootSection
        const p = WordexParagraph.#selected
        if (!rootSection || !p) return false

        const next = p.nextElementSibling
        if (!(next instanceof HTMLDivElement)) return false

        rootSection.insertBefore(next, p) // troca

        WordexParagraph.activate(p, "start")
        WordexParagraph.#focus(p)
        return true
    }

    /** “Mover para a direita” = indent (margin-left). */
    static indent(stepPx = 20) {
        const p = WordexParagraph.#selected ?? WordexParagraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = (cur + stepPx) + "px"
        return true
    }

    /** “Mover para a esquerda” = outdent (margin-left). */
    static outdent(stepPx = 20) {
        const p = WordexParagraph.#selected ?? WordexParagraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = Math.max(0, cur - stepPx) + "px"
        return true
    }

    // =========================================================
    // aliases padronizados (mesmos nomes de WordexImage/WordexTable)
    // =========================================================

    /** + (toolbar) */
    static increase(stepPx = 30) {
        return WordexParagraph.increaseWidth(stepPx)
    }

    /** - (toolbar) */
    static decrease(stepPx = 30, minPx = 80) {
        return WordexParagraph.decreaseWidth(stepPx, minPx)
    }

    /** ⬅ (toolbar) */
    static left(stepPx = 20) {
        return WordexParagraph.outdent(stepPx)
    }

    /** ➡ (toolbar) */
    static right(stepPx = 20) {
        return WordexParagraph.indent(stepPx)
    }

    /** ⬆ (toolbar) */
    static up() {
        return WordexParagraph.moveUp()
    }

    /** ⬇ (toolbar) */
    static down() {
        return WordexParagraph.moveDown()
    }
}
