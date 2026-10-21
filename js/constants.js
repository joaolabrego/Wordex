"use strict";

const STORAGE_KEY = "wordexNew002.template";

const paperFormatList = Object.freeze([
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
  { value: "Letter", text: "Carta", width: "215.9mm", height: "279.4mm" },
  { value: "Legal", text: "Legal", width: "215.9mm", height: "355.6mm" },
  { value: "Executive", text: "Executivo", width: "184.15mm", height: "266.7mm" },
  { value: "Tabloid", text: "Tabloide", width: "279.4mm", height: "431.8mm" },
  { value: "Ledger", text: "Ledger", width: "431.8mm", height: "279.4mm" },
  { value: "ANSI_A", text: "ANSI A", width: "215.9mm", height: "279.4mm" },
  { value: "ANSI_B", text: "ANSI B", width: "279.4mm", height: "431.8mm" },
  { value: "ANSI_C", text: "ANSI C", width: "431.8mm", height: "558.8mm" },
  { value: "ANSI_D", text: "ANSI D", width: "558.8mm", height: "863.6mm" },
  { value: "ANSI_E", text: "ANSI E", width: "863.6mm", height: "1117.6mm" }
]);

function getPaperFormat(value) {
  return paperFormatList.find(item => item.value === value) || paperFormatList.find(item => item.selected) || paperFormatList[0];
}

const KINDS = Object.freeze({
  TEMPLATE: "Template",
  SECTION: "Section",
  PARAGRAPH: "Paragraph",
  SUBPARAGRAPH: "Subparagraph",
  TABLE: "Table",
  IMAGE: "Image",
  CHART: "Chart",
  LIST: "List",
  LINE: "Line",
  TEXTBOX: "TextBox",
  WATERMARK: "Watermark",
  PAGE_BREAK: "PageBreak"
});

const TOOLBAR_OBJECT_ADD_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#f1fff7" stroke="#1f8f52" stroke-width="1.8"/><path d="M12 7v10M7 12h10" stroke="#168447" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const TOOLBAR_OBJECT_EDIT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#f2f7ff" stroke="#2f73d6" stroke-width="1.8"/><path d="M8 15.8l.7-3.1 6.7-6.7 2.4 2.4-6.7 6.7-3.1.7z" fill="#3b7ddd"/><path d="M14.7 6.7l2.6 2.6" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/></svg>`;

const CONTENT_KIND = Object.freeze({
  EMPTY: "Empty",
  TEXT: "Text",
  OBJECT: "Object"
});

const PAGE_BREAK_CHARACTER = "\f";

const SECTION_KIND = Object.freeze({
  HEADER: "Header",
  BODY: "Body",
  FOOTER: "Footer"
});

const EDIT_TARGET_KIND = Object.freeze({
  MAIN_OBJECT: "MainObject",
  PARAGRAPH: "Paragraph",
  SUBPARAGRAPH: "Subparagraph",
  TABLE_ROW: "TableRow",
  TABLE_COLUMN: "TableColumn",
  TABLE_CELL: "TableCell"
});

const SUBPARAGRAPH_TEXT_ALIGNMENTS = Object.freeze(["left", "center", "right", "justify"]);
