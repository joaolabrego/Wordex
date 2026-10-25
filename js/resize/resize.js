"use strict";

Object.assign(wordex, {
ensureObjectEditOverlay() {
        if (this.resizeOverlay) return this.resizeOverlay;

        const overlay = document.createElement("div");
        overlay.className = "wordex-object-edit-overlay";
        overlay.setAttribute("aria-hidden", "true");

        ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach(handleName => {
          const handle = document.createElement("span");
          handle.className = "wordex-object-edit-handle";
          handle.dataset.handle = handleName;
          handle.title = "Redimensionar objeto";
          handle.addEventListener("pointerdown", event => this.onObjectResizeHandlePointerDown(event, handle));
          overlay.appendChild(handle);
        });

        document.body.appendChild(overlay);
        this.resizeOverlay = overlay;
        return overlay;
      },

enterParagraphEditMode(paragraphId) {
        const owner = this.findParagraphOwnerById(paragraphId);
        if (!owner) return;

        const subparagraph = owner.paragraph.subparagraphs.find(item => item.id === this.activeSubparagraph) || owner.paragraph.subparagraphs[0];
        if (!subparagraph) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = subparagraph.id;
        this.activeTextbox = null;
        this.activeObject = null;
        this.activeEditTargetKind = EDIT_TARGET_KIND.PARAGRAPH;
        this.activeTableSelection = null;
        this.objectEditMode = true;

        this.refreshActiveClasses();
        this.renderStatePanel("Parágrafo selecionado em modo estrutural.");
        this.updateToolbarState();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
        this.showMarginDialog();
      },

enterSubparagraphEditMode(subparagraphId) {
        const owner = this.findSubparagraphOwnerById(subparagraphId);
        if (!owner) return;

        if (owner.paragraph.subparagraphs.length <= 1) {
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = null;
          this.activeObject = null;
          this.activeEditTargetKind = null;
          this.activeTableSelection = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay();
          this.hideMarginDialog();
          this.refreshActiveClasses();
          this.renderStatePanel("Redimensionamento de subparágrafo só fica disponível quando o parágrafo tem mais de um subparágrafo.");
          this.updateToolbarState();
          this.updateJsonOutput();
          return;
        }

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
        this.renderStatePanel("Subparágrafo selecionado. Arraste dentro dele para mover na vertical; arraste uma alça para redimensionar.");
        this.updateToolbarState();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

enterObjectEditMode(objectId) {
        const owner = this.findObjectOwnerById(objectId);
        if (!owner) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;
        this.activeObject = objectId;
        this.activeEditTargetKind = EDIT_TARGET_KIND.MAIN_OBJECT;
        this.activeTableSelection = null;
        this.objectEditMode = true;

        this.hideMarginDialog();
        this.clearNativeCaretAndSelection?.();
        this.refreshActiveClasses?.();
        this.renderStatePanel("Objeto em modo de edição. Arraste uma alça para redimensionar.");
        this.updateToolbarState?.();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

enterTextboxEditMode(textboxId) {
        const owner = this.findTextboxOwnerById(textboxId);
        if (!owner) return;

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = textboxId;
        this.activeObject = null;
        this.activeEditTargetKind = KINDS.TEXTBOX;
        this.activeTableSelection = null;
        this.objectEditMode = true;

        this.hideMarginDialog();
        this.clearNativeCaretAndSelection?.();
        this.refreshActiveClasses?.();
        this.renderStatePanel("Caixa de texto em modo de edição. Arraste uma alça para redimensionar.");
        this.updateToolbarState?.();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
      },

getTableCellFocusInfoFromElement(element) {
        const cell = element?.closest?.("[data-table-cell]");
        if (!cell) return null;

        return {
          tableId: cell.dataset.tableCell,
          rowIndex: Number(cell.dataset.row) || 0,
          colIndex: Number(cell.dataset.col) || 0
        };
      },

rememberFocusedTableCellBeforeEdit(tableId, fallbackRowIndex = 0, fallbackColIndex = 0) {
        const focusedInfo = this.getTableCellFocusInfoFromElement(document.activeElement);

        if (focusedInfo && focusedInfo.tableId === tableId) {
          this.tableCellFocusAfterEdit = focusedInfo;
          return;
        }

        this.tableCellFocusAfterEdit = {
          tableId,
          rowIndex: Math.max(0, Number(fallbackRowIndex) || 0),
          colIndex: Math.max(0, Number(fallbackColIndex) || 0)
        };
      },

focusTableCellAfterEdit(focusInfo) {
        if (!focusInfo?.tableId) return;

        window.requestAnimationFrame(() => {
          const cell = this.getTableCellElement(focusInfo.tableId, focusInfo.rowIndex, focusInfo.colIndex);
          if (!cell) return;

          cell.setAttribute("contenteditable", "true");
          cell.focus();
          this.placeCaretAtEnd(cell);
        });
      },

getTableCellInfoFromTarget(target, tableId) {
        const cell = target.closest?.(`[data-table-cell="${tableId}"]`);
        const table = this.findObjectOwnerById(tableId)?.object;
        if (!cell || !table) return { rowIndex: 0, colIndex: 0 };

        const rowIndex = Math.min(Math.max(0, Number(cell.dataset.row) || 0), Math.max(0, table.rows - 1));
        const colIndex = Math.min(Math.max(0, Number(cell.dataset.col) || 0), Math.max(0, table.cols - 1));
        return { rowIndex, colIndex };
      },

isTableEditTargetKind(targetKind) {
        return targetKind === EDIT_TARGET_KIND.MAIN_OBJECT ||
          targetKind === EDIT_TARGET_KIND.TABLE_ROW ||
          targetKind === EDIT_TARGET_KIND.TABLE_COLUMN ||
          targetKind === EDIT_TARGET_KIND.TABLE_CELL;
      },

isTableInEditMode(tableId) {
        const owner = this.findObjectOwnerById(tableId);
        return Boolean(
          this.objectEditMode &&
          this.activeObject === tableId &&
          owner?.object?.kind === KINDS.TABLE &&
          this.isTableEditTargetKind(this.activeEditTargetKind)
        );
      },

freezeTableRenderedSizeForEditMode(table) {
        if (!table || table.kind !== KINDS.TABLE) return;

        this.ensureTableSizeState(table);

        const objectElement = document.querySelector(`[data-main-object-id="${table.id}"]`);
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);
        if (!objectElement || !tableElement) return;

        const objectRect = objectElement.getBoundingClientRect();
        if (objectRect.width > 0) table.width = Math.round(objectRect.width);
        if (objectRect.height > 0) table.height = Math.round(objectRect.height);

        const contentWidth = Math.max(0, tableElement.getBoundingClientRect().width);
        const contentHeight = Math.max(0, tableElement.getBoundingClientRect().height);

        table.colWidths = this.getRenderedTableColumnWidths(table.id, 0, table.cols, contentWidth)
          .map(width => Math.max(0, Math.round(Number(width) || 0)));

        table.rowHeights = this.getRenderedTableRowHeights(table.id, table.rows, contentHeight)
          .map(height => Math.max(0, Math.round(Number(height) || 0)));

        objectElement.style.width = `${table.width}px`;
        objectElement.style.height = `${table.height}px`;
        tableElement.style.width = `${contentWidth}px`;
        tableElement.style.minWidth = `${contentWidth}px`;
        this.applyTableColumnWidthsToDom(table.id, table.colWidths);
        this.applyTableRowHeightsToDom(table.id, table.rowHeights);
      },

setTableEditDomState(tableId, enabled) {
        const objectElement = document.querySelector(`[data-main-object-id="${tableId}"]`);
        const tableElement = document.querySelector(`[data-table-id="${tableId}"]`);

        objectElement?.classList.toggle("is-table-edit-mode", Boolean(enabled));
        tableElement?.classList.toggle("is-table-edit-mode", Boolean(enabled));
        if (tableElement && !enabled) {
          tableElement.style.width = "";
          tableElement.style.minWidth = "";
        }

        document.querySelectorAll(`[data-table-cell="${tableId}"]`).forEach(cell => {
          cell.setAttribute("contenteditable", enabled ? "false" : "true");
        });
      },

getNextTableEditTargetKind(tableId) {
        // Ctrl+clique na tabela segue sempre o ciclo simples:
        // tabela -> linha -> coluna -> celula -> tabela.
        // Sem excecao para a primeira entrada no modo de edicao.
        const isSameTableEditSelection = this.activeTableSelection?.tableId === tableId;

        if (this.objectEditMode && isSameTableEditSelection) {
          if (this.activeEditTargetKind === EDIT_TARGET_KIND.MAIN_OBJECT) return EDIT_TARGET_KIND.TABLE_ROW;
          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_ROW) return EDIT_TARGET_KIND.TABLE_COLUMN;
          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_COLUMN) return EDIT_TARGET_KIND.TABLE_CELL;
          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_CELL) return EDIT_TARGET_KIND.MAIN_OBJECT;
        }

        return EDIT_TARGET_KIND.MAIN_OBJECT;
      },

cycleTableEditMode(tableId, eventTarget, options = {}) {
        const owner = this.findObjectOwnerById(tableId);
        if (!owner || owner.object?.kind !== KINDS.TABLE) return;

        const cellInfo = this.getTableCellInfoFromTarget(eventTarget, tableId);
        const targetKind = this.getNextTableEditTargetKind(tableId);
        this.enterTableEditMode(tableId, targetKind, cellInfo.rowIndex, cellInfo.colIndex, options);
      },

enterTableEditMode(tableId, targetKind, rowIndex = 0, colIndex = 0, options = {}) {
        const owner = this.findObjectOwnerById(tableId);
        const table = owner?.object;
        if (!owner || !table || table.kind !== KINDS.TABLE) return;

        this.ensureTableSizeState(table);

        const safeRowIndex = Math.min(Math.max(0, Number(rowIndex) || 0), Math.max(0, table.rows - 1));
        const safeColIndex = Math.min(Math.max(0, Number(colIndex) || 0), Math.max(0, table.cols - 1));

        if (!this.isTableInEditMode(tableId)) {
          this.rememberFocusedTableCellBeforeEdit(tableId, safeRowIndex, safeColIndex);
        }

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = null;
        this.activeObject = tableId;
        this.activeEditTargetKind = targetKind;
        this.activeTableSelection = {
          tableId,
          kind: targetKind,
          rowIndex: safeRowIndex,
          colIndex: safeColIndex,
          fromCtrlClick: Boolean(options.fromCtrlClick)
        };
        this.activeTableCellRangeSelection = null;
        this.objectEditMode = true;

        const message = this.getTableEditMessage(targetKind, safeRowIndex, safeColIndex);
        this.hideMarginDialog();
        this.freezeTableRenderedSizeForEditMode(table);
        this.setTableEditDomState(tableId, true);
        this.clearNativeCaretAndSelection?.();
        this.refreshActiveClasses?.();
        this.renderStatePanel(message);
        this.updateToolbarState?.();
        this.updateJsonOutput();
        this.positionObjectEditOverlay();
        window.requestAnimationFrame(() => this.positionObjectEditOverlay());
      },

