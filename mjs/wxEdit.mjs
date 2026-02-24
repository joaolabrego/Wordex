// @ts-check
"use strict"

import wxParagraph from "./wxParagraph.mjs"
import wxRange from "./wxRange.mjs"
import wdxSection from "./wxSection.mjs"

/** @typedef {import("./wdxTypes.mjs").wdxSection} wxSectionDiv */

export default class wxEdit {
  static #TAB_LENGTH = 4

  // =========================================================
  // OVR helper
  // =========================================================
  /**
   * @param {InputEvent} e
   * @returns {void}
   */
  static handleOverwriteInput(e) {
    if (e.inputType !== "insertText" || !e.data)
      return

    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return

    const r = sel.getRangeAt(0)
    if (!r.collapsed) return

    const sc = r.startContainer
    const so = r.startOffset

    // segurança: só apaga 1 “caractere” se estiver em Text
    if (sc instanceof Text) {
      if (so >= sc.data.length) return
      const del = r.cloneRange()
      del.setEnd(sc, so + 1)
      del.deleteContents()
      wxRange.saveSelection()
      return
    }

    // se estiver em Element, tenta remover o node imediatamente à frente
    if (sc instanceof Element) {
      const node = sc.childNodes[so]
      if (!node) return
      const del = document.createRange()
      del.setStartBefore(node)
      del.setEndAfter(node)
      del.deleteContents()
      wxRange.saveSelection()
    }
  }

  // =========================================================
  // Delete table/img como “caractere” (com CTRL+Z)
  // =========================================================

  /**
   * Decide se um node é “apagável como caractere” (table / img / wrapper de imagem)
   * @param {Node|null} node
   * @returns {Element|null}
   */
  static #getDeletableElement(node) {
    if (!node) return null

    const el = node instanceof Element ? node : null
    if (!el) return null

