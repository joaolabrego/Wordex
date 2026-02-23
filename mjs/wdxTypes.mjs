/**
 * Tipo que representa seleções em selects no Toolbar.
 * @typedef {{
 *   value: string,
 *   text: string,
 *   width?: string,
 *   height?: string,
 *   selected?: boolean
 * }} wdxItem
 */

/** @typedef {DOMStringMap & { wdxKind: "page" }} wdxPageData */
/** @typedef {DOMStringMap & { wdxKind: "section", wdxSector: "header"|"body"|"footer" }} wdxSectionData */
/** @typedef {DOMStringMap & { wdxKind: "section", wdxSector: "header" }} wdxSectionHeaderData */
/** @typedef {DOMStringMap & { wdxKind: "section", wdxSector: "body" }} wdxSectionBodyData */
/** @typedef {DOMStringMap & { wdxKind: "section", wdxSector: "footer" }} wdxSectionFooterData */
/** @typedef {DOMStringMap & { wdxKind: "paragraph" }} wdxParagraphData */
/** @typedef {DOMStringMap & { wdxKind: "image" }} wdxImageData */
/** @typedef {DOMStringMap & { wdxKind: "table" }} wdxTableData */

/** @typedef {DOMStringMap & { wdxKind: "table", wdxRole: "row" }} wdxTableRowData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "header", wdxRole: "row" }} wdxTableHeadRowData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "body", wdxRole: "row" }} wdxTableBodyRowData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "footer", wdxRole: "row" }} wdxTableFootRowData */

/** @typedef {DOMStringMap & { wdxKind: "table", wdxRole: "cell" }} wdxTableCellData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "header", wdxRole: "cell" }} wdxTableHeadCellData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "body", wdxRole: "cell" }} wdxTableBodyCellData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "footer", wdxRole: "cell" }} wdxTableFootCellData */

/** @typedef {DOMStringMap & { wdxKind: "table", wdxRole: "col" }} wdxTableColData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "header", wdxRole: "col" }} wdxTableHeadColData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "body", wdxRole: "col" }} wdxTableBodyColData */
/** @typedef {DOMStringMap & { wdxKind: "table", wdxSector: "footer", wdxRole: "col" }} wdxTableFootColData */

/**
 * @typedef {HTMLDivElement & { dataset: wdxPageData }} wdxPage
 */

/**
 * @typedef {HTMLDivElement & { dataset: wdxSectionData }} wdxSection
 */

/**
 * @typedef {HTMLDivElement & { dataset: wdxSectionHeaderData }} wdxSectionHeader
 */

/**
 * @typedef {HTMLDivElement & { dataset: wdxSectionBodyData }} wdxSectionBody
 */

/**
 * @typedef {HTMLDivElement & { dataset: wdxSectionFooterData }} wdxSectionFooter
 */

/**
 * @typedef {HTMLDivElement & { dataset: wdxParagraphData }} wdxParagraph
 */

/**
 * @typedef {HTMLImageElement & { dataset: wdxImageData }} wdxImage
 */

/**
 * @typedef {HTMLTableElement & { dataset: wdxTableData }} wdxTable
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wdxTableRowData }} wdxTableRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wdxTableHeadRowData }} wdxTableHeadRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wdxTableBodyRowData }} wdxTableBodyRow
 */

/**
 * @typedef {HTMLTableRowElement & { dataset: wdxTableFootRowData }} wdxTableFootRow
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wdxTableCellData }} wdxTableCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wdxTableHeadCellData }} wdxTableHeadCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wdxTableBodyCellData }} wdxTableBodyCell
 */

/**
 * @typedef {HTMLTableCellElement & { dataset: wdxTableFootCellData }} wdxTableFootCell
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wdxTableColData }} wdxTableCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wdxTableHeadColData }} wdxTableHeadCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wdxTableBodyColData }} wdxTableBodyCol
 */

/**
 * @typedef {HTMLTableColElement & { dataset: wdxTableFootColData }} wdxTableFootCol
 */

export { };