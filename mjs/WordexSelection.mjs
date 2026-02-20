// @ts-check
'use strict'

import Config from './WordexConfig.mjs'

export default class Selection {

      /**
       * @param {HTMLElement} p
       * @param {"start"|"end"} where
       * @returns {boolean}
       */
      static activateParagraph(p, where = "end") {
        if (!p) return false
        if (!p.firstChild) p.appendChild(document.createElement("br"))
    
        const r = document.createRange()
        r.selectNodeContents(p)
        r.collapse(where === "start")
    
        const sel = window.getSelection()
        if (!sel) return false
        sel.removeAllRanges()
        sel.addRange(r)
        Config.saveSelection()
        return true
      }
    
}

