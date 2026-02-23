// @ts-check
"use strict"

import wxRange from "./wxRange.mjs"
import wxSection from "./wxSection.mjs"
/** @typedef {import("./wxTypes.mjs").wxItem} wxItem */
export default class wxConfig {
  /** @readonly @type {"✔ "} */ static K_OK = "✔ "
  /** @readonly @type {"INS"} */ static K_INSERT_MODE = "INS"
  /** @readonly @type {"OVR"} */ static K_OVERWRITE_MODE = "OVR"
  /** @readonly @type {"#006400"} */ static K_INSERT_COLOR = "#006400"
  /** @readonly @type {"#8B0000"} */ static K_OVERWRITE_COLOR = "#8B0000"
  /** @readonly @type {"landscape"} */ static K_LANDSCAPE = "landscape"
  /** @readonly @type {"portrait"} */ static K_PORTRAIT = "portrait"
  /** @readonly @type {"#000000"} */ static K_DEFAULT_COLOR = "#000000"


  /** @type {Readonly<wxItem[]>} */
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
  /** @type {Readonly<wxItem[]>} */
  static fontFamilyList = Object.freeze([
    { value: "", text: "Fonte" },

    // Sans-serif (UI / leitura)
    { value: '"Segoe UI", sans-serif', text: "Segoe UI", selected: true },
    { value: "Arial, sans-serif", text: "Arial" },
    { value: "Calibri, sans-serif", text: "Calibri" },
    { value: "Tahoma, sans-serif", text: "Tahoma" },
    { value: '"Trebuchet MS", sans-serif', text: "Trebuchet MS" },
    { value: '"Verdana", sans-serif', text: "Verdana" },

    // Serif (documento)
    { value: '"Times New Roman", serif', text: "Times New Roman" },
    { value: "Georgia, serif", text: "Georgia" },
    { value: '"Palatino Linotype", serif', text: "Palatino Linotype" },
    { value: "Garamond, serif", text: "Garamond" },
    { value: "Cambria, serif", text: "Cambria" },
    { value: "Constantia, serif", text: "Constantia" },

    // Monospace (código)
    { value: '"Consolas", monospace', text: "Consolas" },
    { value: '"Courier New", monospace', text: "Courier New" },
    { value: '"Lucida Console", monospace', text: "Lucida Console" },

    // “Clássicas Windows”
    { value: '"Comic Sans MS", cursive', text: "Comic Sans MS" },
    { value: "Impact, sans-serif", text: "Impact" },
  ])
  /** @type {Readonly<wxItem[]>} */
  static fontSizeList = Object.freeze([
    { value: "", text: "Tamanho" },
    { value: "10px", text: "8pt" },
    { value: "12px", text: "10pt" },
    { value: "14px", text: "12pt", selected: true },
    { value: "16px", text: "14pt" },
    { value: "18px", text: "18pt" },
    { value: "24px", text: "24pt" },
    { value: "36px", text: "36pt" },
  ])
  /** @type {Readonly<wxItem[]>} */
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
  /** @type {Readonly<wxItem[]>} */
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
  /** @type {Readonly<wxItem[]>} */
  static pageOrientationList = Object.freeze([
    { value: "", text: "Orientação" },
    { value: wxConfig.K_PORTRAIT, text: "Retrato", selected: true },
    { value: wxConfig.K_LANDSCAPE, text: "Paisagem" },
  ])
  /** @type {Readonly<wxItem[]>} */
  static fontStyleList = Object.freeze([
    { value: "", text: "Estilo" },
    { value: "none", text: "none" },
    // Ênfase básica
    { value: "b", text: "Negrito", selected: false },
    { value: "i", text: "Itálico" },
    { value: "u", text: "Sublinhado" },
    { value: "s", text: "Tachado" },

    // Tipografia
    { value: "sup", text: "Sobrescrito" },
    { value: "sub", text: "Subscrito" },
    { value: "small", text: "Texto menor" },

    // Destaque semântico / visual
    { value: "mark", text: "Marca-texto" },
    { value: "code", text: "Código" },

    // Alternativas semânticas (opcionais)
    { value: "strong", text: "Forte" },
    { value: "em", text: "Ênfase" },
  ])
  /** @type {Readonly<wxItem[]>} */
  static alignmentList = Object.freeze([
    { value: "", text: "Alinhamento" },
    { value: "left", text: "Esquerda", selected: true },
    { value: "center", text: "Centro" },
    { value: "right", text: "Direita" },
    { value: "justify", text: "Justificado" },
  ])
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

      .toolbar {
        top: 0;
        padding: 0;
        z-index: 1000;
        background: gray;
        border-bottom: 1px solid #d0d0d0;
        display: flex;
        align-items: center;   /* <-- aqui */
        gap: 3px;
      }

      .toolbar select,
      .toolbar button,
      .toolbar input[type="color"] {
        height: 20px;          /* escolha um valor */
        line-height: 20px;
        box-sizing: border-box;
        vertical-align: middle;
        background: #888;
        color: #EAEAEA;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 2px;
        outline: none;
        height: 25px;
      }

      .toolbar button,
      .toolbar input[type="color"]{
        display: inline-flex;         /* ou flex */
        align-items: center;          /* vertical */
        justify-content: center;      /* horizontal */
        padding: 0 5px;              /* sem padding vertical */
        line-height: 1px;            /* evita empurrão do baseline */
        min-width: 30px;
        max-width: 40px;
      }

      img.img-selected {
        outline: 2px solid #0aec0a;
        outline-offset: 2px;
      }

      img.img-left { float: left;  margin: 4px 8px 4px 0; }
      img.img-right { float: right; margin: 4px 0 4px 8px; }

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
   * @param {string} cmd
   * @param {string|null} value
   * @returns {boolean}
   */
  static exec(cmd, value = null) {
    if (!wxRange.range) return false

    const sel = window.getSelection()
    if (!sel) return false

    sel.removeAllRanges()
    sel.addRange(wxRange.range)

    wxSection.rootSection?.focus({ preventScroll: true })

    if (value !== null && value !== undefined) document.execCommand(cmd, false, value)
    else document.execCommand(cmd, false)

    wxRange.saveSelection()
    return true
  }
}