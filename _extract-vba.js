"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const outDir = "D:\\Wordex\\_xlsm_extract";
const ps = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path '${outDir}') { Remove-Item '${outDir}' -Recurse -Force }
[IO.Compression.ZipFile]::ExtractToDirectory('D:\\Wordex\\_tablex_copy.xlsm', '${outDir}')
Get-ChildItem '${outDir}' -Recurse | ForEach-Object { $_.FullName.Replace('${outDir}\\','') }
`;
const script = "D:/Wordex/_extract-vba.ps1";
fs.writeFileSync(script, ps);
console.log(execFileSync("powershell", ["-NoProfile", "-File", script], { encoding: "utf8" }));
fs.unlinkSync(script);
