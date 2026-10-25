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
    build.colspans.push(JSON.parse(JSON.stringify(table.cellColspans?.[rowIndex] || [])));
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
        const rowSource = this.getDataPreviewSourceForRowContext(context, occurrence, fallbackSource);
        this.appendDataPreviewRow(build, table, row, rowSource);
      });
    };

    appendKindRows("tableHeader", occurrences[0]?.rootItem || this.getDataPreviewSampleForPath("$"));
    appendKindRows("columnHeader", occurrences[0]?.detailItem || null);

    const groupsRootFirst = this.getDataPreviewGroupsRootFirst(table, detailPath);

    const emitGroups = (level, groupOccurrences) => {
      if (level >= groupsRootFirst.length) {
        groupOccurrences.forEach(occurrence => appendKindRows("detail", occurrence.detailItem, occurrence));
        return;
      }

      const groupDefinition = groupsRootFirst[level];
      const path = groupDefinition.path;
      const groups = this.groupDataPreviewOccurrencesByPath(groupOccurrences, path, groupDefinition.fieldMacro);
      groups.forEach(group => {
        appendKindPathRows("groupHeader", path, group.occurrences[0], group.item);
        emitGroups(level + 1, group.occurrences);
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
        .map(group => ({
          path: this.normalizeDataPreviewPath(group?.path),
          fieldMacro: String(group?.fieldMacro || "").trim()
        }))
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

  groupDataPreviewOccurrencesByPath(occurrences, path, fieldMacro = "") {
    const groups = [];
    const keyToGroup = new Map();
    occurrences.forEach(occurrence => {
      const item = occurrence.contexts?.[path] || null;
      const value = fieldMacro
        ? this.resolveDataPreviewMacro(item, fieldMacro)
        : item;
      const key = fieldMacro
        ? `${typeof value}:${JSON.stringify(value)}`
        : item && typeof item === "object" ? item : JSON.stringify(item);
      if (!keyToGroup.has(key)) {
        const group = { item, occurrences: [] };
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
    if (kind === "groupHeader") return occurrence.contexts?.[contextPath] || fallbackSource;

    if (kind === "groupFooter" || kind === "tableFooter") {
      const footerPath = this.normalizeDataPreviewPath(context.footerPath || context.fieldContextPath || context.contextPath || "$");
      return this.getDataPreviewSourceFromOccurrencePath(footerPath, occurrence) || fallbackSource;
    }

    const fieldPath = this.normalizeDataPreviewPath(context.fieldContextPath || context.contextPath || "$");
    return this.getDataPreviewSourceFromOccurrencePath(fieldPath, occurrence) || fallbackSource;
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
    if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node) || Array.isArray(node)) {
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
        if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node) || Array.isArray(node)) {
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
    if (this.isCollectionNode?.(node) || this.isTotalsNode?.(node)) return (node.Items || []).map(item => this.unwrapDataPreviewNode(item));
    const unwrapped = this.unwrapDataPreviewNode(node);
    return unwrapped == null ? [] : [unwrapped];
  },

  unwrapDataPreviewNode(node) {
    if (this.isObjectNode?.(node)) return node.Value;
    if (this.isPlainObject?.(node) && "Value" in node && !("Items" in node)) return node.Value;
    return node;
  },

  getDataPreviewChildNode(item, key) {
    if (!item || !key) return null;
    const object = this.isObjectNode?.(item) ? item.Value : item;
    if (!this.isPlainObject?.(object)) return null;
    return object[key];
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

  replaceDataPreviewMacros(html, sourceItem) {
    const source = String(html ?? "");
    return source.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, macro) => {
      const value = this.resolveDataPreviewMacro(sourceItem, macro);
      return escapeHtml(value == null ? "" : String(value));
    });
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
