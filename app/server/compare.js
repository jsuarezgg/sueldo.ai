import { calculateComparison, defaultStatutoryBenefits, statutoryVacationDays, TAX_YEAR } from "../src/compensation.js";
import { createShareUrl } from "../src/share-link.js";
import { fetchBanxicoFix } from "./banxico-fix.js";

export const METHODOLOGY_VERSION = "2026.1";
export const MAX_URL_BYTES = 8000;
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};
const COSTS = {
  additional_deductions: "additionalDeductions", accountant: "accountant",
  fx_fee: "fxFee", insurance: "insurance", planned_time_off_days: "plannedTimeOffDays",
  paid_vacation_days: "paidVacationDays",
};
const BENEFITS = {
  tenure_years: "tenureYears", aguinaldo_days: "aguinaldoDays", vacation_days: "vacationDays",
  vacation_premium_rate: "vacationPremiumRate", annual_ptu: "annualPtu",
  monthly_vouchers: "monthlyVouchers", savings_fund_included: "savingsFundIncluded",
  annual_medical_insurance: "annualMedicalInsurance",
};
const OFFER_FIELDS = ["type", "monthly_pay", "currency", "resico_eligible", "components", "rsu", ...Object.keys(COSTS), ...Object.keys(BENEFITS)];
const KEYS = new Set(["v", "methodology", "horizon", "format", "fx_rate", "fx_date", ...["a", "b"].flatMap((id) => OFFER_FIELDS.map((field) => `${id}.${field}`))]);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const numeric = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1e9;
const escapeHtml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function reply(body, status, html = false, extraHeaders = {}) {
  const headers = { ...HEADERS, ...extraHeaders, "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8" };
  const json = JSON.stringify(body, null, 2);
  const content = html
    ? `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Comparación sueldo.ai</title></head><body><h1>Resultado de sueldo.ai</h1><p>Metodología ${METHODOLOGY_VERSION}. Importes en MXN. Diferencias: B menos A.</p>${body.view_url ? `<p><a rel="noreferrer" href="${escapeHtml(body.view_url)}">Abrir comparación interactiva</a></p>` : ""}<pre>${escapeHtml(json)}</pre></body></html>`
    : json;
  return new Response(content, { status, headers });
}

