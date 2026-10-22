"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..", "..");

function buildFileSources() {
  const html = fs.readFileSync(path.join(projectRoot, "wordex.html"), "utf8");
  const files = new Set();

  for (const match of html.matchAll(/href="([^"]+\.css)"/g)) files.add(match[1]);
  for (const match of html.matchAll(/src="([^"]+\.js)"/g)) files.add(match[1]);
  files.add("js/wordex-paged-template.js");
  files.add("js/wordex-pdf-template.js");

  const sources = {};
  for (const relativePath of files) {
    sources[relativePath] = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  }

  const iconPath = "assets/Images/html5.png";
  sources[iconPath] = "data:image/png;base64," + fs.readFileSync(path.join(projectRoot, iconPath)).toString("base64");

  const outputPath = path.join(projectRoot, "js", "file-sources.js");
  fs.writeFileSync(outputPath, "window.WORDEX_FILE_SOURCES = " + JSON.stringify(sources) + ";\n");
  return outputPath;
}

if (require.main === module) {
  console.log(`Generated ${buildFileSources()}`);
}

module.exports = { buildFileSources };
