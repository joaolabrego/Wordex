// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Movement from "./WordexMovement.mjs"
import Layout from "./WordexLayout.mjs"
import Alignment from "./WordexAlignment.mjs"

export default class Image {
  /** @type {HTMLImageElement|null} */ static #selectedImage = null
    static #SEL_W = 2
    static #SELECTED_COLOR = "#0aec0a"
    
    /** @param {HTMLDivElement} scope */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            if (t instanceof HTMLImageElement)
                Image.#focus(t)
            else
                Image.#clearFocus()
        })
    }

    static hasFocus() { return !!Image.#selectedImage }
    /** @returns {HTMLImageElement|null} */
    static getFocused() { return Image.#selectedImage }
    /**
     * @param {string} borderWidthPx 
     * @param {string} color */
    static applyBorder(borderWidthPx, color) {
        const img = Image.#selectedImage
        if (!img) return false
        img.style.borderStyle = borderWidthPx === "0px" ? "none" : "solid"
        img.style.borderWidth = borderWidthPx
        img.style.borderColor = color
        return true
    }
    /** @param {string} radiusPx */
    static applyBorderRadius(radiusPx) {
        const img = Image.#selectedImage
        if (!img) return false
        img.style.borderRadius = radiusPx
        return true
    }
    /** @param {"left"|"center"|"right"} dir */
    static align(dir) {
        const img = Image.#selectedImage
        if (!img) return false
        Alignment.floatable(img, dir)
        return true
    }
    /**  @param {HTMLImageElement} img */
    static moveUp(img) {
        if (!img) return
        Movement.moveParagraphUp(img)
    }
    /**  @param {HTMLImageElement} img */
    static moveDown(img) {
        if (!img) return
        Movement.moveParagraphDown(img)
    }
    /**
     * @param {File|null} file
     */
    static async createFromFile(file) {
        if (!file) return
        const src = await Image.#fileToDataUrl(file)
        Config.restoreRange(Config.range)
        Image.#insertAtSelection(src)
    }
    /**
     * @param {string} url
     */
    static async createFromUrl(url) {
        if (!url) return
        Config.restoreRange(Config.range)

        if (url.startsWith("data:")) {
            Image.#insertAtSelection(url)
            return
        }

        const dataUrl = await Image.#urlToDataUrl(url)
        Image.#insertAtSelection(dataUrl)
    }
    /** @param {string} src */
    static #insertAtSelection(src) {
        const r = Config.getSelRange?.() ?? Config.range
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
        Config.saveSelection()

        Image.#focus(img)
    }
    /** @param {HTMLImageElement} img */
    static #focus(img) {
        Image.#clearFocus()
        Image.#selectedImage = img
        img.classList.add("img-selected")

        // seleção verde padrão
        img.style.boxShadow = `inset 0 0 0 ${Image.#SEL_W}px ${Image.#SELECTED_COLOR}`
    }
    static #clearFocus() {
        if (Image.#selectedImage) {
            Image.#selectedImage.classList.remove("img-selected")
            Image.#selectedImage.style.boxShadow = ""
        }
        Image.#selectedImage = null
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
    // garante que Page.left()/right() não quebra
    /** @param {HTMLImageElement} element */
    static moveLeftWord(element) { return Movement.leftWord(element) }
    /** @param {HTMLImageElement} element */
    static moveRightWord(element) { return Movement.rightWord(element) }
    /** @param {HTMLImageElement} element */
    static moveParagraphUp(element) { return Movement.upParagraph(element) }
    /** @param {HTMLImageElement} element */
    static moveParagraphDown(element) { return Movement.downParagraph(element) }

    // alinha com wrap (left/right) ou inline (center)

    /** @param {HTMLImageElement} element */
    static alignLeft(element) { return Layout.alignObject(element, "left") }
    /** @param {HTMLImageElement} element */
    static alignRight(element) { return Layout.alignObject(element, "right") }
    /** @param {HTMLImageElement} element */
    static alignCenter(element) { return Layout.alignObject(element, "center") }

    // resize unificado
    /** @param {HTMLImageElement} element */
    static increase(element) { return Layout.increase(element) }
    /** @param {HTMLImageElement} element */
    static decrease(element) { return Layout.decrease(element) }
}