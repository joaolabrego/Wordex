"use strict";

Object.assign(wordex, {
render(message = "", isError = false, options = {}) {
        this.ensureValidSelection();
        this.applyPageFormat();

        const page = document.getElementById("page");
        page.classList.toggle("is-data-preview", Boolean(this.previewMode));
        if (!Object.prototype.hasOwnProperty.call(this.document, "watermark")) this.document.watermark = null;
        page.innerHTML = `${this.renderWatermark()}${this.document.sections.map(section => this.renderSection(section)).join("")}`;

        page.querySelectorAll(".section[data-section-id]").forEach(element => {
          element.addEventListener("click", event => this.onSectionClick(event, element));
        });

        page.querySelectorAll(".paragraph[data-paragraph-id]").forEach(element => {
          element.addEventListener("click", event => this.onParagraphClick(event, element));
        });

        page.querySelectorAll(".subparagraph[data-subparagraph-id]").forEach(element => {
          element.addEventListener("pointerdown", event => this.onSubparagraphPointerDown(event, element));
          element.addEventListener("click", event => this.onSubparagraphClick(event, element));
          element.addEventListener("contextmenu", event => this.onSubparagraphContextMenu(event, element));
        });

        page.querySelectorAll("[data-text-subparagraph-id]").forEach(element => {
          element.addEventListener("beforeinput", event => this.onEditableBeforeInput(event, element));
          element.addEventListener("input", event => this.onSubparagraphInput(event, element));
          element.addEventListener("blur", event => this.onSubparagraphInput(event, element));
        });

        page.querySelectorAll("[data-table-cell]").forEach(element => {
          element.addEventListener("keydown", event => {
            if (event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              this.toggleTableCellRangeSelection?.(element);
            }
          });
          element.addEventListener("click", event => {
            if (event.shiftKey) {
              event.preventDefault();
              event.stopPropagation();
              this.toggleTableCellRangeSelection?.(element);
            }
          });
          // Célula editável deve se comportar como um contenteditable normal.
          // Sem isso, o clique sobe para o main-object/subparágrafo e a seleção
          // visual do objeto limpa o caret logo após o mouseup/click.
          ["pointerdown", "mousedown", "mouseup", "click"].forEach(eventName => {
            element.addEventListener(eventName, event => {
              if (event.ctrlKey || event.metaKey) return;
              if (element.getAttribute("contenteditable") === "true") {
                event.stopPropagation();
              }
            });
          });
          const rememberTableCellCaret = () => {
            this.activeTableCellCaret = {
              tableId: element.dataset.tableCell,
              rowIndex: Number(element.dataset.row) || 0,
              colIndex: Number(element.dataset.col) || 0
            };
          };
          element.addEventListener("focus", () => {
            // O contexto de dados da toolbar acompanha a linha da célula focada.
            // Detail mostra a collection do detail; footers mostram os totals
            // associados.
            rememberTableCellCaret();
            this.updateDataSourceContextSelectors?.();
            this.updateTableMergeToolbarButtons?.();
          });
          element.addEventListener("click", event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) return;
            rememberTableCellCaret();
            this.clearTableCellRangeSelection?.();
            if (element.getAttribute("contenteditable") === "true") {
              this.updateDataSourceContextSelectors?.();
              this.updateTableMergeToolbarButtons?.();
            }
          });
          element.addEventListener("keyup", rememberTableCellCaret);
          element.addEventListener("mouseup", rememberTableCellCaret);
          element.addEventListener("beforeinput", event => this.onEditableBeforeInput(event, element));
          element.addEventListener("input", event => this.onTableCellInput(event, element));
        });

        const doubleClickSelectedTableText = (tableElement, clientX, clientY) => {
          const selection = window.getSelection();
          if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
          if (!selection.toString()) return false;

          const anchor = selection.anchorNode;
          const anchorElement = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
          if (!anchorElement || !tableElement.contains(anchorElement)) return false;

          const range = selection.getRangeAt(0);
          for (const rect of range.getClientRects()) {
            if (clientX >= rect.left - 2 && clientX <= rect.right + 2 && clientY >= rect.top - 2 && clientY <= rect.bottom + 2)
              return true;
          }

          const hit = document.elementFromPoint(clientX, clientY);
          const cell = hit?.closest?.("[data-table-cell]");
          return Boolean(cell && tableElement.contains(cell) && cell.contains(anchorElement));
        };

        page.querySelectorAll("[data-main-object-id]").forEach(element => {
          element.addEventListener("click", event => this.onMainObjectClick(event, element));
          element.addEventListener("pointerdown", event => this.onMainObjectPointerDown(event, element));
          element.addEventListener("dblclick", event => {
            const kind = element.dataset.objectKind;
            if (![KINDS.CHART, KINDS.LIST, KINDS.TABLE].includes(kind)) return;

            const openDialog = () => {
              const owner = this.findObjectOwnerById(element.dataset.mainObjectId);
              if (!owner?.object) return;
              if (owner.object.kind === KINDS.CHART) this.showChartDialog(owner.object);
              else this.showObjectDialog(owner.object.kind, owner.object);
            };

            if (kind !== KINDS.TABLE) {
              event.preventDefault();
              event.stopPropagation();
              openDialog();
              return;
            }

            // O navegador seleciona a palavra no duplo-clique depois deste evento.
            const clientX = event.clientX;
            const clientY = event.clientY;
            setTimeout(() => {
              if (doubleClickSelectedTableText(element, clientX, clientY)) return;
              openDialog();
            }, 0);
          });
        });

        page.querySelectorAll("[data-inline-list-id]").forEach(element => {
          element.addEventListener("click", event => this.onInlineListClick(event, element));
          element.addEventListener("dblclick", event => {
            event.preventDefault();
            event.stopPropagation();
            const owner = this.findObjectOwnerById(element.dataset.inlineListId);
            if (owner?.object) this.showObjectDialog(KINDS.LIST, owner.object);
          });
        });

        page.querySelectorAll("[data-inline-line-id]").forEach(element => {
          element.addEventListener("click", event => this.onInlineLineClick(event, element));
        });

        page.querySelectorAll("[data-textbox-id]").forEach(element => {
          element.addEventListener("click", event => this.onTextboxClick(event, element));
          element.addEventListener("pointerdown", event => this.onTextboxPointerDown(event, element));
        });

        page.querySelectorAll("[data-textbox-content]").forEach(element => {
          element.addEventListener("beforeinput", event => this.onEditableBeforeInput(event, element));
          element.addEventListener("input", event => this.onTextboxInput(event, element));
        });

        this.syncSubparagraphWidthLayout?.();
        this.renderStatePanel(message, isError);
        this.updateToolbarState();
        this.updateJsonOutput();
        this.updateTextCommandButtonsVisibility();

        if (options.focusActiveEditableSubparagraph) {
          this.focusActiveEditableSubparagraph(options.restoreTextSelection || null);
        }

        if (options.focusFirstTableCell) {
          this.focusFirstTableCell(options.focusFirstTableCell);
        }
      },

