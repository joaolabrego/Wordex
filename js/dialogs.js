"use strict";

Object.assign(wordex, {
ensureObjectDialog() {
        if (this.objectDialogBackdrop) return this.objectDialogBackdrop;

        const backdrop = document.createElement("div");
        backdrop.className = "wordex-object-modal-backdrop";
        backdrop.innerHTML = `
          <div class="wordex-object-dialog" role="dialog" aria-modal="true">
            <h2 data-object-dialog-title>Objeto</h2>
            <div data-object-dialog-body></div>
            <div class="wordex-object-dialog-actions">
              <button type="button" data-object-dialog-cancel>Cancelar</button>
              <button type="button" class="wordex-primary-button" data-object-dialog-confirm>Confirmar</button>
            </div>
          </div>
        `;

        backdrop.addEventListener("pointerdown", event => event.stopPropagation());
        backdrop.addEventListener("click", event => event.stopPropagation());
        backdrop.querySelector("[data-object-dialog-cancel]").addEventListener("click", () => this.hideObjectDialog());
        backdrop.querySelector("[data-object-dialog-confirm]").addEventListener("click", () => this.confirmObjectDialog());
        document.body.appendChild(backdrop);
        this.objectDialogBackdrop = backdrop;
        return backdrop;
      },

showObjectDialog(objectKind, targetObject = null) {
        const dialog = this.ensureObjectDialog();
        this.pendingObjectKind = objectKind;
        this.pendingChartTarget = objectKind === KINDS.CHART ? targetObject : null;
        this.pendingTableTarget = objectKind === KINDS.TABLE ? targetObject : null;
        this.pendingListTarget = objectKind === KINDS.LIST ? targetObject : null;
        const listOwner = objectKind === KINDS.LIST && targetObject
          ? this.findObjectOwnerById?.(targetObject.id)
          : null;
        const activeListOwner = objectKind === KINDS.LIST && !targetObject && this.activeObject
          ? this.findObjectOwnerById?.(this.activeObject)
          : null;
        this.pendingListSubparagraphId = objectKind === KINDS.LIST
          ? listOwner?.subparagraph?.id
            || (activeListOwner?.inline && activeListOwner.object?.kind === KINDS.LIST ? activeListOwner.subparagraph.id : null)
            || this.pendingTextInsertionCaret?.subparagraphId
            || this.activeSubparagraph
          : null;
        const listSubparagraph = objectKind === KINDS.LIST
          ? listOwner?.subparagraph
            || (activeListOwner?.inline && activeListOwner.object?.kind === KINDS.LIST ? activeListOwner.subparagraph : null)
            || this.findSubparagraphById?.(this.pendingListSubparagraphId)
          : null;
        const listItems = Array.isArray(listSubparagraph?.inlineLists) ? listSubparagraph.inlineLists : [];
        let rootTarget = targetObject || (activeListOwner?.inline ? activeListOwner.object : null);
        while (rootTarget?.parentListId) {
          rootTarget = listItems.find(item => item.id === rootTarget.parentListId) || rootTarget;
          if (rootTarget.parentListId && !listItems.some(item => item.id === rootTarget.parentListId)) break;
        }
        if (!rootTarget)
          rootTarget = listItems.find(item => !item.parentListId) || null;
        this.pendingListRootTarget = objectKind === KINDS.LIST ? rootTarget : null;
        const initialListTarget = objectKind === KINDS.LIST ? (targetObject || rootTarget) : null;
        if (objectKind === KINDS.LIST) this.pendingListTarget = initialListTarget;
        dialog.querySelector(".wordex-object-dialog")?.classList.toggle("is-chart-dialog", objectKind === KINDS.CHART);
        this.pendingImageDataUrl = "";
        this.pendingImageFileName = "";
        this.pendingImageFields = [];
        this.pendingWatermarkRemove = false;

        const title = dialog.querySelector("[data-object-dialog-title]");
        const body = dialog.querySelector("[data-object-dialog-body]");
        const confirmButton = dialog.querySelector("[data-object-dialog-confirm]");
        title.textContent = objectKind === KINDS.TABLE ? (targetObject ? "Editar tabela" : "Inserir tabela") : objectKind === KINDS.LIST ? (initialListTarget ? (initialListTarget.parentListId ? "Editar sublista" : "Editar lista") : "Inserir lista") : objectKind === KINDS.IMAGE ? "Dados da imagem" : objectKind === KINDS.CHART ? (targetObject ? "Editar gráfico" : "Inserir gráfico") : "Marca d'água";
        if (confirmButton) {
          confirmButton.textContent = objectKind === KINDS.TABLE || objectKind === KINDS.CHART || objectKind === KINDS.LIST ? (initialListTarget || targetObject ? "Atualizar" : "Inserir") : "Confirmar";
        }

        if (objectKind === KINDS.TABLE) {
          body.innerHTML = this.renderTableInsertDialogBody();
          this.bindTableInsertDialog(body);
          if (targetObject) this.applyTableInsertDialogState(body, targetObject);
        } else if (objectKind === KINDS.LIST) {
          body.innerHTML = this.renderListDialogBody(initialListTarget, { subparagraph: listSubparagraph });
          this.bindListDialog(body, initialListTarget, listSubparagraph);
        } else if (objectKind === KINDS.CHART) {
          const draft = targetObject
            ? createChartObject(targetObject)
            : this.createDefaultChartDraft();
          body.innerHTML = this.renderChartDialogBody(draft);
          this.bindChartDialog(body, targetObject || {});
        } else if (objectKind === KINDS.IMAGE) {
          const imageFields = this.getCurrentImageFieldOptions?.() || [];
          const imageOptionsHtml = imageFields
            .map((item, index) => `<option value="${escapeHtml(item.path)}" data-image-index="${index}">${escapeHtml(item.label)}</option>`)
            .join("");
          body.innerHTML = `
            <div class="wordex-object-form-grid">
              <label class="wordex-object-form-row">
                <span><input type="radio" name="wordexImageSource" value="file" data-image-source-file ${imageFields.length ? "" : "checked"}> Arquivo em disco</span>
                <input type="file" accept="image/*" data-object-image-file>
              </label>
              <label class="wordex-object-form-row" ${imageFields.length ? "" : "hidden"}>
                <span><input type="radio" name="wordexImageSource" value="json" data-image-source-json ${imageFields.length ? "checked" : ""}> Propriedade image do JSON</span>
                <select data-object-image-json-field>${imageOptionsHtml}</select>
              </label>
            </div>
            <img class="wordex-object-image-preview" data-object-image-preview alt="Prévia da imagem">
          `;
          const fileInput = body.querySelector("[data-object-image-file]");
          const preview = body.querySelector("[data-object-image-preview]");
          const jsonRadio = body.querySelector("[data-image-source-json]");
          const fileRadio = body.querySelector("[data-image-source-file]");
          const fieldSelect = body.querySelector("[data-object-image-json-field]");
          this.pendingImageFields = imageFields;
          const previewJsonImage = () => {
            const selected = imageFields.find(item => item.path === fieldSelect?.value) || imageFields[0];
            if (!selected) return;
            this.pendingImageDataUrl = selected.src || "";
            this.pendingImageFileName = selected.label || selected.macro || "imagem-json";
            if (preview && this.pendingImageDataUrl) {
              preview.src = this.pendingImageDataUrl;
              preview.style.display = "block";
            }
          };
          fileInput.addEventListener("change", () => {
            fileRadio.checked = true;
            this.onObjectImageFileChange(fileInput, preview);
          });
          jsonRadio?.addEventListener("change", previewJsonImage);
          fieldSelect?.addEventListener("change", () => {
            if (jsonRadio) jsonRadio.checked = true;
            previewJsonImage();
          });
          if (imageFields.length) previewJsonImage();
        } else if (objectKind === KINDS.WATERMARK) {
          const watermark = this.document.watermark || {};
          this.pendingImageDataUrl = watermark.src || "";
          this.pendingImageFileName = watermark.fileName || "";
          const opacity = Number.isFinite(Number(watermark.opacity)) ? Math.round(Number(watermark.opacity) * 100) : 12;
          const size = Number.isFinite(Number(watermark.sizePercent)) ? Math.round(Number(watermark.sizePercent)) : 80;
          body.innerHTML = `
            <div class="wordex-watermark-preview-box">
              <img data-watermark-preview alt="Prévia da marca d'água">
            </div>
            <div class="wordex-object-button-row">
              <button type="button" data-watermark-choose>Escolher imagem...</button>
              <button type="button" data-watermark-remove>Remover imagem</button>
              <input type="file" accept="image/*" data-watermark-file hidden>
            </div>
            <div class="wordex-object-form-grid">
              <label class="wordex-object-form-row">Opacidade (%)
                <div style="display:grid; grid-template-columns:1fr 72px; gap:8px; align-items:center;">
                  <input type="range" min="0" max="100" step="1" value="${opacity}" data-watermark-opacity>
                  <input type="number" min="0" max="100" step="1" value="${opacity}" data-watermark-opacity-number>
                </div>
              </label>
              <label class="wordex-object-form-row">Tamanho (% da página)
                <input type="number" min="1" max="200" step="1" value="${size}" data-watermark-size>
              </label>
            </div>
            <label class="wordex-object-form-row">Arquivo
              <input type="text" value="${escapeHtml(this.pendingImageFileName)}" data-watermark-file-name readonly>
            </label>
          `;
          const fileInput = body.querySelector("[data-watermark-file]");
          const preview = body.querySelector("[data-watermark-preview]");
          const fileNameInput = body.querySelector("[data-watermark-file-name]");
          const opacityRange = body.querySelector("[data-watermark-opacity]");
          const opacityNumber = body.querySelector("[data-watermark-opacity-number]");
          const applyWatermarkPreviewOpacity = value => {
            const normalized = Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
            if (opacityRange) opacityRange.value = String(normalized);
            if (opacityNumber) opacityNumber.value = String(normalized);
            if (preview) preview.style.opacity = String(normalized / 100);
          };
          if (this.pendingImageDataUrl) {
            preview.src = this.pendingImageDataUrl;
            preview.style.display = "block";
          }
          applyWatermarkPreviewOpacity(opacity);
          opacityRange?.addEventListener("input", event => applyWatermarkPreviewOpacity(event.currentTarget.value));
          opacityNumber?.addEventListener("input", event => applyWatermarkPreviewOpacity(event.currentTarget.value));
          opacityNumber?.addEventListener("change", event => applyWatermarkPreviewOpacity(event.currentTarget.value));
          body.querySelector("[data-watermark-choose]").addEventListener("click", () => fileInput.click());
          body.querySelector("[data-watermark-remove]").addEventListener("click", () => {
            this.pendingImageDataUrl = "";
            this.pendingImageFileName = "";
            this.pendingWatermarkRemove = true;
            preview.removeAttribute("src");
            preview.style.display = "none";
            fileNameInput.value = "";
          });
          fileInput.addEventListener("change", () => this.onObjectImageFileChange(fileInput, preview, fileNameInput));
        }

        dialog.classList.add("is-visible");
        const firstInput = dialog.querySelector("input, select");
        window.requestAnimationFrame(() => firstInput?.focus());
      },

hideObjectDialog() {
        if (this.objectDialogBackdrop) this.objectDialogBackdrop.classList.remove("is-visible");
        this.objectDialogBackdrop?.querySelector(".wordex-object-dialog")?.classList.remove("is-chart-dialog");
        this.pendingObjectKind = null;
        this.pendingChartTarget = null;
        this.pendingTableTarget = null;
        this.pendingListTarget = null;
        this.pendingListRootTarget = null;
        this.pendingListSubparagraphId = null;
        this.pendingImageDataUrl = "";
        this.pendingImageFileName = "";
        this.pendingImageFields = [];
        this.pendingWatermarkRemove = false;
      },

renderListDialogBody(listTarget = null, options = {}) {
        const listType = listTarget?.listType === "bullet" ? "bullet" : "ordered";
        const markerOptions = listType === "bullet"
          ? [["disc", "Disco"], ["circle", "Círculo"], ["square", "Quadrado"]]
          : [["decimal", "1, 2, 3"], ["lower-alpha", "a, b, c"], ["upper-alpha", "A, B, C"], ["lower-roman", "i, ii, iii"], ["upper-roman", "I, II, III"]];
        const markerStyle = listTarget?.markerStyle === "outline"
          ? "decimal"
          : (listTarget?.markerStyle || markerOptions[0][0]);
        const values = Array.isArray(listTarget?.items) ? listTarget.items.join("\n") : "";
        const subparagraph = options.subparagraph || null;
        const parentOptions = this.getListParentOptions(subparagraph, listTarget);
        const parentItemId = listTarget?.parentItemId || "";
        const hierarchicalChecked = !parentItemId && listType === "ordered"
          && (listTarget?.hierarchicalNumbering === true || listTarget?.markerStyle === "outline");

        return `
          <div class="wordex-object-form-grid">
            <label class="wordex-object-form-row">Subordinar a
              <select data-list-parent-item>${parentOptions.map(option => `<option value="${escapeHtml(option.value)}" title="${escapeHtml(option.title || option.label)}" ${option.value === parentItemId ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>
            </label>
            <label class="wordex-object-form-row">Tipo de lista
              <select data-list-type>
                <option value="ordered" ${listType === "ordered" ? "selected" : ""}>Numerada</option>
                <option value="bullet" ${listType === "bullet" ? "selected" : ""}>Com marcadores</option>
              </select>
            </label>
            <label class="wordex-object-form-row">Marcador
              <select data-list-marker-style>
                ${markerOptions.map(([value, label]) => `<option value="${value}" ${value === markerStyle ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label class="wordex-list-option" data-list-wrap-option ${parentItemId ? "hidden" : ""}>
              <input type="checkbox" data-list-wrap-text${!parentItemId && listTarget?.wrapText === true ? " checked" : ""}>
              Texto envolvendo a lista
            </label>
            <label class="wordex-list-option" data-list-hierarchical-option ${parentItemId || listType !== "ordered" ? "hidden" : ""}>
              <input type="checkbox" data-list-hierarchical-numbering${hierarchicalChecked ? " checked" : ""}>
              Numeração hierárquica
            </label>
            <label class="wordex-list-option">
              <input type="checkbox" data-list-sort-alphabetically${listTarget?.sortAlphabetically === true ? " checked" : ""}>
              Ordenar valores alfabeticamente
            </label>
            <label class="wordex-list-option">
              <input type="checkbox" data-list-justify${listTarget?.justify === true ? " checked" : ""}>
              Justificado
            </label>
            <label class="wordex-object-form-row">Valores — um por linha
              <textarea data-list-values rows="8" placeholder="Primeiro item&#10;Segundo item">${escapeHtml(values)}</textarea>
            </label>
            <div class="wordex-table-fields-error" data-list-values-error hidden>Informe pelo menos um valor para a lista.</div>
            <div class="wordex-table-fields-error" data-list-insertion-error hidden>Posicione o caret em um parágrafo de texto para inserir a lista principal.</div>
          </div>
        `;
      },

getListParentOptions(subparagraph, listTarget = null) {
        const lists = Array.isArray(subparagraph?.inlineLists) ? subparagraph.inlineLists : [];
        const options = [{ value: "", label: "(Lista principal)" }];
        const appendItems = (list, depth, ancestry = new Set()) => {
          if (!list || ancestry.has(list.id)) return;
          const nextAncestry = new Set(ancestry);
          nextAncestry.add(list.id);
          const itemIds = ensureListItemIds(list);
          const order = list.items.map((item, index) => index);
          if (list.sortAlphabetically === true)
            order.sort((left, right) => list.items[left].localeCompare(list.items[right], "pt-BR", { sensitivity: "base" }));

          order.forEach((index, ordinal) => {
            const itemId = itemIds[index];
            const marker = list.listType === "bullet" ? "•" : `${ordinal + 1}.`;
            const itemText = String(list.items[index] ?? "");
            const itemCharacters = Array.from(itemText);
            const visibleItemText = itemCharacters.length > 30
              ? `${itemCharacters.slice(0, 27).join("")}...`
              : itemText;
            options.push({
              value: itemId,
              label: `${"　".repeat(depth)}${marker} ${visibleItemText}`,
              title: itemText
            });
            lists.filter(child => child.parentListId === list.id && child.parentItemId === itemId)
              .forEach(child => appendItems(child, depth + 1, nextAncestry));
          });
        };

        lists.filter(list => !list.parentListId).forEach(root => appendItems(root, 0));
        return options;
      },

reconcileListItemIds(list, newItems) {
        const oldIds = ensureListItemIds(list).slice();
        const oldItems = list.items.slice();
        const nextIds = Array(newItems.length).fill(null);
        const used = new Set();

        // Preserve identity for unchanged labels, including when rows move.
        newItems.forEach((value, index) => {
          let match = -1;
          let distance = Number.POSITIVE_INFINITY;
          oldItems.forEach((oldValue, oldIndex) => {
            if (!used.has(oldIndex) && oldValue === value && Math.abs(oldIndex - index) < distance) {
              match = oldIndex;
              distance = Math.abs(oldIndex - index);
            }
          });
          if (match >= 0) {
            nextIds[index] = oldIds[match];
            used.add(match);
          }
        });

        // A changed label in the same row remains the same logical item.
        nextIds.forEach((value, index) => {
          if (value) return;
          const match = oldIds[index] && !used.has(index) ? index : -1;
          if (match >= 0) {
            nextIds[index] = oldIds[match];
            used.add(match);
          } else {
            nextIds[index] = nextId("li");
          }
        });
        return nextIds;
      },

removeOrphanedSublists(subparagraph, parentListId, retainedItemIds) {
        const lists = Array.isArray(subparagraph?.inlineLists) ? subparagraph.inlineLists : [];
        const removedIds = new Set();
        let changed = true;
        while (changed) {
          changed = false;
          for (const list of lists) {
            if (removedIds.has(list.id)) continue;
            const parentRemoved = removedIds.has(list.parentListId);
            const removedParentItem = list.parentListId === parentListId && !retainedItemIds.has(list.parentItemId);
            if (parentRemoved || removedParentItem) {
              removedIds.add(list.id);
              changed = true;
            }
          }
        }
        subparagraph.inlineLists = lists.filter(list => !removedIds.has(list.id));
      },

bindListDialog(body, listTarget = null, subparagraph = null) {
        const typeSelect = body.querySelector("[data-list-type]");
        const markerSelect = body.querySelector("[data-list-marker-style]");
        const parentSelect = body.querySelector("[data-list-parent-item]");
        const wrapOption = body.querySelector("[data-list-wrap-option]");
        const wrapCheckbox = body.querySelector("[data-list-wrap-text]");
        const sortCheckbox = body.querySelector("[data-list-sort-alphabetically]");
        const valuesInput = body.querySelector("[data-list-values]");
        const insertionError = body.querySelector("[data-list-insertion-error]");
        const dialogTitle = this.objectDialogBackdrop?.querySelector("[data-object-dialog-title]");
        const confirmButton = this.objectDialogBackdrop?.querySelector("[data-object-dialog-confirm]");
        const lists = Array.isArray(subparagraph?.inlineLists) ? subparagraph.inlineLists : [];

        const hierarchicalOption = body.querySelector("[data-list-hierarchical-option]");
        const hierarchicalCheckbox = body.querySelector("[data-list-hierarchical-numbering]");
        const justifyCheckbox = body.querySelector("[data-list-justify]");
        const syncHierarchicalVisibility = () => {
          const hide = Boolean(parentSelect?.value) || typeSelect?.value !== "ordered";
          if (hierarchicalOption) hierarchicalOption.hidden = hide;
          if (hide && hierarchicalCheckbox) hierarchicalCheckbox.checked = false;
        };
        const refreshMarkers = preferred => {
          const options = typeSelect?.value === "bullet"
            ? [["disc", "Disco"], ["circle", "Círculo"], ["square", "Quadrado"]]
            : [["decimal", "1, 2, 3"], ["lower-alpha", "a, b, c"], ["upper-alpha", "A, B, C"], ["lower-roman", "i, ii, iii"], ["upper-roman", "I, II, III"]];
          const current = preferred === "outline" ? "decimal" : (preferred || markerSelect?.value || options[0][0]);
          if (markerSelect) {
            markerSelect.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
            markerSelect.value = options.some(([value]) => value === current) ? current : options[0][0];
          }
          syncHierarchicalVisibility();
        };
        const readConfiguration = () => ({
          listType: typeSelect?.value || "ordered",
          markerStyle: markerSelect?.value || "decimal",
          wrapText: wrapCheckbox?.checked === true,
          hierarchicalNumbering: hierarchicalCheckbox?.checked === true,
          sortAlphabetically: sortCheckbox?.checked === true,
          justify: justifyCheckbox?.checked === true,
          values: valuesInput?.value || ""
        });
        const drafts = new Map();
        let currentParentItemId = parentSelect?.value || "";
        drafts.set(currentParentItemId, readConfiguration());

        const findListForParentItem = parentItemId => {
          if (!parentItemId) return this.pendingListRootTarget || null;
          const parentList = lists.find(item => ensureListItemIds(item).includes(parentItemId));
          return parentList
            ? lists.find(item => item.parentListId === parentList.id && item.parentItemId === parentItemId) || null
            : null;
        };
        const configurationForList = target => target ? ({
          listType: target.listType,
          markerStyle: target.markerStyle === "outline" ? "decimal" : target.markerStyle,
          wrapText: target.wrapText,
          hierarchicalNumbering: target.hierarchicalNumbering === true || target.markerStyle === "outline",
          sortAlphabetically: target.sortAlphabetically,
          justify: target.justify === true,
          values: Array.isArray(target.items) ? target.items.join("\n") : ""
        }) : ({
          listType: "ordered",
          markerStyle: "decimal",
          wrapText: false,
          hierarchicalNumbering: false,
          sortAlphabetically: false,
          justify: false,
          values: ""
        });
        const loadSelection = parentItemId => {
          const target = findListForParentItem(parentItemId);
          const configuration = drafts.get(parentItemId) || configurationForList(target);
          if (typeSelect) typeSelect.value = configuration.listType === "bullet" ? "bullet" : "ordered";
          refreshMarkers(configuration.markerStyle);
          if (wrapCheckbox) wrapCheckbox.checked = !parentItemId && configuration.wrapText === true;
          if (wrapOption) wrapOption.hidden = Boolean(parentItemId);
          if (hierarchicalCheckbox)
            hierarchicalCheckbox.checked = !parentItemId && configuration.listType !== "bullet" && configuration.hierarchicalNumbering === true;
          syncHierarchicalVisibility();
          if (sortCheckbox) sortCheckbox.checked = configuration.sortAlphabetically === true;
          if (justifyCheckbox) justifyCheckbox.checked = configuration.justify === true;
          if (valuesInput) valuesInput.value = configuration.values || "";
          this.pendingListTarget = target;
          if (dialogTitle) dialogTitle.textContent = target
            ? (target.parentListId ? "Editar sublista" : "Editar lista")
            : (parentItemId ? "Inserir sublista" : "Inserir lista");
          if (confirmButton) confirmButton.textContent = target ? "Atualizar" : "Inserir";
          if (insertionError) insertionError.hidden = true;
        };

        typeSelect?.addEventListener("change", () => refreshMarkers());
        parentSelect?.addEventListener("change", () => {
          drafts.set(currentParentItemId, readConfiguration());
          currentParentItemId = parentSelect.value || "";
          loadSelection(currentParentItemId);
        });
        this.pendingListTarget = listTarget;
        refreshMarkers(listTarget?.markerStyle);
        if (wrapOption) wrapOption.hidden = Boolean(currentParentItemId);
        syncHierarchicalVisibility();
        if (insertionError) insertionError.hidden = true;
      },

setListRootAnchor(subparagraph, listId, isRoot) {
        if (!subparagraph) return;
        const holder = document.createElement("div");
        holder.innerHTML = String(subparagraph.textHtml || "");
        const existing = holder.querySelector(`[data-inline-list-anchor="${CSS.escape(listId)}"]`);
        if (isRoot && !existing) {
          const anchor = document.createElement("span");
          anchor.className = "list-anchor";
          anchor.dataset.inlineListAnchor = listId;
          anchor.contentEditable = "false";
          holder.appendChild(anchor);
        } else if (!isRoot) {
          existing?.remove();
        }
        subparagraph.textHtml = holder.innerHTML;
        subparagraph.contentKind = subparagraph.textHtml ? CONTENT_KIND.TEXT : CONTENT_KIND.EMPTY;
        subparagraph.runs = window.WordexRuns?.htmlToRuns
          ? window.WordexRuns.htmlToRuns(subparagraph.textHtml, subparagraph.textStyle || this.document.textDefaults || this.getTypingTextDefaults?.() || {})
          : [];
      },

onObjectImageFileChange(fileInput, preview, fileNameInput = null) {
        const file = fileInput.files?.[0];
        if (!file) {
          this.pendingImageDataUrl = "";
          this.pendingImageFileName = "";
          if (preview) preview.style.display = "none";
          if (fileNameInput) fileNameInput.value = "";
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          this.pendingImageDataUrl = String(reader.result || "");
          this.pendingImageFileName = file.name || "imagem";
          this.pendingWatermarkRemove = false;
          if (fileNameInput) fileNameInput.value = this.pendingImageFileName;
          if (preview) {
            preview.src = this.pendingImageDataUrl;
            preview.style.display = "block";
          }
        };
        reader.readAsDataURL(file);
      },

renderTableInsertDialogBody() {
        const hasJson = this.dataSource != null;
        const dataOptions = hasJson ? this.getTableDataSourceOptions() : [];
        const firstPath = dataOptions[0]?.path || "$";
        const detailOptionsHtml = dataOptions
          .map(item => `<option value="${escapeHtml(item.path)}">${escapeHtml(item.label)}</option>`)
          .join("");

        if (!hasJson) {
          return `
            <div class="wordex-object-form-grid" data-table-static-size-row>
              <label class="wordex-object-form-row">Linhas
                <input type="number" min="1" step="1" value="2" data-object-table-rows>
              </label>
              <label class="wordex-object-form-row">Colunas
                <input type="number" min="1" step="1" value="3" data-object-table-cols>
              </label>
            </div>
          `;
        }

        return `
          <label class="wordex-object-form-row">Datasource do Detail
            <select data-table-detail-source>${detailOptionsHtml}</select>
          </label>

          <div class="wordex-object-form-grid" data-table-static-size-row hidden>
            <label class="wordex-object-form-row">Linhas
              <input type="number" min="1" step="1" value="2" data-object-table-rows>
            </label>
            <label class="wordex-object-form-row">Colunas
              <input type="number" min="1" step="1" value="3" data-object-table-cols>
            </label>
          </div>

          <div data-table-dynamic-options>
            <label class="wordex-object-form-row">Texto do TableHeader
              <input type="text" data-table-header-text placeholder="Ex.: Relatório de vendas">
            </label>
            <div data-table-parent-chain></div>
            <div class="wordex-object-form-row" data-table-detail-fields></div>
            <div class="wordex-table-fields-error" data-table-fields-error hidden>Selecione pelo menos uma coluna do detalhe.</div>
            <div data-table-group-footers></div>
            <div data-table-root-footer></div>
          </div>
        `;
      },

bindTableInsertDialog(body) {
        const detailSelect = body.querySelector("[data-table-detail-source]");
        if (!detailSelect) return;

        const refresh = () => this.refreshTableInsertDialog(body);
        detailSelect.addEventListener("change", refresh);
        refresh();
      },

refreshTableInsertDialog(body) {
        const detailSelect = body.querySelector("[data-table-detail-source]");
        const staticSizeRow = body.querySelector("[data-table-static-size-row]");
        const dynamicOptions = body.querySelector("[data-table-dynamic-options]");
        if (!detailSelect) return;

        const detailPath = detailSelect.value || "$";
        const isStatic = detailPath === "$";

        if (staticSizeRow) {
          staticSizeRow.hidden = !isStatic;
          staticSizeRow.style.display = isStatic ? "" : "none";
        }
        if (dynamicOptions) {
          dynamicOptions.hidden = isStatic;
          dynamicOptions.style.display = isStatic ? "none" : "";
        }

        if (isStatic) return;

        this.renderTableDetailFieldOptions(body, detailPath);
        this.renderTableParentChainOptions(body, detailPath);
      },

renderTableDetailFieldOptions(body, detailPath) {
        const container = body.querySelector("[data-table-detail-fields]");
        if (!container) return;

        const previousPath = container.dataset.detailPath || "";
        const selectedBeforeRefresh = new Set(
          Array.from(container.querySelectorAll("[data-table-detail-field]:checked"))
            .map(input => input.value)
        );
        const fields = this.getScalarFieldsForDataPath(detailPath);
        const preserveSelection = previousPath === detailPath;
        const fieldByMacro = new Map(fields.map(field => [field.macro, field]));
        let selectedOrder = [];
        if (preserveSelection) {
          try {
            selectedOrder = JSON.parse(container.dataset.fieldOrder || "[]")
              .filter(macro => selectedBeforeRefresh.has(macro) && fieldByMacro.has(macro));
          } catch {
            selectedOrder = [];
          }
          selectedBeforeRefresh.forEach(macro => {
            if (fieldByMacro.has(macro) && !selectedOrder.includes(macro)) selectedOrder.push(macro);
          });
        } else {
          selectedOrder = fields.map(field => field.macro);
        }
        container.dataset.detailPath = detailPath;
        container.dataset.fieldOrder = JSON.stringify(selectedOrder);
        container.className = "wordex-table-detail-fields";

        if (!fields.length) {
          container.innerHTML = `<strong>Colunas do detalhe</strong><span class="wordex-table-fields-empty">Nenhum campo simples encontrado.</span>`;
          return;
        }

        const orderedFields = [
          ...selectedOrder.map(macro => fieldByMacro.get(macro)),
          ...fields.filter(field => !selectedOrder.includes(field.macro))
        ];
        container.innerHTML = `
          <strong>Colunas do detalhe — a ordem define as colunas da tabela</strong>
          <div class="wordex-table-detail-field-list">
            ${orderedFields.map(field => {
              const checked = selectedOrder.includes(field.macro);
              const orderIndex = selectedOrder.indexOf(field.macro);
              const disabled = !checked;
              return `<div class="wordex-table-detail-field-row" data-table-detail-field-row>
                <label><input type="checkbox" data-table-detail-field value="${escapeHtml(field.macro)}"${checked ? " checked" : ""}> <span>${escapeHtml(field.label)}</span></label>
                <span class="wordex-table-detail-field-order">
                  <button type="button" data-move-detail-field="-1" data-field-macro="${escapeHtml(field.macro)}" aria-label="Mover ${escapeHtml(field.label)} para cima"${disabled || orderIndex === 0 ? " disabled" : ""}>↑</button>
                  <button type="button" data-move-detail-field="1" data-field-macro="${escapeHtml(field.macro)}" aria-label="Mover ${escapeHtml(field.label)} para baixo"${disabled || orderIndex === selectedOrder.length - 1 ? " disabled" : ""}>↓</button>
                </span>
              </div>`;
            }).join("")}
          </div>
        `;
        container.querySelectorAll("[data-table-detail-field]").forEach(input => {
          input.addEventListener("change", () => {
            container.dataset.fieldOrder = JSON.stringify(
              Array.from(container.querySelectorAll("[data-table-detail-field]:checked"))
                .map(checkedInput => checkedInput.value)
            );
            this.renderTableDetailFieldOptions(body, container.dataset.detailPath);
          });
        });
        container.querySelectorAll("[data-move-detail-field]").forEach(button => {
          button.addEventListener("click", event => {
            event.preventDefault();
            const macro = button.dataset.fieldMacro;
            const direction = Number(button.dataset.moveDetailField);
            const order = JSON.parse(container.dataset.fieldOrder || "[]");
            const index = order.indexOf(macro);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= order.length) return;
            [order[index], order[target]] = [order[target], order[index]];
            container.dataset.fieldOrder = JSON.stringify(order);
            this.renderTableDetailFieldOptions(body, container.dataset.detailPath);
          });
        });
        body.querySelector("[data-table-fields-error]")?.setAttribute("hidden", "");
      },

renderTableParentChainOptions(body, detailPath) {
        const container = body.querySelector("[data-table-parent-chain]");
        if (!container) return;

        const rootFooterContainer = body.querySelector("[data-table-root-footer]");
        const groupFooterContainer = body.querySelector("[data-table-group-footers]");
        const levels = this.getTableParentChainForDetail(detailPath);
        const rows = [];
        const groupFooterRows = [];
        const rootRows = [];

        levels.forEach((level, index) => {
          const totals = Array.isArray(level.totals) ? level.totals : [];
          const isRoot = level.path === "$";
          const labelText = isRoot ? "Root" : level.label;
          const footerTitle = isRoot
            ? "Total geral (total)"
            : `Footer do grupo ${escapeHtml(labelText)} (total)`;
          const footerHtml = totals.length
            ? `<div class="wordex-table-footer-field">
                <span class="wordex-table-footer-field-label">${footerTitle}</span>
                <div class="wordex-table-footer-field-line">
                  <select data-table-parent-footer-source data-parent-path="${escapeHtml(level.path)}">
                    ${totals.map((item, itemIndex) => `<option value="${escapeHtml(item.path)}"${itemIndex === 0 ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
                    <option value="">(não renderizar)</option>
                  </select>
                  <select data-table-parent-footer-aggregate data-parent-path="${escapeHtml(level.path)}" title="Valor exibido no total" aria-label="Valor exibido no total"></select>
                </div>
              </div>`
            : `<div class="wordex-object-form-row wordex-table-parent-no-total">Sem total no grupo ${escapeHtml(labelText)}</div>`;

          if (isRoot) {
            if (!totals.length) return;
            rootRows.push(`
              <div class="wordex-object-form-grid wordex-table-parent-level" data-parent-path="${escapeHtml(level.path)}">
                ${footerHtml}
              </div>
            `);
            return;
          }

          const groupFields = this.getScalarFieldsForDataPath(level.path);
          const groupFieldSelect = `<div class="wordex-table-group-field">
              <span class="wordex-table-group-field-label">Campo do grupo ${escapeHtml(labelText)}</span>
              <div class="wordex-table-group-field-line">
                <select data-table-group-field data-parent-path="${escapeHtml(level.path)}">
                  <option value="" selected>(não agrupar)</option>
                  ${groupFields.map(field => `<option value="${escapeHtml(field.macro)}" data-field-label="${escapeHtml(field.label)}">${escapeHtml(field.label)}</option>`).join("")}
                </select>
                <label class="wordex-table-group-option">
                  <input type="checkbox" data-table-group-page-break data-parent-path="${escapeHtml(level.path)}" disabled>
                  Saltar página
                </label>
              </div>
            </div>`;

          rows.push(`
            <div class="wordex-object-form-grid wordex-table-parent-level" data-parent-path="${escapeHtml(level.path)}">
              <label class="wordex-object-form-row">Grupo ${index + 1}
                <input type="text" value="${escapeHtml(labelText)}" data-table-parent-display readonly>
              </label>
              ${groupFieldSelect}
            </div>
          `);
          groupFooterRows.push(`<div class="wordex-object-form-grid wordex-table-parent-level" data-parent-path="${escapeHtml(level.path)}">${footerHtml}</div>`);
        });

        container.innerHTML = rows.join("");
        container.querySelectorAll("select").forEach(select => this.resizeSelectToLargestOption(select));
        if (groupFooterContainer) {
          groupFooterContainer.innerHTML = groupFooterRows.join("");
          groupFooterContainer.querySelectorAll("select").forEach(select => this.resizeSelectToLargestOption(select));
        }
        if (rootFooterContainer) {
          rootFooterContainer.innerHTML = rootRows.join("");
          rootFooterContainer.querySelectorAll("select").forEach(select => this.resizeSelectToLargestOption(select));
        }

        body.querySelectorAll("[data-table-group-field]").forEach(select => {
          const path = select.getAttribute("data-parent-path") || "";
          const checkbox = Array.from(body.querySelectorAll("[data-table-group-page-break]"))
            .find(input => (input.getAttribute("data-parent-path") || "") === path);
          if (!checkbox) return;

          const apply = () => {
            const enabled = Boolean(select.value);
            checkbox.disabled = !enabled;
            if (!enabled) checkbox.checked = false;
          };

          select.addEventListener("change", apply);
          apply();
        });

        body.querySelectorAll("[data-table-parent-footer-source]").forEach(select => {
          const refreshAggregates = () => this.refreshTableFooterAggregateOptions(body, select);
          select.addEventListener("change", refreshAggregates);
          refreshAggregates();
        });
      },

refreshTableFooterAggregateOptions(body, sourceSelect, preferredAggregate = "") {
        if (!body || !sourceSelect) return;

        const path = sourceSelect.getAttribute("data-parent-path") || "";
        const aggregateSelect = Array.from(body.querySelectorAll("[data-table-parent-footer-aggregate]"))
          .find(select => (select.getAttribute("data-parent-path") || "") === path);
        if (!aggregateSelect) return;

        const footerPath = sourceSelect.value || "";
        const previous = preferredAggregate || aggregateSelect.value || "";
        const suffixes = footerPath ? (this.getTotalsAggregateSuffixes?.(footerPath) || []) : [];

        aggregateSelect.innerHTML = suffixes.length
          ? suffixes.map(suffix => `<option value="${escapeHtml(suffix)}">${escapeHtml(suffix)}</option>`).join("")
          : `<option value="">(sem valor)</option>`;

        const preferred = previous && suffixes.includes(previous)
          ? previous
          : (suffixes.includes("Sum") ? "Sum" : (suffixes[0] || ""));
        aggregateSelect.value = preferred;
        aggregateSelect.disabled = !footerPath || !suffixes.length;
        this.resizeSelectToLargestOption(aggregateSelect);
      },

populateDialogSelect(row, select, items, emptyLabel = "") {
        if (!row || !select) return;

        const hasItems = Array.isArray(items) && items.length > 0;
        const shouldShow = hasItems || !!emptyLabel;

        row.hidden = !shouldShow;
        row.style.display = shouldShow ? "" : "none";

        if (!shouldShow) {
          select.innerHTML = "";
          select.value = "";
          return;
        }

        const options = [];
        if (emptyLabel) options.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
        if (hasItems) {
          items.forEach(item => {
            options.push(`<option value="${escapeHtml(item.path)}">${escapeHtml(item.label)}</option>`);
          });
        }

        select.innerHTML = options.join("");
        this.resizeSelectToLargestOption(select);
      },

decodeDialogText(value) {
        const node = document.createElement("textarea");
        node.innerHTML = String(value ?? "");
        return node.value;
      },

applyTableInsertDialogState(body, table) {
        if (!body || !table) return;

        const detailSelect = body.querySelector("[data-table-detail-source]");
        const binding = table.dataBinding;
        const detailPath = binding?.detailPath || "$";
        const savedPathExists = detailSelect
          && [...detailSelect.options].some(option => option.value === detailPath);

        if (detailSelect && savedPathExists) detailSelect.value = detailPath;
        if (detailSelect) this.refreshTableInsertDialog(body);

        const rowsInput = body.querySelector("[data-object-table-rows]");
        const colsInput = body.querySelector("[data-object-table-cols]");
        if (!binding || !detailSelect || detailSelect.value === "$") {
          if (rowsInput) rowsInput.value = String(Math.max(1, Number(table.rows) || 2));
          if (colsInput) colsInput.value = String(Math.max(1, Number(table.cols) || 3));
          return;
        }

        const headerRow = (table.rowContexts || []).findIndex(context => context?.kind === "tableHeader");
        const headerInput = body.querySelector("[data-table-header-text]");
        if (headerInput && headerRow >= 0)
          headerInput.value = this.decodeDialogText(table.cells?.[headerRow]?.[0] || "");

        const savedFields = Array.isArray(binding.detailFields) ? binding.detailFields.filter(Boolean) : [];
        const fieldsContainer = body.querySelector("[data-table-detail-fields]");
        if (fieldsContainer && savedFields.length) {
          fieldsContainer.dataset.detailPath = detailSelect.value;
          fieldsContainer.dataset.fieldOrder = JSON.stringify(savedFields);
          fieldsContainer.querySelectorAll("[data-table-detail-field]").forEach(input => {
            input.checked = savedFields.includes(input.value);
          });
          this.renderTableDetailFieldOptions(body, detailSelect.value);
        }

        const groups = Array.isArray(binding.groups) ? binding.groups : [];
        body.querySelectorAll("[data-table-group-field]").forEach(select => {
          const path = select.getAttribute("data-parent-path") || "";
          const group = groups.find(item => item?.path === path);
          const macro = group?.fieldMacro || "";
          if ([...select.options].some(option => option.value === macro)) select.value = macro;
          select.dispatchEvent(new Event("change"));
          const checkbox = Array.from(body.querySelectorAll("[data-table-group-page-break]"))
            .find(input => (input.getAttribute("data-parent-path") || "") === path);
          if (checkbox && select.value) checkbox.checked = group?.pageBreak === true;
        });

        const footerByPath = new Map(
          (Array.isArray(binding.parentLevels) ? binding.parentLevels : [])
            .filter(level => level?.path)
            .map(level => [level.path, {
              footerPath: level.footerPath || "",
              footerAggregate: level.footerAggregate || ""
            }])
        );
        if (Object.prototype.hasOwnProperty.call(binding, "tableFooterPath")) {
          footerByPath.set("$", {
            footerPath: binding.tableFooterPath || "",
            footerAggregate: binding.tableFooterAggregate || footerByPath.get("$")?.footerAggregate || ""
          });
        }
        body.querySelectorAll("[data-table-parent-footer-source]").forEach(select => {
          const path = select.getAttribute("data-parent-path") || "";
          if (!footerByPath.has(path)) {
            this.refreshTableFooterAggregateOptions(body, select);
            return;
          }
          const saved = footerByPath.get(path);
          const value = saved.footerPath || "";
          if ([...select.options].some(option => option.value === value)) select.value = value;
          this.refreshTableFooterAggregateOptions(body, select, saved.footerAggregate || "");
        });
      },

createTableObjectFromDialog(body) {
        const detailSelect = body.querySelector("[data-table-detail-source]");
        const hasJson = this.dataSource != null && detailSelect;

        if (!hasJson || detailSelect.value === "$") {
          const rows = body.querySelector("[data-object-table-rows]")?.value || 2;
          const cols = body.querySelector("[data-object-table-cols]")?.value || 3;
          return createTableObject(rows, cols);
        }

        const detailPath = detailSelect.value;
        const tableHeaderText = body.querySelector("[data-table-header-text]")?.value.trim() || "";
        const fields = this.getScalarFieldsForDataPath(detailPath);
        const selectedDetailFieldOrder = Array.from(
          body.querySelectorAll("[data-table-detail-field]:checked")
        ).map(input => input.value);
        const fieldsByMacro = new Map(fields.map(field => [field.macro, field]));
        const selectedFields = selectedDetailFieldOrder
          .map(macro => fieldsByMacro.get(macro))
          .filter(Boolean);
        const safeFields = fields.length
          ? selectedFields
          : [{ label: "Campo", macro: "Campo" }];

        const selectedFooterByParentPath = new Map(
          Array.from(body.querySelectorAll("[data-table-parent-footer-source]")).map(select => [
            select.getAttribute("data-parent-path") || "",
            select.value || ""
          ])
        );
        const selectedFooterAggregateByParentPath = new Map(
          Array.from(body.querySelectorAll("[data-table-parent-footer-aggregate]")).map(select => [
            select.getAttribute("data-parent-path") || "",
            select.value || ""
          ])
        );
        const pageBreakByParentPath = new Map(
          Array.from(body.querySelectorAll("[data-table-group-page-break]")).map(input => [
            input.getAttribute("data-parent-path") || "",
            Boolean(input.checked)
          ])
        );
        const selectedGroupFieldByParentPath = new Map(
          Array.from(body.querySelectorAll("[data-table-group-field]")).map(select => [
            select.getAttribute("data-parent-path") || "",
            select.value
              ? {
                  macro: select.value,
                  label: select.selectedOptions[0]?.dataset.fieldLabel || select.selectedOptions[0]?.textContent || select.value
                }
              : null
          ])
        );

        const chainClosestFirst = this.getTableParentChainForDetail(detailPath);
        const parentLevels = chainClosestFirst.map(level => ({
          path: level.path,
          label: level.label,
          footerPath: selectedFooterByParentPath.get(level.path) || "",
          footerAggregate: selectedFooterAggregateByParentPath.get(level.path) || ""
        }));

        const groupedParentsClosestFirst = parentLevels
          .filter(item => item.path && item.path !== "$" && selectedGroupFieldByParentPath.get(item.path))
          .map(item => {
            const field = selectedGroupFieldByParentPath.get(item.path);
            return {
              ...item,
              fieldMacro: field.macro,
              fieldLabel: field.label,
              pageBreak: pageBreakByParentPath.get(item.path) === true
            };
          });
        const groupedParentsRootFirst = [...groupedParentsClosestFirst].reverse();
        const rootLevel = parentLevels.find(item => item.path === "$") || { path: "$", footerPath: "", footerAggregate: "" };

        /*
          Tabela dinâmica do Wordex:
          - o usuário escolhe somente o Detail;
          - ROOT gera TableHeader e TableFooter;
          - a linha de títulos das colunas fica sempre logo após TableHeader;
          - GroupHeader só é criado para níveis marcados como grupo;
          - GroupFooter só é criado para grupos com total selecionado.
        */
        const rows = [];
        const contexts = [];

        const blankCells = () => safeFields.map(() => "");
        const pushRow = (context, cells) => {
          contexts.push(context);
          rows.push(cells);
        };

        const buildFooterCells = (ownerPath, footerPath, fallbackLabel, footerAggregate = "") => {
          if (!footerPath) return blankCells();
          const footerFields = this.getScalarFieldsForDataPath(footerPath);
          const macroByLabel = new Map(footerFields.map(field => [field.label, field.macro]));
          const ownerName = ownerPath === "$" ? "GERAL" : this.getDataPathLastName(ownerPath).toUpperCase();
          const preferredSuffix = String(footerAggregate || "").trim();
          const aggregateSuffixes = preferredSuffix
            ? [preferredSuffix]
            : ["Sum", "Avg", "Min", "Max", "Count"];
          return safeFields.map((field, col) => {
            if (col === 0) return fallbackLabel || (ownerPath === "$" ? "TOTAL GERAL:" : `TOTAL ${ownerName}:`);
            const macro = macroByLabel.get(field.label)
              || aggregateSuffixes.map(suffix => macroByLabel.get(`${field.label}${suffix}`)).find(Boolean)
              || "";
            return macro ? `{{${macro}}}` : "";
          });
        };

        // 1) Header da tabela: só existe quando o usuário informa um texto.
        if (tableHeaderText) {
          pushRow(
            { kind: "tableHeader", contextPath: "$", fieldContextPath: "$" },
            safeFields.map((_, col) => col === 0 ? escapeHtml(tableHeaderText) : "")
          );
        }

        // 2) Cabeçalho fixo de colunas.
        pushRow(
          { kind: "columnHeader", contextPath: detailPath, fieldContextPath: detailPath },
          safeFields.map(field => escapeHtml(field.label))
        );

        // 3) Headers de grupos: somente níveis marcados pelo usuário.
        groupedParentsRootFirst.forEach(item => {
          const rowIndex = rows.length;
          pushRow(
            { kind: "groupHeader", contextPath: item.path, fieldContextPath: item.path, pageBreak: item.pageBreak === true },
            safeFields.map((_, col) => col === 0
              ? `${escapeHtml(item.fieldLabel || item.label || this.getDataPathLastName(item.path))}: {{${item.fieldMacro}}}`
              : "")
          );
          contexts[ rowIndex ].mergeAcrossColumns = true;
        });

        // 4) Detail: datasource escolhido pelo usuário.
        pushRow(
          { kind: "detail", contextPath: detailPath, fieldContextPath: detailPath },
          safeFields.map(field => `{{${field.macro}}}`)
        );

        // 5) Footers: somente grupos selecionados com total configurado.
        groupedParentsClosestFirst.filter(item => item.path !== "$" && item.footerPath).forEach(item => {
          pushRow(
            {
              kind: "groupFooter",
              contextPath: item.path,
              footerPath: item.footerPath || "",
              footerAggregate: item.footerAggregate || "",
              fieldContextPath: item.footerPath || item.path
            },
            buildFooterCells(item.path, item.footerPath, "", item.footerAggregate || "")
          );
        });

        // 6) Footer da tabela: só quando o total geral foi escolhido.
        if (rootLevel.footerPath) {
          pushRow(
            {
              kind: "tableFooter",
              contextPath: "$",
              footerPath: rootLevel.footerPath,
              footerAggregate: rootLevel.footerAggregate || "",
              fieldContextPath: rootLevel.footerPath
            },
            buildFooterCells("$", rootLevel.footerPath, "TOTAL GERAL:", rootLevel.footerAggregate || "")
          );
        }

        const table = createTableObject(rows.length, safeFields.length);
        table.cellColspans = Array.from(
          { length: rows.length },
          () => Array(safeFields.length).fill(1)
        );
        const tableHeaderRowIndex = contexts.findIndex(context => context?.kind === "tableHeader");
        if (tableHeaderRowIndex >= 0) {
          table.cellColspans[tableHeaderRowIndex][0] = safeFields.length;
        }
        contexts.forEach((context, rowIndex) => {
          if (context?.mergeAcrossColumns) {
            table.cellColspans[rowIndex][0] = safeFields.length;
            delete context.mergeAcrossColumns;
          }
        });

        // Nas linhas de total, aproveita os espaços sem valor para alargar
        // o rótulo inicial e para agrupar os demais trechos vazios.
        contexts.forEach((context, rowIndex) => {
          if (!["groupFooter", "tableFooter"].includes(context?.kind)) return;

          const cells = rows[rowIndex] || [];
          const isBlank = col => String(cells[col] ?? "").trim() === "";
          let col = 0;

          while (col < safeFields.length) {
            if (isBlank(col)) {
              const start = col;
              while (col < safeFields.length && isBlank(col)) col += 1;
              if (col - start > 1) table.cellColspans[rowIndex][start] = col - start;
              continue;
            }

            const valueCol = col;
            col += 1;
            const blankStart = col;
            while (col < safeFields.length && isBlank(col)) col += 1;
            const blankCount = col - blankStart;

            if (blankCount > 0 && col < safeFields.length) {
              if (valueCol === 0) {
                // O rótulo TOTAL CLIENTES/GERAL ocupa o espaço vazio até
                // a primeira coluna que contém um total.
                table.cellColspans[rowIndex][valueCol] = 1 + blankCount;
              } else if (blankCount > 1) {
                // Lacunas entre valores formam uma única célula vazia.
                table.cellColspans[rowIndex][blankStart] = blankCount;
              }
            } else if (blankCount > 1) {
              table.cellColspans[rowIndex][blankStart] = blankCount;
            }
          }
        });
        table.dataBinding = {
          detailPath,
          detailFields: safeFields.map(field => field.macro),
          parentLevels,
          groupPaths: groupedParentsClosestFirst.map(item => item.path),
          groups: groupedParentsClosestFirst.map(item => ({
            path: item.path,
            label: item.label || this.getDataPathLastName(item.path),
            fieldMacro: item.fieldMacro,
            fieldLabel: item.fieldLabel,
            pageBreak: item.pageBreak === true
          })),
          tableHeaderPath: "$",
          tableFooterPath: rootLevel.footerPath || "",
          tableFooterAggregate: rootLevel.footerAggregate || ""
        };
        table.rowContexts = contexts;
        table.cells = rows;

        // Colunas numéricas já nascem alinhadas à direita em toda a tabela,
        // inclusive no título da coluna e nos valores dos totais.
        const numericColumns = safeFields
          .map((field, col) => this.isNumericDataNode?.(field) ? col : -1)
          .filter(col => col >= 0);
        numericColumns.forEach(col => {
          contexts.forEach((context, rowIndex) => {
            if (["columnHeader", "detail", "groupFooter", "tableFooter"].includes(context?.kind))
              table.cellTextAlign[rowIndex][col] = "right";
          });
        });

        return table;
      },

confirmObjectDialog() {
        const kind = this.pendingObjectKind;
        const body = this.objectDialogBackdrop?.querySelector("[data-object-dialog-body]");
        if (!kind || !body) return;

        if (kind === KINDS.LIST) {
          const valuesError = body.querySelector("[data-list-values-error]");
          const insertionError = body.querySelector("[data-list-insertion-error]");
          const items = (body.querySelector("[data-list-values]")?.value || "")
            .split(/\r?\n/)
            .map(value => value.trim())
            .filter(Boolean);

          valuesError?.setAttribute("hidden", "");
          insertionError?.setAttribute("hidden", "");
          if (!items.length) {
            valuesError?.removeAttribute("hidden");
            body.querySelector("[data-list-values]")?.focus();
            return;
          }

          const target = this.pendingListTarget;
          const subparagraph = target
            ? this.findObjectOwnerById?.(target.id)?.subparagraph
            : this.findSubparagraphById?.(this.pendingListSubparagraphId);
          const parentItemId = body.querySelector("[data-list-parent-item]")?.value || "";
          const lists = Array.isArray(subparagraph?.inlineLists) ? subparagraph.inlineLists : [];
          const parentList = parentItemId
            ? lists.find(candidate => ensureListItemIds(candidate).includes(parentItemId))
            : null;
          let wouldCreateCycle = false;
          let ancestor = parentList;
          while (ancestor && target && !wouldCreateCycle) {
            if (ancestor.id === target.id) wouldCreateCycle = true;
            ancestor = ancestor.parentListId
              ? lists.find(candidate => candidate.id === ancestor.parentListId)
              : null;
          }
          if (parentItemId && (!parentList || wouldCreateCycle)) {
            this.render("O item escolhido para receber a lista não está mais disponível.", true);
            return;
          }

          const itemIds = target ? this.reconcileListItemIds(target, items) : undefined;
          const list = createListObject({
            id: target?.id,
            listType: body.querySelector("[data-list-type]")?.value,
            markerStyle: body.querySelector("[data-list-marker-style]")?.value,
            alignment: target?.alignment || (target?.placement === "aligned"
              ? target.floatSide === "left" ? "left" : "right"
              : "left"),
            wrapText: !parentItemId && body.querySelector("[data-list-wrap-text]")?.checked === true,
            hierarchicalNumbering: !parentItemId
              && body.querySelector("[data-list-type]")?.value !== "bullet"
              && body.querySelector("[data-list-hierarchical-numbering]")?.checked === true,
            sortAlphabetically: body.querySelector("[data-list-sort-alphabetically]")?.checked === true,
            justify: body.querySelector("[data-list-justify]")?.checked === true,
            width: target?.width ?? null,
            height: target?.height ?? null,
            items,
            itemIds
          });
          if (parentItemId) {
            list.parentListId = parentList.id;
            list.parentItemId = parentItemId;
          }

          if (target) {
            const owner = this.findObjectOwnerById?.(target.id);
            const wasRoot = !target.parentListId;
            const becomesRoot = !parentItemId;
            Object.assign(target, list, { id: target.id });
            if (becomesRoot) {
              delete target.parentListId;
              delete target.parentItemId;
            }
            if (wasRoot !== becomesRoot)
              this.setListRootAnchor(owner?.subparagraph, target.id, becomesRoot);
            this.removeOrphanedSublists(owner?.subparagraph, target.id, new Set(target.itemIds));
            delete target.placement;
            delete target.floatSide;
            delete target.x;
            delete target.y;
            this.hideObjectDialog();
            this.render("Lista atualizada.");
            return;
          }

          if (parentItemId) {
            if (!subparagraph || subparagraph.contentKind === CONTENT_KIND.OBJECT) {
              this.render("Selecione um subparágrafo de texto para inserir uma sublista.", true);
              return;
            }
            subparagraph.inlineLists ||= [];
            subparagraph.inlineLists.push(list);
            const owner = this.findSubparagraphOwnerById(subparagraph.id);
            if (owner) {
              this.activeSection = owner.section.id;
              this.activeParagraph = owner.paragraph.id;
              this.activeSubparagraph = subparagraph.id;
            }
            this.activeObject = list.id;
            this.activeTextbox = null;
            this.hideObjectDialog();
            this.render("Sublista subordinada ao item selecionado.");
            return;
          }

          if (!this.insertInlineListAtTextCaret(list)) {
            insertionError?.removeAttribute("hidden");
            return;
          }
          this.hideObjectDialog();
          return;
        }

        if (kind === KINDS.TABLE) {
          const detailSelect = body.querySelector("[data-table-detail-source]");
          const headerInput = body.querySelector("[data-table-header-text]");
          const availableDetailFields = detailSelect && detailSelect.value !== "$"
            ? this.getScalarFieldsForDataPath(detailSelect.value)
            : [];
          const selectedDetailFields = body.querySelectorAll("[data-table-detail-field]:checked");
          const fieldsError = body.querySelector("[data-table-fields-error]");
          if (availableDetailFields.length && !selectedDetailFields.length) {
            fieldsError?.removeAttribute("hidden");
            body.querySelector("[data-table-detail-field]")?.focus();
            return;
          }
          fieldsError?.setAttribute("hidden", "");
          headerInput?.setCustomValidity("");
          const table = this.createTableObjectFromDialog(body);
          const target = this.pendingTableTarget;
          if (target) {
            const preserved = {
              id: target.id,
              x: target.x,
              y: target.y,
              width: target.width,
              height: target.height
            };
            Object.keys(target).forEach(key => {
              if (!Object.prototype.hasOwnProperty.call(table, key) && !Object.prototype.hasOwnProperty.call(preserved, key))
                delete target[key];
            });
            Object.assign(target, table, preserved);
            this.activeObject = target.id;
            this.hideObjectDialog();
            this.render("Tabela atualizada.");
            return;
          }
          this.hideObjectDialog();
          this.insertObjectIntoActiveSubparagraph(table);
          return;
        }

        if (kind === KINDS.CHART) {
          const chart = this.readChartDialogDraft(body, this.pendingChartTarget || {});
          if (this.pendingChartTarget) {
            const target = this.pendingChartTarget;
            Object.assign(target, chart, {
              id: target.id,
              x: target.x,
              y: target.y,
              width: target.width,
              height: target.height
            });
            this.hideObjectDialog();
            this.render("Gráfico atualizado.");
          } else {
            this.hideObjectDialog();
            this.insertObjectIntoActiveSubparagraph(chart);
          }
          return;
        }

        if (kind === KINDS.IMAGE) {
          const selectedSource = body.querySelector("input[name='wordexImageSource']:checked")?.value || "file";

          if (selectedSource === "json") {
            const path = body.querySelector("[data-object-image-json-field]")?.value || "";
            const field = (this.pendingImageFields || []).find(item => item.path === path);
            if (!field?.src) {
              this.render("Selecione uma propriedade image antes de confirmar.", true);
              return;
            }
            this.hideObjectDialog();
            this.insertImageFromDataField(field);
            return;
          }

          const imageDataUrl = this.pendingImageDataUrl;
          const imageFileName = this.pendingImageFileName;

          if (!imageDataUrl) {
            this.render("Selecione uma imagem antes de confirmar.", true);
            return;
          }

          this.hideObjectDialog();
          this.insertObjectIntoActiveSubparagraph(createImageObject({
            src: imageDataUrl,
            fileName: imageFileName,
            label: imageFileName || "Imagem"
          }));
          return;
        }

        if (kind === KINDS.WATERMARK) {
          if (this.pendingWatermarkRemove || !this.pendingImageDataUrl) {
            this.document.watermark = null;
            this.hideObjectDialog();
            this.render("Marca d'água removida.");
            return;
          }

          const opacityPercent = Number(body.querySelector("[data-watermark-opacity]")?.value);
          const sizePercent = Number(body.querySelector("[data-watermark-size]")?.value);
          this.document.watermark = {
            kind: KINDS.WATERMARK,
            src: this.pendingImageDataUrl,
            fileName: this.pendingImageFileName,
            opacity: Math.min(1, Math.max(0, (Number.isFinite(opacityPercent) ? opacityPercent : 12) / 100)),
            sizePercent: Math.min(200, Math.max(1, Math.round(Number.isFinite(sizePercent) ? sizePercent : 80)))
          };
          this.hideObjectDialog();
          this.render("Marca d'água aplicada.");
          return;
        }
      },

ensureMarginDialog() {
        if (this.marginDialog) return this.marginDialog;

        const backdrop = document.createElement("div");
        backdrop.className = "wordex-margin-modal-backdrop";
        backdrop.setAttribute("role", "presentation");

        const dialog = document.createElement("div");
        dialog.className = "wordex-margin-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.innerHTML = `
          <div class="wordex-margin-dialog-title" data-margin-dialog-title>Margens</div>
          ${[
            ["top", "Top"],
            ["bottom", "Bottom"]
          ].map(([side, label]) => `
            <div class="wordex-margin-row">
              <label for="wordex-margin-${side}">${label}</label>
              <input id="wordex-margin-${side}" type="number" min="0" step="1" data-margin-input="${side}">
            </div>
          `).join("")}
          <div class="wordex-margin-actions">
            <button class="wordex-margin-action" type="button" data-margin-cancel title="Cancelar alterações">
              <span class="wordex-margin-action-icon is-cancel" aria-hidden="true">×</span>
              <span>Cancelar</span>
            </button>
            <button class="wordex-margin-action" type="button" data-margin-confirm title="Confirmar alterações">
              <span class="wordex-margin-action-icon is-confirm" aria-hidden="true">✓</span>
              <span>Confirmar</span>
            </button>
          </div>
        `;

        backdrop.addEventListener("pointerdown", event => event.stopPropagation());
        backdrop.addEventListener("click", event => event.stopPropagation());
        dialog.addEventListener("pointerdown", event => event.stopPropagation());
        dialog.addEventListener("click", event => event.stopPropagation());

        dialog.querySelectorAll("[data-margin-input]").forEach(input => {
          input.addEventListener("input", event => this.onMarginDialogInput(event));
          input.addEventListener("change", event => this.onMarginDialogInput(event));
        });


        dialog.querySelector("[data-margin-confirm]").addEventListener("click", () => this.confirmMarginDialog());
        dialog.querySelector("[data-margin-cancel]").addEventListener("click", () => this.cancelMarginDialog());

        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);
        this.marginDialogBackdrop = backdrop;
        this.marginDialog = dialog;
        return dialog;
      },

getActiveMarginTarget() {
        if (this.activeEditTargetKind === EDIT_TARGET_KIND.PARAGRAPH && this.activeParagraph) {
          const paragraph = this.findParagraphById(this.activeParagraph);
          const element = document.querySelector(`[data-paragraph-id="${this.activeParagraph}"]`);
          if (paragraph && element) return { kind: KINDS.PARAGRAPH, item: paragraph, element, label: `Parágrafo ${paragraph.id}` };
        }

        return null;
      },

getTargetMargin(target) {
        if (!target?.item) return createMargin();
        target.item.margin = normalizeMargin(target.item.margin, target.kind);
        return target.item.margin;
      },

applyMarginToElement(target) {
        if (!target?.element || !target?.item || target.kind !== KINDS.PARAGRAPH) return;
        const margin = this.getTargetMargin(target);
        target.element.style.marginTop = `${margin.top}px`;
        target.element.style.marginRight = margin.right == null ? "" : `${margin.right}px`;
        target.element.style.marginBottom = `${margin.bottom}px`;
        target.element.style.marginLeft = margin.left == null ? "" : `${margin.left}px`;
        target.element.style.width = "";
        target.element.style.maxWidth = "";
        target.element.style.boxSizing = "";
      },

positionMarginDialogBackdrop() {
        if (!this.marginDialogBackdrop) return;

        // O diálogo de margens agora segue o mesmo padrão dos demais modais:
        // ocupa a viewport inteira e centraliza o card na tela, não apenas dentro da página.
        this.marginDialogBackdrop.style.left = "0px";
        this.marginDialogBackdrop.style.top = "0px";
        this.marginDialogBackdrop.style.width = "100vw";
        this.marginDialogBackdrop.style.height = "100vh";
      },

cloneMarginForDialog(margin, kind) {
        const value = normalizeMargin(margin, kind);
        const copy = createMargin(value.top, value.bottom);
        if (value.left != null) copy.left = value.left;
        if (value.right != null) copy.right = value.right;
        return copy;
      },

saveMarginDialogOriginal(target) {
        if (!target?.item) {
          this.activeMarginDialogOriginal = null;
          return;
        }

        this.activeMarginDialogOriginal = {
          kind: target.kind,
          id: target.item.id,
          margin: this.cloneMarginForDialog(target.item.margin, target.kind)
        };
      },

restoreMarginDialogOriginal() {
        const original = this.activeMarginDialogOriginal;
        if (!original) return;

        const target = this.getActiveMarginTarget();
        if (!target || target.kind !== original.kind || target.item.id !== original.id) return;

        target.item.margin = this.cloneMarginForDialog(original.margin, target.kind);
        this.applyMarginToElement(target);

        if (this.marginDialog) {
          this.marginDialog.querySelectorAll("[data-margin-input]").forEach(input => {
            const side = input.dataset.marginInput;
            input.value = target.item.margin[side];
          });
        }

        this.positionObjectEditOverlay();
        this.positionMarginDialogBackdrop();
        this.updateJsonOutput();
      },

confirmMarginDialog() {
        this.hideMarginDialog();
        this.activeMarginDialogOriginal = null;
        this.exitObjectEditMode();
      },

cancelMarginDialog() {
        this.restoreMarginDialogOriginal();
        this.hideMarginDialog();
        this.activeMarginDialogOriginal = null;
        this.exitObjectEditMode();
      },

showMarginDialog() {
        const target = this.getActiveMarginTarget();
        if (!target) {
          this.hideMarginDialog();
          return;
        }

        const dialog = this.ensureMarginDialog();
        const margin = this.getTargetMargin(target);
        this.saveMarginDialogOriginal(target);
        this.applyMarginToElement(target);

        dialog.querySelector("[data-margin-dialog-title]").textContent = `Margens - ${target.label}`;
        dialog.querySelectorAll("[data-margin-input]").forEach(input => {
          const side = input.dataset.marginInput;
          input.value = margin[side];
        });

        this.positionMarginDialogBackdrop();
        if (this.marginDialogBackdrop) this.marginDialogBackdrop.classList.add("is-visible");
        dialog.classList.add("is-visible");
        this.updateJsonOutput();
      },

hideMarginDialog() {
        if (this.marginDialog) this.marginDialog.classList.remove("is-visible");
        if (this.marginDialogBackdrop) this.marginDialogBackdrop.classList.remove("is-visible");
      },

setActiveMargin(side, value) {
        const validSides = new Set(["top", "bottom"]);
        if (!validSides.has(side)) return;

        const target = this.getActiveMarginTarget();
        if (!target) return;

        const margin = this.getTargetMargin(target);
        margin[side] = Math.max(0, Math.round(Number(value) || 0));
        this.applyMarginToElement(target);

        if (this.marginDialog) {
          const input = this.marginDialog.querySelector(`[data-margin-input="${side}"]`);
          if (input) input.value = margin[side];
        }

        this.positionObjectEditOverlay();
        this.positionMarginDialogBackdrop();
        this.updateJsonOutput();
      },

changeActiveMargin(side, delta) {
        const target = this.getActiveMarginTarget();
        if (!target) return;
        const margin = this.getTargetMargin(target);
        this.setActiveMargin(side, margin[side] + delta);
      },

onMarginDialogInput(event) {
        const side = event.currentTarget.dataset.marginInput;
        this.setActiveMargin(side, event.currentTarget.value);
      },
});
