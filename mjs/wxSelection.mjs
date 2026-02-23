// wxSelection.mjs
// @ts-check
"use strict"

export default class wxSelection {
  /** @type {Range|null} */ static range = null
  /** @type {HTMLDivElement|null} */ static paragraph = null
  /** @type {HTMLImageElement|null} */ static image = null
  /** @type {HTMLTableElement|null} */ static table = null
  /** @type {HTMLTableRowElement|null} */ static tableRow = null
  /** @type {number|null} */ static tableCol = null
  /** @type {HTMLTableCellElement|null} */ static tableCell = null

  /** @type {{kind:string, element:Element}[]} */ static selectedList = []

    static clear() {
        wxSelection.range = null
        wxSelection.paragraph = null
        wxSelection.image = null
        wxSelection.table = null
        wxSelection.tableRow = null
        wxSelection.tableCol = null
        wxSelection.tableCell = null
        wxSelection.selectedList = []
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

            if (!range.collapsed) wxSelection.range = range.cloneRange()

            const node = range.startContainer
            const element =
                node.nodeType === Node.ELEMENT_NODE
                    ? /** @type {Element} */ (node)
                    : node.parentElement

            if (element) {
                wxSelection.paragraph = /** @type {HTMLDivElement|null} */ (
                    element.closest("div.paragraph")
                )

                const cell = /** @type {HTMLTableCellElement|null} */ (
                    element.closest("td,th")
                )
                if (cell) {
                    wxSelection.tableCell = cell
                    wxSelection.tableRow =
                        cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement : null
                    wxSelection.table = /** @type {HTMLTableElement|null} */ (cell.closest("table"))

                    const row = wxSelection.tableRow
                    if (row) {
                        const cells = Array.from(row.cells)
                        const idx = cells.indexOf(cell)
                        wxSelection.tableCol = idx >= 0 ? idx : null
                    }
                } else {
                    wxSelection.table = /** @type {HTMLTableElement|null} */ (element.closest("table"))
                }
            }
        }

        // 2) Seleção estrutural via .selected (múltiplos)
        const selectedElements = Array.from(document.body.querySelectorAll(".selected"))

        for (const element of selectedElements) {
            // paragraph
            if (
                element instanceof HTMLDivElement &&
                element.classList.contains("paragraph")
            ) {
                wxSelection.paragraph = element
                wxSelection.selectedList.push({ kind: "paragraph", element })
                continue
            }

            // image
            if (element instanceof HTMLImageElement) {
                wxSelection.image = element
                wxSelection.selectedList.push({ kind: "image", element })
                continue
            }

            // table
            if (element instanceof HTMLTableElement) {
                wxSelection.table = element
                wxSelection.selectedList.push({ kind: "table", element })
                continue
            }

            // row
            if (element instanceof HTMLTableRowElement) {
                wxSelection.tableRow = element
                wxSelection.table = /** @type {HTMLTableElement|null} */ (element.closest("table"))
                wxSelection.selectedList.push({ kind: "row", element })
                continue
            }

            // cell
            if (element instanceof HTMLTableCellElement) {
                wxSelection.tableCell = element
                wxSelection.tableRow =
                    element.parentElement instanceof HTMLTableRowElement ? element.parentElement : null
                wxSelection.table = /** @type {HTMLTableElement|null} */ (element.closest("table"))
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