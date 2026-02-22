// @ts-check
'use strict'

import WordexConfig from './WordexConfig.mjs'

export default class WordexFormat {

  static bold() { return WordexConfig.exec('bold') }
  static italic() { return WordexConfig.exec('italic') }
  static underline() { return WordexConfig.exec('underline') }
  static strikethrough() { return WordexConfig.exec('strikethrough') }
  static strikeThrough() { return WordexConfig.exec('strikeThrough') }
  static superscript() { return WordexConfig.exec('superscript') }
  static subscript() { return WordexConfig.exec('subscript') }

  static alignLeft() { return WordexConfig.exec('justifyLeft') }
  static alignCenter() { return WordexConfig.exec('justifyCenter') }
  static alignRight() { return WordexConfig.exec('justifyRight') }
  static justify() { return WordexConfig.exec('justifyFull') }

  
  /** @param {string} name */ static setFontFamily(name) { return name ? WordexConfig.exec('fontName', name) : false }
  /** @param {string} size */ static setFontSize(size) { return size ? WordexConfig.exec('fontSize', size) : false }
  /** @param {string} hex */ static setFontColor(hex) { return hex ? WordexConfig.exec('foreColor', hex) : false }
}
