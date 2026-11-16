// Gera docs/RDM.pdf a partir de docs/rdm/rdm.html usando o Chrome/Edge instalado (modo headless).
// Uso: node docs/rdm/gerar-rdm.mjs --responsavel "Nome Sobrenome" [--validador "Nome"]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const responsavel = arg("responsavel", "Responsável");
const validador = arg("validador", responsavel);

const browsers = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) throw new Error("Chrome/Edge não encontrado.");

const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = fs
  .readFileSync(path.join(here, "rdm.html"), "utf8")
  .replaceAll("{{RESPONSAVEL}}", escape(responsavel))
  .replaceAll("{{VALIDADOR}}", escape(validador));

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rdm-"));
const tmpHtml = path.join(tmpDir, "rdm.html");
fs.writeFileSync(tmpHtml, html);

const output = path.resolve(here, "..", "RDM.pdf");
execFileSync(browser, [
  "--headless=new",
  "--disable-gpu",
  `--user-data-dir=${path.join(tmpDir, "profile")}`,
  "--no-pdf-header-footer",
  `--print-to-pdf=${output}`,
  pathToFileURL(tmpHtml).href,
], { stdio: "ignore" });

fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`RDM gerada em ${output}`);