getTableEditMessage(targetKind, rowIndex, colIndex) {
        if (targetKind === EDIT_TARGET_KIND.TABLE_ROW) {
          return `Linha ${rowIndex + 1} selecionada. Ctrl+clique novamente para selecionar a coluna.`;
        }

        if (targetKind === EDIT_TARGET_KIND.TABLE_COLUMN) {
          return `Coluna ${colIndex + 1} selecionada. Ctrl+clique novamente para selecionar a célula.`;
        }

        if (targetKind === EDIT_TARGET_KIND.TABLE_CELL) {
          return `Célula ${rowIndex + 1}, ${colIndex + 1} selecionada. Ctrl+clique novamente para voltar à tabela.`;
        }

        return "Tabela selecionada. Ctrl+clique novamente para selecionar a linha.";
      },

getTableRowElement(tableId, rowIndex) {
        return document.querySelector(`[data-table-row="${tableId}"][data-row="${rowIndex}"]`);
      },

getTableCellElement(tableId, rowIndex, colIndex) {
        return document.querySelector(`[data-table-cell="${tableId}"][data-row="${rowIndex}"][data-col="${colIndex}"]`);
      },

getTableColumnCells(tableId, colIndex) {
        return Array.from(document.querySelectorAll(`[data-table-cell="${tableId}"][data-col="${colIndex}"]`));
      },

getUnionRect(elements) {
        const rects = elements
          .map(element => element.getBoundingClientRect())
          .filter(rect => rect.width > 0 && rect.height > 0);

        if (rects.length === 0) return null;

        const left = Math.min(...rects.map(rect => rect.left));
        const top = Math.min(...rects.map(rect => rect.top));
        const right = Math.max(...rects.map(rect => rect.right));
        const bottom = Math.max(...rects.map(rect => rect.bottom));

        return {
          left,
          top,
          right,
          bottom,
          width: right - left,
          height: bottom - top
        };
      },

getObjectEditElement() {
        if (!this.objectEditMode) return null;

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.PARAGRAPH && this.activeParagraph) {
          return document.querySelector(`[data-paragraph-id="${this.activeParagraph}"]`);
        }

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH && this.activeSubparagraph) {
          return document.querySelector(`[data-subparagraph-id="${this.activeSubparagraph}"]`);
        }

        if (this.activeEditTargetKind === KINDS.TEXTBOX && this.activeTextbox) {
          return document.querySelector(`[data-textbox-id="${this.activeTextbox}"]`);
        }

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.MAIN_OBJECT && this.activeObject) {
          return document.querySelector(`[data-main-object-id="${this.activeObject}"]`);
        }

        if (this.activeEditTargetKind === KINDS.LIST && this.activeObject) {
          return document.querySelector(`[data-inline-list-id="${this.activeObject}"]`);
        }

        if (this.activeEditTargetKind === KINDS.LINE && this.activeObject) {
          return document.querySelector(`[data-inline-line-id="${this.activeObject}"]`);
        }

        if (!this.activeTableSelection) return null;

        const { tableId, rowIndex, colIndex } = this.activeTableSelection;

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_ROW) {
          return this.getTableRowElement(tableId, rowIndex);
        }

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_CELL) {
          return this.getTableCellElement(tableId, rowIndex, colIndex);
        }

        return null;
      },

getObjectEditRect() {
        if (this.activeTableSelection) {
          const { tableId, rowIndex, colIndex } = this.activeTableSelection;

          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_ROW) {
            return this.getUnionRect(Array.from(document.querySelectorAll(`[data-table-cell="${tableId}"][data-row="${rowIndex}"]`)));
          }

          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_COLUMN) {
            return this.getUnionRect(this.getTableColumnCells(tableId, colIndex));
          }

          if (this.activeEditTargetKind === EDIT_TARGET_KIND.TABLE_CELL) {
            const cell = this.getTableCellElement(tableId, rowIndex, colIndex);
            return cell ? cell.getBoundingClientRect() : null;
          }
        }

        const element = this.getObjectEditElement();
        return element ? element.getBoundingClientRect() : null;
      },

hideObjectEditOverlay() {
        if (this.resizeOverlay) {
          this.resizeOverlay.classList.remove("is-visible");
          this.resizeOverlay.dataset.editTargetKind = "";
        }
      },

positionObjectEditOverlay() {
        if (!this.objectEditMode) {
          this.hideObjectEditOverlay();
          return;
        }

        if (this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH) {
          const owner = this.findSubparagraphOwnerById?.(this.activeSubparagraph);
          if (!owner || owner.paragraph.subparagraphs.length <= 1) {
            this.objectEditMode = false;
            this.activeEditTargetKind = null;
            this.hideObjectEditOverlay();
            return;
          }
        }

        const rect = this.getObjectEditRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) {
          this.hideObjectEditOverlay();
          return;
        }

        const overlay = this.ensureObjectEditOverlay();
        overlay.dataset.editTargetKind = this.activeEditTargetKind || "";
        overlay.style.left = `${Math.round(rect.left)}px`;
        overlay.style.top = `${Math.round(rect.top)}px`;
        overlay.style.width = `${Math.round(rect.width)}px`;
        overlay.style.height = `${Math.round(rect.height)}px`;
        overlay.classList.add("is-visible");
      },

exitObjectEditMode(focusInfo = null) {
        if (!this.objectEditMode) return;

        const shouldRestoreTableFocus = this.activeObject && this.isTableInEditMode(this.activeObject);
        const targetFocusInfo = focusInfo || this.tableCellFocusAfterEdit;

        if (shouldRestoreTableFocus) {
          this.setTableEditDomState(this.activeObject, false);
        }

        this.objectEditMode = false;
        this.activeObject = null;
        this.activeEditTargetKind = null;
        this.activeTableSelection = null;
        this.activeTableCellRangeSelection = null;
        this.tableCellFocusAfterEdit = null;
        this.hideObjectEditOverlay();
        this.hideMarginDialog();
        this.renderStatePanel("Modo de edição do objeto finalizado.");
        this.updateTableMergeToolbarButtons?.();

        if (shouldRestoreTableFocus) {
          this.focusTableCellAfterEdit(targetFocusInfo);
        }
      },

onDocumentClick(event) {
        if (this.suppressNextDocumentClick) {
          this.suppressNextDocumentClick = false;
          return;
        }

        if (!this.objectEditMode) return;
        if (event.ctrlKey) return;
        // Clique comum numa célula editável da tabela não deve encerrar o modo
        // nem roubar o foco: o usuário está editando o texto da célula.
        if (event.target.closest("[data-table-cell][contenteditable='true']")) return;
        // Cliques na toolbar não devem encerrar a seleção de tabela/linha/coluna/célula.
        // Sem isso, abrir o combo de bordas dispara o click global e fecha o select
        // imediatamente, perdendo a seleção da tabela antes da aplicação da borda.
        if (event.target.closest(".toolbar")) return;
        if (event.target.closest(".wordex-object-edit-overlay")) return;
        if (event.target.closest(".wordex-margin-modal-backdrop")) return;
        if (event.target.closest(".wordex-margin-dialog")) return;
        if (event.target.closest(".wordex-object-modal-backdrop")) return;

        // Para a linha, clicar fora dela remove apenas sua seleção visual.
        // O modo permanece ativo, como nos demais alvos de edição; as alças
        // somem porque já não há uma linha selecionada.
        const selectedInlineObject = this.activeObject
          ? this.findObjectOwnerById?.(this.activeObject)
          : null;
        if (selectedInlineObject?.inline &&
            selectedInlineObject.object?.kind === KINDS.LINE &&
            !event.target.closest("[data-inline-line-id]")) {
          this.activeObject = null;
          document.querySelectorAll(".wordex-inline-line.is-active").forEach(element => {
            element.classList.remove("is-active");
          });
          this.hideObjectEditOverlay();
          this.refreshActiveClasses?.();
          this.renderStatePanel?.("Linha desmarcada.");
          this.updateToolbarState?.();
          this.updateJsonOutput?.();
          return;
        }

        // Clique simples cancela o modo de redimensionamento, mesmo que o
        // clique seja sobre o próprio objeto, tabela, linha, coluna, célula
        // ou caixa de texto que estava selecionado para redimensionar.
        const clickedCellFocus = this.activeObject && this.isTableInEditMode(this.activeObject)
          ? this.getTableCellFocusInfoFromElement(event.target)
          : null;

        this.exitObjectEditMode(clickedCellFocus);
      },

onObjectResizeHandlePointerDown(event, handleElement) {
        if (!this.objectEditMode) return;

        event.preventDefault();
        event.stopPropagation();

        const handleName = handleElement.dataset.handle;
        const targetKind = this.activeEditTargetKind;

        if (targetKind === EDIT_TARGET_KIND.PARAGRAPH) {
          return;
        }

        if (targetKind === EDIT_TARGET_KIND.SUBPARAGRAPH) {
          this.startSubparagraphResize(event, handleElement, handleName);
          return;
        }

        if (targetKind === KINDS.LIST) {
          const owner = this.findObjectOwnerById(this.activeObject);
          const list = owner?.object;
          const targetElement = list
            ? document.querySelector(`[data-inline-list-id="${list.id}"]`)
            : null;
          if (!owner || !list || !targetElement) return;

          const rect = targetElement.getBoundingClientRect();
          this.dragging = {
            type: "object-resize",
            editTargetKind: KINDS.LIST,
            handle: handleName,
            targetId: list.id,
            subparagraphId: owner.subparagraph.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: Math.round(rect.width),
            startHeight: Math.round(rect.height),
            availableWidth: this.getSubparagraphClientWidth(owner.subparagraph.id),
            isInlineListResize: true,
            resizeWidth: handleName.includes("e") || handleName.includes("w"),
            resizeHeight: handleName.includes("n") || handleName.includes("s")
          };

          handleElement.setPointerCapture?.(event.pointerId);
          this.renderStatePanel("Redimensionando lista.");
          return;
        }

        if (targetKind === KINDS.LINE) {
          const owner = this.findObjectOwnerById(this.activeObject);
          const line = owner?.object;
          const targetElement = line
            ? document.querySelector(`[data-inline-line-id="${line.id}"]`)
            : null;
          if (!owner || !line || !targetElement) return;

          // A linha é unidimensional; somente as alças laterais alteram seu comprimento.
          if (!handleName.includes("e") && !handleName.includes("w")) return;
          const rect = targetElement.getBoundingClientRect();
          this.dragging = {
            type: "object-resize",
            editTargetKind: KINDS.LINE,
            handle: handleName,
            targetId: line.id,
            subparagraphId: owner.subparagraph.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startWidth: Math.round(rect.width),
            startHeight: Math.round(rect.height),
            availableWidth: this.getSubparagraphClientWidth(owner.subparagraph.id),
            isInlineLineResize: true,
            resizeWidth: true,
            resizeHeight: false
          };
          handleElement.setPointerCapture?.(event.pointerId);
          this.renderStatePanel("Redimensionando linha.");
          return;
        }

        if (this.isTablePartEditTarget(targetKind)) {
          this.startTablePartResize(event, handleElement, handleName, targetKind);
          return;
        }

        let owner = null;
        let target = null;
        let targetElement = null;

        if (targetKind === KINDS.TEXTBOX && this.activeTextbox) {
          owner = this.findTextboxOwnerById(this.activeTextbox);
          target = owner?.textbox;
          targetElement = document.querySelector(`[data-textbox-id="${this.activeTextbox}"]`);
        } else if (targetKind === EDIT_TARGET_KIND.MAIN_OBJECT && this.activeObject) {
          owner = this.findObjectOwnerById(this.activeObject);
          target = owner?.object;
          targetElement = document.querySelector(`[data-main-object-id="${this.activeObject}"]`);
        }

        if (!owner || !target || !targetElement) return;

        this.normalizeAlignedMainObjectForManualPosition?.(owner, target, targetElement);

        const targetRect = targetElement.getBoundingClientRect();
        const currentX = Math.max(0, Number(target.x) || 0);
        const currentY = Math.max(0, Number(target.y) || 0);
        const cellTextboxArea = targetKind === KINDS.TEXTBOX && owner.tableCell
          ? targetElement.closest(".table-cell-textbox-area")
          : null;
        const availableWidth = cellTextboxArea
          ? cellTextboxArea.clientWidth
          : this.getSubparagraphClientWidth(owner.subparagraph.id);

        const isMainTableResize = targetKind === EDIT_TARGET_KIND.MAIN_OBJECT && target.kind === KINDS.TABLE;
        const startWidth = Math.round(targetRect.width);
        const startHeight = Math.round(targetRect.height);
        const startHorizontalChrome = this.getElementHorizontalChrome(targetElement);
        const startVerticalChrome = this.getElementVerticalChrome(targetElement);
        const startContentWidth = Math.max(0, startWidth - startHorizontalChrome);
        const startContentHeight = Math.max(0, startHeight - startVerticalChrome);

        this.dragging = {
          type: "object-resize",
          editTargetKind: targetKind,
          handle: handleName,
          targetId: target.id,
          subparagraphId: owner.subparagraph.id,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: currentX,
          startY: currentY,
          startWidth,
          startHeight,
          availableWidth,
          movementContainerKind: cellTextboxArea ? "table-cell" : "subparagraph",
          isMainTableResize,
          startHorizontalChrome,
          startVerticalChrome,
          startTableContentWidth: startContentWidth,
          startTableContentHeight: startContentHeight,
          startTableColumnWidths: isMainTableResize
            ? this.getRenderedTableColumnWidths(target.id, 0, target.cols, startContentWidth)
            : null,
          startTableRowHeights: isMainTableResize
            ? this.getRenderedTableRowHeights(target.id, target.rows, startContentHeight)
            : null
        };

        handleElement.setPointerCapture?.(event.pointerId);
        this.renderStatePanel(targetKind === KINDS.TEXTBOX ? "Redimensionando caixa de texto." : "Redimensionando objeto.");
      },

