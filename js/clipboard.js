"use strict";

Object.assign(wordex, {
  internalClipboard: null,

  hasNonCollapsedSelection() {
    const selection = window.getSelection?.();
    return Boolean(selection && selection.rangeCount > 0 && !selection.isCollapsed);
  },

  hasNativeClipboardTarget() {
    const active = document.activeElement;
    return Boolean(
      active?.isContentEditable ||
      active?.matches?.("input, textarea, select, [contenteditable='true']") ||
      active?.closest?.("[contenteditable='true']")
    );
  },

  cloneForClipboard(value) {
    return JSON.parse(JSON.stringify(value));
  },

  renewIdsForPastedObject(value, idMap = new Map()) {
    const idPrefixes = {
      [KINDS.TABLE]: "tbl",
      [KINDS.IMAGE]: "img",
      [KINDS.CHART]: "cht",
      [KINDS.LIST]: "lst",
      [KINDS.LINE]: "line",
      [KINDS.TEXTBOX]: "tbx",
      [KINDS.WATERMARK]: "wm"
    };

    const renew = item => {
      if (!item || typeof item !== "object") return;
      if (Array.isArray(item)) {
        item.forEach(renew);
        return;
      }

      const prefix = idPrefixes[item.kind];
      if (prefix && item.id != null) {
        const oldId = item.id;
        item.id = nextId(prefix);
        idMap.set(oldId, item.id);
      }

      if (item.kind === KINDS.LIST) {
        const itemIds = ensureListItemIds(item).slice();
        item.itemIds = itemIds.map(oldId => {
          const newId = nextId("li");
          idMap.set(oldId, newId);
          return newId;
        });
      }

      Object.values(item).forEach(renew);
    };

    renew(value);
    const relink = item => {
      if (!item || typeof item !== "object") return;
      if (Array.isArray(item)) {
        item.forEach(relink);
        return;
      }
      if (item.kind === KINDS.LIST) {
        if (idMap.has(item.parentListId)) item.parentListId = idMap.get(item.parentListId);
        if (idMap.has(item.parentItemId)) item.parentItemId = idMap.get(item.parentItemId);
      }
      Object.values(item).forEach(relink);
    };
    relink(value);
    return idMap;
  },

  getInlineListSubtree(owner, listId) {
    const lists = owner?.subparagraph?.inlineLists || [];
    const root = lists.find(list => list.id === listId);
    if (!root) return null;
    const included = new Set([root.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const list of lists) {
        if (!included.has(list.id) && included.has(list.parentListId)) {
          included.add(list.id);
          changed = true;
        }
      }
    }
    const rootCopy = this.cloneForClipboard(root);
    delete rootCopy.parentListId;
    delete rootCopy.parentItemId;
    return {
      root: rootCopy,
      sublists: this.cloneForClipboard(lists.filter(list => included.has(list.id) && list.id !== root.id))
    };
  },

  renewTableCellTextboxReferences(textboxes, idMap) {
    if (!Array.isArray(textboxes)) return;
    for (const textbox of textboxes) {
      const tableCell = textbox?.tableCell;
      if (!tableCell || !idMap.has(tableCell.tableId)) continue;
      tableCell.tableId = idMap.get(tableCell.tableId);
    }
  },

  renewIdsForPastedSubparagraph(subparagraph) {
    if (!subparagraph || typeof subparagraph !== "object") return subparagraph;

    subparagraph.id = nextId("sp");
    const idMap = new Map();
    this.renewIdsForPastedObject(subparagraph.object, idMap);
    this.renewIdsForPastedObject(subparagraph.textboxes, idMap);
    this.renewIdsForPastedObject(subparagraph.inlineTextboxes, idMap);
    this.renewIdsForPastedObject(subparagraph.inlineLists, idMap);
    this.renewIdsForPastedObject(subparagraph.inlineLines, idMap);
    this.renewTableCellTextboxReferences(subparagraph.textboxes, idMap);
    for (const [oldId, newId] of idMap) {
      if (typeof subparagraph.textHtml === "string") {
        subparagraph.textHtml = subparagraph.textHtml.replaceAll(
          `data-inline-textbox-anchor="${oldId}"`,
          `data-inline-textbox-anchor="${newId}"`
        );
        subparagraph.textHtml = subparagraph.textHtml.replaceAll(
          `data-inline-list-anchor="${oldId}"`,
          `data-inline-list-anchor="${newId}"`
        );
        subparagraph.textHtml = subparagraph.textHtml.replaceAll(
          `data-inline-line-anchor="${oldId}"`,
          `data-inline-line-anchor="${newId}"`
        );
      }
    }
    return subparagraph;
  },

  getSelectedObjectForClipboard() {
    if (this.activeTextbox) {
      const owner = this.findTextboxOwnerById?.(this.activeTextbox);
      if (owner?.textbox) return { type: "textbox", owner, item: owner.textbox };
    }

    if (this.activeObject) {
      const owner = this.findObjectOwnerById?.(this.activeObject);
      if (owner?.object) {
        const type = owner.inline && owner.object.kind === KINDS.LIST
          ? "inline-list"
          : owner.inline && owner.object.kind === KINDS.LINE ? "inline-line" : "object";
        return { type, owner, item: owner.object };
      }
    }

    const selectedKind = document.getElementById("objectKindSelect")?.value;
    if (selectedKind === KINDS.WATERMARK && this.document?.watermark)
      return { type: "watermark", item: this.document.watermark };

    return null;
  },

  copySelectedObjectToInternalClipboard() {
    const selected = this.getSelectedObjectForClipboard();
    if (!selected) return false;

    if (selected.type === "textbox") {
      this.internalClipboard = {
        type: "textbox",
        isCut: false,
        sourceSubparagraphId: selected.owner.subparagraph.id,
        data: this.cloneForClipboard(selected.item)
      };
    } else if (selected.type === "inline-list") {
      this.internalClipboard = {
        type: "inline-list",
        isCut: false,
        sourceSubparagraphId: selected.owner.subparagraph.id,
        data: this.getInlineListSubtree(selected.owner, selected.item.id)
      };
    } else if (selected.type === "inline-line") {
      this.internalClipboard = {
        type: "inline-line",
        isCut: false,
        sourceSubparagraphId: selected.owner.subparagraph.id,
        data: this.cloneForClipboard(selected.item)
      };
    } else if (selected.type === "watermark") {
      this.internalClipboard = {
        type: "watermark",
        isCut: false,
        data: this.cloneForClipboard(selected.item)
      };
    } else {
      const isSubparagraphObject = selected.item === selected.owner.subparagraph.object;
      this.internalClipboard = {
        type: "object",
        isCut: false,
        sourceSubparagraphId: selected.owner.subparagraph.id,
        data: {
          object: this.cloneForClipboard(selected.item),
          textboxes: isSubparagraphObject && !selected.owner.table
            ? this.cloneForClipboard(selected.owner.subparagraph.textboxes || [])
            : []
        }
      };
    }

    this.renderStatePanel?.("Objeto copiado.");
    return true;
  },

  copyActiveSubparagraphToInternalClipboard() {
    const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
    if (!owner?.subparagraph) return false;

    this.internalClipboard = {
      type: "subparagraph",
      data: this.cloneForClipboard(owner.subparagraph)
    };

    this.renderStatePanel?.("Subparágrafo copiado.");
    return true;
  },

  setClipboardSelection(owner, options = {}) {
    if (!owner) return;
    this.activeSection = owner.section.id;
    this.activeParagraph = owner.paragraph.id;
    this.activeSubparagraph = owner.subparagraph.id;
    this.activeTextbox = options.activeTextbox ?? null;
    this.activeObject = options.activeObject ?? null;
    this.activeEditTargetKind = null;
    this.activeTableSelection = options.activeTableSelection ?? null;
    this.activeTableCellCaret = options.activeTableCellCaret ?? null;
    this.objectEditMode = false;
  },

  pasteCopiedObject() {
    const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
    const clipboardData = this.internalClipboard?.data;
    if (!owner?.subparagraph || !clipboardData?.object) return false;

    const object = this.cloneForClipboard(clipboardData.object);
    const textboxes = this.cloneForClipboard(clipboardData.textboxes || []);
    const idMap = new Map();
    this.renewIdsForPastedObject(object, idMap);
    this.renewIdsForPastedObject(textboxes, idMap);
    this.renewTableCellTextboxReferences(textboxes, idMap);

    if (object.kind === KINDS.IMAGE) {
      const cellTarget = this.getActiveTableCellForObjectInsertion?.();
      const cellIsEmpty = cellTarget &&
        normalizeEditableHtml(cellTarget.table.cells?.[cellTarget.rowIndex]?.[cellTarget.colIndex] ?? "") === "" &&
        !cellTarget.table.cellObjects?.[cellTarget.rowIndex]?.[cellTarget.colIndex];
      if (cellIsEmpty && this.insertObjectIntoActiveTableCellIfPossible?.(object)) return true;
    }

    let target = owner.subparagraph;
    const hasText = target.contentKind === CONTENT_KIND.TEXT && normalizeEditableHtml(target.textHtml) !== "";
    const hasObject = target.contentKind === CONTENT_KIND.OBJECT && target.object;

    if (hasText || hasObject) {
      target = createSubparagraph();
      owner.paragraph.subparagraphs.splice(owner.subparagraphIndex + 1, 0, target);
    }

    target.contentKind = CONTENT_KIND.OBJECT;
    target.textHtml = "";
    target.runs = [];
    target.object = object;
    target.textboxes = textboxes;

    const pastedOwner = {
      section: owner.section,
      paragraph: owner.paragraph,
      subparagraph: target
    };
    this.setClipboardSelection(pastedOwner, { activeObject: object.id });
    const renderOptions = object.kind === KINDS.TABLE ? { focusFirstTableCell: object.id } : {};
    this.render(`${object.kind} colado.`, false, renderOptions);
    return true;
  },

  pasteCopiedTextbox() {
    const sourceId = this.internalClipboard?.sourceSubparagraphId;
    const textboxData = this.internalClipboard?.data;
    if (!textboxData) return false;

    const activeOwner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
    const sourceOwner = this.findSubparagraphOwnerById?.(sourceId);
    const hasObject = owner => owner?.subparagraph?.contentKind === CONTENT_KIND.OBJECT && owner.subparagraph.object;
    let owner = hasObject(activeOwner) ? activeOwner : sourceOwner;
    if (!hasObject(owner)) return false;

    const textbox = this.cloneForClipboard(textboxData);
    this.renewIdsForPastedObject(textbox);

    const cellTarget = this.getActiveTableCellForObjectInsertion?.();
    if (cellTarget && activeOwner === cellTarget.owner && hasObject(activeOwner)) {
      textbox.tableCell = {
        tableId: cellTarget.table.id,
        rowIndex: cellTarget.rowIndex,
        colIndex: cellTarget.colIndex
      };
      if (!this.internalClipboard.isCut) {
        textbox.x = (Number(textbox.x) || 0) + 12;
        textbox.y = (Number(textbox.y) || 0) + 12;
      }
    } else if (textbox.tableCell) {
      const targetTable = owner.subparagraph.object?.kind === KINDS.TABLE
        ? owner.subparagraph.object
        : null;
      if (targetTable?.id === textbox.tableCell.tableId) {
        if (!this.internalClipboard.isCut) {
          textbox.x = (Number(textbox.x) || 0) + 12;
          textbox.y = (Number(textbox.y) || 0) + 12;
        }
      } else {
        delete textbox.tableCell;
        if (!this.internalClipboard.isCut) {
          textbox.x = (Number(textbox.x) || 0) + 16;
          textbox.y = (Number(textbox.y) || 0) + 16;
        }
      }
    } else if (!this.internalClipboard.isCut) {
      textbox.x = (Number(textbox.x) || 0) + 16;
      textbox.y = (Number(textbox.y) || 0) + 16;
    }

    owner.subparagraph.textboxes ||= [];
    owner.subparagraph.textboxes.push(textbox);
    this.setClipboardSelection(owner, { activeTextbox: textbox.id });
    this.render("Caixa de texto colada.");
    return true;
  },

  pasteInlineTextboxAtCaret() {
    const textboxData = this.internalClipboard?.data;
    const insertion = this.getTextInsertionCaret?.();
    if (!textboxData || !insertion) return false;

    const owner = this.findSubparagraphOwnerById?.(insertion.subparagraphId);
    if (!owner?.subparagraph || owner.subparagraph.contentKind === CONTENT_KIND.OBJECT) return false;

    const textbox = this.cloneForClipboard(textboxData);
    this.renewIdsForPastedObject(textbox);
    textbox.inline = true;
    textbox.alignment = ["left", "center", "right"].includes(textbox.alignment)
      ? textbox.alignment
      : textbox.floatSide === "left" ? "left" : "right";
    delete textbox.floatSide;
    textbox.x = 0;
    textbox.y = 0;
    delete textbox.tableCell;

    const anchor = document.createElement("span");
    anchor.className = "textbox-anchor";
    anchor.dataset.inlineTextboxAnchor = textbox.id;
    anchor.contentEditable = "false";
    insertion.range.insertNode(anchor);

    owner.subparagraph.inlineTextboxes ||= [];
    owner.subparagraph.inlineTextboxes.push(textbox);
    this.activeSection = owner.section.id;
    this.activeParagraph = owner.paragraph.id;
    this.activeSubparagraph = owner.subparagraph.id;
    this.activeTextbox = null;
    this.activeObject = null;
    this.activeEditTargetKind = null;
    this.objectEditMode = false;
    this.hideObjectEditOverlay?.();
    this.onSubparagraphInput?.({ currentTarget: insertion.editable }, insertion.editable);
    this.render("Caixa de texto colada na posição do cursor.");

    requestAnimationFrame(() => {
      const editable = document.querySelector(`[data-text-subparagraph-id="${owner.subparagraph.id}"]`);
      const element = editable?.querySelector(`[data-textbox-id="${textbox.id}"][data-inline-textbox="true"]`);
      if (!editable || !element) return;

      editable.focus();
      const range = document.createRange();
      range.setStartAfter(element);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    return true;
  },

  pasteInlineListAtCaret() {
    const listData = this.internalClipboard?.data;
    const insertion = this.getTextInsertionCaret?.();
    if (!listData || !insertion) return false;

    const owner = this.findSubparagraphOwnerById?.(insertion.subparagraphId);
    if (!owner?.subparagraph || owner.subparagraph.contentKind === CONTENT_KIND.OBJECT) return false;

    const payload = listData.root
      ? this.cloneForClipboard(listData)
      : { root: this.cloneForClipboard(listData), sublists: [] };
    const list = payload.root;
    const pastedLists = [list, ...(Array.isArray(payload.sublists) ? payload.sublists : [])];
    this.renewIdsForPastedObject(pastedLists);
    delete list.parentListId;
    delete list.parentItemId;
    if (!["left", "center", "right"].includes(list.alignment))
      list.alignment = list.placement === "aligned"
        ? list.floatSide === "left" ? "left" : "right"
        : "left";
    delete list.placement;
    delete list.floatSide;
    delete list.x;
    delete list.y;
    owner.subparagraph.inlineLists ||= [];
    owner.subparagraph.inlineLists.push(...pastedLists);

    const anchor = document.createElement("span");
    anchor.className = "list-anchor";
    anchor.dataset.inlineListAnchor = list.id;
    anchor.contentEditable = "false";
    const insertionRange = this.getEndOfVisualLineRange?.(insertion) || insertion.range;
    insertionRange.insertNode(anchor);

    this.activeSection = owner.section.id;
    this.activeParagraph = owner.paragraph.id;
    this.activeSubparagraph = owner.subparagraph.id;
    this.activeObject = list.id;
    this.activeTextbox = null;
    this.activeEditTargetKind = null;
    this.objectEditMode = false;
    this.hideObjectEditOverlay?.();
    this.onSubparagraphInput?.({ currentTarget: insertion.editable }, insertion.editable);
    this.render("Lista alinhada colada na posição do cursor.");

    requestAnimationFrame(() => {
      const editable = document.querySelector(`[data-text-subparagraph-id="${owner.subparagraph.id}"]`);
      const element = editable?.querySelector(`[data-inline-list-id="${list.id}"]`);
      if (!editable || !element) return;

      editable.focus();
      const range = document.createRange();
      range.setStartAfter(element);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });

    return true;
  },

  pasteInlineLineAtCaret() {
    const lineData = this.internalClipboard?.data;
    const insertion = this.getTextInsertionCaret?.();
    if (!lineData || !insertion) return false;
    const owner = this.findSubparagraphOwnerById?.(insertion.subparagraphId);
    if (owner?.subparagraph?.contentKind !== CONTENT_KIND.TEXT) return false;

    const line = this.cloneForClipboard(lineData);
    this.renewIdsForPastedObject(line);
    line.kind = KINDS.LINE;
    owner.subparagraph.inlineLines ||= [];
    owner.subparagraph.inlineLines.push(line);

    const anchor = document.createElement("span");
    anchor.className = "line-anchor";
    anchor.dataset.inlineLineAnchor = line.id;
    anchor.contentEditable = "false";
    insertion.range.insertNode(anchor);

    this.activeSection = owner.section.id;
    this.activeParagraph = owner.paragraph.id;
    this.activeSubparagraph = owner.subparagraph.id;
    this.activeObject = line.id;
    this.activeTextbox = null;
    this.activeEditTargetKind = null;
    this.objectEditMode = false;
    this.hideObjectEditOverlay?.();
    this.onSubparagraphInput?.({ currentTarget: insertion.editable }, insertion.editable);
    this.render("Linha colada na posição do cursor.");
    return true;
  },

  pasteInternalClipboardAfterActiveSubparagraph() {
    if (!this.internalClipboard) return false;

    if (this.internalClipboard.type === "object") return this.pasteCopiedObject();
    if (this.internalClipboard.type === "inline-list") return this.pasteInlineListAtCaret();
    if (this.internalClipboard.type === "inline-line") return this.pasteInlineLineAtCaret();
    if (this.internalClipboard.type === "textbox") {
      return this.internalClipboard.data?.inline
        ? this.pasteInlineTextboxAtCaret()
        : this.pasteCopiedTextbox();
    }

    if (this.internalClipboard.type === "watermark") {
      this.document.watermark = this.cloneForClipboard(this.internalClipboard.data);
      this.renewIdsForPastedObject(this.document.watermark);
      this.render("Marca d'água colada.");
      return true;
    }

    if (this.internalClipboard.type !== "subparagraph") return false;

    const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
    if (!owner?.paragraph) return false;

    const pasted = this.renewIdsForPastedSubparagraph(this.cloneForClipboard(this.internalClipboard.data));
    owner.paragraph.subparagraphs.splice(owner.subparagraphIndex + 1, 0, pasted);

    this.activeSection = owner.section.id;
    this.activeParagraph = owner.paragraph.id;
    this.activeSubparagraph = pasted.id;
    this.activeTextbox = null;
    this.activeObject = pasted.object?.id || null;
    this.activeEditTargetKind = null;
    this.activeTableSelection = null;
    this.objectEditMode = false;

    this.render("Subparágrafo colado.", false, { focusActiveEditableSubparagraph: true });
    this.updateJsonOutput?.();
    return true;
  },

  removeSelectedObjectForClipboard() {
    const selected = this.getSelectedObjectForClipboard();
    if (!selected) return false;

    if (selected.type === "watermark") {
      this.document.watermark = null;
      this.render("Marca d'água recortada.");
      return true;
    }

    if (selected.type === "textbox") {
      const { owner } = selected;
      if (owner.inline) {
        const element = document.querySelector(`[data-inline-textbox="true"][data-textbox-id="${selected.item.id}"]`);
        const editable = element?.closest?.("[data-text-subparagraph-id]");
        let caretRange = null;
        if (element && editable) {
          caretRange = document.createRange();
          caretRange.setStartBefore(element);
          caretRange.collapse(true);
          element.remove();
        } else {
          const container = document.createElement("div");
          container.innerHTML = owner.subparagraph.textHtml || "";
          container.querySelector(`[data-inline-textbox-anchor="${selected.item.id}"]`)?.remove();
          owner.subparagraph.textHtml = container.innerHTML;
        }

        owner.subparagraph.inlineTextboxes.splice(owner.textboxIndex, 1);
        this.setClipboardSelection(owner);
        this.hideObjectEditOverlay?.();
        if (editable) {
          this.onSubparagraphInput?.({ currentTarget: editable }, editable);
          editable.focus();
          if (caretRange) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(caretRange);
          }
        }
        this.renderStatePanel?.("Caixa de texto recortada.");
        this.updateToolbarState?.();
        this.updateJsonOutput?.();
        return true;
      }

      owner.subparagraph.textboxes.splice(owner.textboxIndex, 1);
      this.setClipboardSelection(owner, { activeObject: owner.subparagraph.object?.id || null });
      this.render("Caixa de texto recortada.");
      return true;
    }

    if (selected.type === "inline-list") {
      const { owner } = selected;
      const element = document.querySelector(`[data-inline-list-id="${selected.item.id}"]`);
      const editable = element?.closest?.("[data-text-subparagraph-id]");
      if (element) element.remove();
      const removedIds = new Set([selected.item.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const list of owner.subparagraph.inlineLists || []) {
          if (!removedIds.has(list.id) && removedIds.has(list.parentListId)) {
            removedIds.add(list.id);
            changed = true;
          }
        }
      }
      owner.subparagraph.inlineLists = (owner.subparagraph.inlineLists || [])
        .filter(list => !removedIds.has(list.id));
      this.setClipboardSelection(owner);
      if (editable) this.onSubparagraphInput?.({ currentTarget: editable }, editable);
      this.renderStatePanel?.("Lista recortada.");
      this.updateToolbarState?.();
      this.updateJsonOutput?.();
      return true;
    }

    if (selected.type === "inline-line") {
      const { owner } = selected;
      const element = document.querySelector(`[data-inline-line-id="${selected.item.id}"]`);
      const editable = element?.closest?.("[data-text-subparagraph-id]");
      element?.remove();
      owner.subparagraph.inlineLines = (owner.subparagraph.inlineLines || [])
        .filter(line => line.id !== selected.item.id);
      this.setClipboardSelection(owner);
      if (editable) this.onSubparagraphInput?.({ currentTarget: editable }, editable);
      this.renderStatePanel?.("Linha recortada.");
      this.updateToolbarState?.();
      this.updateJsonOutput?.();
      return true;
    }

    const { owner } = selected;
    if (owner.table) {
      owner.table.cellObjects[owner.rowIndex][owner.colIndex] = null;
      this.setClipboardSelection(owner, {
        activeObject: owner.table.id,
        activeTableSelection: {
          tableId: owner.table.id,
          kind: EDIT_TARGET_KIND.TABLE_CELL,
          rowIndex: owner.rowIndex,
          colIndex: owner.colIndex
        },
        activeTableCellCaret: {
          tableId: owner.table.id,
          rowIndex: owner.rowIndex,
          colIndex: owner.colIndex
        }
      });
      this.render(`${selected.item.kind} recortado.`);
      return true;
    }

    owner.subparagraph.contentKind = CONTENT_KIND.EMPTY;
    owner.subparagraph.object = null;
    owner.subparagraph.textboxes = [];
    owner.subparagraph.textHtml = "";
    owner.subparagraph.runs = [];
    this.setClipboardSelection(owner);
    this.render("Objeto recortado.", false, { focusActiveEditableSubparagraph: true });
    return true;
  },

  handleCopyShortcut(event) {
    if (this.hasNonCollapsedSelection()) {
      this.internalClipboard = null;
      return false;
    }

    const selected = this.getSelectedObjectForClipboard();
    if (this.hasNativeClipboardTarget() && !(selected?.owner?.inline && ["textbox", "inline-list", "inline-line"].includes(selected?.type))) return false;

    if (this.copySelectedObjectToInternalClipboard()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return true;
    }

    if (!this.copyActiveSubparagraphToInternalClipboard()) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return true;
  },

  handlePasteShortcut(event) {
    if (this.hasNonCollapsedSelection()) return false;
    if (this.internalClipboard?.type === "inline-list" && this.pasteInlineListAtCaret()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return true;
    }
    if (this.internalClipboard?.type === "inline-line" && this.pasteInlineLineAtCaret()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return true;
    }
    if (this.internalClipboard?.type === "textbox" && this.internalClipboard.data?.inline && this.pasteInlineTextboxAtCaret()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return true;
    }
    if (this.hasNativeClipboardTarget()) return false;
    if (!this.internalClipboard || !this.pasteInternalClipboardAfterActiveSubparagraph()) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return true;
  },

  handleCutShortcut(event) {
    if (this.hasNonCollapsedSelection()) {
      this.internalClipboard = null;
      return false;
    }

    const selected = this.getSelectedObjectForClipboard();
    if (this.hasNativeClipboardTarget() && !(selected?.owner?.inline && ["textbox", "inline-list", "inline-line"].includes(selected?.type))) return false;

    if (this.getSelectedObjectForClipboard()) {
      if (!this.copySelectedObjectToInternalClipboard() || !this.removeSelectedObjectForClipboard()) return false;
      this.internalClipboard.isCut = true;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return true;
    }

    if (!this.copyActiveSubparagraphToInternalClipboard()) return false;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    this.removeActiveSubparagraph?.();
    this.renderStatePanel?.("Subparágrafo recortado.");
    this.updateJsonOutput?.();
    return true;
  }
});
