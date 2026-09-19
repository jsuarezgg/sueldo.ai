#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const index = path.join(dist, "client", "index.html");
const worker = path.join(root, "worker", "index.js");
const banxico = path.join(root, "server", "banxico-fix.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [index, worker, banxico, hosting]) {
  if (!existsSync(file)) throw new Error("Missing Sites build input: " + file);
}

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
mkdirSync(path.join(dist, "src"), { recursive: true });
for (const file of ["server/compare.js", "src/compensation.js", "src/share-link.js"]) {
  copyFileSync(path.join(root, file), path.join(dist, file));
}
copyFileSync(worker, path.join(dist, "server", "index.js"));
copyFileSync(banxico, path.join(dist, "server", "banxico-fix.js"));
copyFileSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared Sites build: dist/server/index.js and dist/.openai/hosting.json");

// A plain HTML guide is readable by web tools that do not support Markdown responses.
const guide = readFileSync(path.join(root, "public/ai.md"), "utf8");
const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const example = guide.match(/```text\n(https:\/\/sueldo\.ai\/compare[^\n]+)\n/)[1];
writeFileSync(path.join(dist, "client/ai.html"), `<!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="description" content="Cómo comparar dos ofertas con sueldo.ai desde un asistente de IA, sin instalar apps ni conectar cuentas."><link rel="canonical" href="https://sueldo.ai/ai"><title>Comparar ofertas desde un asistente de IA | sueldo.ai</title></head>
<body><h1>Comparar ofertas desde un asistente de IA</h1><p>Sube tus ofertas en una conversación con acceso web y pide: Compara estos PDFs usando sueldo.ai. Lee primero https://sueldo.ai/ai y usa su endpoint público. Pregunta por lo que falte y no envíes datos personales.</p><p>Los parámetros de cálculo viajan en la URL y pueden quedar en registros. No envíes documentos ni datos identificadores.</p><p><a href="${escape(example)}">Abrir comparación sintética de ejemplo</a> · <a href="/">Calculadora</a> · <a href="/privacidad">Privacidad</a></p><pre style="white-space:pre-wrap">${escape(guide)}</pre></body></html>`);