normalizeAlignedMainObjectForManualPosition(owner, object, element) {
        if (!owner || owner.table || !object || !element) return;
        if (!["center", "right"].includes(object.horizontalAlign)) return;

        const area = element.closest(".object-area");
        if (!area) return;

        const areaRect = area.getBoundingClientRect();
        const objectRect = element.getBoundingClientRect();
        object.x = Math.max(0, Math.round(objectRect.left - areaRect.left));
        object.horizontalAlign = "left";
        area.dataset.objectAlign = "left";
        element.style.transform = `translate(${object.x}px, ${Number(object.y) || 0}px)`;
      },

startSubparagraphResize(event, handleElement, handleName) {
        const owner = this.findSubparagraphOwnerById(this.activeSubparagraph);
        const subparagraph = owner?.subparagraph;
        const element = document.querySelector(`[data-subparagraph-id="${this.activeSubparagraph}"]`);
        const paragraphElement = document.querySelector(`[data-paragraph-id="${this.activeParagraph}"]`);
        const subparagraphs = owner?.paragraph?.subparagraphs || [];

        if (!owner || !subparagraph || !element || !paragraphElement || subparagraphs.length <= 1) return;

        const rect = element.getBoundingClientRect();
        const innerWidth = this.paragraphContentWidthForSubparagraphs(paragraphElement, subparagraphs.length);
        const minimum = 32;

        this.dragging = {
          type: "subparagraph-resize",
          subparagraphId: subparagraph.id,
          handle: handleName,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startWidth: Math.round(rect.width),
          startHeight: Math.round(rect.height),
          maxWidth: Math.max(minimum, innerWidth - minimum * (subparagraphs.length - 1))
        };

        handleElement.setPointerCapture?.(event.pointerId);
        this.renderStatePanel("Redimensionando subparágrafo.");
      },

calculateSubparagraphResize(dragging, event) {
        const deltaX = event.clientX - dragging.startClientX;
        const deltaY = event.clientY - dragging.startClientY;
        const handle = dragging.handle || "se";

        let width = dragging.startWidth;
        let height = dragging.startHeight;

        if (handle.includes("e")) {
          width = dragging.startWidth + deltaX;
        }

        if (handle.includes("w")) {
          width = dragging.startWidth - deltaX;
        }

        if (handle.includes("s")) {
          height = dragging.startHeight + deltaY;
        }

        if (handle.includes("n")) {
          height = dragging.startHeight - deltaY;
        }

        return {
          width: Math.min(Math.max(0, Math.round(width)), Math.max(0, Number(dragging.maxWidth) || 0)),
          height: Math.max(0, Math.round(height))
        };
      },

paragraphContentWidthForSubparagraphs(paragraphElement, count) {
        if (!paragraphElement) return 0;
        const style = getComputedStyle(paragraphElement);
        const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        const gap = parseFloat(style.columnGap || style.gap) || 0;
        return Math.max(0, paragraphElement.clientWidth - padding - gap * Math.max(0, count - 1));
      },

isSubparagraphWidthShare(width) {
        const value = Number(width);
        return value > 0 && value <= 1;
      },

subparagraphWidthShare(paragraph, subparagraph) {
        const subs = paragraph?.subparagraphs || [];
        if (subs.length <= 1) return null;
        if (!subs.some(item => this.isSubparagraphWidthShare(item.width))) return null;

        const defined = subs.map(item => this.isSubparagraphWidthShare(item.width) ? Number(item.width) : null);
        const definedSum = defined.reduce((sum, value) => sum + (value || 0), 0);
        const missing = defined.filter(value => value == null).length;
        const eachMissing = missing ? Math.max(0, 1 - definedSum) / missing : 0;
        const raw = defined.map(value => value == null ? eachMissing : value);
        const total = raw.reduce((sum, value) => sum + value, 0) || 1;
        const index = subs.indexOf(subparagraph);
        if (index < 0) return null;
        return raw[index] / total;
      },

applySubparagraphWidthShare(element, share, innerWidth) {
        if (!element || !(share > 0)) return;
        let grow = share;
        // flex-basis 0 recebe o padding e a borda por cima da fração.
        // O fator de crescimento desconta essa moldura para a caixa final
        // continuar valendo a fração da largura interna do parágrafo.
        if (innerWidth > 0) {
          const style = getComputedStyle(element);
          const chrome = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
            + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
          grow = Math.max(0.001, share * innerWidth - chrome);
        }
        element.style.flex = `${grow} 1 0px`;
        element.style.width = "auto";
        element.style.maxWidth = "none";
        element.style.minWidth = "0";
      },

ensureSubparagraphWidthShares(paragraph, paragraphElement) {
        const subs = paragraph?.subparagraphs || [];
        if (subs.length <= 1) return;
        const inner = this.paragraphContentWidthForSubparagraphs(paragraphElement, subs.length);
        if (!(inner > 0)) return;

        const hasPixels = subs.some(item => Number(item.width) > 1);
        const hasShare = subs.some(item => this.isSubparagraphWidthShare(item.width));
        if (!hasPixels && !hasShare) return;

        if (hasPixels) {
          const pixels = subs.map(item => {
            const width = Number(item.width);
            if (width > 1) return width;
            if (this.isSubparagraphWidthShare(width)) return width * inner;
            return null;
          });
          const fixedSum = pixels.reduce((sum, value) => sum + (value || 0), 0);
          const flexibleCount = pixels.filter(value => value == null).length;
          let resolved;
          if (flexibleCount === 0) {
            const scale = fixedSum > 0 ? inner / fixedSum : 1;
            resolved = pixels.map(value => value * scale);
          } else {
            const each = Math.max(0, inner - fixedSum) / flexibleCount;
            resolved = pixels.map(value => value == null ? each : value);
            const sum = resolved.reduce((total, value) => total + value, 0) || 1;
            resolved = resolved.map(value => value * inner / sum);
          }
          subs.forEach((item, index) => {
            item.width = resolved[index] / inner;
          });
          return;
        }

        const defined = subs.map(item => this.isSubparagraphWidthShare(item.width) ? Number(item.width) : null);
        if (defined.every(value => value != null)) {
          const sum = defined.reduce((total, value) => total + value, 0) || 1;
          subs.forEach((item, index) => {
            item.width = defined[index] / sum;
          });
          return;
        }

        const definedSum = defined.reduce((sum, value) => sum + (value || 0), 0);
        const missing = defined.filter(value => value == null).length;
        const eachMissing = missing ? Math.max(0, 1 - definedSum) / missing : 0;
        const raw = defined.map(value => value == null ? eachMissing : value);
        const total = raw.reduce((sum, value) => sum + value, 0) || 1;
        subs.forEach((item, index) => {
          item.width = raw[index] / total;
        });
      },

distributeSubparagraphWidths(paragraph, resizedId, requestedWidth) {
        const subs = paragraph?.subparagraphs || [];
        if (subs.length <= 1) return;

        const paragraphElement = document.querySelector(`[data-paragraph-id="${paragraph.id}"]`);
        if (!paragraphElement) return;

        const inner = this.paragraphContentWidthForSubparagraphs(paragraphElement, subs.length);
        if (!(inner > 0)) return;

        const minimum = 32;
        const index = subs.findIndex(item => item.id === resizedId);
        if (index < 0) return;

        const elements = subs.map(item => paragraphElement.querySelector(`:scope > [data-subparagraph-id="${item.id}"]`));
        const currents = elements.map(item => item?.getBoundingClientRect().width || 0);
        const max = Math.max(minimum, inner - minimum * (subs.length - 1));
        const next = Math.ceil(Math.min(max, Math.max(minimum, requestedWidth)));
        const othersSum = currents.reduce((sum, width, itemIndex) => itemIndex === index ? sum : sum + width, 0);

        elements.forEach((element, itemIndex) => {
          if (!element) return;
          if (itemIndex === index) element.style.flex = `0 0 ${next}px`;
          else element.style.flex = `${Math.max(1, othersSum > 0 ? currents[itemIndex] : 1)} 1 0px`;
          element.style.width = "auto";
          element.style.maxWidth = "none";
          element.style.minWidth = "0";
        });

        const actual = elements.map(element => element?.getBoundingClientRect().width || 0);
        const actualSum = actual.reduce((sum, width) => sum + width, 0) || 1;
        subs.forEach((item, itemIndex) => {
          item.width = actual[itemIndex] / actualSum;
        });
      },

balanceSubparagraphSharesAfterInsert(paragraph) {
        const subs = paragraph?.subparagraphs || [];
        if (subs.length <= 1) return;
        const previous = subs.slice(0, -1);
        const created = subs[subs.length - 1];
        if (!previous.some(item => this.isSubparagraphWidthShare(item.width))) return;

        const count = subs.length;
        const weights = previous.map(item => this.isSubparagraphWidthShare(item.width) ? Number(item.width) : 1);
        const sum = weights.reduce((total, value) => total + value, 0) || 1;
        previous.forEach((item, index) => {
          item.width = weights[index] / sum * ((count - 1) / count);
        });
        created.width = 1 / count;
      },

