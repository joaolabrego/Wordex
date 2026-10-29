"use strict";

Object.assign(wordex, {
bindToolbar() {
        document.getElementById("btnNewObject").addEventListener("click", () => this.addSelectedObjectKind());
        const objectKindSelect = document.getElementById("objectKindSelect");
        objectKindSelect.addEventListener("pointerdown", event => this.captureTextInsertionCaret?.(event));
        objectKindSelect.addEventListener("keydown", event => this.captureTextInsertionCaret?.(event));
        objectKindSelect.addEventListener("change", () => this.addSelectedObjectKind());
        const newObjectButton = document.getElementById("btnNewObject");
        newObjectButton.addEventListener("pointerdown", event => this.captureTextInsertionCaret?.(event));
        document.getElementById("btnRemoveObject").addEventListener("click", () => this.removeSelectedObject());
        document.getElementById("btnLoadDataJson")?.addEventListener("click", () => this.openDataJsonFileDialog());
        document.getElementById("btnLoadTemplate")?.addEventListener("click", () => this.openTemplateHtmlFileDialog?.());
        document.getElementById("btnSaveTemplate")?.addEventListener("click", () => this.saveTemplateHtml?.());
        document.getElementById("btnRenderReportHtml")?.addEventListener("click", () => this.renderReportHtml?.());
        document.getElementById("dataJsonFileInput")?.addEventListener("change", event => this.onDataJsonFileSelected(event));
        document.getElementById("templateHtmlFileInput")?.addEventListener("change", event => this.onTemplateHtmlFileSelected?.(event));
        document.getElementById("dataFieldSelect")?.addEventListener("change", event => this.onDataFieldChanged(event));
        document.getElementById("btnMergeTableCells")?.addEventListener("click", () => this.mergeSelectedTableCells?.());
        document.getElementById("btnUnmergeTableRow")?.addEventListener("click", () => this.unmergeCurrentTableRow?.());
        document.getElementById("tableRowVisibilityCheckbox")?.addEventListener("change", event => this.setActiveTableRowVisible?.(event.currentTarget.checked));
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphLeft", "left");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphCenter", "center");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphRight", "right");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphJustify", "justify");
        const borderApplySelect = document.getElementById("borderApplySelect");
        const borderWidthInput = document.getElementById("borderWidthInput");
        const borderStyleSelect = document.getElementById("borderStyleSelect");
        const borderRadiusInput = document.getElementById("borderRadiusInput");
        const borderColorInput = document.getElementById("borderColorInput");
        const borderApplyButton = document.getElementById("btnApplyBorder");
        [borderApplySelect, borderWidthInput, borderStyleSelect, borderRadiusInput, borderColorInput, borderApplyButton].forEach(control => {
          if (!control) return;
          ["pointerdown", "mousedown", "click"].forEach(eventName => {
            control.addEventListener(eventName, event => event.stopPropagation());
          });
        });
        borderApplySelect?.addEventListener("change", () => this.syncBorderControls(true));
        borderApplyButton?.addEventListener("mousedown", event => event.preventDefault());
        borderApplyButton?.addEventListener("click", () => this.applySelectedBorder(borderApplySelect));
        ["margin", "padding"].forEach(kind => {
          const applySelect = document.getElementById(kind === "margin" ? "marginApplySelect" : "paddingApplySelect");
          const sizeInput = document.getElementById(kind === "margin" ? "marginSizeInput" : "paddingSizeInput");
          const applyButton = document.getElementById(kind === "margin" ? "btnApplyMargin" : "btnApplyPadding");
          [applySelect, sizeInput, applyButton].forEach(control => {
            if (!control) return;
            ["pointerdown", "mousedown", "click"].forEach(eventName => {
              control.addEventListener(eventName, event => event.stopPropagation());
            });
          });
          applySelect?.addEventListener("change", () => {
            if (kind === "margin") this.syncMarginSizeInput(true);
            else this.syncPaddingSizeInput(true);
          });
          applyButton?.addEventListener("mousedown", event => event.preventDefault());
          applyButton?.addEventListener("click", () => this.applySelectedSpacing(kind, applySelect));
        });
        document.getElementById("paperFormatSelect").addEventListener("change", event => this.setPaperFormat(event.currentTarget.value));
        document.getElementById("pageOrientationSelect").addEventListener("change", event => this.setPageOrientation(event.currentTarget.value));
        const textFontSelect = document.getElementById("textFontSelect");
        const textSizeInput = document.getElementById("textSizeInput");
        const applyTextStyleButton = document.getElementById("btnApplyTextStyle");
        [textFontSelect, textSizeInput, applyTextStyleButton].forEach(control => {
          if (!control) return;
          control.addEventListener("pointerdown", () => this.capturePendingTextStyleRange());
          ["pointerdown", "mousedown", "click"].forEach(eventName => {
            control.addEventListener(eventName, event => event.stopPropagation());
          });
        });
        applyTextStyleButton?.addEventListener("mousedown", event => event.preventDefault());
        applyTextStyleButton?.addEventListener("click", () => this.applySelectedControlTextStyle());
        document.addEventListener("pointerdown", event => {
          const target = event.target instanceof Element ? event.target : event.target?.parentElement;
          if (this.isToolbarNumberInput(target) || target?.closest?.("#btnApplyBorder, #btnApplyMargin, #btnApplyPadding, #btnApplyTextStyle, #btnAlignSubparagraphLeft, #btnAlignSubparagraphCenter, #btnAlignSubparagraphRight, #btnAlignSubparagraphJustify")) {
            this.capturePreservedTextRange();
          }
          if (!this.isToolbarNumberInput(target)) return;
          this.capturePendingTextStyleRange();
          requestAnimationFrame(() => this.paintPendingTextHighlight());
        }, true);
        document.addEventListener("focusin", event => {
          if (!this.isToolbarNumberInput(event.target)) return;
          this.capturePendingTextStyleRange();
          this.paintPendingTextHighlight();
        });
        document.getElementById("page")?.addEventListener("pointerdown", () => {
          this.releasePendingTextStyleRange();
          this.preservedTextRange = null;
        }, true);
        this.bindTextCommandButton("btnTextBold", () => this.applySelectedTextCommand("bold"));
        this.bindTextCommandButton("btnTextItalic", () => this.applySelectedTextCommand("italic"));
        this.bindTextCommandButton("btnTextUnderline", () => this.applySelectedTextCommand("underline"));
        this.bindTextCommandButton("btnTextCase", () => this.clearSelectedTextFormatting());
        this.bindTextColorInput(document.getElementById("textColorInput"));
        document.addEventListener("selectionchange", () => {
          this.rememberEditableTextRange();
          this.updateTextCommandButtonsVisibility();
          this.syncSubparagraphAlignmentControls?.();
        });
        this.updateTextCommandButtonsVisibility();
      },


