// @ts-check
'use strict'

/** @typedef {import("./wxTypes.mjs").WordexSectionDiv} WordexSectionDiv */

import wxEdit from './wxEdit.mjs'
import wxPage from './wxPage.mjs'
import wxParagraph from './wxParagraph.mjs'

export default class wxSection {

    /** @type {HTMLDivElement} */ static rootSection

    /** @type {wxPage} */ #page
    /** @type {WordexSectionDiv} */ #section
    /** @type {wxParagraph} */ #firstParagraph
    
    /** 
     * @param {wxPage} page 
     * @param {string} id
     * @param {string} textContent
     */
    constructor(page, id, textContent = "") {
        this.#page = page

        this.#section = /** @type {WordexSectionDiv} */(document.createElement("div"))
        this.#section.id = id
        this.#section.classList.add("editable", "workspace", id)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => wxEdit.onKeyDown(e))
        this.#section.addEventListener("focus", () => wxSection.rootSection = this.#section)

        this.#firstParagraph = new wxParagraph(this.#section)
        if (textContent.trim())
            this.#firstParagraph.instance.textContent = textContent
        else
            this.#firstParagraph.instance.appendChild(document.createElement("br"))
        this.#section.append(this.#firstParagraph.instance)
    }

    get instance() {
        return this.#section
    }
    get firstParagraph() {
        return this.#firstParagraph
    }

    // ✅ Não precisa instanciar wxConfig. Só setar o rootSection.
    /**
     * @param {HTMLDivElement} rootEditable
     */
    static setRoot(rootEditable) {
        wxSection.rootSection = rootEditable
    }
}
