// @ts-check
"use strict"

import WordexConfig from "./WordexConfig.mjs"
import WordexSection from "./WordexSection.mjs"
export default class WordexRange {
  /** @type {Range|null} */ static range = null

  static saveSelection() {
    const root = WordexSection.rootSection
    if (!root)
      return false

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0)
      return false

    const r = sel.getRangeAt(0)

    const a = sel.anchorNode
    const f = sel.focusNode
    if (!a || !f)
      return false
    if (!a.isConnected || !f.isConnected)
      return false

    const aEl = a.nodeType === Node.TEXT_NODE ? a.parentElement : a
    const fEl = f.nodeType === Node.TEXT_NODE ? f.parentElement : f
    if (!(aEl instanceof Element) || !(fEl instanceof Element))
      return false
    if (!root.contains(aEl) || !root.contains(fEl))
      return false

    WordexRange.range = r.cloneRange()

    return true
  }
  /**
   * @param {Range|null} range
   * @returns {boolean}
   */
  static restoreRange(range) {
    if (!range)
      return false
    const sel = window.getSelection()
    if (!sel)
      return false
    sel.removeAllRanges()
    sel.addRange(range)

    return true
  }

  static saveRange() {
    const range = WordexRange.getSelRange()
    return range ? range.cloneRange() : null
  }

  static getSelRange() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
      return null

    return selection.getRangeAt(0)
  }

  /** @returns {Range|null} */
  static getSelectedRange() {
    WordexRange.restoreRange(WordexRange.range)

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
      return null

    const range = selection.getRangeAt(0)
    if (range.collapsed)
      return null

    return range
  }

  

  static hasSelection() {
    return !!WordexRange.getSelectedRange()
  }

  /** 
   * @param {string} tag 
   * @param {boolean} collapse
   * @returns {boolean}
  */
  static wrapTag(tag, collapse = false) {
    const range = WordexRange.getSelectedRange()

    if (!range)
      return false

    const element = document.createElement(tag)
    const fragment = range.extractContents()
    element.appendChild(fragment)
    range.insertNode(element)

    if (collapse)
      return WordexRange.#collapseAfter(element)

    return WordexRange.#selectNodeContents(element)
  }

  /** 
   * @param {string} value 
   * @returns {boolean}
   */
  static applyFontStyle(value = "") {
    if (!value) {
      const fontStyle = WordexConfig.fontStyleList.find(style => style.selected)
      if (!fontStyle)
        return false
      value = fontStyle.tag ?? ""
    }

    return WordexRange.wrapTag(value) 
  }

  // -----------------------------
  // Estilos via <span style="...">
  // -----------------------------
  /**
   * @param {string} cssFontName ex: "Arial" 
   * @returns {boolean}
   */
  static setFontFamily(cssFontName) {
    if (!cssFontName)
      return false

    return WordexRange.wrapSpanStyle({ fontFamily: cssFontName })
  }

  /** 
   * @param {string} cssSize ex: "12pt" | "14px" 
   * @returns {boolean}
   */
  static setFontSize(cssSize) {
    if (!cssSize)
      return false

    return WordexRange.wrapSpanStyle({ fontSize: cssSize })
  }

  /** 
   * @param {string} hex ex: "#ff0000" 
   * @returns {boolean}
   */
  static setColor(hex) {
    if (!hex)
      return false
    
    return WordexRange.wrapSpanStyle({ color: hex })
  }

  /**
   * Envolve a seleção com <span style="...">
   * @param {{fontFamily?:string, fontSize?:string, color?:string}} style
   * @returns {boolean}
   */
  static wrapSpanStyle(style) {
    const range = WordexRange.getSelectedRange()
    if (!range)
      return false

    const span = document.createElement("span")
    if (style.fontFamily)
      span.style.fontFamily = style.fontFamily
    if (style.fontSize)
      span.style.fontSize = style.fontSize
    if (style.color)
      span.style.color = style.color

    const fragment = range.extractContents()
    span.appendChild(fragment)
    range.insertNode(span)

    WordexRange.#collapseAfter(span)

    return true
  }

  // -----------------------------
  // internos
  // -----------------------------
  /**
   * @param {Node} node 
   * @returns {boolean}
   */
  static #collapseAfter(node) {
    const selection = window.getSelection()
    if (!selection)
      return false

    const range = document.createRange()
    range.setStartAfter(node)
    range.collapse(true)

    selection.removeAllRanges()
    selection.addRange(range)

    WordexRange.saveSelection()

    return true
  }

  /** 
   * @param {Node} node 
   * @returns {boolean}
   */
  static #selectNodeContents(node) {
    const selection = window.getSelection()
    if (!selection)
      return false

    const range = document.createRange()
    range.selectNodeContents(node)

    selection.removeAllRanges()
    selection.addRange(range)

    WordexRange.saveSelection()

    return true
  }  
}