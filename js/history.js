"use strict";

(() => {
  const MAX_HISTORY_STATES = 100;

  function cloneFromSerialized(serialized) {
    return JSON.parse(serialized);
  }

  function serializeDocument(documentModel) {
    return JSON.stringify(documentModel);
  }

  const originalInit = wordex.init;
  const originalUpdateJsonOutput = wordex.updateJsonOutput;

  Object.assign(wordex, {
    historyUndoStack: [],
    historyRedoStack: [],
    historyLastSerialized: "",
    historyApplying: false,
    historyKeyboardBound: false,
    initHistory() {
      this.historyUndoStack = [];
      this.historyRedoStack = [];
      this.historyLastSerialized = "";
      this.historyApplying = false;
      this.recordHistoryState({ force: true });
    },

    recordHistoryState(options = {}) {
      if (this.historyApplying) return;
      if (!this.document) return;

      const serialized = serializeDocument(this.document);
      if (!options.force && serialized === this.historyLastSerialized) return;

      this.historyUndoStack.push(serialized);
      if (this.historyUndoStack.length > MAX_HISTORY_STATES) {
        this.historyUndoStack.splice(0, this.historyUndoStack.length - MAX_HISTORY_STATES);
      }

      this.historyRedoStack = [];
      this.historyLastSerialized = serialized;
    },

    restoreHistoryState(serialized, message) {
      this.historyApplying = true;

      try {
        this.document = cloneFromSerialized(serialized);
        this.historyLastSerialized = serialized;
        this.activeTextbox = null;
        this.activeObject = null;
        this.activeEditTargetKind = null;
        this.activeTableSelection = null;
        this.objectEditMode = false;
        this.dragging = null;
        this.ensureValidSelection?.();
        this.render(message || "", false, { focusActiveEditableSubparagraph: true });
      } finally {
        this.historyApplying = false;
      }

      originalUpdateJsonOutput.call(this);
    },

    undoHistory() {
      if (this.historyUndoStack.length <= 1) {
        this.renderStatePanel?.("Nada para desfazer.");
        return;
      }

      const current = this.historyUndoStack.pop();
      this.historyRedoStack.push(current);
      const previous = this.historyUndoStack[this.historyUndoStack.length - 1];
      this.restoreHistoryState(previous, "Alteração desfeita.");
    },

    redoHistory() {
      if (this.historyRedoStack.length === 0) {
        this.renderStatePanel?.("Nada para refazer.");
        return;
      }

      const next = this.historyRedoStack.pop();
      this.historyUndoStack.push(next);
      this.restoreHistoryState(next, "Alteração refeita.");
    },

    bindHistoryKeyboardShortcuts() {
      if (this.historyKeyboardBound) return;
      this.historyKeyboardBound = true;

      document.addEventListener("keydown", event => {
        const isModifier = event.ctrlKey || event.metaKey;
        if (!isModifier || event.altKey) return;

        const key = event.key.toLowerCase();

        if (key === "c") {
          this.handleCopyShortcut(event);
          return;
        }

        if (key === "v") {
          this.handlePasteShortcut(event);
          return;
        }

        if (key === "x") {
          this.handleCutShortcut?.(event);
          return;
        }

        if (key === "z") {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) {
            this.redoHistory();
          } else {
            this.undoHistory();
          }
          return;
        }

        if (key === "y") {
          event.preventDefault();
          event.stopPropagation();
          this.redoHistory();
        }
      }, true);
    }
  });

  wordex.updateJsonOutput = function updateJsonOutputWithHistory() {
    originalUpdateJsonOutput.call(this);
    this.recordHistoryState?.();
  };

  wordex.init = function initWithHistory(...args) {
    originalInit.apply(this, args);
    this.initHistory();
    this.bindHistoryKeyboardShortcuts();
  };
})();