bindSubparagraphAlignmentButton(buttonId, alignment) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        let pendingTextboxId = null;
        let pendingSelection = null;
        button.addEventListener("pointerdown", () => {
          const activeTextbox = document.querySelector(".textbox.is-active[data-textbox-id]")
            || document.activeElement?.closest?.("[data-textbox-id]")
            || (() => {
              const selection = window.getSelection?.();
              const node = selection?.anchorNode;
              const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
              return element?.closest?.("[data-textbox-id]") || null;
            })();
          pendingTextboxId = activeTextbox?.dataset.textboxId || this.activeTextbox || null;
          pendingSelection = this.captureCurrentEditableSelection?.() || null;
        });
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => {
          const textboxId = pendingTextboxId;
          const savedSelection = pendingSelection;
          pendingTextboxId = null;
          pendingSelection = null;
          this.setActiveSubparagraphTextAlignment(alignment, textboxId, savedSelection);
        });
      },

getActiveSubparagraphObjectAlignmentTarget() {
        if (!this.activeObject) return null;
        const owner = this.findObjectOwnerById?.(this.activeObject);
        if (!owner?.object || owner.table) return null;
        if (owner.object.kind === KINDS.TABLE &&
            !(this.objectEditMode && this.activeEditTargetKind === EDIT_TARGET_KIND.MAIN_OBJECT)) {
          return null;
        }
        return owner;
      },

setActiveSubparagraphTextAlignment(alignment, selectedTextboxId = null, savedSelection = null) {
        if (!SUBPARAGRAPH_TEXT_ALIGNMENTS.includes(alignment)) return;

        const selection = window.getSelection?.();
        const selectedTextboxContent = this.getSelectedTextboxText?.();
        if (selectedTextboxContent?.owner?.textbox) {
          const { owner, content } = selectedTextboxContent;
          if (!this.applySelectedTextboxLineAlignment?.(selectedTextboxContent, alignment)) return;
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = owner.textbox.id;
          this.activeObject = null;
          delete owner.textbox.textAlign;
          content.style.textAlign = "";
          this.onTextboxInput?.({ currentTarget: content }, content);
          this.renderStatePanel("Alinhamento aplicado às linhas selecionadas dentro da caixa.");
          this.updateJsonOutput?.();
          this.syncSubparagraphAlignmentControls?.();
          return;
        }

        const selectionNode = selection?.anchorNode;
        const selectionElement = selectionNode?.nodeType === Node.ELEMENT_NODE
          ? selectionNode
          : selectionNode?.parentElement;
        const textboxElement = document.querySelector(".textbox.is-active[data-textbox-id]")
          || document.activeElement?.closest?.("[data-textbox-id]")
          || selectionElement?.closest?.("[data-textbox-id]");
        const textboxId = selectedTextboxId || textboxElement?.dataset.textboxId || this.activeTextbox;
        const textboxOwner = textboxId
          ? this.findTextboxOwnerById?.(textboxId)
          : null;
        if (textboxOwner?.textbox) {
          if (!["left", "center", "right"].includes(alignment)) return;
          this.activeSection = textboxOwner.section.id;
          this.activeParagraph = textboxOwner.paragraph.id;
          this.activeSubparagraph = textboxOwner.subparagraph.id;
          this.activeTextbox = textboxOwner.textbox.id;

          if (textboxOwner.inline) {
            textboxOwner.textbox.alignment = alignment;
            delete textboxOwner.textbox.floatSide;
          } else {
            const element = textboxElement || [...document.querySelectorAll("[data-textbox-id]")]
              .find(item => item.dataset.textboxId === textboxOwner.textbox.id);
            const area = textboxOwner.tableCell
              ? element?.closest(".table-cell-textbox-area")
              : element?.closest(".subparagraph[data-subparagraph-id]");
            const availableWidth = area?.clientWidth || 0;
            const textboxWidth = Number(textboxOwner.textbox.width) || element?.offsetWidth || 0;
            const remainingWidth = Math.max(0, availableWidth - textboxWidth);
            textboxOwner.textbox.horizontalAlign = alignment;
            textboxOwner.textbox.x = alignment === "right"
              ? remainingWidth
              : alignment === "center" ? remainingWidth / 2 : 0;
          }

          this.renderKeepingTextRange(alignment === "center"
            ? (textboxOwner.inline ? "Caixa de texto centralizada em linha própria." : "Caixa de texto centralizada no subparágrafo.")
            : (textboxOwner.inline ? "Caixa de texto alinhada com o texto fluindo ao lado oposto." : "Caixa de texto alinhada no subparágrafo."));
          this.positionObjectEditOverlay?.();
          this.syncSubparagraphAlignmentControls?.();
          this.updateJsonOutput?.();
          return;
        }

        const objectOwner = this.getActiveSubparagraphObjectAlignmentTarget?.();
        if (objectOwner?.object) {
          if (!["left", "center", "right"].includes(alignment)) return;
          if (objectOwner.inline && objectOwner.object.kind === KINDS.LIST) {
            if (objectOwner.object.parentListId) {
              this.renderStatePanel("O alinhamento da sublista acompanha o item pai.");
              return;
            }
            objectOwner.object.alignment = alignment;
            delete objectOwner.object.placement;
            delete objectOwner.object.floatSide;
            delete objectOwner.object.x;
            delete objectOwner.object.y;
            this.renderKeepingTextRange("Alinhamento da lista atualizado.");
            this.syncSubparagraphAlignmentControls?.();
            this.updateJsonOutput?.();
            return;
          }
          objectOwner.object.horizontalAlign = alignment;
          objectOwner.object.x = 0;
          const area = document.querySelector(`[data-subparagraph-id="${objectOwner.subparagraph.id}"] .object-area`);
          if (area) area.dataset.objectAlign = alignment;
          const element = document.querySelector(`[data-main-object-id="${objectOwner.object.id}"]`);
          if (element) element.style.transform = `translate(0px, ${Number(objectOwner.object.y) || 0}px)`;
          this.renderKeepingTextRange("Alinhamento do objeto atualizado.");
          this.positionObjectEditOverlay?.();
          this.updateJsonOutput?.();
          this.syncSubparagraphAlignmentControls?.();
          return;
        }

        if (this.applyActiveTableTextAlignment?.(alignment)) {
          // Não recria a tabela aqui: isso substituiria a célula focada e
          // apagaria o caret/seleção de texto do usuário.
          this.renderStatePanel("Alinhamento da seleção da tabela atualizado.");
          this.updateJsonOutput?.();
          this.syncSubparagraphAlignmentControls?.();
          return;
        }

        const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        if (!subparagraph) return;

        subparagraph.textAlign = alignment;
        this.renderKeepingTextRange("Alinhamento do subparágrafo atualizado.");
        this.updateJsonOutput?.();
        this.syncSubparagraphAlignmentControls?.();
      },

getSelectedTextboxText() {
        const selection = window.getSelection?.();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

        const getContent = node => {
          const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
          return element?.closest?.("[data-textbox-content]") || null;
        };
        const anchorContent = getContent(selection.anchorNode);
        const focusContent = getContent(selection.focusNode);
        if (!anchorContent || anchorContent !== focusContent) return null;

        if (!selection.toString()) return null;

        const owner = this.findTextboxOwnerById?.(anchorContent.dataset.textboxContent);
        if (!owner?.textbox) return null;

        const range = selection.getRangeAt(0).cloneRange();
        const anchorElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
          ? selection.anchorNode
          : selection.anchorNode?.parentElement;
        const alignedLine = anchorElement?.closest?.("[data-wordex-textbox-line-align]");
        return {
          owner,
          content: anchorContent,
          range,
          selection,
          alignment: alignedLine?.dataset.wordexTextboxLineAlign || owner.textbox.textAlign || "left"
        };
      },