focusActiveEditableSubparagraph(restoreTextSelection = null) {
        const subparagraph = this.findSubparagraphById(this.activeSubparagraph);
        if (!subparagraph || subparagraph.contentKind === CONTENT_KIND.OBJECT) return;

        const element = document.querySelector(`[data-text-subparagraph-id="${this.activeSubparagraph}"]`);
        if (!element || element.getAttribute("contenteditable") !== "true") return;

        const savedSelection = restoreTextSelection?.subparagraphId === element.dataset.textSubparagraphId
          ? restoreTextSelection
          : null;

        // O foco precisa ocorrer depois que o browser assentou o DOM recém-renderizado.
        // Assim, ao abrir/carregar o template, o usuário já pode digitar sem clicar.
        window.requestAnimationFrame(() => {
          element.focus();
          if (savedSelection && this.restoreEditableSelectionOffsets(element, savedSelection)) return;
          this.placeCaretAtEnd(element);
        });
      },

focusFirstTableCell(tableId) {
        window.requestAnimationFrame(() => {
          const firstCell = document.querySelector(`[data-table-cell="${tableId}"][data-row="0"][data-col="0"]`);
          if (!firstCell || firstCell.getAttribute("contenteditable") !== "true") return;
          firstCell.focus();
          this.placeCaretAtEnd(firstCell);
        });
      },

placeCaretAtEnd(element) {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      },

renderWatermark() {
        const watermark = this.document.watermark;
        if (!watermark || !watermark.src) return "";
        const sizePercent = Math.min(200, Math.max(1, Math.round(Number(watermark.sizePercent) || 80)));
        const opacity = Math.min(1, Math.max(0, Number(watermark.opacity) || 0.12));
        const size = `calc(100% * ${sizePercent} / 100)`;
        return `
          <div class="wordex-watermark" style="width:${size}; height:${size}; opacity:${opacity};">
            <img src="${escapeHtml(watermark.src)}" alt="Marca d'água">
          </div>
        `;
      },

renderSectionInlineStyle(section) {
        const styles = [];
        const marginStyle = renderBoxEdgesInlineStyle("margin", section?.margin);
        if (marginStyle) styles.push(marginStyle);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", section?.padding);
        if (paddingStyle) styles.push(paddingStyle);
        const textStyle = renderTextStyleInlineStyle(section?.textStyle);
        if (textStyle) styles.push(textStyle);
        return styles.length ? ` style="${styles.join(";")}"` : "";
      },

