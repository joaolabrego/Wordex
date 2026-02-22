// @ts-check
'use strict'

import WordexConfig from './WordexConfig.mjs'
import WordexEdit from './WordexEdit.mjs'
import WordexPage from './WordexPage.mjs'
import WordexParagraph from './WordexParagraph.mjs'

export default class WordexSection {

    /** @type {HTMLDivElement} */ static rootSection

    /** @type {WordexPage} */ #page
    /** @type {HTMLDivElement} */ #section
    /** @type {WordexParagraph} */ #firstParagraph
    
    /** 
     * @param {WordexPage} page 
     * @param {string} id
     * @param {string} textContent
     */
    constructor(page, id, textContent = "") {
        this.#page = page

        this.#section = document.createElement("div")
        this.#section.id = id
        this.#section.classList.add("editable", "workspace", id)
        this.#section.contentEditable = "true"

        this.#section.addEventListener("keydown", (e) => WordexEdit.onKeyDown(e))
        this.#section.addEventListener("focus", () => WordexSection.rootSection = this.#section)

        this.#firstParagraph = new WordexParagraph(this.#section)
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

    // ✅ Não precisa instanciar WordexConfig. Só setar o rootSection.
    /**
     * @param {HTMLDivElement} rootEditable
     */
    static setRoot(rootEditable) {
        WordexSection.rootSection = rootEditable
    }
}
