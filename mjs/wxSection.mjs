// @ts-check
'use strict'

/** @typedef {import("./wdxTypes.mjs").wdxSection} wxSectionType */

import wxEdit from './wxEdit.mjs'
import wxPage from './wxPage.mjs'
import wxParagraph from './wxParagraph.mjs'


export default class wdxSection {

    /** @type {wxSectionType} */ static #rootSection

    /** @type {wxPage} */ #page
    /** @type {wxSectionType} */ #section
    /** @type {wxParagraph} */ #firstParagraph
    
    /** 
     * @param {wxPage} page 
     * @param {"header"|"body"|"footer"} sector
     * @param {string} textContent
     */
    constructor(page, sector, textContent = "") {
        this.#page = page

        this.#section = /** @type {wxSectionType} */(document.createElement("div"))
        this.#section.tabIndex = -1
        this.#section.dataset.wxKind = "section"
        this.#section.dataset.wxSector = sector
        this.#section.classList.add("editable", "workspace", sector)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => wxEdit.onKeyDown(e))
        this.#section.addEventListener("focus", () => wdxSection.#rootSection = this.#section)

        this.#firstParagraph = new wxParagraph(this.#section)
        if (textContent.trim())
            this.#firstParagraph.instance.textContent = textContent
        else
            this.#firstParagraph.instance.appendChild(document.createElement("br"))
        this.#section.append(this.#firstParagraph.instance)
    }

    /** @returns {wxSectionType} */
    get root() {
        return this.#section
    }
    /** @returns {wxParagraph} */
    get firstParagraph() {
        return this.#firstParagraph
    }
    /** @returns {wxSectionType} */
    static getRoot() {
        return wdxSection.#rootSection
    }
    /** @param {wxSectionType} value */
    static setRoot(value) {
        wdxSection.#rootSection = value
    }
}
