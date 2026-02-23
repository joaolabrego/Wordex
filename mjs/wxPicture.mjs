// @ts-check
"use strict"

import wxMovement from "./wxMovement.mjs"
import wxRange from "./wxRange.mjs"
import wxLayout from "./wxLayout.mjs"
import wxAlignment from "./wxAlignment.mjs"

export default class wxPicture {
  /** @type {HTMLImageElement|null} */ static #selectedImage = null
    static #SEL_W = 2
    static #SELECTED_COLOR = "#0aec0a"
    
    /** @param {HTMLDivElement} scope */
    static attach(scope) {
        scope.addEventListener("mousedown", (e) => {
            const t = /** @type {HTMLElement} */ (e.target)
            if (t instanceof HTMLImageElement)
                wxPicture.#focus(t)
            else
                wxPicture.#clearFocus()
        })
    }

    static hasFocus() { return !!wxPicture.#selectedImage }
    /** @returns {HTMLImageElement|null} */
    static getFocused() { return wxPicture.#selectedImage }
    /**
     * @param {string} borderWidthPx 
     * @param {string} color */
    static applyBorder(borderWidthPx, color) {
        const img = wxPicture.#selectedImage
        if (!img) return false
        img.style.borderStyle = borderWidthPx === "0px" ? "none" : "solid"
        img.style.borderWidth = borderWidthPx
        img.style.borderColor = color
        return true
    }
    /** @param {string} radiusPx */
    static applyBorderRadius(radiusPx) {
        const img = wxPicture.#selectedImage
        if (!img) return false
        img.style.borderRadius = radiusPx
        return true
    }
    /** @param {"left"|"center"|"right"|"justify"} dir */
    static align(dir) {
        const img = wxPicture.#selectedImage
        if (!img) return false
        wxAlignment.wrapAlign(img, dir)
        return true
    }
    /**  @param {HTMLImageElement} img */
    static moveUp(img) {
        if (!img) return
        wxMovement.moveParagraphUp(img)
    }
    /**  @param {HTMLImageElement} img */
    static moveDown(img) {
        if (!img) return
        wxMovement.moveParagraphDown(img)
    }
    /**
     * @param {File|null} file
     */
    static async createFromFile(file) {
        if (!file) return
        const src = await wxPicture.#fileToDataUrl(file)
        wxRange.restoreRange(wxRange.range)
        wxPicture.insertAtSelection(src)
    }
    /**
     * @param {string} url
     */
    static async createFromUrl(url) {
        if (!url) return
        wxRange.restoreRange(wxRange.range)

        if (url.startsWith("data:")) {
            wxPicture.insertAtSelection(url)
            return
        }

        const dataUrl = await wxPicture.#urlToDataUrl(url)
        wxPicture.insertAtSelection(dataUrl)
    }
    /** @param {File|null} file */
    static async insertImageFromFile(file) {
        await wxPicture.createFromFile(file)
    }    
    /** @param {string} src */
    static insertAtSelection(src) {
        const r = wxRange.getSelRange?.() ?? wxRange.range
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
        wxRange.saveSelection()

        wxPicture.#focus(img)
    }
    /** @param {HTMLImageElement} img */
    static #focus(img) {
        wxPicture.#clearFocus()
        wxPicture.#selectedImage = img
        img.classList.add("img-selected")

        // seleção verde padrão
        img.style.boxShadow = `inset 0 0 0 ${wxPicture.#SEL_W}px ${wxPicture.#SELECTED_COLOR}`
    }
    static #clearFocus() {
        if (wxPicture.#selectedImage) {
            wxPicture.#selectedImage.classList.remove("img-selected")
            wxPicture.#selectedImage.style.boxShadow = ""
        }
        wxPicture.#selectedImage = null
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
    // garante que wxPage.left()/right() não quebra
    /** @param {HTMLImageElement} instance */
    static moveLeftWord(instance) { return wxMovement.leftWord(instance) }
    /** @param {HTMLImageElement} instance */
    static moveRightWord(instance) { return wxMovement.rightWord(instance) }
    /** @param {HTMLImageElement} instance */
    static moveParagraphUp(instance) { return wxMovement.upParagraph(instance) }
    /** @param {HTMLImageElement} instance */
    static moveParagraphDown(instance) { return wxMovement.downParagraph(instance) }

    // alinha com wrap (left/right) ou inline (center)

    /** @param {HTMLImageElement} instance */
    static alignLeft(instance) { return wxLayout.alignObject(instance, "left") }
    /** @param {HTMLImageElement} instance */
    static alignRight(instance) { return wxLayout.alignObject(instance, "right") }
    /** @param {HTMLImageElement} instance */
    static alignCenter(instance) { return wxLayout.alignObject(instance, "center") }

    // resize unificado
    /** @param {HTMLImageElement} instance */
    static increase(instance) { return wxLayout.increase(instance) }
    /** @param {HTMLImageElement} instance */
    static decrease(instance) { return wxLayout.decrease(instance) }
}