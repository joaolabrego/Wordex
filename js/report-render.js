"use strict";

Object.assign(wordex, {
  renderReportHtml() {
    let rendererWindow = null;
    let timeoutId = null;
    let payloadSent = false;

    try {
      this.syncAllEditableDomToDocument?.();

      const payload = this.buildWordexPagedPayload();
      let rendererUrl;
      let revokeRendererUrl = false;

      if (window.WORDEX_STANDALONE && window.WORDEX_PAGED_TEMPLATE) {
        rendererUrl = URL.createObjectURL(new Blob(
          [this.buildEmbeddedPagedTemplateHtml()],
          { type: "text/html;charset=utf-8" }
        ));
        revokeRendererUrl = true;
      } else {
        rendererUrl = new URL("wordex-paged.html", window.location.href).href;
      }

      const onRendererMessage = event => {
        if (event.source !== rendererWindow || event.data?.type !== "wordex-paged-ready")
          return;

        window.removeEventListener("message", onRendererMessage);
        clearTimeout(timeoutId);

        if (!rendererWindow || rendererWindow.closed) {
          this.renderStatePanel?.("A página do renderizador foi fechada.", true);
          return;
        }

        payloadSent = true;
        const targetOrigin = event.origin && event.origin !== "null" ? event.origin : "*";
        rendererWindow.postMessage({
          type: "wordex-paged-render",
          payload
        }, targetOrigin);

        this.renderStatePanel?.("Relatório enviado para wordex-paged.");
      };

      // O listener é instalado antes da abertura para não perder o primeiro aviso.
      window.addEventListener("message", onRendererMessage);
      rendererWindow = window.open(rendererUrl, "_blank");

      if (!rendererWindow) {
        window.removeEventListener("message", onRendererMessage);
        throw new Error("O navegador bloqueou a abertura de wordex-paged.");
      }

      timeoutId = setTimeout(() => {
        if (payloadSent) return;
        window.removeEventListener("message", onRendererMessage);
        if (!rendererWindow.closed)
          this.renderStatePanel?.("wordex-paged não respondeu. Verifique se a página está na pasta do Wordex.", true);
      }, 15000);

      if (revokeRendererUrl) {
        setTimeout(() => URL.revokeObjectURL(rendererUrl), 60000);
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.renderStatePanel?.(`Erro ao renderizar relatório: ${error.message}`, true);
      alert(`Erro ao renderizar relatório: ${error.message}`);
    }
  },

  buildEmbeddedPagedTemplateHtml() {
    const template = String(window.WORDEX_PAGED_TEMPLATE || "");
    if (!template) throw new Error("O renderizador paginado não está incorporado neste template.");

    const pdfBootSource = String(window.WORDEX_PDF_TEMPLATE_BOOT_SOURCE || "");
    const pdfBoot = `<script id="wordex-pdf-template-loader"></script>
    <script>(function(){
      window.WORDEX_PDF_TEMPLATE_BOOT_SOURCE = ${JSON.stringify(pdfBootSource).replace(/<\//g, "<\\/")};
      var loader = document.getElementById("wordex-pdf-template-loader");
      var source = String(window.WORDEX_PDF_TEMPLATE_BOOT_SOURCE || "");
      if (!loader || !source) return;
      var boot = document.createElement("script");
      boot.id = "wordex-pdf-template-boot";
      boot.textContent = source;
      loader.replaceWith(boot);
    }());</script>`;

    const replacements = {
      WORDEX_TITLE: this.escapeHtmlText(this.document?.title || "Relatório Wordex"),
      WORDEX_SOURCE_HTML: "",
      WORDEX_PAGEX_CONFIG: "{}",
      WORDEX_PDF_TEMPLATE_BOOT: pdfBoot
    };

    return Object.entries(replacements).reduce(
      (html, [key, value]) => html.split(`@@${key}@@`).join(value),
      template
    );
  },

  escapeHtmlText(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  buildWordexPagedPayload() {
    const page = this.getWordexReportPageConfig();
    const config = {
      pdfTitle: this.document?.title || "Relatório Wordex",
      htmlFileName: `${this.sanitizeReportFileName(this.document?.title || "Relatorio")}.html`,
      pdfFileName: `${this.sanitizeReportFileName(this.document?.title || "Relatorio")}.pdf`,
      pageConfig: page,
      headerTemplateHtml: this.buildWordexReportRegionHtml(SECTION_KIND.HEADER, "header-template"),
      footerTemplateHtml: this.buildWordexReportRegionHtml(SECTION_KIND.FOOTER, "footer-template"),
      watermarkConfig: this.buildWordexReportWatermarkConfig(),
      imageDataUrlMap: {}
    };

    return {
      sourceHtml: this.buildWordexPagedSourceHtml(),
      config
    };
  },

  getWordexReportPageConfig() {
    const format = getPaperFormat(this.document?.paperFormat || this.getSelectedPaperFormatValue?.());
    const orientation = (this.document?.pageOrientation || this.getSelectedPageOrientationValue?.()) === "Landscape" ? "Landscape" : "Portrait";
    const width = orientation === "Landscape" ? format.height : format.width;
    const height = orientation === "Landscape" ? format.width : format.height;
    return {
      width,
      height,
      marginLeftMm: 14,
      marginRightMm: 14,
      marginTopMm: 14,
      marginBottomMm: 14
    };
  },

  buildWordexPagedSourceHtml() {
    const bodyHtml = this.buildWordexReportRegionHtml(SECTION_KIND.BODY, "body-flow");
    return `<div class="document"><div class="region pagex-body"><div class="body-flow">${bodyHtml}</div></div></div>`;
  },

  buildWordexReportRegionHtml(sectionKind, className) {
    const section = this.document?.sections?.find(item => item.sectionKind === sectionKind);
    if (!section) return `<div class="region ${className}"></div>`;

    const oldPreviewMode = this.previewMode;
    this.previewMode = true;
    try {
      let paragraphNumber = 0;
      const html = section.paragraphs.map((entry, index) => {
        if (entry === PAGE_BREAK_CHARACTER) {
          return sectionKind === SECTION_KIND.BODY
            ? '<div class="page-break-character-block" data-page-break-before="true" data-page-break-character="12"></div>'
            : "";
        }
        if (!this.isParagraphEntry(entry)) return "";
        const paragraph = entry;
        const blockKind = paragraph.subparagraphs?.some(subparagraph => subparagraph.contentKind === CONTENT_KIND.OBJECT)
          ? "object-block"
          : "paragraph-block";
        return `<div class="${blockKind}">${this.renderParagraph(section, paragraph, paragraphNumber++)}</div>`;
      }).join("");
      if (className === "body-flow") return this.cleanWordexReportHtml(html);
      return `<div class="region ${className}">${this.cleanWordexReportHtml(html)}</div>`;
    } finally {
      this.previewMode = oldPreviewMode;
    }
  },

  cleanWordexReportHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");

    template.content.querySelectorAll("[contenteditable]").forEach(node => node.removeAttribute("contenteditable"));
    template.content.querySelectorAll("[tabindex]").forEach(node => node.removeAttribute("tabindex"));
    template.content.querySelectorAll(".is-active,.selected-object,.selected-cell,.selected-row-cell,.selected-column-cell,.wordex-range-selected").forEach(node => {
      node.classList.remove("is-active", "selected-object", "selected-cell", "selected-row-cell", "selected-column-cell", "wordex-range-selected");
    });
    template.content.querySelectorAll(".section-label-row,.section-label,.wordex-table-row-hidden-skin").forEach(node => node.remove());
    template.content.querySelectorAll("tr[data-row-visible='false']").forEach(node => node.remove());
    template.content.querySelectorAll(".main-object").forEach(node => node.classList.remove("is-table-edit-mode"));
    template.content.querySelectorAll("table.wordex-table").forEach(node => {
      node.classList.remove("is-table-edit-mode");
      node.classList.add("wordex-paginable-table");
    });

    return template.innerHTML;
  },

  buildWordexReportWatermarkConfig() {
    const watermark = this.document?.watermark;
    if (!watermark || !watermark.src) return null;
    return {
      imageSrc: watermark.src,
      imageName: watermark.fileName || "Marca d'água",
      opacity: Math.min(1, Math.max(0, Number(watermark.opacity) || 0.12)),
      sizePercent: Math.min(200, Math.max(1, Math.round(Number(watermark.sizePercent) || 80)))
    };
  },

  sanitizeReportFileName(name) {
    return String(name || "Relatorio")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "Relatorio";
  }
});
