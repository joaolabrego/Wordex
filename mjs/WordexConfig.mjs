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

  /** @type {HTMLDivElement} */ static rootSection
  /** @type {Range|null} */ static range = null
  /** @readonly @type {"✔ "} */ static K_OK = "✔ "
  /** @readonly @type {"INS"} */ static K_INSERT_MODE = "INS"
  /** @readonly @type {"OVR"} */ static K_OVERWRITE_MODE = "OVR"
  /** @readonly @type {"landscape"} */ static K_LANDSCAPE = "landscape"
  /** @readonly @type {"portrait"} */ static K_PORTRAIT = "portrait"

  // ✅ Não precisa instanciar Config. Só setar o rootSection.
  /**
   * @param {HTMLDivElement} rootEditable
   */
  static setRoot(rootEditable) {
    Config.rootSection = rootEditable
  }

  /** @type {Readonly<Item[]>} */
  static paperFormatList = Object.freeze([
    // Genérico
    { value: "", text: "Folha" },

    // ISO 216 — Série A
    { value: "A0", text: "A0", width: "841mm", height: "1189mm" },
    { value: "A1", text: "A1", width: "594mm", height: "841mm" },
    { value: "A2", text: "A2", width: "420mm", height: "594mm" },
    { value: "A3", text: "A3", width: "297mm", height: "420mm" },
    { value: "A4", text: "A4", width: "210mm", height: "297mm", selected: true },
    { value: "A5", text: "A5", width: "148mm", height: "210mm" },
    { value: "A6", text: "A6", width: "105mm", height: "148mm" },
    { value: "A7", text: "A7", width: "74mm", height: "105mm" },
    { value: "A8", text: "A8", width: "52mm", height: "74mm" },
    { value: "A9", text: "A9", width: "37mm", height: "52mm" },
    { value: "A10", text: "A10", width: "26mm", height: "37mm" },

    // ISO 216 — Série B
    { value: "B0", text: "B0", width: "1000mm", height: "1414mm" },
    { value: "B1", text: "B1", width: "707mm", height: "1000mm" },
    { value: "B2", text: "B2", width: "500mm", height: "707mm" },
    { value: "B3", text: "B3", width: "353mm", height: "500mm" },
    { value: "B4", text: "B4", width: "250mm", height: "353mm" },
    { value: "B5", text: "B5", width: "176mm", height: "250mm" },
    { value: "B6", text: "B6", width: "125mm", height: "176mm" },
    { value: "B7", text: "B7", width: "88mm", height: "125mm" },
    { value: "B8", text: "B8", width: "62mm", height: "88mm" },
    { value: "B9", text: "B9", width: "44mm", height: "62mm" },
    { value: "B10", text: "B10", width: "31mm", height: "44mm" },

    // ISO 269 — Série C (envelopes)
    { value: "C0", text: "C0", width: "917mm", height: "1297mm" },
    { value: "C1", text: "C1", width: "648mm", height: "917mm" },
    { value: "C2", text: "C2", width: "458mm", height: "648mm" },
    { value: "C3", text: "C3", width: "324mm", height: "458mm" },
    { value: "C4", text: "C4", width: "229mm", height: "324mm" },
    { value: "C5", text: "C5", width: "162mm", height: "229mm" },
    { value: "C6", text: "C6", width: "114mm", height: "162mm" },
    { value: "C7", text: "C7", width: "81mm", height: "114mm" },
    { value: "C8", text: "C8", width: "57mm", height: "81mm" },
    { value: "C9", text: "C9", width: "40mm", height: "57mm" },
    { value: "C10", text: "C10", width: "28mm", height: "40mm" },

    // Padrões norte-americanos
    { value: "Letter", text: "Carta (Letter)", width: "215.9mm", height: "279.4mm" },
    { value: "Legal", text: "Legal", width: "215.9mm", height: "355.6mm" },
    { value: "Executive", text: "Executivo", width: "184.15mm", height: "266.7mm" },
    { value: "Tabloid", text: "Tabloide", width: "279.4mm", height: "431.8mm" },
    { value: "Ledger", text: "Ledger", width: "431.8mm", height: "279.4mm" },

    // ANSI
    { value: "ANSI_A", text: "ANSI A", width: "215.9mm", height: "279.4mm" },
    { value: "ANSI_B", text: "ANSI B", width: "279.4mm", height: "431.8mm" },
    { value: "ANSI_C", text: "ANSI C", width: "431.8mm", height: "558.8mm" },
    { value: "ANSI_D", text: "ANSI D", width: "558.8mm", height: "863.6mm" },
    { value: "ANSI_E", text: "ANSI E", width: "863.6mm", height: "1117.6mm" }
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
    { value: Config.K_PORTRAIT, text: "Retrato", selected: true },
    { value: Config.K_LANDSCAPE, text: "Paisagem" },
  ])

  static fontStyleList = Object.freeze([
    { value: "", text: "Estilos" },
    { value: "none", text: "none", tag: "" },
    // Ênfase básica
    { value: "bold", text: "Negrito", tag: "b" },
    { value: "italic", text: "Itálico", tag: "i" },
    { value: "underline", text: "Sublinhado", tag: "u" },
    { value: "strikethrough", text: "Tachado", tag: "s" },

    // Tipografia
    { value: "superscript", text: "Sobrescrito", tag: "sup" },
    { value: "subscript", text: "Subscrito", tag: "sub" },
    { value: "small", text: "Texto menor", tag: "small" },

    // Destaque semântico / visual
    { value: "mark", text: "Marca-texto", tag: "mark" },
    { value: "code", text: "Código", tag: "code" },

    // Alternativas semânticas (opcionais)
    { value: "strong", text: "Forte", tag: "strong" },
    { value: "emphasis", text: "Ênfase", tag: "em" },
  ])
  
  static alignmentList = Object.freeze([
    { value: "", text: "Alinhamento" },
    { value: "left", text: "Esquerda", selected: true },
    { value: "center", text: "Centro" },
    { value: "right", text: "Direita" },
    { value: "justify", text: "Justificado" },
  ])

  static saveSelection() {
    const root = Config.rootSection
    if (!root)
      return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0)
      return

    const r = sel.getRangeAt(0)

    const a = sel.anchorNode
    const f = sel.focusNode
    if (!a || !f)
      return
    if (!a.isConnected || !f.isConnected)
      return

    const aEl = a.nodeType === Node.TEXT_NODE ? a.parentElement : a
    const fEl = f.nodeType === Node.TEXT_NODE ? f.parentElement : f
    if (!(aEl instanceof Element) || !(fEl instanceof Element))
      return
    if (!root.contains(aEl) || !root.contains(fEl))
      return

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

  /** @readonly */
  static Script = `
      :root { --margin: 20mm; }

      html, body { margin: 0; padding: 0; }
      body { background-color: #555; }

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
        padding: 0;
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
      Config.toggleSelectOption(select, templateList, isOnlyOnce)
    })

    return select
  }

  /**
   * @param {HTMLSelectElement} selectElement
   * @param {ReadonlyArray<Item>} selectList
   * @param {string} [value]
   * @returns {HTMLSelectElement}
   */
  static mountSelect(selectElement, selectList, value = "") {
    selectElement.options.length = 0

    selectList?.forEach((item) => {
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
  static toggleSelectOption(selectElement, templateList, isOnlyOnce = true) {
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
    if (select.selectedIndex < 0)
      return ""

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

    Config.rootSection?.focus({ preventScroll: true })

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
    if (s === null)
      return null
    const n = parseInt(s.trim(), 10)
    if (!Number.isFinite(n))
      return def
    return Math.min(max, Math.max(min, n))
  }
}