applySelectedTextboxLineAlignment(selected, alignment) {
        const { content, range, selection, owner } = selected || {};
        if (!content || !range || !selection || range.collapsed) return false;

        const selectedRects = [...range.getClientRects()].filter(rect => rect.height > 0);
        if (!selectedRects.length) return false;
        const selectedTops = selectedRects.map(rect => rect.top);
        const lines = new Map();
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        let textNode;

        while ((textNode = walker.nextNode())) {
          for (let offset = 0; offset < textNode.data.length;) {
            const codePoint = textNode.data.codePointAt(offset);
            const nextOffset = offset + (codePoint > 0xffff ? 2 : 1);
            const characterRange = document.createRange();
            characterRange.setStart(textNode, offset);
            characterRange.setEnd(textNode, nextOffset);
            const rect = [...characterRange.getClientRects()].find(item => item.height > 0);

            if (rect) {
              const selectedTop = selectedTops.find(top => Math.abs(top - rect.top) <= 2);
              if (selectedTop !== undefined) {
                const key = Math.round(rect.top * 2) / 2;
                const line = lines.get(key) || { top: rect.top, start: null, end: null, wrapper: null };
                if (!line.start) line.start = { node: textNode, offset };
                line.end = { node: textNode, offset: nextOffset };
                lines.set(key, line);
              }
            }

            offset = nextOffset;
          }
        }

        const orderedLines = [...lines.values()].sort((left, right) => left.top - right.top);
        if (!orderedLines.length) return false;

        for (const line of [...orderedLines].reverse()) {
          const startElement = line.start.node.parentElement;
          const endElement = line.end.node.parentElement;
          const existingStart = startElement?.closest?.("[data-wordex-textbox-line-align]");
          const existingEnd = endElement?.closest?.("[data-wordex-textbox-line-align]");

          if (existingStart && existingStart === existingEnd && content.contains(existingStart)) {
            existingStart.dataset.wordexTextboxLineAlign = alignment;
            existingStart.style.textAlign = alignment;
            existingStart.style.display = "block";
            existingStart.style.width = "100%";
            line.wrapper = existingStart;
            continue;
          }

          const lineRange = document.createRange();
          lineRange.setStart(line.start.node, line.start.offset);
          lineRange.setEnd(line.end.node, line.end.offset);
          const wrapper = document.createElement("div");
          wrapper.className = "textbox-aligned-line";
          wrapper.dataset.wordexTextboxLineAlign = alignment;
          wrapper.style.display = "block";
          wrapper.style.width = "100%";
          wrapper.style.boxSizing = "border-box";
          wrapper.style.textAlign = alignment;
          wrapper.appendChild(lineRange.extractContents());
          lineRange.insertNode(wrapper);
          line.wrapper = wrapper;
        }

        const wrappers = [...new Set(orderedLines.map(line => line.wrapper).filter(Boolean))];
        if (!wrappers.length) return false;

        const alignedSelection = document.createRange();
        alignedSelection.setStartBefore(wrappers[0]);
        alignedSelection.setEndAfter(wrappers[wrappers.length - 1]);
        selection.removeAllRanges();
        selection.addRange(alignedSelection);
        delete owner.textbox.textAlign;
        content.style.textAlign = "";
        return true;
      },

getActiveTableForTextAlignment() {
        const focusedCell = document.activeElement?.closest?.("[data-table-cell]");
        const focusedTableId = focusedCell?.dataset?.tableCell || null;
        const tableId = this.activeTableSelection?.tableId || focusedTableId || this.activeObject;
        if (!tableId) return null;
        const owner = this.findObjectOwnerById?.(tableId);
        if (owner?.table) {
          return {
            owner,
            table: owner.table,
            cell: { row: owner.rowIndex, col: owner.colIndex }
          };
        }
        const table = owner?.object;
        if (!table || table.kind !== KINDS.TABLE) return null;
        const caretSource = focusedCell?.dataset?.tableCell === table.id
          ? { rowIndex: Number(focusedCell.dataset.row), colIndex: Number(focusedCell.dataset.col) }
          : this.activeTableCellCaret?.tableId === table.id
            ? this.activeTableCellCaret
            : null;
        const caret = caretSource && Number.isFinite(Number(caretSource.rowIndex)) && Number.isFinite(Number(caretSource.colIndex))
          ? {
              row: Math.min(Math.max(0, Number(caretSource.rowIndex)), table.rows - 1),
              col: Math.min(Math.max(0, Number(caretSource.colIndex)), table.cols - 1)
            }
          : null;
        return { owner, table, cell: caret };
      },

getTableTextAlignmentTargetCells(table) {
        const selection = this.activeTableSelection?.tableId === table.id ? this.activeTableSelection : null;
        const targetKind = this.activeEditTargetKind || selection?.kind || EDIT_TARGET_KIND.MAIN_OBJECT;
        const cells = [];
        const pushCell = (row, col) => {
          const safeRow = Math.min(Math.max(0, Number(row) || 0), Math.max(0, table.rows - 1));
          const safeCol = Math.min(Math.max(0, Number(col) || 0), Math.max(0, table.cols - 1));
          cells.push({ row: safeRow, col: safeCol });
        };

        if (selection && targetKind === EDIT_TARGET_KIND.TABLE_ROW) {
          for (let col = 0; col < table.cols; col += 1) pushCell(selection.rowIndex, col);
          return cells;
        }

        if (selection && targetKind === EDIT_TARGET_KIND.TABLE_COLUMN) {
          for (let row = 0; row < table.rows; row += 1) pushCell(row, selection.colIndex);
          return cells;
        }

        if (selection && targetKind === EDIT_TARGET_KIND.TABLE_CELL) {
          pushCell(selection.rowIndex, selection.colIndex);
          return cells;
        }

        if (selection && targetKind === EDIT_TARGET_KIND.MAIN_OBJECT) {
          for (let row = 0; row < table.rows; row += 1) {
            for (let col = 0; col < table.cols; col += 1) pushCell(row, col);
          }
        }
        return cells;
      },

applyActiveTableTextAlignment(alignment) {
        const context = this.getActiveTableForTextAlignment?.();
        const table = context?.table;
        if (!table) return false;
        this.ensureTableCellTextAlignState?.(table);
        const hasTableSelection = this.activeTableSelection?.tableId === table.id;
        const cells = hasTableSelection
          ? (this.getTableTextAlignmentTargetCells?.(table) || [])
          : context.cell
            ? [context.cell]
            : [];
        if (!cells.length) return false;
        cells.forEach(({ row, col }) => {
          table.cellTextAlign[row][col] = alignment;
          const cell = document.querySelector(
            `[data-table-cell="${table.id}"][data-row="${row}"][data-col="${col}"]`
          );
          if (cell) cell.style.textAlign = alignment;
        });
        return true;
      },


