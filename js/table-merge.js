"use strict";

Object.assign(wordex, {
ensureTableMergeState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.cellColspans)) table.cellColspans = [];
        for (let row = 0; row < table.rows; row += 1) {
          if (!Array.isArray(table.cellColspans[row])) table.cellColspans[row] = [];
          for (let col = 0; col < table.cols; col += 1) {
            const span = Math.max(1, Number(table.cellColspans[row][col]) || 1);
            table.cellColspans[row][col] = span;
          }
        }
      },

getActiveTableCellRangeSelection() {
        const range = this.activeTableCellRangeSelection;
        if (!range || !range.tableId) return null;
        const owner = this.findObjectOwnerById?.(range.tableId);
        const table = owner?.object;
        if (!table || table.kind !== KINDS.TABLE) return null;
        const rowIndex = Math.min(Math.max(0, Number(range.rowIndex) || 0), Math.max(0, table.rows - 1));
        const startCol = Math.min(Math.max(0, Number(range.startCol) || 0), Math.max(0, table.cols - 1));
        const endCol = Math.min(Math.max(startCol, Number(range.endCol) || startCol), Math.max(0, table.cols - 1));
        return { ...range, rowIndex, startCol, endCol, table, owner };
      },

setTableCellRangeSelection(tableId, rowIndex, startCol, endCol = startCol) {
        const owner = this.findObjectOwnerById?.(tableId);
        const table = owner?.object;
        if (!owner || !table || table.kind !== KINDS.TABLE) return;

        const safeRow = Math.min(Math.max(0, Number(rowIndex) || 0), Math.max(0, table.rows - 1));
        const a = Math.min(Math.max(0, Number(startCol) || 0), Math.max(0, table.cols - 1));
        const b = Math.min(Math.max(0, Number(endCol) || 0), Math.max(0, table.cols - 1));
        const left = Math.min(a, b);
        const right = Math.max(a, b);

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = owner.subparagraph.id;
        this.activeObject = tableId;
        this.activeTextbox = null;
        this.activeTableCellRangeSelection = {
          tableId,
          rowIndex: safeRow,
          startCol: left,
          endCol: right
        };
        this.activeTableSelection = {
          tableId,
          kind: EDIT_TARGET_KIND.TABLE_CELL,
          rowIndex: safeRow,
          colIndex: left
        };
        this.activeEditTargetKind = EDIT_TARGET_KIND.TABLE_CELL;
      },

toggleTableCellRangeSelection(cellElement) {
        const tableId = cellElement?.dataset?.tableCell;
        if (!tableId) return;
        const rowIndex = Number(cellElement.dataset.row) || 0;
        const colIndex = Number(cellElement.dataset.col) || 0;
        const current = this.activeTableCellRangeSelection;

        if (!current || current.tableId !== tableId || current.rowIndex !== rowIndex) {
          this.setTableCellRangeSelection(tableId, rowIndex, colIndex, colIndex);
        } else if (colIndex < current.startCol - 1 || colIndex > current.endCol + 1) {
          this.setTableCellRangeSelection(tableId, rowIndex, colIndex, colIndex);
        } else if (colIndex >= current.startCol && colIndex <= current.endCol) {
          // Clicou numa célula já selecionada: ela e as da direita saem da seleção.
          if (colIndex <= current.startCol) {
            this.setTableCellRangeSelection(tableId, rowIndex, colIndex, colIndex);
          } else {
            this.setTableCellRangeSelection(tableId, rowIndex, current.startCol, colIndex - 1);
          }
        } else if (colIndex === current.startCol - 1) {
          this.setTableCellRangeSelection(tableId, rowIndex, colIndex, current.endCol);
        } else if (colIndex === current.endCol + 1) {
          this.setTableCellRangeSelection(tableId, rowIndex, current.startCol, colIndex);
        }

        this.clearNativeCaretAndSelection?.();
        this.renderStatePanel?.("Seleção horizontal de células atualizada.");
        this.refreshActiveClasses?.();
        this.updateToolbarState?.();
      },

