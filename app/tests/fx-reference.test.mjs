import assert from "node:assert/strict";
import test from "node:test";
import { fetchFixReference } from "../src/fx-reference.js";

const valid = { rate: 16.8748, date: "2026-09-04" };

test("accepts a positive FIX with a real source date", async () => {
  assert.deepEqual(await fetchFixReference({
    fetchImpl: async (url) => {
      assert.equal(url, "/api/fx");
      return Response.json(valid);
    },
  }), valid);
});

test("rejects invalid FIX bodies and non-success responses", async () => {
  for (const body of [null, {}, { ...valid, rate: 0 }, { ...valid, rate: -1 },
    { ...valid, rate: "17" }, { ...valid, date: "invalid" },
    { ...valid, date: "2026-02-30" }, { ...valid, date: "2026-13-01" }]) {
    await assert.rejects(fetchFixReference({ fetchImpl: async () => Response.json(body) }), /invalid/);
  }
  await assert.rejects(fetchFixReference({
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
  }), /503/);
});

function untilAborted(signal) {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

test("times out stalled requests and stalled response bodies", async () => {
  for (const fetchImpl of [
    async (_url, { signal }) => untilAborted(signal),
    async (_url, { signal }) => ({ ok: true, json: () => untilAborted(signal) }),
  ]) {
    await assert.rejects(fetchFixReference({ fetchImpl, timeoutMs: 5 }), { name: "TimeoutError" });
  }
});

test("preserves caller cancellation, including an already aborted signal", async () => {
  for (const alreadyAborted of [false, true]) {
    const controller = new AbortController();
    if (alreadyAborted) controller.abort();
    const request = fetchFixReference({
      signal: controller.signal,
      fetchImpl: async (_url, { signal }) => untilAborted(signal),
    });
    controller.abort();
    await assert.rejects(request, { name: "AbortError" });
  }
});

test("a native body AbortError retains its timeout reason instead of looking cancelled", async () => {
  await assert.rejects(fetchFixReference({
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) => ({
      ok: true,
      json: async () => {
        try {
          await untilAborted(signal);
        } catch {
          throw new DOMException("The operation was aborted", "AbortError");
        }
      },
    }),
  }), { name: "TimeoutError" });
});
