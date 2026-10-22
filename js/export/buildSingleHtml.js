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
    return `<style data-wordex-embedded-asset="${href}">\n${css}\n  </style>`;
  });
}

function inlineScripts(html) {
  return html.replace(/<script\s+src=["']([^"']+)["']><\/script>/gi, (tag, sourcePath) => {
    if (/^(?:https?:)?\/\//i.test(sourcePath)) return tag;

    const js = readLocalAsset(sourcePath);
    return `<script data-wordex-embedded-asset="${sourcePath}">\n${js.replace(/<\/script/gi, "<\\/script")}\n  </script>`;
  });
}

function inlineTemplateRuntime(html) {
  const pagedTemplate = readLocalAsset("js/wordex-paged-template.js")
    .replace(/<\/script/gi, "<\\/script");
  const pdfTemplate = readLocalAsset("js/wordex-pdf-template.js")
    .replace(/<\/script/gi, "<\\/script");
  const runtime = [
    '<script>window.WORDEX_STANDALONE = true;</script>',
    `<script data-wordex-embedded-asset="js/wordex-paged-template.js">\n${pagedTemplate}\n</script>`,
    `<script data-wordex-embedded-asset="js/wordex-pdf-template.js">\n${pdfTemplate}\n</script>`
  ].join("\n");

  return html.replace(
    /(<script\s+data-wordex-embedded-asset="js\/bootstrap\.js">)/i,
    (_, bootstrapTag) => `${runtime}\n${bootstrapTag}`
  );
}

function inlineLocalImages(html) {
  return html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (tag, before, source, after) => {
    if (/^(?:data:|https?:|blob:|\/\/)/i.test(source)) return tag;
    const assetPath = source.replace(/^\.\//, "");
    const fullPath = path.join(projectRoot, assetPath);
    if (!fs.existsSync(fullPath)) return tag;
    const extension = path.extname(fullPath).toLowerCase();
    const mimeType = extension === ".svg" ? "image/svg+xml" : extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = `data:${mimeType};base64,${fs.readFileSync(fullPath).toString("base64")}`;
    return `${before}${dataUrl}${after}`;
  });
}

function buildSingleHtml(outputPath = defaultOutputPath) {
  const indexPath = path.join(projectRoot, "wordex.html");
  const input = readUtf8(indexPath);
  const output = inlineLocalImages(inlineTemplateRuntime(inlineScripts(inlineStyles(input))));

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
