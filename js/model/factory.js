"use strict";

function createMargin(top = 0, bottom = 0) {
      return {
        top: Math.max(0, Math.round(Number(top) || 0)),
        bottom: Math.max(0, Math.round(Number(bottom) || 0))
      };
    }

    function getDefaultMarginForKind(kind) {
      if (kind === KINDS.PARAGRAPH) return createMargin(7, 7);
      return createMargin(0, 0);
    }

    function normalizeMargin(margin, kind) {
      const fallback = getDefaultMarginForKind(kind);
      const source = margin && typeof margin === "object" ? margin : fallback;
      return createMargin(
        source.top ?? fallback.top,
        source.bottom ?? fallback.bottom
      );
    }

    function renderMarginInlineStyle(margin, kind) {
      if (!margin || typeof margin !== "object") return "";
      const value = normalizeMargin(margin, kind);
      return `margin:${value.top}px 0 ${value.bottom}px 0`;
    }



function createBorderSide(color = "#000000", width = "1px", style = "solid") {
      return {
        color: String(color || "#000000"),
        width: String(width || "1px"),
        style: String(style || "solid")
      };
    }

    function createEmptyBorder(radius = "4px") {
      return {
        top: null,
        right: null,
        bottom: null,
        left: null,
        radius: String(radius || "4px")
      };
    }

    function normalizeBorder(border) {
      const source = border && typeof border === "object" ? border : {};
      const normalized = createEmptyBorder(source.radius || "4px");
      ["top", "right", "bottom", "left"].forEach(side => {
        const value = source[side];
        if (value && typeof value === "object" && value.style && value.style !== "none") {
          normalized[side] = createBorderSide(value.color, value.width, value.style);
        }
      });
      return normalized;
    }

    function renderBorderInlineStyle(border) {
      if (!border || typeof border !== "object") return "";
      const value = normalizeBorder(border);
      const styles = [];
      ["top", "right", "bottom", "left"].forEach(side => {
        const item = value[side];
        if (!item) return;
        styles.push(`border-${side}:${item.width} ${item.style} ${item.color}`);
      });
      if (styles.length && value.radius) styles.push(`border-radius:${value.radius}`);
      return styles.join(";");
    }

    function createSubparagraph() {
      return {
        id: nextId("sp"),
        kind: KINDS.SUBPARAGRAPH,
        contentKind: CONTENT_KIND.EMPTY,
        textHtml: "",
        runs: [],
        object: null,
        textboxes: [],
        inlineTextboxes: [],
        inlineLists: [],
        inlineLines: [],
        width: null,
        height: null,
        textAlign: "left",
        border: createEmptyBorder()
      };
    }

    function createParagraph() {
      return {
        id: nextId("p"),
        kind: KINDS.PARAGRAPH,
        margin: createMargin(7, 7),
        subparagraphs: [createSubparagraph()]
      };
    }

    function createSection(sectionKind) {
      return {
        id: sectionKind.toLowerCase(),
        kind: KINDS.SECTION,
        sectionKind,
        paragraphs: [createParagraph()]
      };
    }

    function createInitialTemplate() {
      idCounters = Object.create(null);
      return {
        id: "template001",
        kind: KINDS.TEMPLATE,
        title: "Wordex New 002",
        // Formato/orientação não ficam mais engessados no modelo.
        // São inicializados a partir dos combos da toolbar.
        paperFormat: null,
        pageOrientation: null,
        textDefaults: null,
        watermark: null,
        sections: [
          createSection(SECTION_KIND.HEADER),
          createSection(SECTION_KIND.BODY),
          createSection(SECTION_KIND.FOOTER)
        ]
      };
    }