renderSection(section) {
        const activeClass = section.id === this.activeSection ? " is-active" : "";
        const inlineStyle = this.renderSectionInlineStyle(section);
        let paragraphNumber = 0;
        const content = section.paragraphs.map((entry, index) => {
          if (entry === PAGE_BREAK_CHARACTER) return this.renderPageBreakCharacter();
          if (!this.isParagraphEntry(entry)) return "";
          paragraphNumber += 1;
          return this.renderParagraph(section, entry, paragraphNumber - 1);
        }).join("");
        return `
          <div class="section-frame${activeClass} is-enabled" data-section-frame-kind="${section.sectionKind}">
            <div class="section-label-row"><span class="section-label">${section.sectionKind}</span></div>
            <section class="section${activeClass} is-enabled" data-wordex-kind="${KINDS.SECTION}" data-section-kind="${section.sectionKind}" data-section-id="${section.id}"${inlineStyle}>
              ${content}
            </section>
          </div>
        `;
      },

renderPageBreakCharacter() {
        // O form feed (U+000C) é invisível no HTML. U+240C mostra sua
        // representação no template; o documento continua armazenando \f.
        return '<div class="page-break-character" aria-hidden="true">&#x240C;</div>';
      },

renderParagraphInlineStyle(paragraph) {
        const styles = [];
        const marginStyle = renderMarginInlineStyle(paragraph.margin, KINDS.PARAGRAPH);
        if (marginStyle) styles.push(marginStyle);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", paragraph.padding);
        if (paddingStyle) styles.push(paddingStyle);
        const textStyle = renderTextStyleInlineStyle(paragraph.textStyle);
        if (textStyle) styles.push(textStyle);

        return styles.length ? ` style="${styles.join(";")}"` : "";
      },

renderParagraph(section, paragraph, index) {
        const activeClass = paragraph.id === this.activeParagraph ? " is-active" : "";
        const hasObjectClass = paragraph.subparagraphs.some(subparagraph => subparagraph.contentKind === CONTENT_KIND.OBJECT) ? " has-object" : "";
        const inlineStyle = this.renderParagraphInlineStyle(paragraph);
        return `
          <div class="paragraph${activeClass}${hasObjectClass}" data-wordex-kind="${KINDS.PARAGRAPH}" data-section-id="${section.id}" data-paragraph-id="${paragraph.id}" data-paragraph-label="Paragraph ${index + 1}"${inlineStyle}>
            ${paragraph.subparagraphs.map(subparagraph => this.renderSubparagraph(section, paragraph, subparagraph)).join("")}
          </div>
        `;
      },

renderSubparagraphInlineStyle(paragraph, subparagraph) {
        const styles = [];
        const height = Number(subparagraph.height);
        const y = Number(subparagraph.y);
        const textAlign = subparagraph.textAlign || "left";
        const share = paragraph?.subparagraphs?.length > 1
          ? this.subparagraphWidthShare?.(paragraph, subparagraph)
          : null;

        // A largura é uma fração do parágrafo. Assim os subparágrafos
        // continuam preenchendo a faixa inteira quando o parágrafo muda de tamanho.
        if (share != null) {
          styles.push(`flex:${share} 1 0px`);
          styles.push("width:auto");
          styles.push("max-width:none");
          styles.push("min-width:0");
        }

        if (Number.isFinite(height) && height > 0) {
          styles.push(`height:${Math.round(height)}px`);
        }

        if (Number.isFinite(y) && y !== 0) {
          styles.push(`transform:translateY(${Math.round(y)}px)`);
        }

        if (["left", "center", "right", "justify"].includes(textAlign)) {
          styles.push(`text-align:${textAlign}`);
        }

        const borderStyle = renderBorderInlineStyle(subparagraph.border);
        if (borderStyle) styles.push(borderStyle);
        const marginStyle = renderBoxEdgesInlineStyle("margin", subparagraph.margin);
        if (marginStyle) styles.push(marginStyle);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", subparagraph.padding);
        if (paddingStyle) styles.push(paddingStyle);
        const textStyle = renderTextStyleInlineStyle(subparagraph.textStyle);
        if (textStyle) styles.push(textStyle);

        return styles.length ? ` style="${styles.join(";")}"` : "";
      },