hasMergeableTableCellSelection() {
        const range = this.getActiveTableCellRangeSelection?.();
        return Boolean(range && range.endCol > range.startCol);
      },

getActiveTableRowForMergeActions() {
        // O botao de desfazer mesclagem deve seguir a linha onde esta o caret,
        // nao qualquer linha selecionada anteriormente na tabela.
        const focusedCell = document.activeElement?.closest?.("[data-table-cell]");
        if (focusedCell?.dataset?.tableCell) {
          const owner = this.findObjectOwnerById?.(focusedCell.dataset.tableCell);
          const table = owner?.object;
          if (table && table.kind === KINDS.TABLE) {
            const rowIndex = Math.min(
              Math.max(0, Number(focusedCell.dataset.row) || 0),
              Math.max(0, table.rows - 1)
            );
            return { table, rowIndex };
          }
        }

        // Ao clicar no botão da toolbar o foco sai da célula. Por isso
        // mantemos a última célula em que houve caret/click/focus como fonte
        // da linha atual.
        const remembered = this.activeTableCellCaret;
        if (remembered?.tableId) {
          const owner = this.findObjectOwnerById?.(remembered.tableId);
          const table = owner?.object;
          if (table && table.kind === KINDS.TABLE) {
            const rowIndex = Math.min(
              Math.max(0, Number(remembered.rowIndex) || 0),
              Math.max(0, table.rows - 1)
            );
            return { table, rowIndex };
          }
        }

        // Durante uma selecao horizontal por Shift+Enter, o caret pode estar
        // oculto/limpo. Nesse caso, a propria selecao temporaria define a linha.
        const range = this.getActiveTableCellRangeSelection?.();
        if (range?.table) {
          return { table: range.table, rowIndex: range.rowIndex };
        }

        return null;
      },

rowHasMergedTableCells(table, rowIndex) {
        if (!table || table.kind !== KINDS.TABLE) return false;
        this.ensureTableMergeState(table);
        const safeRow = Math.min(Math.max(0, Number(rowIndex) || 0), Math.max(0, table.rows - 1));
        const rowSpans = table.cellColspans?.[safeRow] || [];
        return rowSpans.some(span => Math.max(1, Number(span) || 1) > 1);
      },

clearTableCellRangeSelection() {
        if (!this.activeTableCellRangeSelection) return false;
        this.activeTableCellRangeSelection = null;
        this.refreshActiveClasses?.();
        this.updateTableMergeToolbarButtons?.();
        return true;
      },

updateTableMergeToolbarButtons() {
        const mergeButton = document.getElementById("btnMergeTableCells");
        const unmergeButton = document.getElementById("btnUnmergeTableRow");
        const range = this.getActiveTableCellRangeSelection?.();
        const hasRange = Boolean(range && range.endCol > range.startCol);
        const activeRow = this.getActiveTableRowForMergeActions?.();
        const hasMergedCellsInRow = Boolean(activeRow && this.rowHasMergedTableCells?.(activeRow.table, activeRow.rowIndex));
        if (mergeButton) mergeButton.hidden = !hasRange;
        if (unmergeButton) unmergeButton.hidden = !hasMergedCellsInRow;
      },

mergeSelectedTableCells() {
        const range = this.getActiveTableCellRangeSelection?.();
        if (!range || range.endCol <= range.startCol) return;
        const { table, rowIndex, startCol, endCol } = range;
        this.ensureTableMergeState(table);

        // Normaliza a linha antes da mesclagem para evitar colspans sobrepostos.
        for (let col = startCol; col <= endCol; col += 1) {
          table.cellColspans[rowIndex][col] = 1;
        }
        table.cellColspans[rowIndex][startCol] = endCol - startCol + 1;

        // A seleção horizontal é apenas uma ação temporária para mesclar.
        // Depois da mesclagem, ela deve desaparecer; mantemos apenas a linha
        // corrente para permitir "desfazer mesclagens na linha atual".
        this.activeTableCellRangeSelection = null;
        this.activeTableSelection = {
          tableId: table.id,
          kind: EDIT_TARGET_KIND.TABLE_CELL,
          rowIndex,
          colIndex: startCol
        };
        this.activeEditTargetKind = EDIT_TARGET_KIND.TABLE_CELL;

        this.render("Células mescladas.", false);
        this.updateJsonOutput?.();
        this.updateTableMergeToolbarButtons?.();
      },

