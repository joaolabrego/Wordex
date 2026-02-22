// @ts-check
"use strict"

import WordexMovement from "./WordexMovement.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexLayout from "./WordexLayout.mjs"
import WordexAlignment from "./WordexAlignment.mjs"

export default class WordexImage {
  /** @type {HTMLImageElement|null} */ static #selectedImage = null
    static #SEL_W = 2
    static #SELECTED_COLOR = "#0aec0a"
    
    /** @param {HTMLDivElement} scope */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            if (t instanceof HTMLImageElement)
                WordexImage.#focus(t)
            else
                WordexImage.#clearFocus()
        })
    }

    static hasFocus() { return !!WordexImage.#selectedImage }
    /** @returns {HTMLImageElement|null} */
    static getFocused() { return WordexImage.#selectedImage }
    /**
     * @param {string} borderWidthPx 
     * @param {string} color */
    static applyBorder(borderWidthPx, color) {
        const img = WordexImage.#selectedImage
        if (!img) return false
        img.style.borderStyle = borderWidthPx === "0px" ? "none" : "solid"
        img.style.borderWidth = borderWidthPx
        img.style.borderColor = color
        return true
    }
    /** @param {string} radiusPx */
    static applyBorderRadius(radiusPx) {
        const img = WordexImage.#selectedImage
        if (!img) return false
        img.style.borderRadius = radiusPx
        return true
    }
    /** @param {"left"|"center"|"right"|"justify"} dir */
    static align(dir) {
        const img = WordexImage.#selectedImage
        if (!img) return false
        WordexAlignment.wrapAlign(img, dir)
        return true
    }
    /**  @param {HTMLImageElement} img */
    static moveUp(img) {
        if (!img) return
        WordexMovement.moveParagraphUp(img)
    }
    /**  @param {HTMLImageElement} img */
    static moveDown(img) {
        if (!img) return
        WordexMovement.moveParagraphDown(img)
    }
    /**
     * @param {File|null} file
     */
    static async createFromFile(file) {
        if (!file) return
        const src = await WordexImage.#fileToDataUrl(file)
        WordexRange.restoreRange(WordexRange.range)
        WordexImage.insertAtSelection(src)
    }
    /**
     * @param {string} url
     */
    static async createFromUrl(url) {
        if (!url) return
        WordexRange.restoreRange(WordexRange.range)

        if (url.startsWith("data:")) {
            WordexImage.insertAtSelection(url)
            return
        }

        const dataUrl = await WordexImage.#urlToDataUrl(url)
        WordexImage.insertAtSelection(dataUrl)
    }
    /** @param {File|null} file */
    static async insertImageFromFile(file) {
        await WordexImage.createFromFile(file)
    }    
    /** @param {string} src */
    static insertAtSelection(src) {
        const r = WordexRange.getSelRange?.() ?? WordexRange.range
        if (!r) return

        const img = document.createElement("img")
        img.src = src
        img.style.width = "300px"
        img.style.height = "auto"
        img.style.maxWidth = "100%"
        img.style.verticalAlign = "baseline"
        img.style.margin = "4px 0 6px 0"

        r.deleteContents()
        r.insertNode(img)
        r.setStartAfter(img)
        r.collapse(true)

        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(r)
        WordexRange.saveSelection()

        WordexImage.#focus(img)
    }
    /** @param {HTMLImageElement} img */
    static #focus(img) {
        WordexImage.#clearFocus()
        WordexImage.#selectedImage = img
        img.classList.add("img-selected")

        // seleção verde padrão
        img.style.boxShadow = `inset 0 0 0 ${WordexImage.#SEL_W}px ${WordexImage.#SELECTED_COLOR}`
    }
    static #clearFocus() {
        if (WordexImage.#selectedImage) {
            WordexImage.#selectedImage.classList.remove("img-selected")
            WordexImage.#selectedImage.style.boxShadow = ""
        }
        WordexImage.#selectedImage = null
    }
    /** @param {File} file */
    static #fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(String(r.result))
            r.onerror = () => reject(r.error)
            r.readAsDataURL(file)
        })
    }
    /** @param {string} url */
    static async #urlToDataUrl(url) {
        const res = await fetch(url)
        if (!res.ok) throw new Error("Falha ao baixar imagem: " + res.status)
        const blob = await res.blob()

        return await new Promise((resolve, reject) => {
            const r = new FileReader()
            r.onload = () => resolve(String(r.result))
            r.onerror = () => reject(r.error)
            r.readAsDataURL(blob)
        })
    }
    // garante que WordexPage.left()/right() não quebra
    /** @param {HTMLImageElement} instance */
    static moveLeftWord(instance) { return WordexMovement.leftWord(instance) }
    /** @param {HTMLImageElement} instance */
    static moveRightWord(instance) { return WordexMovement.rightWord(instance) }
    /** @param {HTMLImageElement} instance */
    static moveParagraphUp(instance) { return WordexMovement.upParagraph(instance) }
    /** @param {HTMLImageElement} instance */
    static moveParagraphDown(instance) { return WordexMovement.downParagraph(instance) }

    // alinha com wrap (left/right) ou inline (center)

    /** @param {HTMLImageElement} instance */
    static alignLeft(instance) { return WordexLayout.alignObject(instance, "left") }
    /** @param {HTMLImageElement} instance */
    static alignRight(instance) { return WordexLayout.alignObject(instance, "right") }
    /** @param {HTMLImageElement} instance */
    static alignCenter(instance) { return WordexLayout.alignObject(instance, "center") }

    // resize unificado
    /** @param {HTMLImageElement} instance */
    static increase(instance) { return WordexLayout.increase(instance) }
    /** @param {HTMLImageElement} instance */
    static decrease(instance) { return WordexLayout.decrease(instance) }
}