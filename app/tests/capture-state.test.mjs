import test from "node:test";
import assert from "node:assert/strict";
import {
  captureReducer,
  convertOfferCurrency,
  createCaptureState,
  getBaseCaptureIssues,
  patchOfferState,
} from "../src/capture-state.js";
import { calculateComparison, initialOffers } from "../src/compensation.js";

const initialAssumptions = {
  fxRate: 17.0427,
  fxDate: "2026-08-28",
  fxManual: false,
  fxStatus: "ready",
};

function updateOffers(state, update) {
  return captureReducer(state, { type: "set-offers", update });
}

test("blocks later capture steps when either monthly pay is blank or zero", () => {
  const blankA = patchOfferState(structuredClone(initialOffers), "employee", { monthlyPay: "" });
  const zeroB = patchOfferState(structuredClone(initialOffers), "contractor", { monthlyPay: 0 });

  assert.deepEqual(getBaseCaptureIssues(blankA), [{
    offerKey: "employee",
    field: "monthlyPay",
    message: "El pago mensual de Oferta A debe ser mayor a cero.",
    action: "Ingresa el pago de Oferta A",
  }]);
  assert.equal(getBaseCaptureIssues(zeroB)[0].action, "Ingresa el pago de Oferta B");
});

test("converts monthly pay in both directions without changing its MXN value", () => {
  const usdToMxn = convertOfferCurrency({ currency: "USD", monthlyPay: 5000 }, "MXN", 17.0427);
  const mxnToUsd = convertOfferCurrency({ currency: "MXN", monthlyPay: 85213.5 }, "USD", 17.0427);

  assert.deepEqual(usdToMxn.patch, { currency: "MXN", monthlyPay: 85213.5 });
  assert.equal(usdToMxn.notice.kind, "converted");
  assert.deepEqual(mxnToUsd.patch, { currency: "USD", monthlyPay: 5000 });
});

test("keeps blank editing state and warns before reinterpreting an amount without a valid rate", () => {
  const blank = convertOfferCurrency({ currency: "USD", monthlyPay: "" }, "MXN", 0);
  const invalidRate = convertOfferCurrency({ currency: "USD", monthlyPay: 5000 }, "MXN", "");

  assert.deepEqual(blank, { patch: { currency: "MXN" }, notice: null });
  assert.equal(invalidRate.patch.monthlyPay, undefined);
  assert.equal(invalidRate.notice.kind, "warning");
});

test("offer edits survive step changes, results, and Editar ofertas", () => {
  let state = createCaptureState(initialOffers, initialAssumptions);
  state = updateOffers(state, (offers) => patchOfferState(offers, "employee", {
    monthlyPay: 80000,
  }));
  state = updateOffers(state, (offers) => patchOfferState(offers, "contractor", {
    monthlyPay: 5000,
    resicoEligibilityStatus: "eligible",
  }));
  state = captureReducer(state, { type: "set-step", step: 2 });
  state = captureReducer(state, { type: "set-view", view: "results" });
  state = captureReducer(state, { type: "edit-offers" });

  assert.equal(state.view, "capture");
  assert.equal(state.step, 0);
  assert.equal(state.offers.employee.monthlyPay, 80000);
  assert.equal(state.offers.contractor.monthlyPay, 5000);
  assert.equal(state.offers.contractor.resicoEligibilityStatus, "eligible");
});

test("relationship edits affect either offer without resetting its sibling or moving steps", () => {
  let state = createCaptureState(initialOffers, initialAssumptions);
  state = captureReducer(state, { type: "set-step", step: 0 });
  state = updateOffers(state, (offers) => patchOfferState(offers, "employee", {
    relationship: "Contratista independiente",
    resicoEligibilityStatus: "eligible",
  }));

  assert.equal(state.step, 0);
  assert.equal(state.offers.employee.relationship, "Contratista independiente");
  assert.equal(state.offers.contractor.relationship, "Contratista independiente");
  assert.equal(state.offers.contractor.monthlyPay, initialOffers.contractor.monthlyPay);
});

test("calculated ISR always follows the current pay in capture state", () => {
  let state = createCaptureState(initialOffers, initialAssumptions);
  state = updateOffers(state, (offers) => patchOfferState(offers, "employee", {
    monthlyPay: 80000,
  }));
  const atEighty = calculateComparison(state.offers, state.assumptions, "year");

  state = updateOffers(state, (offers) => patchOfferState(offers, "employee", {
    monthlyPay: 100000,
  }));
  const atOneHundred = calculateComparison(state.offers, state.assumptions, "year");

  assert.equal(atEighty.employee.taxProfile.monthlyTax, 17736.083);
  assert.equal(atOneHundred.employee.taxProfile.monthlyTax, 23736.083);
});