// This adapter only normalizes and validates inputs. All compensation arithmetic stays in the shared engine.
export async function compareRequest(urlString, method = "GET", fetchImpl = fetch) {
  const meta = { api_version: 1, tax_year: TAX_YEAR, methodology_version: METHODOLOGY_VERSION, documentation_url: "https://sueldo.ai/ai" };
  if (method !== "GET") return reply({ ...meta, status: "invalid_input", errors: [{ field: "method", reason: "Use GET." }] }, 405, false, { Allow: "GET" });
  if (new TextEncoder().encode(urlString).length > MAX_URL_BYTES) {
    return reply({ ...meta, status: "invalid_input", errors: [{ field: "url", reason: "URL exceeds 8000 bytes. Use fewer components or the interactive calculator." }] }, 414);
  }
  const url = new URL(urlString, "https://sueldo.ai");
  const params = url.searchParams;
  const html = params.get("format") === "html";
  const errors = [];
  const missing = [];
  const assumptions = [];
  const warnings = [{ code: "estimate", message: "Estimación según la metodología publicada; no es asesoría fiscal. Cash, protección, aportaciones patronales y equity no son equivalentes." }];
  const fail = (field, reason) => errors.push({ field, reason });
  const need = (field, reason = "Provide this value or confirm the applicable assumption.") => missing.push({ field, reason });
  for (const key of new Set(params.keys())) {
    if (!KEYS.has(key)) fail("query", "Unknown parameter. Send only documented compensation fields; no names or document text.");
    else if (params.getAll(key).length !== 1) fail(key, "Duplicate parameter.");
  }
  function value(field, fallback, choices) {
    const raw = params.get(field);
    if (raw === null) {
      if (fallback === undefined) need(field);
      else assumptions.push({ field, value: fallback, reason: "Not supplied; explicit calculation default, not an extracted fact." });
      return fallback;
    }
    if (raw === "null" || raw === "") { need(field); return fallback; }
    if (choices) {
      if (!choices.includes(raw)) fail(field, `Allowed: ${choices.join(", ")}.`);
      return raw;
    }
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/u.test(raw) || !numeric(Number(raw))) {
      fail(field, "Expected a finite nonnegative decimal number, at most 1000000000.");
      return fallback;
    }
    return Number(raw);
  }
  function bool(field, fallback) {
    const result = value(field, fallback === undefined ? undefined : String(fallback), ["true", "false"]);
    return result === "true";
  }
  function jsonField(field, fallback) {
    if (!params.has(field)) { assumptions.push({ field, value: fallback, reason: "Not supplied; excluded from calculation." }); return fallback; }
    if (params.get(field) === "null" || params.get(field) === "") { need(field); return fallback; }
    try { return JSON.parse(params.get(field)); } catch { fail(field, "Invalid JSON."); return fallback; }
  }
  function absent(item, key, path) {
    if (item[key] === undefined || item[key] === null) { need(`${path}.${key}`); return true; }
    return false;
  }
  function shape(item, keys, field) {
    if (!object(item) || Object.keys(item).some((key) => !keys.includes(key))) {
      fail(field, "Expected an object containing only documented fields."); return false;
    }
    return true;
  }
  function components(field) {
    const items = jsonField(field, []);
    if (!Array.isArray(items) || items.length > 32) { fail(field, "Expected at most 32 components."); return []; }
    return items.map((item, index) => {
      const path = `${field}.${index}`;
      if (!shape(item, ["category", "amount", "frequency", "currency", "taxable", "cash", "utilization"], path)) return null;
      const required = ["category", "amount", "frequency", "currency", "taxable", "cash"];
      if (required.map((key) => absent(item, key, path)).some(Boolean)) return null;
      if (!numeric(item.amount)) fail(`${path}.amount`, "Expected a nonnegative number.");
      if (!["reimbursement", "bonus", "protection", "other"].includes(item.category)) fail(`${path}.category`, "Unsupported category.");
      if (!["monthly", "quarterly", "semiannual", "annual", "once"].includes(item.frequency)) fail(`${path}.frequency`, "Unsupported frequency.");
      if (!["MXN", "USD"].includes(item.currency)) fail(`${path}.currency`, "Unsupported currency.");
      for (const key of ["taxable", "cash"]) if (typeof item[key] !== "boolean") fail(`${path}.${key}`, "Expected boolean; do not guess tax or cash treatment.");
      if (item.utilization === null) { need(`${path}.utilization`); return null; }
      if (item.utilization !== undefined && (!numeric(item.utilization) || item.utilization > 100)) fail(`${path}.utilization`, "Expected 0 to 100.");
      if (item.utilization === undefined) assumptions.push({ field: `${path}.utilization`, value: 100, reason: "Full utilization assumed." });
      return { ...item, utilization: item.utilization ?? 100, id: `component-${index}`, name: `Compensación ${index + 1}` };
    }).filter(Boolean);
  }
  function rsu(field) {
    const item = jsonField(field, null);
    if (item === null) return null;
    if (!shape(item, ["grantValue", "currency", "cliffMonth", "cadence", "saleFeeRate", "allocations"], field)) return null;
    const required = ["grantValue", "currency", "cliffMonth", "cadence", "allocations"];
    if (required.map((key) => absent(item, key, field)).some(Boolean)) return null;
    if (item.saleFeeRate === null) { need(`${field}.saleFeeRate`); return null; }
    for (const key of ["grantValue", "cliffMonth", "cadence"]) if (!numeric(item[key])) fail(`${field}.${key}`, "Expected nonnegative number.");
    if (item.saleFeeRate !== undefined && (!numeric(item.saleFeeRate) || item.saleFeeRate > 100)) fail(`${field}.saleFeeRate`, "Expected 0 to 100.");
    if (!Array.isArray(item.allocations) || !item.allocations.length || item.allocations.length > 12) { fail(`${field}.allocations`, "Expected 1 to 12 allocations."); return null; }
    for (const [index, allocation] of item.allocations.entries()) {
      const path = `${field}.allocations.${index}`;
      if (!shape(allocation, ["year", "percent"], path)) continue;
      if (["year", "percent"].map((key) => absent(allocation, key, path)).some(Boolean)) continue;
      if (!Number.isInteger(allocation.year) || allocation.year < 1 || allocation.year > 12 || !numeric(allocation.percent) || allocation.percent > 100) fail(path, "Expected integer year 1–12 and percent 0–100.");
    }
    if (item.saleFeeRate === undefined) assumptions.push({ field: `${field}.saleFeeRate`, value: 0, reason: "Sale fees excluded." });
    return { ...item, saleFeeRate: item.saleFeeRate ?? 0 };
  }
  if (params.has("v") && params.get("v") !== "1") fail("v", "Only API version 1 is supported.");
  if (params.has("methodology") && params.get("methodology") !== METHODOLOGY_VERSION) fail("methodology", "Requested methodology is unavailable.");
  if (params.has("format") && !["json", "html"].includes(params.get("format"))) fail("format", "Use json or html.");
  const horizon = value("horizon", "1", ["1", "3"]) === "3" ? "three-years" : "year";
  const offers = {};
  for (const [id, key] of [["a", "employee"], ["b", "contractor"]]) {
    const type = value(`${id}.type`, undefined, ["payroll", "contractor"]);
    const offer = { id: key, name: id === "a" ? "Oferta A" : "Oferta B", location: "México", relationship: type === "payroll" ? "Nómina" : "Contratista independiente", monthlyPay: value(`${id}.monthly_pay`), currency: value(`${id}.currency`, undefined, ["MXN", "USD"]), statutoryBenefits: { ...defaultStatutoryBenefits } };
    for (const [external, internal] of Object.entries(COSTS)) offer[internal] = value(`${id}.${external}`, 0);
    offer.resicoEligibilityStatus = "unconfirmed";
    if (type === "contractor" || params.has(`${id}.resico_eligible`)) {
      offer.resicoEligibilityStatus = bool(`${id}.resico_eligible`) ? "eligible" : "ineligible";
    }
    if (type === "payroll") {
      if (["planned_time_off_days", "paid_vacation_days", "resico_eligible"].some((field) => params.has(`${id}.${field}`))) {
        fail(id, "Contractor eligibility and time-off fields cannot be applied to payroll; use vacation_days.");
      }
      for (const [external, internal] of Object.entries(BENEFITS)) {
        const fallback = internal === "vacationDays" ? statutoryVacationDays(offer.statutoryBenefits.tenureYears) : defaultStatutoryBenefits[internal];
        offer.statutoryBenefits[internal] = internal === "savingsFundIncluded" ? bool(`${id}.${external}`, fallback) : value(`${id}.${external}`, fallback);
      }
    } else if (type === "contractor" && Object.keys(BENEFITS).some((field) => params.has(`${id}.${field}`))) {
      fail(id, "Payroll benefit fields cannot be applied to a contractor; use components and paid_vacation_days.");
    }
    offer.components = components(`${id}.components`);
    offer.rsu = rsu(`${id}.rsu`);
    offers[key] = offer;
  }
  let rate = params.has("fx_rate") ? value("fx_rate") : null;
  const date = params.get("fx_date");
  if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) fail("fx_date", "Expected an actual YYYY-MM-DD date.");
  if (date !== null && !params.has("fx_rate")) fail("fx_date", "Supply fx_rate with fx_date; historical FIX lookup is not supported.");
  if (rate !== null && rate !== undefined && rate <= 0) fail("fx_rate", "FX must be positive.");
  const base = { ...meta, assumptions, warnings };
  if (errors.length) return reply({ ...base, status: "invalid_input", errors, missing_fields: missing }, 400, html);
  if (missing.length) return reply({ ...base, status: "needs_input", missing_fields: missing }, 200, html);
  const usesUsd = Object.values(offers).some((offer) => offer.currency === "USD" || offer.components.some((item) => item.currency === "USD") || offer.rsu?.currency === "USD");
  let fx = { rate: rate ?? 1, date, source: rate === null ? "not_applicable" : "manual", verified: false };
  if (rate === null && usesUsd) {
    try {
      const fix = await fetchBanxicoFix((url, options) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(5000) }));
      fx = { ...fix, source: "Banxico FIX", verified: true };
    } catch {
      return reply({ ...base, status: "unavailable", missing_fields: [{ field: "fx_rate", reason: "Banxico FIX unavailable; retry or provide an explicitly confirmed manual rate." }] }, 503, html);
    }
  }
  if (fx.source === "manual") warnings.push({ code: "manual_fx", message: "Tipo de cambio proporcionado; sueldo.ai no verificó su fuente o fecha." });
  const calculationAssumptions = { fxRate: fx.rate, fxDate: fx.date, fxStatus: fx.verified ? "ready" : "manual", fxManual: !fx.verified };
  const result = calculateComparison(offers, calculationAssumptions, horizon);
  if (!result.valid) {
    const engineErrors = Object.entries({ a: result.employee, b: result.contractor }).flatMap(([id, item]) => item.invalidReasons.map((reason) => ({ field: id, reason })));
    return reply({ ...base, fx, status: "invalid_input", errors: engineErrors }, 400, html);
  }
  const viewUrl = createShareUrl({ offers, assumptions: calculationAssumptions, horizon });
  return reply({ ...base, status: "ok", currency: "MXN", fx, horizon_months: result.months, view_url: viewUrl, comparison: {
    regular_cash_difference: result.contractor.regularCash - result.employee.regularCash,
    economic_value_difference: result.contractor.economicValue - result.employee.economicValue,
    recurring_monthly_cash_difference: result.contractor.recurringMonthlyCash - result.employee.recurringMonthlyCash,
  }, offer_a: result.employee, offer_b: result.contractor, normalized_input: { offers, assumptions: calculationAssumptions, horizon } }, 200, html);
}
