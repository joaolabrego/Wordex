"use strict";

const WordexRichText = (() => {
  const CARET_MARKER = "\u200b";
  const STYLE_PROPERTIES = [
    "fontFamily",
    "fontSize",
    "color",
    "fontWeight",
    "fontStyle",
    "textDecorationLine",
    "textDecoration"
  ];

  function isEditable(element) {
    return Boolean(element && element.getAttribute?.("contenteditable") === "true");
  }

  function getSelectionRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    return { selection, range: selection.getRangeAt(0) };
  }

  function getEditableFromRange(range) {
    if (!range) return null;
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    return element?.closest?.("[contenteditable='true']") || null;
  }

  function focusEditable(editable) {
    if (isEditable(editable)) editable.focus();
  }

  function placeCaretInside(node, offset) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function placeCaretAfter(node) {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function selectNodeContents(node) {
    const selection = window.getSelection();
    if (!selection || !node || !node.isConnected) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function applyStylesToSpan(span, styles) {
    Object.entries(styles || {}).forEach(([property, value]) => {
      if (value === null || value === undefined || value === "") return;
      span.style[property] = String(value);
    });
  }

  function applyStylesDeep(root, styles) {
    applyStylesToSpan(root, styles);

    // When selected text already contains formatted spans, an outer wrapper
    // is not enough because inner spans keep winning in CSS inheritance.
    // Apply the selected style to descendant spans too, so the whole selected
    // range receives the new font/color/size instead of only plain text nodes.
    root.querySelectorAll?.("span,font,b,strong,i,em,u").forEach(element => {
      const target = element.tagName === "SPAN" ? element : cleanLegacyElement(element);
      if (target?.tagName === "SPAN") applyStylesToSpan(target, styles);
    });
  }

  function wrapRange(range, styles) {
    const fragment = range.extractContents();
    const span = document.createElement("span");
    span.appendChild(fragment);
    applyStylesDeep(span, styles);
    range.insertNode(span);
    selectNodeContents(span);
    return span;
  }

  function findTypingSpanAtRange(range) {
    const node = range.startContainer;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const span = element?.closest?.("span[data-wordex-typing-style='true']");
    if (!span) return null;

    // Só reaproveita o span se ele ainda for apenas o marcador invisível.
    // Se já houver texto real nele, uma nova mudança de fonte/tamanho/cor
    // deve valer apenas a partir do cursor, sem alterar o texto anterior.
    return span.textContent === CARET_MARKER ? span : null;
  }

  function insertTypingSpan(range, styles) {
    const existingTypingSpan = findTypingSpanAtRange(range);
    if (existingTypingSpan) {
      STYLE_PROPERTIES.forEach(property => existingTypingSpan.style[property] = "");
      applyStylesToSpan(existingTypingSpan, styles);
      placeCaretInside(existingTypingSpan.firstChild, existingTypingSpan.firstChild.nodeValue.length);
      return existingTypingSpan;
    }

    const span = document.createElement("span");
    span.dataset.wordexTypingStyle = "true";
    applyStylesToSpan(span, styles);
    span.appendChild(document.createTextNode(CARET_MARKER));
    range.insertNode(span);
    placeCaretInside(span.firstChild, 1);
    return span;
  }

  function applyInlineStyle(editable, styles) {
    if (!isEditable(editable)) return false;

    focusEditable(editable);
    const selected = getSelectionRange();
    if (!selected) return false;

    const { selection, range } = selected;
    const rangeEditable = getEditableFromRange(range);
    if (rangeEditable !== editable && !editable.contains(rangeEditable)) return false;

    if (range.collapsed) {
      // Mantem o marcador invisivel no DOM para que os proximos caracteres
      // sejam digitados dentro do span com a formatacao escolhida. O marcador
      // e removido apenas na serializacao/normalizacao do HTML salvo.
      insertTypingSpan(range, styles);
      return true;
    }

    const wrappedSpan = wrapRange(range, styles);
    normalizeEditable(editable);
    selectNodeContents(wrappedSpan);
    return true;
  }

  function applyInlineCommand(editable, command, value = null) {
    const styles = Object.create(null);

    if (command === "fontName") styles.fontFamily = value;
    else if (command === "fontSize") styles.fontSize = `${Math.max(1, Math.round(Number(value) || 12))}px`;
    else if (command === "foreColor") styles.color = value;
    else if (command === "bold") styles.fontWeight = "700";
    else if (command === "italic") styles.fontStyle = "italic";
    else if (command === "underline") styles.textDecorationLine = "underline";
    else return false;

    return applyInlineStyle(editable, styles);
  }



  function insertTextWithStyle(editable, text, styles) {
    if (!isEditable(editable)) return false;
    if (text === null || text === undefined || text === "") return false;

    focusEditable(editable);
    const selected = getSelectionRange();
    if (!selected) return false;

    const { range } = selected;
    const rangeEditable = getEditableFromRange(range);
    if (rangeEditable !== editable && !editable.contains(rangeEditable)) return false;

    if (!range.collapsed) range.deleteContents();

    const span = document.createElement("span");
    applyStylesToSpan(span, styles || {});
    const textNode = document.createTextNode(String(text));
    span.appendChild(textNode);
    range.insertNode(span);
    placeCaretInside(textNode, textNode.nodeValue.length);
    return true;
  }

  function selectTextRangeByOffsets(root, startOffset, endOffset) {
    const selection = window.getSelection();
    if (!selection) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let index = 0;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.nodeValue.length;

      if (!startNode && startOffset <= index + length) {
        startNode = node;
        startNodeOffset = Math.max(0, Math.min(length, startOffset - index));
      }

      if (!endNode && endOffset <= index + length) {
        endNode = node;
        endNodeOffset = Math.max(0, Math.min(length, endOffset - index));
        break;
      }

      index += length;
    }

    if (!startNode || !endNode) return;

    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function clearSelectionFormatting(editable) {
    if (!isEditable(editable)) return false;

    focusEditable(editable);
    const selected = getSelectionRange();
    if (!selected || selected.range.collapsed) return false;

    const { range } = selected;
    const rangeEditable = getEditableFromRange(range);
    if (rangeEditable !== editable && !editable.contains(rangeEditable)) return false;

    if (!window.WordexRuns?.htmlToRuns || !window.WordexRuns?.runsToHtml) {
      const wrappedSpan = wrapRange(range, {
        fontWeight: "400",
        fontStyle: "normal",
        textDecorationLine: "none",
        textDecoration: "none"
      });

      normalizeEditable(editable);
      selectNodeContents(wrappedSpan);
      return true;
    }

    const startMarker = "\uE000";
    const endMarker = "\uE001";

    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(document.createTextNode(endMarker));

    const startRange = range.cloneRange();
    startRange.collapse(true);
    startRange.insertNode(document.createTextNode(startMarker));

    const sourceRuns = window.WordexRuns.htmlToRuns(editable.innerHTML, {});
    const resultRuns = [];
    let insideSelection = false;
    let outputOffset = 0;
    let selectionStart = 0;
    let selectionEnd = 0;

    sourceRuns.forEach(run => {
      let buffer = "";
      let bufferInside = insideSelection;

      const flush = () => {
        if (!buffer) return;
        const nextRun = { ...run, text: buffer };
        if (bufferInside) {
          nextRun.bold = false;
          nextRun.italic = false;
          nextRun.underline = false;
        }
        resultRuns.push(nextRun);
        outputOffset += buffer.length;
        buffer = "";
      };

      for (const char of String(run.text || "")) {
        if (char === startMarker) {
          flush();
          insideSelection = true;
          bufferInside = true;
          selectionStart = outputOffset;
          continue;
        }

        if (char === endMarker) {
          flush();
          insideSelection = false;
          bufferInside = false;
          selectionEnd = outputOffset;
          continue;
        }

        if (buffer && bufferInside !== insideSelection) flush();
        bufferInside = insideSelection;
        buffer += char;
      }

      flush();
    });

    editable.innerHTML = window.WordexRuns.runsToHtml(resultRuns);
    normalizeEditable(editable);
    selectTextRangeByOffsets(editable, selectionStart, selectionEnd);
    return true;
  }

  function cleanLegacyElement(element) {
    const tag = element.tagName;

    if (tag === "FONT") {
      const span = document.createElement("span");
      const face = element.getAttribute("face");
      const color = element.getAttribute("color");
      if (face) span.style.fontFamily = face;
      if (color) span.style.color = color;
      while (element.firstChild) span.appendChild(element.firstChild);
      element.replaceWith(span);
      return span;
    }

    if (tag === "B" || tag === "STRONG" || tag === "I" || tag === "EM" || tag === "U") {
      const span = document.createElement("span");
      if (tag === "B" || tag === "STRONG") span.style.fontWeight = "700";
      if (tag === "I" || tag === "EM") span.style.fontStyle = "italic";
      if (tag === "U") span.style.textDecorationLine = "underline";
      while (element.firstChild) span.appendChild(element.firstChild);
      element.replaceWith(span);
      return span;
    }

    return element;
  }

  function isEmptyTypingSpan(span) {
    return span?.dataset?.wordexTypingStyle === "true" && span.textContent === CARET_MARKER;
  }

  function removeCaretMarkers(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach(node => {
      if (node.nodeValue.includes(CARET_MARKER)) {
        node.nodeValue = node.nodeValue.replaceAll(CARET_MARKER, "");
      }
    });
  }

  function styleSignature(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE || element.tagName !== "SPAN") return null;
    return STYLE_PROPERTIES.map(property => `${property}:${element.style[property] || ""}`).join(";");
  }

  function mergeAdjacentSpans(root) {
    let changed = true;
    while (changed) {
      changed = false;
      const spans = Array.from(root.querySelectorAll("span"));

      for (const span of spans) {
        if (!span.isConnected) continue;

        const next = span.nextSibling;
        if (
          next &&
          next.nodeType === Node.ELEMENT_NODE &&
          next.tagName === "SPAN" &&
          styleSignature(span) === styleSignature(next) &&
          !span.dataset.wordexTypingStyle &&
          !next.dataset.wordexTypingStyle
        ) {
          while (next.firstChild) span.appendChild(next.firstChild);
          next.remove();
          changed = true;
        }
      }
    }
  }

  function unwrapEmptyOrPlainSpans(root) {
    Array.from(root.querySelectorAll("span")).forEach(span => {
      if (!span.isConnected) return;
      if (isEmptyTypingSpan(span)) return;
      if (span.dataset?.wordexTypingStyle) delete span.dataset.wordexTypingStyle;

      const hasStyle = STYLE_PROPERTIES.some(property => Boolean(span.style[property]));
      const hasData = Object.keys(span.dataset || {}).some(key => key !== "wordexTypingStyle");

      if (span.textContent === "" && span.children.length === 0) {
        span.remove();
        return;
      }

      if (!hasStyle && !hasData) {
        span.replaceWith(...Array.from(span.childNodes));
      }
    });
  }

  function normalizeEditable(editable) {
    if (!isEditable(editable)) return;

    Array.from(editable.querySelectorAll("font,b,strong,i,em,u")).forEach(cleanLegacyElement);
    removeCaretMarkers(editable);
    unwrapEmptyOrPlainSpans(editable);
    mergeAdjacentSpans(editable);
  }

  function normalizeHtml(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = String(html ?? "");
    normalizeEditableLikeWrapper(wrapper);
    return wrapper.innerHTML;
  }

  function normalizeEditableLikeWrapper(wrapper) {
    Array.from(wrapper.querySelectorAll("font,b,strong,i,em,u")).forEach(cleanLegacyElement);
    removeCaretMarkers(wrapper);
    unwrapEmptyOrPlainSpans(wrapper);
    mergeAdjacentSpans(wrapper);
  }

  return {
    applyInlineCommand,
    applyInlineStyle,
    clearSelectionFormatting,
    insertTextWithStyle,
    normalizeEditable,
    normalizeHtml
  };
})();

window.WordexRichText = WordexRichText;
