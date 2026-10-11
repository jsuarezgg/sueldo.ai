import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compileFunction } from "node:vm";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateComparison, initialOffers } from "../src/compensation.js";
import { createShareUrl, readSharedComparison } from "../src/share-link.js";
import { buildShareCardSvg, createShareSummary } from "../src/share-summary.js";

// Exercise the real JSX controls with the existing Node test runner.
const bundled = await build({
  stdin: {
    contents: [
      'export { CaptureView } from "./CaptureView.jsx";',
      'export { ComponentRow } from "./CompensationEditor.jsx";',
      'export { ResultsView } from "./ResultsView.jsx";',
      'export { RsuWorkspace } from "./RsuWorkspace.jsx";',
    ].join("\n"),
    resolveDir: fileURLToPath(new URL("../src/", import.meta.url)),
    loader: "jsx",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["react", "react/*", "react-dom", "react-dom/*", "recharts"],
  mainFields: ["module", "main"],
  jsx: "automatic",
  write: false,
});
const compiled = { exports: {} };
compileFunction(bundled.outputFiles[0].text, ["require", "module", "exports"])(
  createRequire(import.meta.url), compiled, compiled.exports,
);
const { CaptureView, ComponentRow, ResultsView, RsuWorkspace } = compiled.exports;
const assumptions = { fxRate: 18, fxDate: null };
const noop = () => {};

function renderGrant(years, cliffMonth) {
  const offer = {
    ...initialOffers.employee,
    rsu: {
      grantValue: 36000, currency: "USD", cliffMonth, cadence: 3, saleFeeRate: 1,
      allocations: Array.from({ length: years }, (_, index) => ({
        year: index + 1, percent: index === 0 ? 100 : 0,
      })),
    },
  };
  return renderToStaticMarkup(createElement(RsuWorkspace, {
    offer, assumptions, onSave: noop, onCancel: noop,
  }));
}

test("the RSU editor displays exact cliffs and durations outside the old presets", () => {
  for (const [years, cliff] of [[1, 3], [2, 7], [6, 13], [12, 144]]) {
    const html = renderGrant(years, cliff);
    assert.match(html, new RegExp(`<option value="${years}" selected="">${years} ${years === 1 ? "año" : "años"}</option>`));
    assert.match(html, new RegExp(`<input[^>]*max="${years * 12}"[^>]*value="${cliff}"`));
    assert.doesNotMatch(html, /<span>Sin cliff<\/span>/);
  }
  assert.match(renderGrant(3, 0), /<input[^>]*max="36"[^>]*value="0"/);
});

const equipment = {
  id: "equipment", name: "Equipo", category: "reimbursement", amount: 17000,
  frequency: "once", currency: "MXN", taxable: false, cash: false, utilization: 70,
};

test("component controls expose restored cash and utilization assumptions, including zero", () => {
  for (const [cash, utilization] of [[false, 70], [true, 100], [false, 0]]) {
    const html = renderToStaticMarkup(createElement(ComponentRow, {
      component: { ...equipment, cash, utilization }, onChange: noop, onRemove: noop,
    }));
    const cashControl = html.match(/<input[^>]*aria-label="Disponible en efectivo de Equipo"[^>]*>/)?.[0];
    const usageControl = html.match(/<input[^>]*aria-label="Uso previsto de Equipo"[^>]*>/)?.[0];
    assert.ok(cashControl);
    assert.equal(cashControl.includes('checked=""'), cash);
    assert.match(usageControl, new RegExp(`value="${utilization}"`));
    assert.match(usageControl, /min="0"/);
    assert.match(usageControl, /max="100"/);
  }
});

test("editing a restored restricted benefit changes the correct totals and survives sharing again", () => {
  const offers = structuredClone(initialOffers);
  offers.contractor.resicoEligibilityStatus = "eligible";
  offers.employee.components = [equipment];
  const original = readSharedComparison(createShareUrl({ offers, assumptions, horizon: "year" }));
  const before = calculateComparison(original.offers, original.assumptions, original.horizon);
  assert.equal(before.employee.yearResults[0].nonCashComponents, 11900);

  original.offers.employee.components[0] = { ...original.offers.employee.components[0], cash: true, utilization: 50 };
  const restored = readSharedComparison(createShareUrl(original));
  const after = calculateComparison(restored.offers, restored.assumptions, restored.horizon);
  assert.equal(after.employee.yearResults[0].nonCashComponents, 0);
  assert.equal(after.employee.regularCash - before.employee.regularCash, 8500);
  assert.equal(after.employee.economicValue - before.employee.economicValue, -3400);
  assert.equal(restored.offers.employee.components[0].cash, true);
  assert.equal(restored.offers.employee.components[0].utilization, 50);
});

function renderOffersStep(offers) {
  return renderToStaticMarkup(createElement(CaptureView, {
    offers, assumptions: { ...assumptions, fxStatus: "manual" }, step: 0,
    setOffers: noop, setAssumptions: noop, setStep: noop, onCompare: noop, onEditRsu: noop,
  }));
}

test("RESICO eligibility is asked on the first step, only for contractor offers", () => {
  const html = renderOffersStep(structuredClone(initialOffers));
  const radios = html.match(/<input[^>]*name="resico-[a-z]+"[^>]*>/g) ?? [];
  assert.equal(radios.length, 2);
  assert.ok(radios.every((radio) => radio.includes('name="resico-contractor"')));
  // "unconfirmed" stays the unanswered state rather than a preselected option.
  assert.ok(radios.every((radio) => !radio.includes("checked")));

  const overLimit = structuredClone(initialOffers);
  overLimit.contractor.resicoEligibilityStatus = "eligible";
  overLimit.contractor.monthlyPay = 20000;
  assert.match(renderOffersStep(overLimit), /superan el límite de RESICO/);
});

function resultsFor(offers) {
  return renderToStaticMarkup(createElement(ResultsView, {
    offers, assumptions, horizon: "year", setHorizon: noop, onEditOffers: noop, onEditRsu: noop,
  }));
}

test("results omit an empty location and preview the same copy as the PNG", () => {
  const offers = structuredClone(initialOffers);
  offers.contractor.resicoEligibilityStatus = "eligible";
  offers.employee.location = "";
  const html = resultsFor(offers);
  assert.match(html, /<small>Nómina<\/small>/);

  const calculations = calculateComparison(offers, assumptions, "year");
  const svg = buildShareCardSvg(createShareSummary({ offers, calculations, months: 12 }));
  for (const line of svg.match(/>(Mayor valor económico|Más efectivo mensual)[^<]*</g)) {
    assert.ok(html.includes(line), `preview is missing ${line}`);
  }
});
