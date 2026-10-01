import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { exampleInput, rpcBody, rpcRequest } from "./helpers/mcp.mjs";
import { compareOffers } from "../server/compare-offers.js";

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
  const { default: worker } = await import("../dist/server/index.js");
  const response = await worker.fetch(new Request("https://example.test/api/fx"), {
    BANXICO_FETCH: async () => new Response('<tr class="renglonNon"><td>04/09/2026</td><td>16.8748</td></tr>'),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).rate, 16.8748);

  const discovery = await rpcBody(await worker.fetch(rpcRequest("tools/list"), {}));
  assert.equal(discovery.result.tools[0].name, "compare_offers");
  const comparison = await worker.fetch(rpcRequest("tools/call", {
    name: "compare_offers", arguments: exampleInput(),
  }), {});
  assert.equal(comparison.headers.get("cache-control"), "no-store");
  assert.deepEqual((await rpcBody(comparison)).result.structuredContent, compareOffers(exampleInput()).structuredContent);
  const missing = await worker.fetch(new Request("https://sueldo.ai/missing"), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  });
  assert.equal(missing.status, 404);
});

test("publishes MCP documentation with a working synthetic example", async () => {
  const markdown = await readFile(new URL("../dist/client/mcp.md", import.meta.url), "utf8");
  const example = JSON.parse(markdown.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.equal(compareOffers(example).isError, false);
  assert.match(await readFile(new URL("../dist/client/llms.txt", import.meta.url), "utf8"), /https:\/\/sueldo\.ai\/mcp\.md/);
});
