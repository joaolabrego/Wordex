// @ts-check
"use strict"

import WordexImage from "./WordexImage.mjs"
import WordexPage from "./WordexPage.mjs"
import WordexRange from "./WordexRange.mjs"
import WordexSection from "./WordexSection.mjs"
import WordexTable from "./WordexTable.mjs"

/**
 * WordexAlignment: aplica alinhamento em:
 * - elementos flutuáveis (img, table): left/right => float (wrap), center => block centralizado
 * - parágrafo (div): move a "caixa" (margin auto) + textAlign (opcional)
 */
export default class WordexAlignment {

    /** @param {"left"|"center"|"right"|"justify"} dir */
    static align(dir) {
        const target = WordexPage.selectedTarget()

        // 1) imagem: usa alvo focado
        if (target.kind === "image") {
            WordexImage.align(dir)
            return true
        }

        // 2) tabela (célula/linha/col/tabela inteira)
        if (target.kind === "cell" || target.kind === "row" || target.kind === "col" || target.kind === "table") {
            if (dir === "left")
                WordexTable.alignLeft()
            else if (dir === "right")
                WordexTable.alignRight()
            else
                WordexTable.alignCenter()

            return true
        }

        // 3) parágrafo/texto: execCommand
        if (dir === "left")
            WordexRange.alignLeft()
        else if (dir === "right")
            WordexRange.alignRight()
        else if (dir === "center")
            WordexRange.alignCenter()
        else
            WordexRange.justify()
        
        return true
    }


    /**
     * Alinha elemento "flutuável": left/right => wrap (float), center => centralizado (block).
     * @param {HTMLElement} el
     * @param {"left"|"center"|"right"|"justify"} dir
     */
    static wrapAlign(el, dir) {
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
     * @param {"left"|"center"|"right"|"justify"} dir
     * @param {boolean} alignTextAlso
     */
    static paragraphBox(p, dir, alignTextAlso = true) {
        // caixa: só faz sentido para left/center/right
        if (dir === "left") {
            p.style.marginLeft = "0"
            p.style.marginRight = "auto"
        } else if (dir === "right") {
            p.style.marginLeft = "auto"
            p.style.marginRight = "0"
        } else if (dir === "center") {
            p.style.marginLeft = "auto"
            p.style.marginRight = "auto"
        }
        // texto
        if (alignTextAlso) {
            p.style.textAlign = (dir === "justify") ? "justify" : dir
        }
    }
}