renderSubparagraph(section, paragraph, subparagraph) {
        const activeClass = subparagraph.id === this.activeSubparagraph ? " is-active" : "";
        const moveModeClass =
          this.objectEditMode &&
          this.activeEditTargetKind === EDIT_TARGET_KIND.SUBPARAGRAPH &&
          this.activeSubparagraph === subparagraph.id &&
          paragraph.subparagraphs.length > 1
            ? " is-move-mode"
            : "";
        const inlineStyle = this.renderSubparagraphInlineStyle(paragraph, subparagraph);
        const baseAttributes = `class="subparagraph${activeClass}${moveModeClass}" data-wordex-kind="${KINDS.SUBPARAGRAPH}" data-section-id="${section.id}" data-paragraph-id="${paragraph.id}" data-subparagraph-id="${subparagraph.id}" data-content-kind="${subparagraph.contentKind}"${inlineStyle}`;

        const isEditableSection = this.isSectionEnabled(section);

        if (subparagraph.contentKind === CONTENT_KIND.OBJECT && subparagraph.object) {
          return `<div ${baseAttributes} contenteditable="false">${this.renderObjectSubparagraph(section, subparagraph)}</div>`;
        }

        const isTextEditable = isEditableSection && subparagraph.contentKind !== CONTENT_KIND.OBJECT;
        const html = subparagraph.contentKind === CONTENT_KIND.TEXT
          ? (subparagraph.textHtml || (window.WordexRuns?.runsToHtml ? window.WordexRuns.runsToHtml(subparagraph.runs || []) : ""))
          : "";
        const renderedHtml = this.renderInlineListAnchors(
          this.renderInlineTextboxAnchors(html, subparagraph, isEditableSection),
          subparagraph
        );
        const renderedWithLines = this.renderInlineLineAnchors(renderedHtml, subparagraph);
        return `<div ${baseAttributes} data-text-subparagraph-id="${subparagraph.id}" contenteditable="${isTextEditable ? "true" : "false"}" tabindex="0">${renderedWithLines}</div>`;
      },

renderInlineTextboxAnchors(html, subparagraph, isEditableSection = true) {
        const container = document.createElement("div");
        container.innerHTML = String(html ?? "");
        const textboxes = Array.isArray(subparagraph.inlineTextboxes) ? subparagraph.inlineTextboxes : [];

        container.querySelectorAll("[data-inline-textbox-anchor]").forEach(anchor => {
          const textbox = textboxes.find(item => item.id === anchor.dataset.inlineTextboxAnchor);
          if (!textbox) {
            anchor.remove();
            return;
          }

          const holder = document.createElement("div");
          holder.innerHTML = this.renderInlineTextbox(textbox, isEditableSection);
          const element = holder.firstElementChild;
          if (element) anchor.replaceWith(element);
          else anchor.remove();
        });

        return container.innerHTML;
      },

renderInlineTextbox(textbox, isEditableSection = true) {
        const activeClass = textbox.id === this.activeTextbox ? " is-active" : "";
        const width = Math.max(0, Number(textbox.width) || 0);
        const height = Math.max(0, Number(textbox.height) || 0);
        const alignment = ["left", "center", "right"].includes(textbox.alignment)
          ? textbox.alignment
          : textbox.floatSide === "left" ? "left" : "right";
        const borderStyle = renderBorderInlineStyle(textbox.border);
        const marginStyle = renderBoxEdgesInlineStyle("margin", textbox.margin);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", textbox.padding);
        const inlineStyle = [`width:${width}px`, `height:${height}px`, borderStyle, marginStyle, paddingStyle].filter(Boolean).join(";");
        const contentStyle = this.renderTextboxContentStyleAttr(textbox);
        return `<span class="textbox textbox-inline${activeClass}" data-wordex-kind="${KINDS.TEXTBOX}" data-textbox-id="${textbox.id}" data-inline-textbox="true" data-alignment="${alignment}" contenteditable="false" style="${inlineStyle}"><span class="textbox-content" data-textbox-content="${textbox.id}" contenteditable="${isEditableSection ? "true" : "false"}"${contentStyle}>${textbox.html || ""}</span></span>`;
      },

renderInlineListAnchors(html, subparagraph) {
        const container = document.createElement("div");
        container.innerHTML = String(html ?? "");
        const lists = Array.isArray(subparagraph.inlineLists) ? subparagraph.inlineLists : [];

        container.querySelectorAll("[data-inline-list-anchor]").forEach(anchor => {
          const list = lists.find(item => item.id === anchor.dataset.inlineListAnchor);
          if (!list) {
            anchor.remove();
            return;
          }

          const holder = document.createElement("div");
          holder.innerHTML = this.renderInlineList(list, lists);
          const element = holder.firstElementChild;
          if (element) anchor.replaceWith(element);
          else anchor.remove();
        });

        return container.innerHTML;
      },

renderInlineLineAnchors(html, subparagraph) {
        const container = document.createElement("div");
        container.innerHTML = String(html ?? "");
        const lines = Array.isArray(subparagraph.inlineLines) ? subparagraph.inlineLines : [];
        container.querySelectorAll("[data-inline-line-anchor]").forEach(anchor => {
          const line = lines.find(item => item.id === anchor.dataset.inlineLineAnchor);
          if (!line) {
            anchor.remove();
            return;
          }
          const holder = document.createElement("div");
          holder.innerHTML = this.renderInlineLine(line);
          const element = holder.firstElementChild;
          if (element) anchor.replaceWith(element);
          else anchor.remove();
        });
        return container.innerHTML;
      },

