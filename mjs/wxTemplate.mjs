// @ts-check
"use strict"

import wxConfig from "./wxConfig.mjs"
import wxPage from "./wxPage.mjs"
import wxToolbar from "./wxToolbar.mjs"

export default class wxTemplate {
  /** @type {wxPage} */ #page
  /** @type {wxToolbar} */ #toolbar
  constructor() {
    this.#toolbar = new wxToolbar(this.#page = new wxPage(this))

    document.body.replaceChildren(this.#toolbar.instance, this.#page.root)
    
    const paragraph = /** @type {HTMLDivElement|null} */(this.#page.body.firstParagraph.root)
    paragraph?.focus({ preventScroll: true })
  }

  get toolbar() {
    return this.#toolbar
  }
}