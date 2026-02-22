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
 * Div que representa uma Section do Wordex (header/body/footer).
 * @typedef {HTMLDivElement & { __wxKind: "section" }} WordexSectionDiv
 */

/**
 * Div que representa uma Page do Wordex.
 * @typedef {HTMLDivElement & { __wxKind: "page" }} WordexPageDiv
 */

/**
 * Div comum, não estruturante.
 * @typedef {HTMLDivElement & { __wxKind?: "plain" }} WordexPlainDiv
 */

export { };