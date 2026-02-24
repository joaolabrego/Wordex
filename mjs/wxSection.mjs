// @ts-check
'use strict'

/** @typedef {import("./wdxTypes.mjs").wdxSection} wdxSection */

import wxEdit from './wxEdit.mjs'
import wxPage from './wxPage.mjs'
import wxParagraph from './wxParagraph.mjs'

/** @typedef {import("./wdxTypes.mjs").wdxParagraph} wdxParagraph */
export default class wxSection {
    /** @type {wdxSection} */ static #rootSection

    /** @type {wxPage} */ #page
    /** @type {wdxSection} */ #section
    /** @type {wxParagraph[]} */ #paragraphs = []
    
    /** 
     * @param {wxPage} page 
     * @param {"header"|"body"|"footer"} sector
     * @param {string} textContent
     */
    constructor(page, sector, textContent = "") {
        this.#page = page

        this.#section = /** @type {wdxSection} */(document.createElement("div"))
        this.#section.id = sector
        this.#section.tabIndex = -1
        this.#section.dataset.wdxKind = "section"
        this.#section.dataset.wdxSector = sector
        this.#section.classList.add("editable", "workspace", sector)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => wxEdit.onKeyDown(e))
        this.#section.addEventListener("focus", () => wxSection.#rootSection = this.#section)

        this.addParagraph()
        if (textContent.trim())
            this.#paragraphs[0].root.textContent = textContent
        else
            this.#paragraphs[0].root.appendChild(document.createElement("br"))
        this.#section.append(this.#paragraphs[0].root)
    }
    /** @returns {HTMLDivElement|void} */
    selectedParagraph() {
        const paragraph = this.#paragraphs.find(p => p.isSelected)?.root
        if (paragraph)
            return paragraph
    }
    /** @returns void*/
    unselectParagraph() {
        const selected = this.selectedParagraph()
        if (selected instanceof HTMLDivElement)
            delete selected.dataset.wxSelected
    }
    /**
     * @param {"header"|"body"|"footer"} id
     * @returns void*/
    selectParagraph(id) {
        this.unselectParagraph()
        const selected = this.#paragraphs.find(p => p.root.id === id)?.root
        if (selected instanceof HTMLDivElement)
            selected.dataset.wxSelected = "1"
    }
    addParagraph() {
        this.#paragraphs.push(new wxParagraph(this.#section))
    }
    removeParagraph() {
        const selected = this.selectedParagraph()
        if (selected instanceof HTMLDivElement) {
            const idx = this.#paragraphs.findIndex(paragraph => paragraph.root.id === selected.id)
            if (idx >= 0)
                this.#paragraphs.splice(idx, 1)
            selected.remove()
        }
    }
    /** @returns {boolean} */
    get isSelected() {
        return this.#section.dataset.wdxKind ? true : false
    }
    /** @returns {boolean} */
    get isHeader() {
        return this.#section.dataset.wdxKind === "section" && this.#section.dataset.wdxSector === "header"
    }
    /** @returns {boolean} */
    get isBody() {
        return this.#section.dataset.wdxKind === "section" && this.#section.dataset.wdxSector === "body"
    }
    /** @returns {boolean} */
    get isFooter() {
        return this.#section.dataset.wdxKind === "section" && this.#section.dataset.wdxSector === "footer"
    }
    /** @returns {wxPage} */
    get owner() {
        return this.#page
    }
    /** @returns {wdxSection} */
    get root() {
        return this.#section
    }
    /** @returns {wxParagraph|void} */
    get firstParagraph() {
        if (this.#paragraphs.length)
            return this.#paragraphs[0]
    }
    /** @returns {wxParagraph|void} */
    get lastParagraph() {
        const length = this.#paragraphs.length
        if (length)
            return this.#paragraphs[length - 1]
    }
    /** @returns {wdxSection} */
    static getRoot() {
        return wxSection.#rootSection
    }
    /** @param {wdxSection} value */
    static setRoot(value) {
        wxSection.#rootSection = value
    }
}