syncSubparagraphWidthLayout() {
        document.querySelectorAll(".paragraph[data-paragraph-id]").forEach(paragraphElement => {
          const paragraph = this.findParagraphById?.(paragraphElement.dataset.paragraphId);
          if (!paragraph || paragraph === PAGE_BREAK_CHARACTER || !Array.isArray(paragraph.subparagraphs)) return;

          const subs = paragraph.subparagraphs;
          if (subs.length <= 1) {
            if (subs[0]) subs[0].width = null;
            const element = paragraphElement.querySelector(":scope > .subparagraph");
            if (element) {
              element.style.flex = "";
              element.style.width = "";
              element.style.maxWidth = "";
              element.style.minWidth = "";
            }
            return;
          }

          this.ensureSubparagraphWidthShares(paragraph, paragraphElement);
          const inner = this.paragraphContentWidthForSubparagraphs(paragraphElement, subs.length);
          subs.forEach(sub => {
            const share = this.subparagraphWidthShare(paragraph, sub);
            const element = paragraphElement.querySelector(`:scope > [data-subparagraph-id="${sub.id}"]`);
            if (share == null) return;
            this.applySubparagraphWidthShare(element, share, inner);
          });
        });
      },

applySubparagraphResize(dragging, event) {
        const owner = this.findSubparagraphOwnerById(dragging.subparagraphId);
        const subparagraph = owner?.subparagraph;
        const element = document.querySelector(`[data-subparagraph-id="${dragging.subparagraphId}"]`);
        if (!owner || !subparagraph || !element) return;

        const size = this.calculateSubparagraphResize(dragging, event);
        const handle = dragging.handle || "se";

        if (handle.includes("e") || handle.includes("w")) {
          this.distributeSubparagraphWidths(owner.paragraph, subparagraph.id, size.width);
        }

        if (handle.includes("n") || handle.includes("s")) {
          subparagraph.height = size.height > 0 ? size.height : null;
          if (subparagraph.height) element.style.height = `${subparagraph.height}px`;
          else element.style.removeProperty("height");
        }
      },

isTablePartEditTarget(targetKind) {
        return targetKind === EDIT_TARGET_KIND.TABLE_ROW ||
          targetKind === EDIT_TARGET_KIND.TABLE_COLUMN ||
          targetKind === EDIT_TARGET_KIND.TABLE_CELL;
      },

startTablePartResize(event, handleElement, handleName, targetKind) {
        const selection = this.activeTableSelection;
        if (!selection) return;

        const owner = this.findObjectOwnerById(selection.tableId);
        const table = owner?.object;
        const targetRect = this.getObjectEditRect();
        if (!owner || !table || table.kind !== KINDS.TABLE || !targetRect) return;

        this.ensureTableSizeState(table);

        const objectElement = document.querySelector(`[data-main-object-id="${table.id}"]`);
        const objectRect = objectElement?.getBoundingClientRect();
        const rowElement = this.getTableRowElement(table.id, selection.rowIndex);
        const rowRect = rowElement?.getBoundingClientRect();
        const startTargetWidth = Math.round(targetRect.width);
        const startHeight = Math.round(targetRect.height);
        const startTableObjectWidth = objectRect ? Math.round(objectRect.width) : startTargetWidth;
        const startTableObjectHeight = objectRect ? Math.round(objectRect.height) : startHeight;
        const startTableObjectChromeWidth = this.getElementHorizontalChrome(objectElement);
        const startTableObjectChromeHeight = this.getElementVerticalChrome(objectElement);
        const startTableContentWidth = Math.max(0, startTableObjectWidth - startTableObjectChromeWidth);
        const startTableContentHeight = Math.max(0, startTableObjectHeight - startTableObjectChromeHeight);
        const startTableX = Math.max(0, Number(table.x) || 0);
        const availableWidth = this.getSubparagraphClientWidth(owner.subparagraph.id);
        const startRowWidth = rowRect ? Math.round(rowRect.width) : startTableContentWidth;
        const resizesWidthLikeRow = targetKind === EDIT_TARGET_KIND.TABLE_ROW;
        const resizesColumnWidths = targetKind === EDIT_TARGET_KIND.TABLE_COLUMN ||
          targetKind === EDIT_TARGET_KIND.TABLE_CELL;
        const startWidth = resizesWidthLikeRow ? startRowWidth : startTargetWidth;
        const startColumnWidths = (resizesWidthLikeRow || resizesColumnWidths)
          ? this.getRenderedTableColumnWidths(table.id, selection.rowIndex, table.cols, startTableContentWidth)
          : null;

        this.dragging = {
          type: "table-part-resize",
          editTargetKind: targetKind,
          handle: handleName,
          tableId: table.id,
          subparagraphId: owner.subparagraph.id,
          rowIndex: selection.rowIndex,
          colIndex: selection.colIndex,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startWidth,
          startHeight,
          startTableObjectWidth,
          startTableObjectHeight,
          startTableObjectChromeWidth,
          startTableObjectChromeHeight,
          startTableContentWidth,
          startTableContentHeight,
          startTableX,
          availableWidth,
          startColumnWidths,
          startMinColumnWidths: this.getEstimatedTableMinimumColumnWidths(table.id, table.cols),
          startRowHeights: this.getRenderedTableRowHeights(table.id, table.rows, startTableContentHeight),
          startMinRowHeights: this.getEstimatedTableMinimumRowHeights(table.id, table.rows)
        };

        handleElement.setPointerCapture?.(event.pointerId);
        this.renderStatePanel("Redimensionando parte da tabela.");
      },

calculateObjectResize(dragging, event) {
        const deltaX = event.clientX - dragging.startClientX;
        const deltaY = event.clientY - dragging.startClientY;
        const handle = dragging.handle || "e";

        let x = dragging.startX;
        let y = dragging.startY;
        let width = dragging.startWidth;
        let height = dragging.startHeight;

        if (handle.includes("e")) {
          const maxWidth = Math.max(0, dragging.availableWidth - dragging.startX);
          width = Math.min(maxWidth, Math.max(0, Math.round(dragging.startWidth + deltaX)));
        }

        if (handle.includes("w")) {
          const right = dragging.startX + dragging.startWidth;
          x = Math.min(right, Math.max(0, Math.round(dragging.startX + deltaX)));
          width = Math.max(0, Math.round(right - x));
        }

        if (handle.includes("s")) {
          height = Math.max(0, Math.round(dragging.startHeight + deltaY));
        }

        if (handle.includes("n")) {
          const bottom = dragging.startY + dragging.startHeight;
          y = Math.min(bottom, Math.max(0, Math.round(dragging.startY + deltaY)));
          height = Math.max(0, Math.round(bottom - y));
        }

        return { x, y, width, height };
      },

calculateInlineListResize(dragging, event) {
        const deltaX = event.clientX - dragging.startClientX;
        const deltaY = event.clientY - dragging.startClientY;
        const handle = dragging.handle || "se";
        let width = dragging.startWidth;
        let height = dragging.startHeight;

        if (handle.includes("e")) width += deltaX;
        else if (handle.includes("w")) width -= deltaX;

        if (handle.includes("s")) height += deltaY;
        else if (handle.includes("n")) height -= deltaY;

        return {
          width: Math.min(Math.max(1, Math.round(width)), Math.max(1, Number(dragging.availableWidth) || 1)),
          height: Math.max(1, Math.round(height))
        };
      },

calculateTablePartResize(dragging, event) {
        const deltaX = event.clientX - dragging.startClientX;
        const deltaY = event.clientY - dragging.startClientY;
        const handle = dragging.handle || "e";

        let width = dragging.startWidth;
        let height = dragging.startHeight;

        if (handle.includes("e")) {
          width = Math.max(0, Math.round(dragging.startWidth + deltaX));
        }

        if (handle.includes("w")) {
          width = Math.max(0, Math.round(dragging.startWidth - deltaX));
        }

        const isRowLikeHorizontalResize =
          dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_ROW &&
          (handle.includes("e") || handle.includes("w"));

        if (isRowLikeHorizontalResize) {
          const availableWidth = Math.max(0, Number(dragging.availableWidth) || 0);
          const startTableX = Math.max(0, Number(dragging.startTableX) || 0);
          const objectChromeWidth = Math.max(0, Number(dragging.startTableObjectChromeWidth) || 0);
          const maxWidth = Math.max(0, availableWidth - startTableX - objectChromeWidth);
          width = Math.min(width, maxWidth);
        }

        if (handle.includes("s")) {
          height = Math.max(0, Math.round(dragging.startHeight + deltaY));
        }

        if (handle.includes("n")) {
          height = Math.max(0, Math.round(dragging.startHeight - deltaY));
        }

        return { width, height };
      },

getRenderedTableColumnWidths(tableId, rowIndex, colCount, fallbackTotalWidth) {
        const safeColCount = Math.max(0, Number(colCount) || 0);
        const fallbackTotal = Math.max(0, Number(fallbackTotalWidth) || 0);
        const equalWidth = safeColCount > 0 ? fallbackTotal / safeColCount : 0;
        const widths = [];
        const cells = Array.from(document.querySelectorAll(`[data-table-cell="${tableId}"]`));

        for (let col = 0; col < safeColCount; col += 1) {
          const colCells = cells.filter(cell => Number(cell.dataset.col) === col);
          const singleColumnCell = colCells.find(cell => cell.colSpan <= 1) ||
            cells.find(cell => {
              const startCol = Number(cell.dataset.col) || 0;
              return cell.colSpan > 1 && col >= startCol && col < startCol + cell.colSpan;
            });
          const preferredCell = colCells.find(cell =>
            Number(cell.dataset.row) === Number(rowIndex) && cell.colSpan <= 1);
          const cellElement = preferredCell || singleColumnCell;
          const renderedCellWidth = cellElement?.getBoundingClientRect().width || 0;
          const renderedWidth = cellElement?.colSpan > 1
            ? renderedCellWidth / cellElement.colSpan
            : renderedCellWidth;
          const width = Number.isFinite(renderedWidth) && renderedWidth > 0
            ? renderedWidth
            : equalWidth;
          widths.push(width);
        }

        return widths;
      },

getRenderedTableRowHeights(tableId, rowCount, fallbackTotalHeight) {
        const safeRowCount = Math.max(0, Number(rowCount) || 0);
        const fallbackTotal = Math.max(0, Number(fallbackTotalHeight) || 0);
        const equalHeight = safeRowCount > 0 ? fallbackTotal / safeRowCount : 0;
        const heights = [];

        for (let row = 0; row < safeRowCount; row += 1) {
          const rowElement = this.getTableRowElement(tableId, row);
          const renderedHeight = rowElement ? rowElement.getBoundingClientRect().height : 0;
          const height = Number.isFinite(renderedHeight) && renderedHeight > 0
            ? renderedHeight
            : equalHeight;
          heights.push(height);
        }

        return heights;
      },

distributeWidthProportionally(widths, targetTotalWidth) {
        const sourceWidths = Array.isArray(widths) ? widths : [];
        const count = sourceWidths.length;
        const targetTotal = Math.max(0, Math.round(Number(targetTotalWidth) || 0));
        if (count === 0) return [];

        let sourceTotal = sourceWidths.reduce((sum, width) => {
          return sum + Math.max(0, Number(width) || 0);
        }, 0);

        const baseWidths = sourceTotal > 0
          ? sourceWidths.map(width => Math.max(0, Number(width) || 0))
          : sourceWidths.map(() => 1);

        if (sourceTotal <= 0) sourceTotal = count;

        const rawWidths = baseWidths.map(width => width * targetTotal / sourceTotal);
        const result = rawWidths.map(width => Math.floor(width));
        let remaining = targetTotal - result.reduce((sum, width) => sum + width, 0);

        const indexesByFraction = rawWidths
          .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
          .sort((a, b) => b.fraction - a.fraction);

        for (let index = 0; index < indexesByFraction.length && remaining > 0; index += 1) {
          result[indexesByFraction[index].index] += 1;
          remaining -= 1;
        }

        return result;
      },

