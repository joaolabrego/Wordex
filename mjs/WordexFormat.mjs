// @ts-check
'use strict'

import Config from './WordexConfig.mjs'

export default class Format {

  static bold() { return Config.exec('bold') }
  static italic() { return Config.exec('italic') }
  static underline() { return Config.exec('underline') }
  static strikethrough() { return Config.exec('strikethrough') }
  static strikeThrough() { return Config.exec('strikeThrough') }
  static superscript() { return Config.exec('superscript') }
  static subscript() { return Config.exec('subscript') }

  static alignLeft() { return Config.exec('justifyLeft') }
  static alignCenter() { return Config.exec('justifyCenter') }
  static alignRight() { return Config.exec('justifyRight') }
  static justify() { return Config.exec('justifyFull') }

  
  /** @param {string} name */ static setFontFamily(name) { return name ? Config.exec('fontName', name) : false }
  /** @param {string} size */ static setFontSize(size) { return size ? Config.exec('fontSize', size) : false }
  /** @param {string} hex */ static setFontColor(hex) { return hex ? Config.exec('foreColor', hex) : false }
}
