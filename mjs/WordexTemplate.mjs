// WordexTemplate.mjs
// @ts-check
"use strict"

import Page from "./WordexPage.mjs"
import Toolbar from "./WordexToolbar.mjs"

export default class Template {
  /** @type {Page} */ #page
  constructor() {
    document.body.innerHTML = ""
    this.#page = new Page()
    document.body.append(this.#page.element)
  }
}