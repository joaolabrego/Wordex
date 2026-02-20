// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"

/**
 * Text
 * - representa “texto selecionado” (Range não-colapsado)
 * - funciona igual dentro de <div> (parágrafo) ou dentro de <td> (célula)
 * - aplica formatação SEMÂNTICA envolvendo o Range com tags (<b>, <i>, <u>…)
 * - para fonte/cor/tamanho, envolve com <span style="...">
 *
 * Observação: este objeto NÃO decide alinhamento (isso é do alvo: Cell/Row/Col/Table/Image/Paragraph).
 */
export default class Text {
  /** @returns {Range|null} */
  static getSelectedRange() {
    Config.restoreRange(Config.range)
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const r = sel.getRangeAt(0)
    if (r.collapsed) return null
    return r
  }

  static hasSelection() {
    return !!Text.getSelectedRange()
  }

  // -----------------------------
  // Tags semânticas (b/i/u/s/sup/sub...)
  // -----------------------------
  /** @param {string} tag */
  static wrapTag(tag) {
    const r = Text.getSelectedRange()
    if (!r) return false

    const el = document.createElement(tag)
    const frag = r.extractContents()
    el.appendChild(frag)
    r.insertNode(el)

    Text.#collapseAfter(el)
    return true
  }

  // atalhos (opcionais)
  static bold() { return Text.wrapTag("b") }
  static italic() { return Text.wrapTag("i") }
  static underline() { return Text.wrapTag("u") }
  static strike() { return Text.wrapTag("s") }
  static superscript() { return Text.wrapTag("sup") }
  static subscript() { return Text.wrapTag("sub") }

  // -----------------------------
  // Estilos via <span style="...">
  // -----------------------------
  /** @param {string} cssFontName ex: "Arial" */
  static setFontFamily(cssFontName) {
    if (!cssFontName) return false
    return Text.wrapSpanStyle({ fontFamily: cssFontName })
  }

  /** @param {string} cssSize ex: "12pt" | "14px" */
  static setFontSize(cssSize) {
    if (!cssSize) return false
    return Text.wrapSpanStyle({ fontSize: cssSize })
  }

  /** @param {string} hex ex: "#ff0000" */
  static setColor(hex) {
    if (!hex) return false
    return Text.wrapSpanStyle({ color: hex })
  }

  /**
   * Envolve a seleção com <span style="...">
   * @param {{fontFamily?:string, fontSize?:string, color?:string}} style
   */
  static wrapSpanStyle(style) {
    const r = Text.getSelectedRange()
    if (!r) return false

    const sp = document.createElement("span")
    if (style.fontFamily) sp.style.fontFamily = style.fontFamily
    if (style.fontSize) sp.style.fontSize = style.fontSize
    if (style.color) sp.style.color = style.color

    const frag = r.extractContents()
    sp.appendChild(frag)
    r.insertNode(sp)

    Text.#collapseAfter(sp)
    return true
  }

  // -----------------------------
  // internos
  // -----------------------------
  /** @param {Node} node */
  static #collapseAfter(node) {
    const sel = window.getSelection()
    if (!sel) return

    const r2 = document.createRange()
    r2.setStartAfter(node)
    r2.collapse(true)

    sel.removeAllRanges()
    sel.addRange(r2)

    Config.saveSelection()
  }
}