renderInlineLine(line) {
        const activeClass = line.id === this.activeObject ? " is-active" : "";
        return `<span class="wordex-inline-line${activeClass}" data-wordex-kind="${KINDS.LINE}" data-inline-line-id="${escapeHtml(line.id)}" contenteditable="false">${escapeHtml(line.text || "______________________________")}</span>`;
      },

      renderListContent(list, inline = false, inlineLists = []) {
        const listType = list?.listType === "bullet" ? "bullet" : "ordered";
        const allowedStyles = listType === "bullet"
          ? ["disc", "circle", "square"]
          : ["decimal", "lower-alpha", "upper-alpha", "lower-roman", "upper-roman"];
        const markerStyle = allowedStyles.includes(list?.markerStyle) ? list.markerStyle : allowedStyles[0];
        const tag = listType === "bullet" ? "ul" : "ol";
        const itemIds = ensureListItemIds(list);
        const items = (Array.isArray(list?.items) ? list.items : [])
          .map((text, index) => ({ text, id: itemIds[index] }));
        if (list?.sortAlphabetically === true)
          items.sort((left, right) => String(left.text).localeCompare(String(right.text), "pt-BR", { sensitivity: "base" }));
        const itemHtml = items.map(item => {
          const children = inlineLists.filter(child =>
            child.parentListId === list.id && child.parentItemId === item.id
          );
          return `<li data-inline-list-item-id="${escapeHtml(item.id)}">${escapeHtml(item.text)}${children.map(child => this.renderInlineList(child, inlineLists, true)).join("")}</li>`;
        }).join("");
        return `<${tag} class="wordex-list-items" style="list-style-type:${markerStyle}">${itemHtml}</${tag}>`;
      },

renderInlineList(list, inlineLists = [], nested = false) {
        ensureListItemIds(list);
        const activeClass = list.id === this.activeObject ? " is-active" : "";
        const alignment = ["left", "center", "right"].includes(list.alignment)
          ? list.alignment
          : list.placement === "aligned"
            ? list.floatSide === "left" ? "left" : "right"
            : "left";
        const wrapText = !nested && list.wrapText === true ? "true" : "false";
        const justify = list.justify === true ? "true" : "false";
        const nestedClass = nested ? " wordex-sub-list" : "";
        const effectiveAlignment = nested ? "left" : alignment;
        const width = !nested && list.width !== null && list.width !== undefined && Number.isFinite(Number(list.width))
          ? `width:${Math.max(0, Number(list.width))}px;`
          : "";
        const height = !nested && list.height !== null && list.height !== undefined && Number.isFinite(Number(list.height))
          ? `height:${Math.max(0, Number(list.height))}px;overflow:hidden;`
          : "";
        const style = width || height ? ` style="${width}${height}"` : "";
        return `<span class="wordex-inline-list${nestedClass}${activeClass}" data-wordex-kind="${KINDS.LIST}" data-inline-list-id="${escapeHtml(list.id)}" data-alignment="${effectiveAlignment}" data-wrap-text="${wrapText}" data-justify="${justify}"${style} contenteditable="false">${this.renderListContent(list, true, inlineLists)}</span>`;
      },

renderObjectSubparagraph(section, subparagraph) {
        const isEditableSection = this.isSectionEnabled(section);
        const objectAlignment = ["left", "center", "right"].includes(subparagraph.object?.horizontalAlign)
          ? subparagraph.object.horizontalAlign
          : "left";
        return `
          <div class="object-area" data-object-align="${objectAlignment}">
            ${this.renderMainObject(subparagraph.object, isEditableSection)}
          </div>
          ${subparagraph.textboxes
            .filter(textbox => !textbox.tableCell)
            .map(textbox => this.renderTextbox(textbox, isEditableSection)).join("")}
        `;
      },

renderMainObject(object, isEditableSection = true) {
        if (!object) return "";

        const x = Number.isFinite(Number(object.x)) ? Number(object.x) : 0;
        const y = Number.isFinite(Number(object.y)) ? Number(object.y) : 0;
        const styleParts = [`transform: translate(${x}px, ${y}px)`];

        // O tamanho natural do objeto continua valendo enquanto width/height forem nulos.
        // width/height só passam a existir quando o usuário realmente redimensiona.
        const width = Number(object.width);
        const height = Number(object.height);
        if (Number.isFinite(width) && width >= 0) styleParts.push(`width:${Math.round(width)}px`);
        if (Number.isFinite(height) && height >= 0) styleParts.push(`height:${Math.round(height)}px`);
        if (object.kind === KINDS.CHART) {
          styleParts.push("display:flex", "box-sizing:border-box", "padding:8px", "border:1px solid #bfd4ef", "background:#fff", "overflow:hidden");
        }

        const style = `${styleParts.join(";")};`;
        const tableEditClass = object.kind === KINDS.TABLE && this.isTableInEditMode(object.id) ? " is-table-edit-mode" : "";
        const attrs = `class="main-object${tableEditClass}" data-main-object-id="${object.id}" data-object-kind="${object.kind}" style="${style}"`;

        if (object.kind === KINDS.TABLE) {
          const renderedTable = this.previewMode
            ? this.renderTable(this.createDataPreviewTableClone?.(object) || object, false)
            : this.renderTable(object, isEditableSection);
          return `
            <div ${attrs}>
              ${renderedTable}
            </div>
          `;
        }

        if (object.kind === KINDS.IMAGE) {
          return `
            <div ${attrs}>
              ${this.renderImageObject(object)}
            </div>
          `;
        }

        if (object.kind === KINDS.CHART) {
          return `<div ${attrs}>${this.renderChartObject(object)}</div>`;
        }

        if (object.kind === KINDS.LIST) {
          return `<div ${attrs}>${this.renderListContent(object)}</div>`;
        }

        return `<div ${attrs}>Objeto desconhecido</div>`;
      },

