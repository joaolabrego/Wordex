// @ts-check
'use strict'

import Config from './WordexConfig.mjs'
import Edit from './WordexEdit.mjs'
import Page from './WordexPage.mjs'
import Paragraph from './WordexParagraph.mjs'

export default class Section {

    /** @type {Page} */ #page
    /** @type {HTMLDivElement} */ #section
    /** @type {Paragraph} */ #firstParagraph
    
    /** 
     * @param {Page} page 
     * @param {string} id
     * @param {string} textContent
     */
    constructor(page, id, textContent = "") {
        this.#page = page

        this.#section = document.createElement("div")
        this.#section.id = id
        this.#section.classList.add("editable", "workspace", id)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => Edit.onKeyDown(e))
        this.#section.addEventListener("focus", () => Config.rootSection = this.#section)

        this.#firstParagraph = new Paragraph(this.#section)
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
}
