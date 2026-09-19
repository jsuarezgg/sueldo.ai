import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("publishes the source sitemap unchanged", async () => {
  assert.equal(
    await readFile(new URL("../dist/client/sitemap.xml", import.meta.url), "utf8"),
    await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
  );
});

test("publishes analytics and includes it in each tracked HTML page", async () => {
  assert.equal(
    await readFile(new URL("../dist/client/analytics.js", import.meta.url), "utf8"),
    await readFile(new URL("../public/analytics.js", import.meta.url), "utf8"),
  );
  for (const page of ["index", "acerca", "como-usar", "comparar-nomina-contractor-mexico", "metodologia", "privacidad", "terminos"]) {
    const html = await readFile(new URL(`../dist/client/${page}.html`, import.meta.url), "utf8");
    assert.match(html, /<script defer src="\/analytics\.js"><\/script>/, page);
  }
});

test("emits loadable Sites output and the current server implementation", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  const hosting = JSON.parse(await readFile(new URL("../dist/.openai/hosting.json", import.meta.url)));
  assert.deepEqual(hosting, { d1: null, r2: null });
  for (const [source, output] of [
    ["worker/index.js", "server/index.js"],
    ["server/banxico-fix.js", "server/banxico-fix.js"],
    ["server/compare.js", "server/compare.js"],
    ["src/compensation.js", "src/compensation.js"],
    ["src/share-link.js", "src/share-link.js"],
  ]) {
    assert.equal(
      await readFile(new URL(`../dist/${output}`, import.meta.url), "utf8"),
      await readFile(new URL(`../${source}`, import.meta.url), "utf8"),
    );
  }
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(new Request("https://example.test/api/fx"), {
    BANXICO_FETCH: async () => new Response('<tr class="renglonNon"><td>04/09/2026</td><td>16.8748</td></tr>'),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).rate, 16.8748);
  const comparison = await worker.fetch(new Request("https://example.test/api/compare?a.type=payroll&a.monthly_pay=50000&a.currency=MXN&b.type=payroll&b.monthly_pay=60000&b.currency=MXN"), {});
  assert.equal((await comparison.json()).status, "ok");
  await access(new URL("../dist/client/chatgpt.md", import.meta.url));
  const guide = await readFile(new URL("../dist/client/chatgpt.html", import.meta.url), "utf8");
  assert.match(guide, /href="https:\/\/sueldo.ai\/compare\?/);
  assert.doesNotMatch(guide, /analytics\.js/);
});
