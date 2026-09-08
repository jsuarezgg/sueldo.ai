import assert from "node:assert/strict";
import test from "node:test";
import worker from "../worker/index.js";

test("serves existing static assets without a fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://example.test/assets/app.js"), {
    ASSETS: {
      fetch: async (request) => {
        calls.push(new URL(request.url).pathname);
        return new Response("asset", { status: 200 });
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("serves the latest Banxico FIX through the same-origin API", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/fx"), {
    BANXICO_FETCH: async () => new Response(`
      <tr class="renglonNon"><td>28/08/2026</td><td>17.0427</td><td>16.9712</td></tr>
    `),
    ASSETS: { fetch: async () => new Response("missing", { status: 404 }) },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    rate: 17.0427,
    date: "2026-08-28",
    source: "Banco de México",
    series: "FIX",
  });
});

test("preserves a real 404 for an unknown HTML route", async () => {
  const calls = [];
  const response = await worker.fetch(
    new Request("https://example.test/flow/step-two?source=share", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async (request) => {
          const url = new URL(request.url);
          calls.push(url.pathname + url.search);
          return new Response(url.pathname === "/index.html" ? "app" : "missing", {
            status: url.pathname === "/index.html" ? 200 : 404,
          });
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(calls, ["/flow/step-two?source=share"]);
});

test("does not turn missing API or write requests into the app shell", async () => {
  for (const request of [
    new Request("https://example.test/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://example.test/api/missing", { headers: { accept: "text/html" } }),
    new Request("https://example.test/missing", { method: "HEAD", headers: { accept: "text/html" } }),
    new Request("https://example.test/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    let calls = 0;
    const response = await worker.fetch(request, {
      ASSETS: {
        fetch: async () => {
          calls += 1;
          return new Response("missing", { status: 404 });
        },
      },
    });

    assert.equal(response.status, 404);
    assert.equal(calls, 1);
  }
});

test("does not cache an unavailable FIX", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/fx"), {
    BANXICO_FETCH: async () => new Response("unavailable", { status: 503 }),
  });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
