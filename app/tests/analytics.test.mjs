import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../public/analytics.js", import.meta.url), "utf8");

function loadAnalytics(origin) {
  const scripts = [];
  const window = { location: { origin } };
  const document = {
    createElement(tag) {
      assert.equal(tag, "script");
      return {};
    },
    head: {
      appendChild(script) {
        assert.equal(window.vaq[0][0], "beforeSend", "privacy hook must precede script loading");
        scripts.push(script);
      },
    },
  };
  runInNewContext(source, { window, document, URL });
  return { window, scripts, beforeSend: window.vaq?.[0][1] };
}

test("loads Vercel analytics only on the public production origins", () => {
  for (const origin of ["https://sueldo.ai", "https://www.sueldo.ai"]) {
    const { scripts } = loadAnalytics(origin);
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].src, "/_vercel/insights/script.js");
    assert.equal(scripts[0].defer, true);
  }

  for (const origin of [
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "https://sueldo-ai-preview.vercel.app",
    "https://example.oaiusercontent.com",
    "https://sueldo.ai.example.com",
    "http://sueldo.ai",
  ]) {
    const { window, scripts } = loadAnalytics(origin);
    assert.equal(scripts.length, 0, origin);
    assert.equal(window.va, undefined, origin);
  }
});

test("page views omit query strings and shared compensation fragments", () => {
  const { beforeSend } = loadAnalytics("https://sueldo.ai");
  for (const path of ["/", "/metodologia", "/privacidad"]) {
    const original = {
      type: "pageview",
      url: `https://sueldo.ai${path}?salary=50000&company=Example#c=synthetic-comparison`,
    };
    const sanitized = beforeSend(original);
    assert.equal(sanitized.url, `https://sueldo.ai${path}`);
    assert.equal(sanitized.type, "pageview");
    assert.match(original.url, /#c=synthetic-comparison$/, "do not alter the shared URL");
  }
});

test("rejects custom events and malformed page URLs", () => {
  const { beforeSend } = loadAnalytics("https://sueldo.ai");
  assert.equal(beforeSend({ type: "event", url: "https://sueldo.ai/", data: { salary: 50000 } }), null);
  assert.equal(beforeSend({ type: "pageview", url: "not a URL" }), null);
});

test("calculator and all six information pages load analytics once", async () => {
  for (const page of [
    "index.html",
    "public/acerca.html",
    "public/como-usar.html",
    "public/comparar-nomina-contractor-mexico.html",
    "public/metodologia.html",
    "public/privacidad.html",
    "public/terminos.html",
  ]) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), "utf8");
    assert.equal((html.match(/<script defer src="\/analytics\.js"><\/script>/g) ?? []).length, 1, page);
    assert.match(html, /<meta name="referrer" content="strict-origin" \/>/, page);
    assert.ok(html.indexOf('name="referrer"') < html.indexOf('src="/analytics.js"'), page);
  }
});
