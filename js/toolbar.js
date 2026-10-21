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
        document.getElementById("btnDataPreview")?.addEventListener("click", () => this.toggleDataPreviewMode?.());
        document.getElementById("btnRenderReportHtml")?.addEventListener("click", () => this.renderReportHtml?.());
        document.getElementById("dataJsonFileInput")?.addEventListener("change", event => this.onDataJsonFileSelected(event));
        document.getElementById("dataFieldSelect")?.addEventListener("change", event => this.onDataFieldChanged(event));
        document.getElementById("btnMergeTableCells")?.addEventListener("click", () => this.mergeSelectedTableCells?.());
        document.getElementById("btnUnmergeTableRow")?.addEventListener("click", () => this.unmergeCurrentTableRow?.());
        document.getElementById("tableRowVisibilityCheckbox")?.addEventListener("change", event => this.setActiveTableRowVisible?.(event.currentTarget.checked));
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphLeft", "left");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphCenter", "center");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphRight", "right");
        this.bindSubparagraphAlignmentButton("btnAlignSubparagraphJustify", "justify");
        const borderApplySelect = document.getElementById("borderApplySelect");
        if (borderApplySelect) {
          // Preserve a seleção ativa da tabela ao abrir/usar o combo de bordas.
          ["pointerdown", "mousedown", "click"].forEach(eventName => {
            borderApplySelect.addEventListener(eventName, event => event.stopPropagation());
          });
          borderApplySelect.addEventListener("change", event => this.applySelectedBorder(event.currentTarget));
        }
        document.getElementById("paperFormatSelect").addEventListener("change", event => this.setPaperFormat(event.currentTarget.value));
        document.getElementById("pageOrientationSelect").addEventListener("change", event => this.setPageOrientation(event.currentTarget.value));
        document.getElementById("textFontSelect").addEventListener("change", event => {
          this.applyTextStyle("fontName", event.currentTarget.value);
        });
        document.getElementById("textSizeSelect").addEventListener("change", event => {
          this.applyTextSize(event.currentTarget.value);
        });
        this.bindTextCommandButton("btnTextBold", () => this.applySelectedTextCommand("bold"));
        this.bindTextCommandButton("btnTextItalic", () => this.applySelectedTextCommand("italic"));
        this.bindTextCommandButton("btnTextUnderline", () => this.applySelectedTextCommand("underline"));
        this.bindTextCommandButton("btnTextCase", () => this.clearSelectedTextFormatting());
        this.bindTextColorInput(document.getElementById("textColorInput"));
        document.addEventListener("selectionchange", () => {
          this.updateTextCommandButtonsVisibility();
          this.syncSubparagraphAlignmentControls?.();
        });
        this.updateTextCommandButtonsVisibility();
      },


bindSubparagraphAlignmentButton(buttonId, alignment) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        let pendingTextboxId = null;
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
        });
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => {
          const textboxId = pendingTextboxId;
          pendingTextboxId = null;
          this.setActiveSubparagraphTextAlignment(alignment, textboxId);
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

setActiveSubparagraphTextAlignment(alignment, selectedTextboxId = null) {
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

          this.render(alignment === "center"
            ? (textboxOwner.inline ? "Caixa de texto centralizada em linha própria." : "Caixa de texto centralizada no subparágrafo.")
            : (textboxOwner.inline ? "Caixa de texto alinhada com o texto fluindo ao lado oposto." : "Caixa de texto alinhada no subparágrafo."), false);
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
            this.render("Alinhamento da lista atualizado.", false);
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
          this.render("Alinhamento do objeto atualizado.", false);
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
        this.render("Alinhamento do subparágrafo atualizado.", false, { focusActiveEditableSubparagraph: true });
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
        const width = document.getElementById("borderWidthSelect")?.value || "1px";
        const style = document.getElementById("borderStyleSelect")?.value || "solid";
        const radiusInput = document.getElementById("borderRadiusInput");
        const radius = radiusInput?.value.trim() || "4px";

        if (typeof CSS !== "undefined" && !CSS.supports("border-radius", radius)) {
          radiusInput?.setCustomValidity("Informe um valor CSS válido, como 3.5px ou 50%.");
          radiusInput?.reportValidity();
          return null;
        }

        radiusInput?.setCustomValidity("");
        return { color, width, style, radius };
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

          if (select) select.value = "";
          this.render("Borda da caixa de texto atualizada.", false);
          this.updateJsonOutput?.();
          return;
        }

        // Se o subparágrafo ativo contém uma tabela, a borda pertence à tabela
        // ou à parte da tabela atualmente selecionada (tabela/linha/coluna/célula),
        // nunca ao contêiner do subparágrafo.
        if (this.applySelectedTableBorder?.(action, styles)) {
          if (select) select.value = "";
          this.render("Borda da tabela atualizada.", false);
          this.updateJsonOutput?.();
          return;
        }

        const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        if (!subparagraph) {
          if (select) select.value = "";
          return;
        }

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

        if (select) select.value = "";
        this.render("Borda do subparágrafo atualizada.", false, { focusActiveEditableSubparagraph: true });
        this.updateJsonOutput?.();
      },

