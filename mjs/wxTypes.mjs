/**
 * Tipo que representa seleções em selects no Toolbar.
 * @typedef {{
 *   value: string,
 *   text: string,
 *   width?: string,
 *   height?: string,
 *   selected?: boolean
 * }} wxItem
 */

/** @typedef {DOMStringMap & { wxKind: "page" }} wxPageData */
/** @typedef {DOMStringMap & { wxKind: "section", wxSector: "header"|"body"|"footer" }} wxSectionData */
/** @typedef {DOMStringMap & { wxKind: "section", wxSector: "header" }} wxSectionHeaderData */
/** @typedef {DOMStringMap & { wxKind: "section", wxSector: "body" }} wxSectionBodyData */
/** @typedef {DOMStringMap & { wxKind: "section", wxSector: "footer" }} wxSectionFooterData */
/** @typedef {DOMStringMap & { wxKind: "paragraph" }} wxParagraphData */
/** @typedef {DOMStringMap & { wxKind: "image" }} wxImageData */
/** @typedef {DOMStringMap & { wxKind: "table" }} wxTableData */

/** @typedef {DOMStringMap & { wxKind: "table", wxRole: "row" }} wxTableRowData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "header", wxRole: "row" }} wxTableHeadRowData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "body", wxRole: "row" }} wxTableBodyRowData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "footer", wxRole: "row" }} wxTableFootRowData */

/** @typedef {DOMStringMap & { wxKind: "table", wxRole: "cell" }} wxTableCellData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "header", wxRole: "cell" }} wxTableHeadCellData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "body", wxRole: "cell" }} wxTableBodyCellData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "footer", wxRole: "cell" }} wxTableFootCellData */

/** @typedef {DOMStringMap & { wxKind: "table", wxRole: "col" }} wxTableColData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "header", wxRole: "col" }} wxTableHeadColData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "body", wxRole: "col" }} wxTableBodyColData */
/** @typedef {DOMStringMap & { wxKind: "table", wxSector: "footer", wxRole: "col" }} wxTableFootColData */

/**
 * @typedef {HTMLDivElement & { dataset: wxPageData }} wxPage
 */

/**
 * @typedef {HTMLDivElement & { dataset: wxSectionData }} wxSection
 */

/**
 * @typedef {HTMLDivElement & { dataset: wxSectionHeaderData }} wxSectionHeader
 */

/**
 * @typedef {HTMLDivElement & { dataset: wxSectionBodyData }} wxSectionBody
 */

/**
 * @typedef {HTMLDivElement & { dataset: wxSectionFooterData }} wxSectionFooter
 */

/**
 * @typedef {HTMLDivElement & { dataset: wxParagraphData }} wxParagraph
 */

/**
 * @typedef {HTMLImageElement & { dataset: wxImageData }} wxImage
 */

/**
 * @typedef {HTMLTableElement & { dataset: wxTableData }} wxTable
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wxTableRowData }} wxTableRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wxTableHeadRowData }} wxTableHeadRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wxTableBodyRowData }} wxTableBodyRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wxTableFootRowData }} wxTableFootRow
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wxTableCellData }} wxTableCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wxTableHeadCellData }} wxTableHeadCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wxTableBodyCellData }} wxTableBodyCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wxTableFootCellData }} wxTableFootCell
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wxTableColData }} wxTableCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wxTableHeadColData }} wxTableHeadCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wxTableBodyColData }} wxTableBodyCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wxTableFootColData }} wxTableFootCol
 */

export { };