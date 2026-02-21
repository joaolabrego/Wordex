// WordexTemplate.mjs
// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"
import Page from "./WordexPage.mjs"
import Toolbar from "./WordexToolbar.mjs"

export default class Template {
  /** @type {HTMLStyleElement} */ #style  
  /** @type {Page} */ #page
  constructor() {
    document.body.innerHTML = ""

    this.#style = document.createElement("style")
    this.#style.textContent = Config.Script
    document.body.appendChild(this.#style)

    this.#page = new Page()
    document.body.append(this.#page.element)
  }
}