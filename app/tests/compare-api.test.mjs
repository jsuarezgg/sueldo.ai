import assert from "node:assert/strict";
import test from "node:test";
import { compareRequest, MAX_URL_BYTES } from "../server/compare.js";
import { calculateComparison } from "../src/compensation.js";
import { readSharedComparison } from "../src/share-link.js";
import handler from "../api/compare.js";
import worker from "../worker/index.js";

const BASE = "https://sueldo.ai/api/compare";
const INPUT = { "a.type": "payroll", "a.monthly_pay": "120000", "a.currency": "MXN", "b.type": "contractor", "b.monthly_pay": "9000", "b.currency": "USD", "b.resico_eligible": "true", fx_rate: "17", fx_date: "2026-09-17" };
function url(patch = {}) {
  const params = new URLSearchParams(INPUT);
  for (const [key, value] of Object.entries(patch)) value === undefined ? params.delete(key) : params.set(key, typeof value === "object" && value !== null ? JSON.stringify(value) : String(value));
  return `${BASE}?${params}`;
}
async function calculate(patch, fetchImpl) {
  const response = await compareRequest(url(patch), "GET", fetchImpl);
  return { response, body: await response.json() };
}
const rsu = { grantValue: 40000, currency: "USD", cliffMonth: 12, cadence: 3, allocations: [{ year: 1, percent: 25 }, { year: 2, percent: 25 }, { year: 3, percent: 25 }, { year: 4, percent: 25 }] };

test("uses the unchanged frontend engine and share-link round trip for both horizons and relationships", async () => {
  for (const horizon of ["1", "3"]) {
    for (const type of ["payroll", "contractor"]) {
      const { response, body } = await calculate({ horizon, "b.type": type, "a.rsu": rsu, "a.aguinaldo_days": 30, "a.vacation_days": 20, "a.vacation_premium_rate": 50, "b.planned_time_off_days": type === "contractor" ? 15 : undefined, "b.resico_eligible": type === "contractor" ? "true" : undefined,
        "a.components": [{ category: "bonus", amount: 144000, frequency: "annual", currency: "MXN", taxable: true, cash: true }],
      });
      assert.equal(response.status, 200);
      assert.equal(body.status, "ok");
      const shared = readSharedComparison(body.view_url);
      assert.ok(shared);
      const frontend = JSON.parse(JSON.stringify(calculateComparison(shared.offers, shared.assumptions, shared.horizon)));
      assert.deepEqual(body.offer_a, frontend.employee);
      assert.deepEqual(body.offer_b, frontend.contractor);
      assert.equal(body.comparison.regular_cash_difference, frontend.contractor.regularCash - frontend.employee.regularCash);
      assert.equal(body.horizon_months, Number(horizon) * 12);
      assert.equal(body.fx.source, "manual");
      assert.equal(body.fx.verified, false);
    }
  }
});

test("never inherits contractor example costs and reports all defaults", async () => {
  const { body } = await calculate();
  assert.equal(body.normalized_input.offers.contractor.accountant, 0);
  assert.equal(body.normalized_input.offers.contractor.fxFee, 0);
  assert.equal(body.normalized_input.offers.contractor.plannedTimeOffDays, 0);
  assert.ok(body.assumptions.some((item) => item.field === "a.aguinaldo_days" && item.value === 15));
  assert.ok(body.assumptions.some((item) => item.field === "b.accountant" && item.value === 0));
});

test("missing or null values request input rather than inventing eligibility or terms", async () => {
  for (const patch of [{ "b.resico_eligible": undefined }, { "a.monthly_pay": null }, { "a.aguinaldo_days": null }, { "a.components": [{ category: "bonus", amount: 1000, frequency: "annual", currency: "MXN", taxable: null, cash: true }] }, { "a.rsu": { ...rsu, cliffMonth: null } }, { "a.rsu": { ...rsu, allocations: [{ year: 1, percent: null }] } }, { fx_rate: null }]) {
    const { response, body } = await calculate(patch, () => { throw new Error("must not fetch"); });
    assert.equal(response.status, 200, JSON.stringify(patch));
    assert.equal(body.status, "needs_input", JSON.stringify(body));
    assert.ok(body.missing_fields.length > 0);
    assert.equal(body.offer_a, undefined);
  }
  const empty = await compareRequest(BASE);
  assert.equal((await empty.json()).status, "needs_input");
});

