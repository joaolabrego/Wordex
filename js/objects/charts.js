"use strict";

Object.assign(wordex, {
  createDefaultChartDraft() {
    return createChartObject({
      title: "",
      chartType: "bar",
      categories: ["Bradesco", "Itaú", "Daycoval", "Bamerindus"],
      series: [
        { label: "Série 1", color: "#4472c4", values: [100, 400, 700, 1000] },
        { label: "Série 2", color: "#ed7d31", values: [200, 500, 800, -2000] }
      ]
    });
  },

  getChartDataFields(collectionPath) {
    return (this.getScalarFieldsForDataPath?.(collectionPath || "$") || [])
      .map(field => ({ ...field, path: String(field.path || ""), label: String(field.label || field.path || "") }));
  },

  getChartNumericFields(fields) {
    const numericKinds = new Set(["number", "numeric", "decimal", "integer", "int", "float", "double", "currency", "money"]);
    return fields.filter(field => numericKinds.has(String(field.kind || "").toLowerCase()) ||
      this.isNumericDataNode?.(this.getDataNodeByPath?.(field.path)));
  },

  renderChartFieldOptions(fields, selectedPath, emptyLabel) {
    return `<option value="">${escapeHtml(emptyLabel)}</option>${fields.map(field =>
      `<option value="${escapeHtml(field.path)}" ${field.path === selectedPath ? "selected" : ""}>${escapeHtml(field.label)}</option>`
    ).join("")}`;
  },

  renderChartDialogBody(chart) {
    const series = chart.series || [];
    const sourcePath = chart.dataBinding?.collectionPath || "";
    const collectionOptions = this.getTableDataSourceOptions?.() || [];
    const fields = sourcePath ? this.getChartDataFields(sourcePath) : [];
    const numericFields = this.getChartNumericFields(fields);
    const categoryFields = fields;
    const defaultCategory = categoryFields.find(field => !numericFields.some(item => item.path === field.path)) || categoryFields[0];
    const categoryPath = categoryFields.some(field => field.path === chart.dataBinding?.categoryFieldPath)
      ? chart.dataBinding.categoryFieldPath
      : defaultCategory?.path || "";
    const categoryFieldOptions = this.renderChartFieldOptions(categoryFields, categoryPath, "Selecione o campo de categoria");
    const rows = chart.categories.map((category, rowIndex) => `
      <tr data-chart-row="${rowIndex}">
        <td><input type="text" data-chart-category="${rowIndex}" value="${escapeHtml(category)}" aria-label="Categoria ${rowIndex + 1}"></td>
        ${series.map((item, seriesIndex) => `
          <td><input type="number" step="any" data-chart-value-row="${rowIndex}" data-chart-value-series="${seriesIndex}" value="${Number(item.values[rowIndex]) || 0}" aria-label="${escapeHtml(item.label)} — ${escapeHtml(category)}"></td>
        `).join("")}
        <td><button type="button" data-chart-remove-row="${rowIndex}" aria-label="Remover categoria ${rowIndex + 1}" title="Remover categoria">×</button></td>
      </tr>
    `).join("");
    const sourceOptions = [
      `<option value="" ${sourcePath ? "" : "selected"}>Valores informados manualmente</option>`,
      ...collectionOptions.map(option => `<option value="${escapeHtml(option.path)}" ${option.path === sourcePath ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
    ];
    if (sourcePath && !collectionOptions.some(option => option.path === sourcePath))
      sourceOptions.push(`<option value="${escapeHtml(sourcePath)}" selected>${escapeHtml(sourcePath)} [indisponível]</option>`);

    return `
      <div class="wordex-chart-form">
        <label class="wordex-object-form-row">Título
          <input type="text" data-chart-title value="${escapeHtml(chart.title || "")}" maxlength="120">
        </label>
        <label class="wordex-object-form-row">Orientação
          <select data-chart-type>
            <option value="bar" ${chart.chartType !== "hbar" ? "selected" : ""}>Colunas verticais</option>
            <option value="hbar" ${chart.chartType === "hbar" ? "selected" : ""}>Barras horizontais</option>
          </select>
        </label>
        <section class="wordex-chart-json-source">
          <label class="wordex-object-form-row">Origem dos dados
            <select data-chart-data-source>${sourceOptions.join("")}</select>
          </label>
          ${this.dataSource ? "" : `<p class="wordex-chart-help">Carregue um JSON na área Dados para selecionar uma coleção.</p>`}
          ${sourcePath ? `
            <label class="wordex-object-form-row">Categorias
              <select data-chart-category-field>${categoryFieldOptions}</select>
            </label>
            ${numericFields.length ? "" : `<p class="wordex-chart-help">A coleção selecionada não contém campos numéricos para compor séries.</p>`}
          ` : ""}
        </section>
        <div class="wordex-chart-series-list" data-chart-series-list>
          ${series.map((item, index) => {
            const suggestedField = numericFields[index]?.path || "";
            const selectedField = numericFields.some(field => field.path === item.dataFieldPath) ? item.dataFieldPath : suggestedField;
            return `
            <div class="wordex-chart-series-editor" data-chart-series="${index}">
              <label>Série ${index + 1}
                <input type="text" data-chart-series-label="${index}" value="${escapeHtml(item.label)}" maxlength="40">
              </label>
              ${sourcePath ? `<label>Campo numérico
                <select data-chart-series-field="${index}">${this.renderChartFieldOptions(numericFields, selectedField, "Selecione o campo")}</select>
              </label>` : ""}
              <label>Cor
                <input type="color" data-chart-series-color="${index}" value="${item.color}">
              </label>
              ${series.length > 1 ? `<button type="button" data-chart-remove-series="${index}" title="Remover série" aria-label="Remover série ${index + 1}">×</button>` : ""}
            </div>
          `;}).join("")}
        </div>
        <div class="wordex-chart-data-toolbar">
          <button type="button" data-chart-add-series>Adicionar série</button>
          ${sourcePath ? "" : `<button type="button" data-chart-add-category>Adicionar categoria</button>`}
        </div>
        ${sourcePath ? "" : `<div class="wordex-chart-data-table-wrap">
          <table class="wordex-chart-data-table">
            <thead><tr><th>Categoria</th>${series.map(item => `<th>${escapeHtml(item.label)}</th>`).join("")}<th></th></tr></thead>
            <tbody data-chart-data-rows>${rows}</tbody>
          </table>
        </div>`}
        <p class="wordex-chart-help">${sourcePath ? "O preview e o relatório usarão os valores da coleção selecionada." : "Informe os rótulos e valores. O gráfico será atualizado ao confirmar."}</p>
      </div>
    `;
  },

  readChartDialogDraft(body, source = {}) {
    const seriesInputs = [...body.querySelectorAll("[data-chart-series-label]")];
    const collectionPath = body.querySelector("[data-chart-data-source]")?.value || "";
    const fields = collectionPath ? this.getChartDataFields(collectionPath) : [];
    const numericFields = this.getChartNumericFields(fields);
    const categoryFields = fields;
    const defaultCategory = categoryFields.find(field => !numericFields.some(item => item.path === field.path)) || categoryFields[0];
    const selectedCategory = body.querySelector("[data-chart-category-field]")?.value || "";
    const categoryFieldPath = categoryFields.some(field => field.path === selectedCategory)
      ? selectedCategory
      : defaultCategory?.path || "";
    const categories = collectionPath
      ? (source.categories?.length ? source.categories.map(String) : ["Categoria 1"])
      : [...body.querySelectorAll("[data-chart-category]")].map(input => input.value.trim());
    const series = seriesInputs.map((input, seriesIndex) => {
      const selectedFieldPath = body.querySelector(`[data-chart-series-field="${seriesIndex}"]`)?.value || "";
      const dataFieldPath = collectionPath
        ? (numericFields.some(field => field.path === selectedFieldPath)
            ? selectedFieldPath
            : numericFields[seriesIndex]?.path || "")
        : "";
      const selectedField = numericFields.find(field => field.path === dataFieldPath);
      const currentLabel = input.value.trim();
      const defaultLabel = `Série ${seriesIndex + 1}`;

      return {
        label: collectionPath && selectedField && (!currentLabel || currentLabel === defaultLabel)
          ? selectedField.label
          : currentLabel || defaultLabel,
        color: body.querySelector(`[data-chart-series-color="${seriesIndex}"]`)?.value || "#4472c4",
        dataFieldPath,
        values: collectionPath ? [] : categories.map((_, rowIndex) => {
          const value = Number(body.querySelector(`[data-chart-value-row="${rowIndex}"][data-chart-value-series="${seriesIndex}"]`)?.value);
          return Number.isFinite(value) ? value : 0;
        })
      };
    });

    return createChartObject({
      ...source,
      title: body.querySelector("[data-chart-title]")?.value || "",
      chartType: body.querySelector("[data-chart-type]")?.value || "bar",
      categories: categories.length ? categories : ["Categoria 1"],
      series: series.length ? series : [{ label: "Série 1", color: "#4472c4", values: [0] }],
      dataBinding: collectionPath ? { collectionPath, categoryFieldPath } : null
    });
  },

  bindChartDialog(body, source = {}) {
    // The dialog body is reused across openings and its innerHTML is replaced
    // after each change. Keep one delegated listener and refresh its source.
    body.__wordexChartDialogSource = source;
    if (body.__wordexChartDialogBound) return;
    body.__wordexChartDialogBound = true;

    body.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button) return;

      const currentSource = body.__wordexChartDialogSource || {};
      const draft = this.readChartDialogDraft(body, currentSource);
      if (button.matches("[data-chart-add-category]")) {
        draft.categories.push(`Categoria ${draft.categories.length + 1}`);
        draft.series.forEach(item => item.values.push(0));
      } else if (button.matches("[data-chart-remove-row]")) {
        const rowIndex = Number(button.dataset.chartRemoveRow);
        if (draft.categories.length > 1) {
          draft.categories.splice(rowIndex, 1);
          draft.series.forEach(item => item.values.splice(rowIndex, 1));
        }
      } else if (button.matches("[data-chart-add-series]")) {
        const palette = ["#4472c4", "#ed7d31", "#70ad47", "#a5a5a5", "#ffc000", "#5b9bd5"];
        const index = draft.series.length;
        const fields = draft.dataBinding ? this.getChartNumericFields(this.getChartDataFields(draft.dataBinding.collectionPath)) : [];
        const availableField = fields.find(field => !draft.series.some(item => item.dataFieldPath === field.path));
        draft.series.push({
          label: availableField?.label || `Série ${index + 1}`,
          color: palette[index % palette.length],
          dataFieldPath: availableField?.path || "",
          values: draft.categories.map(() => 0)
        });
      } else if (button.matches("[data-chart-remove-series]")) {
        const seriesIndex = Number(button.dataset.chartRemoveSeries);
        if (draft.series.length > 1) draft.series.splice(seriesIndex, 1);
      } else {
        return;
      }

      const dialogBody = this.objectDialogBackdrop?.querySelector("[data-object-dialog-body]");
      if (!dialogBody) return;
      dialogBody.innerHTML = this.renderChartDialogBody(draft);
      this.bindChartDialog(dialogBody, currentSource);
    });

    body.addEventListener("change", event => {
      const target = event.target;
      if (!target.matches?.("[data-chart-data-source], [data-chart-category-field], [data-chart-series-field]")) return;

      if (target.matches("[data-chart-series-field]")) {
        const index = target.dataset.chartSeriesField;
        const labelInput = body.querySelector(`[data-chart-series-label="${index}"]`);
        const selectedField = this.getChartDataFields(body.querySelector("[data-chart-data-source]")?.value || "")
          .find(field => field.path === target.value);
        const defaultLabel = `Série ${Number(index) + 1}`;
        if (labelInput && (!labelInput.value.trim() || labelInput.value.trim() === defaultLabel) && selectedField)
          labelInput.value = selectedField.label;
      }

      const currentSource = body.__wordexChartDialogSource || {};
      const draft = this.readChartDialogDraft(body, currentSource);
      const dialogBody = this.objectDialogBackdrop?.querySelector("[data-object-dialog-body]");
      if (!dialogBody) return;
      dialogBody.innerHTML = this.renderChartDialogBody(draft);
      this.bindChartDialog(dialogBody, currentSource);
    });
  },

  showChartDialog(chart = null) {
    this.showObjectDialog(KINDS.CHART, chart);
  },

  renderChartObject(chart) {
    chart = this.getChartPreviewData?.(chart) || chart;
    const title = String(chart.title || "").trim();
    const categories = Array.isArray(chart.categories) && chart.categories.length ? chart.categories : ["Categoria"];
    const sourceSeries = Array.isArray(chart.series) && chart.series.length
      ? chart.series
      : [{ label: "Série 1", color: "#4472c4", values: categories.map(() => 0) }];
    const palette = ["#4472c4", "#ed7d31", "#70ad47", "#a5a5a5", "#ffc000", "#5b9bd5"];
    const series = sourceSeries.map((item, index) => ({
      ...item,
      label: String(item?.label || `Série ${index + 1}`),
      color: /^#[0-9a-f]{6}$/i.test(String(item?.color || "")) ? item.color : palette[index % palette.length],
      values: categories.map((_, categoryIndex) => {
        const value = Number(item?.values?.[categoryIndex]);
        return Number.isFinite(value) ? value : 0;
      })
    }));
    const width = 480;
    const height = 300;
    const titleMarkup = title
      ? `<text class="wordex-chart-title" x="${width / 2}" y="20" text-anchor="middle">${escapeHtml(title)}</text>`
      : "";
    const legendY = 288;
    const legendEntryWidths = series.map(item => Math.min(150, 28 + String(item.label || "").length * 7) + 12);
    const legendTotalWidth = legendEntryWidths.reduce((sum, item) => sum + item, 0);
    const legendMarkup = series.map((item, index) => {
      const start = Math.max(8, (width - legendTotalWidth) / 2);
      const x = start + legendEntryWidths.slice(0, index).reduce((sum, itemWidth) => sum + itemWidth, 0);
      return `<g transform="translate(${x},${legendY})"><rect width="9" height="9" fill="${escapeHtml(item.color)}"></rect><text x="13" y="8">${escapeHtml(item.label)}</text></g>`;
    }).join("");

    const allValues = series.flatMap(item => categories.map((_, index) => {
      const value = Number(item.values?.[index]);
      return Number.isFinite(value) ? value : 0;
    }));
    let minValue = Math.min(0, ...allValues);
    let maxValue = Math.max(0, ...allValues);
    if (minValue === maxValue) maxValue = minValue + 1;

    let marks = "";
    if (chart.chartType === "hbar") {
      const plot = { left: 104, right: 462, top: 38, bottom: 258 };
      const zeroX = plot.left + ((0 - minValue) / (maxValue - minValue)) * (plot.right - plot.left);
      marks += `<line class="wordex-chart-axis" x1="${zeroX}" y1="${plot.top}" x2="${zeroX}" y2="${plot.bottom}"></line>`;
      const groupHeight = (plot.bottom - plot.top) / categories.length;
      const gap = Math.min(3, groupHeight * 0.08);
      const barHeight = Math.max(3, (groupHeight * 0.76 - gap * (series.length - 1)) / series.length);
      categories.forEach((category, categoryIndex) => {
        const groupTop = plot.top + categoryIndex * groupHeight;
        marks += `<text class="wordex-chart-category" x="${plot.left - 8}" y="${groupTop + groupHeight / 2 + 4}" text-anchor="end">${escapeHtml(category)}</text>`;
        series.forEach((item, seriesIndex) => {
          const value = Number(item.values?.[categoryIndex]) || 0;
          const endX = plot.left + ((value - minValue) / (maxValue - minValue)) * (plot.right - plot.left);
          const y = groupTop + (groupHeight - (barHeight * series.length + gap * (series.length - 1))) / 2 + seriesIndex * (barHeight + gap);
          const x = Math.min(zeroX, endX);
          const barWidth = Math.max(1, Math.abs(endX - zeroX));
          const labelX = value >= 0 ? endX + 4 : endX - 4;
          const labelAnchor = value >= 0 ? "start" : "end";
          marks += `<rect class="wordex-chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${escapeHtml(item.color)}"><title>${escapeHtml(category)} — ${escapeHtml(item.label)}: ${this.formatChartValue(value)}</title></rect><text class="wordex-chart-value" x="${labelX}" y="${y + barHeight / 2 + 3}" text-anchor="${labelAnchor}">${this.formatChartValue(value)}</text>`;
        });
      });
      marks += `<line class="wordex-chart-axis" x1="${plot.left}" y1="${plot.bottom}" x2="${plot.right}" y2="${plot.bottom}"></line>`;
    } else {
      // Reserve a band above the columns for the vertical value labels.
      const plot = { left: 42, right: 468, top: 78, bottom: 246 };
      const zeroY = plot.bottom - ((0 - minValue) / (maxValue - minValue)) * (plot.bottom - plot.top);
      marks += `<line class="wordex-chart-axis" x1="${plot.left}" y1="${zeroY}" x2="${plot.right}" y2="${zeroY}"></line><line class="wordex-chart-grid" x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${plot.bottom}"></line>`;
      const groupWidth = (plot.right - plot.left) / categories.length;
      const gap = Math.min(4, groupWidth * 0.08);
      const barWidth = Math.max(3, (groupWidth * 0.76 - gap * (series.length - 1)) / series.length);
      categories.forEach((category, categoryIndex) => {
        const groupLeft = plot.left + categoryIndex * groupWidth;
        const usedWidth = barWidth * series.length + gap * (series.length - 1);
        series.forEach((item, seriesIndex) => {
          const value = Number(item.values?.[categoryIndex]) || 0;
          const endY = plot.bottom - ((value - minValue) / (maxValue - minValue)) * (plot.bottom - plot.top);
          const x = groupLeft + (groupWidth - usedWidth) / 2 + seriesIndex * (barWidth + gap);
          const y = Math.min(zeroY, endY);
          const barHeight = Math.max(1, Math.abs(endY - zeroY));
          const valueLabel = this.formatChartValue(value);
          const labelLength = Math.min(46, valueLabel.length * 4.3);
          const labelX = x + barWidth / 2;
          // The label sits outside the bar, above its upper edge. For negative
          // values that edge is the zero line; for positive values it is the bar tip.
          const labelY = Math.max(28 + labelLength / 2, y - labelLength / 2 - 4);
          marks += `<rect class="wordex-chart-bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="2" fill="${escapeHtml(item.color)}"><title>${escapeHtml(category)} — ${escapeHtml(item.label)}: ${valueLabel}</title></rect><text class="wordex-chart-value is-vertical" x="${labelX}" y="${labelY}" text-anchor="middle" transform="rotate(-90 ${labelX} ${labelY})">${valueLabel}</text>`;
        });
        marks += `<text class="wordex-chart-category" x="${groupLeft + groupWidth / 2}" y="${plot.bottom + 18}" text-anchor="middle">${escapeHtml(category)}</text>`;
      });
    }

    return `<svg class="wordex-chart-svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || "Gráfico de barras")}" style="display:block;width:100%;height:100%;font-family:Arial,sans-serif"><style>.wordex-chart-title{font-size:14px;font-weight:700;fill:#333}.wordex-chart-category,.wordex-chart-svg g text{font-size:10px;fill:#444}.wordex-chart-value{font-size:8px;fill:#333}.wordex-chart-axis{stroke:#777;stroke-width:1}.wordex-chart-grid{stroke:#c7c7c7;stroke-width:1}</style>${titleMarkup}${marks}${legendMarkup}</svg>`;
  },

  formatChartValue(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
  },

  parseChartNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const text = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
    if (!text) return 0;

    let normalized = text;
    if (text.includes(",") && text.includes(".")) {
      normalized = text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
    } else if (text.includes(",")) {
      normalized = text.replace(",", ".");
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
      normalized = text.replace(/\./g, "");
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  getChartPreviewData(chart) {
    const binding = chart?.dataBinding;
    // JSON-backed charts must be visible as soon as they are configured, also
    // in design mode. `previewMode` controls report/table preview behavior; it
    // should not hide a chart's own bound data in the editor.
    if (!this.dataSource || !binding?.collectionPath || !binding?.categoryFieldPath)
      return chart;

    const items = this.getDataPreviewCollectionItems?.(binding.collectionPath) || [];
    if (!items.length) return chart;

    const resolveField = (item, fieldPath) => {
      const collectionPath = String(binding.collectionPath || "$").replace(/^\$\.?/, "");
      let field = String(fieldPath || "").replace(/^\$\.?/, "");
      if (collectionPath && field.startsWith(`${collectionPath}.`))
        field = field.slice(collectionPath.length + 1);
      else if (field === collectionPath)
        field = "";

      let value = item;
      for (const part of field.split(".").filter(Boolean)) {
        value = this.getDataPreviewChildNode?.(value, part);
        if (value == null) return null;
      }
      return this.unwrapDataPreviewNode?.(value) ?? value;
    };

    const categories = items.map((item, index) => {
      const value = resolveField(item, binding.categoryFieldPath);
      return value == null ? `Categoria ${index + 1}` : String(value);
    });
    const series = (chart.series || []).filter(item => item.dataFieldPath).map(item => ({
      ...item,
      values: items.map(row => {
        return this.parseChartNumber(resolveField(row, item.dataFieldPath));
      })
    }));

    return series.length ? { ...chart, categories, series } : chart;
  }
});
