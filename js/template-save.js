"use strict";

Object.assign(wordex, {
  async saveTemplateHtml() {
    let fileHandle = null;
    let openedPicker = false;

    try {
      this.syncAllEditableDomToDocument?.();

      if (this.savedTemplateFileHandle?.createWritable) {
        fileHandle = this.savedTemplateFileHandle;
      } else if (this.canUseNativeSaveFilePicker()) {
        // Abrir o seletor antes de qualquer await para preservar a ativação do clique.
        fileHandle = await this.pickTemplateHtmlFile(this.getTemplateHtmlFileName());
        openedPicker = true;
      }

      const html = await this.buildStandaloneTemplateHtml();
      const fileName = this.getTemplateHtmlFileName();

      if (fileHandle) {
        try {
          await this.writeTextToFileHandle(fileHandle, html);
        } catch (error) {
          if (error?.name === "AbortError") return;
          this.savedTemplateFileHandle = null;
          if (openedPicker || !this.canUseNativeSaveFilePicker()) throw error;
          await this.promptSaveTemplateHtml(html, fileName);
          return;
        }
        this.savedTemplateFileHandle = fileHandle;
      } else {
        this.downloadTemplateHtml(fileName, html);
      }

      this.renderStatePanel?.(`Template salvo: ${fileName}`);
    } catch (error) {
      if (error?.name === "AbortError") return;

      const message = error?.message || String(error);
      this.renderStatePanel?.(`Erro ao salvar template: ${message}`, true);
      alert(`Erro ao salvar template: ${message}`);
    }
  },

  canUseNativeSaveFilePicker() {
    return window.isSecureContext && typeof window.showSaveFilePicker === "function";
  },

  pickTemplateHtmlFile(fileName) {
    return window.showSaveFilePicker({
      suggestedName: fileName,
      startIn: "downloads",
      types: [{
        description: "HTML Wordex",
        accept: { "text/html": [".html", ".htm"] }
      }]
    });
  },

  async promptSaveTemplateHtml(html, fileName) {
    const handle = await this.pickTemplateHtmlFile(fileName);
    await this.writeTextToFileHandle(handle, html);
    this.savedTemplateFileHandle = handle;
    this.renderStatePanel?.(`Template salvo: ${fileName}`);
  },

  async writeTextToFileHandle(handle, text) {
    const writable = await handle.createWritable();
    await writable.write(String(text || ""));
    await writable.close();
  },

  getTemplateHtmlFileName() {
    let name = String(this.document?.title || "Relatorio").trim();
    name = name.replace(/\.html?$/i, "").replace(/[\\/:*?"<>|]+/g, "_").trim();
    if (!name || /^(wordex|wordex\.html|wordexnew|wordexnew\.html)$/i.test(name)) name = "Relatorio";
    return `${name}.html`;
  },

  async ensureLoadedFileSources() {
    if (window.WORDEX_FILE_SOURCES || location.protocol !== "file:") return;

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/file-sources.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Não encontrei js/file-sources.js ao lado do editor."));
      document.body.appendChild(script);
    });
  },

  async buildStandaloneTemplateHtml() {
    await this.ensureLoadedFileSources();

    const clone = document.documentElement.cloneNode(true);
    const reportTitle = String(this.document?.title || "").trim();
    const titleNode = clone.querySelector("title");
    if (titleNode && reportTitle) titleNode.textContent = reportTitle;

    const savedStateJson = JSON.stringify({
      document: JSON.parse(JSON.stringify(this.document)),
      dataSource: this.dataSource == null ? null : JSON.parse(JSON.stringify(this.dataSource)),
      dataSourceFileName: this.dataSourceFileName,
      savedAt: new Date().toISOString()
    }, null, 2).replace(/</g, "\\u003c");

    clone.querySelector("#wordexSavedDocument")?.remove();
    clone.querySelectorAll('[data-wordex-embedded-asset="js/wordex-paged-template.js"], [data-wordex-embedded-asset="js/wordex-pdf-template.js"]')
      .forEach(node => node.remove());

    const sourceLinks = [...document.querySelectorAll('link[rel="stylesheet"]')];
    const clonedLinks = [...clone.querySelectorAll('link[rel="stylesheet"]')];

    for (let index = 0; index < sourceLinks.length; index++) {
      const source = sourceLinks[index];
      const target = clonedLinks[index];
      if (!target || !this.isLocalTemplateAsset(source.href)) continue;

      const css = await this.readTemplateAsset(source.getAttribute("href") || "", source.href);
      const style = document.createElement("style");
      style.dataset.wordexEmbeddedAsset = source.getAttribute("href") || "";
      style.textContent = css;
      target.replaceWith(style);
    }

    const sourceScripts = [...document.querySelectorAll("script[src]")];
    const clonedScripts = [...clone.querySelectorAll("script[src]")];
    let bootstrapNode = clone.querySelector('[data-wordex-embedded-asset="js/bootstrap.js"]');

    for (let index = 0; index < sourceScripts.length; index++) {
      const source = sourceScripts[index];
      const target = clonedScripts[index];
      const relativeScript = source.getAttribute("src") || "";
      if (!target || !this.isLocalTemplateAsset(source.src)) continue;
      if (/(?:^|\/)file-sources\.js(?:[?#]|$)/i.test(relativeScript)) {
        target.remove();
        continue;
      }

      const scriptSource = await this.readTemplateAsset(relativeScript, source.src);
      const script = document.createElement("script");
      script.dataset.wordexEmbeddedAsset = source.getAttribute("src") || "";
      script.textContent = this.escapeInlineScript(scriptSource);
      target.replaceWith(script);

      if (/\/bootstrap\.js(?:[?#]|$)/i.test(source.src)) bootstrapNode = script;
    }

    if (!bootstrapNode)
      throw new Error("Não encontrei o ponto de inicialização do Wordex para incorporar o template.");

    const readEmbeddedScriptOrAsset = async relativePath => {
      const embedded = document.querySelector(`script[data-wordex-embedded-asset="${relativePath}"]`);
      if (embedded) return embedded.textContent || "";
      return this.readTemplateAsset(relativePath, new URL(relativePath, location.href).href);
    };
    const [pagedTemplateSource, pdfTemplateSource] = await Promise.all([
      readEmbeddedScriptOrAsset("js/wordex-paged-template.js"),
      readEmbeddedScriptOrAsset("js/wordex-pdf-template.js")
    ]);

    const stateScript = document.createElement("script");
    stateScript.id = "wordexSavedDocument";
    stateScript.type = "application/json";
    stateScript.textContent = savedStateJson;

    const pagedScript = document.createElement("script");
    pagedScript.dataset.wordexEmbeddedAsset = "js/wordex-paged-template.js";
    pagedScript.textContent = this.escapeInlineScript(pagedTemplateSource);

    const pdfScript = document.createElement("script");
    pdfScript.dataset.wordexEmbeddedAsset = "js/wordex-pdf-template.js";
    pdfScript.textContent = this.escapeInlineScript(pdfTemplateSource);

    bootstrapNode.before(stateScript, pagedScript, pdfScript);

    await this.inlineLocalImages(clone);
    clone.querySelectorAll([
      ".wordex-object-edit-overlay",
      ".wordex-object-modal-backdrop",
      ".wordex-margin-modal-backdrop",
      ".wordex-dialog-backdrop",
      ".dialog-backdrop"
    ].join(", ")).forEach(node => node.remove());
    clone.querySelectorAll(".selected-object, .selected-cell, .selected-row-cell, .selected-column-cell, .wordex-range-selected, .is-active")
      .forEach(node => node.classList.remove("selected-object", "selected-cell", "selected-row-cell", "selected-column-cell", "wordex-range-selected", "is-active"));

    return "<!DOCTYPE html>\n" + clone.outerHTML;
  },

  isLocalTemplateAsset(url) {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return false;
    }
  },

  rememberedFileSource(relativePath) {
    const key = String(relativePath || "").replace(/^\.\//, "").split(/[?#]/)[0];
    const table = window.WORDEX_FILE_SOURCES;
    if (!table || !Object.prototype.hasOwnProperty.call(table, key)) return null;
    return String(table[key]);
  },

  async readTemplateAsset(relativePath, absoluteUrl) {
    const key = String(relativePath || "").replace(/^\.\//, "").split(/[?#]/)[0];

    if (location.protocol === "file:") {
      const memory = this.rememberedFileSource(key);
      if (memory != null) return memory;
    }

    try {
      if (absoluteUrl) {
        const response = await fetch(absoluteUrl, { credentials: "same-origin" });
        if (response.ok) return response.text();
      }
    } catch (error) {
      // Aberto pelo Explorer, o navegador não deixa reler o disco. A cópia já carregada segue abaixo.
    }

    const memory = this.rememberedFileSource(key);
    if (memory != null) return memory;
    throw new Error(`Não consegui incorporar ${key || "um arquivo"} no template.`);
  },

  escapeInlineScript(source) {
    return String(source || "").replace(/<\/script/gi, "<\\/script");
  },

  async inlineLocalImages(root) {
    const images = [...root.querySelectorAll("img[src]")];

    for (const image of images) {
      const source = image.getAttribute("src") || "";
      const absoluteUrl = new URL(source, location.href);
      if (absoluteUrl.protocol === "data:" || absoluteUrl.protocol === "blob:") continue;

      const rememberedImage = this.rememberedFileSource(source);
      if (rememberedImage && rememberedImage.startsWith("data:")) {
        image.setAttribute("src", rememberedImage);
        continue;
      }

      if (absoluteUrl.origin !== location.origin) continue;

      try {
        const response = await fetch(absoluteUrl.href, { credentials: "same-origin" });
        if (!response.ok) continue;
        const blob = await response.blob();
        image.setAttribute("src", await this.blobToDataUrl(blob));
      } catch {
        // Uma imagem de origem externa não impede o salvamento do template.
      }
    }
  },

  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Não foi possível incorporar uma imagem."));
      reader.readAsDataURL(blob);
    });
  },

  downloadTemplateHtml(fileName, html) {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
});