    // sobe para um container “apagável”
    const host = el.closest("table, img, .wx-image")
    return host ?? null
  }

  /**
   * Seleciona table/img adjacente ao caret e DEIXA o browser apagar nativamente
   * (assim entra no histórico de undo e CTRL+Z funciona).
   *
   * @param {boolean} isBackspace
   * @param {HTMLElement|null} host
   * @returns {boolean}
   */
  static selectObjectIfAdjacent(isBackspace, host = null) {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const r = sel.getRangeAt(0)
    if (!r.collapsed) return false

    // valida escopo (se fornecido)
    if (host) {
      const anchorEl =
        r.startContainer.nodeType === Node.TEXT_NODE
          ? r.startContainer.parentElement
          : /** @type {Element} */ (r.startContainer)
      if (!anchorEl || !host.contains(anchorEl)) return false
    }

    const sc = r.startContainer
    const so = r.startOffset

    /** @type {Node|null} */
    let node = null

    // caret em Element: vizinho é childNodes[offset] (Delete) ou [offset-1] (Backspace)
    if (sc instanceof Element) {
      const idx = isBackspace ? so - 1 : so
      node = sc.childNodes[idx] ?? null
    }

    // caret em Text: quando offset está na borda, olha siblings
    else if (sc instanceof Text) {
      if (isBackspace && so === 0) node = sc.previousSibling
      if (!isBackspace && so === sc.data.length) node = sc.nextSibling
    }

    const delEl = wxEdit.#getDeletableElement(node)
    if (!delEl) return false

    // ✅ Só seleciona (não remove, não execCommand)
    const rr = document.createRange()
    rr.selectNode(delEl)
    sel.removeAllRanges()
    sel.addRange(rr)

    wxRange.saveSelection()
    return true
  }

  // =========================================================
  // TAB helpers
  // =========================================================
  /**
   * @param {boolean} isBackspace
   * @param {HTMLElement|null} host  container do editor (pra validar escopo)
   * @returns {boolean}
   */
  static deleteTabIfAdjacent(isBackspace, host = null) {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const r = sel.getRangeAt(0)
    if (!r.collapsed) return false

    // valida se está dentro do host (se fornecido)
    if (host) {
      const anchorEl =
        r.startContainer.nodeType === Node.TEXT_NODE
          ? r.startContainer.parentElement
          : /** @type {Element} */ (r.startContainer)
      if (!anchorEl || !host.contains(anchorEl)) return false
    }

    const sc = r.startContainer
    const so = r.startOffset

    if (sc instanceof Element) {
      const idx = isBackspace ? so - 1 : so
      const node = sc.childNodes[idx]
      if (node instanceof Element && node.classList.contains("wx-tab")) {
        node.remove()
        wxRange.saveSelection()
        return true
      }
      return false
    }

    if (sc instanceof Text) {
      if (isBackspace && so === 0) {
        const prev = sc.previousSibling
        if (prev instanceof Element && prev.classList.contains("wx-tab")) {
          prev.remove()
          wxRange.saveSelection()
          return true
        }
      }
      if (!isBackspace && so === sc.data.length) {
        const next = sc.nextSibling
        if (next instanceof Element && next.classList.contains("wx-tab")) {
          next.remove()
          wxRange.saveSelection()
          return true
        }
      }
    }

    return false
  }

  /**
   * @param {number} tabSize
   * @returns {HTMLSpanElement}
   */
  static makeTabSpan(tabSize = wxEdit.#TAB_LENGTH) {
    const sp = document.createElement("span")
    sp.className = "wx-tab"
    sp.contentEditable = "false"
    sp.textContent = "\u00A0".repeat(tabSize)
    return sp
  }

  /**
   * @param {number} tabSize
   * @returns {boolean}
   */
  static insertTab(tabSize = wxEdit.#TAB_LENGTH) {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const r = sel.getRangeAt(0)
    if (!r.collapsed) r.deleteContents()

    const tab = wxEdit.makeTabSpan(tabSize)
    r.insertNode(tab)

    r.setStartAfter(tab)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)

    wxRange.saveSelection()
    return true
  }

  // =========================================================
  // ENTER helpers
  // =========================================================

  /** @returns {HTMLDivElement|null} */
  static #getCurrentParagraphDirectChild() {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return null
    const r = sel.getRangeAt(0)

    const rootSection = wdxSection.getRoot()
    if (!rootSection) return null

    const anchor =
      r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement
    if (!anchor) return null

    // não mexe dentro de table
    if (anchor.closest("td,th")) return null

    // 1) tenta achar o parágrafo pelo DOM
    let p = anchor.closest("div.paragraph")
    if (p instanceof HTMLDivElement) return p

    // 2) fallback: se o caret está no workspace, usa o p-selected
    const workspace = anchor.closest("div.workspace")
    if (!workspace) return null

    p = workspace.querySelector("div.paragraph.p-selected")
    return (p instanceof HTMLDivElement) ? p : null
  }

  /** SHIFT+ENTER: quebra de linha dentro do mesmo parágrafo */
  static #insertSoftBreak() {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const r = sel.getRangeAt(0)

    const p = wxEdit.#getCurrentParagraphDirectChild()
    if (!p) return false

    if (!r.collapsed) r.deleteContents()

    const br = document.createElement("br")
    r.insertNode(br)

    // caret depois do <br>
    const nr = document.createRange()
    nr.setStartAfter(br)
    nr.collapse(true)

    sel.removeAllRanges()
    sel.addRange(nr)
    wxRange.saveSelection()
    return true
  }

  /** ENTER: divide o parágrafo atual em dois (cria novo wxParagraph) */
  static #splitParagraph() {
    wxRange.restoreRange(wxRange.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const r = sel.getRangeAt(0)

    const rootSection = wdxSection.getRoot()
    if (!rootSection) return false

    const p = wxEdit.#getCurrentParagraphDirectChild()
    if (!p) return false

    if (!r.collapsed) r.deleteContents()

    // ===== CASO ESPECIAL: parágrafo vazio (só <br> / whitespace) =====
    const isEmptyParagraph = (() => {
      // ignora whitespace e ZWSP
      const txt = (p.textContent ?? "").replace(/[\s\u200B]/g, "")
      if (txt.length > 0) return false

      // se tiver elementos, aceita apenas <br>
      const els = [...p.childNodes].filter(n => n.nodeType === Node.ELEMENT_NODE)
      return els.length === 0 || (els.length === 1 && els[0].nodeName === "BR")
    })()

    if (isEmptyParagraph) {
      const newPara = new wxParagraph(/** @type {wxSectionDiv} */(rootSection))
      const newP = newPara.root

      p.insertAdjacentElement("afterend", newP)

      const old = rootSection.querySelector(".p-selected")
      if (old) old.classList.remove("p-selected")
      wxEdit.clearParagraphSelection(rootSection)
      newP.classList.add("p-selected")
      wxParagraph.focus(newP)

      const nr = document.createRange()
      nr.selectNodeContents(newP)
      nr.collapse(true)
      sel.removeAllRanges()
      sel.addRange(nr)
      wxRange.saveSelection()
      
      return true
    }

    // ===== CASO NORMAL: divide levando o "tail" pro novo =====
    const tail = r.cloneRange()
    if (p.lastChild) tail.setEndAfter(p.lastChild)
    const frag = tail.extractContents()

    const newPara = new wxParagraph(/** @type {wxSectionDiv} */(rootSection))
    const newP = newPara.root

    // só substitui se tiver conteúdo REAL (não whitespace/ZWSP)
    const hasMeaningfulContent = frag && [...frag.childNodes].some(n => {
      if (n.nodeType === Node.ELEMENT_NODE) return true
      if (n.nodeType === Node.TEXT_NODE) {
        const s = (n.textContent ?? "").replace(/[\s\u200B]/g, "")
        return s.length > 0
      }      
      return false
    })

    if (hasMeaningfulContent) newP.replaceChildren(frag)

    p.insertAdjacentElement("afterend", newP)

    const old = rootSection.querySelector(".p-selected")
    
    if (old) old.classList.remove("p-selected")
    wxEdit.clearParagraphSelection(rootSection)
    newP.classList.add("p-selected")
    wxParagraph.focus(newP)
    const nr = document.createRange()
    nr.selectNodeContents(newP)
    nr.collapse(true)
    sel.removeAllRanges()
    sel.addRange(nr)
    wxRange.saveSelection()
    return true
  }
  /** @param {HTMLDivElement} rootSection */
  static clearParagraphSelection(rootSection) {
    rootSection.querySelectorAll(".paragraph.p-selected").forEach(p => p.classList.remove("p-selected"))
  }
  // =========================================================
  // onKeyDown
  // =========================================================
  /**
   * @param {KeyboardEvent} e
   * @returns {void}
   */
  static onKeyDown(e) {
    const host = /** @type {HTMLElement|null} */ (e.currentTarget)
    if (!host) return

    // SHIFT+ENTER (soft break)
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault()
      wxEdit.#insertSoftBreak()
      return
    }

    // ENTER (split p)
    if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const ok = wxEdit.#splitParagraph()
      if (ok) e.preventDefault()
      return
    }

    // daqui pra baixo: bloqueia combos (não interfere em Ctrl+Z etc)
    const blockedModes = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey
    if (blockedModes) return

    // TAB
    if (e.key === "Tab") {
      e.preventDefault()
      wxEdit.insertTab(wxEdit.#TAB_LENGTH)
      return
    }

    // DELETE
    if (e.key === "Delete") {
      // 1) se houver table/img adjacente, só seleciona e DEIXA o browser apagar
      if (wxEdit.selectObjectIfAdjacent(false, host)) return

      // 2) tab
      if (wxEdit.deleteTabIfAdjacent(false, host)) e.preventDefault()
      return
    }

    // BACKSPACE
    if (e.key === "Backspace") {
      if (wxEdit.selectObjectIfAdjacent(true, host))
        return
      if (wxEdit.deleteTabIfAdjacent(true, host))
        e.preventDefault()
      return
    }
  }
}