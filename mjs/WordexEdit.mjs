// @ts-check
"use strict"

import Config from "./WordexConfig.mjs"

export default class Edit {
  static #TAB_LENGTH = 4

  // =========================================================
  // OVR helper
  // =========================================================
  /**
   * @param {InputEvent} e
   * @returns {void}
   */
  static handleOverwriteInput(e) {
    if (e.inputType !== "insertText" || !e.data) return

    Config.restoreRange(Config.range)

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
      Config.saveSelection()
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
      Config.saveSelection()
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
    Config.restoreRange(Config.range)

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

    const delEl = Edit.#getDeletableElement(node)
    if (!delEl) return false

    // ✅ Só seleciona (não remove, não execCommand)
    const rr = document.createRange()
    rr.selectNode(delEl)
    sel.removeAllRanges()
    sel.addRange(rr)

    Config.saveSelection()
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
    Config.restoreRange(Config.range)

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
        Config.saveSelection()
        return true
      }
      return false
    }

    if (sc instanceof Text) {
      if (isBackspace && so === 0) {
        const prev = sc.previousSibling
        if (prev instanceof Element && prev.classList.contains("wx-tab")) {
          prev.remove()
          Config.saveSelection()
          return true
        }
      }
      if (!isBackspace && so === sc.data.length) {
        const next = sc.nextSibling
        if (next instanceof Element && next.classList.contains("wx-tab")) {
          next.remove()
          Config.saveSelection()
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
  static makeTabSpan(tabSize = Edit.#TAB_LENGTH) {
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
  static insertTab(tabSize = Edit.#TAB_LENGTH) {
    Config.restoreRange(Config.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false

    const r = sel.getRangeAt(0)
    if (!r.collapsed) r.deleteContents()

    const tab = Edit.makeTabSpan(tabSize)
    r.insertNode(tab)

    r.setStartAfter(tab)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)

    Config.saveSelection()
    return true
  }

  // =========================================================
  // ENTER helpers
  // =========================================================

  /** @returns {HTMLDivElement|null} */
  static #getCurrentParagraphDirectChild() {
    Config.restoreRange(Config.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return null
    const r = sel.getRangeAt(0)

    const root = Config.root
    if (!root) return null

    const anchor =
      r.startContainer instanceof Element ? r.startContainer : r.startContainer.parentElement
    if (!anchor) return null

    // não mexe dentro de table
    if (anchor.closest("td,th")) return null

    const p = anchor.closest("div")
    if (!(p instanceof HTMLDivElement)) return null
    if (p.parentElement !== root) return null
    return p
  }

  /** @returns {boolean} */
  static #insertSoftBreak() {
    Config.restoreRange(Config.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const r = sel.getRangeAt(0)

    if (!r.collapsed) r.deleteContents()

    const br = document.createElement("br")
    r.insertNode(br)

    r.setStartAfter(br)
    r.collapse(true)
    sel.removeAllRanges()
    sel.addRange(r)

    Config.saveSelection()
    return true
  }

  /** @returns {boolean} */
  static #splitParagraph() {
    Config.restoreRange(Config.range)

    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) return false
    const r = sel.getRangeAt(0)

    const p = Edit.#getCurrentParagraphDirectChild()
    if (!p) return false

    if (!r.collapsed) r.deleteContents()

    // extrai o “tail” do parágrafo atual para o novo
    const tail = r.cloneRange()
    if (p.lastChild) tail.setEndAfter(p.lastChild)
    const frag = tail.extractContents()

    const newP = document.createElement("div")
    newP.appendChild(frag)
    if (!newP.firstChild) newP.appendChild(document.createElement("br"))

    p.insertAdjacentElement("afterend", newP)

    // troca seleção visual (se houver)
    const root = Config.root
    if (root) {
      const oldSel = root.querySelector(".p-selected")
      if (oldSel) oldSel.classList.remove("p-selected")
      newP.classList.add("p-selected")
    }

    // caret no início do novo parágrafo
    const nr = document.createRange()
    nr.selectNodeContents(newP)
    nr.collapse(true)
    sel.removeAllRanges()
    sel.addRange(nr)

    Config.saveSelection()
    return true
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
      Edit.#insertSoftBreak()
      return
    }

    // ENTER (split p)
    if (e.key === "Enter" && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const ok = Edit.#splitParagraph()
      if (ok) e.preventDefault()
      return
    }

    // daqui pra baixo: bloqueia combos (não interfere em Ctrl+Z etc)
    const blockedModes = e.shiftKey || e.ctrlKey || e.altKey || e.metaKey
    if (blockedModes) return

    // TAB
    if (e.key === "Tab") {
      e.preventDefault()
      Edit.insertTab(Edit.#TAB_LENGTH)
      return
    }

    // DELETE
    if (e.key === "Delete") {
      // 1) se houver table/img adjacente, só seleciona e DEIXA o browser apagar
      if (Edit.selectObjectIfAdjacent(false, host)) return

      // 2) tab
      if (Edit.deleteTabIfAdjacent(false, host)) e.preventDefault()
      return
    }

    // BACKSPACE
    if (e.key === "Backspace") {
      if (Edit.selectObjectIfAdjacent(true, host)) return
      if (Edit.deleteTabIfAdjacent(true, host)) e.preventDefault()
      return
    }
  }
}