syncSubparagraphAlignmentControls() {
        const tableContext = this.getActiveTableForTextAlignment?.();
        const table = tableContext?.table;
        const selection = table && this.activeTableSelection?.tableId === table.id ? this.activeTableSelection : null;
        const selectedCell = selection
          ? { row: selection.rowIndex, col: selection.colIndex }
          : tableContext?.cell;
        const tableAlignment = selectedCell
          ? table?.cellTextAlign?.[selectedCell.row]?.[selectedCell.col]
          : null;
        const subparagraph = this.findSubparagraphById?.(this.activeSubparagraph);
        const activeObjectOwner = this.getActiveSubparagraphObjectAlignmentTarget?.();
        const activeTextboxOwner = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)
          : null;
        const selectedTextboxContent = this.getSelectedTextboxText?.();
        const alignmentTextboxOwner = selectedTextboxContent?.owner || activeTextboxOwner;
        const inlineTextboxAlignment = alignmentTextboxOwner
          ? (selectedTextboxContent?.owner?.textbox?.id === alignmentTextboxOwner.textbox.id
            ? selectedTextboxContent.alignment
            : (alignmentTextboxOwner.textbox.alignment || alignmentTextboxOwner.textbox.floatSide || alignmentTextboxOwner.textbox.horizontalAlign))
          : null;
        const inlineListAlignment = activeObjectOwner?.inline && activeObjectOwner.object?.kind === KINDS.LIST && !activeObjectOwner.object.parentListId
          ? activeObjectOwner.object.alignment
          : null;
        const objectAlignment = activeObjectOwner?.object?.horizontalAlign;
        const alignment = ["left", "center", "right"].includes(inlineTextboxAlignment)
          ? inlineTextboxAlignment
          : ["left", "center", "right"].includes(inlineListAlignment)
          ? inlineListAlignment
          : ["left", "center", "right"].includes(objectAlignment)
          ? objectAlignment
          : (SUBPARAGRAPH_TEXT_ALIGNMENTS.includes(tableAlignment) ? tableAlignment : (subparagraph?.textAlign || "left"));

        const buttons = {
          left: "btnAlignSubparagraphLeft",
          center: "btnAlignSubparagraphCenter",
          right: "btnAlignSubparagraphRight",
          justify: "btnAlignSubparagraphJustify"
        };

        Object.entries(buttons).forEach(([value, buttonId]) => {
          const button = document.getElementById(buttonId);
          if (button) button.classList.toggle("is-active", value === alignment);
        });
      },


getCurrentBorderToolbarStyles() {
        const color = document.getElementById("borderColorInput")?.value || "#000000";
        const width = Math.max(0, Math.round(Number(document.getElementById("borderWidthInput")?.value) || 0));
        const style = document.getElementById("borderStyleSelect")?.value || "solid";
        const radius = Math.max(0, Math.round(Number(document.getElementById("borderRadiusInput")?.value) || 0));
        return { color, width: `${width}px`, style, radius: `${radius}%` };
      },

borderRadiusPercent(radius) {
        const match = String(radius || "").trim().match(/^(\d+(?:\.\d+)?)%$/);
        return match ? String(Math.round(Number(match[1]))) : "0";
      },

getSelectedBorders() {
        const textbox = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)?.textbox
          : null;
        if (textbox) return [textbox.border];

        const table = this.getActiveTableForBorder?.()?.table;
        if (table) {
          this.ensureTableBorderState?.(table);
          const cells = this.getTableBorderTargetCells?.(table) || [];
          return cells.map(({ row, col }) => table.cellBorders?.[row]?.[col]);
        }

        const subparagraph = this.findSubparagraphOwnerById?.(this.activeSubparagraph)?.subparagraph;
        if (subparagraph) return [subparagraph.border];
        return null;
      },

syncBorderControls(force = false) {
        const widthInput = document.getElementById("borderWidthInput");
        const radiusInput = document.getElementById("borderRadiusInput");
        const styleSelect = document.getElementById("borderStyleSelect");
        const colorInput = document.getElementById("borderColorInput");
        if (!widthInput || !radiusInput) return;
        if (!force && (document.activeElement === widthInput || document.activeElement === radiusInput)) return;

        const side = document.getElementById("borderApplySelect")?.value || "top";
        const borders = this.getSelectedBorders();
        if (!borders?.length) {
          widthInput.value = "0";
          radiusInput.value = "0";
          if (styleSelect) styleSelect.value = "none";
          if (colorInput) colorInput.value = "#000000";
          return;
        }

        const sides = borders.map(border => normalizeBorder(border)[side]);
        const widths = sides.map(item => item ? Math.max(0, Math.round(parseFloat(item.width) || 0)) : 0);
        const styles = sides.map(item => item?.style || "none");
        const colors = sides.map(item => this.cssColorToHex(item?.color || "#000000"));
        const radii = borders.map(border => this.borderRadiusPercent(border?.radius));

        widthInput.value = widths.every(value => value === widths[0]) ? String(widths[0]) : "";
        radiusInput.value = radii.every(value => value === radii[0]) ? radii[0] : "";
        if (styleSelect && styles.every(value => value === styles[0]) && [...styleSelect.options].some(option => option.value === styles[0])) {
          styleSelect.value = styles[0];
        }
        if (colorInput && colors.every(value => value === colors[0])) colorInput.value = colors[0];
      },

describeEditable(editable) {
        if (editable?.dataset?.textSubparagraphId) return { kind: "sub", id: editable.dataset.textSubparagraphId };
        if (editable?.dataset?.textboxContent) return { kind: "textbox", id: editable.dataset.textboxContent };
        if (editable?.dataset?.tableCell) {
          return {
            kind: "cell",
            id: editable.dataset.tableCell,
            row: editable.dataset.row,
            col: editable.dataset.col
          };
        }
        return null;
      },

findDescribedEditable(saved) {
        if (saved?.kind === "sub") return document.querySelector(`[data-text-subparagraph-id="${saved.id}"]`);
        if (saved?.kind === "textbox") return document.querySelector(`[data-textbox-content="${saved.id}"]`);
        if (saved?.kind === "cell") {
          return document.querySelector(`[data-table-cell="${saved.id}"][data-row="${saved.row}"][data-col="${saved.col}"]`);
        }
        return null;
      },

offsetsForRange(editable, range) {
        if (!editable?.isConnected || !range) return null;
        if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) return null;
        const point = (container, offset) => {
          const probe = document.createRange();
          probe.selectNodeContents(editable);
          probe.setEnd(container, offset);
          return probe.toString().length;
        };
        let start = point(range.startContainer, range.startOffset);
        let end = point(range.endContainer, range.endOffset);
        if (end < start) [start, end] = [end, start];
        const described = this.describeEditable(editable);
        if (!described) return null;
        return { ...described, start, end };
      },

capturePreservedTextRange() {
        const selection = window.getSelection?.();
        if (selection?.rangeCount) {
          const range = selection.getRangeAt(0);
          const node = range.startContainer;
          const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
          const editable = element?.closest?.("[contenteditable='true']");
          const saved = this.offsetsForRange(editable, range);
          if (saved) {
            this.preservedTextRange = saved;
            return saved;
          }
        }

        const held = [this.pendingTextStyleRange, this.lastEditableTextRange];
        for (const item of held) {
          const saved = this.offsetsForRange(item?.editable, item?.range);
          if (saved && saved.end > saved.start) {
            this.preservedTextRange = saved;
            return saved;
          }
        }

        return this.preservedTextRange || null;
      },

