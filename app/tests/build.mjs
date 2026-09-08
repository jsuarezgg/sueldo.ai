import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("emits loadable Sites output and the current server implementation", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  const hosting = JSON.parse(await readFile(new URL("../dist/.openai/hosting.json", import.meta.url)));
  assert.deepEqual(hosting, { d1: null, r2: null });
  for (const [source, output] of [
    ["worker/index.js", "server/index.js"],
    ["server/banxico-fix.js", "server/banxico-fix.js"],
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
});