distributeHeightProportionally(heights, targetTotalHeight) {
        return this.distributeWidthProportionally(heights, targetTotalHeight);
      },

getEstimatedTableMinimumRowHeights(tableId, rowCount) {
        const safeRowCount = Math.max(0, Number(rowCount) || 0);
        const minimumHeights = [];

        for (let rowIndex = 0; rowIndex < safeRowCount; rowIndex += 1) {
          const cells = Array.from(document.querySelectorAll(`[data-table-cell="${tableId}"][data-row="${rowIndex}"]`));
          let rowMinimumHeight = 1;

          cells.forEach(cell => {
            const computedStyle = window.getComputedStyle(cell);
            const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
            const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
            const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
            const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
            const fontSize = parseFloat(computedStyle.fontSize) || 16;
            const parsedLineHeight = parseFloat(computedStyle.lineHeight);
            const lineHeight = Number.isFinite(parsedLineHeight) && parsedLineHeight > 0
              ? parsedLineHeight
              : fontSize * 1.2;
            const text = (cell.innerText || cell.textContent || "").replace(/\u200B/g, "");
            const lineCount = Math.max(1, text.split(/\r?\n/).length);

            const cellMinimumHeight = paddingTop + paddingBottom + borderTop + borderBottom + (lineHeight * lineCount);
            rowMinimumHeight = Math.max(rowMinimumHeight, cellMinimumHeight);
          });

          minimumHeights.push(Math.ceil(rowMinimumHeight));
        }

        return minimumHeights;
      },

getEstimatedTableMinimumColumnWidths(tableId, colCount) {
        const safeColCount = Math.max(0, Number(colCount) || 0);
        const minimumWidths = [];

        for (let colIndex = 0; colIndex < safeColCount; colIndex += 1) {
          const cells = Array.from(document.querySelectorAll(`[data-table-cell="${tableId}"][data-col="${colIndex}"]`));
          let columnMinimumWidth = 1;

          cells.forEach(cell => {
            const computedStyle = window.getComputedStyle(cell);
            const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
            const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
            const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
            const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;

            // Largura mínima visual: a célula não deve sumir nem permitir que
            // as bordas/paddings entrem em conflito com a largura total fixa da tabela.
            const cellMinimumWidth = paddingLeft + paddingRight + borderLeft + borderRight + 1;
            columnMinimumWidth = Math.max(columnMinimumWidth, cellMinimumWidth);
          });

          minimumWidths.push(Math.ceil(columnMinimumWidth));
        }

        return minimumWidths;
      },

distributeWidthWithMinimum(baseWidths, minimumWidths, targetTotalWidth) {
        const bases = Array.isArray(baseWidths) ? baseWidths : [];
        const minimums = Array.isArray(minimumWidths) ? minimumWidths : [];
        const count = bases.length;
        const targetTotal = Math.max(0, Math.round(Number(targetTotalWidth) || 0));
        if (count === 0) return [];

        const safeMinimums = bases.map((width, index) => {
          const minimum = Math.max(0, Math.round(Number(minimums[index]) || 0));
          return minimum;
        });

        const minimumTotal = safeMinimums.reduce((sum, width) => sum + width, 0);
        if (targetTotal <= minimumTotal) {
          return this.distributeWidthProportionally(safeMinimums, targetTotal);
        }

        const extraTotal = targetTotal - minimumTotal;
        const baseExtras = bases.map((width, index) => {
          const base = Math.max(0, Number(width) || 0);
          return Math.max(0, base - safeMinimums[index]);
        });
        const extraSourceTotal = baseExtras.reduce((sum, width) => sum + width, 0);
        const extraSource = extraSourceTotal > 0 ? baseExtras : bases.map(() => 1);
        const distributedExtra = this.distributeWidthProportionally(extraSource, extraTotal);

        return safeMinimums.map((minimum, index) => minimum + (distributedExtra[index] || 0));
      },

distributeHeightWithMinimum(baseHeights, minimumHeights, targetTotalHeight) {
        const bases = Array.isArray(baseHeights) ? baseHeights : [];
        const minimums = Array.isArray(minimumHeights) ? minimumHeights : [];
        const count = bases.length;
        const targetTotal = Math.max(0, Math.round(Number(targetTotalHeight) || 0));
        if (count === 0) return [];

        const safeMinimums = bases.map((height, index) => {
          const minimum = Math.max(0, Math.round(Number(minimums[index]) || 0));
          return minimum;
        });

        const minimumTotal = safeMinimums.reduce((sum, height) => sum + height, 0);
        if (targetTotal <= minimumTotal) {
          return this.distributeHeightProportionally(safeMinimums, targetTotal);
        }

        const extraTotal = targetTotal - minimumTotal;
        const baseExtras = bases.map((height, index) => {
          const base = Math.max(0, Number(height) || 0);
          return Math.max(0, base - safeMinimums[index]);
        });
        const extraSourceTotal = baseExtras.reduce((sum, height) => sum + height, 0);
        const extraSource = extraSourceTotal > 0 ? baseExtras : bases.map(() => 1);
        const distributedExtra = this.distributeHeightProportionally(extraSource, extraTotal);

        return safeMinimums.map((minimum, index) => minimum + (distributedExtra[index] || 0));
      },

applyTableColumnWidthsToDom(tableId, widths) {
        widths.forEach((width, colIndex) => {
          this.applyTableColumnWidthToDom(tableId, colIndex, width);
        });
      },

applyTableRowHeightsToDom(tableId, heights) {
        heights.forEach((height, rowIndex) => {
          this.applyTableRowHeightToDom(tableId, rowIndex, height);
        });
      },

applyTableRowWidthResize(table, dragging, width) {
        const targetWidth = Math.max(0, Math.round(Number(width) || 0));
        const baseColumnWidths = Array.isArray(dragging.startColumnWidths) && dragging.startColumnWidths.length === table.cols
          ? dragging.startColumnWidths
          : this.getRenderedTableColumnWidths(table.id, dragging.rowIndex, table.cols, dragging.startWidth);
        const columnWidths = this.distributeWidthProportionally(baseColumnWidths, targetWidth);

        table.colWidths = columnWidths;
        this.applyTableColumnWidthsToDom(table.id, columnWidths);

        // O valor de width aplicado ao objeto tabela é a largura útil/conteúdo.
        // A borda e o padding da moldura da tabela ficam fora desse número;
        // por isso o limite precisa considerar o subparágrafo menos essa "casca".
        table.width = targetWidth;

        const objectElement = document.querySelector(`[data-main-object-id="${table.id}"]`);
        if (objectElement) objectElement.style.width = `${targetWidth}px`;
      },

applyTableInternalRowHeightResize(table, dragging, requestedHeight) {
        const rowCount = Math.max(0, Number(table.rows) || 0);
        if (rowCount === 0) return;

        const baseRowHeights = Array.isArray(dragging.startRowHeights) && dragging.startRowHeights.length === rowCount
          ? dragging.startRowHeights.map(height => Math.max(0, Number(height) || 0))
          : this.getRenderedTableRowHeights(table.id, rowCount, dragging.startTableContentHeight);

        const minRowHeights = Array.isArray(dragging.startMinRowHeights) && dragging.startMinRowHeights.length === rowCount
          ? dragging.startMinRowHeights.map(height => Math.max(1, Math.round(Number(height) || 1)))
          : this.getEstimatedTableMinimumRowHeights(table.id, rowCount);

        const baseTotalHeight = baseRowHeights.reduce((sum, height) => sum + Math.max(0, Number(height) || 0), 0);

        // Ao redimensionar uma linha, a tabela não deve ganhar nem perder altura.
        // A linha selecionada também não pode crescer até empurrar as demais
        // abaixo da altura mínima real de uma célula. Esse limite impede a grade
        // de "furar" o padding de 1px da própria tabela.
        const safeContentHeight = Math.max(0, Math.round(Number(dragging.startTableContentHeight) || 0));
        const measuredTotalHeight = Math.max(0, Math.round(baseTotalHeight || safeContentHeight));
        const fixedTotalHeight = safeContentHeight > 0
          ? Math.min(measuredTotalHeight, safeContentHeight)
          : measuredTotalHeight;
        if (fixedTotalHeight <= 0) return;

        const selectedRowIndex = Math.min(Math.max(0, Number(dragging.rowIndex) || 0), rowCount - 1);

        if (rowCount === 1) {
          table.rowHeights = [fixedTotalHeight];
          this.applyTableRowHeightsToDom(table.id, table.rowHeights);
          return;
        }

        const otherRowIndexes = [];
        const otherBaseHeights = [];
        const otherMinHeights = [];

        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          if (rowIndex === selectedRowIndex) continue;
          otherRowIndexes.push(rowIndex);
          otherBaseHeights.push(baseRowHeights[rowIndex]);
          otherMinHeights.push(minRowHeights[rowIndex]);
        }

        const selectedMinHeight = Math.max(1, Math.round(Number(minRowHeights[selectedRowIndex]) || 1));
        const otherMinTotal = otherMinHeights.reduce((sum, height) => sum + Math.max(0, Number(height) || 0), 0);
        const maxSelectedHeight = Math.max(selectedMinHeight, fixedTotalHeight - otherMinTotal);
        const requestedSelectedHeight = Math.max(0, Math.round(Number(requestedHeight) || 0));
        const selectedHeight = Math.min(maxSelectedHeight, Math.max(selectedMinHeight, requestedSelectedHeight));

        const remainingHeight = Math.max(0, fixedTotalHeight - selectedHeight);
        const otherRowHeights = this.distributeHeightWithMinimum(otherBaseHeights, otherMinHeights, remainingHeight);
        const rowHeights = new Array(rowCount).fill(0);
        rowHeights[selectedRowIndex] = selectedHeight;

        otherRowIndexes.forEach((rowIndex, index) => {
          rowHeights[rowIndex] = otherRowHeights[index] || 0;
        });

        table.rowHeights = rowHeights;
        this.applyTableRowHeightsToDom(table.id, rowHeights);
      },

