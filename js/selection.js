"use strict";

Object.assign(wordex, {
getSelectedEditableRange() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
        const editable = element?.closest?.("[contenteditable='true']");
        if (!editable) return null;

        return { selection, range, editable };
      },

getActiveEditableElement() {
        const activeElement = document.activeElement;
        if (activeElement?.getAttribute?.("contenteditable") === "true") return activeElement;

        const selection = window.getSelection();
        const node = selection?.anchorNode;
        const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
        const editable = element?.closest?.("[contenteditable='true']");
        return editable || null;
      },

captureTextInsertionCaret(event = null) {
        if (event?.type === "pointerdown") this.pendingTextInsertionCaret = null;
        const selection = window.getSelection?.();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const nodeElement = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const editable = nodeElement?.closest?.("[data-text-subparagraph-id][contenteditable='true']");
        if (!editable || editable.contains(nodeElement?.closest?.("[data-inline-textbox]"))) return false;

        this.pendingTextInsertionCaret = {
          subparagraphId: editable.dataset.textSubparagraphId,
          range: range.cloneRange()
        };
        return true;
      },

getTextInsertionCaret() {
        const pending = this.pendingTextInsertionCaret;
        this.pendingTextInsertionCaret = null;

        if (pending?.range && document.contains(pending.range.startContainer)) {
          const editable = document.querySelector(`[data-text-subparagraph-id="${pending.subparagraphId}"]`);
          if (editable?.contains(pending.range.startContainer)) {
            return { editable, range: pending.range, subparagraphId: pending.subparagraphId };
          }
        }

        const selection = window.getSelection?.();
        if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        const node = range.startContainer;
        const nodeElement = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const editable = nodeElement?.closest?.("[data-text-subparagraph-id][contenteditable='true']");
        if (!editable || nodeElement?.closest?.("[data-inline-textbox]")) return null;
        return { editable, range: range.cloneRange(), subparagraphId: editable.dataset.textSubparagraphId };
      },

focusActiveEditableForTextCommand() {
        const editable = this.getActiveEditableElement();
        if (editable) {
          editable.focus();
          return true;
        }

        const activeSubparagraph = this.findSubparagraphById(this.activeSubparagraph);
        if (!activeSubparagraph || activeSubparagraph.contentKind === CONTENT_KIND.OBJECT) return false;

        const subparagraphElement = document.querySelector(`[data-text-subparagraph-id="${this.activeSubparagraph}"]`);
        if (!subparagraphElement || subparagraphElement.getAttribute("contenteditable") !== "true") return false;
        subparagraphElement.focus();
        this.placeCaretAtEnd(subparagraphElement);
        return true;
      },

syncActiveEditableAfterTextCommand(explicitEditable = null) {
        const editable = explicitEditable || this.getActiveEditableElement();
        if (!editable) return;

        if (editable.dataset.textSubparagraphId) {
          this.onSubparagraphInput({ currentTarget: editable }, editable);
          return;
        }

        if (editable.dataset.tableCell) {
          this.onTableCellInput({ currentTarget: editable }, editable);
          return;
        }

        if (editable.dataset.textboxContent) {
          this.onTextboxInput({ currentTarget: editable }, editable);
        }
      },

clearNativeCaretAndSelection() {
        const activeElement = document.activeElement;
        if (activeElement?.getAttribute?.("contenteditable") === "true") {
          activeElement.blur();
        }

        const selection = window.getSelection?.();
        selection?.removeAllRanges?.();
      },

activateSubparagraphOwner(owner, options = {}) {
        if (!owner) return false;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;

        if (Object.prototype.hasOwnProperty.call(options, "activeObject")) {
          this.activeObject = options.activeObject;
        } else if (owner.subparagraph.contentKind !== CONTENT_KIND.OBJECT) {
          this.activeObject = null;
        }

        this.activeTableSelection = null;
        return true;
      },

setActive(sectionId, paragraphId, subparagraphId, textboxId = null, options = {}) {
        const alreadyActive =
          this.activeSection === sectionId &&
          this.activeParagraph === paragraphId &&
          this.activeSubparagraph === subparagraphId &&
          this.activeTextbox === textboxId;

        this.activeSection = sectionId;
        this.activeParagraph = paragraphId;
        this.activeSubparagraph = subparagraphId;
        this.activeTextbox = textboxId;
        this.activeObject = null;
        this.activeEditTargetKind = null;
        this.activeTableSelection = null;
        this.objectEditMode = false;
        this.hideObjectEditOverlay();
        this.hideMarginDialog();

        if (alreadyActive) {
          // Não recria o DOM quando o usuário clica novamente no mesmo item.
          // Recriar o DOM durante a seleção nativa do navegador desfaz ações
          // como duplo-clique para selecionar uma palavra dentro do subparágrafo.
          this.renderStatePanel();
          this.updateToolbarState();
          this.updateJsonOutput();
          return;
        }

        this.render("", false, options);
      },

onSectionClick(event, element) {
        event.stopPropagation();
        const section = this.findSectionById(element.dataset.sectionId);
        if (!section) return;

        const paragraph = this.getFirstParagraph(section);
        const subparagraph = paragraph.subparagraphs[0];
        this.setActive(section.id, paragraph.id, subparagraph.id);
      },

onParagraphClick(event, element) {
        event.stopPropagation();

        if (event.ctrlKey) {
          event.preventDefault();
          this.enterParagraphEditMode(element.dataset.paragraphId);
          return;
        }

        const section = this.findSectionById(element.dataset.sectionId);
        const paragraph = this.findParagraphById(element.dataset.paragraphId);
        if (!section || !paragraph) return;

        const subparagraph = paragraph.subparagraphs[0];
        this.setActive(section.id, paragraph.id, subparagraph.id);
      },

onSubparagraphPointerDown(event, element) {
        if (event.target.closest("[data-main-object-id]") ||
            event.target.closest("[data-textbox-id]") ||
            event.target.closest("[data-inline-line-id]")) return;

        const owner = this.findSubparagraphOwnerById(element.dataset.subparagraphId);
        if (!owner || owner.paragraph.subparagraphs.length <= 1) return;

        const isCtrlPointer = event.ctrlKey || event.metaKey;
        const isActiveMoveTarget =
          this.objectEditMode &&
          this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH &&
          this.activeSubparagraph === owner.subparagraph.id;

        // Ctrl+arrastar move imediatamente. Depois de Ctrl+clique,
        // um arrasto simples dentro do subparágrafo ativo também move.
        if (!isCtrlPointer && !isActiveMoveTarget) return;

        event.preventDefault();
        event.stopPropagation();

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;
        this.activeObject = null;
        this.activeEditTargetKind = EDIT_TARGET_KIND.SUBPARAGRAPH;
        this.activeTableSelection = null;
        this.objectEditMode = true;
        this.hideMarginDialog();
        this.refreshActiveClasses();

        const rect = element.getBoundingClientRect();
        const paragraphElement = document.querySelector(`[data-paragraph-id="${owner.paragraph.id}"]`);
        const paragraphRect = paragraphElement?.getBoundingClientRect();
        const currentY = Number.isFinite(Number(owner.subparagraph.y)) ? Number(owner.subparagraph.y) : 0;

        this.dragging = {
          type: "subparagraph-move",
          subparagraphId: owner.subparagraph.id,
          startClientY: event.clientY,
          startY: currentY,
          minY: paragraphRect ? Math.round(paragraphRect.top - rect.top + currentY) : -9999,
          maxY: paragraphRect ? Math.round(paragraphRect.bottom - rect.bottom + currentY) : 9999,
          moved: false
        };

        element.classList.add("is-moving");
        element.setPointerCapture?.(event.pointerId);
        this.renderStatePanel("Movendo subparágrafo na vertical.");
        this.updateToolbarState();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

onSubparagraphClick(event, element) {
        // Clique comum numa célula editável fica com a célula.
        // Não renderiza, não limpa caret e não troca foco ao soltar o mouse.
        if (event.target.closest("[data-table-cell][contenteditable='true']") && !(event.ctrlKey || event.metaKey)) {
          event.stopPropagation();
          return;
        }

        // Qualquer clique dentro do subparágrafo deve mantê-lo como seleção primária.
        // Objetos/textboxes tratam a seleção secundária em seus próprios handlers.
        const clickedTextbox = event.target.closest("[data-textbox-id]");
        if (clickedTextbox) {
          event.stopPropagation();
          const textboxOwner = this.findTextboxOwnerById(clickedTextbox.dataset.textboxId);
          if (textboxOwner) {
            this.activeSection = textboxOwner.section.id;
            this.activeParagraph = textboxOwner.paragraph.id;
            this.activeSubparagraph = textboxOwner.subparagraph.id;
            this.activeTextbox = textboxOwner.textbox.id;
            this.activeObject = null;
            this.activeEditTargetKind = null;
            this.objectEditMode = false;
            this.hideObjectEditOverlay?.();
            this.refreshActiveClasses();
            this.renderStatePanel();
            this.updateToolbarState();
            this.updateJsonOutput();
          }
          return;
        }

        if (event.target.closest("[data-main-object-id]")) {
          event.stopPropagation();
          const owner = this.findSubparagraphOwnerById(element.dataset.subparagraphId);
          if (owner) {
            this.activateSubparagraphOwner(owner);
            this.clearNativeCaretAndSelection();
            this.refreshActiveClasses();
            this.renderStatePanel();
            this.updateToolbarState();
            this.updateJsonOutput();
          }
          return;
        }

        event.stopPropagation();

        if (this.suppressSubparagraphClickAfterDrag) {
          this.suppressSubparagraphClickAfterDrag = false;
          event.preventDefault();
          return;
        }

        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();

          const owner = this.findSubparagraphOwnerById(element.dataset.subparagraphId);
          if (!owner) return;

          if (owner.paragraph.subparagraphs.length <= 1) {
            this.setActive(owner.section.id, owner.paragraph.id, owner.subparagraph.id, null, { focusActiveEditableSubparagraph: true });
            this.renderStatePanel("Movimentação/redimensionamento de subparágrafo só fica disponível quando o parágrafo tem mais de um subparágrafo.");
            return;
          }

          this.enterSubparagraphEditMode(element.dataset.subparagraphId);
          return;
        }

        const section = this.findSectionById(element.dataset.sectionId);
        if (!section) return;

        const sameSelection =
          this.activeSection === element.dataset.sectionId &&
          this.activeParagraph === element.dataset.paragraphId &&
          this.activeSubparagraph === element.dataset.subparagraphId &&
          !this.activeTextbox;

        // Um clique no texto do mesmo subparágrafo desmarca a lista inline,
        // sem renderizar novamente e destruir o caret do navegador.
        const selectedObject = this.activeObject
          ? this.findObjectOwnerById?.(this.activeObject)
          : null;
        if (sameSelection && selectedObject?.inline &&
            selectedObject.object?.kind === KINDS.LINE) {
          this.activeObject = null;
          document.querySelectorAll(".wordex-inline-line.is-active").forEach(line => {
            line.classList.remove("is-active");
          });
          this.hideObjectEditOverlay?.();
          this.refreshActiveClasses?.();
          this.renderStatePanel?.("Linha desmarcada.");
          this.updateToolbarState?.();
          this.updateJsonOutput?.();
        } else if (sameSelection && selectedObject?.inline &&
            selectedObject.object?.kind === KINDS.LIST) {
          this.activeObject = null;
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay?.();
          this.refreshActiveClasses?.();
          this.renderStatePanel?.("Lista desmarcada.");
          this.updateToolbarState?.();
          this.updateJsonOutput?.();
        }

        // Se o usuário está editando/selecionando texto dentro do subparágrafo já ativo,
        // não renderiza de novo. Renderizar aqui recria o DOM e destrói seleções nativas
        // do navegador, como duplo-clique para selecionar palavra.
        if (sameSelection) {
          const activeElement = document.activeElement;
          const isEditableAlreadyFocused =
            activeElement?.getAttribute?.("contenteditable") === "true" &&
            activeElement.dataset?.textSubparagraphId === element.dataset.subparagraphId;

          if (!isEditableAlreadyFocused && element.getAttribute("contenteditable") === "true") {
            element.focus();
            this.placeCaretAtEnd(element);
          }
          return;
        }

        const owner = this.findSubparagraphOwnerById(element.dataset.subparagraphId);
        const shouldFocusText = owner?.subparagraph?.contentKind !== CONTENT_KIND.OBJECT;
        if (!shouldFocusText) this.clearNativeCaretAndSelection();
        this.setActive(element.dataset.sectionId, element.dataset.paragraphId, element.dataset.subparagraphId, null, { focusActiveEditableSubparagraph: shouldFocusText });
      },

onSubparagraphContextMenu(event, element) {
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        event.stopPropagation();

        const owner = this.findSubparagraphOwnerById(element.dataset.subparagraphId);
        if (!owner) return;

        if (owner.paragraph.subparagraphs.length <= 1) {
          this.setActive(owner.section.id, owner.paragraph.id, owner.subparagraph.id);
          this.renderStatePanel("Redimensionamento de subparágrafo só fica disponível quando o parágrafo tem mais de um subparágrafo.");
          return;
        }

        this.enterSubparagraphEditMode(element.dataset.subparagraphId);
      },

onEditableBeforeInput(event, element) {
        if (!event || event.defaultPrevented || event.isComposing) return;
        if (event.inputType !== "insertText") return;
        if (event.data === null || event.data === undefined || event.data === "") return;
        if (!element || element.getAttribute?.("contenteditable") !== "true") return;

        const styles = this.getTypingTextDefaults?.() || this.getCurrentToolbarTextStyles?.() || {};
        const inserted = window.WordexRichText?.insertTextWithStyle?.(element, event.data, styles);
        if (!inserted) return;

        event.preventDefault();
        this.syncActiveEditableAfterTextCommand(element);
        this.updateTextCommandButtonsVisibility?.();
      },

onSubparagraphInput(event, element) {
        const owner = this.findSubparagraphOwnerById(element.dataset.textSubparagraphId);
        const subparagraph = owner?.subparagraph;
        if (!owner || !this.isSectionEnabled(owner.section) || !subparagraph || subparagraph.contentKind === CONTENT_KIND.OBJECT) return;

        const editableCopy = element.cloneNode(true);
        const inlineTextboxes = Array.isArray(subparagraph.inlineTextboxes) ? subparagraph.inlineTextboxes : [];
        const presentTextboxIds = new Set();
        const inlineLists = Array.isArray(subparagraph.inlineLists) ? subparagraph.inlineLists : [];
        const presentListIds = new Set();
        const inlineLines = Array.isArray(subparagraph.inlineLines) ? subparagraph.inlineLines : [];
        const presentLineIds = new Set();

        editableCopy.querySelectorAll("[data-inline-textbox-anchor]").forEach(anchor => {
          presentTextboxIds.add(anchor.dataset.inlineTextboxAnchor);
        });

        editableCopy.querySelectorAll("[data-inline-list-anchor]").forEach(anchor => {
          presentListIds.add(anchor.dataset.inlineListAnchor);
        });
        editableCopy.querySelectorAll("[data-inline-line-anchor]").forEach(anchor => {
          presentLineIds.add(anchor.dataset.inlineLineAnchor);
        });

        editableCopy.querySelectorAll("[data-inline-textbox='true']").forEach(textboxElement => {
          const textboxId = textboxElement.dataset.textboxId;
          const textbox = inlineTextboxes.find(item => item.id === textboxId);
          if (!textbox) {
            textboxElement.remove();
            return;
          }

          const content = textboxElement.querySelector(`[data-textbox-content="${textboxId}"]`);
          if (content) textbox.html = content.innerHTML;

          const anchor = document.createElement("span");
          anchor.className = "textbox-anchor";
          anchor.dataset.inlineTextboxAnchor = textboxId;
          anchor.contentEditable = "false";
          textboxElement.replaceWith(anchor);
          presentTextboxIds.add(textboxId);
        });

        [...editableCopy.querySelectorAll("[data-inline-list-id]")].reverse().forEach(listElement => {
          const listId = listElement.dataset.inlineListId;
          const list = inlineLists.find(item => item.id === listId);
          if (!list) {
            listElement.remove();
            return;
          }

          presentListIds.add(listId);
          // Sublistas são reconstruídas a partir dos seus vínculos; somente a
          // lista-raiz ocupa uma âncora no fluxo de texto do subparágrafo.
          if (list.parentListId) {
            listElement.remove();
            return;
          }

          const anchor = document.createElement("span");
          anchor.className = "list-anchor";
          anchor.dataset.inlineListAnchor = listId;
          anchor.contentEditable = "false";
          listElement.replaceWith(anchor);
        });

        editableCopy.querySelectorAll("[data-inline-line-id]").forEach(lineElement => {
          const lineId = lineElement.dataset.inlineLineId;
          if (!inlineLines.some(line => line.id === lineId)) {
            lineElement.remove();
            return;
          }
          const anchor = document.createElement("span");
          anchor.className = "line-anchor";
          anchor.dataset.inlineLineAnchor = lineId;
          anchor.contentEditable = "false";
          lineElement.replaceWith(anchor);
          presentLineIds.add(lineId);
        });

        subparagraph.inlineTextboxes = inlineTextboxes.filter(textbox => presentTextboxIds.has(textbox.id));
        subparagraph.inlineLists = inlineLists.filter(list => presentListIds.has(list.id));
        subparagraph.inlineLines = inlineLines.filter(line => presentLineIds.has(line.id));
        const html = normalizeEditableHtml(editableCopy.innerHTML);
        subparagraph.textHtml = html;
        // A conversão DOM -> Runs usa os defaults estáveis do documento,
        // não o valor atual da toolbar. A toolbar representa o próximo texto
        // a ser digitado; ela não pode repintar texto sem estilo quando uma
        // seleção recebe cor/fonte/tamanho.
        subparagraph.runs = window.WordexRuns?.htmlToRuns
          ? window.WordexRuns.htmlToRuns(html, this.document.textDefaults || this.getCurrentToolbarTextStyles?.() || {})
          : [];
        subparagraph.contentKind = html === "" ? CONTENT_KIND.EMPTY : CONTENT_KIND.TEXT;
        this.renderStatePanel();
        this.updateJsonOutput();
      },

onTableCellInput(event, element) {
        const tableId = element?.dataset?.tableCell;
        const owner = this.findObjectOwnerById?.(tableId);
        const table = owner?.object;
        if (!owner || !this.isSectionEnabled(owner.section) || !table || table.kind !== KINDS.TABLE) return;

        const row = Number(element.dataset.row);
        const col = Number(element.dataset.col);
        if (!Array.isArray(table.cells?.[row])) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = tableId;
        this.activeTableCellCaret = {
          tableId,
          rowIndex: row,
          colIndex: col
        };
        table.cells[row][col] = element.innerHTML;
        this.updateJsonOutput();
      },

syncAllEditableDomToDocument() {
        const root = document.getElementById("page");
        if (!root) return;

        root.querySelectorAll("[data-text-subparagraph-id]").forEach(element => {
          this.onSubparagraphInput?.({ currentTarget: element }, element);
        });

        root.querySelectorAll("[data-textbox-content]").forEach(element => {
          this.onTextboxInput?.({ currentTarget: element }, element);
        });

        root.querySelectorAll("[data-table-cell]").forEach(element => {
          this.onTableCellInput?.({ currentTarget: element }, element);
        });

        this.updateJsonOutput?.();
      },

onTextboxClick(event, element) {
        event.stopPropagation();
        const owner = this.findTextboxOwnerById(element.dataset.textboxId);
        if (!owner) return;

        const sameSelection =
          this.activeSection === owner.section.id &&
          this.activeParagraph === owner.paragraph.id &&
          this.activeSubparagraph === owner.subparagraph.id &&
          this.activeTextbox === owner.textbox.id;

        if (sameSelection) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = owner.textbox.id;
        if (owner.inline) {
          this.activeObject = null;
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay?.();
          this.refreshActiveClasses?.();
          this.renderStatePanel?.();
          this.updateToolbarState?.();
          this.updateJsonOutput?.();
          return;
        }
        this.render();
      },

onInlineListClick(event, element) {
        event.preventDefault();
        event.stopPropagation();
        const owner = this.findObjectOwnerById(element.dataset.inlineListId);
        if (!owner?.object) return;

        this.activateSubparagraphOwner?.(owner, { activeObject: owner.object.id });
        this.activeTextbox = null;
        if (event.ctrlKey || event.metaKey) {
          this.activeEditTargetKind = KINDS.LIST;
          this.objectEditMode = true;
        } else {
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay?.();
        }
        this.refreshActiveClasses?.();
        this.positionObjectEditOverlay?.();
        this.renderStatePanel?.(event.ctrlKey || event.metaKey
          ? "Lista selecionada para redimensionamento. Dê duplo-clique para editar os itens."
          : "Lista selecionada. Dê duplo-clique para editar os itens.");
        this.updateToolbarState?.();
        this.updateJsonOutput?.();
      },

onInlineLineClick(event, element) {
        event.preventDefault();
        event.stopPropagation();
        const owner = this.findObjectOwnerById(element.dataset.inlineLineId);
        if (!owner?.object) return;
        this.activateSubparagraphOwner?.(owner, { activeObject: owner.object.id });
        this.activeTextbox = null;
        if (event.ctrlKey || event.metaKey) {
          this.activeEditTargetKind = KINDS.LINE;
          this.objectEditMode = true;
          this.clearNativeCaretAndSelection?.();
        } else {
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay?.();
        }
        this.refreshActiveClasses?.();
        this.positionObjectEditOverlay?.();
        this.renderStatePanel?.(event.ctrlKey || event.metaKey
          ? "Linha selecionada para redimensionamento."
          : "Linha selecionada.");
        this.updateToolbarState?.();
        this.updateJsonOutput?.();
      },

onTextboxInput(event, element) {
        const owner = this.findTextboxOwnerById(element.dataset.textboxContent);
        const textbox = owner?.textbox;
        if (!owner || !this.isSectionEnabled(owner.section) || !textbox) return;

        textbox.html = element.innerHTML;
        this.updateJsonOutput();
      },
});
