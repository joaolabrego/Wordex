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
      const normalized = createMargin(
        source.top ?? fallback.top,
        source.bottom ?? fallback.bottom
      );
      ["left", "right"].forEach(side => {
        if (source[side] == null || source[side] === "") return;
        const amount = Math.round(Number(source[side]));
        if (Number.isFinite(amount)) normalized[side] = Math.max(0, amount);
      });
      return normalized;
    }

    function renderMarginInlineStyle(margin, kind) {
      if (!margin || typeof margin !== "object") return "";
      const value = normalizeMargin(margin, kind);
      if (value.left == null && value.right == null) {
        return `margin:${value.top}px 0 ${value.bottom}px 0`;
      }
      return ["top", "right", "bottom", "left"].flatMap(side => (
        value[side] == null ? [] : [`margin-${side}:${value[side]}px`]
      )).join(";");
    }

    function applyParagraphMarginAction(margin, action, px) {
      const current = normalizeMargin(margin, KINDS.PARAGRAPH);
      if (action === "none") return createMargin(7, 7);
      const amount = Math.max(0, Math.round(Number(px) || 0));
      const next = { top: current.top, bottom: current.bottom };
      if (current.left != null) next.left = current.left;
      if (current.right != null) next.right = current.right;
      const sides = action === "all" ? ["top", "right", "bottom", "left"] : [action];
      sides.forEach(side => {
        if (["top", "right", "bottom", "left"].includes(side)) next[side] = amount;
      });
      return next;
    }

    function readMarginSide(edgesList, kind, side) {
      if (!["top", "right", "bottom", "left"].includes(side)) return "";
      const items = Array.isArray(edgesList) ? edgesList : [edgesList];
      const values = items.map(edges => {
        if (kind === KINDS.PARAGRAPH) {
          const margin = normalizeMargin(edges, KINDS.PARAGRAPH);
          if (side === "left" || side === "right") return margin[side] == null ? 0 : margin[side];
          return margin[side];
        }
        const margin = normalizeBoxEdges(edges);
        return margin[side] == null ? 0 : margin[side];
      });
      if (!values.length || values.some(value => value !== values[0])) return "";
      return String(values[0]);
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

    function createEmptyBoxEdges() {
      return { top: null, right: null, bottom: null, left: null };
    }

    function normalizeBoxEdges(edges) {
      const source = edges && typeof edges === "object" ? edges : {};
      const normalized = createEmptyBoxEdges();
      ["top", "right", "bottom", "left"].forEach(side => {
        if (source[side] == null || source[side] === "") return;
        const value = Math.round(Number(source[side]));
        if (Number.isFinite(value)) normalized[side] = Math.max(0, value);
      });
      return normalized;
    }

    function renderTextStyleInlineStyle(textStyle) {
      if (!textStyle || typeof textStyle !== "object") return "";
      const styles = [];
      if (textStyle.fontFamily) styles.push(`font-family:${textStyle.fontFamily}`);
      if (textStyle.fontSize) styles.push(`font-size:${textStyle.fontSize}`);
      if (textStyle.color) styles.push(`color:${textStyle.color}`);
      return styles.join(";");
    }

    function renderBoxEdgesInlineStyle(property, edges) {
      if (!edges || typeof edges !== "object") return "";
      const value = normalizeBoxEdges(edges);
      return ["top", "right", "bottom", "left"].flatMap(side => (
        value[side] == null ? [] : [`${property}-${side}:${value[side]}px`]
      )).join(";");
    }

    function applyBoxEdgesAction(edges, action, px) {
      if (action === "none") return createEmptyBoxEdges();
      const next = normalizeBoxEdges(edges);
      const amount = Math.max(0, Math.round(Number(px) || 0));
      const sides = action === "all" ? ["top", "right", "bottom", "left"] : [action];
      sides.forEach(side => {
        if (["top", "right", "bottom", "left"].includes(side)) next[side] = amount;
      });
      return next;
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
        textStyle: null,
        border: createEmptyBorder(),
        margin: createEmptyBoxEdges(),
        padding: createEmptyBoxEdges()
      };
    }

    function createParagraph() {
      return {
        id: nextId("p"),
        kind: KINDS.PARAGRAPH,
        margin: createMargin(7, 7),
        padding: createEmptyBoxEdges(),
        subparagraphs: [createSubparagraph()]
      };
    }

    function createSection(sectionKind) {
      return {
        id: sectionKind.toLowerCase(),
        kind: KINDS.SECTION,
        sectionKind,
        margin: createEmptyBoxEdges(),
        padding: createEmptyBoxEdges(),
        textStyle: null,
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