restorePreservedTextRange() {
        const saved = this.preservedTextRange;
        const editable = this.findDescribedEditable(saved);
        if (!editable || !Number.isFinite(saved?.start) || !Number.isFinite(saved?.end) || saved.end < saved.start) return false;

        const selection = window.getSelection?.();
        if (!selection) return false;

        const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
        let index = 0;
        let startNode = null;
        let startOffset = 0;
        let endNode = null;
        let endOffset = 0;

        while (walker.nextNode()) {
          const textNode = walker.currentNode;
          const length = textNode.nodeValue.length;
          if (!startNode && saved.start <= index + length) {
            startNode = textNode;
            startOffset = Math.max(0, Math.min(length, saved.start - index));
          }
          if (!endNode && saved.end <= index + length) {
            endNode = textNode;
            endOffset = Math.max(0, Math.min(length, saved.end - index));
            break;
          }
          index += length;
        }

        const range = document.createRange();
        if (!startNode || !endNode) {
          if (saved.start !== 0 || saved.end !== 0) return false;
          range.setStart(editable, 0);
          range.collapse(true);
        } else {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
        }

        editable.focus({ preventScroll: true });
        selection.removeAllRanges();
        selection.addRange(range);

        if (saved.end > saved.start) {
          const kept = range.cloneRange();
          this.pendingTextStyleRange = { editable, range: kept };
          this.lastEditableTextRange = { editable, range: kept.cloneRange() };
          if (document.activeElement !== editable) this.paintPendingTextHighlight();
          else window.CSS?.highlights?.delete("wordex-pending-text");
        } else {
          this.releasePendingTextStyleRange();
        }
        this.updateTextCommandButtonsVisibility?.();
        return true;
      },

renderKeepingTextRange(message) {
        if (!this.preservedTextRange) this.capturePreservedTextRange();
        const snapshot = this.preservedTextRange;
        this.render(message, false);
        this.preservedTextRange = snapshot;
        this.restorePreservedTextRange();
      },

applySelectedBorder(select) {
        const action = select?.value || "";
        if (!action) return;

        const styles = this.getCurrentBorderToolbarStyles();
        if (!styles) return;

        const textboxOwner = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)
          : null;
        if (textboxOwner?.textbox) {
          const textbox = textboxOwner.textbox;
          const border = normalizeBorder(textbox.border);

          if (action === "none") {
            textbox.border = createEmptyBorder(styles.radius);
          } else {
            border.radius = styles.radius;
            const sideValue = (styles.width === "0px" || styles.style === "none")
              ? null
              : createBorderSide(styles.color, styles.width, styles.style);
            const sides = action === "all" ? ["top", "right", "bottom", "left"] : [action];
            sides.forEach(side => {
              if (["top", "right", "bottom", "left"].includes(side)) {
                border[side] = sideValue ? { ...sideValue } : null;
              }
            });
            textbox.border = border;
          }

          this.renderKeepingTextRange("Borda da caixa de texto atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        // Se o subparágrafo ativo contém uma tabela, a borda pertence à tabela
        // ou à parte da tabela atualmente selecionada (tabela/linha/coluna/célula),
        // nunca ao contêiner do subparágrafo.
        if (this.applySelectedTableBorder?.(action, styles)) {
          this.renderKeepingTextRange("Borda da tabela atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        if (!subparagraph) return;

        const border = normalizeBorder(subparagraph.border);

        if (action === "none") {
          subparagraph.border = createEmptyBorder(styles.radius);
        } else {
          border.radius = styles.radius;
          const sideValue = (styles.width === "0px" || styles.style === "none") ? null : createBorderSide(styles.color, styles.width, styles.style);
          const sides = action === "all" ? ["top", "right", "bottom", "left"] : [action];
          sides.forEach(side => {
            if (["top", "right", "bottom", "left"].includes(side)) border[side] = sideValue ? { ...sideValue } : null;
          });
          subparagraph.border = border;
        }

        this.renderKeepingTextRange("Borda do subparágrafo atualizada.");
        this.updateJsonOutput?.();
      },

applySelectedSpacing(kind, select) {
        const action = select?.value || "";
        if (!action) return;

        const property = kind === "margin" ? "margin" : "padding";
        const input = document.getElementById(property === "margin" ? "marginSizeInput" : "paddingSizeInput");
        const px = Math.max(0, Math.round(Number(input?.value) || 0));
        const label = property === "margin" ? "Margem" : "Padding";

        const textboxOwner = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)
          : null;
        if (textboxOwner?.textbox) {
          textboxOwner.textbox[property] = applyBoxEdgesAction(textboxOwner.textbox[property], action, px);
          this.renderKeepingTextRange(`${label} da caixa de texto atualizada.`);
          this.updateJsonOutput?.();
          return;
        }

        if (this.applySelectedTableSpacing?.(property, action, px)) {
          this.renderKeepingTextRange(`${label} da tabela atualizada.`);
          this.updateJsonOutput?.();
          return;
        }

        const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        if (subparagraph) {
          subparagraph[property] = applyBoxEdgesAction(subparagraph[property], action, px);
          this.renderKeepingTextRange(`${label} do subparágrafo atualizada.`);
          this.updateJsonOutput?.();
          return;
        }

        const paragraph = this.findParagraphById?.(this.activeParagraph);
        if (paragraph && paragraph !== PAGE_BREAK_CHARACTER) {
          paragraph[property] = property === "margin"
            ? applyParagraphMarginAction(paragraph.margin, action, px)
            : applyBoxEdgesAction(paragraph.padding, action, px);
          this.renderKeepingTextRange(`${label} do parágrafo atualizada.`);
          this.updateJsonOutput?.();
          return;
        }

        const section = this.findSectionById?.(this.activeSection);
        if (!section) return;
        if (!section[property] || typeof section[property] !== "object") section[property] = createEmptyBoxEdges();
        section[property] = applyBoxEdgesAction(section[property], action, px);
        this.renderKeepingTextRange(`${label} da seção atualizada.`);
        this.updateJsonOutput?.();
      },

sectionSpacingEdges(section, property) {
        const fallback = property === "padding" ? 8 : 0;
        const normalized = normalizeBoxEdges(section?.[property]);
        return ["top", "right", "bottom", "left"].reduce((edges, side) => {
          edges[side] = normalized[side] == null ? fallback : normalized[side];
          return edges;
        }, {});
      },

getMarginTargetEdges() {
        const textbox = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)?.textbox
          : null;
        if (textbox) return { kind: "box", edges: [textbox.margin] };

        const table = this.getActiveTableForBorder?.()?.table;
        if (table) {
          this.ensureTableSpacingState?.(table);
          const cells = this.getTableBorderTargetCells?.(table) || [];
          return {
            kind: "box",
            edges: cells.map(({ row, col }) => table.cellMargins?.[row]?.[col])
          };
        }

        const subparagraph = this.findSubparagraphOwnerById?.(this.activeSubparagraph)?.subparagraph;
        if (subparagraph) return { kind: "box", edges: [subparagraph.margin] };

        const paragraph = this.findParagraphById?.(this.activeParagraph);
        if (paragraph && paragraph !== PAGE_BREAK_CHARACTER) {
          return { kind: KINDS.PARAGRAPH, edges: [paragraph.margin] };
        }

        const section = this.findSectionById?.(this.activeSection);
        if (section) return { kind: "box", edges: [this.sectionSpacingEdges(section, "margin")] };
        return null;
      },

syncMarginSizeInput(force = false) {
        const input = document.getElementById("marginSizeInput");
        if (!input || (!force && document.activeElement === input)) return;
        const side = document.getElementById("marginApplySelect")?.value || "top";
        const target = this.getMarginTargetEdges?.();
        input.value = target ? readMarginSide(target.edges, target.kind, side) : "";
      },

getPaddingTargetEdges() {
        const textbox = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)?.textbox
          : null;
        if (textbox) return { kind: "box", edges: [textbox.padding] };

        const table = this.getActiveTableForBorder?.()?.table;
        if (table) {
          this.ensureTableSpacingState?.(table);
          const cells = this.getTableBorderTargetCells?.(table) || [];
          return {
            kind: "box",
            edges: cells.map(({ row, col }) => table.cellPaddings?.[row]?.[col])
          };
        }

        const subparagraph = this.findSubparagraphOwnerById?.(this.activeSubparagraph)?.subparagraph;
        if (subparagraph) return { kind: "box", edges: [subparagraph.padding] };

        const paragraph = this.findParagraphById?.(this.activeParagraph);
        if (paragraph && paragraph !== PAGE_BREAK_CHARACTER) {
          return { kind: "box", edges: [paragraph.padding] };
        }

        const section = this.findSectionById?.(this.activeSection);
        if (section) return { kind: "box", edges: [this.sectionSpacingEdges(section, "padding")] };
        return null;
      },