renderImageObject(object) {
        if (object?.src) {
          return `<img class="wordex-rendered-image" src="${escapeHtml(object.src)}" alt="${escapeHtml(object.fileName || object.label || "Imagem")}">`;
        }
        return `<div class="image-placeholder">Imagem / espaço visual</div>`;
      },

ensureTableSizeState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.rowHeights)) table.rowHeights = [];
        if (!Array.isArray(table.colWidths)) table.colWidths = [];
        this.ensureTableRowVisibilityState?.(table);
        this.ensureTableCellTextAlignState?.(table);
      },

ensureTableBorderState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.cellBorders)) table.cellBorders = [];
        for (let row = 0; row < table.rows; row += 1) {
          if (!Array.isArray(table.cellBorders[row])) table.cellBorders[row] = [];
          for (let col = 0; col < table.cols; col += 1) {
            if (!table.cellBorders[row][col]) table.cellBorders[row][col] = null;
          }
        }
      },

ensureTableSpacingState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        ["cellMargins", "cellPaddings"].forEach(key => {
          if (!Array.isArray(table[key])) table[key] = [];
          for (let row = 0; row < table.rows; row += 1) {
            if (!Array.isArray(table[key][row])) table[key][row] = [];
            for (let col = 0; col < table.cols; col += 1) {
              if (typeof table[key][row][col] === "undefined") table[key][row][col] = null;
            }
          }
        });
      },

ensureTableCellTextStyleState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.cellTextStyles)) table.cellTextStyles = [];
        for (let row = 0; row < table.rows; row += 1) {
          if (!Array.isArray(table.cellTextStyles[row])) table.cellTextStyles[row] = [];
          for (let col = 0; col < table.cols; col += 1) {
            if (typeof table.cellTextStyles[row][col] === "undefined") table.cellTextStyles[row][col] = null;
          }
        }
      },

ensureTableCellObjectState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.cellObjects)) table.cellObjects = [];
        for (let row = 0; row < table.rows; row += 1) {
          if (!Array.isArray(table.cellObjects[row])) table.cellObjects[row] = [];
          for (let col = 0; col < table.cols; col += 1) {
            if (typeof table.cellObjects[row][col] === "undefined") table.cellObjects[row][col] = null;
          }
        }
      },


ensureTableCellTextAlignState(table) {
        if (!table || table.kind !== KINDS.TABLE) return;
        if (!Array.isArray(table.cellTextAlign)) table.cellTextAlign = [];
        for (let row = 0; row < table.rows; row += 1) {
          if (!Array.isArray(table.cellTextAlign[row])) table.cellTextAlign[row] = [];
          for (let col = 0; col < table.cols; col += 1) {
            if (!SUBPARAGRAPH_TEXT_ALIGNMENTS.includes(table.cellTextAlign[row][col])) {
              table.cellTextAlign[row][col] = "left";
            }
          }
        }
      },

renderTableCellInlineStyle(table, row, col) {
        const styles = [];
        const borderStyle = renderBorderInlineStyle(table?.cellBorders?.[row]?.[col]);
        if (borderStyle) styles.push(borderStyle);
        const marginStyle = renderBoxEdgesInlineStyle("margin", table?.cellMargins?.[row]?.[col]);
        if (marginStyle) styles.push(marginStyle);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", table?.cellPaddings?.[row]?.[col]);
        if (paddingStyle) styles.push(paddingStyle);
        const textStyle = renderTextStyleInlineStyle(table?.cellTextStyles?.[row]?.[col]);
        if (textStyle) styles.push(textStyle);
        const textAlign = table?.cellTextAlign?.[row]?.[col];
        if (SUBPARAGRAPH_TEXT_ALIGNMENTS.includes(textAlign)) styles.push(`text-align:${textAlign}`);
        return styles.length ? ` style="${styles.join(";")}"` : "";
      },