applyTableInternalColumnWidthResize(table, dragging, requestedWidth) {
        const colCount = Math.max(0, Number(table.cols) || 0);
        if (colCount === 0) return;

        const baseColumnWidths = Array.isArray(dragging.startColumnWidths) && dragging.startColumnWidths.length === colCount
          ? dragging.startColumnWidths.map(width => Math.max(0, Number(width) || 0))
          : this.getRenderedTableColumnWidths(table.id, dragging.rowIndex, colCount, dragging.startTableContentWidth);

        const minColumnWidths = Array.isArray(dragging.startMinColumnWidths) && dragging.startMinColumnWidths.length === colCount
          ? dragging.startMinColumnWidths.map(width => Math.max(1, Math.round(Number(width) || 1)))
          : this.getEstimatedTableMinimumColumnWidths(table.id, colCount);

        const baseTotalWidth = baseColumnWidths.reduce((sum, width) => sum + Math.max(0, Number(width) || 0), 0);

        // Ao redimensionar uma coluna, a tabela não deve ganhar nem perder largura.
        // A coluna selecionada também não pode crescer até empurrar as demais
        // abaixo da largura mínima real de uma célula.
        const safeContentWidth = Math.max(0, Math.round(Number(dragging.startTableContentWidth) || 0));
        const measuredTotalWidth = Math.max(0, Math.round(baseTotalWidth || safeContentWidth));
        const fixedTotalWidth = safeContentWidth > 0
          ? Math.min(measuredTotalWidth, safeContentWidth)
          : measuredTotalWidth;
        if (fixedTotalWidth <= 0) return;

        const selectedColIndex = Math.min(Math.max(0, Number(dragging.colIndex) || 0), colCount - 1);

        if (colCount === 1) {
          table.colWidths = [fixedTotalWidth];
          this.applyTableColumnWidthsToDom(table.id, table.colWidths);
          return;
        }

        const otherColIndexes = [];
        const otherBaseWidths = [];
        const otherMinWidths = [];

        for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
          if (colIndex === selectedColIndex) continue;
          otherColIndexes.push(colIndex);
          otherBaseWidths.push(baseColumnWidths[colIndex]);
          otherMinWidths.push(minColumnWidths[colIndex]);
        }

        const selectedMinWidth = Math.max(1, Math.round(Number(minColumnWidths[selectedColIndex]) || 1));
        const otherMinTotal = otherMinWidths.reduce((sum, width) => sum + Math.max(0, Number(width) || 0), 0);
        const maxSelectedWidth = Math.max(selectedMinWidth, fixedTotalWidth - otherMinTotal);
        const requestedSelectedWidth = Math.max(0, Math.round(Number(requestedWidth) || 0));
        const selectedWidth = Math.min(maxSelectedWidth, Math.max(selectedMinWidth, requestedSelectedWidth));

        const remainingWidth = Math.max(0, fixedTotalWidth - selectedWidth);
        const otherColWidths = this.distributeWidthWithMinimum(otherBaseWidths, otherMinWidths, remainingWidth);
        const columnWidths = new Array(colCount).fill(0);
        columnWidths[selectedColIndex] = selectedWidth;

        otherColIndexes.forEach((colIndex, index) => {
          columnWidths[colIndex] = otherColWidths[index] || 0;
        });

        table.colWidths = columnWidths;
        this.applyTableColumnWidthsToDom(table.id, columnWidths);
      },

applyTableColumnWidthToDom(tableId, colIndex, width) {
        const roundedWidth = Math.round(width);

        const colElement = document.querySelector(`[data-table-col="${tableId}"][data-col="${colIndex}"]`);
        if (colElement) colElement.style.width = `${roundedWidth}px`;

        this.getTableColumnCells(tableId, colIndex).forEach(cell => {
          cell.style.width = `${roundedWidth}px`;
        });
      },

applyTableRowHeightToDom(tableId, rowIndex, height) {
        const rowElement = this.getTableRowElement(tableId, rowIndex);
        if (rowElement) rowElement.style.height = `${Math.round(height)}px`;
      },

applyMainTableResize(table, dragging, size) {
        const handle = dragging.handle || "";
        const hasHorizontalResize = handle.includes("e") || handle.includes("w");
        const hasVerticalResize = handle.includes("n") || handle.includes("s");
        const tableElement = document.querySelector(`[data-table-id="${table.id}"]`);

        if (hasHorizontalResize) {
          const targetContentWidth = Math.max(0, Math.round((Number(size.width) || 0) - (Number(dragging.startHorizontalChrome) || 0)));
          const baseColumnWidths = Array.isArray(dragging.startTableColumnWidths) && dragging.startTableColumnWidths.length === table.cols
            ? dragging.startTableColumnWidths
            : this.getRenderedTableColumnWidths(table.id, 0, table.cols, targetContentWidth);
          const columnWidths = this.distributeWidthProportionally(baseColumnWidths, targetContentWidth);

          table.colWidths = columnWidths;
          this.applyTableColumnWidthsToDom(table.id, columnWidths);

          // Durante o Ctrl+clique, a tabela fica com largura/min-width congeladas
          // para não encolher ao trocar contenteditable. Ao redimensionar, esses
          // valores também precisam acompanhar o novo tamanho; caso contrário só
          // o overlay/contêiner muda e a grade continua no tamanho antigo.
          if (tableElement) {
            tableElement.style.width = `${targetContentWidth}px`;
            tableElement.style.minWidth = `${targetContentWidth}px`;
          }
        }

        if (hasVerticalResize) {
          const targetContentHeight = Math.max(0, Math.round((Number(size.height) || 0) - (Number(dragging.startVerticalChrome) || 0)));
          const baseRowHeights = Array.isArray(dragging.startTableRowHeights) && dragging.startTableRowHeights.length === table.rows
            ? dragging.startTableRowHeights
            : this.getRenderedTableRowHeights(table.id, table.rows, targetContentHeight);
          const rowHeights = this.distributeHeightProportionally(baseRowHeights, targetContentHeight);

          table.rowHeights = rowHeights;
          this.applyTableRowHeightsToDom(table.id, rowHeights);
          if (tableElement) tableElement.style.height = `${targetContentHeight}px`;
        }
      },

applyTablePartResize(dragging, event) {
        const owner = this.findObjectOwnerById(dragging.tableId);
        const table = owner?.object;
        if (!owner || !table || table.kind !== KINDS.TABLE) return;

        this.ensureTableSizeState(table);

        const size = this.calculateTablePartResize(dragging, event);
        const handle = dragging.handle || "";
        const hasHorizontalResize = handle.includes("e") || handle.includes("w");
        const hasVerticalResize = handle.includes("n") || handle.includes("s");

        if (dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_ROW && hasHorizontalResize) {
          this.applyTableRowWidthResize(table, dragging, size.width);
        }

        if ((dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_COLUMN ||
             dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_CELL) &&
            hasHorizontalResize) {
          this.applyTableInternalColumnWidthResize(table, dragging, size.width);
        }

        if ((dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_ROW ||
             dragging.editTargetKind === EDIT_TARGET_KIND.TABLE_CELL) &&
            hasVerticalResize) {
          this.applyTableInternalRowHeightResize(table, dragging, size.height);
        }
      },

getElementHorizontalChrome(element) {
        if (!element) return 0;
        const computedStyle = window.getComputedStyle(element);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
        const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
        return Math.max(0, paddingLeft + paddingRight + borderLeft + borderRight);
      },

getElementVerticalChrome(element) {
        if (!element) return 0;
        const computedStyle = window.getComputedStyle(element);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
        return Math.max(0, paddingTop + paddingBottom + borderTop + borderBottom);
      },

getSubparagraphClientWidth(subparagraphId) {
        const element = document.querySelector(`[data-subparagraph-id="${subparagraphId}"]`);
        return element ? element.clientWidth : 0;
      },

clampHorizontalMove(subparagraphId, requestedX, objectWidth) {
        const availableWidth = this.getSubparagraphClientWidth(subparagraphId);
        const width = Math.max(0, Number(objectWidth) || 0);
        const maxX = Math.max(0, availableWidth - width);
        return Math.min(maxX, Math.max(0, Math.round(requestedX)));
      },

objectExtendsSubparagraphWhenMoved(object) {
        return !!object && [KINDS.IMAGE, KINDS.TABLE, KINDS.CHART].includes(object.kind);
      },

maxMovableContentWidth(subparagraphId) {
        const owner = this.findSubparagraphOwnerById(subparagraphId);
        const element = document.querySelector(`[data-subparagraph-id="${subparagraphId}"]`);
        const subs = owner?.paragraph?.subparagraphs || [];
        if (!owner || !element) return 0;

        const style = getComputedStyle(element);
        const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
        if (subs.length <= 1) return Math.max(0, element.clientWidth - padding);

        const paragraphElement = document.querySelector(`[data-paragraph-id="${owner.paragraph.id}"]`);
        const inner = this.paragraphContentWidthForSubparagraphs(paragraphElement, subs.length);
        const minimum = 32;
        const maxBorder = Math.max(minimum, inner - minimum * (subs.length - 1));
        return Math.max(0, maxBorder - border - padding);
      },

clampMovableX(subparagraphId, requestedX, objectWidth) {
        const width = Math.max(0, Number(objectWidth) || 0);
        const maxX = Math.max(0, this.maxMovableContentWidth(subparagraphId) - width);
        return Math.min(maxX, Math.max(0, Math.round(requestedX)));
      },

fitSubparagraphWidthToContents(subparagraphId) {
        const owner = this.findSubparagraphOwnerById(subparagraphId);
        const subs = owner?.paragraph?.subparagraphs || [];
        if (!owner || subs.length <= 1) return;

        const element = document.querySelector(`[data-subparagraph-id="${subparagraphId}"]`);
        if (!element) return;

        const style = getComputedStyle(element);
        const borderLeft = parseFloat(style.borderLeftWidth) || 0;
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const border = borderLeft + (parseFloat(style.borderRightWidth) || 0);
        const padding = paddingLeft + (parseFloat(style.paddingRight) || 0);
        const origin = element.getBoundingClientRect().left + borderLeft + paddingLeft;
        let contentRight = 0;

        const object = owner.subparagraph.object;
        if (object && this.objectExtendsSubparagraphWhenMoved(object)) {
          const node = element.querySelector(`[data-main-object-id="${object.id}"]`);
          if (node) contentRight = Math.max(contentRight, node.getBoundingClientRect().right - origin);
        }

        for (const textbox of owner.subparagraph.textboxes || []) {
          if (textbox.tableCell) continue;
          const node = element.querySelector(`:scope > [data-textbox-id="${textbox.id}"]`);
          if (node) contentRight = Math.max(contentRight, node.getBoundingClientRect().right - origin);
        }

        if (!(contentRight > 0)) return;
        this.distributeSubparagraphWidths(owner.paragraph, subparagraphId, contentRight + padding + border);
      },

measureMainObjectHeight(objectId) {
        const element = document.querySelector(`[data-main-object-id="${objectId}"]`);
        return element ? Math.ceil(element.getBoundingClientRect().height) : 0;
      },

fitSubparagraphHeightToContents(subparagraphId) {
        const subparagraph = this.findSubparagraphById(subparagraphId);
        if (!subparagraph || subparagraph.contentKind !== CONTENT_KIND.OBJECT) return;

        const element = document.querySelector(`[data-subparagraph-id="${subparagraphId}"]`);
        const subTop = element ? element.getBoundingClientRect().top : 0;
        let requiredHeight = 0;

        const includeBottom = node => {
          if (!node || !element) return false;
          requiredHeight = Math.max(requiredHeight, node.getBoundingClientRect().bottom - subTop);
          return true;
        };

        if (subparagraph.object) {
          const objectElement = document.querySelector(`[data-main-object-id="${subparagraph.object.id}"]`);
          if (!includeBottom(objectElement)) {
            const objectY = Math.max(0, Number(subparagraph.object.y) || 0);
            const objectHeight = this.measureMainObjectHeight(subparagraph.object.id);
            requiredHeight = Math.max(requiredHeight, objectY + objectHeight);
          }
        }

        for (const textbox of subparagraph.textboxes || []) {
          if (textbox.tableCell) continue;
          const textboxElement = document.querySelector(`[data-textbox-id="${textbox.id}"]`);
          if (!includeBottom(textboxElement)) {
            const textboxY = Math.max(0, Number(textbox.y) || 0);
            const textboxHeight = Math.max(0, Number(textbox.height) || 0);
            requiredHeight = Math.max(requiredHeight, textboxY + textboxHeight);
          }
        }

        const borderBottom = element ? (parseFloat(getComputedStyle(element).borderBottomWidth) || 0) : 0;
        const height = Math.ceil(requiredHeight + (requiredHeight > 0 ? borderBottom : 0));
        subparagraph.height = height > 0 ? height : null;

        if (element) {
          if (height > 0) element.style.height = `${height}px`;
          else element.style.removeProperty("height");
        }
      },

