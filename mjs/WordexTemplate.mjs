// WordexTemplate.mjs
// @ts-check
"use strict"

import Page from "./WordexPage.mjs"
import Paragraph from "./WordexParagraph.mjs"
import Toolbar from "./WordexToolbar.mjs"

export default class Template {
  /** @type {Toolbar} */ #toolbar
  /** @type {HTMLDivElement} */ #divPage

  constructor() {
    const built = Page.create()
    this.#divPage = built.divPage
    this.#toolbar = new Toolbar(this.#divPage)
    document.body.innerHTML = ""
    document.body.append(this.#toolbar.element, this.#divPage)

    const paragraph = built.body.querySelector("div")
    if (paragraph)
      Paragraph.activate(paragraph, "end")
    this.#toolbar.initializeDefaults()
    Page.setEditMode("INS")
    built.body.focus({ preventScroll: true })
  }
}