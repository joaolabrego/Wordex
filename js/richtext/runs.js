"use strict";

const WordexRuns = (() => {
  const CARET_MARKER = "\u200b";

  function normalizeCssColor(value, fallback = "#000000") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;

    // Preserve hex colors as the canonical value used by toolbar/defaults.
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw.toLowerCase();

    // Browser may serialize colors as rgb(...). Keep them valid instead of guessing.
    return raw;
  }

  function normalizeFontSize(value, fallback = "12px") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    const number = Number(raw.replace(/px$/i, ""));
    if (Number.isFinite(number) && number > 0) return `${Math.round(number)}px`;
    return raw;
  }

  function normalizeFontFamily(value, fallback = "Arial") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    return raw.replace(/^['"]|['"]$/g, "");
  }

  function normalizeRunStyle(style = {}, defaults = {}) {
    return {
      fontFamily: normalizeFontFamily(style.fontFamily, defaults.fontFamily || "Arial"),
      fontSize: normalizeFontSize(style.fontSize, defaults.fontSize || "12px"),
      color: normalizeCssColor(style.color, defaults.color || "#000000"),
      bold: Boolean(style.bold),
      italic: Boolean(style.italic),
      underline: Boolean(style.underline)
    };
  }

  function createRun(text = "", style = {}, defaults = {}) {
    return {
      text: String(text ?? "").replaceAll(CARET_MARKER, ""),
      ...normalizeRunStyle(style, defaults)
    };
  }

  function runStyleSignature(run) {
    return [
      run.fontFamily || "",
      run.fontSize || "",
      run.color || "",
      run.bold ? "1" : "0",
      run.italic ? "1" : "0",
      run.underline ? "1" : "0"
    ].join("|");
  }

  function mergeRuns(runs = []) {
    const result = [];

    runs.forEach(rawRun => {
      const run = createRun(rawRun.text, rawRun, rawRun);
      if (!run.text) return;

      const previous = result[result.length - 1];
      if (previous && runStyleSignature(previous) === runStyleSignature(run)) {
        previous.text += run.text;
        return;
      }

      result.push(run);
    });

    return result;
  }

  function styleFromElement(element, inherited) {
    const style = { ...inherited };
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return style;

    const tag = element.tagName;
    const inline = element.style || {};

    if (tag === "B" || tag === "STRONG") style.bold = true;
    if (tag === "I" || tag === "EM") style.italic = true;
    if (tag === "U") style.underline = true;

    if (tag === "FONT") {
      const face = element.getAttribute("face");
      const color = element.getAttribute("color");
      const size = element.getAttribute("size");
      if (face) style.fontFamily = face;
      if (color) style.color = color;
      if (size && /^\d+$/.test(size)) {
        const legacySizes = { 1: 8, 2: 10, 3: 12, 4: 14, 5: 18, 6: 24, 7: 32 };
        style.fontSize = `${legacySizes[Number(size)] || 12}px`;
      }
    }

    if (inline.fontFamily) style.fontFamily = inline.fontFamily;
    if (inline.fontSize) style.fontSize = inline.fontSize;
    if (inline.color) style.color = inline.color;

    const fontWeight = String(inline.fontWeight || "").toLowerCase();
    if (fontWeight === "bold" || Number(fontWeight) >= 600) style.bold = true;
    if (fontWeight === "normal" || fontWeight === "400") style.bold = false;

    const fontStyle = String(inline.fontStyle || "").toLowerCase();
    if (fontStyle === "italic" || fontStyle === "oblique") style.italic = true;
    if (fontStyle === "normal") style.italic = false;

    const textDecoration = `${inline.textDecoration || ""} ${inline.textDecorationLine || ""}`.toLowerCase();
    if (textDecoration.includes("underline")) style.underline = true;
    if (inline.textDecorationLine === "none" || inline.textDecoration === "none") style.underline = false;

    return style;
  }

  function htmlToRuns(html = "", defaults = {}) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = String(html ?? "");
    const baseStyle = normalizeRunStyle(defaults, defaults);
    const runs = [];

    function visit(node, style) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = String(node.nodeValue || "").replaceAll(CARET_MARKER, "");
        if (text) runs.push(createRun(text, style, baseStyle));
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const nextStyle = styleFromElement(node, style);

      if (node.tagName === "BR") {
        runs.push(createRun("\n", nextStyle, baseStyle));
        return;
      }

      Array.from(node.childNodes).forEach(child => visit(child, nextStyle));
    }

    Array.from(wrapper.childNodes).forEach(child => visit(child, baseStyle));
    return mergeRuns(runs);
  }

  function escapeRunText(text) {
    return escapeHtml(String(text ?? "")).replaceAll("\n", "<br>");
  }

  function runToStyle(run) {
    const style = [];
    if (run.fontFamily) style.push(`font-family:${run.fontFamily}`);
    if (run.fontSize) style.push(`font-size:${run.fontSize}`);
    if (run.color) style.push(`color:${run.color}`);
    if (run.bold) style.push("font-weight:700");
    if (run.italic) style.push("font-style:italic");
    if (run.underline) style.push("text-decoration-line:underline");
    return style.join(";");
  }

  function runsToHtml(runs = []) {
    return mergeRuns(runs).map(run => {
      const style = runToStyle(run);
      return `<span${style ? ` style="${escapeHtml(style)}"` : ""}>${escapeRunText(run.text)}</span>`;
    }).join("");
  }

  return {
    createRun,
    htmlToRuns,
    runsToHtml,
    mergeRuns,
    normalizeRunStyle
  };
})();

window.WordexRuns = WordexRuns;
