// WordexTemplate.mjs
// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexPage from "./WordexPage.mjs"
import WordexToolbar from "./WordexToolbar.mjs"

export default class WordexTemplate {
  /** @type {HTMLStyleElement|null} */ #style = null
  /** @type {WordexPage} */ #page
  /** @type {WordexToolbar} */ #toolbar
  constructor() {
    this.#style?.remove()
    this.#style = document.createElement("style")
    this.#style.textContent = WordexConfig.Script
    document.head.appendChild(this.#style)

    this.#toolbar = new WordexToolbar(this.#page = new WordexPage(this))
    
    document.body.replaceChildren(this.#toolbar.instance, this.#page.instance)
    
    const paragraph = /** @type {HTMLDivElement|null} */(this.#page.body.firstParagraph.instance)
    paragraph?.focus({ preventScroll: true })
  }

  get toolbar() {
    return this.#toolbar
  }
}