syncPaddingSizeInput(force = false) {
        const input = document.getElementById("paddingSizeInput");
        if (!input || (!force && document.activeElement === input)) return;
        const side = document.getElementById("paddingApplySelect")?.value || "top";
        const target = this.getPaddingTargetEdges?.();
        input.value = target ? readMarginSide(target.edges, "box", side) : "";
      },

bindTextColorInput(textColorInput) {
        if (!textColorInput) return;

        textColorInput.addEventListener("pointerdown", () => {
          textColorInput.dataset.openedByPointer = "true";
          this.capturePendingTextStyleRange();
        });

        textColorInput.addEventListener("change", event => {
          const input = event.currentTarget;
          const pickedByMouse = input.dataset.openedByPointer === "true";
          if (!pickedByMouse) return;

          // O popup nativo do input type=color nao e fechado de forma
          // confiavel apenas com blur() em alguns navegadores. Remover e
          // recriar o input apos o change encerra o seletor nativo sem
          // exigir clique extra no documento.
          window.setTimeout(() => {
            const replacement = input.cloneNode(true);
            replacement.value = input.value;
            delete replacement.dataset.openedByPointer;
            input.replaceWith(replacement);
            this.bindTextColorInput(replacement);
            replacement.blur();
          }, 0);
        });
      },

bindTextCommandButton(buttonId, handler) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", handler);
      },

getSelectedPaperFormatValue() {
        const select = document.getElementById("paperFormatSelect");
        return select?.value || getPaperFormat(this.document?.paperFormat).value;
      },

getSelectedPageOrientationValue() {
        const select = document.getElementById("pageOrientationSelect");
        return select?.value === "Landscape" ? "Landscape" : "Portrait";
      },

syncDocumentDefaultsFromToolbar(options = {}) {
        const textDefaults = this.getCurrentToolbarTextStyles();
        this.setTypingTextDefaults(textDefaults, { updateControls: false, css: options.css !== false });

        if (options.page !== false) {
          if (!this.document.paperFormat) this.document.paperFormat = this.getSelectedPaperFormatValue();
          if (!this.document.pageOrientation) this.document.pageOrientation = this.getSelectedPageOrientationValue();
        }
      },

applyToolbarTextDefaultsToCss(styles = null) {
        const defaults = styles || this.getTypingTextDefaults();
        const root = document.documentElement;
        root.style.setProperty("--wordex-default-font-family", defaults.fontFamily);
        root.style.setProperty("--wordex-default-font-size", defaults.fontSize);
        root.style.setProperty("--wordex-default-color", defaults.color);
      },

normalizeTextStyles(styles = {}) {
        const fontFamily = styles.fontFamily || "Arial";
        const fontSizeNumber = Math.max(1, Math.round(Number(String(styles.fontSize || "12").replace("px", "")) || 12));
        const color = styles.color || "#000000";
        return {
          fontFamily,
          fontSize: `${fontSizeNumber}px`,
          color
        };
      },

getTypingTextDefaults() {
        return this.normalizeTextStyles(this.typingTextDefaults || this.document.textDefaults || this.getCurrentToolbarTextStyles());
      },

setTypingTextDefaults(styles, options = {}) {
        const normalized = this.normalizeTextStyles(styles);
        this.typingTextDefaults = { ...normalized };
        this.document.textDefaults = { ...normalized };
        if (options.updateControls) this.setToolbarTextControls(normalized);
        if (options.css !== false) this.applyToolbarTextDefaultsToCss(normalized);
        return normalized;
      },

setToolbarTextControls(styles) {
        const normalized = this.normalizeTextStyles(styles);
        const fontSelect = document.getElementById("textFontSelect");
        const sizeInput = document.getElementById("textSizeInput");
        const colorInput = document.getElementById("textColorInput");

        if (fontSelect) {
          const match = [...fontSelect.options].find(option => option.value.toLowerCase() === normalized.fontFamily.toLowerCase());
          if (match) fontSelect.value = match.value;
        }
        if (sizeInput) sizeInput.value = String(Math.max(1, Math.round(Number(normalized.fontSize.replace("px", "")) || 12)));
        if (colorInput) colorInput.value = normalized.color;
      },

isToolbarNumberInput(target) {
        const element = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
        return Boolean(element?.closest?.(".toolbar") && element.matches?.("input[type='number']"));
      },

releasePendingTextStyleRange() {
        this.pendingTextStyleRange = null;
        this.lastEditableTextRange = null;
        window.CSS?.highlights?.delete("wordex-pending-text");
      },

rememberEditableTextRange() {
        const selected = this.getSelectedEditableRange?.();
        if (!selected?.editable?.isConnected || !selected.range || selected.range.toString() === "") return;
        this.lastEditableTextRange = {
          editable: selected.editable,
          range: selected.range.cloneRange()
        };
      },

paintPendingTextHighlight() {
        if (!window.CSS?.highlights || typeof Highlight !== "function") return;
        const name = "wordex-pending-text";
        CSS.highlights.delete(name);
        const pending = this.pendingTextStyleRange;
        if (!pending?.editable?.isConnected || !pending.range) return;
        if (!pending.editable.contains(pending.range.startContainer) || !pending.editable.contains(pending.range.endContainer)) return;
        if (pending.range.toString() === "") return;
        CSS.highlights.set(name, new Highlight(pending.range));
      },

updateTextCommandButtonsVisibility() {
        const hasSelectedEditableText = Boolean(this.getSelectedEditableRange())
          || Boolean(this.pendingTextStyleRange?.range?.toString());
        ["btnTextBold", "btnTextItalic", "btnTextUnderline", "btnTextCase"].forEach(buttonId => {
          const button = document.getElementById(buttonId);
          if (button) button.hidden = !hasSelectedEditableText;
        });
      },