updateTableCellTextboxArea(textboxId) {
        const owner = this.findTextboxOwnerById(textboxId);
        const tableCell = owner?.tableCell;
        if (!tableCell) return;

        const selector = `[data-table-cell-textbox-area="${tableCell.tableId}"][data-row="${tableCell.rowIndex}"][data-col="${tableCell.colIndex}"]`;
        const area = document.querySelector(selector);
        if (!area) return;

        const height = Math.max(0, ...owner.subparagraph.textboxes
          .filter(textbox => textbox.tableCell?.tableId === tableCell.tableId &&
            Number(textbox.tableCell.rowIndex) === Number(tableCell.rowIndex) &&
            Number(textbox.tableCell.colIndex) === Number(tableCell.colIndex))
          .map(textbox => (Number(textbox.y) || 0) + (Number(textbox.height) || 0)));
        area.style.minHeight = `${height}px`;
      },

getActiveTableForBorder() {
        const owner = this.activeObject ? this.findObjectOwnerById(this.activeObject) : this.findSubparagraphOwnerById(this.activeSubparagraph);
        const table = owner?.object || owner?.subparagraph?.object;
        if (!table || table.kind !== KINDS.TABLE) return null;
        return { owner, table };
      },

getTableBorderTargetCells(table) {
        const selection = this.activeTableSelection?.tableId === table.id ? this.activeTableSelection : null;
        const targetKind = this.activeEditTargetKind || EDIT_TARGET_KIND.MAIN_OBJECT;
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

        for (let row = 0; row < table.rows; row += 1) {
          for (let col = 0; col < table.cols; col += 1) pushCell(row, col);
        }
        return cells;
      },

applyBorderToCellBorder(cellBorder, action, styles) {
        if (action === "none") return createEmptyBorder(styles.radius);

        const border = normalizeBorder(cellBorder);
        border.radius = styles.radius;
        const sideValue = (styles.width === "0px" || styles.style === "none") ? null : createBorderSide(styles.color, styles.width, styles.style);
        const sides = action === "all" ? ["top", "right", "bottom", "left"] : [action];
        sides.forEach(side => {
          if (["top", "right", "bottom", "left"].includes(side)) border[side] = sideValue ? { ...sideValue } : null;
        });
        return border;
      },

applySelectedTableBorder(action, styles) {
        const context = this.getActiveTableForBorder?.();
        const table = context?.table;
        if (!table) return false;

        this.ensureTableBorderState?.(table);
        const cells = this.getTableBorderTargetCells(table);
        cells.forEach(({ row, col }) => {
          table.cellBorders[row][col] = this.applyBorderToCellBorder(table.cellBorders[row][col], action, styles);
        });
        return true;
      },

applySelectedTableSpacing(property, action, px) {
        const context = this.getActiveTableForBorder?.();
        const table = context?.table;
        if (!table) return false;

        const key = property === "margin" ? "cellMargins" : "cellPaddings";
        this.ensureTableSpacingState?.(table);
        const cells = this.getTableBorderTargetCells(table);
        cells.forEach(({ row, col }) => {
          table[key][row][col] = applyBoxEdgesAction(table[key][row][col], action, px);
        });
        return true;
      },

onMainObjectClick(event, element) {
        // Clique comum numa célula editável deve ficar com a própria célula.
        // Não pode limpar caret/selection ao borbulhar para o objeto principal.
        if (event.target.closest("[data-table-cell][contenteditable='true']") && !(event.ctrlKey || event.metaKey)) {
          event.stopPropagation();
          return;
        }

        // Ctrl+clique em tabela já foi tratado no pointerdown para alternar
        // tabela/linha/coluna/célula. O click subsequente não pode limpar
        // activeTableSelection, senão a alternância volta sempre para tabela.
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        // O clique no objeto não deve subir para o parágrafo, mas deve
        // garantir que o subparágrafo pai continue sendo a seleção primária
        // e o objeto clicado a seleção secundária.
        event.stopPropagation();
        const owner = this.findObjectOwnerById(element.dataset.mainObjectId);
        if (!owner) return;
        this.activateSubparagraphOwner?.(owner, { activeObject: owner.object.id });
        if (owner.table) {
          this.activeTableSelection = {
            tableId: owner.table.id,
            kind: EDIT_TARGET_KIND.TABLE_CELL,
            rowIndex: owner.rowIndex,
            colIndex: owner.colIndex
          };
          this.activeEditTargetKind = EDIT_TARGET_KIND.TABLE_CELL;
        } else {
          this.activeTableSelection = null;
        }
        if (!this.activateSubparagraphOwner) {
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = null;
          this.activeObject = owner.object.id;
          this.activeTableSelection = null;
        }
        this.clearNativeCaretAndSelection?.();
        this.refreshActiveClasses();
        this.renderStatePanel();
        this.updateToolbarState();
        this.updateJsonOutput();
      },

      getTableCellObjectMovementBounds(element) {
        const cell = element?.closest?.("[data-table-cell]");
        if (!cell) return null;

        const style = window.getComputedStyle(cell);
        const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        const verticalPadding = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);

        return {
          width: Math.max(0, Math.round(cell.clientWidth - horizontalPadding)),
          height: Math.max(0, Math.round(cell.clientHeight - verticalPadding))
        };
      },

onMainObjectPointerDown(event, element) {
        const owner = this.findObjectOwnerById(element.dataset.mainObjectId);
        const object = owner?.object;
        if (!owner || !this.isSectionEnabled(owner.section) || !object) return;

        if (event.ctrlKey) {
          event.preventDefault();
          event.stopPropagation();
          this.suppressNextDocumentClick = true;

          if (object.kind === KINDS.TABLE) {
            // Não chame activateSubparagraphOwner antes do ciclo da tabela.
            // Essa função limpa activeTableSelection e fazia o Ctrl+clique
            // voltar sempre para MAIN_OBJECT, impedindo alternar para linha,
            // coluna e célula. cycleTableEditMode já atualiza seção/parágrafo/
            // subparágrafo para o dono da tabela.
            this.cycleTableEditMode(object.id, event.target, { fromCtrlClick: true });
            return;
          }

          // Ctrl+clique também deve trocar a seção/subparágrafo ativo para o
          // dono do objeto clicado. Sem isso, vindo do header/footer, o modo
          // de edição podia ser acionado sem atualizar visualmente a seção body.
          this.activateSubparagraphOwner?.(owner, { activeObject: object.id });
          this.enterObjectEditMode(object.id);
          return;
        }

        if (event.target.closest("[contenteditable='true']")) return;

        event.preventDefault();
        event.stopPropagation();

        this.normalizeAlignedMainObjectForManualPosition?.(owner, object, element);
        const objectRect = element.getBoundingClientRect();

        this.activateSubparagraphOwner?.(owner, { activeObject: object.id });
        if (!this.activateSubparagraphOwner) {
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = null;
          this.activeObject = object.id;
          this.activeTableSelection = null;
        }
        this.clearNativeCaretAndSelection?.();
        this.refreshActiveClasses();
        const cellObjectBounds = owner.table ? this.getTableCellObjectMovementBounds(element) : null;
        const subparagraphElement = owner.table
          ? null
          : document.querySelector(`[data-subparagraph-id="${owner.subparagraph.id}"]`);
        this.dragging = {
          type: "object",
          objectId: object.id,
          subparagraphId: owner.subparagraph.id,
          tableId: owner.table?.id || null,
          tableRowIndex: Number.isFinite(Number(owner.rowIndex)) ? Number(owner.rowIndex) : null,
          tableColIndex: Number.isFinite(Number(owner.colIndex)) ? Number(owner.colIndex) : null,
          movementContainerKind: owner.table ? "table-cell" : "subparagraph",
          availableWidth: cellObjectBounds?.width ?? null,
          availableHeight: cellObjectBounds?.height ?? subparagraphElement?.clientHeight ?? null,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: Number(object.x) || 0,
          startY: Number(object.y) || 0,
          offsetX: event.clientX - objectRect.left,
          offsetY: event.clientY - objectRect.top,
          freezeObjectWidth: !owner.table && this.objectExtendsSubparagraphWhenMoved(object) && !(Number(object.width) > 0),
          frozenObjectWidth: Math.round(element.offsetWidth || objectRect.width || 0),
          movedLaterally: false,
          widthPinned: false
        };

        element.classList.add("is-dragging-object");
        element.setPointerCapture?.(event.pointerId);
        this.renderStatePanel("Arrastando objeto.");
        this.updateJsonOutput();
      },

onTextboxPointerDown(event, textboxElement) {
        const owner = this.findTextboxOwnerById(textboxElement.dataset.textboxId);
        const textbox = owner?.textbox;
        const movementContainerKind = owner?.tableCell ? "table-cell" : "subparagraph";
        const areaElement = movementContainerKind === "table-cell"
          ? textboxElement.closest(".table-cell-textbox-area")
          : textboxElement.closest(".subparagraph[data-subparagraph-id]");

        if (!owner || !this.isSectionEnabled(owner.section) || !textbox || !areaElement) return;

        if (event.ctrlKey) {
          event.preventDefault();
          event.stopPropagation();
          this.enterTextboxEditMode(textbox.id);
          return;
        }

        if (owner.inline) {
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = owner.subparagraph.id;
          this.activeTextbox = textbox.id;
          this.activeObject = null;
          this.activeEditTargetKind = null;
          this.objectEditMode = false;
          this.hideObjectEditOverlay?.();
          this.refreshActiveClasses?.();
          this.updateToolbarState?.();
          this.updateJsonOutput?.();
          return;
        }

        if (event.target.closest("[contenteditable='true']")) return;

        event.preventDefault();
        event.stopPropagation();

        const textboxRect = textboxElement.getBoundingClientRect();
        const areaRect = areaElement.getBoundingClientRect();

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeTextbox = textbox.id;
        this.dragging = {
          type: "textbox",
          textboxId: textbox.id,
          subparagraphId: owner.subparagraph.id,
          movementContainerKind,
          availableWidth: areaElement.clientWidth,
          availableHeight: areaElement.clientHeight,
          areaRect,
          offsetX: event.clientX - textboxRect.left,
          offsetY: event.clientY - textboxRect.top
        };

        textboxElement.classList.add("is-dragging-object");
        textboxElement.setPointerCapture?.(event.pointerId);
        this.renderStatePanel("Arrastando caixa de texto.");
        this.updateJsonOutput();
      },

applySubparagraphMove(dragging, event) {
        const subparagraph = this.findSubparagraphById(dragging.subparagraphId);
        const element = document.querySelector(`[data-subparagraph-id="${dragging.subparagraphId}"]`);
        if (!subparagraph || !element) return;

        const deltaY = event.clientY - dragging.startClientY;
        if (Math.abs(deltaY) > 2) dragging.moved = true;
        const minY = Number.isFinite(Number(dragging.minY)) ? Number(dragging.minY) : -9999;
        const maxY = Number.isFinite(Number(dragging.maxY)) ? Number(dragging.maxY) : 9999;
        const requestedY = Math.round((Number(dragging.startY) || 0) + deltaY);
        const y = Math.min(maxY, Math.max(minY, requestedY));

        subparagraph.y = y;
        if (y !== 0) element.style.transform = `translateY(${y}px)`;
        else element.style.removeProperty("transform");
      },

