// @ts-check
"use strict"

/**
 * Alignment: aplica alinhamento em:
 * - elementos flutuáveis (img, table): left/right => float (wrap), center => block centralizado
 * - parágrafo (div): move a "caixa" (margin auto) + textAlign (opcional)
 */
export default class Alignment {
    /**
     * Alinha elemento "flutuável": left/right => wrap (float), center => centralizado (block).
     * @param {HTMLElement} el
     * @param {"left"|"center"|"right"} dir
     */
    static floatable(el, dir) {
        // limpa estado anterior
        el.style.float = ""
        el.style.clear = ""
        el.style.display = ""
        el.style.marginLeft = ""
        el.style.marginRight = ""
        el.style.marginTop = ""
        el.style.marginBottom = ""

        // evita “espaço” artificial ao inserir no meio: margem lateral default = 0
        // e só adiciona margem quando float (pra dar respiro do texto)
        if (dir === "left") {
            el.style.float = "left"
            el.style.display = "table"
            el.style.margin = "4px 10px 6px 0"
            return
        }

        if (dir === "right") {
            el.style.float = "right"
            el.style.display = "table"
            el.style.margin = "4px 0 6px 10px"
            return
        }

        // center
        el.style.float = "none"
        el.style.display = "table"
        el.style.margin = "6px auto"
        el.style.clear = "both"
    }

    /**
     * Alinha a "caixa" do parágrafo (quando ele foi redimensionado e ficou menor que a página).
     * Opcionalmente também alinha o conteúdo (textAlign).
     * @param {HTMLDivElement} p
     * @param {"left"|"center"|"right"} dir
     * @param {boolean} alignTextAlso
     */
    static paragraphBox(p, dir, alignTextAlso = true) {
        // move o bloco
        if (dir === "left") {
            p.style.marginLeft = "0"
            p.style.marginRight = "auto"
        } else if (dir === "right") {
            p.style.marginLeft = "auto"
            p.style.marginRight = "0"
        } else {
            p.style.marginLeft = "auto"
            p.style.marginRight = "auto"
        }

        // e (se quiser) alinha o conteúdo também
        if (alignTextAlso) p.style.textAlign = dir
    }
}
