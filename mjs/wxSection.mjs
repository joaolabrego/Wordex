// @ts-check
'use strict'

/** @typedef {import("./wxTypes.mjs").wxSection} wxSectionDiv */

import wxEdit from './wxEdit.mjs'
import wxPage from './wxPage.mjs'
import wxParagraph from './wxParagraph.mjs'

export default class wxSection {

    /** @type {wxSectionDiv} */ static #rootSection

    /** @type {wxPage} */ #page
    /** @type {wxSectionDiv} */ #section
    /** @type {wxParagraph} */ #firstParagraph
    
    /** 
     * @param {wxPage} page 
     * @param {string} id
     * @param {string} textContent
     */
    constructor(page, id, textContent = "") {
        this.#page = page

        this.#section = /** @type {wxSectionDiv} */(document.createElement("div"))
        this.#section.tabIndex = -1
        this.#section.dataset.wxKind = "section"
        this.#section.id = id
        this.#section.classList.add("editable", "workspace", id)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => wxEdit.onKeyDown(e))
        this.#section.addEventListener("focus", () => wxSection.#rootSection = this.#section)

        this.#firstParagraph = new wxParagraph(this.#section)
        if (textContent.trim())
            this.#firstParagraph.instance.textContent = textContent
        else
            this.#firstParagraph.instance.appendChild(document.createElement("br"))
        this.#section.append(this.#firstParagraph.instance)
    }

    /** @returns {wxSectionDiv} */
    get element() {
        return this.#section
    }
    /** @returns {wxParagraph} */
    get firstParagraph() {
        return this.#firstParagraph
    }
    /** @param {wxSectionDiv} section */
    static setRoot(section) {
        wxSection.#rootSection = section
    }

    /** @returns {wxSectionDiv} */
    static getRoot() {
        return wxSection.#rootSection
    }
}