bindTextColorInput(textColorInput) {
        if (!textColorInput) return;

        textColorInput.addEventListener("pointerdown", () => {
          textColorInput.dataset.openedByPointer = "true";
        });

        textColorInput.addEventListener("input", event => {
          this.applyTextStyle("foreColor", event.currentTarget.value);
        });

        textColorInput.addEventListener("change", event => {
          const input = event.currentTarget;
          const pickedByMouse = input.dataset.openedByPointer === "true";
          this.applyTextStyle("foreColor", input.value);

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
            this.focusActiveEditableForTextCommand();
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
        const sizeSelect = document.getElementById("textSizeSelect");
        const colorInput = document.getElementById("textColorInput");

        if (fontSelect) fontSelect.value = normalized.fontFamily;
        if (sizeSelect) sizeSelect.value = String(Math.max(1, Math.round(Number(normalized.fontSize.replace("px", "")) || 12)));
        if (colorInput) colorInput.value = normalized.color;
      },

updateTextCommandButtonsVisibility() {
        const hasSelectedEditableText = Boolean(this.getSelectedEditableRange());
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
        const sizeSelect = document.getElementById("textSizeSelect");
        const colorInput = document.getElementById("textColorInput");

        const fontFamily = fontSelect?.value || "Arial";
        const fontSize = Math.max(1, Math.round(Number(sizeSelect?.value) || 12));
        const color = colorInput?.value || "#000000";

        return {
          fontFamily,
          fontSize: `${fontSize}px`,
          color
        };
      },

applyToolbarTextFormatting(command, value = null) {
        // A decisao de restaurar ou nao os combos depende da existencia de
        // texto selecionado ANTES do comando mexer no foco. Sem selecao, o
        // valor escolhido no combo passa a ser o default dos proximos caracteres.
        const selectedRangeBeforeFocus = this.getSelectedEditableRange();

        if (!this.focusActiveEditableForTextCommand()) return;
        const editable = this.getActiveEditableElement();
        if (!editable) return;

        const selectedRange =
          selectedRangeBeforeFocus?.editable === editable && selectedRangeBeforeFocus.range.toString() !== ""
            ? selectedRangeBeforeFocus
            : null;

        if (selectedRange) {
          // Texto selecionado: aplica a formatacao somente no trecho e restaura
          // o estado anterior da digitacao/toolbar logo depois.
          const previousTypingDefaults = this.getTypingTextDefaults();
          const changed = WordexRichText.applyInlineCommand(editable, command, value);
          if (changed) this.syncActiveEditableAfterTextCommand(editable);
          this.setTypingTextDefaults(previousTypingDefaults, { updateControls: true });
          this.updateTextCommandButtonsVisibility();
          return;
        }

        // Sem selecao: o valor selecionado no combo deve permanecer selecionado
        // e virar o default dos proximos caracteres. Nao sincroniza aqui, para
        // nao remover o marcador invisivel que segura o novo Run.
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
        this.syncSubparagraphAlignmentControls?.();
        this.updateDataSourceContextSelectors?.();
        this.updateTableMergeToolbarButtons?.();
        this.updateTableRowVisibilityToolbar?.();
        this.updateDataPreviewToolbar?.();

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
          [KINDS.PAGE_BREAK]: "quebra de página"
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

        if (isWatermarkSelected) {
          removeObjectButton.title = "Remover marca d'água";
          removeObjectButton.setAttribute("aria-label", "Remover marca d'água");
        } else if (selectedKind === KINDS.PAGE_BREAK) {
          removeObjectButton.title = "Remover a quebra imediatamente acima do parágrafo";
          removeObjectButton.setAttribute("aria-label", "Remover a quebra imediatamente acima do parágrafo");
        } else if (selectedLabel) {
          const removeTitle = `Remover ${selectedLabel}`;
          removeObjectButton.title = removeTitle;
          removeObjectButton.setAttribute("aria-label", removeTitle);
        } else {
          removeObjectButton.title = "Remover elemento selecionado";
          removeObjectButton.setAttribute("aria-label", "Remover elemento selecionado");
        }
      },
});
