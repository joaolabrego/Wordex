// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexLayout from "./WordexLayout.mjs"
import WordexTable from "./WordexTable.mjs"

export default class WordexMovement {
    // =========================================================
    // Public API
    // =========================================================

    /** @param {Element|null} el */
    static leftWord(el) { return WordexMovement.#moveByWord(el, -1) }

    /** @param {Element|null} el */
    static rightWord(el) { return WordexMovement.#moveByWord(el, +1) }

    /** @param {Element|null} el */
    static upParagraph(el) { return WordexMovement.#moveParagraph(el, -1) }

    /** @param {Element|null} el */
    static downParagraph(el) { return WordexMovement.#moveParagraph(el, +1) }

    // =========================================================
    // Core: move by word
    // =========================================================

    /**
     * Move o elemento para um “offset global” de palavra dentro do parágrafo.
     * Funciona para IMG e TABLE (ou qualquer elemento inline/float).
     *
     * @param {Element|null} el
     * @param {number} dir -1 esquerda, +1 direita
     */
    static #moveByWord(el, dir) {
        if (!el) return false

        const rootSection = WordexConfig.rootSection
        if (!rootSection) return false

        const p = WordexMovement.#getParagraph(el, rootSection)
        if (!p) return false

        const segs = WordexMovement.#getTextSegments(p)
        const fullText = segs.map(s => s.node.nodeValue ?? "").join("")
        if (!fullText.length) return false

        const pos = WordexMovement.#getGlobalOffsetBeforeElement(segs, el)

        const target = dir < 0
            ? WordexMovement.#findPrevWordStart(fullText, pos)
            : WordexMovement.#findNextWordEnd(fullText, pos)

        if (target === pos) return false

        if (!WordexMovement.#insertNodeAtGlobalOffset(p, segs, target, el)) return false

        WordexMovement.#placeCaretAfter(el)
        WordexConfig.saveSelection()
        return true
    }

    // =========================================================
    // Core: move by paragraph
    // =========================================================

    /**
     * Move o elemento entre parágrafos (filhos diretos do rootSection).
     * @param {Element|null} el
     * @param {number} dir -1 acima, +1 abaixo
     */
    static #moveParagraph(el, dir) {
        if (!el) return false

        const rootSection = WordexConfig.rootSection
        if (!rootSection) return false

        const p = WordexMovement.#getParagraph(el, rootSection)
        if (!p) return false

        const target = dir < 0 ? p.previousElementSibling : p.nextElementSibling
        if (!(target instanceof HTMLDivElement)) return false

        target.appendChild(el)

        WordexMovement.#placeCaretAfter(el)
        WordexConfig.saveSelection()
        return true
    }

    // =========================================================
    // Helpers
    // =========================================================

    /**
     * Acha o “parágrafo” como filho direto do rootSection editável.
     * @param {Element} el
     * @param {HTMLElement} rootSection
     * @returns {HTMLDivElement|null}
     */
    static #getParagraph(el, rootSection) {
        /** @type {HTMLElement|null} */
        let cur = /** @type {HTMLElement} */ (el)
        while (cur && cur !== rootSection) {
            const parent = /** @type {HTMLElement} */ (cur.parentElement)
            if (parent === rootSection) return /** @type {HTMLDivElement} */ (cur)
            cur = parent
        }
        return null
    }

    /**
     * Segmentos de texto (TextNodes) com offsets globais.
     * @param {HTMLElement} p
     */
    static #getTextSegments(p) {
        /** @type {{node: Text, start: number, end: number}[]} */
        const segs = []
        let acc = 0

        const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
        /** @type {Node|null} */
        let n
        while ((n = w.nextNode())) {
            const t = /** @type {Text} */ (n)
            const len = (t.nodeValue ?? "").length
            segs.push({ node: t, start: acc, end: acc + len })
            acc += len
        }
        return segs
    }

    /**
     * Soma tamanho de todos TextNodes antes do elemento (ordem DOM).
     * @param {{node: Text, start: number, end: number}[]} segs
     * @param {Element} el
     */
    static #getGlobalOffsetBeforeElement(segs, el) {
        let acc = 0
        for (const s of segs) {
            const rel = s.node.compareDocumentPosition(el)
            const isBefore = (rel & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
            if (isBefore) acc += (s.end - s.start)
        }
        return acc
    }

    /** @param {string} text @param {number} pos */
    static #findPrevWordStart(text, pos) {
        let i = Math.min(pos - 1, text.length - 1)
        while (i >= 0 && !WordexMovement.#isWordChar(text[i])) i--
        if (i < 0) return 0
        while (i >= 0 && WordexMovement.#isWordChar(text[i])) i--
        return i + 1
    }

    /** @param {string} text @param {number} pos */
    static #findNextWordEnd(text, pos) {
        let i = Math.max(0, pos)
        while (i < text.length && !WordexMovement.#isWordChar(text[i])) i++
        if (i >= text.length) return text.length
        while (i < text.length && WordexMovement.#isWordChar(text[i])) i++
        return i
    }

    /** @param {string} ch */
    static #isWordChar(ch) {
        return /[0-9A-Za-zÀ-ÿ_]/.test(ch)
    }

    /**
     * Insere/move um nó para offset global.
     * @param {HTMLElement} p
     * @param {{node: Text, start: number, end: number}[]} segs
     * @param {number} target
     * @param {Element} el
     */
    static #insertNodeAtGlobalOffset(p, segs, target, el) {
        const total = segs.length ? segs[segs.length - 1].end : 0
        if (target >= total) {
            p.appendChild(el)
            return true
        }

        const seg = segs.find(s => target >= s.start && target <= s.end)
        if (!seg) return false

        const tn = seg.node
        const off = target - seg.start
        const len = (tn.nodeValue ?? "").length

        if (off > 0 && off < len) {
            const right = tn.splitText(off)
            right.parentNode?.insertBefore(el, right)
            return true
        }

        if (off === 0) {
            tn.parentNode?.insertBefore(el, tn)
            return true
        }

        if (off === len) {
            const ref = tn.nextSibling
            if (ref) tn.parentNode?.insertBefore(el, ref)
            else tn.parentNode?.appendChild(el)
            return true
        }

        return false
    }

    /** @param {Element} el */
    static #placeCaretAfter(el) {
        const r = document.createRange()
        r.setStartAfter(el)
        r.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
    }

    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static moveLeftWord(instance) { return WordexMovement.leftWord(instance) }
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static moveRightWord(instance) { return WordexMovement.rightWord(instance) }

    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static moveParagraphUp(instance) { return WordexMovement.upParagraph(instance) }
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static moveParagraphDown(instance) { return WordexMovement.downParagraph(instance) }

    // alinhamento com wrap e sem “buraco” por margem
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static alignLeft(instance) { return WordexLayout.alignObject(instance, "left") }
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static alignRight(instance) { return WordexLayout.alignObject(instance, "right") }
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static alignCenter(instance) { return WordexLayout.alignObject(instance, "center") }

    // resize unificado
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static increase(instance) { return WordexLayout.increase(instance) }
    /** @param {HTMLImageElement|HTMLTableElement} instance */
    static decrease(instance) { return WordexLayout.decrease(instance) }

}
