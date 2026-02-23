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

/**
 * Div que representa uma Page do Wordex.
 * @typedef {HTMLDivElement & { wxKind: "page" }} wxPageDiv
 */

/**
 * Div que representa uma Section do Wordex (header/body/footer).
 * @typedef {HTMLDivElement & { wxKind: "section" }} wxSectionDiv
 */

/**
 * Div que representa um Paragraph do Wordex.
 * @typedef {HTMLDivElement & { wxKind?: "paragraph" }} wxParagraphDiv
 */

/**
 * Img que representa um Picture do Wordex.
 * @typedef {HTMLDivElement & { wxKind?: "image" }} wxImageImg
 */

/**
 * Table que representa um grid do Wordex.
 * @typedef {HTMLDivElement & { wxKind?: "image" }} wxGridTable
 */

export { };