unmergeCurrentTableRow() {
        const activeRow = this.getActiveTableRowForMergeActions?.();
        const table = activeRow?.table;
        if (!table || table.kind !== KINDS.TABLE) return;
        const rowIndex = Math.min(Math.max(0, Number(activeRow.rowIndex) || 0), Math.max(0, table.rows - 1));
        this.ensureTableMergeState(table);
        for (let col = 0; col < table.cols; col += 1) {
          table.cellColspans[rowIndex][col] = 1;
        }
        this.activeTableCellRangeSelection = null;
        this.activeTableSelection = {
          tableId: table.id,
          kind: EDIT_TARGET_KIND.TABLE_CELL,
          rowIndex,
          colIndex: 0
        };
        this.activeTableCellCaret = {
          tableId: table.id,
          rowIndex,
          colIndex: 0
        };
        this.activeEditTargetKind = EDIT_TARGET_KIND.TABLE_CELL;
        this.render("Mesclagens da linha atual desfeitas.", false);
        this.updateJsonOutput?.();
        this.updateTableMergeToolbarButtons?.();
      }
,

ensureTableRowVisibilityState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.rowVisibility)) table.rowVisibility = [];
        if (!Array.isArray(table.rowReportVisibility)) table.rowReportVisibility = [];

        for (let row = 0; row < table.rows; row += 1) {
          const explicitValue =
            typeof table.rowReportVisibility[row] === "boolean" ? table.rowReportVisibility[row] :
            typeof table.rowVisibility[row] === "boolean" ? table.rowVisibility[row] :
            true;

          table.rowVisibility[row] = explicitValue;
          table.rowReportVisibility[row] = explicitValue;
        }

        if (table.rowVisibility.length > table.rows) table.rowVisibility.length = table.rows;
        if (table.rowReportVisibility.length > table.rows) table.rowReportVisibility.length = table.rows;
      },

getActiveTableRowVisibilitySelection() {
        const selection = this.activeTableSelection;
        if (!selection || !selection.tableId || !selection.fromCtrlClick || this.activeEditTargetKind !== EDIT_TARGET_KIND.TABLE_ROW) return null;
        const owner = this.findObjectOwnerById?.(selection.tableId);
        const table = owner?.object;
        if (!owner || !table || table.kind !== KINDS.TABLE) return null;
        this.ensureTableRowVisibilityState(table);
        const rowIndex = Math.min(Math.max(0, Number(selection.rowIndex) || 0), Math.max(0, table.rows - 1));
        return { owner, table, tableId: table.id, rowIndex };
      },

updateTableRowVisibilityToolbar() {
        const control = document.getElementById("tableRowVisibilityControl");
        const checkbox = document.getElementById("tableRowVisibilityCheckbox");
        if (!control || !checkbox) return;

        const selection = this.getActiveTableRowVisibilitySelection?.();
        const visible = Boolean(selection);
        control.hidden = !visible;
        if (!selection) return;

        checkbox.checked = selection.table.rowReportVisibility?.[selection.rowIndex] !== false;
        checkbox.title = `Linha ${selection.rowIndex + 1} visível no relatório`;
      },

setActiveTableRowVisible(visible) {
        const selection = this.getActiveTableRowVisibilitySelection?.();
        if (!selection) return;
        selection.table.rowVisibility[selection.rowIndex] = Boolean(visible);
        selection.table.rowReportVisibility[selection.rowIndex] = Boolean(visible);
        this.render(Boolean(visible) ? "Linha visível no relatório." : "Linha invisível no relatório.", false);
        this.updateJsonOutput?.();
      },
});