applySelectedTextCommand(command, value = null) {
        const selectedRange = this.getSelectedEditableRange();
        if (!selectedRange) {
          this.updateTextCommandButtonsVisibility();
          return;
        }

        const changed = WordexRichText.applyInlineCommand(selectedRange.editable, command, value);
        if (changed) this.syncActiveEditableAfterTextCommand(selectedRange.editable);
        this.updateTextCommandButtonsVisibility();
      },

clearSelectedTextFormatting() {
        const selectedRange = this.getSelectedEditableRange();
        if (!selectedRange) {
          this.updateTextCommandButtonsVisibility();
          return;
        }

        const changed = WordexRichText.clearSelectionFormatting(selectedRange.editable);
        if (changed) this.syncActiveEditableAfterTextCommand(selectedRange.editable);
        this.updateTextCommandButtonsVisibility();
      },

getCurrentToolbarTextStyles() {
        const fontSelect = document.getElementById("textFontSelect");
        const sizeInput = document.getElementById("textSizeInput");
        const colorInput = document.getElementById("textColorInput");

        const fontFamily = fontSelect?.value || "Arial";
        const fontSize = Math.max(1, Math.round(Number(sizeInput?.value) || 12));
        const color = colorInput?.value || "#000000";

        return {
          fontFamily,
          fontSize: `${fontSize}px`,
          color
        };
      },

capturePendingTextStyleRange() {
        const selected = this.getSelectedEditableRange?.();
        const source = selected?.range?.toString()
          ? selected
          : (this.pendingTextStyleRange?.range?.toString() ? this.pendingTextStyleRange : this.lastEditableTextRange);
        if (!source?.editable?.isConnected || !source.range || source.range.toString() === "") return;
        if (!source.editable.contains(source.range.startContainer) || !source.editable.contains(source.range.endContainer)) return;
        this.pendingTextStyleRange = {
          editable: source.editable,
          range: source.range.cloneRange()
        };
      },

cssColorToHex(color) {
        const match = String(color || "").match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (!match) {
          const hex = String(color || "").trim();
          return /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : "#000000";
        }
        return `#${match.slice(1, 4).map(part => Number(part).toString(16).padStart(2, "0")).join("")}`;
      },

primaryFontFamily(fontFamily) {
        return String(fontFamily || "Arial").split(",")[0].trim().replace(/^["']|["']$/g, "") || "Arial";
      },

readElementTextStyles(element) {
        const computed = window.getComputedStyle(element);
        return this.normalizeTextStyles({
          fontFamily: this.primaryFontFamily(computed.fontFamily),
          fontSize: `${Math.round(parseFloat(computed.fontSize) || 0) || 12}px`,
          color: this.cssColorToHex(computed.color)
        });
      },

stylesForControl(textStyle) {
        if (textStyle && typeof textStyle === "object") return this.normalizeTextStyles(textStyle);
        return this.getTypingTextDefaults();
      },

getSelectedTextStyleControl() {
        const textbox = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)?.textbox
          : null;
        if (textbox) return { key: `textbox:${textbox.id}`, styles: this.stylesForControl(textbox.textStyle) };

        const table = this.getActiveTableForBorder?.()?.table;
        if (table) {
          this.ensureTableCellTextStyleState?.(table);
          const cells = this.getTableBorderTargetCells?.(table) || [];
          const styles = cells.map(({ row, col }) => this.stylesForControl(table.cellTextStyles?.[row]?.[col]));
          const uniform = styles.length > 0 && styles.every(item => (
            item.fontFamily === styles[0].fontFamily
            && item.fontSize === styles[0].fontSize
            && item.color === styles[0].color
          ));
          return {
            key: `table:${table.id}:${cells.map(cell => `${cell.row}.${cell.col}`).join(",")}`,
            styles: uniform ? styles[0] : this.getTypingTextDefaults()
          };
        }

        const subparagraph = this.findSubparagraphOwnerById?.(this.activeSubparagraph)?.subparagraph;
        if (subparagraph) return { key: `sub:${subparagraph.id}`, styles: this.stylesForControl(subparagraph.textStyle) };

        const paragraph = this.findParagraphById?.(this.activeParagraph);
        if (paragraph && paragraph !== PAGE_BREAK_CHARACTER) {
          return { key: `paragraph:${paragraph.id}`, styles: this.stylesForControl(paragraph.textStyle) };
        }

        const section = this.findSectionById?.(this.activeSection);
        if (section) return { key: `section:${section.id}`, styles: this.stylesForControl(section.textStyle) };
        return { key: "none", styles: this.getTypingTextDefaults() };
      },

syncTextStyleControls(force = false) {
        const sizeInput = document.getElementById("textSizeInput");
        const fontSelect = document.getElementById("textFontSelect");
        const colorInput = document.getElementById("textColorInput");
        if (!force && [sizeInput, fontSelect, colorInput].includes(document.activeElement)) return;
        const control = this.getSelectedTextStyleControl();
        if (!force && control.key === this.textStyleControlKey) return;
        this.textStyleControlKey = control.key;
        this.setToolbarTextControls(control.styles);
      },

takePendingTextStyleRange() {
        const pending = this.pendingTextStyleRange;
        this.releasePendingTextStyleRange();
        const live = this.getSelectedEditableRange?.();
        const chosen = live?.range?.toString() ? live : pending;
        if (!chosen?.editable?.isConnected || !chosen.range || chosen.range.toString() === "") return null;
        if (!chosen.editable.contains(chosen.range.startContainer) || !chosen.editable.contains(chosen.range.endContainer)) return null;
        if (chosen !== live) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(chosen.range);
        }
        return chosen;
      },

