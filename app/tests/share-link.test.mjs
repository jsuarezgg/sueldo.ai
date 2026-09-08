import assert from "node:assert/strict";
import test from "node:test";

import { calculateComparison, initialOffers } from "../src/compensation.js";
import {
  buildUrlShareData,
  createShareUrl,
  isSharedComparisonHash,
  readSharedComparison,
} from "../src/share-link.js";

const assumptions = {
  fxRate: 17.0427,
  fxDate: "2026-08-28",
  fxManual: false,
  fxStatus: "ready",
};

function detailedOffers() {
  const offers = structuredClone(initialOffers);
  offers.employee.name = "Compañía Águila";
  offers.employee.monthlyPay = 123456.78;
  offers.employee.components = [{
    id: "bonus-1",
    category: "bonus",
    name: "Bono de firma",
    amount: 75000,
    frequency: "once",
    taxable: true,
    cash: true,
    currency: "MXN",
    utilization: 100,
  }];
  offers.employee.rsu = {
    grantValue: 42000,
    currency: "USD",
    cliffMonth: 12,
    cadence: 3,
    saleFeeRate: 1.25,
    allocations: [
      { year: 1, percent: 40 },
      { year: 2, percent: 30 },
      { year: 3, percent: 30 },
    ],
  };
  offers.contractor.name = "Cliente Ñandú";
  offers.contractor.monthlyPay = 6789.12;
  offers.contractor.resicoEligibilityStatus = "eligible";
  offers.contractor.paidVacationDays = 10;
  return offers;
}

function rawShareUrl(offers, overrides = {}) {
  const payload = { v: 1, o: offers, a: { r: assumptions.fxRate }, ...overrides };
  return `#c=${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

test("a self-contained share URL restores offers, assumptions, and horizon", () => {
  const offers = detailedOffers();
  const url = createShareUrl({ offers, assumptions, horizon: "three-years" });
  const restored = readSharedComparison(url);

  assert.match(url, /^https:\/\/sueldo\.ai\/#c=[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(url, /Compañía|123456|Cliente/);
  assert.deepEqual(restored.offers, offers);
  assert.equal(restored.horizon, "three-years");
  assert.deepEqual(restored.assumptions, {
    fxRate: 17.0427,
    fxDate: "2026-08-28",
    fxManual: true,
    fxStatus: "manual",
  });
  assert.deepEqual(
    calculateComparison(restored.offers, restored.assumptions, restored.horizon),
    calculateComparison(offers, assumptions, "three-years"),
  );
});

test("oversized component lists are rejected instead of silently changing compensation", () => {
  const offers = detailedOffers();
  const component = offers.employee.components[0];
  offers.employee.components = Array.from({ length: 33 }, (_, index) => ({
    ...component,
    id: `bonus-${index}`,
  }));

  assert.throws(() => createShareUrl({ offers, assumptions, horizon: "year" }));
  assert.equal(readSharedComparison(rawShareUrl(offers)), null);

  offers.employee.components.pop();
  const restored = readSharedComparison(createShareUrl({ offers, assumptions, horizon: "year" }));
  assert.deepEqual(restored.offers.employee.components, offers.employee.components);
});

test("incomplete offers and malformed financial data fail closed", () => {
  const invalidOffers = [
    {},
    { employee: initialOffers.employee },
    { employee: {}, contractor: initialOffers.contractor },
    ...[
      { monthlyPay: null },
      { monthlyPay: true },
      { monthlyPay: [100000] },
      { monthlyPay: "not a number" },
      { currency: "EUR" },
      { relationship: "unknown" },
      { additionalDeductions: {} },
      { components: [null] },
      { components: [{}] },
      { components: [{ ...detailedOffers().employee.components[0], frequency: "weekly" }] },
      { components: [{ ...detailedOffers().employee.components[0], taxable: "true" }] },
      { rsu: { grantValue: 50000, allocations: [] } },
      { rsu: { ...detailedOffers().employee.rsu, allocations: [null] } },
      { rsu: { ...detailedOffers().employee.rsu, allocations: [{}] } },
      { rsu: { ...detailedOffers().employee.rsu, allocations: Array(13).fill({ year: 1, percent: 0 }) } },
      { statutoryBenefits: null },
    ].map((patch) => ({
      ...detailedOffers(),
      employee: { ...detailedOffers().employee, ...patch },
    })),
  ];

  for (const offers of invalidOffers) {
    assert.equal(readSharedComparison(rawShareUrl(offers)), null, JSON.stringify(offers));
  }

  for (const rate of [null, true, [17], " ", "NaN", 0, -1]) {
    assert.equal(readSharedComparison(rawShareUrl(detailedOffers(), { a: { r: rate } })), null);
  }
});

test("sharing encodes only supported comparison fields", () => {
  const offers = detailedOffers();
  offers.employee.privateNotes = "Do not share this future local-only field";
  const shareUrl = createShareUrl({ offers, assumptions, horizon: "year" });
  const payload = JSON.parse(Buffer.from(new URL(shareUrl).hash.slice(3), "base64url").toString());

  assert.equal(Object.hasOwn(payload.o.employee, "privateNotes"), false);
  assert.equal(payload.o.employee.monthlyPay, offers.employee.monthlyPay);
});

test("native share receives only the stateful URL", () => {
  const shareUrl = createShareUrl({
    offers: detailedOffers(),
    assumptions,
    horizon: "year",
  });
  const shareData = buildUrlShareData(shareUrl);

  assert.deepEqual(Object.keys(shareData), ["url"]);
  assert.equal(shareData.url, shareUrl);
  assert.equal(Object.hasOwn(shareData, "title"), false);
  assert.equal(Object.hasOwn(shareData, "text"), false);
});

test("malformed, unsupported, and oversized fragments fail closed", () => {
  const unsupported = btoa(JSON.stringify({ v: 2, o: {}, a: { r: 17 } }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");

  assert.equal(readSharedComparison("#c=not*base64"), null);
  assert.equal(readSharedComparison(`#c=${unsupported}`), null);
  assert.equal(readSharedComparison(`#c=${"a".repeat(20001)}`), null);
  assert.equal(readSharedComparison("#unrelated=value"), null);
});

test("share-fragment detection is narrow and does not accept unrelated hashes", () => {
  const url = createShareUrl({ offers: detailedOffers(), assumptions, horizon: "year" });

  assert.equal(isSharedComparisonHash(new URL(url).hash), true);
  assert.equal(isSharedComparisonHash("#section=results"), false);
});
