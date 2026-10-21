"use strict";

function createTableObject(rows = 2, cols = 3) {
      const safeRows = Math.max(1, Math.round(Number(rows) || 2));
      const safeCols = Math.max(1, Math.round(Number(cols) || 3));
      return {
        id: nextId("tbl"),
        kind: KINDS.TABLE,
        x: 0,
        y: 0,
        rows: safeRows,
        cols: safeCols,
        rowHeights: [],
        colWidths: [],
        rowVisibility: Array.from({ length: safeRows }, () => true),
        rowReportVisibility: Array.from({ length: safeRows }, () => true),
        cellTextAlign: Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => "left")),
        cellBorders: [],
        cellObjects: Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => null)),
        cells: Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => ""))
      };
    }

    function createImageObject(options = {}) {
      return {
        id: nextId("img"),
        kind: KINDS.IMAGE,
        x: 0,
        y: 0,
        label: options.label || "Imagem",
        src: options.src || "",
        fileName: options.fileName || "",
        dataFieldPath: options.dataFieldPath || "",
        dataFieldMacro: options.dataFieldMacro || ""
      };
    }

    function createChartObject(options = {}) {
      const sourceSeries = Array.isArray(options.series) && options.series.length
        ? options.series
        : [{ label: "Série 1", color: "#4472c4", values: [12, 19, 8, 15] }];
      const categories = Array.isArray(options.categories) && options.categories.length
        ? options.categories
        : ["Categoria 1", "Categoria 2", "Categoria 3", "Categoria 4"];
      const palette = ["#4472c4", "#ed7d31", "#70ad47", "#a5a5a5", "#ffc000", "#5b9bd5"];

      return {
        id: options.id || nextId("cht"),
        kind: KINDS.CHART,
        x: Number.isFinite(Number(options.x)) ? Number(options.x) : 0,
        y: Number.isFinite(Number(options.y)) ? Number(options.y) : 0,
        width: Number.isFinite(Number(options.width)) ? Number(options.width) : 480,
        height: Number.isFinite(Number(options.height)) ? Number(options.height) : 300,
        chartType: options.chartType === "hbar" ? "hbar" : "bar",
        title: String(options.title || ""),
        categories: categories.map((category, index) => String(category?.label ?? category ?? `Categoria ${index + 1}`)),
        series: sourceSeries.map((series, seriesIndex) => ({
          label: String(series?.label || `Série ${seriesIndex + 1}`),
          color: /^#[0-9a-f]{6}$/i.test(String(series?.color || "")) ? series.color : palette[seriesIndex % palette.length],
          dataFieldPath: String(series?.dataFieldPath || ""),
          values: categories.map((_, categoryIndex) => {
            const value = Number(series?.values?.[categoryIndex]);
            return Number.isFinite(value) ? value : 0;
          })
        })),
        dataBinding: options.dataBinding && typeof options.dataBinding === "object"
          ? {
              collectionPath: String(options.dataBinding.collectionPath || ""),
              categoryFieldPath: String(options.dataBinding.categoryFieldPath || "")
            }
          : null
      };
    }

function createListObject(options = {}) {
      const listType = options.listType === "bullet" ? "bullet" : "ordered";
      const alignment = ["left", "center", "right"].includes(options.alignment)
        ? options.alignment
        : options.placement === "aligned"
          ? options.floatSide === "left" ? "left" : "right"
          : "left";
      const markerStyle = String(options.markerStyle || (listType === "bullet" ? "disc" : "decimal"));
      const allowedStyles = listType === "bullet"
        ? ["disc", "circle", "square"]
        : ["decimal", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"];
      const sourceItems = Array.isArray(options.items) ? options.items : ["Item da lista"];
      const sourceItemIds = Array.isArray(options.itemIds) ? options.itemIds : [];
      const items = [];
      const itemIds = [];
      sourceItems.forEach((item, index) => {
        const text = String(item ?? "").trim();
        if (!text) return;
        items.push(text);
        itemIds.push(sourceItemIds[index] || nextId("li"));
      });

      return {
        id: options.id || nextId("lst"),
        kind: KINDS.LIST,
        listType,
        markerStyle: allowedStyles.includes(markerStyle) ? markerStyle : allowedStyles[0],
        alignment,
        wrapText: options.wrapText === true,
        sortAlphabetically: options.sortAlphabetically === true,
        justify: options.justify === true,
        width: options.width !== null && options.width !== undefined && Number.isFinite(Number(options.width))
          ? Math.max(0, Number(options.width))
          : null,
        height: options.height !== null && options.height !== undefined && Number.isFinite(Number(options.height))
          ? Math.max(0, Number(options.height))
          : null,
        items,
        itemIds
      };
    }

    function ensureListItemIds(list) {
      if (!list || typeof list !== "object") return [];
      const items = Array.isArray(list.items) ? list.items : [];
      const itemIds = Array.isArray(list.itemIds) ? list.itemIds : [];
      list.items = [];
      list.itemIds = [];
      items.forEach((item, index) => {
        const text = String(item ?? "").trim();
        if (!text) return;
        list.items.push(text);
        list.itemIds.push(itemIds[index] || nextId("li"));
      });
      return list.itemIds;
    }

    function createTextbox() {
      return {
        id: nextId("tbx"),
        kind: KINDS.TEXTBOX,
        x: 16,
        y: 16,
        width: 170,
        height: 70,
        html: "Caixa de texto",
        border: createEmptyBorder()
      };
    }

