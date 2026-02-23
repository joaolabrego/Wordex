// @ts-check
"use strict"

import wxConfig from "./wxConfig.mjs"
import wdxSection from "./wxSection.mjs"
import wxRange from "./wxRange.mjs"
/** @typedef {import("./wdxTypes.mjs").wdxParagraph} wxParagraphType */
/** @typedef {import("./wdxTypes.mjs").wdxSection} wxSectionType */

export default class wdxParagraph {
    /** @type {HTMLDivElement|null} */
    static #selected = null

    /** @type {wxSectionType} */ #owner
    /** @type {wxParagraphType} */ #paragraph

    /** @param {wxSectionType} owner */
    constructor(owner) {
        this.#owner = owner

        this.#paragraph = /** @type {wxParagraphType} */(document.createElement("div"))
        this.#paragraph.dataset.wxKind = "paragraph"
        this.#paragraph.tabIndex = -1
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
     * Parágrafo = filho direto do wdxSection.rootSection.
     * @param {HTMLElement} scope
     */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            const rootSection = wdxSection.getRoot()
            if (!rootSection) return

            const p = t.closest("div")
            if (!(p instanceof HTMLDivElement) || p.parentElement !== rootSection) {
                wdxParagraph.#clear()
                return
            }

            wdxParagraph.focus(p)
        })
    }

    static hasFocus() { return !!wdxParagraph.#selected }
    /** @returns {HTMLDivElement|null} */
    static getFocused() { return wdxParagraph.#selected }

    /** @param {HTMLDivElement} p */
    static focus(p) {
        wdxParagraph.#clear()
        wdxParagraph.#selected = p
        p.classList.add("p-selected")
        wdxParagraph.#applySelectionRing(p)
    }

    static #clear() {
        if (wdxParagraph.#selected) {
            wdxParagraph.#selected.classList.remove("p-selected")
            wdxParagraph.#removeSelectionRing(wdxParagraph.#selected)
        }
        wdxParagraph.#selected = null
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
        wxRange.saveSelection()
        return true
    }

    /** garante que o execCommand vai atuar no lugar certo */
    static #restore() {
        return wxRange.restoreRange(wxRange.range)
    }

    static alignLeft() { wdxParagraph.#restore(); return wxConfig.exec("justifyLeft") }
    static alignCenter() { wdxParagraph.#restore(); return wxConfig.exec("justifyCenter") }
    static alignRight() { wdxParagraph.#restore(); return wxConfig.exec("justifyRight") }
    static justify() { wdxParagraph.#restore(); return wxConfig.exec("justifyFull") }

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
        wdxParagraph.#restore()
        const p = wdxParagraph.getActiveParagraph()
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
        const p = wdxParagraph.#selected ?? wdxParagraph.getActive()
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
        const p = wdxParagraph.#selected ?? wdxParagraph.getActive()
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
        const rootSection = wdxSection.getRoot()
        const p = wdxParagraph.#selected
        if (!rootSection || !p) return false

        const prev = p.previousElementSibling
        if (!(prev instanceof HTMLDivElement)) return false

        rootSection.insertBefore(p, prev)

        wdxParagraph.activate(p, "start")
        wdxParagraph.focus(p)
        return true
    }

    /** Move parágrafo selecionado 1 posição para baixo (entre irmãos do rootSection). */
    static moveDown() {
        const rootSection = wdxSection.getRoot()
        const p = wdxParagraph.#selected
        if (!rootSection || !p) return false

        const next = p.nextElementSibling
        if (!(next instanceof HTMLDivElement)) return false

        rootSection.insertBefore(next, p) // troca

        wdxParagraph.activate(p, "start")
        wdxParagraph.focus(p)
        return true
    }

    /** “Mover para a direita” = indent (margin-left). */
    static indent(stepPx = 20) {
        const p = wdxParagraph.#selected ?? wdxParagraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = (cur + stepPx) + "px"
        return true
    }

    /** “Mover para a esquerda” = outdent (margin-left). */
    static outdent(stepPx = 20) {
        const p = wdxParagraph.#selected ?? wdxParagraph.getActive()
        if (!p) return false

        const cur = parseInt(p.style.marginLeft || "0", 10) || 0
        p.style.marginLeft = Math.max(0, cur - stepPx) + "px"
        return true
    }

    // =========================================================
    // aliases padronizados (mesmos nomes de wxPicture/wxGrid)
    // =========================================================

    /** + (toolbar) */
    static increase(stepPx = 30) {
        return wdxParagraph.increaseWidth(stepPx)
    }

    /** - (toolbar) */
    static decrease(stepPx = 30, minPx = 80) {
        return wdxParagraph.decreaseWidth(stepPx, minPx)
    }

    /** ⬅ (toolbar) */
    static left(stepPx = 20) {
        return wdxParagraph.outdent(stepPx)
    }

    /** ➡ (toolbar) */
    static right(stepPx = 20) {
        return wdxParagraph.indent(stepPx)
    }

    /** ⬆ (toolbar) */
    static up() {
        return wdxParagraph.moveUp()
    }

    /** ⬇ (toolbar) */
    static down() {
        return wdxParagraph.moveDown()
    }
}
