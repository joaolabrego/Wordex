// WordexTemplate.mjs
// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Page from "./WordexPage.mjs"
import Toolbar from "./WordexToolbar.mjs"

export default class Template {
  /** @type {HTMLStyleElement|null} */ #style = null
  /** @type {Page} */ #page
  /** @type {Toolbar} */ #toolbar
  constructor() {
    this.#style?.remove()
    this.#style = document.createElement("style")
    this.#style.textContent = Config.Script
    document.head.appendChild(this.#style)

    this.#toolbar = new Toolbar(this.#page = new Page(this))
    
    document.body.replaceChildren(this.#toolbar.instance, this.#page.instance)
    
    const paragraph = /** @type {HTMLDivElement|null} */(this.#page.body.firstParagraph.instance)
    paragraph?.focus({ preventScroll: true })
  }

  get toolbar() {
    return this.#toolbar
  }
}