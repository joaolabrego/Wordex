"use strict";

Object.assign(wordex, {
findSectionById(sectionId) {
        return this.document.sections.find(section => section.id === sectionId) || null;
      },

findSectionByKind(sectionKind) {
        return this.document.sections.find(section => section.sectionKind === sectionKind) || null;
      },

isSectionEnabled(section) {
        return Boolean(section);
      },

isParagraphEntry(value) {
        return Boolean(value && typeof value === "object" && Array.isArray(value.subparagraphs));
      },

getSectionParagraphEntries(section) {
        return (section?.paragraphs || [])
          .map((paragraph, index) => ({ paragraph, index }))
          .filter(entry => this.isParagraphEntry(entry.paragraph));
      },

getFirstParagraph(section) {
        return this.getSectionParagraphEntries(section)[0]?.paragraph || null;
      },

findParagraphById(paragraphId) {
        for (const section of this.document.sections) {
          const paragraph = section.paragraphs.find(item => item.id === paragraphId);
          if (paragraph) return paragraph;
        }
        return null;
      },

findSubparagraphById(subparagraphId) {
        for (const section of this.document.sections) {
          for (const paragraph of section.paragraphs) {
            if (!this.isParagraphEntry(paragraph)) continue;
            const subparagraph = paragraph.subparagraphs.find(item => item.id === subparagraphId);
            if (subparagraph) return subparagraph;
          }
        }
        return null;
      },

findTextboxById(textboxId) {
        for (const section of this.document.sections) {
          for (const paragraph of section.paragraphs) {
            if (!this.isParagraphEntry(paragraph)) continue;
            for (const subparagraph of paragraph.subparagraphs) {
              const textbox = [
                ...(Array.isArray(subparagraph.textboxes) ? subparagraph.textboxes : []),
                ...(Array.isArray(subparagraph.inlineTextboxes) ? subparagraph.inlineTextboxes : [])
              ].find(item => item.id === textboxId);
              if (textbox) return textbox;
            }
          }
        }
        return null;
      },

findParagraphOwnerById(paragraphId) {
        for (const section of this.document.sections) {
          const index = section.paragraphs.findIndex(item => this.isParagraphEntry(item) && item.id === paragraphId);
          if (index >= 0) {
            return { section, paragraph: section.paragraphs[index], paragraphIndex: index };
          }
        }
        return null;
      },

findSubparagraphOwnerById(subparagraphId) {
        for (const section of this.document.sections) {
          for (const paragraph of section.paragraphs) {
            if (!this.isParagraphEntry(paragraph)) continue;
            const index = paragraph.subparagraphs.findIndex(item => item.id === subparagraphId);
            if (index >= 0) {
              return { section, paragraph, subparagraph: paragraph.subparagraphs[index], subparagraphIndex: index };
            }
          }
        }
        return null;
      },

findTextboxOwnerById(textboxId) {
        for (const section of this.document.sections) {
          for (const paragraph of section.paragraphs) {
            if (!this.isParagraphEntry(paragraph)) continue;
            for (const subparagraph of paragraph.subparagraphs) {
              const overlayTextboxes = Array.isArray(subparagraph.textboxes) ? subparagraph.textboxes : [];
              const overlayIndex = overlayTextboxes.findIndex(item => item.id === textboxId);
              if (overlayIndex >= 0) {
                const textbox = overlayTextboxes[overlayIndex];
                const tableCell = textbox.tableCell && typeof textbox.tableCell === "object"
                  ? textbox.tableCell
                  : null;
                return { section, paragraph, subparagraph, textbox, textboxIndex: overlayIndex, tableCell, inline: false };
              }

              const inlineTextboxes = Array.isArray(subparagraph.inlineTextboxes) ? subparagraph.inlineTextboxes : [];
              const inlineIndex = inlineTextboxes.findIndex(item => item.id === textboxId);
              if (inlineIndex >= 0) {
                return { section, paragraph, subparagraph, textbox: inlineTextboxes[inlineIndex], textboxIndex: inlineIndex, tableCell: null, inline: true };
              }
            }
          }
        }
        return null;
      },

findObjectOwnerById(objectId) {
        for (const section of this.document.sections) {
          for (const paragraph of section.paragraphs) {
            if (!this.isParagraphEntry(paragraph)) continue;
            for (const subparagraph of paragraph.subparagraphs) {
              if (subparagraph.object?.id === objectId) {
                return { section, paragraph, subparagraph, object: subparagraph.object };
              }
              const inlineLists = Array.isArray(subparagraph.inlineLists) ? subparagraph.inlineLists : [];
              const inlineListIndex = inlineLists.findIndex(item => item.id === objectId);
              if (inlineListIndex >= 0) {
                return { section, paragraph, subparagraph, object: inlineLists[inlineListIndex], inline: true, inlineListIndex };
              }
              const inlineLines = Array.isArray(subparagraph.inlineLines) ? subparagraph.inlineLines : [];
              const inlineLineIndex = inlineLines.findIndex(item => item.id === objectId);
              if (inlineLineIndex >= 0) {
                return { section, paragraph, subparagraph, object: inlineLines[inlineLineIndex], inline: true, inlineLineIndex };
              }
              const table = subparagraph.object?.kind === KINDS.TABLE ? subparagraph.object : null;
              if (table && Array.isArray(table.cellObjects)) {
                for (let row = 0; row < table.cellObjects.length; row += 1) {
                  const cells = table.cellObjects[row] || [];
                  for (let col = 0; col < cells.length; col += 1) {
                    if (cells[col]?.id === objectId) {
                      return { section, paragraph, subparagraph, table, rowIndex: row, colIndex: col, object: cells[col] };
                    }
                  }
                }
              }
            }
          }
        }
        return null;
      },

ensureValidSelection() {
        let section = this.findSectionById(this.activeSection) || this.findSectionByKind(SECTION_KIND.BODY) || this.document.sections[0];
        if (!this.activeParagraph) {
          this.activeSection = section.id;
          this.activeParagraph = null;
          this.activeSubparagraph = null;
          this.activeTextbox = null;
          this.activeObject = null;
          return;
        }

        let paragraph = section.paragraphs.find(item => this.isParagraphEntry(item) && item.id === this.activeParagraph);
        if (!paragraph) {
          const owner = this.findParagraphOwnerById(this.activeParagraph);
          if (owner) {
            section = owner.section;
            paragraph = owner.paragraph;
          } else {
            paragraph = this.getFirstParagraph(section);
          }
        }
        if (!paragraph) throw new Error("A seção não contém parágrafo para seleção.");

        const subparagraph = paragraph.subparagraphs.find(item => item.id === this.activeSubparagraph) || null;
        this.activeSection = section.id;
        this.activeParagraph = paragraph.id;
        this.activeSubparagraph = subparagraph ? subparagraph.id : null;
        if (!subparagraph) {
          this.activeTextbox = null;
          this.activeObject = null;
        }
      },

escapeTestParagraphText(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      },

getSectionDisplayName(section) {
        const kind = section?.sectionKind || SECTION_KIND.BODY;
        if (kind === SECTION_KIND.HEADER) return "Header";
        if (kind === SECTION_KIND.FOOTER) return "Footer";
        return "Body";
      },

getNextTestParagraphNumber(section) {
        const label = this.getSectionDisplayName(section);
        const pattern = new RegExp(`^Novo Parágrafo ${label} (\\d+)$`);
        let max = 0;

        this.getSectionParagraphEntries(section).forEach(({ paragraph }) => {
          (paragraph.subparagraphs || []).forEach(subparagraph => {
            const rawText = String(subparagraph.textHtml || "")
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .trim();
            const match = rawText.match(pattern);
            if (match) max = Math.max(max, Number(match[1]) || 0);
          });
        });

        return max + 1;
      },

applyTestTextToNewParagraph(paragraph, section) {
        const subparagraph = paragraph?.subparagraphs?.[0];
        if (!subparagraph) return;

        const label = this.getSectionDisplayName(section);
        const text = `Novo Parágrafo ${label} ${this.getNextTestParagraphNumber(section)}`;
        subparagraph.contentKind = CONTENT_KIND.TEXT;
        subparagraph.textHtml = this.escapeTestParagraphText(text);
        subparagraph.runs = window.WordexRuns?.createRun ? [window.WordexRuns.createRun(text, {}, this.getEffectiveTextDefaults?.() || {})] : [];
      },

addParagraphToActiveSection() {
        const section = this.findSectionById(this.activeSection);
        if (!section) return;

        const paragraph = createParagraph();
        this.applyTestTextToNewParagraph(paragraph, section);
        section.paragraphs.push(paragraph);
        this.activeParagraph = paragraph.id;
        this.activeSubparagraph = paragraph.subparagraphs[0].id;
        this.activeTextbox = null;
        this.render("Novo parágrafo criado.", false, { focusActiveEditableSubparagraph: true });
      },

addSubparagraphToActiveParagraph() {
        const paragraph = this.findParagraphById(this.activeParagraph);
        if (!paragraph) return;

        const subparagraph = createSubparagraph();
        paragraph.subparagraphs.push(subparagraph);
        this.balanceSubparagraphSharesAfterInsert?.(paragraph);
        this.activeSubparagraph = subparagraph.id;
        this.activeTextbox = null;
        this.render("Novo subparágrafo criado.", false, { focusActiveEditableSubparagraph: true });
      },

removeActiveParagraph() {
        const owner = this.findParagraphOwnerById(this.activeParagraph);
        if (!owner) return;

        owner.section.paragraphs.splice(owner.paragraphIndex, 1);

        let remainingParagraphs = this.getSectionParagraphEntries(owner.section);
        if (remainingParagraphs.length === 0) {
          const replacementParagraph = createParagraph();
          owner.section.paragraphs = [replacementParagraph];
          this.activeSection = owner.section.id;
          this.activeParagraph = replacementParagraph.id;
          this.activeSubparagraph = replacementParagraph.subparagraphs[0].id;
          this.activeTextbox = null;
          this.render("Último parágrafo removido e recriado automaticamente.", false, { focusActiveEditableSubparagraph: true });
          return;
        }

        while (owner.section.paragraphs.at(-1) === PAGE_BREAK_CHARACTER) {
          owner.section.paragraphs.pop();
        }
        remainingParagraphs = this.getSectionParagraphEntries(owner.section);

        const nextEntry = remainingParagraphs.find(entry => entry.index >= owner.paragraphIndex) || remainingParagraphs[remainingParagraphs.length - 1];
        const nextParagraph = nextEntry.paragraph;
        const nextSubparagraph = nextParagraph.subparagraphs[0];

        this.activeSection = owner.section.id;
        this.activeParagraph = nextParagraph.id;
        this.activeSubparagraph = nextSubparagraph.id;
        this.activeTextbox = null;
        this.render("Parágrafo removido.", false, { focusActiveEditableSubparagraph: true });
      },

removeActiveSubparagraph() {
        const owner = this.findSubparagraphOwnerById(this.activeSubparagraph);
        if (!owner) return;

        owner.paragraph.subparagraphs.splice(owner.subparagraphIndex, 1);

        if (owner.paragraph.subparagraphs.length === 1) {
          owner.paragraph.subparagraphs[0].width = null;
        }

        if (
          owner.paragraph.subparagraphs.length <= 1 &&
          this.objectEditMode &&
          this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH
        ) {
          this.objectEditMode = false;
          this.activeEditTargetKind = null;
          this.activeObject = null;
          this.activeTableSelection = null;
          this.dragging = null;
          this.hideObjectEditOverlay();
        }

        if (owner.paragraph.subparagraphs.length === 0) {
          const replacementSubparagraph = createSubparagraph();
          owner.paragraph.subparagraphs.push(replacementSubparagraph);
          this.activeSection = owner.section.id;
          this.activeParagraph = owner.paragraph.id;
          this.activeSubparagraph = replacementSubparagraph.id;
          this.activeTextbox = null;
          this.render("Último subparágrafo removido e recriado automaticamente.", false, { focusActiveEditableSubparagraph: true });
          return;
        }

        const nextIndex = Math.min(owner.subparagraphIndex, owner.paragraph.subparagraphs.length - 1);
        const nextSubparagraph = owner.paragraph.subparagraphs[nextIndex];

        this.activeSection = owner.section.id;
        this.activeParagraph = owner.paragraph.id;
        this.activeSubparagraph = nextSubparagraph.id;
        this.activeTextbox = null;
        this.render("Subparágrafo removido.", false, { focusActiveEditableSubparagraph: true });
      },
});
