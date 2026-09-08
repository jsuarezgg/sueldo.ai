import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, appRoot), "utf8");
}

test("homepage publishes canonical metadata, social previews, structured data, and visible crawlable copy", async () => {
  const html = await read("index.html");

  assert.match(html, /<html lang="es-MX">/);
  assert.match(html, /<title>Compara ofertas de trabajo en México \| sueldo\.ai<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sueldo\.ai\/" \/>/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.match(html, /property="og:image" content="https:\/\/sueldo\.ai\/og-image\.png"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /type="text\/markdown"[^>]+href="https:\/\/sueldo\.ai\/uso\.md"/);
  assert.match(html, /<section class="seo-home"/);
  assert.match(html, /Compara el dinero que recibes con el valor completo de cada oferta/);
  assert.match(html, /nómina con nómina, contractor con contractor o una combinación/);
  assert.match(html, /href="\/metodologia"/);

  const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(structuredData, "homepage must include JSON-LD");
  const json = JSON.parse(structuredData[1]);
  assert.equal(json["@context"], "https://schema.org");
  assert.deepEqual(json["@graph"].map((entry) => entry["@type"]), ["WebSite", "SoftwareApplication"]);
});

test("every public information page has a unique canonical URL and an indexable document", async () => {
  const pages = [
    ["como-usar.html", "https://sueldo.ai/como-usar"],
    ["metodologia.html", "https://sueldo.ai/metodologia"],
    ["comparar-nomina-contractor-mexico.html", "https://sueldo.ai/comparar-nomina-contractor-mexico"],
    ["acerca.html", "https://sueldo.ai/acerca"],
    ["privacidad.html", "https://sueldo.ai/privacidad"],
    ["terminos.html", "https://sueldo.ai/terminos"],
  ];

  for (const [file, canonical] of pages) {
    const html = await read(`public/${file}`);
    assert.match(html, /<html lang="es-MX">/, file);
    assert.match(html, /<h1>[^<]+<\/h1>/, file);
    assert.match(html, /<meta name="description" content="[^"]+" \/>/, file);
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), file);
    assert.match(html, /<meta name="robots" content="index,follow/, file);
    assert.match(html, /href="\/"/, file);
  }
});

test("crawler controls and discovery documents agree on the canonical site", async () => {
  const [robots, sitemap, llms, usage] = await Promise.all([
    read("public/robots.txt"),
    read("public/sitemap.xml"),
    read("public/llms.txt"),
    read("public/uso.md"),
  ]);

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^User-agent: OAI-SearchBot$/m);
  assert.match(robots, /^User-agent: PerplexityBot$/m);
  assert.match(robots, /^User-agent: Claude-SearchBot$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, /^Sitemap: https:\/\/sueldo\.ai\/sitemap\.xml$/m);

  for (const url of [
    "https://sueldo.ai/",
    "https://sueldo.ai/como-usar",
    "https://sueldo.ai/metodologia",
    "https://sueldo.ai/comparar-nomina-contractor-mexico",
    "https://sueldo.ai/acerca",
    "https://sueldo.ai/privacidad",
    "https://sueldo.ai/terminos",
    "https://sueldo.ai/uso.md",
  ]) {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), url);
  }

  assert.match(llms, /^# sueldo\.ai$/m);
  assert.match(llms, /https:\/\/sueldo\.ai\/uso\.md/);
  assert.match(usage, /^# Cómo usar sueldo\.ai$/m);
  assert.match(usage, /## Privacidad/);
  assert.match(usage, /## Fuentes oficiales principales/);
});

test("Vercel serves real files and a real 404 instead of rewriting every URL to the app", async () => {
  const config = JSON.parse(await read("vercel.json"));
  const notFound = await read("public/404.html");

  assert.equal(config.cleanUrls, true);
  assert.equal(config.trailingSlash, false);
  assert.equal("rewrites" in config, false);
  assert.match(notFound, /<meta name="robots" content="noindex,follow" \/>/);
  assert.match(notFound, /Esta página no existe/);
});
