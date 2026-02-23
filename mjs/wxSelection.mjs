// wxSelection.mjs
// @ts-check
"use strict"

/** @typedef {import("./wxTypes.mjs").wxParagraph} wxParagraphType */
/** @typedef {import("./wxTypes.mjs").wxImage} wxImageType */
/** @typedef {import("./wxTypes.mjs").wxTable} wxTableType */
/** @typedef {import("./wxTypes.mjs").wxTableRow} wxTableRowType */
/** @typedef {import("./wxTypes.mjs").wxTableCol} wxTableColType */
/** @typedef {import("./wxTypes.mjs").wxTableCell} wxTableCellType */

export default class wxSelection {
  /** @type {Range|null} */ static range = null
  /** @type {wxParagraphType|null} */ static paragraph = null
  /** @type {wxImageType|null} */ static image = null
  /** @type {wxTableType|null} */ static table = null
  /** @type {wxTableRowType|null} */ static tableRow = null
  /** @type {number|null} */ static tableCol = null
  /** @type {HTMLTableCellElement|null} */ static tableCell = null

  /** @type {{kind:string, element:Element}[]} */ static selectedList = []

    static clear() {
        /** @type {Range} */ wxSelection.range = null
        /** @type {wxParagraphType} */ wxSelection.paragraph = null
        /** @type {wxImageType} */ wxSelection.image = null
        /** @type {wxTableType[]} */ wxSelection.table = null
        /** @type {wxTableRowType[]} */ wxSelection.tableRow = null
        /** @type {wxTableColType[]} */ wxSelection.tableCol = null
        /** @type {wxTableCellType} */ wxSelection.tableCell = null
        /** @type {Range} */ wxSelection.selectedList = []
    }

    /**
     * Descobre:
     * - Range (se houver seleção de texto)
     * - Contexto do caret (paragraph/table/cell/row/col) via Range
     * - E TODOS os elementos com class .selected (seleção estrutural do Wordex)
     *
     * @returns {typeof wxSelection}
     */
    static GetTargets() {
        wxSelection.clear()

        // 1) Contexto via Selection/Range
        const selection = window.getSelection()
        if (selection && selection.rangeCount) {
            const range = selection.getRangeAt(0)

            if (!range.collapsed)
                wxSelection.range = range.cloneRange()
        }

        // 2) Seleção estrutural via .selected (múltiplos)
        const selectedElements = Array.from(document.body.querySelectorAll(".selected"))

        for (const element of selectedElements) {
            // paragraph
            if (element instanceof HTMLDivElement && element.classList.contains("paragraph")) {
                wxSelection.paragraph = /** @type {wxParagraphType} */(element)
                wxSelection.selectedList.push({ kind: "paragraph", element })
                continue
            }

            // image
            if (element instanceof HTMLImageElement) {
                wxSelection.image = /** @type {wxImageType} */(element)
                wxSelection.selectedList.push({ kind: "image", element })
                continue
            }

            // table
            if (element instanceof HTMLTableElement) {
                wxSelection.table = /** @type {wxTableType} */(element)
                wxSelection.selectedList.push({ kind: "table", element })
                continue
            }

            // row
            if (element instanceof HTMLTableRowElement) {
                wxSelection.tableRow = /** @type {wxTableRowType|null} */(element)
                wxSelection.table = /** @type {wxTableType|null} */ (element.closest("table"))
                wxSelection.selectedList.push({ kind: "row", element })
                continue
            }

            // cell
            if (element instanceof HTMLTableCellElement) {
                wxSelection.tableCell = element
                wxSelection.tableRow = /** @type {wxTableRowType|null} */(element.parentElement instanceof HTMLTableRowElement ? element.parentElement : null)
                wxSelection.table = /** @type {wxTableType|null} */(element.closest("table"))
                wxSelection.selectedList.push({ kind: "cell", element })
                continue
            }

            // coluna: não existe um "elemento coluna" padrão.
            // Se você marca várias células da coluna com .selected, isso já cairia no case "cell".
            // Se você tiver um elemento/overlay da coluna, trate aqui.
        }

        return wxSelection
    }
}