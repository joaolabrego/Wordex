// @ts-check
"use strict"

export default class Config {
  /**
   * @typedef {{
   *   value: string,
   *   text: string,
   *   width?: string,
   *   height?: string,
   *   tag?: string,
   *   selected?: boolean
   * }} Item
   */

  /** @type {HTMLDivElement} */ static root
  /** @type {Range|null} */ static range = null
  /** @readonly @type {string} */ static K_OK = "✔ "

  // ✅ Não precisa instanciar Config. Só setar o root.
  /**
   * @param {HTMLDivElement} rootEditable
   */
  static setRoot(rootEditable) {
    Config.root = rootEditable
  }

  /** @type {Readonly<Item[]>} */
  static paperFormatList = Object.freeze([
    { value: "", text: "Folha" },
    { value: "A3", text: "A3", width: "297mm", height: "420mm" },
    { value: "A4", text: "A4", width: "210mm", height: "297mm", selected: true },
    { value: "Letter", text: "Carta", width: "215.9mm", height: "279.4mm" },
    { value: "Legal", text: "Legal", width: "215.9mm", height: "355.6mm" },
    { value: "Executive", text: "Executivo", width: "184.15mm", height: "266.7mm" },
  ])

  static fontFamilyList = Object.freeze([
    { value: "", text: "Fonte" },
    { value: "Arial", text: "Arial", selected: true },
    { value: "Calibri", text: "Calibri" },
    { value: "Times New Roman", text: "Times New Roman" },
    { value: "Verdana", text: "Verdana" },
    { value: "Courier New", text: "Courier New" },
    { value: "Georgia", text: "Georgia" },
  ])

  static fontSizeList = Object.freeze([
    { value: "", text: "Tamanho" },
    { value: "1", text: "8pt" },
    { value: "2", text: "10pt" },
    { value: "3", text: "12pt", selected: true },
    { value: "4", text: "14pt" },
    { value: "5", text: "18pt" },
    { value: "6", text: "24pt" },
    { value: "7", text: "36pt" },
  ])

  static borderList = Object.freeze([
    { value: "", text: "Borda" },
    { value: "0px", text: "none", selected: true },
    { value: "1px", text: "1px" },
    { value: "2px", text: "2px" },
    { value: "3px", text: "3px" },
    { value: "4px", text: "4px" },
    { value: "5px", text: "5px" },
    { value: "6px", text: "6px" },
    { value: "8px", text: "8px" },
    { value: "10px", text: "10px" },
  ])

  static borderRadiusList = Object.freeze([
    { value: "", text: "Arredondamento" },
    { value: "0px", text: "none", selected: true },
    { value: "2px", text: "2px" },
    { value: "4px", text: "4px" },
    { value: "8px", text: "8px" },
    { value: "12px", text: "12px" },
    { value: "16px", text: "16px" },
    { value: "20px", text: "20px" },
    { value: "25px", text: "25px" },
    { value: "30px", text: "30px" },
  ])

  static pageOrientationList = Object.freeze([
    { value: "", text: "Orientação" },
    { value: "portrait", text: "Retrato", selected: true },
    { value: "landscape", text: "Paisagem" },
  ])

  static fontStyleList = Object.freeze([
    { value: "", text: "Estilos" },
    { value: "bold", text: "Negrito", tag: "b" },
    { value: "italic", text: "Itálico", tag: "i" },
    { value: "underline", text: "Sublinhado", tag: "u" },
    { value: "strikethrough", text: "Tachado", tag: "s" },
    { value: "superscript", text: "Sobrescrito", tag: "sup" },
    { value: "subscript", text: "Subscrito", tag: "sub" },
  ])

  static alignmentList = Object.freeze([
    { value: "", text: "Alinhamento" },
    { value: "justifyLeft", text: "Esquerda", selected: true },
    { value: "justifyCenter", text: "Centro" },
    { value: "justifyRight", text: "Direita" },
    { value: "justifyFull", text: "Justificado" },
  ])

  static saveSelection() {
    if (!Config.root) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const r = sel.getRangeAt(0)

    /** @type {Node|null} */
    let el = r.commonAncestorContainer
    if (el.nodeType === Node.TEXT_NODE) el = el.parentElement
    if (!(el instanceof Element)) return
    if (!Config.root.contains(el)) return

    Config.range = r.cloneRange()
  }

  /**
   * @param {Range|null} range
   * @returns {boolean}
   */
  static restoreRange(range) {
    if (!range) return false
    const sel = window.getSelection()
    if (!sel) return false
    sel.removeAllRanges()
    sel.addRange(range)
    return true
  }

  static saveRange() {
    const r = Config.getSelRange()
    return r ? r.cloneRange() : null
  }

