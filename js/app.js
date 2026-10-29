"use strict";

const wordex = {
document: createInitialTemplate(),

dataSource: null,

dataSourceFileName: "",

previewMode: false,


selectedDataFieldPath: "",

activeSection: null,

activeParagraph: null,

activeSubparagraph: null,

activeTextbox: null,

pendingTextInsertionCaret: null,

activeObject: null,

activeEditTargetKind: null,

activeTableSelection: null,

activeTableCellRangeSelection: null,

activeTableCellCaret: null,

objectEditMode: false,

resizeOverlay: null,

marginDialog: null,

marginDialogBackdrop: null,

activeMarginDialogOriginal: null,

objectDialogBackdrop: null,

pendingObjectKind: null,

pendingChartTarget: null,

pendingTableTarget: null,

pendingListTarget: null,

pendingListRootTarget: null,

pendingListSubparagraphId: null,

pendingImageDataUrl: "",

pendingImageFileName: "",

pendingImageFields: [],

pendingWatermarkRemove: false,

tableCellFocusAfterEdit: null,

dragging: null,

suppressNextDocumentClick: false,

suppressSubparagraphClickAfterDrag: false,
suppressInlineLineClickAfterDrag: false,

init() {
        const loadedTemplate = this.loadEmbeddedTemplate?.() === true;
        const bodySection = this.findSectionByKind(SECTION_KIND.BODY);
        const firstParagraph = this.getFirstParagraph(bodySection);
        const firstSubparagraph = firstParagraph.subparagraphs[0];

        this.activeSection = bodySection.id;
        this.activeParagraph = firstParagraph.id;
        this.activeSubparagraph = firstSubparagraph.id;

        this.populatePaperFormatSelect();
        if (loadedTemplate && this.document?.textDefaults) {
          this.setTypingTextDefaults(this.document.textDefaults, { updateControls: true });
        } else {
          this.syncDocumentDefaultsFromToolbar();
        }
        this.applyPageFormat();
        this.bindToolbar();
        this.updateDataSourceContextSelectors?.();
        this.migrateTextHtmlToRuns?.();
        this.bindGlobalPointerEvents();
        this.render("", false, {
          // Template embutido: não focar SP com tabela (evita colapso no load).
          focusActiveEditableSubparagraph: !loadedTemplate,
          preserveTableGeometry: loadedTemplate
        });
      },

bindGlobalPointerEvents() {
        document.getElementById("page")?.addEventListener("click", event => this.onPageBackgroundClick(event));
        window.addEventListener("pointermove", event => this.onPointerMove(event));
        window.addEventListener("pointerup", event => this.onPointerUp(event));
        window.addEventListener("resize", () => this.positionObjectEditOverlay());
        window.addEventListener("scroll", () => this.positionObjectEditOverlay(), true);
        document.addEventListener("click", event => this.onDocumentClick(event), true);
      },
};
