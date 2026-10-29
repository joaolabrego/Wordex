"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");

function normalizeAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw || /^(?:https?:|data:|blob:|\/\/)/i.test(raw)) return "";
  return raw.replace(/^\.\//, "").split(/[?#]/)[0];
}

function buildFileSources() {
  const html = fs.readFileSync(path.join(projectRoot, "wordex.html"), "utf8");
  const files = new Set();

  for (const match of html.matchAll(/href="([^"]+\.css[^"]*)"/g)) {
    const relativePath = normalizeAssetPath(match[1]);
    if (relativePath) files.add(relativePath);
  }
  for (const match of html.matchAll(/src="([^"]+\.js[^"]*)"/g)) {
    const relativePath = normalizeAssetPath(match[1]);
    if (relativePath) files.add(relativePath);
  }
  files.add("js/wordex-paged-template.js");
  files.add("js/wordex-pdf-template.js");

  const sources = {};
  for (const relativePath of files) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Asset local ausente no bundle: ${relativePath}`);
    }
    sources[relativePath] = fs.readFileSync(absolutePath, "utf8");
  }

  const outputPath = path.join(projectRoot, "js", "file-sources.js");
  fs.writeFileSync(outputPath, "window.WORDEX_FILE_SOURCES = " + JSON.stringify(sources) + ";\n");
  return outputPath;
}

if (require.main === module) {
  console.log(`Generated ${buildFileSources()}`);
}

module.exports = { buildFileSources };
