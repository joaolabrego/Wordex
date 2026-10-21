"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");
const defaultOutputPath = path.resolve(projectRoot, "..", "wordex.html");

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readLocalAsset(assetPath) {
  const normalizedPath = assetPath.replace(/\//g, path.sep);
  return readUtf8(path.join(projectRoot, normalizedPath));
}

function inlineStyles(html) {
  return html.replace(/<link\b[^>]*>/gi, tag => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;

    const href = tag.match(/\bhref=["']([^"']+\.css)["']/i)?.[1];
    if (!href || /^(?:https?:)?\/\//i.test(href)) return tag;

    const css = readLocalAsset(href);
    return `<style>\n${css}\n  </style>`;
  });
}

function inlineScripts(html) {
  return html.replace(/<script\s+src=["']([^"']+)["']><\/script>/gi, (tag, sourcePath) => {
    if (/^(?:https?:)?\/\//i.test(sourcePath)) return tag;

    const js = readLocalAsset(sourcePath);
    return `<script>\n${js}\n  </script>`;
  });
}

function buildSingleHtml(outputPath = defaultOutputPath) {
  const indexPath = path.join(projectRoot, "wordex.html");
  const input = readUtf8(indexPath);
  const output = inlineScripts(inlineStyles(input));

  fs.writeFileSync(outputPath, output, "utf8");
  return outputPath;
}

if (require.main === module) {
  const outputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultOutputPath;

  const builtPath = buildSingleHtml(outputPath);
  console.log(`Generated ${builtPath}`);
}

module.exports = {
  buildSingleHtml
};
