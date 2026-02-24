// @ts-check
"use strict"

import wxPage from "./wxPage.mjs"
import wxToolbar from "./wxToolbar.mjs"

/** @typedef {import("./wdxTypes.mjs").wdxParagraph} wdxParagraph */

export default class wxTemplate {
  /** @type {wxPage} */ #page
  /** @type {wxToolbar} */ #toolbar
  constructor() {
    this.#toolbar = new wxToolbar(this.#page = new wxPage(this))

    document.body.replaceChildren(this.#toolbar.instance, this.#page.root)
    
    //this.#page.body.firstParagraph?.selectParagraph()
  }

  get toolbar() {
    return this.#toolbar
  }
}