test("rejects malformed values, unsupported regimes, and out of bounds combinations", async () => {
  for (const patch of [{ "a.planned_time_off_days": 260 }, { "a.resico_eligible": true }, { "b.resico_eligible": "false" }, { "b.monthly_pay": 500000 }, { "a.monthly_pay": 0 }, { "a.monthly_pay": "1e30" }, { "a.currency": "EUR" }, { "a.aguinaldo_days": 2 }, { "b.annual_ptu": 20 }, { "a.rsu": { ...rsu, allocations: [{ year: 10000000, percent: 100 }] } }, { "a.components": "{" }, { "a.components": [{ amount: 20, name: "private name" }] }, { "a.components": Array(33).fill({}) }, { "a.components": [{ category: "bonus", amount: true, frequency: "annual", currency: "MXN", taxable: true, cash: true }] }, { "a.tenure_years": -1 }, { "a.insurance": "NaN" }, { fx_rate: 0 }, { fx_date: "2026-02-30" }, { v: 2 }, { methodology: "2025.1" }, { format: "xml" }]) {
    const { response, body } = await calculate(patch);
    assert.equal(response.status, 400, JSON.stringify(patch));
    assert.equal(body.status, "invalid_input");
    assert.equal(body.offer_a, undefined);
  }
});

test("unknown fields, duplicate keys and oversized URLs fail without reflecting confidential content", async () => {
  for (const value of [`${url()}&email=secret-person@example.test`, `${url()}&a.monthly_pay=3`, `${url()}&${"z".repeat(MAX_URL_BYTES)}`]) {
    const response = await compareRequest(value);
    assert.ok([400, 414].includes(response.status));
    assert.doesNotMatch(await response.text(), /secret-person/);
  }
});

test("live FX carries actual provenance, times out, and fails closed with actionable error", async () => {
  let signal;
  const { body } = await calculate({ fx_rate: undefined, fx_date: undefined }, async (_url, options) => {
    signal = options.signal;
    return new Response('<tr class="renglonNon"><td>17/09/2026</td><td>17.1234</td></tr>');
  });
  assert.ok(signal instanceof AbortSignal);
  assert.equal(body.status, "ok");
  assert.deepEqual(body.fx, { rate: 17.1234, date: "2026-09-17", source: "Banxico FIX", series: "FIX", verified: true });
  const unavailable = await calculate({ fx_rate: undefined, fx_date: undefined }, async () => { throw new Error("private upstream details"); });
  assert.equal(unavailable.response.status, 503);
  assert.equal(unavailable.body.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(unavailable.body), /private upstream/);
});

test("MXN-only calculations need no upstream and pinned inputs are deterministic", async () => {
  const patch = { "b.currency": "MXN", "b.monthly_pay": 150000, fx_rate: undefined, fx_date: undefined };
  const { body } = await calculate(patch, () => { throw new Error("must not fetch"); });
  assert.equal(body.fx.source, "not_applicable");
  assert.deepEqual(body, (await calculate(patch)).body);
});

test("HTML is readable, has no scripts or analytics, and all replies discourage storage/indexing", async () => {
  for (const value of [url(), url({ format: "html" }), BASE, `${BASE}?email=private`]) {
    const response = await compareRequest(value);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.doesNotMatch(await response.text(), /<script|analytics\.js/);
  }
  const html = await compareRequest(url({ format: "html" }));
  const text = await html.text();
  assert.match(text, /<pre>/);
  assert.match(text, /&quot;status&quot;: &quot;ok&quot;/);
  assert.match(text, /Abrir comparación interactiva/);
});

test("Vercel and Sites return identical results and reject writes", async () => {
  for (const method of ["GET", "POST"]) {
    const requestUrl = url();
    const expected = await compareRequest(requestUrl, method);
    const site = await worker.fetch(new Request(requestUrl, { method }), {});
    const captured = { headers: {} };
    await handler({ url: requestUrl, method }, {
      setHeader: (key, value) => { captured.headers[key] = value; },
      status: (status) => { captured.status = status; return { send: (body) => { captured.body = body; } }; },
    });
    assert.equal(site.status, expected.status);
    assert.equal(captured.status, expected.status);
    const text = await expected.text();
    assert.equal(await site.text(), text);
    assert.equal(captured.body, text);
    assert.match(captured.headers["cache-control"], /no-store/);
  }
});
