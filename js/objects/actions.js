"use strict";

Object.assign(wordex, {
insertObjectIntoActiveSubparagraph(object) {
        if (object?.kind === KINDS.IMAGE && this.insertObjectIntoActiveTableCellIfPossible?.(object)) {
          return;
        }

        let owner = this.findSubparagraphOwnerById(this.activeSubparagraph);
        if (!owner) {
          const paragraphOwner = this.findParagraphOwnerById(this.activeParagraph);
          const subparagraph = paragraphOwner?.paragraph?.subparagraphs?.[0];
          if (!paragraphOwner || !subparagraph) return;
          owner = { ...paragraphOwner, subparagraph, subparagraphIndex: 0 };
        }

        let targetSubparagraph = owner.subparagraph;
        let createdSubparagraph = false;

        const hasText =
          targetSubparagraph.contentKind === CONTENT_KIND.TEXT &&
          normalizeEditableHtml(targetSubparagraph.textHtml) !== "";

        const hasObject = targetSubparagraph.contentKind === CONTENT_KIND.OBJECT;

        if (hasText || hasObject) {
          targetSubparagraph = createSubparagraph();
          owner.paragraph.subparagraphs.splice(owner.subparagraphIndex + 1, 0, targetSubparagraph);
          createdSubparagraph = true;
        }

        targetSubparagraph.contentKind = CONTENT_KIND.OBJECT;
        targetSubparagraph.textHtml = "";
        targetSubparagraph.runs = [];
        targetSubparagraph.object = object;
        targetSubparagraph.textboxes = [];

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = targetSubparagraph.id;
        this.activeTextbox = null;

        const message = createdSubparagraph
          ? `${object.kind} inserido em novo subparágrafo, logo após o subparágrafo ativo.`
          : `${object.kind} inserido no subparágrafo ativo.`;

        const renderOptions = object.kind === KINDS.TABLE
          ? { focusFirstTableCell: object.id, fitSubparagraphId: targetSubparagraph.id }
          : {};
        this.render(message, false, renderOptions);
      },

getActiveTableCellForObjectInsertion() {
        const focusedCell = document.activeElement?.closest?.("[data-table-cell]");
        const candidates = [];
        if (focusedCell?.dataset?.tableCell) {
          candidates.push({
            tableId: focusedCell.dataset.tableCell,
            rowIndex: Number(focusedCell.dataset.row),
            colIndex: Number(focusedCell.dataset.col)
          });
        }
        if (this.activeTableCellCaret?.tableId) candidates.push(this.activeTableCellCaret);
        if (this.activeTableSelection?.tableId && this.activeTableSelection?.kind === EDIT_TARGET_KIND.TABLE_CELL) {
          candidates.push(this.activeTableSelection);
        }

        for (const item of candidates) {
          const owner = this.findObjectOwnerById?.(item.tableId);
          const table = owner?.object;
          if (!table || table.kind !== KINDS.TABLE) continue;
          if (owner.subparagraph?.id !== this.activeSubparagraph) continue;
          const rowIndex = Math.trunc(Number(item.rowIndex));
          const colIndex = Math.trunc(Number(item.colIndex));
          if (rowIndex < 0 || colIndex < 0 || rowIndex >= table.rows || colIndex >= table.cols) continue;
          return { owner, table, rowIndex, colIndex };
        }
        return null;
      },

insertObjectIntoActiveTableCellIfPossible(object) {
        const target = this.getActiveTableCellForObjectInsertion?.();
        if (!target) return false;
        const { owner, table, rowIndex, colIndex } = target;

        this.ensureTableCellObjectState?.(table);
        const currentHtml = table.cells?.[rowIndex]?.[colIndex] ?? "";
        const currentObject = table.cellObjects?.[rowIndex]?.[colIndex] || null;
        const isEmptyText = normalizeEditableHtml(currentHtml) === "";

        if (!isEmptyText || currentObject) {
          this.render("A célula precisa estar vazia para receber imagem.", true);
          return true;
        }

        object.x = 0;
        object.y = 0;
        table.cells[rowIndex][colIndex] = "";
        table.cellObjects[rowIndex][colIndex] = object;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = object.id;
        this.activeTextbox = null;
        this.activeTableCellCaret = { tableId: table.id, rowIndex, colIndex };
        this.activeTableCellRangeSelection = null;
        this.activeTableSelection = {
          tableId: table.id,
          kind: EDIT_TARGET_KIND.TABLE_CELL,
          rowIndex,
          colIndex
        };

        this.render(`${object.kind} inserido na célula ativa.`);
        return true;
      },

addSelectedObjectKind() {
        const select = document.getElementById("objectKindSelect");
        const selectedKind = select?.value || "";
        if (!selectedKind) return;
        if (![KINDS.TEXTBOX, KINDS.LIST, KINDS.LINE].includes(selectedKind)) this.pendingTextInsertionCaret = null;

        if (selectedKind === KINDS.PARAGRAPH) {
          this.addParagraphToActiveSection();
          return;
        }

        if (selectedKind === KINDS.SUBPARAGRAPH) {
          this.addSubparagraphToActiveParagraph();
          return;
        }

        if (selectedKind === KINDS.IMAGE) {
          this.addImageObjectFromBestSource();
          return;
        }

        if ([KINDS.TABLE, KINDS.LIST, KINDS.WATERMARK].includes(selectedKind)) {
          this.showObjectDialog(selectedKind);
          return;
        }

        if (selectedKind === KINDS.CHART) {
          this.showChartDialog();
          return;
        }

        if (selectedKind === KINDS.TEXTBOX) {
          if (this.insertInlineTextboxAtTextCaret()) return;
          this.addTextboxToActiveObjectSubparagraph();
          return;
        }

        if (selectedKind === KINDS.LINE) {
          if (!this.insertInlineLineAtTextCaret())
            this.render("Selecione um subparágrafo de texto (ou vazio) para inserir a linha.", true);
          return;
        }

        if (selectedKind === KINDS.PAGE_BREAK) {
          this.insertPageBreakBeforeActiveParagraph();
          return;
        }

        this.render("Tipo de objeto não reconhecido.", true);
      },

ensureLineInsertionPoint() {
        const insertion = this.getTextInsertionCaret?.();
        if (insertion) {
          const owner = this.findSubparagraphOwnerById(insertion.subparagraphId);
          if (owner && owner.subparagraph.contentKind !== CONTENT_KIND.OBJECT)
            return { ...insertion, owner };
        }

        const owner = this.findSubparagraphOwnerById(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        if (!owner || !subparagraph || subparagraph.contentKind === CONTENT_KIND.OBJECT) return null;

        const editable = document.querySelector(`[data-text-subparagraph-id="${subparagraph.id}"]`);
        if (!editable || editable.getAttribute("contenteditable") !== "true") return null;

        editable.focus();
        const range = document.createRange();
        range.selectNodeContents(editable);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return { editable, range, subparagraphId: subparagraph.id, owner };
      },

promoteSubparagraphToText(subparagraph) {
        if (!subparagraph || subparagraph.contentKind === CONTENT_KIND.OBJECT) return false;
        subparagraph.contentKind = CONTENT_KIND.TEXT;
        subparagraph.textHtml = subparagraph.textHtml || "";
        subparagraph.runs = Array.isArray(subparagraph.runs) ? subparagraph.runs : [];
        subparagraph.inlineLines ||= [];
        subparagraph.inlineTextboxes ||= [];
        subparagraph.inlineLists ||= [];
        return true;
      },

insertInlineLineAtTextCaret() {
        const insertion = this.ensureLineInsertionPoint?.();
        if (!insertion) return false;

        const owner = insertion.owner || this.findSubparagraphOwnerById(insertion.subparagraphId);
        const subparagraph = owner?.subparagraph;
        if (!owner || !this.promoteSubparagraphToText(subparagraph)) return false;

        const line = {
          id: nextId("line"),
          kind: KINDS.LINE,
          text: "______________________________",
          x: 0,
          y: 0
        };
        subparagraph.inlineLines ||= [];
        subparagraph.inlineLines.push(line);

        const anchor = document.createElement("span");
        anchor.className = "line-anchor";
        anchor.dataset.inlineLineAnchor = line.id;
        anchor.contentEditable = "false";
        insertion.range.insertNode(anchor);

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = subparagraph.id;
        this.activeObject = line.id;
        this.activeTextbox = null;
        this.activeEditTargetKind = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay?.();
        this.onSubparagraphInput({ currentTarget: insertion.editable }, insertion.editable);
        this.render("Linha de assinatura inserida no subparágrafo.");

        requestAnimationFrame(() => {
          const editable = document.querySelector(`[data-text-subparagraph-id="${subparagraph.id}"]`);
          const element = editable?.querySelector(`[data-inline-line-id="${line.id}"]`);
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

insertInlineTextboxAtTextCaret() {
        const insertion = this.getTextInsertionCaret?.();
        if (!insertion) return false;

        const owner = this.findSubparagraphOwnerById(insertion.subparagraphId);
        if (!owner || owner.subparagraph.contentKind === CONTENT_KIND.OBJECT) return false;

        const textbox = createTextbox();
        textbox.inline = true;
        textbox.alignment = this.getInlineTextboxFloatSide(insertion);
        textbox.x = 0;
        textbox.y = 0;
        owner.subparagraph.inlineTextboxes ||= [];
        owner.subparagraph.inlineTextboxes.push(textbox);

        const anchor = document.createElement("span");
        anchor.className = "textbox-anchor";
        anchor.dataset.inlineTextboxAnchor = textbox.id;
        anchor.contentEditable = "false";
        this.getEndOfVisualLineRange?.(insertion).insertNode(anchor);

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;
        this.activeObject = null;
        this.activeEditTargetKind = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay?.();
        this.onSubparagraphInput({ currentTarget: insertion.editable }, insertion.editable);
        this.render("Caixa de texto inserida depois de completar a linha do cursor.");

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

getEndOfVisualLineRange(insertion) {
        const editable = insertion?.editable;
        const caretRange = insertion?.range;
        if (!editable || !caretRange?.collapsed || caretRange.startContainer.nodeType !== Node.TEXT_NODE) {
          return caretRange;
        }

        const caretRect = caretRange.getBoundingClientRect?.();
        if (!caretRect || caretRect.height <= 0) return caretRange;

        const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
        let textNode;
        let started = false;
        let lastNode = caretRange.startContainer;
        let lastOffset = caretRange.startOffset;

        while ((textNode = walker.nextNode())) {
          let offset = 0;
          if (!started) {
            if (textNode !== caretRange.startContainer) continue;
            started = true;
            offset = caretRange.startOffset;
          }

          for (; offset < textNode.length; offset += 1) {
            const characterRange = document.createRange();
            characterRange.setStart(textNode, offset);
            characterRange.setEnd(textNode, offset + 1);
            const rect = characterRange.getBoundingClientRect();

            if (rect.height > 0 && rect.top > caretRect.top + 1) {
              const lineEnd = document.createRange();
              lineEnd.setStart(lastNode, lastOffset);
              lineEnd.collapse(true);
              return lineEnd;
            }

            lastNode = textNode;
            lastOffset = offset + 1;
          }
        }

        const lineEnd = document.createRange();
        lineEnd.setStart(lastNode, lastOffset);
        lineEnd.collapse(true);
        return lineEnd;
      },

insertInlineListAtTextCaret(list) {
        const insertion = this.getTextInsertionCaret?.();
        if (!insertion) return false;

        const owner = this.findSubparagraphOwnerById(insertion.subparagraphId);
        if (!owner || owner.subparagraph.contentKind === CONTENT_KIND.OBJECT) return false;

        list.alignment = ["left", "center", "right"].includes(list.alignment) ? list.alignment : "left";
        delete list.placement;
        delete list.floatSide;
        delete list.x;
        delete list.y;
        owner.subparagraph.inlineLists ||= [];
        owner.subparagraph.inlineLists.push(list);

        const anchor = document.createElement("span");
        anchor.className = "list-anchor";
        anchor.dataset.inlineListAnchor = list.id;
        anchor.contentEditable = "false";
        const insertionRange = this.getEndOfVisualLineRange?.(insertion) || insertion.range;
        insertionRange.insertNode(anchor);
        const ZWSP = "\u200B";
        if (!anchor.previousSibling || anchor.previousSibling.nodeType !== Node.TEXT_NODE || anchor.previousSibling.nodeValue !== ZWSP)
          anchor.before(document.createTextNode(ZWSP));
        if (!anchor.nextSibling || anchor.nextSibling.nodeType !== Node.TEXT_NODE || anchor.nextSibling.nodeValue !== ZWSP)
          anchor.after(document.createTextNode(ZWSP));

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = list.id;
        this.activeTextbox = null;
        this.activeEditTargetKind = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay?.();
        this.onSubparagraphInput({ currentTarget: insertion.editable }, insertion.editable);
        this.render(list.alignment === "center"
          ? "Lista centralizada inserida em linha própria."
          : "Lista alinhada inserida na posição do cursor, com o texto fluindo ao lado oposto.");

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

getTextCaretPositionWithinSubparagraph(insertion) {
        const editable = insertion?.editable;
        const range = insertion?.range;
        if (!editable || !range) return { x: 0, y: 0 };

        const areaRect = editable.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect?.();
        const clientRects = range.getClientRects?.();
        const caretRect = rangeRect?.height > 0
          ? rangeRect
          : clientRects?.length
            ? clientRects[0]
            : null;

        if (!caretRect) return { x: 0, y: 0 };
        return {
          x: Math.max(0, Math.round(caretRect.left - areaRect.left)),
          y: Math.max(0, Math.round(caretRect.top - areaRect.top))
        };
      },

getInlineTextboxFloatSide(insertion) {
        const editable = insertion?.editable;
        const range = insertion?.range;
        if (!editable || !range) return "right";

        const editableRect = editable.getBoundingClientRect();
        const caretRect = range.getBoundingClientRect();
        const caretRects = range.getClientRects?.();
        const caretX = caretRect?.height > 0
          ? caretRect.left
          : caretRects?.length
            ? caretRects[0].left
            : editableRect.left;

        // O float acompanha o lado do caret no subparágrafo.
        return caretX < editableRect.left + editableRect.width / 2 ? "left" : "right";
      },

insertPageBreakBeforeActiveParagraph() {
        const owner = this.findParagraphOwnerById(this.activeParagraph);
        if (!owner || owner.section.sectionKind !== SECTION_KIND.BODY) {
          this.render("A quebra de página só pode ser inserida no corpo do relatório.", true);
          return;
        }

        owner.section.paragraphs.splice(owner.paragraphIndex, 0, PAGE_BREAK_CHARACTER);
        this.render("Caractere de quebra de página (form feed 12) inserido antes do parágrafo.");
      },

removeSelectedPageBreakCharacter() {
        const owner = this.findParagraphOwnerById(this.activeParagraph);
        if (!owner || owner.section.paragraphs[owner.paragraphIndex - 1] !== PAGE_BREAK_CHARACTER) {
          return;
        }

        owner.section.paragraphs.splice(owner.paragraphIndex - 1, 1);
        this.render("Caractere de quebra de página removido.");
      },


addImageObjectFromBestSource() {
        const imageFields = this.getCurrentImageFieldOptions?.() || [];
        if (!this.dataSource || imageFields.length === 0) {
          this.pickImageFileAndInsert();
          return;
        }

        this.showObjectDialog(KINDS.IMAGE);
      },

insertImageFromDataField(field) {
        if (!field?.src) {
          this.render("A propriedade selecionada não contém imagem.", true);
          return;
        }

        this.insertObjectIntoActiveSubparagraph(createImageObject({
          src: field.src,
          fileName: field.label || field.macro || "imagem-json",
          label: field.label || field.macro || "Imagem",
          dataFieldPath: field.path || "",
          dataFieldMacro: field.macro || ""
        }));
      },

pickImageFileAndInsert() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.position = "fixed";
        fileInput.style.left = "-9999px";
        fileInput.style.top = "-9999px";

        fileInput.addEventListener("change", () => {
          const file = fileInput.files?.[0];
          fileInput.remove();

          if (!file) {
            this.render("Nenhuma imagem selecionada.", true);
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const imageDataUrl = String(reader.result || "");
            if (!imageDataUrl) {
              this.render("Não foi possível carregar a imagem selecionada.", true);
              return;
            }

            this.insertObjectIntoActiveSubparagraph(createImageObject({
              src: imageDataUrl,
              fileName: file.name || "imagem",
              label: file.name || "Imagem"
            }));
          };
          reader.onerror = () => {
            this.render("Não foi possível ler a imagem selecionada.", true);
          };
          reader.readAsDataURL(file);
        }, { once: true });

        document.body.appendChild(fileInput);
        fileInput.click();
      },

removeSelectedObject() {
        // O botão remove o que está selecionado no documento, não o tipo do combobox.
        if (this.activeTextbox) {
          this.removeActiveTextbox();
          return;
        }

        const selectedObject = this.activeObject ? this.findObjectOwnerById(this.activeObject) : null;
        if (selectedObject?.inline && selectedObject.object?.kind === KINDS.LIST) {
          this.removeActiveInlineList();
          return;
        }
        if (selectedObject?.inline && selectedObject.object?.kind === KINDS.LINE) {
          this.removeActiveInlineLine();
          return;
        }
        if (selectedObject?.object && selectedObject.subparagraph?.contentKind === CONTENT_KIND.OBJECT) {
          this.removeObjectFromActiveSubparagraph();
          return;
        }

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.PARAGRAPH) {
          this.removeActiveParagraph();
          return;
        }
        if (this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH) {
          this.removeActiveSubparagraph();
          return;
        }

        // Fallback: combobox só quando não há objeto/alvo selecionado no canvas.
        const selectedKind = document.getElementById("objectKindSelect")?.value;

        if (selectedKind === KINDS.PARAGRAPH) {
          this.removeActiveParagraph();
          return;
        }

        if (selectedKind === KINDS.SUBPARAGRAPH) {
          this.removeActiveSubparagraph();
          return;
        }

        if (selectedKind === KINDS.PAGE_BREAK) {
          this.removeSelectedPageBreakCharacter();
          return;
        }

        if (selectedKind === KINDS.WATERMARK) {
          if (!this.document.watermark) {
            this.render("Nenhuma marca d'água para remover.", true);
            return;
          }

          this.document.watermark = null;
          this.updateToolbarState();
          this.render("Marca d'água removida.");
          return;
        }

        this.removeObjectFromActiveSubparagraph();
      },

removeActiveInlineList() {
        if (!this.activeObject) return;
        const owner = this.findObjectOwnerById(this.activeObject);
        if (!owner?.inline || owner.object?.kind !== KINDS.LIST) return;

        const element = document.querySelector(`[data-inline-list-id="${owner.object.id}"]`);
        const editable = element?.closest?.("[data-text-subparagraph-id]");
        element?.remove();
        const removedIds = new Set([owner.object.id]);
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
        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = null;
        this.activeTextbox = null;
        this.activeEditTargetKind = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay?.();
        if (editable) this.onSubparagraphInput?.({ currentTarget: editable }, editable);
        this.render("Lista removida.", false, { focusActiveEditableSubparagraph: true });
      },

removeActiveInlineLine() {
        if (!this.activeObject) return;
        const owner = this.findObjectOwnerById(this.activeObject);
        if (!owner?.inline || owner.object?.kind !== KINDS.LINE) return;

        const element = document.querySelector(`[data-inline-line-id="${owner.object.id}"]`);
        const editable = element?.closest?.("[data-text-subparagraph-id]");
        element?.remove();
        owner.subparagraph.inlineLines = (owner.subparagraph.inlineLines || [])
          .filter(line => line.id !== owner.object.id);
        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = null;
        this.activeTextbox = null;
        this.activeEditTargetKind = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay?.();
        if (editable) this.onSubparagraphInput?.({ currentTarget: editable }, editable);
        this.render("Linha removida.", false, { focusActiveEditableSubparagraph: true });
      },

addTextboxToActiveObjectSubparagraph() {
        // Resolve the textbox destination from the selected item itself. A
        // toolbar change can move focus away from the canvas; in that case the
        // object/textbox owner is the reliable source for the active subparagraph.
        const selectedSubparagraphId = this.activeSubparagraph;
        const textboxOwner = this.activeTextbox
          ? this.findTextboxOwnerById?.(this.activeTextbox)
          : null;
        const objectOwner = this.activeObject
          ? this.findObjectOwnerById?.(this.activeObject)
          : null;
        const owner =
          (textboxOwner?.subparagraph?.id === selectedSubparagraphId && textboxOwner) ||
          (objectOwner?.subparagraph?.id === selectedSubparagraphId && objectOwner) ||
          this.findSubparagraphOwnerById?.(selectedSubparagraphId);

        const subparagraph = owner?.subparagraph;
        if (!owner || !subparagraph) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = subparagraph.id;
        subparagraph.textboxes ||= [];

        const textbox = createTextbox();
        const tableCell = this.getActiveTableCellForObjectInsertion?.();
        const isObjectSp = subparagraph.contentKind === CONTENT_KIND.OBJECT && subparagraph.object;

        if (tableCell && isObjectSp) {
          const { owner, table, rowIndex, colIndex } = tableCell;
          const cellElement = this.getTableCellElement?.(table.id, rowIndex, colIndex);
          const cellStyle = cellElement ? getComputedStyle(cellElement) : null;
          const availableWidth = cellElement
            ? Math.max(0, cellElement.clientWidth -
                (Number.parseFloat(cellStyle?.paddingLeft) || 0) -
                (Number.parseFloat(cellStyle?.paddingRight) || 0))
            : 0;

          textbox.x = 0;
          textbox.y = 0;
          if (availableWidth > 0)
            textbox.width = Math.min(textbox.width, availableWidth);
          textbox.tableCell = { tableId: table.id, rowIndex, colIndex };

          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTableCellCaret = { tableId: table.id, rowIndex, colIndex };
          this.activeTableSelection = {
            tableId: table.id,
            kind: EDIT_TARGET_KIND.TABLE_CELL,
            rowIndex,
            colIndex
          };
        } else if (!isObjectSp) {
          // Caixa flutuante em SP de texto/vazio: o SP continua editável.
          if (subparagraph.contentKind === CONTENT_KIND.EMPTY) {
            subparagraph.contentKind = CONTENT_KIND.TEXT;
          }
        }

        subparagraph.textboxes.push(textbox);
        this.activeTextbox = textbox.id;
        this.render(tableCell && isObjectSp ? "Caixa de texto inserida na célula selecionada." : "Caixa de texto inserida.");
      },

removeObjectFromActiveSubparagraph() {
        const subparagraph = this.findSubparagraphById(this.activeSubparagraph);
        if (!subparagraph) return;

        if (subparagraph.contentKind !== CONTENT_KIND.OBJECT || !subparagraph.object) {
          this.render("O subparágrafo ativo não contém objeto para remover.", true);
          return;
        }

        subparagraph.contentKind = CONTENT_KIND.EMPTY;
        subparagraph.object = null;
        subparagraph.textboxes = [];
        subparagraph.textHtml = "";
        subparagraph.runs = [];
        this.activeTextbox = null;
        this.render("Objeto removido. O subparágrafo voltou a ficar vazio e editável.", false, { focusActiveEditableSubparagraph: true });
      },

removeActiveTextbox() {
        if (!this.activeTextbox) {
          this.render("Nenhuma caixa de texto está selecionada.", true);
          return;
        }

        const owner = this.findTextboxOwnerById(this.activeTextbox);
        if (!owner) {
          this.activeTextbox = null;
          this.render("A caixa de texto selecionada não foi encontrada.", true);
          return;
        }

        if (owner.inline) {
          const element = document.querySelector(`[data-inline-textbox="true"][data-textbox-id="${owner.textbox.id}"]`);
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
            container.querySelector(`[data-inline-textbox-anchor="${owner.textbox.id}"]`)?.remove();
            owner.subparagraph.textHtml = container.innerHTML;
          }

          owner.subparagraph.inlineTextboxes.splice(owner.textboxIndex, 1);
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = null;
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
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
          this.renderStatePanel("Caixa de texto removida.");
          this.updateToolbarState();
          this.updateJsonOutput();
          return;
        }

        owner.subparagraph.textboxes.splice(owner.textboxIndex, 1);
        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;
        this.render("Caixa de texto removida.");
      },
});