isTableCellCoveredByColspan(table, row, col) {
        const colspans = table?.cellColspans?.[row];
        if (!Array.isArray(colspans)) return false;
        for (let startCol = 0; startCol < col; startCol += 1) {
          const span = Math.max(1, Number(colspans[startCol]) || 1);
          if (span > 1 && col < startCol + span) return true;
        }
        return false;
      },

getTableCellColspan(table, row, col) {
        const span = Math.max(1, Number(table?.cellColspans?.[row]?.[col]) || 1);
        return span > 1 ? Math.min(span, Math.max(1, table.cols - col)) : 1;
      },

renderTable(table, isEditableSection = true) {
        this.ensureTableSizeState(table);
        this.ensureTableBorderState(table);
        this.ensureTableSpacingState(table);
        this.ensureTableCellTextStyleState(table);
        this.ensureTableCellObjectState(table);
        const tableEditMode = this.isTableInEditMode(table.id);
        const isCellEditable = isEditableSection && !tableEditMode;
        const tableClass = `wordex-table${tableEditMode ? " is-table-edit-mode" : ""}`;
        const tableOwner = this.findObjectOwnerById?.(table.id);
        const tableTextboxes = tableOwner?.subparagraph?.textboxes || [];

        const columns = [];
        for (let col = 0; col < table.cols; col += 1) {
          const width = Number(table.colWidths[col]);
          const style = Number.isFinite(width) && width >= 0
            ? ` style="width:${Math.round(width)}px"`
            : "";
          columns.push(`<col data-table-col="${table.id}" data-col="${col}"${style}>`);
        }

        const rows = [];
        for (let row = 0; row < table.rows; row += 1) {
          const cells = [];
          const height = Number(table.rowHeights[row]);
          const rowStyle = Number.isFinite(height) && height >= 0
            ? ` style="height:${Math.round(height)}px"`
            : "";

          for (let col = 0; col < table.cols; col += 1) {
            if (this.isTableCellCoveredByColspan?.(table, row, col)) continue;
            const value = table.cells[row]?.[col] ?? "";
            const cellObject = table.cellObjects?.[row]?.[col] || null;
            const objectAlignment = table.cellTextAlign?.[row]?.[col];
            const objectAlignAttribute = objectAlignment === "center" || objectAlignment === "right"
              ? objectAlignment
              : "left";
            const objectJustify = objectAlignment === "center"
              ? "center"
              : objectAlignment === "right"
                ? "flex-end"
                : "flex-start";
            const cellHtml = cellObject
              ? `<div class="table-cell-object-area" data-object-align="${objectAlignAttribute}" contenteditable="false" style="justify-content:${objectJustify}">${this.renderMainObject(cellObject, isEditableSection)}</div>`
              : value;
            const cellTextboxes = tableTextboxes.filter(textbox =>
              textbox.tableCell?.tableId === table.id &&
              Number(textbox.tableCell.rowIndex) === row &&
              Number(textbox.tableCell.colIndex) === col);
            const cellContent = cellTextboxes.length
              ? `<div class="table-cell-textbox-area" data-table-cell-textbox-area="${table.id}" data-row="${row}" data-col="${col}" style="min-height:${Math.max(0, ...cellTextboxes.map(textbox => (Number(textbox.y) || 0) + (Number(textbox.height) || 0)))}px">${cellHtml}${cellTextboxes.map(textbox => this.renderTextbox(textbox, isEditableSection)).join("")}</div>`
              : cellHtml;
            const cellEditable = isCellEditable && !cellObject;
            const colspan = this.getTableCellColspan?.(table, row, col) || 1;
            const colspanAttr = colspan > 1 ? ` colspan="${colspan}" data-colspan="${colspan}"` : "";
            const range = this.activeTableCellRangeSelection;
            const isRangeSelected = Boolean(range && range.tableId === table.id && range.rowIndex === row && col >= range.startCol && col <= range.endCol);
            const selectedClass = isRangeSelected ? ' class="wordex-range-selected"' : "";
            const cellInlineStyle = this.renderTableCellInlineStyle(table, row, col);
            cells.push(`<td${selectedClass} contenteditable="${cellEditable ? "true" : "false"}" data-table-cell="${table.id}" data-row="${row}" data-col="${col}"${colspanAttr}${cellInlineStyle}>${cellContent}</td>`);
          }

          const rowContext = table.rowContexts?.[row] || null;
          const effectiveRowContextPath = this.getEffectiveTableRowFieldContextPath?.(table, row) || rowContext?.fieldContextPath || rowContext?.contextPath || rowContext?.footerPath || "";
          const pageBreakAttr = rowContext?.kind === "groupHeader" && rowContext.pageBreak
            ? ` data-page-break-before="true"`
            : "";
          const rowContextAttrs = rowContext
            ? ` data-row-kind="${escapeHtml(rowContext.kind || "")}" data-row-context-path="${escapeHtml(effectiveRowContextPath)}"${pageBreakAttr}`
            : "";
          const rowVisible = table.rowReportVisibility?.[row] !== false && table.rowVisibility?.[row] !== false;
          const rowClass = rowVisible ? "" : ' class="wordex-table-row-hidden"';
          const rowVisibilityAttr = ` data-row-visible="${rowVisible ? "true" : "false"}"`;
          rows.push(`<tr data-table-row="${table.id}" data-row="${row}"${rowClass}${rowVisibilityAttr}${rowContextAttrs}${rowStyle}>${cells.join("")}</tr>`);
        }

        return `<table class="${tableClass}" data-table-id="${table.id}"><colgroup>${columns.join("")}</colgroup><tbody>${rows.join("")}</tbody></table>`;
      },

