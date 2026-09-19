import assert from "node:assert/strict";
import test from "node:test";
import { compareRequest, MAX_URL_BYTES } from "../server/compare.js";
import { calculateComparison } from "../src/compensation.js";
import { readSharedComparison } from "../src/share-link.js";
import handler from "../api/compare.js";
import { comparisonResponse } from "../server/compare-output.js";
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

test("HTML needs no executable scripts or analytics and all replies discourage storage/indexing", async () => {
  for (const value of [url(), url({ format: "html" }), BASE, `${BASE}?email=private`]) {
    const response = await compareRequest(value);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    const text = await response.text();
    assert.doesNotMatch(text, /analytics\.js|<script[^>]+src=/);
    for (const script of text.matchAll(/<script([^>]*)>/g)) assert.match(script[1], /type="application\/json"/);
  }
  const html = await compareRequest(url({ format: "html" }));
  const text = await html.text();
  assert.match(text, /<pre id="sueldo-result-text">/);
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

test("the public webpage alias returns the same HTML calculation without broad route fallbacks", async () => {
  const requestUrl = url().replace("/api/compare", "/compare");
  const site = await worker.fetch(new Request(requestUrl), {});
  assert.equal(site.headers.get("content-type"), "text/html; charset=utf-8");
  const direct = await compareRequest(`${url()}&format=html`);
  assert.equal(await site.text(), await direct.text());
});

function embeddedResult(html) {
  const match = html.match(/<script id="sueldo-result" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(match, "initial HTML must include a named JSON data block");
  return JSON.parse(match[1]);
}

test("initial HTML contains complete API results and faithful summaries without JS", async () => {
  for (const horizon of ["1", "3"]) {
    const requestUrl = url({ horizon, "a.rsu": rsu, "a.monthly_vouchers": 2000, "a.savings_fund_included": true });
    const api = await (await compareRequest(requestUrl)).json();
    const web = await worker.fetch(new Request(requestUrl.replace("/api/compare", "/compare")), {});
    const html = await web.text();
    const body = embeddedResult(html);
    assert.deepEqual(body, api);
    const visible = html.match(/<pre id="sueldo-result-text">([\s\S]*?)<\/pre>/)[1];
    const decoded = visible.replaceAll("&quot;", '"').replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
    assert.deepEqual(JSON.parse(decoded), body, "web readers that strip script elements retain the same complete JSON");
    assert.match(html, /Efectivo neto del periodo/);
    assert.match(web.headers.get("content-security-policy"), /default-src 'none'/);
    for (const key of ["offer_a", "offer_b"]) {
      const summary = body.summary[key];
      const raw = body[key];
      assert.equal(summary.net_cash, raw.regularCash);
      assert.equal(summary.economic_value, raw.economicValue);
      assert.equal(summary.contingent_value, raw.equityNet);
      assert.equal(summary.taxes.total, raw.totalTaxes);
      assert.equal(summary.benefits.vouchers, raw.vouchers);
      assert.equal(summary.benefits.employer_savings_fund, raw.employerSavingsFund);
      assert.deepEqual(summary.benefits.employer_contributions, raw.employerContributions);
      assert.ok(summary.inputs.monthlyPay > 0);
    }
    assert.equal(body.summary.contingent_value_basis, "modeled_vested_equity_net_only");
    assert.equal(body.comparison.contingent_value_difference, body.offer_b.equityNet - body.offer_a.equityNet);
    const shared = readSharedComparison(body.view_url);
    const frontend = JSON.parse(JSON.stringify(calculateComparison(shared.offers, shared.assumptions, shared.horizon)));
    assert.deepEqual(frontend.employee, body.offer_a);
    assert.deepEqual(frontend.contractor, body.offer_b);
  }
});

test("JSON data and visible text cannot execute markup or terminate the JSON element", async () => {
  const warning = '</script><script>alert("test")</script>&<img src=x onerror=alert(1)>';
  const body = { status: "needs_input", methodology_version: "2026.1", tax_year: 2026, warnings: [warning], missing_fields: [] };
  const html = await comparisonResponse(body, 200, true).text();
  assert.deepEqual(embeddedResult(html), body);
  assert.equal([...html.matchAll(/<script/g)].length, 1);
  assert.equal([...html.matchAll(/<\/script>/g)].length, 1);
  assert.doesNotMatch(html, /<img/);
});

test("missing and invalid inputs expose external field paths and directly askable questions", async () => {
  const cases = [
    [{ "b.resico_eligible": undefined }, "needs_input", "b.resico_eligible", "boolean"],
    [{ "a.monthly_pay": null }, "needs_input", "a.monthly_pay", "number"],
    [{ "a.aguinaldo_days": 2 }, "invalid_input", "a.aguinaldo_days", "number"],
    [{ "a.components": [{ category: "bonus", amount: 1000, frequency: "annual", currency: "MXN", taxable: null, cash: true }] }, "needs_input", "a.components.0.taxable", "boolean"],
    [{ "a.rsu": { ...rsu, cadence: 2 } }, "invalid_input", "a.rsu.cadence", "number"],
  ];
  for (const [patch, status, field, type] of cases) {
    const r = await compareRequest(url(patch).replace("/api/compare", "/compare"));
    const body = embeddedResult(await r.text());
    assert.equal(body.status, status);
    const issue = [...(body.missing_fields ?? []), ...(body.errors ?? [])].find((item) => item.field === field);
    assert.ok(issue, field);
    assert.equal(issue.expected.type, type);
    assert.match(issue.question, /¿.+\?/);
    assert.ok(issue.code);
    assert.equal(body.summary, undefined);
  }
  const overLimit = await calculate({ "b.monthly_pay": 500000 });
  assert.ok(overLimit.body.errors.some((issue) => issue.code === "unsupported_tax_profile" && /No confirmes RESICO/.test(issue.question)));
});

test("method and size errors retain structured initial HTML on the web route", async () => {
  for (const [requestUrl, method, status] of [[url().replace("/api/compare", "/compare"), "POST", 405], [`https://sueldo.ai/compare?${"x".repeat(MAX_URL_BYTES)}`, "GET", 414]]) {
    const r = await compareRequest(requestUrl, method);
    assert.equal(r.status, status);
    assert.equal(embeddedResult(await r.text()).status, "invalid_input");
  }
});