onPointerMove(event) {
        if (!this.dragging) return;

        if (this.dragging.type === "subparagraph-move") {
          this.applySubparagraphMove(this.dragging, event);
          this.positionObjectEditOverlay();
          this.updateJsonOutput();
          return;
        }

        if (this.dragging.type === "subparagraph-resize") {
          this.applySubparagraphResize(this.dragging, event);
          this.positionObjectEditOverlay();
          this.updateJsonOutput();
          return;
        }

        if (this.dragging.type === "table-part-resize") {
          this.applyTablePartResize(this.dragging, event);
          this.fitSubparagraphHeightToContents(this.dragging.subparagraphId);
          this.positionObjectEditOverlay();
          this.updateJsonOutput();
          return;
        }

        if (this.dragging.type === "object-resize") {
          const size = this.dragging.isInlineListResize || this.dragging.isInlineLineResize
            ? this.calculateInlineListResize(this.dragging, event)
            : this.calculateObjectResize(this.dragging, event);

          if (this.dragging.isInlineListResize) {
            const owner = this.findObjectOwnerById(this.dragging.targetId);
            const list = owner?.object;
            if (!list) return;

            if (this.dragging.resizeWidth) list.width = size.width;
            if (this.dragging.resizeHeight) list.height = size.height;

            const element = document.querySelector(`[data-inline-list-id="${list.id}"]`);
            if (element) {
              if (list.width === null || list.width === undefined) element.style.removeProperty("width");
              else element.style.width = `${list.width}px`;
              if (list.height === null || list.height === undefined) {
                element.style.removeProperty("height");
                element.style.removeProperty("overflow");
              } else {
                element.style.height = `${list.height}px`;
                element.style.overflow = "hidden";
              }
            }

            this.positionObjectEditOverlay();
            this.updateJsonOutput();
            return;
          }

          if (this.dragging.isInlineLineResize) {
            const owner = this.findObjectOwnerById(this.dragging.targetId);
            const line = owner?.object;
            const element = line
              ? document.querySelector(`[data-inline-line-id="${line.id}"]`)
              : null;
            if (!line || !element) return;

            line.width = size.width;
            const style = window.getComputedStyle(element);
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (context) {
              context.font = style.font || `${style.fontSize} ${style.fontFamily}`;
              const underscoreWidth = Math.max(1, context.measureText("_").width);
              line.text = "_".repeat(Math.max(1, Math.floor(size.width / underscoreWidth)));
            }
            element.style.width = `${line.width}px`;
            element.textContent = line.text;
            this.positionObjectEditOverlay();
            this.updateJsonOutput();
            return;
          }

          if (this.dragging.editTargetKind === KINDS.TEXTBOX) {
            const owner = this.findTextboxOwnerById(this.dragging.targetId);
            const textbox = owner?.textbox;
            if (!textbox) return;

            textbox.x = owner.inline ? 0 : size.x;
            textbox.y = owner.inline ? 0 : size.y;
            textbox.width = size.width;
            textbox.height = size.height;

            const element = document.querySelector(`[data-textbox-id="${textbox.id}"]`);
            if (element) {
              if (!owner.inline) {
                element.style.left = `${textbox.x}px`;
                element.style.top = `${textbox.y}px`;
              }
              element.style.width = `${textbox.width}px`;
              element.style.height = `${textbox.height}px`;
            }
            if (owner.tableCell)
              this.updateTableCellTextboxArea(textbox.id);
          } else {
            const owner = this.findObjectOwnerById(this.dragging.targetId);
            const object = owner?.object;
            if (!object) return;

            object.x = size.x;
            object.y = size.y;
            object.width = size.width;
            object.height = size.height;

            const element = document.querySelector(`[data-main-object-id="${object.id}"]`);
            if (element) {
              element.style.transform = `translate(${object.x}px, ${object.y}px)`;
              element.style.width = `${object.width}px`;
              element.style.height = `${object.height}px`;
            }

            if (this.dragging.isMainTableResize && object.kind === KINDS.TABLE) {
              this.applyMainTableResize(object, this.dragging, size);
            }
          }

          if (this.dragging.editTargetKind !== KINDS.TEXTBOX || !this.findTextboxOwnerById(this.dragging.targetId)?.tableCell)
            this.fitSubparagraphHeightToContents(this.dragging.subparagraphId);
          this.positionObjectEditOverlay();
          this.updateJsonOutput();
          return;
        }

        if (this.dragging.type === "textbox") {
          const textbox = this.findTextboxById(this.dragging.textboxId);
          if (!textbox) return;

          const requestedX = event.clientX - this.dragging.areaRect.left - this.dragging.offsetX;
          const requestedY = event.clientY - this.dragging.areaRect.top - this.dragging.offsetY;
          if (this.dragging.movementContainerKind === "table-cell") {
            const maxX = Math.max(0, this.dragging.availableWidth - Math.max(0, Number(textbox.width) || 0));
            const maxY = Math.max(0, this.dragging.availableHeight - Math.max(0, Number(textbox.height) || 0));
            textbox.x = Math.min(maxX, Math.max(0, Math.round(requestedX)));
            textbox.y = Math.min(maxY, Math.max(0, Math.round(requestedY)));
            this.updateTableCellTextboxArea(textbox.id);
          } else {
            const owner = this.findTextboxOwnerById(textbox.id);
            const multiple = (owner?.paragraph?.subparagraphs?.length || 0) > 1;
            const elementWidth = document.querySelector(`[data-textbox-id="${textbox.id}"]`)?.offsetWidth || textbox.width;
            if (multiple && Math.round(requestedX) !== textbox.x) this.dragging.movedLaterally = true;
            textbox.x = multiple && this.dragging.movedLaterally
              ? this.clampMovableX(this.dragging.subparagraphId, requestedX, elementWidth)
              : this.clampHorizontalMove(this.dragging.subparagraphId, requestedX, elementWidth);
            textbox.y = Math.max(0, Math.round(requestedY));
          }

          const element = document.querySelector(`[data-textbox-id="${textbox.id}"]`);
          if (element) {
            element.style.left = `${textbox.x}px`;
            element.style.top = `${textbox.y}px`;
          }

          if (this.dragging.movementContainerKind !== "table-cell") {
            if (this.dragging.movedLaterally) this.fitSubparagraphWidthToContents(this.dragging.subparagraphId);
            this.fitSubparagraphHeightToContents(this.dragging.subparagraphId);
          }

          // Se a caixa está em modo de edição, a moldura externa precisa
          // acompanhar a movimentação em tempo real. Antes ela só era
          // reposicionada no pointerup, parecendo "ficar para trás".
          this.positionObjectEditOverlay();

          this.updateJsonOutput();
          return;
        }

        if (this.dragging.type === "object") {
          const owner = this.findObjectOwnerById(this.dragging.objectId);
          const object = owner?.object;
          if (!object) return;

          const element = document.querySelector(`[data-main-object-id="${object.id}"]`);
          if (element) {
            const objectRect = element.getBoundingClientRect();
            const objectWidth = element.offsetWidth || objectRect.width || 0;
            const objectHeight = element.offsetHeight || objectRect.height || 0;
            const requestedX = this.dragging.startX + event.clientX - this.dragging.startClientX;
            const requestedY = this.dragging.startY + event.clientY - this.dragging.startClientY;

            if (this.dragging.movementContainerKind === "table-cell") {
              const currentBounds = this.getTableCellObjectMovementBounds(element);
              const availableWidth = currentBounds?.width ?? Math.max(0, Number(this.dragging.availableWidth) || 0);
              const availableHeight = currentBounds?.height ?? Math.max(0, Number(this.dragging.availableHeight) || 0);
              const maxX = Math.max(0, availableWidth - objectWidth);
              const maxY = Math.max(0, availableHeight - objectHeight);
              object.x = Math.min(maxX, Math.max(0, Math.round(requestedX)));
              object.y = Math.min(maxY, Math.max(0, Math.round(requestedY)));
            } else if (this.objectExtendsSubparagraphWhenMoved(object)) {
              const multiple = (owner.paragraph?.subparagraphs?.length || 0) > 1;
              if (multiple && Math.round(requestedX) !== (Number(this.dragging.startX) || 0)) this.dragging.movedLaterally = true;
              if (multiple && this.dragging.movedLaterally) {
                if (this.dragging.freezeObjectWidth) {
                  object.width = this.dragging.frozenObjectWidth;
                  this.dragging.widthPinned = true;
                }
                if (Number(object.width) > 0) {
                  element.style.width = `${Math.round(object.width)}px`;
                  element.style.maxWidth = "none";
                }
                const usedWidth = Number(object.width) > 0 ? Number(object.width) : objectWidth;
                object.x = this.clampMovableX(this.dragging.subparagraphId, requestedX, usedWidth);
              } else {
                object.x = this.clampHorizontalMove(this.dragging.subparagraphId, requestedX, objectWidth);
              }
              object.y = Math.max(0, Math.round(requestedY));
            } else {
              const maxY = Math.max(0, (Number(this.dragging.availableHeight) || 0) - objectHeight);
              object.x = this.clampHorizontalMove(this.dragging.subparagraphId, requestedX, objectWidth);
              object.y = Math.min(maxY, Math.max(0, Math.round(requestedY)));
            }

            element.style.transform = `translate(${object.x}px, ${object.y}px)`;
            if (this.dragging.movementContainerKind !== "table-cell" && this.objectExtendsSubparagraphWhenMoved(object)) {
              if (this.dragging.movedLaterally) this.fitSubparagraphWidthToContents(this.dragging.subparagraphId);
              this.fitSubparagraphHeightToContents(this.dragging.subparagraphId);
            }
            this.positionObjectEditOverlay();
          }

          this.updateJsonOutput();
        }
      },

onPointerUp(event) {
        if (!this.dragging) return;
        const dragging = this.dragging;
        const movedType = dragging.type;
        document.querySelectorAll(".subparagraph.is-moving").forEach(element => element.classList.remove("is-moving"));
        document.querySelectorAll(".is-dragging-object").forEach(element => element.classList.remove("is-dragging-object"));
        this.dragging = null;
        this.positionObjectEditOverlay();

        if (movedType === "object-resize") {
          this.renderStatePanel(dragging.isInlineListResize
            ? "Lista redimensionada."
            : dragging.isInlineLineResize
              ? "Linha redimensionada."
              : "Objeto/caixa de texto redimensionado.");
          return;
        }

        if (movedType === "subparagraph-move") {
          this.suppressSubparagraphClickAfterDrag = true;
          this.renderStatePanel("Subparágrafo movido na vertical.");
          return;
        }

        if (movedType === "subparagraph-resize") {
          this.renderStatePanel("Subparágrafo redimensionado.");
          return;
        }

        if (movedType === "table-part-resize") {
          this.renderStatePanel("Parte da tabela redimensionada.");
          return;
        }

        if (movedType === "object" && dragging.widthPinned && !dragging.movedLaterally) {
          const pinned = this.findObjectOwnerById(dragging.objectId)?.object;
          if (pinned) delete pinned.width;
          const pinnedElement = document.querySelector(`[data-main-object-id="${dragging.objectId}"]`);
          if (pinnedElement) {
            pinnedElement.style.width = "";
            pinnedElement.style.maxWidth = "";
          }
        }

        const message = movedType === "object" ? "Objeto reposicionado." : "Caixa de texto reposicionada.";
        this.renderStatePanel(message);
      }
});