renderTextbox(textbox, isEditableSection = true) {
        const activeClass = textbox.id === this.activeTextbox ? " is-active" : "";
        const borderStyle = renderBorderInlineStyle(textbox.border);
        const marginStyle = renderBoxEdgesInlineStyle("margin", textbox.margin);
        const paddingStyle = renderBoxEdgesInlineStyle("padding", textbox.padding);
        const boxStyle = [borderStyle, marginStyle, paddingStyle].filter(Boolean).join(";");
        const contentStyle = this.renderTextboxContentStyleAttr(textbox);
        return `
          <div class="textbox${activeClass}" data-wordex-kind="${KINDS.TEXTBOX}" data-textbox-id="${textbox.id}" style="left:${textbox.x}px; top:${textbox.y}px; width:${textbox.width}px; height:${textbox.height}px;${boxStyle ? ` ${boxStyle};` : ""}">
            <div class="textbox-content" data-textbox-content="${textbox.id}" contenteditable="${isEditableSection ? "true" : "false"}"${contentStyle}>${textbox.html}</div>
          </div>
        `;
      },

renderTextboxContentStyleAttr(textbox) {
        const styles = [];
        if (SUBPARAGRAPH_TEXT_ALIGNMENTS.includes(textbox?.textAlign)) styles.push(`text-align:${textbox.textAlign}`);
        const textStyle = renderTextStyleInlineStyle(textbox?.textStyle);
        if (textStyle) styles.push(textStyle);
        return styles.length ? ` style="${styles.join(";")}"` : "";
      },

refreshActiveClasses() {
        document.querySelectorAll(".section-frame[data-section-frame-kind]").forEach(element => {
          const section = this.document.sections.find(item => item.sectionKind === element.dataset.sectionFrameKind);
          element.classList.toggle("is-active", Boolean(section && section.id === this.activeSection));
        });

        document.querySelectorAll(".section[data-section-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.sectionId === this.activeSection);
        });

        document.querySelectorAll(".paragraph[data-paragraph-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.paragraphId === this.activeParagraph);
        });

        document.querySelectorAll(".subparagraph[data-subparagraph-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.subparagraphId === this.activeSubparagraph);
        });

        document.querySelectorAll(".main-object[data-main-object-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.mainObjectId === this.activeObject);
        });

        document.querySelectorAll(".wordex-inline-list[data-inline-list-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.inlineListId === this.activeObject);
        });

        document.querySelectorAll(".wordex-inline-line[data-inline-line-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.inlineLineId === this.activeObject);
        });

        document.querySelectorAll(".textbox[data-textbox-id]").forEach(element => {
          element.classList.toggle("is-active", element.dataset.textboxId === this.activeTextbox);
        });

        const range = this.activeTableCellRangeSelection;
        document.querySelectorAll("[data-table-cell]").forEach(element => {
          const row = Number(element.dataset.row) || 0;
          const col = Number(element.dataset.col) || 0;
          const selected = Boolean(range &&
            range.tableId === element.dataset.tableCell &&
            row === range.rowIndex &&
            col >= range.startCol &&
            col <= range.endCol);
          element.classList.toggle("wordex-range-selected", selected);
        });
      },

renderStatePanel(message, isError) {
        const section = this.findSectionById(this.activeSection);
        const paragraph = this.findParagraphById(this.activeParagraph);
        const subparagraph = this.findSubparagraphById(this.activeSubparagraph);

        document.getElementById("activeSectionLabel").textContent = section ? `${section.sectionKind} (${section.id})` : "-";
        document.getElementById("activeParagraphLabel").textContent = paragraph ? paragraph.id : "-";
        document.getElementById("activeSubparagraphLabel").textContent = subparagraph ? subparagraph.id : "-";
        document.getElementById("activeContentKindLabel").textContent = subparagraph ? subparagraph.contentKind : "-";

        const messageElement = document.getElementById("message");
        messageElement.textContent = message || "Seleção controlada por activeSection, activeParagraph e activeSubparagraph.";
        messageElement.className = isError ? "error" : "muted";
      },
});