applySelectedControlTextStyle() {
        const styles = { ...this.normalizeTextStyles(this.getCurrentToolbarTextStyles()) };
        const selectedText = this.takePendingTextStyleRange();
        if (selectedText && window.WordexRichText?.applyInlineStyle) {
          const applied = window.WordexRichText.applyInlineStyle(selectedText.editable, {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            color: styles.color
          });
          if (applied) this.syncActiveEditableAfterTextCommand(selectedText.editable);
          this.syncTextStyleControls(true);
          this.updateTextCommandButtonsVisibility?.();
          return;
        }

        const textbox = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)?.textbox
          : null;
        if (textbox) {
          textbox.textStyle = styles;
          this.renderKeepingTextRange("Fonte da caixa de texto atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        const table = this.getActiveTableForBorder?.()?.table;
        if (table) {
          this.ensureTableCellTextStyleState?.(table);
          const cells = this.getTableBorderTargetCells?.(table) || [];
          if (!cells.length) return;
          cells.forEach(({ row, col }) => {
            table.cellTextStyles[row][col] = { ...styles };
          });
          this.renderKeepingTextRange("Fonte da tabela atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        const subparagraph = this.findSubparagraphOwnerById?.(this.activeSubparagraph)?.subparagraph;
        if (subparagraph) {
          subparagraph.textStyle = styles;
          this.renderKeepingTextRange("Fonte do subparágrafo atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        const paragraph = this.findParagraphById?.(this.activeParagraph);
        if (paragraph && paragraph !== PAGE_BREAK_CHARACTER) {
          paragraph.textStyle = styles;
          this.renderKeepingTextRange("Fonte do parágrafo atualizada.");
          this.updateJsonOutput?.();
          return;
        }

        const section = this.findSectionById?.(this.activeSection);
        if (!section) return;
        section.textStyle = styles;
        this.renderKeepingTextRange("Fonte da seção atualizada.");
        this.updateJsonOutput?.();
      },

applyToolbarTextFormatting(command, value = null) {
        const pending = this.pendingTextStyleRange;
        this.releasePendingTextStyleRange();
        const liveSelection = this.getSelectedEditableRange();

        if (!this.focusActiveEditableForTextCommand()) return;
        const editable = this.getActiveEditableElement();
        if (!editable) return;

        const pendingMatches = pending?.editable === editable
          && pending.range
          && editable.contains(pending.range.startContainer)
          && pending.range.toString() !== "";
        if (pendingMatches) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(pending.range);
        }

        const selectedRange = pendingMatches
          ? pending
          : (liveSelection?.editable === editable && liveSelection.range.toString() !== "" ? liveSelection : null);

        if (selectedRange) {
          // O trecho recebe a formatação, mas a fonte do controle não muda.
          // A barra fica com o valor escolhido até o botão de restaurar.
          const changed = WordexRichText.applyInlineCommand(editable, command, value);
          if (changed) this.syncActiveEditableAfterTextCommand(editable);
          this.updateTextCommandButtonsVisibility();
          return;
        }

        // Sem seleção: o valor escolhido passa a ser o do controle e dos próximos caracteres.
        const nextTypingDefaults = this.setTypingTextDefaults(this.getCurrentToolbarTextStyles(), { updateControls: false });
        WordexRichText.applyInlineStyle(editable, nextTypingDefaults);
      },

applyTextStyle(command, value = null) {
        this.applyToolbarTextFormatting(command, value);
      },

applyTextSize(value) {
        this.applyToolbarTextFormatting("fontSize", value);
      },

populatePaperFormatSelect() {
        const select = document.getElementById("paperFormatSelect");
        if (!select) return;

        select.innerHTML = paperFormatList.map(format => {
          return `<option value="${format.value}">${format.text}</option>`;
        }).join("");

        const currentFormat = getPaperFormat(this.document.paperFormat);
        select.value = currentFormat.value;
      },

setPaperFormat(value) {
        const format = getPaperFormat(value);
        this.document.paperFormat = format.value;
        this.applyPageFormat();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

setPageOrientation(value) {
        this.document.pageOrientation = value === "Landscape" ? "Landscape" : "Portrait";
        this.applyPageFormat();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

applyPageFormat() {
        const format = getPaperFormat(this.document.paperFormat || this.getSelectedPaperFormatValue());
        const orientation = (this.document.pageOrientation || this.getSelectedPageOrientationValue()) === "Landscape" ? "Landscape" : "Portrait";
        this.document.paperFormat = format.value;
        this.document.pageOrientation = orientation;

        const page = document.getElementById("page");
        if (page) {
          const width = orientation === "Landscape" ? format.height : format.width;
          const height = orientation === "Landscape" ? format.width : format.height;
          page.style.setProperty("--page-width", width);
          page.style.setProperty("--page-height", height);
        }

        const select = document.getElementById("paperFormatSelect");
        if (select) select.value = format.value;

        const orientationSelect = document.getElementById("pageOrientationSelect");
        if (orientationSelect) orientationSelect.value = orientation;
      },

updateToolbarState() {
        this.syncBorderControls?.();
        this.syncTextStyleControls?.();
        this.syncMarginSizeInput?.();
        this.syncPaddingSizeInput?.();
        this.syncSubparagraphAlignmentControls?.();
        this.updateDataSourceContextSelectors?.();
        this.updateTableMergeToolbarButtons?.();
        this.updateTableRowVisibilityToolbar?.();

        const selectedKind = document.getElementById("objectKindSelect")?.value;
        const newObjectButton = document.getElementById("btnNewObject");
        const removeObjectButton = document.getElementById("btnRemoveObject");
        const isWatermarkSelected = selectedKind === KINDS.WATERMARK;
        const hasWatermark = Boolean(this.document.watermark?.src);

        if (!newObjectButton || !removeObjectButton) return;

        newObjectButton.disabled = false;
        removeObjectButton.disabled = false;

        const elementLabels = {
          [KINDS.PARAGRAPH]: "parágrafo",
          [KINDS.SUBPARAGRAPH]: "subparágrafo",
          [KINDS.TABLE]: "tabela",
          [KINDS.LIST]: "lista",
          [KINDS.IMAGE]: "imagem",
          [KINDS.CHART]: "gráfico",
          [KINDS.TEXTBOX]: "caixa de texto",
          [KINDS.LINE]: "linha",
          [KINDS.PAGE_BREAK]: "quebra de página",
          [KINDS.WATERMARK]: "marca d'água"
        };
        const selectedLabel = elementLabels[selectedKind];

        if (isWatermarkSelected && hasWatermark) {
          newObjectButton.innerHTML = TOOLBAR_OBJECT_EDIT_ICON;
          newObjectButton.title = "Editar marca d'água";
          newObjectButton.setAttribute("aria-label", "Editar marca d'água");
        } else {
          newObjectButton.innerHTML = TOOLBAR_OBJECT_ADD_ICON;
          const addTitle = isWatermarkSelected ? "Adicionar marca d'água" : selectedLabel ? `Inserir ${selectedLabel}` : "Inserir elemento";
          newObjectButton.title = addTitle;
          newObjectButton.setAttribute("aria-label", addTitle);
        }

        // Título do excluir segue a seleção do canvas; combobox só como fallback.
        let removeKind = null;
        if (this.activeTextbox) {
          removeKind = KINDS.TEXTBOX;
        } else if (this.activeObject) {
          const owner = this.findObjectOwnerById?.(this.activeObject);
          removeKind = owner?.object?.kind || null;
        } else if (this.activeEditTargetKind === EDIT_TARGET_KIND.PARAGRAPH) {
          removeKind = KINDS.PARAGRAPH;
        } else if (this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH) {
          removeKind = KINDS.SUBPARAGRAPH;
        } else {
          removeKind = selectedKind || null;
        }

        if (removeKind === KINDS.WATERMARK) {
          removeObjectButton.title = "Remover marca d'água";
          removeObjectButton.setAttribute("aria-label", "Remover marca d'água");
        } else if (removeKind === KINDS.PAGE_BREAK) {
          removeObjectButton.title = "Remover a quebra imediatamente acima do parágrafo";
          removeObjectButton.setAttribute("aria-label", "Remover a quebra imediatamente acima do parágrafo");
        } else if (elementLabels[removeKind]) {
          const removeTitle = `Remover ${elementLabels[removeKind]}`;
          removeObjectButton.title = removeTitle;
          removeObjectButton.setAttribute("aria-label", removeTitle);
        } else {
          removeObjectButton.title = "Remover elemento selecionado";
          removeObjectButton.setAttribute("aria-label", "Remover elemento selecionado");
        }
      },
});
