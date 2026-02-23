// @ts-check
"use strict"

import wxConfig from "./wxConfig.mjs"
import wxParagraph from "./wxParagraph.mjs"
import wxSection from "./wxSection.mjs"
export default class wxRange {
  /** @type {Range|null} */ static range = null

  static saveSelection() {
    const root = wxSection.rootSection
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

    wxRange.range = r.cloneRange()

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
    // Não restaurar range "detached" (nós fora do DOM) — addRange falharia e a seleção ficaria vazia
    try {
      if (!range.startContainer.isConnected || !range.endContainer.isConnected)
        return false
    } catch (_) {
      return false
    }
    sel.removeAllRanges()
    try {
      sel.addRange(range)
      return true
    } catch (_) {
      return false
    }
  }

  static saveRange() {
    const range = wxRange.getSelRange()
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
    wxRange.restoreRange(wxRange.range)

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0)
      return null

    const range = selection.getRangeAt(0)
    if (range.collapsed)
      return null

    return range
  }
  static hasSelection() {
    return !!wxRange.getSelectedRange()
  }

  /** 
   * @param {string} tag 
   * @param {boolean} collapse
   * @returns {boolean}
  */
  static wrapTag(tag, collapse = false) {
    const range = wxRange.getSelectedRange()

    if (!range)
      return false

    const element = document.createElement(tag)
    const fragment = range.extractContents()
    element.appendChild(fragment)
    range.insertNode(element)

    if (collapse)
      return wxRange.#collapseAfter(element)

    return wxRange.#selectNodeContents(element)
  }

  /** 
   * @param {string} value 
   * @returns {boolean}
   */
  static applyFontStyle(value = "") {
    if (!value) {
      const fontStyle = wxConfig.fontStyleList.find(style => style.selected)
      if (!fontStyle)
        return false
      value = fontStyle.value ?? ""
    }

    return wxRange.wrapTag(value)
  }
  /**
   * @param {string} cssFontName ex: "Arial" 
   * @returns {boolean}
   */
  static setFontFamily(cssFontName) {
    if (!cssFontName)
      return false

    return wxRange.wrapSpanStyle({ fontFamily: cssFontName })
  }
  /** 
   * @param {string} cssSize ex: "12pt" | "14px" 
   * @returns {boolean}
   */
  static setFontSize(cssSize) {
    if (!cssSize)
      return false

    return wxRange.wrapSpanStyle({ fontSize: cssSize })
  }

  /** 
   * @param {string} hex ex: "#ff0000" 
   * @returns {boolean}
   */
  static setFontColor(hex) {
    if (!hex)
      return false
    
    return wxRange.wrapSpanStyle({ color: hex })
  }

  /**
   * @param {{fontFamily?:string, fontSize?:string, color?:string}} style
   * @returns {boolean}
   */
  static wrapSpanStyle(style) {
    const range = wxRange.getSelectedRange()
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

    wxRange.#collapseAfter(span)

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

    wxRange.saveSelection()

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

    wxRange.saveSelection()

    return true
  }
  /**
   * Remove formatação inline dentro da seleção:
   * tags (b,i,u,s,strong,em,mark,code,small,sup,sub) e estilos inline em spans.
   * Mantém o texto e a estrutura (o que não for inline).
   */
  static clearInlineFormatting() {
    const range = wxRange.getSelectedRange()
    if (!range || range.collapsed) return false

    const frag = range.extractContents()
    if (!frag || !frag.firstChild) return false

    // tags a "desembrulhar" (remove a tag, preserva o conteúdo)
    const UNWRAP = new Set(["b", "i", "u", "s", "strong", "em", "mark", "code", "small", "sup", "sub"])

    // percorre o fragmento e faz as limpezas
    const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT)
    const toUnwrap = []

    /** @type {Element|null} */
    let el
    while ((el = /** @type {HTMLElement}*/(walker.nextNode()))) {
      const tag = el.tagName.toLowerCase()

      if (UNWRAP.has(tag)) {
        toUnwrap.push(el)
        continue
      }
      if (tag === "span" && el instanceof HTMLElement) {
        el.style.fontWeight = ""
        el.style.fontStyle = ""
        el.style.textDecoration = ""
        el.style.color = ""
        el.style.backgroundColor = ""
        el.style.fontFamily = ""
        el.style.fontSize = ""

        const hasStyle = (el.getAttribute("style") || "").trim().length > 0
        const hasAttrs = el.attributes.length > 0
        if (!hasStyle && !hasAttrs) toUnwrap.push(el)
      }
    }

    // desembrulha de baixo pra cima (pra não bagunçar o walker)
    for (let i = toUnwrap.length - 1; i >= 0; i--) {
      const n = toUnwrap[i]
      const parent = n.parentNode
      if (!parent) continue
      while (n.firstChild) parent.insertBefore(n.firstChild, n)
      parent.removeChild(n)
    }

    // recoloca e mantém seleção
    const first = frag.firstChild
    const last = frag.lastChild
    range.insertNode(frag)

    const sel = window.getSelection()
    if (sel && first && last) {
      const r2 = document.createRange()
      r2.setStartBefore(first)
      r2.setEndAfter(last)
      sel.removeAllRanges()
      sel.addRange(r2)
      wxRange.saveSelection()
    }

    return true
  }
  // wxRange.mjs

  static alignLeft() {
    return wxRange.#alignText("left")
  }

  static alignCenter() {
    return wxRange.#alignText("center")
  }

  static alignRight() {
    return wxRange.#alignText("right")
  }

  static justify() {
    return wxRange.#alignText("justify")
  }

  /**
   * Aplica text-align na seleção ou no parágrafo ativo.
   * @param {"left"|"center"|"right"|"justify"} dir
   */
  static #alignText(dir) {
    // 1) se há seleção → aplica no(s) parágrafo(s) envolvidos
    const range = wxRange.getSelectedRange()
    if (range) {
      const blocks = wxRange.#getParagraphsFromRange(range)
      for (const p of blocks) p.style.textAlign = dir
      wxRange.saveSelection()
      return true
    }

    // 2) sem seleção → parágrafo ativo
    const p = wxParagraph?.getActive?.()
    if (p) {
      p.style.textAlign = dir
      return true
    }

    return false
  }
  /**
   * Retorna todos os parágrafos tocados pelo range.
   * @param {Range} range
   * @returns {HTMLDivElement[]}
   */
  static #getParagraphsFromRange(range) {
    const set = new Set()

    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (!(node instanceof HTMLDivElement)) return NodeFilter.FILTER_SKIP
          if (!node.classList.contains("paragraph")) return NodeFilter.FILTER_SKIP
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP
        }
      }
    )

    let n
    while ((n = walker.nextNode())) set.add(n)
    return [...set]
  }
}
