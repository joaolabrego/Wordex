"use strict";

Object.assign(wordex, {
loadEmbeddedTemplate() {
        const node = document.getElementById("wordexSavedDocument");
        if (!node) return false;

        try {
          const state = JSON.parse(node.textContent || "{}");
          if (!state.document || !Array.isArray(state.document.sections))
            throw new Error("O arquivo não contém um template Wordex válido.");

          this.document = state.document;
          this.dataSource = state.dataSource ?? null;
          this.dataSourceFileName = String(state.dataSourceFileName || "");
          document.title = String(this.document.title || "Wordex");
          this.rebuildCountersFromDocument();
          this.migrateTextHtmlToRuns?.();
          this.sanitizeLoadedTableRowHeights?.(this.document);
          window.WORDEX_STANDALONE = true;
          return true;
        } catch (error) {
          console.error("Não foi possível carregar o template Wordex incorporado.", error);
          return false;
        }
      },

saveLocal() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.document));
        this.render("Template salvo no localStorage.");
      },

loadLocal() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          this.render("Nenhum template salvo localmente.", true);
          return;
        }

        try {
          this.document = JSON.parse(raw);
          if (!Object.prototype.hasOwnProperty.call(this.document, "watermark")) this.document.watermark = null;
          this.rebuildCountersFromDocument();
          this.migrateTextHtmlToRuns?.();
          const bodySection = this.findSectionByKind(SECTION_KIND.BODY) || this.document.sections[0];
          const paragraph = this.getFirstParagraph(bodySection);
          const subparagraph = paragraph.subparagraphs[0];
          this.activeSection = bodySection.id;
          this.activeParagraph = paragraph.id;
          this.activeSubparagraph = subparagraph.id;
          this.activeTextbox = null;
          this.render("Template carregado do localStorage.", false, { focusActiveEditableSubparagraph: true });
        } catch (error) {
          this.render(`Erro ao carregar template: ${error.message}`, true);
        }
      },

migrateTextHtmlToRuns() {
        if (!window.WordexRuns) return;
        const defaults = this.document.textDefaults || this.getCurrentToolbarTextStyles?.() || {};
        this.document.sections?.forEach(section => {
          section.paragraphs?.forEach(paragraph => {
            if (!this.isParagraphEntry(paragraph)) return;
            paragraph.subparagraphs?.forEach(subparagraph => {
              if (!Array.isArray(subparagraph.runs)) subparagraph.runs = [];
              if (subparagraph.contentKind === CONTENT_KIND.TEXT && subparagraph.textHtml && subparagraph.runs.length === 0) {
                subparagraph.runs = WordexRuns.htmlToRuns(subparagraph.textHtml, subparagraph.textStyle || defaults);
              }
            });
          });
        });
      },

reset() {
        this.document = createInitialTemplate();
        this.syncDocumentDefaultsFromToolbar();
        const bodySection = this.findSectionByKind(SECTION_KIND.BODY);
        this.activeSection = bodySection.id;
        const firstParagraph = this.getFirstParagraph(bodySection);
        this.activeParagraph = firstParagraph.id;
        this.activeSubparagraph = firstParagraph.subparagraphs[0].id;
        this.activeTextbox = null;
        this.render("Template reiniciado.", false, { focusActiveEditableSubparagraph: true });
      },

rebuildCountersFromDocument() {
        idCounters = Object.create(null);
        const inspect = value => {
          if (!value || typeof value !== "object") return;

          if (typeof value.id === "string") {
            const match = value.id.match(/^([a-z]+)(\d+)$/i);
            if (match) {
              const prefix = match[1];
              const number = Number(match[2]);
              idCounters[prefix] = Math.max(idCounters[prefix] || 0, number);
            }
          }

          for (const key of Object.keys(value)) {
            const child = value[key];
            if (Array.isArray(child)) child.forEach(inspect);
            else inspect(child);
          }
        };

        inspect(this.document);
      },
});
