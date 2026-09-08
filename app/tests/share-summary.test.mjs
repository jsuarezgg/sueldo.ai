import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShareCardSvg,
  createShareSummary,
} from "../src/share-summary.js";

const offers = {
  employee: { name: "Empresa Secreta", relationship: "Nómina" },
  contractor: { name: "Startup Confidencial", relationship: "Nómina" },
};

const calculations = {
  employee: { averageMonthlyCash: 50000, economicValue: 900000 },
  contractor: { averageMonthlyCash: 60000, economicValue: 990000 },
};

test("private share summaries hide names and absolute amounts by default", () => {
  const summary = createShareSummary({ offers, calculations, months: 12 });
  const svg = buildShareCardSvg(summary);

  assert.equal(summary.offerALabel, "Oferta A");
  assert.equal(summary.offerBLabel, "Oferta B");
  assert.equal(summary.economic.percentLabel, "10%");
  assert.equal(summary.cash.percentLabel, "20%");
  assert.doesNotMatch(svg, /Empresa Secreta|Startup Confidencial|\$90,000|\$10,000/);
  assert.match(svg, /Oferta A  vs\.  Oferta B/);
});

test("users can explicitly include offer names and monetary differences", () => {
  const summary = createShareSummary({
    offers,
    calculations,
    months: 36,
    includeDetails: true,
  });
  const svg = buildShareCardSvg(summary);

  assert.equal(summary.periodLabel, "Comparación a 3 años");
  assert.equal(summary.economic.differenceLabel, "$90,000");
  assert.match(svg, /Empresa Secreta  vs\.  Startup Confidencial/);
  assert.match(svg, /\$90,000/);
});

test("equal comparisons produce a neutral result instead of inventing a winner", () => {
  const equalCalculations = {
    employee: { averageMonthlyCash: 50000, economicValue: 900000 },
    contractor: { averageMonthlyCash: 50000, economicValue: 900000 },
  };
  const summary = createShareSummary({ offers, calculations: equalCalculations, months: 12 });

  assert.equal(summary.economic.tied, true);
  assert.equal(summary.economic.winnerLabel, null);
  assert.match(buildShareCardSvg(summary), />≈<\/text>/);
});
