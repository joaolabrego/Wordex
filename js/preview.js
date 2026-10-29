"use strict";

Object.assign(wordex, {
  createDataPreviewTableClone(table) {
    if (!table || table.kind !== KINDS.TABLE) return table;

    this.ensureTableRowVisibilityState?.(table);
    const clone = JSON.parse(JSON.stringify(table));
    clone._isPreviewClone = true;

    if (!this.dataSource) {
      clone.rows = 0;
      clone.cells = [];
      clone.rowContexts = [];
      clone.rowHeights = [];
      clone.rowVisibility = [];
      clone.rowReportVisibility = [];
      clone.cellBorders = [];
      clone.cellTextAlign = [];
      clone.cellObjects = [];
      return clone;
    }

    const built = table.dataBinding?.detailPath
      ? this.buildGroupedDataPreviewRows(table)
      : this.buildLinearDataPreviewRows(table);

    clone.rows = built.rows.length;
    clone.cells = built.rows;
    clone.rowContexts = built.contexts;
    clone.rowHeights = built.heights;
    clone.cellBorders = built.borders;
    clone.cellTextAlign = built.alignments;
    clone.cellObjects = built.objects;
    clone.cellColspans = built.colspans;
    clone.rowVisibility = built.visibility;
    clone.rowReportVisibility = built.visibility.slice();
    return clone;
  },

  createEmptyDataPreviewBuild() {
    return {
      rows: [],
      contexts: [],
      heights: [],
      borders: [],
      alignments: [],
      objects: [],
      colspans: [],
      visibility: []
    };
  },

  appendDataPreviewRow(build, table, rowIndex, sourceItem) {
    const rowVisible = table.rowReportVisibility?.[rowIndex] !== false && table.rowVisibility?.[rowIndex] !== false;
    if (!rowVisible) return;

    const sourceCells = table.cells?.[rowIndex] || [];
    const context = table.rowContexts?.[rowIndex] ? { ...table.rowContexts[rowIndex] } : null;
    const alignments = JSON.parse(JSON.stringify(table.cellTextAlign?.[rowIndex] || Array.from({ length: table.cols }, () => "left")));

    // Na renderização, o valor cujo kind é number fica sempre à direita.
    sourceCells.forEach((cell, columnIndex) => {
      const source = String(cell ?? "").trim();
      const macros = [...source.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)];
      if (macros.length !== 1) return;
      if (source.replace(macros[0][0], "").trim()) return;

      const node = this.getDataPreviewMacroNode(sourceItem, macros[0][1]);
      if (this.isNumericDataNode?.(node))
        alignments[columnIndex] = "right";
    });

    build.rows.push(sourceCells.map(cell => this.replaceDataPreviewMacros(cell, sourceItem)));
    build.contexts.push(context);
    build.heights.push(table.rowHeights?.[rowIndex]);
    build.borders.push(JSON.parse(JSON.stringify(table.cellBorders?.[rowIndex] || [])));
    build.alignments.push(alignments);
    build.objects.push(JSON.parse(JSON.stringify(table.cellObjects?.[rowIndex] || Array.from({ length: table.cols }, () => null))));
    const spans = Array.from({ length: table.cols }, (_, col) => {
      const span = Math.max(1, Number(table.cellColspans?.[rowIndex]?.[col]) || 1);
      return Math.min(span, Math.max(1, table.cols - col));
    });
    if (context?.kind === "groupHeader" || context?.kind === "tableHeader" || context?.mergeAcrossColumns) {
      spans[0] = table.cols;
      for (let col = 1; col < table.cols; col += 1) spans[col] = 1;
    }
    build.colspans.push(spans);
    build.visibility.push(true);
  },

  buildLinearDataPreviewRows(table) {
    const build = this.createEmptyDataPreviewBuild();

    for (let row = 0; row < table.rows; row += 1) {
      const context = table.rowContexts?.[row] || null;
      const contextKind = context?.kind || "";
      const contextPath = context?.fieldContextPath || context?.footerPath || context?.contextPath || context?.detailPath || table.dataBinding?.detailPath || "$";
      const sourceItems = contextKind === "detail"
        ? this.getDataPreviewCollectionItems(contextPath)
        : [this.getDataPreviewSampleForPath(contextPath)];

      const items = sourceItems.length ? sourceItems : [null];
      items.forEach(item => this.appendDataPreviewRow(build, table, row, item));
    }

    return build;
  },

  buildGroupedDataPreviewRows(table) {
    const build = this.createEmptyDataPreviewBuild();
    const detailPath = this.normalizeDataPreviewPath(table.dataBinding?.detailPath || "$.");
    const occurrences = this.collectDataPreviewDetailOccurrences(detailPath);
    if (!occurrences.length) return this.buildLinearDataPreviewRows(table);

    const rowsByKind = new Map();
    const rowsByKindAndPath = new Map();

    for (let row = 0; row < table.rows; row += 1) {
      const context = table.rowContexts?.[row] || null;
      const kind = context?.kind || "";
      if (!kind) continue;
      if (!rowsByKind.has(kind)) rowsByKind.set(kind, []);
      rowsByKind.get(kind).push(row);

      const path = context?.contextPath || context?.detailPath || "$";
      const key = `${kind}|${this.normalizeDataPreviewPath(path)}`;
      if (!rowsByKindAndPath.has(key)) rowsByKindAndPath.set(key, []);
      rowsByKindAndPath.get(key).push(row);
    }

    const appendKindRows = (kind, sourceItem, occurrence = null) => {
      (rowsByKind.get(kind) || []).forEach(row => {
        const context = table.rowContexts?.[row] || null;
        const rowSource = occurrence ? this.getDataPreviewSourceForRowContext(context, occurrence, sourceItem) : sourceItem;
        this.appendDataPreviewRow(build, table, row, rowSource);
      });
    };

    const appendKindPathRows = (kind, path, occurrence, fallbackSource) => {
      const key = `${kind}|${this.normalizeDataPreviewPath(path)}`;
      (rowsByKindAndPath.get(key) || []).forEach(row => {
        const context = table.rowContexts?.[row] || null;
        const rowSource = this.getDataPreviewSourceForRowContext(
          context,
          occurrence,
          fallbackSource
        );
        // Sem item de totals casado, não emite footer vazio (evita “linha fantasma”
        // antes do subtotal do grupo pai).
        if (kind === "groupFooter" && this.isEmptyDataPreviewTotalsSource?.(rowSource)) return;
        this.appendDataPreviewRow(build, table, row, rowSource);
      });
    };

    appendKindRows("tableHeader", occurrences[0]?.rootItem || this.getDataPreviewSampleForPath("$"));
    appendKindRows("columnHeader", occurrences[0]?.detailItem || null);

    const groupsRootFirst = this.getDataPreviewGroupsRootFirst(table, detailPath);

    // Quebras hierárquicas: nível N quebra pela combinação das chaves 1..N.
    const emitGroups = (level, groupOccurrences, ancestorKeyParts = []) => {
      if (level >= groupsRootFirst.length) {
        groupOccurrences.forEach(occurrence => appendKindRows("detail", occurrence.detailItem, occurrence));
        return;
      }

      const groupDefinition = groupsRootFirst[level];
      const path = groupDefinition.path;
      const groups = this.groupDataPreviewOccurrencesByPath(
        groupOccurrences,
        path,
        groupDefinition.fieldMacro,
        groupDefinition.fieldSourcePath,
        ancestorKeyParts
      );
      groups.forEach(group => {
        if (!group.occurrences.length) return;
        const nextAncestorKeys = ancestorKeyParts.concat(group.keyPart);
        appendKindPathRows("groupHeader", path, group.occurrences[0], group.item);
        emitGroups(level + 1, group.occurrences, nextAncestorKeys);
        appendKindPathRows("groupFooter", path, group.occurrences[0], group.item);
      });
    };

    emitGroups(0, occurrences);
    appendKindRows("tableFooter", occurrences[0]?.rootItem || this.getDataPreviewSampleForPath("$"), occurrences[0]);

    return build;
  },

  getDataPreviewGroupsRootFirst(table, detailPath) {
    const configuredGroups = table.dataBinding?.groups;
    if (Array.isArray(configuredGroups)) {
      return configuredGroups
        .map(group => {
          const fieldSourcePath = String(group?.fieldSourcePath || "").trim();
          return {
            path: this.normalizeDataPreviewPath(group?.path),
            fieldMacro: String(group?.fieldMacro || "").trim(),
            fieldSourcePath: fieldSourcePath ? this.normalizeDataPreviewPath(fieldSourcePath) : "",
            footerPath: String(group?.footerPath || "").trim()
          };
        })
        .filter(group => group.path && group.path !== "$" && group.path !== detailPath)
        .reverse();
    }

    const paths = [];
    const configuredGroupPaths = Array.isArray(table.dataBinding?.groupPaths)
      ? table.dataBinding.groupPaths
      : table.dataBinding?.parentLevels?.map(item => item.path) || [];
    const explicit = configuredGroupPaths
      .map(path => this.normalizeDataPreviewPath(path))
      .filter(path => path && path !== "$");

    if (explicit.length) paths.push(...explicit.reverse());
    else if (!Array.isArray(table.dataBinding?.groupPaths)) {
      let parentPath = this.getParentCollectionPath?.(detailPath);
      while (parentPath && parentPath !== "$") {
        paths.unshift(this.normalizeDataPreviewPath(parentPath));
        parentPath = this.getParentCollectionPath?.(parentPath);
      }
    }

    return paths
      .filter((path, index, array) => array.indexOf(path) === index && path !== detailPath)
      .map(path => ({ path, fieldMacro: "" }));
  },

  collectDataPreviewDetailOccurrences(detailPath) {
    const cleanDetailPath = this.normalizeDataPreviewPath(detailPath);
    const parts = cleanDetailPath.replace(/^\$\.?/, "").split(".").filter(Boolean);
    const rootItems = this.extractDataPreviewItems(this.dataSource);
    const occurrences = [];

    const walk = (items, partIndex, contexts, rootItem) => {
      if (partIndex >= parts.length) {
        items.forEach(item => {
          const nextContexts = { ...contexts, [cleanDetailPath]: item };
          occurrences.push({ rootItem, detailItem: item, contexts: nextContexts });
        });
        return;
      }

      const part = parts[partIndex];
      const childPath = `$ .${parts.slice(0, partIndex + 1).join(".")}`.replace("$ .", "$.");
      items.forEach(item => {
        const childNode = this.getDataPreviewChildNode(item, part);
        const childItems = this.extractDataPreviewItems(childNode);
        if (!childItems.length) return;
        childItems.forEach(childItem => {
          walk([childItem], partIndex + 1, { ...contexts, [childPath]: childItem }, rootItem || item);
        });
      });
    };

    if (!parts.length) {
      rootItems.forEach(item => occurrences.push({ rootItem: item, detailItem: item, contexts: { "$": item } }));
      return occurrences;
    }

    rootItems.forEach(rootItem => walk([rootItem], 0, { "$": rootItem }, rootItem));
    return occurrences;
  },

  encodeDataPreviewGroupKeyPart(part) {
    if (part && typeof part === "object") {
      if (!this._dataPreviewGroupObjectIds) this._dataPreviewGroupObjectIds = new WeakMap();
      if (!this._dataPreviewGroupObjectIds.has(part)) {
        this._dataPreviewGroupObjectSeq = (this._dataPreviewGroupObjectSeq || 0) + 1;
        this._dataPreviewGroupObjectIds.set(part, `obj:${this._dataPreviewGroupObjectSeq}`);
      }
      return this._dataPreviewGroupObjectIds.get(part);
    }
    return `val:${JSON.stringify(part)}`;
  },

  groupDataPreviewOccurrencesByPath(occurrences, path, fieldMacro = "", fieldSourcePath = "", ancestorKeyParts = []) {
    const groups = [];
    const keyToGroup = new Map();
    const sourcePath = String(fieldSourcePath || "").trim();
    const resolvePath = this.normalizeDataPreviewPath(sourcePath || path);
    const ancestors = Array.isArray(ancestorKeyParts) ? ancestorKeyParts : [];
    occurrences.forEach(occurrence => {
      const item = occurrence.contexts?.[resolvePath] || null;
      const value = fieldMacro
        ? this.resolveDataPreviewMacro(item, fieldMacro)
        : item;
      const keyPart = fieldMacro
        ? `${typeof value}:${JSON.stringify(value)}`
        : (item && typeof item === "object" ? item : JSON.stringify(item));
      // Chave cumulativa: grupo N = chaves dos grupos 1..N.
      const key = ancestors.length
        ? [...ancestors, keyPart].map(part => this.encodeDataPreviewGroupKeyPart(part)).join("\u0001")
        : keyPart;
      if (!keyToGroup.has(key)) {
        const group = { item, keyPart, occurrences: [] };
        keyToGroup.set(key, group);
        groups.push(group);
      }
      keyToGroup.get(key).occurrences.push(occurrence);
    });
    return groups;
  },

  getDataPreviewSourceForRowContext(context, occurrence, fallbackSource) {
    if (!context || !occurrence) return fallbackSource;

    const kind = context.kind || "";
    if (kind === "detail") return occurrence.detailItem;
    if (kind === "tableHeader") return occurrence.rootItem || fallbackSource;
    if (kind === "columnHeader") return fallbackSource;

    const contextPath = this.normalizeDataPreviewPath(context.contextPath || context.detailPath || "$");
    if (kind === "groupHeader") {
      const fieldPath = this.normalizeDataPreviewPath(context.fieldContextPath || contextPath);
      return occurrence.contexts?.[fieldPath]
        || occurrence.contexts?.[contextPath]
        || fallbackSource;
    }

    if (kind === "groupFooter" || kind === "tableFooter") {
      const rawFooterPath = String(context.footerPath || "").trim();
      // Totais vêm do JSON (Kind totals); não há mais agregação local (__detail__).
      if (!rawFooterPath || rawFooterPath === "__detail__") return fallbackSource;
      const footerPath = this.normalizeDataPreviewPath(rawFooterPath);
      if (kind === "groupFooter") {
        const matchFields = Array.isArray(context.footerMatchFields) && context.footerMatchFields.length
          ? context.footerMatchFields
          : (this.getTotalsMatchFieldNames?.(footerPath) || []);
        return this.findMatchingTotalsItem(footerPath, occurrence?.detailItem, matchFields, occurrence);
      }
      return this.findMatchingTotalsItem(footerPath, occurrence?.detailItem, [], occurrence)
        || this.getDataPreviewSourceFromOccurrencePath(footerPath, occurrence)
        || fallbackSource;
    }

    const fieldPath = this.normalizeDataPreviewPath(context.fieldContextPath || context.contextPath || "$");
    return this.getDataPreviewSourceFromOccurrencePath(fieldPath, occurrence) || fallbackSource;
  },

  isEmptyDataPreviewTotalsSource(source) {
    if (source == null) return true;
    if (typeof source !== "object" || Array.isArray(source)) return false;
    return Object.keys(source).length === 0;
  },

  normalizeTotalsMatchValue(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      return String(value).trim();
    if (this.isPlainObject?.(value) && "Value" in value)
      return this.normalizeTotalsMatchValue(value.Value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  },

  // Subtotais ficam na collection pai (ex.: Clientes.TotaisProdutos): resolve só no pai do occurrence.
  // Nunca achata todos os clientes — senão CategoriaNome casa o primeiro "Eletrônico" de outro pai.
  getDataPreviewTotalsItemsForFooter(footerPath, occurrence = null) {
    const cleanPath = this.normalizeDataPreviewPath(footerPath);
    if (!cleanPath || cleanPath === "$") return this.getDataPreviewCollectionItems(cleanPath);

    if (occurrence) {
      const scoped = this.getDataPreviewTotalsItemsFromOccurrence(cleanPath, occurrence);
      // Array (mesmo vazio) = resolveu no pai; null = sem contexto → não vaza totais de outros pais.
      if (scoped) return scoped;
      return [];
    }

    return this.getDataPreviewCollectionItems(cleanPath);
  },

  getDataPreviewTotalsItemsFromOccurrence(footerPath, occurrence) {
    const cleanPath = this.normalizeDataPreviewPath(footerPath);
    const parts = cleanPath.replace(/^\$\.?/, "").split(".").filter(Boolean);
    if (!parts.length || !occurrence?.contexts) return null;

    const contextPaths = Object.keys(occurrence.contexts)
      .filter(path => {
        const normalized = this.normalizeDataPreviewPath(path);
        return normalized === "$"
          || cleanPath === normalized
          || cleanPath.startsWith(`${normalized}.`);
      })
      .sort((a, b) => b.length - a.length);

    for (const contextPath of contextPaths) {
      const normalizedContext = this.normalizeDataPreviewPath(contextPath);
      const contextParts = normalizedContext === "$"
        ? []
        : normalizedContext.replace(/^\$\.?/, "").split(".").filter(Boolean);
      const suffixParts = parts.slice(contextParts.length);
      let current = occurrence.contexts[contextPath];
      let resolved = true;
      for (const part of suffixParts) {
        current = this.getDataPreviewChildNode(current, part);
        if (current == null) {
          resolved = false;
          break;
        }
      }
      if (resolved && current != null) return this.extractDataPreviewItems(current);
    }

    return null;
  },

  findMatchingTotalsItem(footerPath, detailItem, matchFields = [], occurrence = null) {
    const items = this.getDataPreviewTotalsItemsForFooter(footerPath, occurrence);
    if (!items.length) return null;

    let fields = Array.isArray(matchFields)
      ? matchFields.map(field => String(field || "").trim()).filter(Boolean)
      : [];
    // Sem chaves explícitas: usa as colunas-chave presentes no próprio totals.
    if (!fields.length)
      fields = this.getTotalsMatchFieldNames?.(footerPath) || [];
    if (!fields.length) return items[0] || null;

    // Só compara chaves que existam no item de totais (as mesmas do grupo).
    const usableFields = fields.filter(field => items.some(item =>
      item != null && Object.prototype.hasOwnProperty.call(item, field)
    ));
    // Totais do pai sem chave (ex.: TotaisProdutos do cliente): usa o item do contexto.
    if (!usableFields.length) return items[0] || null;

    return items.find(item => usableFields.every(field => {
      const expected = this.normalizeTotalsMatchValue(
        this.resolveDataPreviewMacro(detailItem, field)
      );
      const actual = this.normalizeTotalsMatchValue(
        this.resolveDataPreviewMacro(item, field)
      );
      return expected !== "" && expected === actual;
    })) || null;
  },

  getDataPreviewSourceFromOccurrencePath(path, occurrence) {
    const cleanPath = this.normalizeDataPreviewPath(path);
    if (!cleanPath || cleanPath === "$") return occurrence.rootItem || null;
    if (occurrence.contexts?.[cleanPath]) return occurrence.contexts[cleanPath];

    const contextPaths = Object.keys(occurrence.contexts || {})
      .filter(contextPath => contextPath !== "$" && cleanPath.startsWith(`${contextPath}.`))
      .sort((a, b) => b.length - a.length);

    for (const contextPath of contextPaths) {
      let current = occurrence.contexts[contextPath];
      const suffix = cleanPath.slice(contextPath.length + 1).split(".").filter(Boolean);
      for (const part of suffix) {
        current = this.getDataPreviewChildNode(current, part);
        if (current == null) break;
        current = this.unwrapDataPreviewNode(current);
      }
      if (current != null) return this.getDataPreviewSingleSource(current);
    }

    return this.getDataPreviewSampleForPath(cleanPath);
  },

  getDataPreviewSingleSource(node) {
    if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node) || this.isGraphNode?.(node) || Array.isArray(node)) {
      const items = this.extractDataPreviewItems(node);
      return items[0] || null;
    }
    return this.unwrapDataPreviewNode(node);
  },

  getDataPreviewCollectionItems(path) {
    const cleanPath = this.normalizeDataPreviewPath(path);
    if (!this.dataSource) return [];
    if (!cleanPath || cleanPath === "$") return this.extractDataPreviewItems(this.dataSource);

    const parts = cleanPath.replace(/^\$\.?/, "").split(".").filter(Boolean);
    let currentItems = this.extractDataPreviewItems(this.dataSource);

    for (const part of parts) {
      const nextItems = [];
      currentItems.forEach(item => {
        const node = this.getDataPreviewChildNode(item, part);
        if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node) || this.isGraphNode?.(node) || Array.isArray(node)) {
          nextItems.push(...this.extractDataPreviewItems(node));
        } else if (node != null) {
          nextItems.push(this.unwrapDataPreviewNode(node));
        }
      });
      currentItems = nextItems;
    }

    return currentItems;
  },

  getDataPreviewSampleForPath(path) {
    const items = this.getDataPreviewCollectionItems(path);
    if (items.length) return items[0];

    const node = this.getDataNodeByPath?.(path);
    const sample = this.getCollectionSample?.(node);
    return this.getDataPreviewSingleSource(sample ?? node);
  },

  extractDataPreviewItems(node) {
    if (Array.isArray(node)) return node.map(item => this.unwrapDataPreviewNode(item));
    if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node) || this.isGraphNode?.(node))
      return (node.Items || []).map(item => this.unwrapDataPreviewNode(item));
    const unwrapped = this.unwrapDataPreviewNode(node);
    return unwrapped == null ? [] : [unwrapped];
  },

  unwrapDataPreviewNode(node) {
    if (this.isPlainObject?.(node) && "Value" in node && !("Items" in node)) return node.Value;
    return node;
  },

  getDataPreviewChildNode(item, key) {
    if (!item || !key) return null;
    if (!this.isPlainObject?.(item)) return null;
    return item[key];
  },

  getDataPreviewMacroNode(sourceItem, macro) {
    const clean = String(macro || "").trim();
    if (!clean || clean.startsWith("@")) return null;

    let current = sourceItem;
    const parts = clean.replace(/^\$\.?/, "").split(".").filter(Boolean);
    for (const part of parts) {
      current = this.getDataPreviewChildNode(current, part);
      if (current == null) return null;
    }
    return current;
  },

  normalizeDataPreviewPath(path) {
    const clean = String(path || "").trim();
    return clean || "$";
  },

  replaceDataPreviewMacros(html, sourceItem, options = {}) {
    const source = String(html ?? "");
    const preservePageMacros = Boolean(options.preservePageMacros);
    return source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, macro) => {
      const clean = String(macro || "").trim();
      // Página final resolve @PageNumber/@PageCount após o pagex.
      if (preservePageMacros && (clean === "@PageNumber" || clean === "@PageCount")) return match;
      const value = this.resolveDataPreviewMacro(sourceItem, clean);
      return escapeHtml(value == null ? "" : String(value));
    });
  },

  // Texto livre (header/body/footer/textbox): macros de dados no root do JSON.
  applyFreeTextDataPreviewMacros(html) {
    if (!this.previewMode || !this.dataSource) return String(html ?? "");
    const sourceItem = this.getDataPreviewSampleForPath("$");
    return this.replaceDataPreviewMacros(html, sourceItem, { preservePageMacros: true });
  },

  resolveDataPreviewMacro(sourceItem, macro) {
    const clean = String(macro || "").trim();
    if (!clean) return "";

    const systemValue = this.resolveSystemDataPreviewMacro(clean);
    if (systemValue !== null) return systemValue;

    let current = sourceItem;
    const parts = clean.replace(/^\$\.?/, "").split(".").filter(Boolean);
    for (const part of parts) {
      const child = this.getDataPreviewChildNode(current, part);
      if (child == null) return "";
      current = child;
    }

    // Text é o valor exibido na planilha (1.100,00). Value segue numérico para gráfico e alinhamento.
    if (this.isPlainObject?.(current)) {
      const text = current.Text ?? current.text;
      if (typeof text === "string" && text !== "") return text;
    }

    return this.unwrapDataPreviewNode(current);
  },

  resolveSystemDataPreviewMacro(macro) {
    const now = new Date();
    if (macro === "@Today") return now.toLocaleDateString();
    if (macro === "@Now") return now.toLocaleString();
    if (macro === "@DateISO") return now.toISOString().slice(0, 10);
    if (macro === "@Time") return now.toLocaleTimeString();
    if (macro === "@Year") return String(now.getFullYear());
    if (macro === "@Month") return String(now.getMonth() + 1).padStart(2, "0");
    if (macro === "@Day") return String(now.getDate()).padStart(2, "0");
    if (macro === "@PageNumber") return "1";
    if (macro === "@PageCount") return "1";
    return null;
  }
});
