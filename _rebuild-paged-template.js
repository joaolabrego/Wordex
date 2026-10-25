"use strict";

const fs = require("fs");
const path = require("path");

const root = "D:/Wordex";
const htmlPath = path.join(root, "wordex-paged.html");
const templatePath = path.join(root, "js", "wordex-paged-template.js");
const sourcesPath = path.join(root, "js", "file-sources.js");

const html = fs.readFileSync(htmlPath, "utf8");
const replaced = html.replace(
  /<script id="wordex-pdf-template-loader"[\s\S]*?<\/script>\s*<script>\s*\(function \(\) \{[\s\S]*?loader\.replaceWith\(boot\);\s*\}\(\)\);\s*<\/script>/,
  "@@WORDEX_PDF_TEMPLATE_BOOT@@"
);

if (replaced === html) {
  throw new Error("Não achei o bloco do template PDF para substituir.");
}
if (!replaced.includes("@@WORDEX_PDF_TEMPLATE_BOOT@@")) {
  throw new Error("O marcador do template PDF sumiu.");
}
if (!replaced.includes("A tabela que não cabe inteira")) {
  throw new Error("A paginação nova não está no HTML de origem.");
}
if (replaced.includes("wordex-pdf-template-loader")) {
  throw new Error("O loader do PDF ainda ficou no template.");
}

const templateSource = "window.WORDEX_PAGED_TEMPLATE = " + JSON.stringify(replaced) + ";\n";
fs.writeFileSync(templatePath, templateSource);

const prefix = "window.WORDEX_FILE_SOURCES = ";
const sourcesText = fs.readFileSync(sourcesPath, "utf8");
if (!sourcesText.startsWith(prefix)) {
  throw new Error("file-sources.js não tem o prefixo esperado.");
}
const sources = JSON.parse(sourcesText.slice(prefix.length).replace(/;\s*$/, ""));
sources["js/wordex-paged-template.js"] = templateSource;
fs.writeFileSync(sourcesPath, prefix + JSON.stringify(sources) + ";\n");

const vm = require("vm");
const sandbox = { window: {} };
vm.runInNewContext(templateSource, sandbox);
const value = sandbox.window.WORDEX_PAGED_TEMPLATE;
if (!value.includes("A tabela que não cabe inteira começa no parágrafo atual")) {
  throw new Error("O template gerado não contém a paginação nova.");
}
if (!value.includes("@@WORDEX_PDF_TEMPLATE_BOOT@@")) {
  throw new Error("O template gerado perdeu o marcador PDF.");
}

console.log("template", templateSource.length, "sources", sources["js/wordex-paged-template.js"].length);
