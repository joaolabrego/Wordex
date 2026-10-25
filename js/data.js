"use strict";

Object.assign(wordex, {
  openDataJsonFileDialog() {
    const input = document.getElementById("dataJsonFileInput");
    if (!input) return;
    input.value = "";
    input.click();
  },

  onDataJsonFileSelected(event) {
    const input = event.currentTarget;
    const file = input?.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        this.dataSource = parsed;
        this.dataSourceFileName = file.name;
        this.selectedDataFieldPath = "";
        this.populateDataSourceSelectors();
        this.renderStatePanel(`JSON de dados carregado: ${file.name}`);
      } catch (error) {
        this.dataSource = null;
        this.dataSourceFileName = "";
        this.clearDataSourceSelectors();
        this.renderStatePanel(`Erro ao carregar JSON: ${error.message}`, true);
      } finally {
        input.value = "";
      }
    };

    reader.onerror = () => {
      this.dataSource = null;
      this.dataSourceFileName = "";
      this.clearDataSourceSelectors();
      this.renderStatePanel("Erro ao ler o arquivo JSON.", true);
      input.value = "";
    };

    reader.readAsText(file, "utf-8");
  },

  clearDataSourceSelectors() {
    const fieldSelect = document.getElementById("dataFieldSelect");

    if (fieldSelect) {
      this.selectedDataFieldPath = "";
      this.populateDataFieldSelector("$");
    }
  },

  populateDataSourceSelectors() {
    this.updateDataSourceContextSelectors();
  },


  onDataFieldChanged(event) {
    const select = event.currentTarget;
    this.selectedDataFieldPath = select.value;
    const selected = select.options?.[select.selectedIndex];
    const macro = selected?.dataset?.macro || select.value || "";
    if (macro) this.insertDataFieldMacroAtCaret(macro);
  },

  getSystemMacroFieldDefinitions() {
    return [
      { value: "@PageNumber", label: "@PageNumber (página atual)" },
      { value: "@PageCount", label: "@PageCount (total de páginas)" },
      { value: "@Today", label: "@Today (data de hoje)" },
      { value: "@Now", label: "@Now (data e hora)" },
      { value: "@DateISO", label: "@DateISO (AAAA-MM-DD)" },
      { value: "@Time", label: "@Time (hora)" },
      { value: "@Year", label: "@Year (ano)" },
      { value: "@Month", label: "@Month (mês)" },
      { value: "@Day", label: "@Day (dia)" }
    ];
  },

  isReservedDataPropertyName(name) {
    return ["kind", "value", "items"].includes(String(name || "").toLowerCase());
  },

  formatDataMacro(macro) {
    const clean = String(macro || "").trim();
    if (!clean) return "";
    return `{{${clean}}}`;
  },

  insertDataFieldMacroAtCaret(macro) {
    const text = this.formatDataMacro(macro);
    if (!text) return;

    const editable = this.getActiveEditableElement?.();
    if (!editable || editable.getAttribute?.("contenteditable") !== "true") return;

    editable.focus();
    const inserted = window.WordexRichText?.insertTextWithStyle
      ? window.WordexRichText.insertTextWithStyle(editable, text, this.getTypingTextDefaults?.() || this.getCurrentToolbarTextStyles?.() || {})
      : false;

    if (!inserted) {
      document.execCommand?.("insertText", false, text);
    }

    this.syncActiveEditableAfterTextCommand?.(editable);
    this.saveHistorySnapshot?.();
  },

  populateDataFieldSelector(collectionPath) {
    const fieldSelect = document.getElementById("dataFieldSelect");
    if (!fieldSelect) return;

    const fields = this.collectFieldsForCollection(collectionPath);
    fieldSelect.innerHTML = fields
      .map(item => `<option value="${escapeHtml(item.path)}" data-macro="${escapeHtml(item.macro || item.path)}" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</option>`)
      .join("");
    fieldSelect.hidden = fields.length === 0;
    this.resizeSelectToLargestOption(fieldSelect);

    if (fields.length > 0) {
      const selectedPath = fields.some(item => item.path === this.selectedDataFieldPath)
        ? this.selectedDataFieldPath
        : fields[0].path;

      fieldSelect.value = selectedPath;
      this.selectedDataFieldPath = selectedPath;
    }
  },


  collectFieldsForCollection(collectionPath) {
    const collectionNode = this.getDataNodeByPath(collectionPath);
    const sample = this.getCollectionSample(collectionNode);
    const result = [
      { path: "", label: "Campo", macro: "" },
      ...this.getSystemMacroFieldDefinitions().map(item => ({ path: item.value, label: item.label, macro: item.value }))
    ];
    if (!this.isPlainObject(sample)) return result;

    Object.entries(sample).forEach(([key, value]) => {
      if (this.isReservedDataPropertyName(key)) return;
      if (this.isObjectNode(value)) {
        this.collectObjectFieldNodes(value.Value, `${collectionPath}.${key}`, key, result);
        return;
      }

      if (this.isScalarDataNode(value) || this.isCollectionNode(value)) {
        result.push({
          path: `${collectionPath}.${key}`,
          label: `${key}${this.getDataFieldKindSuffix(value)}`,
          macro: key
        });
      }
    });

    return result;
  },

  collectObjectFieldNodes(objectValue, basePath, baseLabel, result) {
    if (!this.isPlainObject(objectValue)) return;

    Object.entries(objectValue).forEach(([key, value]) => {
      if (this.isReservedDataPropertyName(key)) return;
      const path = `${basePath}.${key}`;
      const label = `${baseLabel}.${key}`;

      if (this.isObjectNode(value)) {
        this.collectObjectFieldNodes(value.Value, path, label, result);
        return;
      }

      if (this.isScalarDataNode(value) || this.isCollectionNode(value)) {
        result.push({
          path,
          label: `${label}${this.getDataFieldKindSuffix(value)}`,
          macro: label
        });
      }
    });
  },

  getDataNodeByPath(path) {
    if (!path || path === "$") return this.dataSource;

    const parts = path.replace(/^\$\.?/, "").split(".").filter(Boolean);
    let node = this.dataSource;

    for (const part of parts) {
      const sample = this.getCollectionSample(node);
      if (this.isPlainObject(sample) && part in sample) {
        node = sample[part];
      } else if (this.isObjectNode(node) && part in node.Value) {
        node = node.Value[part];
      } else if (this.isPlainObject(node) && part in node) {
        node = node[part];
      } else {
        return null;
      }
    }

    return node;
  },

  getCollectionSample(node) {
    if (Array.isArray(node)) return node[0] || null;
    if (this.isPlainObject(node) && Array.isArray(node.Items)) return node.Items[0] || null;
    return node;
  },

  isCollectionNode(node) {
    return this.isPlainObject(node) && String(node.Kind || "").toLowerCase() === "collection" && Array.isArray(node.Items);
  },

  isGraphNode(node) {
    return this.isPlainObject(node) && String(node.Kind || "").toLowerCase() === "graph" && Array.isArray(node.Items);
  },

  isObjectNode(node) {
    return this.isPlainObject(node) && String(node.Kind || "").toLowerCase() === "object" && this.isPlainObject(node.Value);
  },

  getDataFieldKindSuffix(node) {
    if (this.isCollectionNode(node)) return " [collection]";
    if (this.isGraphNode(node)) return " [graph]";
    if (this.isObjectNode(node)) return " [object]";
    return "";
  },

  resizeSelectToLargestOption(select) {
    if (!select) return;

    const options = Array.from(select.options || []);
    if (options.length === 0) {
      select.style.width = "";
      return;
    }

    const style = window.getComputedStyle(select);
    const canvas = this._selectMeasureCanvas || (this._selectMeasureCanvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    const widestText = options.reduce((max, option) => {
      const width = context.measureText(option.textContent || "").width;
      return Math.max(max, width);
    }, 0);

    const padding = parseFloat(style.paddingLeft || "0") + parseFloat(style.paddingRight || "0");
    const border = parseFloat(style.borderLeftWidth || "0") + parseFloat(style.borderRightWidth || "0");
    const arrowRoom = 40;
    const width = Math.ceil(Math.max(150, widestText + padding + border + arrowRoom));

    select.style.width = `${width}px`;
    select.style.minWidth = `${width}px`;
    select.style.maxWidth = "none";
  },


  getCurrentDataToolbarContext() {
    const fallback = { path: "$", locked: Boolean(this.dataSource), source: "root" };
    if (!this.dataSource) return { path: "", locked: false, source: "none" };

    const getTableRowContextPath = (tableId, rowIndex) => {
      const owner = this.findObjectOwnerById?.(tableId);
      const table = owner?.object;
      return this.getEffectiveTableRowFieldContextPath?.(table, rowIndex) || "";
    };

    // Quando o caret esta dentro de uma celula editavel, a propria linha da
    // tabela define o contexto dos combos de dados. Isso e independente do
    // modo de selecao por Ctrl+clique.
    const focusedCell = document.activeElement?.closest?.("[data-table-cell]");
    if (focusedCell) {
      const path = getTableRowContextPath(focusedCell.dataset.tableCell, focusedCell.dataset.row);
      if (path) return { path, locked: true, source: "table-cell" };
    }

    if (this.activeTableSelection?.tableId) {
      const path = getTableRowContextPath(this.activeTableSelection.tableId, this.activeTableSelection.rowIndex);
      if (path) return { path, locked: true, source: "table" };
    }

    return fallback;
  },

  getEffectiveTableRowFieldContextPath(table, rowIndex) {
    if (!table || !Array.isArray(table.rowContexts)) return "";

    const safeRowIndex = Math.min(
      Math.max(0, Number(rowIndex) || 0),
      Math.max(0, table.rowContexts.length - 1)
    );
    const rowContext = table.rowContexts[safeRowIndex] || null;
    if (!rowContext) return "";

    // A linha de titulo das colunas e posicional: ela herda o ultimo
    // datasource estrutural acima dela. Se for movida para baixo de um
    // GroupHeader Clientes, passa a listar campos de Clientes; se ficar logo
    // apos o TableHeader, lista campos do Root.
    if (rowContext.kind === "columnHeader") {
      let inheritedPath = "$";
      for (let index = 0; index < safeRowIndex; index += 1) {
        const context = table.rowContexts[index] || null;
        if (!context) continue;
        if (["tableHeader", "groupHeader", "detail"].includes(context.kind)) {
          inheritedPath = context.contextPath || context.fieldContextPath || inheritedPath;
        }
      }
      return inheritedPath || "$";
    }

    return rowContext.fieldContextPath || rowContext.footerPath || rowContext.contextPath || rowContext.detailPath || "";
  },



  isImageDataNode(node) {
    return this.isPlainObject(node) && String(node.Kind || "").toLowerCase() === "image" && typeof node.Value === "string";
  },

  collectImageFieldsForCollection(collectionPath) {
    if (!this.dataSource) return [];
    const collectionNode = this.getDataNodeByPath(collectionPath || "$");
    const sample = this.getCollectionSample(collectionNode);
    const result = [];
    if (!this.isPlainObject(sample)) return result;

    const visit = (node, basePath, baseLabel, baseMacro) => {
      if (!this.isPlainObject(node)) return;
      Object.entries(node).forEach(([key, value]) => {
        if (this.isReservedDataPropertyName(key)) return;
        const path = `${basePath}.${key}`;
        const label = baseLabel ? `${baseLabel}.${key}` : key;
        const macro = baseMacro ? `${baseMacro}.${key}` : key;

        if (this.isImageDataNode(value)) {
          result.push({
            path,
            label: `${label} [image]`,
            macro,
            src: value.Value || ""
          });
          return;
        }

        if (this.isObjectNode(value)) {
          visit(value.Value, path, label, macro);
        }
      });
    };

    visit(sample, collectionPath || "$", "", "");
    return result;
  },

  getCurrentImageFieldOptions() {
    if (!this.dataSource) return [];
    const context = this.getCurrentDataToolbarContext?.() || { path: "$" };
    return this.collectImageFieldsForCollection(context.path || "$");
  },


  updateDataSourceContextSelectors() {
    if (!this.dataSource) {
      this.selectedDataFieldPath = "";
      this.populateDataFieldSelector("$");
      return;
    }

    const context = this.getCurrentDataToolbarContext();
    const contextPath = context.path || "$";
    this.selectedDataFieldPath = "";
    this.populateDataFieldSelector(contextPath);
  },

  getTableDataSourceOptions() {
    if (this.dataSource == null) return [];

    const options = [{ path: "$", label: "ROOT [collection]", kind: "collection" }];
    const rootSample = this.getCollectionSample(this.dataSource);
    this.collectTableCollectionOptions(rootSample, "$", "Root", options);
    return options;
  },

  getChartDataSourceOptions() {
    if (this.dataSource == null) return [];

    const options = [];
    const rootSample = this.getCollectionSample(this.dataSource);
    this.collectChartGraphOptions(rootSample, "$", "Root", options);
    return options;
  },

  collectTableCollectionOptions(node, basePath, baseLabel, result) {
    if (!this.isPlainObject(node)) return;

    Object.entries(node).forEach(([key, value]) => {
      if (!this.isCollectionNode(value)) return;
      const path = `${basePath}.${key}`;
      const label = `${baseLabel === "Root" ? key : `${baseLabel} > ${key}`} [collection]`;
      result.push({ path, label, kind: "collection" });

      const sample = this.getCollectionSample(value);
      this.collectTableCollectionOptions(sample, path, label.replace(/ \[collection\]$/, ""), result);
    });
  },

  collectChartGraphOptions(node, basePath, baseLabel, result) {
    if (!this.isPlainObject(node)) return;

    Object.entries(node).forEach(([key, value]) => {
      if (this.isGraphNode(value)) {
        const path = `${basePath}.${key}`;
        const label = `${baseLabel === "Root" ? key : `${baseLabel} > ${key}`} [graph]`;
        result.push({ path, label, kind: "graph" });
        return;
      }

      if (!this.isCollectionNode(value)) return;
      const path = `${basePath}.${key}`;
      const label = baseLabel === "Root" ? key : `${baseLabel} > ${key}`;
      const sample = this.getCollectionSample(value);
      this.collectChartGraphOptions(sample, path, label, result);
    });
  },

  getParentCollectionPath(path) {
    if (!path || path === "$") return "";
    const clean = String(path).replace(/^\$\.?/, "");
    const parts = clean.split(".").filter(Boolean);
    if (parts.length <= 1) return "$";
    return `$.${parts.slice(0, -1).join(".")}`;
  },

  getDataPathLastName(path) {
    if (!path || path === "$") return "ROOT";
    const parts = String(path).replace(/^\$\.?/, "").split(".").filter(Boolean);
    return parts[parts.length - 1] || "ROOT";
  },


  getTableCollectionLabel(path) {
    if (!path || path === "$") return "Root";
    const option = this.getTableDataSourceOptions().find(item => item.path === path);
    if (option) return option.label.replace(/ \[collection\]$/, "");
    return this.getDataPathLastName(path);
  },

  getTableParentChainForDetail(detailPath) {
    const result = [];
    let parentPath = this.getParentCollectionPath(detailPath);

    while (parentPath) {
      result.push({
        path: parentPath,
        label: this.getTableCollectionLabel(parentPath),
        totals: this.getTotalsOptionsInCollection(parentPath)
      });

      if (parentPath === "$") break;
      parentPath = this.getParentCollectionPath(parentPath);
    }

    return result;
  },


  getTotalsOptionsInCollection(collectionPath) {
    const node = this.getDataNodeByPath(collectionPath);
    const sample = this.getCollectionSample(node);
    if (!this.isPlainObject(sample)) return [];

    const prefix = collectionPath === "$" ? "Root" : this.getDataPathLastName(collectionPath);
    return Object.entries(sample)
      .filter(([, value]) => this.isTotalsNode(value))
      .map(([key]) => ({ path: `${collectionPath}.${key}`, label: `${prefix} > ${key} [totals]` }));
  },

  getTotalsAggregateSuffixes(footerPath) {
    const suffixes = ["Sum", "Avg", "Min", "Max", "Count"];
    const fields = this.getScalarFieldsForDataPath(footerPath);
    if (!fields.length) return [];

    const found = new Set();
    fields.forEach(field => {
      const name = String(field.label || field.macro || "");
      suffixes.forEach(suffix => {
        if (name.endsWith(suffix)) found.add(suffix);
      });
    });
    return suffixes.filter(suffix => found.has(suffix));
  },

  isTotalsNode(node) {
    return this.isPlainObject(node) && String(node.Kind || "").toLowerCase() === "totals" && Array.isArray(node.Items);
  },

  getScalarFieldsForDataPath(path) {
    const node = this.getDataNodeByPath(path);
    const sample = this.getCollectionSample(node);
    if (!this.isPlainObject(sample)) return [];

    const result = [];
    Object.entries(sample).forEach(([key, value]) => {
      if (this.isReservedDataPropertyName(key)) return;
      if (this.isObjectNode(value)) {
        this.collectScalarFieldsFromObject(value.Value, key, path, result);
        return;
      }

      if (this.isScalarDataNode(value)) {
        result.push({ path: `${path}.${key}`, label: key, macro: key, kind: this.getScalarDataKind(value) });
      }
    });
    return result;
  },

  collectScalarFieldsFromObject(objectValue, prefix, basePath, result) {
    if (!this.isPlainObject(objectValue)) return;
    Object.entries(objectValue).forEach(([key, value]) => {
      if (this.isReservedDataPropertyName(key)) return;
      const label = `${prefix}.${key}`;
      if (this.isObjectNode(value)) {
        this.collectScalarFieldsFromObject(value.Value, label, basePath, result);
        return;
      }
      if (this.isScalarDataNode(value)) {
        result.push({ path: `${basePath}.${label}`, label, macro: label, kind: this.getScalarDataKind(value) });
      }
    });
  },

  getScalarDataKind(node) {
    if (this.isPlainObject(node)) {
      const kind = node.Kind ?? node.kind ?? node.Type ?? node.type;
      if (kind) return String(kind).toLowerCase();
      if ("Value" in node && !("Items" in node)) return typeof node.Value;
    }
    return typeof node;
  },

  isNumericDataNode(node) {
    const numericKinds = new Set(["number", "numeric", "decimal", "integer", "int", "float", "double", "currency", "money"]);
    if (typeof node === "number") return true;
    if (!this.isPlainObject(node)) return false;

    const kind = node.Kind ?? node.kind ?? node.Type ?? node.type;
    if (kind != null) return numericKinds.has(String(kind).toLowerCase());
    return "Value" in node && !("Items" in node) && typeof node.Value === "number";
  },

  isScalarDataNode(node) {
    if (node == null) return true;
    if (["string", "number", "boolean"].includes(typeof node)) return true;

    if (!this.isPlainObject(node)) return false;

    const kind = String(node.Kind ?? node.kind ?? node.Type ?? node.type ?? "").toLowerCase();
    if (!kind) return "Value" in node && !("Items" in node);
    return ["string", "number", "numeric", "decimal", "integer", "int", "float", "double", "currency", "money", "date", "boolean"].includes(kind);
  },

  isPlainObject(value) {
    return value != null && typeof value === "object" && !Array.isArray(value);
  },
});
