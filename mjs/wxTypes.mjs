/**
 * Tipo que representa seleções em selects no Toolbar.
 * @typedef {{
 *   value: string,
 *   text: string,
 *   width?: string,
 *   height?: string,
 *   selected?: boolean
 * }} Item
 */

/**
 * @typedef {{
 *   Range: Range|null,
 *   Paragraph: HTMLDivElement|null,
 *   Image: HTMLImageElement|null,
 *   Table: {
 *     Table: HTMLTableElement|null,
 *     TableRow: HTMLTableRowElement|null,
 *     TableCol: number|null,
 *     TableCell: HTMLTableCellElement|null,
 *   }
 * }} WordexSelectionTargets
 */

/**
 * Div que representa uma Page do Wordex.
 * @typedef {HTMLDivElement & { __wxKind: "page" }} WordexPageDiv
 */

/**
 * Div que representa uma Section do Wordex (header/body/footer).
 * @typedef {HTMLDivElement & { __wxKind: "section" }} WordexSectionDiv
 */

/**
 * Div que representa um Paragraph do Wordex.
 * @typedef {HTMLDivElement & { __wxKind?: "paragraph" }} WordexParagraphDiv
 */

export { };