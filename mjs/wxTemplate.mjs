// wxTemplate.mjs
// @ts-check
"use strict"

import wxConfig from "./wxConfig.mjs"
import wxPage from "./wxPage.mjs"
import wxToolbar from "./wxToolbar.mjs"

export default class wxTemplate {
  /** @type {HTMLStyleElement|null} */ #style = null
  /** @type {wxPage} */ #page
  /** @type {wxToolbar} */ #toolbar
  constructor() {
    this.#style?.remove()
    this.#style = document.createElement("style")
    this.#style.textContent = wxConfig.Script
    document.head.appendChild(this.#style)

    this.#toolbar = new wxToolbar(this.#page = new wxPage(this))

    document.body.replaceChildren(this.#toolbar.instance, this.#page.instance)
    
    const paragraph = /** @type {HTMLDivElement|null} */(this.#page.body.firstParagraph.instance)
    paragraph?.focus({ preventScroll: true })
  }

  get toolbar() {
    return this.#toolbar
  }
}