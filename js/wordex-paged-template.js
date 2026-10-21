window.WORDEX_PAGED_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@@WORDEX_TITLE@@</title>
    <style id="wordex-report-styles">
/* Wordex: CSS essencial do relatório paginado */
* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Arial, sans-serif;
  color: #222;
  background: white;
}

html {
  height: 100%;
}

body.wordex-generated-report {
  margin: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  background: #d8d8d8;
}

.workspace {
  padding: 0;
}

.document {
  position: relative;
  margin: 0 auto;
  background: white;
  box-shadow: none;
  overflow: hidden;
  box-sizing: border-box;
}

body.wordex-generated-report #wordex-report-source .document {
  width: @@WORDEX_PAGE_WIDTH@@ !important;
  min-height: @@WORDEX_PAGE_MIN_HEIGHT@@;
}

body.wordex-generated-report .document {
  width: auto !important;
  min-height: 0 !important;
  max-width: 100%;
}

.region {
  position: relative;
  box-sizing: border-box;
}

body.wordex-generated-report #wordex-report-source .region {
  padding-top: 4mm;
  padding-bottom: 4mm;
  padding-left: @@WORDEX_PAGE_MARGIN_LEFT@@;
  padding-right: @@WORDEX_PAGE_MARGIN_RIGHT@@;
}

body.wordex-generated-report .pagex-page .region {
  padding: 0 !important;
}