  static getSelRange() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    return sel.getRangeAt(0)
  }

  /**
   * Mantém pelo menos um <div> dentro do root (teu “parágrafo”).
   * @param {HTMLDivElement|null} root
   * @returns {HTMLDivElement|null}
   */
  static ensureFirstParagraph(root) {
    if (!root) return null

    // ✅ agora os parágrafos são <div> normais
    /** @type {HTMLDivElement|null} */
    let p = root.querySelector("div")
    if (p) return p

    const txt = root.textContent ?? ""
    while (root.firstChild) root.removeChild(root.firstChild)

    p = document.createElement("div")
    if (txt.trim()) p.textContent = txt
    else p.appendChild(document.createElement("br"))

    root.prepend(p)
    p.focus({ preventScroll: true })
    return p
  }

  /** @readonly */
  static Script = `
      :root { --margin: 20mm; }

      html, body { margin: 0; padding: 0; }
      body { background-color: black; }

      .page {
        margin: var(--margin);
        display: flex;
        flex-direction: column;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0,0,0,.35);
        margin: 60px auto 0;
        height: calc(100vh - calc(var(--margin) * 2));
      }

      .control { margin: 5px; }

      .toolbar {
        top: 0;
        pading: 0;
        z-index: 1000;
        background: gray;
        border-bottom: 1px solid #d0d0d0;
      }

      .workspace { background: #CCC; padding: 10px; }
      .editable { outline: none; min-height: 24px; }

      .editable:focus { box-shadow: 0 0 0 3px #0aec0a inset; }

      .header {
        border-bottom: 1px dashed #555;
        overflow: hidden;
        background: #AAA;
        height: 20mm;
        flex: 0 0 auto;
      }

      .body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
      }

      .footer {
        border-top: 1px dashed #555;
        overflow: hidden;
        background: #AAA;
        flex: 0 0 auto;
        height: 15mm;
      }

      .insert-mode { padding: 0px 5px; }

      .toolbar select,
      .toolbar button,
      .toolbar input[type="color"] {
        background: #888;
        color: #EAEAEA;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 5px;
        height: 26px;
        outline: none;
      }

      img.img-selected {
        outline: 2px solid #0aec0a;
        outline-offset: 2px;
      }

      img.img-left { float: left;  margin: 4px 8px 4px 0; }
      img.img-right { float: right; margin: 4px 0 4px 8px; }

      button {
        width: 40px;
        min-height: 20px;
      }

      img.img-inline {
        float: none;
        display: inline-block;
        margin: 4px auto;
      }

      .row-selected td {
        outline: 2px solid #0aec0a; outline-offset: -2px;
      }
        
      .col-selected {
        outline: 2px solid #0aec0a;
        outline-offset: -2px;
      }
    `

  /**
   * @param {*} array
   * @param {*} value
   */
  static deleteArrayItem(array, value) {
    const index = array.indexOf(value)
    if (index !== -1) array.splice(index, 1)
  }

  /**
   * @param {Document} document
   * @param {ReadonlyArray<Item>} templateList
   * @param {string} title
   * @param {boolean} [isOnlyOnce]
   * @param {(() => void)|undefined} [eventChange]
   * @returns {HTMLSelectElement}
   */
  static createSelect(document, templateList, title, isOnlyOnce = true, eventChange = undefined) {
    const select = document.createElement("select")
    select.classList.add("control")
    select.title = title
    select.style.fontSize = "10px"
    select.style.fontWeight = "bold"

    Config.mountSelect(select, templateList)

    select.addEventListener("change", () => {
      if (eventChange) eventChange()
      Config.toogleSelectOption(select, templateList, isOnlyOnce)
    })

    return select
  }

  /**
   * @param {HTMLSelectElement} selectElement
   * @param {ReadonlyArray<Item>} selecctList
   * @param {string} [value]
   * @returns {HTMLSelectElement}
   */
  static mountSelect(selectElement, selecctList, value = "") {
    selectElement.options.length = 0

    selecctList?.forEach((item) => {
      const option = document.createElement("option")
      option.style.fontSize = "10px"
      option.style.fontWeight = "bold"
      option.value = item.value
      option.textContent = (item.selected ? Config.K_OK : "") + item.text
      selectElement.appendChild(option)
    })
    return selectElement
  }

  /**
   * @param {HTMLSelectElement} selectElement
   * @param {ReadonlyArray<Item>} templateList
   * @param {boolean} isOnlyOnce
   */
  static toogleSelectOption(selectElement, templateList, isOnlyOnce = true) {
    const value = selectElement.options[selectElement.selectedIndex].value
    if (!value) return

    if (isOnlyOnce) templateList.forEach((item) => (item.selected = item.value === value))
    else {
      const item = templateList.find((item) => item.value === value)
      if (item) item.selected = !item.selected
    }

    Config.mountSelect(selectElement, templateList, value)
  }

  /**
   * @param {string} textContent
   * @param {string} title
   * @param {(ev: MouseEvent) => void} functionClick
   * @returns {HTMLButtonElement}
   */
  static createButton(textContent, title, functionClick) {
    const button = document.createElement("button")
    button.textContent = textContent
    button.title = title
    button.classList.add("control")
    button.addEventListener("click", functionClick)
    return button
  }

  /**
   * @param {HTMLSelectElement} select
   */
  static getHTMLSelectElementValue(select) {
    return select.options[select.selectedIndex].value
  }

  /**
   * @returns {HTMLDivElement|null}
   */
  static getActiveParagraph() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const r = sel.getRangeAt(0)
    const n = r.startContainer

    /** @type {Element|null} */
    const el =
      n.nodeType === Node.ELEMENT_NODE
        ? /** @type {Element} */ (n)
        : n.parentElement

    const p = el ? el.closest("div") : null
    return /** @type {HTMLDivElement|null} */ (p)
  }

  /**
   * @param {string} cmd
   * @param {string|null} value
   * @returns {boolean}
   */
  static exec(cmd, value = null) {
    if (!Config.range) return false

    const sel = window.getSelection()
    if (!sel) return false

    sel.removeAllRanges()
    sel.addRange(Config.range)

    Config.root?.focus({ preventScroll: true })

    if (value !== null && value !== undefined) document.execCommand(cmd, false, value)
    else document.execCommand(cmd, false)

    Config.saveSelection()
    return true
  }

  /**
   * 
   * @param {string} msg 
   * @param {number} def 
   * @param {number} min 
   * @param {number} max 
   * @returns 
   */
  static askInteger = (msg, def, min = 1, max = 99) => {
    const s = prompt(msg, String(def))
    console.log("joao")
    if (s === null)
      return null
    const n = parseInt(s.trim(), 10)
    if (!Number.isFinite(n))
      return def
    return Math.min(max, Math.max(min, n))
  }
}