body.wordex-generated-report #wordex-report-source .pagex-body .body-flow,
body.wordex-generated-report .pagex-body .body-flow {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

body.wordex-generated-report .document > .region::before {
  display: none !important;
  content: "" !important;
}

.header-template,
.footer-template {
  height: auto;
  min-height: 0;
  max-height: none;
  overflow: visible;
  background: transparent;
}

.body-flow {
  min-height: 0;
}

.paragraph-block,
.object-block {
  margin: 8px 0;
  position: relative;
  padding: 2px;
}

.object-block {
  display: flow-root;
  min-height: 0;
}

.paragraph {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  gap: 4px;
  min-height: 1.15em;
  line-height: 1.15;
  box-sizing: border-box;
}

.subparagraph {
  position: relative;
  display: flow-root;
  flex: 1 1 0;
  min-width: 0;
  min-height: 1.15em;
  line-height: 1.15;
  white-space: pre-wrap;
  box-sizing: border-box;
  overflow: visible;
}

.subparagraph[data-content-kind="Object"] {
  padding: 0;
  white-space: normal;
}

.wordex-list-items {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 4px 4px 4px 28px;
  color: #222;
  font: inherit;
  line-height: 1.35;
  text-align: left;
}

.wordex-list-items li {
  padding: 1px 2px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.wordex-inline-list[data-justify="true"] > .wordex-list-items > li {
  text-align: justify;
}

.wordex-inline-line {
  display: inline-block;
  box-sizing: border-box;
  white-space: pre;
  overflow: hidden;
  vertical-align: baseline;
}

.wordex-list-items[role="list"] {
  display: block;
}

.wordex-list-items[role="list"] > [role="listitem"] {
  display: list-item;
  padding: 1px 2px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.wordex-inline-list {
  position: relative;
  z-index: 2;
  display: block;
  box-sizing: border-box;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  margin: 0 8px 8px 0;
  padding: 2px;
  border: 1px solid #bfd4ef;
  border-radius: 4px;
  background: #fff;
  color: #222;
}

.wordex-inline-list[data-alignment="left"] {
  margin: 8px auto 8px 0;
}

.wordex-inline-list[data-alignment="right"] {
  margin: 8px 0 8px auto;
}

.wordex-inline-list[data-alignment="left"][data-wrap-text="true"] {
  float: left;
  margin: 0 8px 8px 0;
}

.wordex-inline-list[data-alignment="right"][data-wrap-text="true"] {
  float: right;
  margin: 0 0 8px 8px;
}

.wordex-inline-list[data-alignment="center"] {
  float: none;
  clear: both;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  margin: 8px auto;
}

.wordex-inline-list.wordex-sub-list {
  position: static;
  display: block;
  float: none;
  clear: none;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.wordex-sub-list > .wordex-list-items {
  width: auto;
  max-width: 100%;
  margin: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.textbox-inline {
  position: relative;
  display: flex;
  box-sizing: border-box;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid #b36b00;
  border-radius: 4px;
  background: rgba(255, 255, 255, .88);
  vertical-align: middle;
}

.textbox-inline .textbox-content {
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 4px;
  overflow: auto;
  white-space: pre-wrap;
  font: inherit;
}

.textbox-inline[data-alignment="left"] {
  float: left;
  margin: 0 8px 8px 0;
}

.textbox-inline[data-alignment="right"] {
  float: right;
  margin: 0 0 8px 8px;
}

.textbox-inline[data-alignment="center"] {
  display: flex;
  float: none;
  clear: both;
  width: fit-content;
  margin: 8px auto;
}

.object-area {
  position: relative;
  display: flex;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.object-area[data-object-align="center"] > .main-object {
  margin-left: auto;
  margin-right: auto;
}

.object-area[data-object-align="right"] > .main-object {
  margin-left: auto;
  margin-right: 0;
}

.object-area[data-object-align="left"] > .main-object {
  margin-left: 0;
  margin-right: auto;
}

.main-object {
  position: relative;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  padding: 0;
}

.main-object[data-object-kind="Image"] {
  align-items: stretch;
  justify-content: stretch;
  overflow: hidden;
}

.wordex-rendered-image {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.paragraph::after {
  content: "";
  display: block;
  clear: both;
}

.paragraph.is-empty::before,
.wordex-textbox:empty::before {
  content: "" !important;
}

.dynamic-image-box {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  text-align: center;
  overflow: hidden;
  box-sizing: border-box;
}

body.wordex-generated-report .object-block,
body.wordex-generated-report .paragraph-block {
  overflow: visible;
}

body.wordex-generated-report .dynamic-image-box {
  overflow: visible;
}

.dynamic-image-box img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

.dynamic-image-box strong {
  display: none !important;
}

table.wordex-table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: white;
}

.wordex-table td {
  border: 1px solid #444;
  padding: 5px;
  min-width: 12mm;
  min-height: 7mm;
  vertical-align: top;
}

.wordex-table.wordex-show-gridlines td {
  outline: 1px dotted #8aa9d6;
  outline-offset: -1px;
}

.wordex-textbox {
  display: inline-block;
  max-width: 100%;
  min-width: 8mm;
  min-height: 1.55em;
  padding: 2px 4px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.4);
  color: #222;
  font-size: 12pt;
  line-height: 1.25;
  overflow: auto;
  white-space: pre-wrap;
  text-align: left;
}

[data-align="free"] {
  cursor: default;
}

.wordex-continuous-watermark {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  user-select: none;
  text-align: center;
  overflow: visible;
}

.wordex-continuous-watermark img {
  display: block;
  width: auto;
  height: auto;
  max-height: 80%;
  object-fit: contain;
}

body.wordex-generated-report .wordex-continuous-watermark {
  position: absolute;
  inset: 0;
  left: 0;
  top: 0;
  z-index: 0;
  transform: none;
}

.document-title,
.empty,
.wordex-table tr[data-wordex-row-type] td:first-child::before {
  display: none !important;
}

.region,
.region:hover,
.region.selected,
.paragraph,
.paragraph:hover,
.paragraph:focus,
.paragraph-block,
.object-block,
.paragraph-block.selected-block,
.object-block.selected-block,
.selected-object,
.selected-cell,
.selected-row-cell,
.selected-column-cell,
.wordex-textbox {
  outline: none !important;
  box-shadow: none !important;
  background-image: none !important;
}

body.wordex-generated-report .wordex-atomic-block,
body.wordex-generated-report .wordex-atomic-object {
  break-inside: avoid;
  page-break-inside: avoid;
}

body.wordex-generated-report .wordex-atomic-block {
  display: flow-root;
}

body.wordex-generated-report .wordex-paginable-table {
  break-inside: auto;
  page-break-inside: auto;
}

body.wordex-generated-report .wordex-paginable-table tr,
body.wordex-generated-report .wordex-paginable-table td {
  break-inside: avoid;
  page-break-inside: avoid;
}

body.wordex-generated-report .pagex-body {
  background: transparent;
}

body.wordex-generated-report table.wordex-table {
  background: transparent !important;
}

body.wordex-generated-report table.wordex-table td,
body.wordex-generated-report table.wordex-table th {
  background: transparent;
}

@@WORDEX_PAGE_AT_RULE@@

.wordex-paged-toolbar {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #b8c9de;
  background: linear-gradient(#f4f8fd, #e6eef8);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
  font-family: "Segoe UI", Arial, sans-serif;
}

.wordex-paged-toolbar-title {
  flex: 1 1 auto;
  min-width: 120px;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wordex-paged-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.wordex-paged-status {
  flex: 0 0 100%;
  font-size: 12px;
  color: #555;
  line-height: 1.4;
}

.wordex-paged-status.is-error {
  color: #900;
}

.wordex-paged-stage {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.wordex-paged-toolbar button {
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  background: #f8f8f8;
  padding: 6px 12px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  line-height: 1.2;
}

.wordex-paged-toolbar button.primary {
  background: #eaf2ff;
  border-color: #b8cff5;
  font-weight: 600;
}

.wordex-paged-toolbar button:hover:not(:disabled) {
  background: #eaf2ff;
  border-color: #9ebbe8;
}

.wordex-paged-toolbar button:disabled {
  opacity: .55;
  cursor: wait;
}

@media print {
  .wordex-paged-toolbar {
    display: none !important;
  }

  .wordex-paged-stage {
    overflow: visible !important;
  }
}


</style>
  </head>
  <body class="wordex-generated-report">
    <div class="wordex-paged-toolbar" id="wordex-paged-toolbar">
      <div class="wordex-paged-toolbar-title" id="wordex-paged-title">@@WORDEX_TITLE@@</div>
      <div class="wordex-paged-toolbar-actions">
        <button type="button" id="wordex-paged-save-html" disabled title="Salvar HTML montado">Salvar HTML</button>
        <button type="button" id="wordex-paged-print" disabled title="Imprimir relatório">Imprimir</button>
        <button type="button" id="wordex-paged-pdf" class="primary" disabled title="Gerar PDF">Gerar PDF</button>
        <button type="button" id="wordex-paged-close" title="Fechar">Fechar</button>
      </div>
      <div class="wordex-paged-status" id="wordex-paged-status">Paginando relatório...</div>
    </div>
    <div class="wordex-paged-stage" id="wordex-paged-stage">
      <div id="wordex-report-source" class="workspace">
        @@WORDEX_SOURCE_HTML@@
      </div>
      <div id="wordex-pagex-output"></div>
    </div>
    <script type="application/json"
      id="wordex-pagex-config">@@WORDEX_PAGEX_CONFIG@@</script>
    @@WORDEX_PDF_TEMPLATE_BOOT@@
    <script>
    (function () {
      var config = JSON.parse(document.getElementById("wordex-pagex-config").textContent || "{}");
      var headerTemplateHtml = config.headerTemplateHtml || "";
      var footerTemplateHtml = config.footerTemplateHtml || "";
      var watermarkConfig = config.watermarkConfig || null;
      var pageConfig = config.pageConfig || {};
      var pagedTitleNode = document.getElementById("wordex-paged-title");
      var pagedStatusNode = document.getElementById("wordex-paged-status");
      var pagedTitle = String(config.pdfTitle || document.title || "Relatório Wordex").trim();

      if (pagedTitleNode) {
        pagedTitleNode.textContent = pagedTitle;
      }

      document.title = pagedTitle;

      function setPagedStatus(message, isError) {
        if (!pagedStatusNode) return;
        pagedStatusNode.textContent = message;
        pagedStatusNode.classList.toggle("is-error", !!isError);
      }

      function mm(value) {
        return Math.max(0, Number(value) || 0).toFixed(2).replace(/\\.?0+$/, "") + "mm";
      }

      function htmlToElement(html) {
        if (!html) return null;
        var tpl = document.createElement("template");
        tpl.innerHTML = String(html || "").trim();
        return tpl.content.firstElementChild;
      }

      function waitForImages(node, timeoutMs) {
        var images = node ? Array.prototype.slice.call(node.querySelectorAll("img")) : [];
        if (!images.length) return Promise.resolve();
        var tasks = images.map(function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (resolve) {
            function done() {
              img.removeEventListener("load", done);
              img.removeEventListener("error", done);
              resolve();
            }
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        });
        return Promise.race([
          Promise.allSettled(tasks),
          new Promise(function (resolve) {
            setTimeout(resolve, timeoutMs || 8000);
          })
        ]).then(function () {});
      }

      function waitForResources(node) {
        var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        return Promise.race([
          Promise.allSettled([fontsReady, waitForImages(node, 8000)]),
          new Promise(function (resolve) {
            setTimeout(resolve, 8000);
          })
        ]).then(function () {});
      }

      function addPagexCss() {
        var style = document.createElement("style");
        style.id = "wordex-pagex-style";
        var pageHeight = pageConfig.height || "297mm";
        style.textContent = [
          "body.wordex-generated-report { margin:0; background:#d8d8d8; }",
          "#wordex-report-source { display:none !important; }",
          "#wordex-pagex-output { display:block; }",
          ".pagex-pages { display:flex; flex-direction:column; align-items:center; gap:18px; padding:18px 0; background:#d8d8d8; }",
          ".pagex-page { position:relative; width:" + pageConfig.width + "; height:" + pageHeight + "; background:white; box-shadow:0 0 10px rgba(0,0,0,.35); overflow:hidden; box-sizing:border-box; display:block; }",
          ".pagex-header,.pagex-footer,.pagex-body { position:absolute; z-index:1; box-sizing:border-box; left:" + mm(pageConfig.marginLeftMm) + "; right:" + mm(pageConfig.marginRightMm) + "; min-height:0; min-width:0; margin:0; }",
          ".pagex-header { top:" + mm(pageConfig.marginTopMm) + "; overflow:visible; padding:0; }",
          ".pagex-body { overflow:hidden; }",
          ".pagex-footer { bottom:" + mm(pageConfig.marginBottomMm) + "; overflow:visible; padding:0; }",
          ".pagex-body .body-flow { min-height:0 !important; padding:0 !important; margin:0 !important; }",
          ".pagex-header .header-template,.pagex-footer .footer-template { padding:0 !important; margin:0 !important; border:none !important; background:transparent !important; overflow:visible !important; max-height:none !important; min-height:0 !important; }",
          ".pagex-body .paragraph-block,.pagex-body .object-block { break-inside:avoid; page-break-inside:avoid; }",
          ".pagex-body .wordex-table-block { break-inside:auto; page-break-inside:auto; }",
          ".pagex-header .paragraph-block,.pagex-header .object-block,.pagex-footer .paragraph-block,.pagex-footer .object-block { margin:8px 0; padding:2px; }",
          ".pagex-watermark { position:absolute; inset:0; z-index:2; pointer-events:none; user-select:none; display:flex; align-items:center; justify-content:center; overflow:visible; }",
          ".pagex-watermark img { display:block; width:auto; height:auto; max-width:80%; max-height:80%; object-fit:contain; }",
          "@media print { .pagex-pages { display:block; padding:0; background:white; gap:0; } .pagex-page { box-shadow:none; margin:0; page-break-after:always; } .pagex-page:last-child { page-break-after:auto; } }"
        ].join("\\n");
        document.head.appendChild(style);
      }

      function cleanSource(source) {
        if (!source) return;
        source.querySelectorAll(".wordex-continuous-watermark,.header-template,.footer-template").forEach(function (node) {
          node.remove();
        });
      }

      function createWatermark() {
        if (!watermarkConfig || !watermarkConfig.imageSrc) return null;
        var watermark = document.createElement("div");
        watermark.className = "pagex-watermark";
        watermark.style.opacity = String(Math.max(0, Math.min(1, Number(watermarkConfig.opacity) || 0.12)));
        var sizePercent = Number(watermarkConfig.sizePercent);
        var imgWidth = Number.isFinite(sizePercent) && sizePercent > 0
          ? String(Math.max(5, Math.min(100, sizePercent))) + "%"
          : String(watermarkConfig.width || "80%");
        var img = document.createElement("img");
        img.src = String(watermarkConfig.imageSrc || "");
        img.alt = String(watermarkConfig.imageName || "Marca d'água");
        img.draggable = false;
        img.style.width = imgWidth;
        img.style.maxWidth = imgWidth;
        img.style.maxHeight = "80%";
        watermark.appendChild(img);
        return watermark;
      }

      function createPage(pages) {
        var page = document.createElement("div");
        page.className = "pagex-page";
        var watermark = createWatermark();
        var header = document.createElement("div");
        header.className = "pagex-header";
        var headerEl = htmlToElement(headerTemplateHtml);
        if (headerEl) header.appendChild(headerEl);
        var body = document.createElement("div");
        body.className = "pagex-body";
        var bodyFlow = document.createElement("div");
        bodyFlow.className = "region body-flow";
        body.appendChild(bodyFlow);
        var footer = document.createElement("div");
        footer.className = "pagex-footer";
        var footerEl = htmlToElement(footerTemplateHtml);
        if (footerEl) footer.appendChild(footerEl);
        page.appendChild(header);
        page.appendChild(body);
        page.appendChild(footer);
        if (watermark) page.appendChild(watermark);
        pages.appendChild(page);
        return { page: page, body: body, bodyFlow: bodyFlow };
      }

      function syncPageBodyArea(pageEl) {
        var body = pageEl.querySelector(".pagex-body");
        var header = pageEl.querySelector(".pagex-header");
        var footer = pageEl.querySelector(".pagex-footer");
        if (!body) return;

        void pageEl.offsetHeight;

        var pageRect = pageEl.getBoundingClientRect();
        var headerRect = header ? header.getBoundingClientRect() : null;
        var footerRect = footer ? footer.getBoundingClientRect() : null;
        var topMarginPx = Math.max(0, Number(pageConfig.marginTopMm) || 0) * 96 / 25.4;
        var bottomMarginPx = Math.max(0, Number(pageConfig.marginBottomMm) || 0) * 96 / 25.4;
        var headerBottom = headerRect ? Math.max(topMarginPx, headerRect.bottom - pageRect.top) : topMarginPx;
        var footerTop = footerRect ? Math.min(pageEl.clientHeight - bottomMarginPx, footerRect.top - pageRect.top) : pageEl.clientHeight - bottomMarginPx;
        var available = Math.max(0, footerTop - headerBottom);

        body.style.top = headerBottom + "px";
        body.style.bottom = "auto";
        body.style.height = available + "px";
        body.style.minHeight = "0";
        body.style.maxHeight = available + "px";
      }

      function compactPageBodyArea(pageEl) {
        var body = pageEl && pageEl.querySelector ? pageEl.querySelector(".pagex-body") : null;

        if (!body) {
          return;
        }

        syncPageBodyArea(pageEl);

        var maxHeight = parseFloat(body.style.maxHeight);

        if (!isFinite(maxHeight) || maxHeight <= 0) {
          return;
        }

        var contentHeight = Math.ceil(getBodyVisualBottom(body));

        if (contentHeight <= 0) {
          var flow = body.querySelector(".body-flow");
          contentHeight = flow ? flow.scrollHeight : 0;
        }

        body.style.height = maxHeight + "px";
      }

      function compactAllPageBodyAreas(root) {
        Array.prototype.forEach.call((root || document).querySelectorAll(".pagex-page"), function (pageEl) {
          compactPageBodyArea(pageEl);
        });
      }

      function tightenMainObjectBlockHeights(block) {
        if (!block) {
          return;
        }

        var paragraph = block.querySelector(".paragraph");

        if (!paragraph) {
          return;
        }

        var mainObjects = block.querySelectorAll(".dynamic-image-box, .wordex-textbox");

        if (mainObjects.length !== 1) {
          return;
        }

        var object = mainObjects[0];
        var paragraphRect = paragraph.getBoundingClientRect();
        var objectRect = object.getBoundingClientRect();

        if (!objectRect.height) {
          return;
        }

        var blockY = paragraphRect.height > 0
          ? Math.max(0, Math.round(objectRect.top - paragraphRect.top))
          : (Number.parseInt(object.style.top, 10) || Number.parseInt(object.dataset.blockY, 10) || 0);
        var neededHeight = blockY + Math.ceil(objectRect.height) + 4;

        paragraph.style.minHeight = Math.max(18, neededHeight) + "px";
        block.style.minHeight = "";
      }

      function tightenAllMainObjectBlockHeights(root) {
        if (!root) {
          return;
        }

        Array.prototype.slice.call(root.querySelectorAll(".paragraph-block, .object-block")).forEach(function (block) {
          tightenMainObjectBlockHeights(block);
        });
      }

      function collectNodePaintRects(nodes, rects) {
        Array.prototype.forEach.call(nodes || [], function (node) {
          var rect = node.getBoundingClientRect();

          if (rect.width > 0 || rect.height > 0) {
            rects.push(rect);
          }
        });
      }

      function getBlockLayoutBounds(block) {
        if (!block) {
          return { top: 0, bottom: 0, height: 0 };
        }

        void block.offsetHeight;

        var rects = [block.getBoundingClientRect()];

        collectNodePaintRects(block.querySelectorAll(
          ".dynamic-image-box, .wordex-textbox, table.wordex-table, [data-align='free']"
        ), rects);

        var top = Math.min.apply(null, rects.map(function (rect) { return rect.top; }));
        var bottom = Math.max.apply(null, rects.map(function (rect) { return rect.bottom; }));

        return {
          top: top,
          bottom: bottom,
          height: bottom - top
        };
      }

      function bodyHasBlockOverlap(body) {
        var flow = body.querySelector(".body-flow");

        if (!flow || flow.children.length < 2) {
          return false;
        }

        var children = Array.prototype.slice.call(flow.children);
        var previousMaxBottom = null;

        for (var i = 0; i < children.length; i++) {
          var bounds = getBlockLayoutBounds(children[i]);

          if (previousMaxBottom !== null && bounds.top < previousMaxBottom - 0.5) {
            return true;
          }

          previousMaxBottom = Math.max(previousMaxBottom || bounds.bottom, bounds.bottom);
        }

        return false;
      }

      function getBodyVisualBottom(body) {
        var flow = body.querySelector(".body-flow");

        if (!flow) {
          return 0;
        }

        var bodyRect = body.getBoundingClientRect();
        var bottom = bodyRect.top;

        Array.prototype.slice.call(flow.children).forEach(function (block) {
          var bounds = getBlockLayoutBounds(block);
          bottom = Math.max(bottom, bounds.bottom);
        });

        return bottom - bodyRect.top;
      }

      function overflows(body) {
        void body.offsetHeight;

        if (body.scrollWidth > body.clientWidth + 1) {
          return true;
        }

        var maxHeight = parseFloat(body.style.maxHeight);
        if (!isFinite(maxHeight) || maxHeight <= 0) {
          maxHeight = body.clientHeight;
        }

        if (body.scrollHeight > maxHeight + 0.5) {
          return true;
        }

        if (getBodyVisualBottom(body) > maxHeight + 0.5) {
          return true;
        }

        if (bodyHasBlockOverlap(body)) {
          return true;
        }

        return false;
      }


      function overflowsVertically(body) {
        void body.offsetHeight;

        var maxHeight = parseFloat(body.style.maxHeight);
        if (!isFinite(maxHeight) || maxHeight <= 0) {
          maxHeight = body.clientHeight;
        }

        if (body.scrollHeight > maxHeight + 0.5) {
          return true;
        }

        if (getBodyVisualBottom(body) > maxHeight + 0.5) {
          return true;
        }

        if (bodyHasBlockOverlap(body)) {
          return true;
        }

        return false;
      }

      function appendTableSliceClone(current, clone) {
        current.bodyFlow.appendChild(clone);
        tightenMainObjectBlockHeights(clone);
        return !overflowsVertically(current.body);
      }

      function appendBlockClone(current, clone) {
        current.bodyFlow.appendChild(clone);
        tightenMainObjectBlockHeights(clone);
        return !overflows(current.body);
      }

      function markBlockTooLarge(block) {
        if (!block) {
          return;
        }

        block.classList.add("wordex-pagex-block-too-large");
        block.style.outline = "1px dashed #c00";
      }



      function getTableColumnCount(table) {
        if (!table) return 0;
        var colgroupCount = table.querySelectorAll('colgroup col').length;
        if (colgroupCount > 0) return colgroupCount;

        var max = 0;
        Array.prototype.forEach.call(table.rows || [], function (row) {
          var count = 0;
          Array.prototype.forEach.call(row.cells || [], function (cell) {
            count += Math.max(1, Number(cell.colSpan) || 1);
          });
          max = Math.max(max, count);
        });
        return max;
      }

      function measureTableCellText(cell) {
        if (!cell) return 0;
        return String(cell.textContent || '')
          .replace(/\s+/g, ' ')
          .trim()
          .length;
      }

      function getTableRowKind(row) {
        if (!row || !row.getAttribute) return '';
        return String(
          row.getAttribute('data-row-kind') ||
          row.getAttribute('data-wordex-row-type') ||
          row.dataset && (row.dataset.rowKind || row.dataset.wordexRowType) ||
          ''
        ).trim();
      }

      function calculateTableColumnPercentWidths(table) {
        var colCount = getTableColumnCount(table);
        if (!colCount) return [];

        var maxLengths = Array.from({ length: colCount }, function () { return 1; });

        Array.prototype.forEach.call(table.rows || [], function (row) {
          var kind = getTableRowKind(row);
          var isColumnHeader = kind === 'columnHeader' || kind === 'columnHeaders';
          var colIndex = 0;

          Array.prototype.forEach.call(row.cells || [], function (cell) {
            var span = Math.max(1, Number(cell.colSpan) || 1);
            var textLength = Math.max(1, measureTableCellText(cell));

            /*
              Linhas de grupo/total geralmente usam colspan e não devem distorcer
              a malha das colunas. A linha columnHeader e as células normais de
              dados são as referências para o percentual de cada coluna.
            */
            if (span === 1 || isColumnHeader) {
              var share = Math.max(1, Math.ceil(textLength / span));
              for (var offset = 0; offset < span && colIndex + offset < colCount; offset++) {
                maxLengths[colIndex + offset] = Math.max(maxLengths[colIndex + offset], share);
              }
            }

            colIndex += span;
          });
        });

        var total = maxLengths.reduce(function (sum, value) { return sum + Math.max(1, value); }, 0) || colCount;
        return maxLengths.map(function (value) {
          return Math.max(0.01, (Math.max(1, value) / total) * 100);
        });
      }

      function applyTableColumnPercentWidths(sourceTable, targetTable) {
        if (!sourceTable || !targetTable) return;
        var widths = calculateTableColumnPercentWidths(sourceTable);
        if (!widths.length) return;

        targetTable.querySelectorAll('colgroup').forEach(function (node) {
          node.remove();
        });

        var colgroup = document.createElement('colgroup');
        widths.forEach(function (width, index) {
          var col = document.createElement('col');
          col.setAttribute('data-wordex-paged-col', String(index));
          col.style.width = width.toFixed(4).replace(/\.?0+$/, '') + '%';
          colgroup.appendChild(col);
        });

        targetTable.insertBefore(colgroup, targetTable.firstChild);
        targetTable.style.tableLayout = 'fixed';
        targetTable.style.width = '100%';
      }

      function buildTableBlockRowsSlice(sourceBlock, rowIndexes) {
        var clone = sourceBlock.cloneNode(true);
        var sourceTable = sourceBlock.querySelector("table.wordex-table");
        var targetTable = clone.querySelector("table.wordex-table");

        if (!sourceTable || !targetTable) {
          return clone;
        }

        var rows = Array.prototype.slice.call(sourceTable.rows || []);

        targetTable.innerHTML = "";
        applyTableColumnPercentWidths(sourceTable, targetTable);
        var tbody = document.createElement("tbody");
        targetTable.appendChild(tbody);

        (rowIndexes || []).forEach(function (rowIndex) {
          if (rowIndex >= 0 && rowIndex < rows.length) {
            tbody.appendChild(rows[rowIndex].cloneNode(true));
          }
        });

        clone.style.minHeight = "";
        clone.querySelectorAll(".paragraph, .subparagraph").forEach(function (node) {
          node.style.minHeight = "0";
        });

        return clone;
      }

      function uniqueRowIndexes(rowIndexes) {
        var seen = Object.create(null);
        var result = [];

        (rowIndexes || []).forEach(function (rowIndex) {
          var key = String(rowIndex);
          if (!seen[key]) {
            seen[key] = true;
            result.push(rowIndex);
          }
        });

        return result;
      }

      function isTableDetailKind(kind) {
        return String(kind || "").trim().toLowerCase() === "detail";
      }

      function isTableHeaderKind(kind) {
        kind = String(kind || "").trim().toLowerCase();
        return kind === "tableheader" ||
          kind === "columnheader" ||
          kind === "columnheaders" ||
          kind === "groupheader" ||
          kind === "header" ||
          /header$/.test(kind);
      }

      function isTableRepeatableHeaderRow(row, index) {
        var kind = getTableRowKind(row);
        if (isTableHeaderKind(kind)) return true;

        /* Compatibilidade com tabelas antigas sem kind: a primeira linha age como cabeçalho. */
        return !kind && index === 0;
      }

      function getRowContextKey(row, index) {
        if (!row || !row.getAttribute) return "row-" + index;
        return String(
          row.getAttribute("data-row-context-path") ||
          row.getAttribute("data-wordex-context-path") ||
          row.dataset && (row.dataset.rowContextPath || row.dataset.wordexContextPath) ||
          getTableRowKind(row) ||
          ("row-" + index)
        );
      }

      function getRepeatHeaderSourceIndexes(sourceTable, nextRowIndex) {
        var rows = Array.prototype.slice.call(sourceTable.rows || []);
        var headerIndexes = [];

        /*
          Ao continuar a tabela em uma nova página, a unidade correta não é
          "último header ativo". A tabela é um vetor de linhas montadas: antes
          de imprimir o próximo detail, reimprimimos todos os cabeçalhos
          imprimíveis que aparecem antes dele, preservando a ordem original.

          Isso evita perder headers múltiplos como:
            TESTE 1
            columnHeaders
            TESTE 2
            detail

          A deduplicação por kind era incorreta porque duas linhas header podem
          ter o mesmo kind e ainda assim ambas pertencem ao cabeçalho visual.
        */
        for (var index = 0; index < rows.length && index < nextRowIndex; index++) {
          if (isTableRepeatableHeaderRow(rows[index], index)) {
            headerIndexes.push(index);
          }
        }

        return uniqueRowIndexes(headerIndexes);
      }

      function getTableHeaderRunWithFirstDetail(sourceTable, startIndex) {
        var rows = Array.prototype.slice.call(sourceTable.rows || []);
        var rowIndexes = [];
        var index = startIndex;

        while (index < rows.length && isTableRepeatableHeaderRow(rows[index], index)) {
          rowIndexes.push(index);
          index++;
        }

        if (!rowIndexes.length) {
          return { rowIndexes: [startIndex], nextIndex: startIndex + 1 };
        }

        /* Cabeçalho sem detalhe não deve ficar órfão no fim da página. */
        if (index < rows.length && isTableDetailKind(getTableRowKind(rows[index]))) {
          rowIndexes.push(index);
          index++;
        }

        return { rowIndexes: rowIndexes, nextIndex: index };
      }

      function getTableCandidateRows(sourceTable, rowIndex, isContinuation) {
        var rows = Array.prototype.slice.call(sourceTable.rows || []);
        var row = rows[rowIndex];

        if (!row) {
          return { rowIndexes: [], nextIndex: rowIndex + 1 };
        }

        if (isTableRepeatableHeaderRow(row, rowIndex)) {
          return getTableHeaderRunWithFirstDetail(sourceTable, rowIndex);
        }

        var rowIndexes = [];

        if (isContinuation && isTableDetailKind(getTableRowKind(row))) {
          rowIndexes = rowIndexes.concat(getRepeatHeaderSourceIndexes(sourceTable, rowIndex));
        }

        rowIndexes.push(rowIndex);

        return {
          rowIndexes: uniqueRowIndexes(rowIndexes),
          nextIndex: rowIndex + 1
        };
      }

      function tableRowsFitCurrentPage(sourceBlock, current, rowIndexes) {
        var probe = buildTableBlockRowsSlice(sourceBlock, rowIndexes);
        var fits = appendTableSliceClone(current, probe);
        probe.remove();
        return fits;
      }

      function appendTableRowsChunk(sourceBlock, current, rowIndexes, markIfTooLarge) {
        var chunk = buildTableBlockRowsSlice(sourceBlock, rowIndexes);
        current.bodyFlow.appendChild(chunk);
        tightenMainObjectBlockHeights(chunk);

        if (markIfTooLarge && overflowsVertically(current.body)) {
          markBlockTooLarge(chunk);
        }

        return chunk;
      }

      function paginateTableBlockRows(sourceBlock, pages, current) {
        var sourceTable = sourceBlock.querySelector("table.wordex-table");

        if (!sourceTable || !sourceTable.rows || !sourceTable.rows.length) {
          var fallback = sourceBlock.cloneNode(true);

          if (!appendTableSliceClone(current, fallback)) {
            fallback.remove();

            if (current.bodyFlow.children.length > 0) {
              current = createPage(pages);
              syncPageBodyArea(current.page);
            }

            current.bodyFlow.appendChild(fallback);
            tightenMainObjectBlockHeights(fallback);

            if (overflowsVertically(current.body)) {
              markBlockTooLarge(fallback);
            }
          }

          return current;
        }

        var rowIndex = 0;
        var pageRows = [];
        var safety = 0;

        function currentPageHasCommittedContent() {
          return current && current.bodyFlow && current.bodyFlow.children.length > 0;
        }

        function commitPageRows(markIfTooLarge) {
          if (!pageRows.length) return;
          appendTableRowsChunk(sourceBlock, current, pageRows, markIfTooLarge);
          pageRows = [];
        }

        while (rowIndex < sourceTable.rows.length && safety++ < sourceTable.rows.length * 20) {
          var isContinuation = rowIndex > 0 && pageRows.length === 0;
          var candidate = getTableCandidateRows(sourceTable, rowIndex, isContinuation);
          var candidateRows = candidate.rowIndexes || [rowIndex];
          var nextIndex = Math.max(candidate.nextIndex || (rowIndex + 1), rowIndex + 1);
          var proposedRows = uniqueRowIndexes(pageRows.concat(candidateRows));

          if (tableRowsFitCurrentPage(sourceBlock, current, proposedRows)) {
            pageRows = proposedRows;
            rowIndex = nextIndex;
            continue;
          }

          if (pageRows.length > 0) {
            commitPageRows(false);
            current = createPage(pages);
            syncPageBodyArea(current.page);
            continue;
          }

          if (currentPageHasCommittedContent()) {
            current = createPage(pages);
            syncPageBodyArea(current.page);
            continue;
          }

          /* Uma unidade mínima semanticamente indivisível é maior que a página. */
          pageRows = proposedRows;
          commitPageRows(true);
          rowIndex = nextIndex;
          current = createPage(pages);
          syncPageBodyArea(current.page);
        }

        if (pageRows.length) {
          commitPageRows(false);
        }

        return current;
      }

      function placeBlockOnPages(sourceBlock, pages, current) {
        var isTableBlock = !!(sourceBlock && sourceBlock.querySelector && sourceBlock.querySelector("table.wordex-table"));

        /*
          Tabelas são fluxos internos, não blocos indivisíveis.
          Elas devem entrar no paginador de linhas ANTES da tentativa de
          empurrar o bloco inteiro para a próxima página. Assim, se ainda
          houver espaço para o cabeçalho da tabela e pelo menos uma linha,
          a tabela começa na página atual.
        */
        if (isTableBlock) {
          return paginateTableBlockRows(sourceBlock, pages, current);
        }

        var clone = sourceBlock.cloneNode(true);

        if (appendBlockClone(current, clone)) {
          return current;
        }

        clone.remove();

        if (current.bodyFlow.children.length > 0) {
          current = createPage(pages);
          syncPageBodyArea(current.page);
          clone = sourceBlock.cloneNode(true);

          if (appendBlockClone(current, clone)) {
            return current;
          }

          clone.remove();
        }

        clone = sourceBlock.cloneNode(true);
        current.bodyFlow.appendChild(clone);
        tightenMainObjectBlockHeights(clone);

        if (overflows(current.body)) {
          markBlockTooLarge(clone);
        }

        return current;
      }

      function paginateBlocks(source, output) {
        var originalBody = source.querySelector(".body-flow");
        if (!originalBody) return;
        output.innerHTML = "";
        var pages = document.createElement("div");
        pages.className = "pagex-pages";
        output.appendChild(pages);
        var blocks = Array.prototype.slice.call(originalBody.children).filter(function (node) {
          return node.nodeType === 1;
        });
        var current = createPage(pages);
        syncPageBodyArea(current.page);
        blocks.forEach(function (block) {
          var isPageBreak = block.getAttribute("data-page-break-character") === "12" ||
            block.getAttribute("data-page-break-before") === "true";
          if (isPageBreak) {
            current = createPage(pages);
            syncPageBodyArea(current.page);
            return;
          }
          current = placeBlockOnPages(block, pages, current);
        });
        compactAllPageBodyAreas(pages);
      }

      function applyWordexSystemPageMacros(output) {
        var pages = Array.prototype.slice.call((output || document).querySelectorAll(".pagex-page"));
        var pageCount = pages.length;
        var now = new Date();
        var values = {
          "@Today": now.toLocaleDateString(),
          "@Now": now.toLocaleString(),
          "@DateISO": now.toISOString().slice(0, 10),
          "@Time": now.toLocaleTimeString(),
          "@Year": String(now.getFullYear()),
          "@Month": String(now.getMonth() + 1).padStart(2, "0"),
          "@Day": String(now.getDate()).padStart(2, "0")
        };

        pages.forEach(function (page, index) {
          values["@PageNumber"] = String(index + 1);
          values["@PageCount"] = String(pageCount);
          var walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null);
          var nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          nodes.forEach(function (node) {
            node.nodeValue = node.nodeValue.replace(/\{\{\s*(@[A-Za-z][A-Za-z0-9]*)\s*\}\}/g, function (match, tag) {
              return Object.prototype.hasOwnProperty.call(values, tag) ? values[tag] : match;
            });
          });
        });
      }

      async function startPagex() {
        var source = document.getElementById("wordex-report-source");
        var output = document.getElementById("wordex-pagex-output");
        if (!source || !output) return;
        cleanSource(source);
        addPagexCss();
        await waitForResources(source);
        tightenAllMainObjectBlockHeights(source);
        paginateBlocks(source, output);
        tightenAllMainObjectBlockHeights(output);
        await waitForResources(output);
        tightenAllMainObjectBlockHeights(source);
        paginateBlocks(source, output);
        tightenAllMainObjectBlockHeights(output);
        if (typeof applyWordexSystemPageMacros === "function") {
          applyWordexSystemPageMacros(output);
        }
        document.body.classList.add("wordex-pagex-ready");
        document.documentElement.classList.add("wordex-pagex-ready");
        var pageCount = output.querySelectorAll(".pagex-page").length;
        setPagedStatus(pageCount === 1 ? "1 página pronta." : pageCount + " páginas prontas.");
        var pdfButton = document.getElementById("wordex-paged-pdf");
        var printButton = document.getElementById("wordex-paged-print");
        var saveHtmlButton = document.getElementById("wordex-paged-save-html");
        if (pdfButton) pdfButton.disabled = false;
        if (printButton) printButton.disabled = false;
        if (saveHtmlButton) saveHtmlButton.disabled = false;
      }

      /*WORDEX_TEMPLATE_HELPERS*/

      function sanitizeFileName(name) {
        var value = String(name || "Relatorio.pdf").trim().replace(/[/:*?"<>|]/g, "-");
        value = value.split(String.fromCharCode(92)).join("-");
        return value || "Relatorio.pdf";
      }

      function resolveMappedImageDataUrl(src, map) { return map && map[src] ? map[src] : ""; }
      function rasterizeLoadedImageElement() { return ""; }
      function isProbablyCrossOriginUrl(src) { return /^https?:\/\//i.test(String(src || "")); }
      async function fetchImageAsDataUrl() { return ""; }
      async function loadImageAsDataUrl() { return ""; }
      function omitUnembeddableImage(img, src, skipped) {
        if (src && skipped && skipped.indexOf(src) === -1) skipped.push(src);
        if (!img) return;
        img.removeAttribute("src");
        img.removeAttribute("crossorigin");
        img.style.visibility = "hidden";
        img.style.display = "none";
      }

      function collectReportStyles() {
        var styleNode = document.getElementById("wordex-report-styles");
        return styleNode ? styleNode.textContent + "\\n" : "";
      }

      function readPagexConfig() {
        try {
          return JSON.parse(document.getElementById("wordex-pagex-config").textContent || "{}") || {};
        } catch (error) {
          return {};
        }
      }

      function saveMountedHtml() {
        if (!document.body.classList.contains("wordex-pagex-ready")) {
          alert("Aguarde a paginação terminar.");
          return;
        }

        var pagexOutput = document.getElementById("wordex-pagex-output");
        var config = readPagexConfig();
        var fileName = sanitizeHtmlFileName(config.htmlFileName || "Relatorio.html");
        var html = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
        var blob = new Blob([html], { type: "text/html;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var link = document.createElement("a");

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);

        setPagedStatus("HTML salvo: " + fileName);
      }

      async function preparePagexHtmlForPdf(root, imageDataUrlMap) {
        if (!root) return "";

        var clone = root.cloneNode(true);
        var liveImgs = root.querySelectorAll("img");
        var cloneImgs = clone.querySelectorAll("img");
        var tasks = [];

        for (var i = 0; i < liveImgs.length; i++) {
          (function (liveImg, cloneImg) {
            if (!cloneImg) return;

            tasks.push((async function () {
              var src = String(cloneImg.getAttribute("src") || liveImg.currentSrc || liveImg.src || "").trim();
              var mappedDataUrl = resolveMappedImageDataUrl(src, imageDataUrlMap);

              if (mappedDataUrl) {
                cloneImg.setAttribute("src", mappedDataUrl);
                cloneImg.removeAttribute("crossorigin");
                return;
              }

              var dataUrl = rasterizeLoadedImageElement(liveImg);
              if (dataUrl) {
                cloneImg.setAttribute("src", dataUrl);
                cloneImg.removeAttribute("crossorigin");
                return;
              }

              if (!src || src.indexOf("data:") === 0) return;

              if (isProbablyCrossOriginUrl(src)) {
                var fetchedDataUrl = await fetchImageAsDataUrl(src);
                if (fetchedDataUrl) {
                  cloneImg.setAttribute("src", fetchedDataUrl);
                  cloneImg.removeAttribute("crossorigin");
                  return;
                }

                omitUnembeddableImage(cloneImg, src);
                return;
              }

              var corsDataUrl = await loadImageAsDataUrl(src, true);
              if (corsDataUrl) {
                cloneImg.setAttribute("src", corsDataUrl);
                cloneImg.removeAttribute("crossorigin");
                return;
              }

              omitUnembeddableImage(cloneImg, src);
            })());
          })(liveImgs[i], cloneImgs[i]);
        }

        await Promise.all(tasks);
        return clone.innerHTML;
      }


      function applyTemplatePlaceholders(template, replacements) {
        return Object.keys(replacements || {}).reduce(function (html, key) {
          return html.split("@@" + key + "@@").join(String(replacements[key] == null ? "" : replacements[key]));
        }, String(template || ""));
      }

      function escapeHtmlText(value) {
        return String(value == null ? "" : value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      async function buildPdfViewerHtml(options) {
        if (!document.body.classList.contains("wordex-pagex-ready")) {
          throw new Error("Aguarde a paginação terminar.");
        }

        options = options || {};
        var pagexOutput = document.getElementById("wordex-pagex-output");
        var pagexStyle = document.getElementById("wordex-pagex-style");
        var config = readPagexConfig();
        var pdfTitle = String(config.pdfTitle || document.title || "Relatório Wordex").trim();
        var pagexHtml = "";

        if (pagexOutput) {
          await waitForImages(pagexOutput, 10000);
          pagexHtml = await preparePagexHtmlForPdf(pagexOutput, config.imageDataUrlMap || {});
        }

        /*
          Integração conservadora: evita injetar o template jsPDF bruto dentro de
          outro HTML gerado, que estava produzindo SyntaxError por scripts aninhados.
          Esta aba mostra o HTML paginado pronto e usa a impressão do navegador para PDF.
        */
        return "<!DOCTYPE html>\n" +
          "<html lang=\"pt-BR\">\n" +
          "<head>\n" +
          "  <meta charset=\"UTF-8\" />\n" +
          "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n" +
          "  <title>" + escapeHtmlText(pdfTitle) + "</title>\n" +
          "  <style>" + collectReportStyles() + "\n" + (pagexStyle ? pagexStyle.textContent : "") + "\n" +
          "    body { margin:0; background:#d8d8d8; font-family: Arial, sans-serif; }\n" +
          "    .wordex-pdf-toolbar { display:flex; align-items:center; gap:8px; padding:10px 14px; border-bottom:1px solid #b8c9de; background:linear-gradient(#f4f8fd,#e6eef8); position:sticky; top:0; z-index:1000; }\n" +
          "    .wordex-pdf-toolbar-title { flex:1 1 auto; font-size:13px; font-weight:600; color:#444; }\n" +
          "    .wordex-pdf-toolbar button { border:1px solid #bdbdbd; border-radius:4px; background:#f8f8f8; padding:6px 12px; cursor:pointer; font:inherit; font-size:12px; }\n" +
          "    @media print { .wordex-pdf-toolbar { display:none !important; } body { background:white !important; } .pagex-pages { padding:0 !important; gap:0 !important; background:white !important; } .pagex-page { box-shadow:none !important; margin:0 !important; page-break-after:always; } .pagex-page:last-child { page-break-after:auto; } }\n" +
          "  </style>\n" +
          "</head>\n" +
          "<body class=\"wordex-generated-report\">\n" +
          "  <div class=\"wordex-pdf-toolbar\">\n" +
          "    <div class=\"wordex-pdf-toolbar-title\">" + escapeHtmlText(pdfTitle) + "</div>\n" +
          "    <button type=\"button\" onclick=\"window.print()\">Salvar PDF</button>\n" +
          "    <button type=\"button\" onclick=\"window.close()\">Fechar</button>\n" +
          "  </div>\n" +
          "  <div id=\"wordex-pagex-output\">" + pagexHtml + "</div>\n" +
          "</body>\n" +
          "</html>\n";
      }

      async function openPdfViewerTab() {
        try {
          var html = await buildPdfViewerHtml();
          var blob = new Blob([html], { type: "text/html;charset=utf-8" });
          var url = URL.createObjectURL(blob);
          var opened = window.open(url, "_blank");

          if (!opened) {
            window.location.href = url;
          }
        } catch (error) {
          alert(error.message);
        }
      }

      window.wordexBuildPdfHtml = buildPdfViewerHtml;

      function bindPagedToolbarActions() {
        var saveHtmlButton = document.getElementById("wordex-paged-save-html");
        var printButton = document.getElementById("wordex-paged-print");
        var pdfButton = document.getElementById("wordex-paged-pdf");
        var closeButton = document.getElementById("wordex-paged-close");

        if (saveHtmlButton) {
          saveHtmlButton.addEventListener("click", saveMountedHtml);
        }

        if (printButton) {
          printButton.addEventListener("click", function () {
            if (!document.body.classList.contains("wordex-pagex-ready")) {
              alert("Aguarde a paginação terminar.");
              return;
            }
            window.print();
          });
        }

        if (pdfButton) {
          pdfButton.addEventListener("click", function () {
            openPdfViewerTab().catch(function (error) {
              alert("Erro ao gerar PDF: " + error.message);
            });
          });
        }

        if (closeButton) {
          closeButton.addEventListener("click", function () {
            window.close();
          });
        }
      }

      function initPagedDocument() {
        bindPagedToolbarActions();
        startPagex();
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPagedDocument);
      } else {
        initPagedDocument();
      }
    }());
  </script>
  </body>
</html>
`;
