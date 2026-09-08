import test from "node:test";
import assert from "node:assert/strict";
import {
  CEAV_EMPLOYER_RATES_BY_YEAR,
  buildVestingEvents,
  calculateAnnualResico,
  calculateAnnualPayrollIsr,
  calculateAnnualStatutoryBenefits,
  calculateComparison,
  calculateEmployeeImss,
  calculateEmployerContributions,
  calculateMonthlyPayrollIsr,
  calculateMonthlyResico,
  calculateOffer,
  ceavEmployerRate2026,
  initialOffers,
  statutoryVacationDays,
  validateOffer,
  validateRsu,
} from "../src/compensation.js";

function assertClose(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

function confirmResico(offers = initialOffers) {
  const copy = structuredClone(offers);
  for (const offer of Object.values(copy)) {
    if (offer.relationship === "Contratista independiente") {
      offer.resicoEligibilityStatus = "eligible";
    }
  }
  return copy;
}

const testRsu = {
  grantValue: 480000,
  currency: "MXN",
  cliffMonth: 12,
  cadence: 3,
  allocations: [
    { year: 1, percent: 50 },
    { year: 2, percent: 33 },
    { year: 3, percent: 17 },
  ],
};

const offersWithRsu = confirmResico({
  ...initialOffers,
  employee: {
    ...initialOffers.employee,
    rsu: testRsu,
  },
});

test("expands a 50/33/17 grant into quarterly vesting after a 12-month cliff", () => {
  const events = buildVestingEvents(testRsu);

  assert.deepEqual(
    events.map((event) => event.month),
    [12, 15, 18, 21, 24, 27, 30, 33, 36],
  );
  assert.equal(events[0].percent, 50);
  assert.equal(events[1].percent, 8.25);
  assert.equal(events.at(-1).cumulative, 100);
  assert.equal(events.at(-1).cumulativeValue, 480000);
});

test("the first year includes only equity vested by month 12", () => {
  const comparison = calculateComparison(offersWithRsu, { fxRate: 20.07 }, "year");
  assert.equal(comparison.employee.equity, 240000);
});

test("the three-year horizon includes the entire grant but not more than the grant", () => {
  const comparison = calculateComparison(offersWithRsu, { fxRate: 20.07 }, "three-years");
  assert.equal(comparison.employee.equity, 480000);
});

test("calculates monthly payroll ISR from the official 2026 tariff", () => {
  const result = calculateMonthlyPayrollIsr(100000);

  assertClose(result.monthlyTax, 23736.083);
  assertClose(result.effectiveRate, 23.736083, 0.000001);
  assert.equal(result.bracket.rate, 30);
});

test("applies the 2026 employment subsidy only below its income limit", () => {
  const subsidized = calculateMonthlyPayrollIsr(10000);
  const notSubsidized = calculateMonthlyPayrollIsr(12000);

  assert.equal(subsidized.subsidy, 535.65);
  assertClose(subsidized.monthlyTax + subsidized.subsidy, subsidized.taxBeforeSubsidy);
  assert.equal(notSubsidized.subsidy, 0);
});

test("calculates annual payroll ISR from the official 2026 tariff", () => {
  const result = calculateAnnualPayrollIsr(1200000);

  assertClose(result.annualTax, 284833.025);
  assert.equal(result.bracket.rate, 30);
});

test("derives statutory vacation days from completed tenure", () => {
  assert.equal(statutoryVacationDays(1), 12);
  assert.equal(statutoryVacationDays(2), 14);
  assert.equal(statutoryVacationDays(5), 20);
  assert.equal(statutoryVacationDays(6), 22);
  assert.equal(statutoryVacationDays(10), 22);
  assert.equal(statutoryVacationDays(11), 24);
  assert.equal(statutoryVacationDays(16), 26);
});

test("applies UMA exemptions to aguinaldo, vacation premium, and PTU", () => {
  const benefits = calculateAnnualStatutoryBenefits(100000, {
    ...initialOffers.employee.statutoryBenefits,
    annualPtu: 40000,
  });

  assert.equal(benefits.aguinaldoGross, 50000);
  assertClose(benefits.aguinaldoExempt, 3519.3);
  assert.equal(benefits.vacationPremiumGross, 10000);
  assertClose(benefits.vacationPremiumExempt, 1759.65);
  assertClose(benefits.ptuExempt, 1759.65);
});

test("calculates an offered matched savings fund at 13% and the 1.3 annual UMA cap", () => {
  const benefits = calculateAnnualStatutoryBenefits(100000, {
    ...initialOffers.employee.statutoryBenefits,
    savingsFundIncluded: true,
  });

  assert.equal(benefits.qualifiedSavingsRate, 13);
  assertClose(benefits.employerSavingsFund, 55633.032);
  assert.equal(benefits.employeeSavingsFund, benefits.employerSavingsFund);
  assert.equal(benefits.savingsFundCapped, true);
});

test("uses 13% of salary below the savings fund cap and zero when it is not offered", () => {
  const offered = calculateAnnualStatutoryBenefits(20000, {
    ...initialOffers.employee.statutoryBenefits,
    savingsFundIncluded: true,
  });
  const notOffered = calculateAnnualStatutoryBenefits(20000, {
    ...initialOffers.employee.statutoryBenefits,
    savingsFundIncluded: false,
  });

  assert.equal(offered.employerSavingsFund, 31200);
  assert.equal(offered.employeeSavingsFund, 31200);
  assert.equal(offered.savingsFundCapped, false);
  assert.equal(notOffered.employerSavingsFund, 0);
  assert.equal(notOffered.employeeSavingsFund, 0);
});

test("estimates the employee IMSS deduction with integrated salary and the 25 UMA cap", () => {
  const ordinary = calculateEmployeeImss(60000);
  const capped = calculateEmployeeImss(100000);

  assertClose(ordinary.monthly, 1704.85);
  assert.equal(ordinary.capped, false);
  assert.equal(capped.capped, true);
  assertClose(capped.dailySbc, 2932.75);
  assert.equal(calculateEmployeeImss(9400).monthly, 0);
  assert.equal(calculateEmployeeImss(9400).employerCovered, true);
});

test("matches the Runa monthly IMSS examples with a 30-day payroll month", () => {
  const examples = [
    { monthlyIncome: 10000, dailySbc: 349.76, monthlyImss: 249.20, capped: false },
    { monthlyIncome: 80000, dailySbc: 2798.14, monthlyImss: 2287.22, capped: false },
    { monthlyIncome: 100000, dailySbc: 2932.75, monthlyImss: 2399.28, capped: true },
  ];

  for (const example of examples) {
    const result = calculateEmployeeImss(example.monthlyIncome);
    assert.equal(result.monthDays, 30);
    assertClose(result.dailySbc, example.dailySbc);
    assertClose(result.monthly, example.monthlyImss);
    assert.equal(result.capped, example.capped);
  }
});

test("uses captured benefits in SBC and values 2026 employer retirement contributions", () => {
  const enhanced = calculateEmployeeImss(60000, {
    ...initialOffers.employee.statutoryBenefits,
    aguinaldoDays: 30,
    vacationDays: 20,
    vacationPremiumRate: 50,
  });
  const baseline = calculateEmployeeImss(60000);
  const contributions = calculateEmployerContributions({ dailySbc: 1000 });

  assert.ok(enhanced.dailySbc > baseline.dailySbc);
  assert.equal(ceavEmployerRate2026(315.04), 3.15);
  assert.equal(ceavEmployerRate2026(315.05), 6.026);
  assert.equal(ceavEmployerRate2026(500), 7.513);
  assert.equal(contributions.retirement, 7300);
  assert.equal(contributions.infonavit, 18250);
  assertClose(contributions.ceav, 27422.45);
});

test("selects the RESICO rate from annualized income", () => {
  assert.equal(calculateMonthlyResico(25000).rate, 1);
  assert.equal(calculateMonthlyResico(50000).rate, 1.1);
  assert.equal(calculateMonthlyResico(83333.34).rate, 2);
  const ineligible = calculateMonthlyResico(300000);
  assert.equal(ineligible.eligible, false);
  assert.equal(ineligible.rate, null);
  assert.equal(ineligible.monthlyTax, null);
});

test("blocks a comparison instead of estimating RESICO above $3.5M", () => {
  const comparison = calculateComparison({
    ...initialOffers,
    contractor: {
      ...initialOffers.contractor,
      monthlyPay: 19000,
      resicoEligibilityStatus: "eligible",
    },
  }, { fxRate: 17 }, "year");

  assert.equal(comparison.contractor.valid, false);
  assert.equal(comparison.contractor.taxes, null);
  assert.equal(comparison.contractor.monthlyCash, null);
  assert.equal(comparison.contractor.economicValue, null);
});

test("includes statutory cash and employer-funded benefits in payroll economic value", () => {
  const comparison = calculateComparison({
    ...initialOffers,
    employee: {
      ...initialOffers.employee,
      statutoryBenefits: {
        ...initialOffers.employee.statutoryBenefits,
        annualPtu: 40000,
        monthlyVouchers: 2000,
        savingsFundIncluded: true,
        annualMedicalInsurance: 30000,
      },
    },
  }, { fxRate: 17 }, "year").employee;

  assert.equal(comparison.aguinaldo, 50000);
  assert.equal(comparison.vacationPremium, 10000);
  assert.equal(comparison.ptu, 40000);
  assert.equal(comparison.vouchers, 24000);
  assertClose(comparison.employerSavingsFund, 55633.032);
  assert.equal(comparison.medicalInsurance, 30000);
  assert.ok(comparison.employerContributions.retirement > 0);
  assert.ok(comparison.employerContributions.ceav > 0);
  assert.ok(comparison.employerContributions.infonavit > 0);
  assert.ok(comparison.economicValue > comparison.regularCash);
});

test("treats vouchers as economic value without adding them to net monthly cash", () => {
  const comparison = calculateOffer({
    ...initialOffers.employee,
    monthlyPay: 80000,
    statutoryBenefits: {
      ...initialOffers.employee.statutoryBenefits,
      monthlyVouchers: 2000,
      savingsFundIncluded: false,
      annualMedicalInsurance: 0,
    },
  }, { fxRate: 17 }, 12);
  const employerValue = comparison.employerContributions.retirement
    + comparison.employerContributions.ceav
    + comparison.employerContributions.infonavit;

  assert.equal(comparison.vouchers, 24000);
  assertClose(
    comparison.regularCash,
    comparison.gross
      + comparison.aguinaldo
      + comparison.vacationPremium
      + comparison.ptu
      - comparison.taxes
      - comparison.recurringCosts,
  );
  assertClose(comparison.averageMonthlyCash, comparison.regularCash / 12);
  assertClose(comparison.economicValue, comparison.regularCash + comparison.vouchers + employerValue);
});

test("uses the employment subsidy only to reduce ISR, without a separate cash payment", () => {
  const comparison = calculateOffer({
    ...initialOffers.employee,
    monthlyPay: 10000,
    statutoryBenefits: {
      ...initialOffers.employee.statutoryBenefits,
      savingsFundIncluded: false,
      monthlyVouchers: 0,
    },
  }, { fxRate: 17 }, 12);
  const year = comparison.yearResults[0];

  assert.equal(comparison.taxProfile.subsidy, 535.65);
  assertClose(
    year.regularCash,
    year.gross
      + year.aguinaldo
      + year.vacationPremium
      + year.ptu
      - year.taxes
      - year.recurringCosts,
  );
});

test("paid contractor vacation removes the corresponding unpaid-time cost", () => {
  const offers = confirmResico();
  const withoutPaidLeave = calculateComparison(offers, { fxRate: 17 }, "year").contractor;
  const withPaidLeave = calculateComparison(confirmResico({
    ...offers,
    contractor: { ...offers.contractor, paidVacationDays: 15 },
  }), { fxRate: 17 }, "year").contractor;

  assert.equal(withoutPaidLeave.unpaidDays, 15);
  assert.equal(withPaidLeave.unpaidDays, 0);
  assertClose(
    withPaidLeave.monthlyCash - withoutPaidLeave.monthlyCash,
    withoutPaidLeave.unpaidTime * (1 - withoutPaidLeave.taxProfile.rate / 100 - 0.007) / 12,
  );
});

test("contractor paid leave may exceed the days the person plans to take", () => {
  const contractor = confirmResico().contractor;
  for (const plannedTimeOffDays of [0, 15]) {
    const result = calculateOffer({
      ...contractor,
      plannedTimeOffDays,
      paidVacationDays: 20,
    }, { fxRate: 17 }, 12);

    assert.equal(result.valid, true);
    assert.equal(result.unpaidDays, 0);
    assert.equal(result.unpaidTime, 0);
    assert.equal(result.yearResults[0].billableBase, result.gross);
  }
});

test("an omitted optional paid-leave benefit behaves like no paid leave", () => {
  const contractor = confirmResico().contractor;
  const { paidVacationDays: _paidVacationDays, ...withoutPaidLeaveField } = contractor;
  const expected = calculateOffer(contractor, { fxRate: 17 }, 12);
  const result = calculateOffer(withoutPaidLeaveField, { fxRate: 17 }, 12);

  assert.equal(result.valid, true);
  assertClose(result.economicValue, expected.economicValue);
});

test("contractor leave is bounded by the modeled 260-day work year", () => {
  const contractor = confirmResico().contractor;
  for (const field of ["plannedTimeOffDays", "paidVacationDays"]) {
    const result = calculateOffer({
      ...contractor,
      [field]: 261,
    }, { fxRate: 17 }, 12);

    assert.equal(result.valid, false);
    assert.equal(result.economicValue, null);
    assert.ok(result.inputErrors.some((error) => error.field === field));
  }

  const fullYearOff = calculateOffer({
    ...contractor,
    plannedTimeOffDays: 260,
  }, { fxRate: 17 }, 12);
  assert.equal(fullYearOff.valid, true);
  assert.equal(fullYearOff.unpaidTime, fullYearOff.gross);
  assert.equal(fullYearOff.yearResults[0].billableBase, 0);
  assert.equal(fullYearOff.taxes, 0);
  assert.equal(fullYearOff.fxFees, 0);
});

test("hidden contractor leave inputs do not block a payroll offer", () => {
  const payroll = calculateOffer({
    ...initialOffers.employee,
    plannedTimeOffDays: -1,
    paidVacationDays: 20,
  }, { fxRate: 17 }, 12);

  assert.equal(payroll.valid, true);
  assert.equal(payroll.unpaidTime, 0);
});

test("contractor cash benefits are valued and included in annualized RESICO income", () => {
  const offers = confirmResico();
  const baseline = calculateComparison(offers, { fxRate: 17 }, "year").contractor;
  const comparison = calculateComparison(confirmResico({
    ...offers,
    contractor: {
      ...offers.contractor,
      components: [{
        id: "insurance-cash",
        name: "Apoyo para seguro",
        category: "protection",
        amount: 2500,
        frequency: "monthly",
        taxable: true,
        cash: true,
        utilization: 100,
      }],
    },
  }), { fxRate: 17 }, "year").contractor;

  assertClose(comparison.taxProfile.annualIncome, comparison.yearResults[0].billableBase + 30000);
  assert.equal(comparison.taxProfile.rate, 2);
  assert.equal(comparison.protection, 30000);
  assertClose(comparison.monthlyCash - baseline.monthlyCash, 2450);
  assertClose(comparison.economicValue, comparison.regularCash);
});

test("blank optional costs are treated as zero without concatenating values", () => {
  const confirmed = confirmResico().contractor;
  const blankCosts = calculateOffer({
    ...confirmed,
    accountant: "",
    insurance: "",
    additionalDeductions: "",
  }, { fxRate: 17 }, 12);
  const zeroCosts = calculateOffer({
    ...confirmed,
    accountant: 0,
    insurance: 0,
    additionalDeductions: 0,
  }, { fxRate: 17 }, 12);

  assert.equal(blankCosts.valid, true);
  assert.equal(Number.isFinite(blankCosts.economicValue), true);
  assertClose(blankCosts.economicValue, zeroCosts.economicValue);
});

test("calculation type follows the selected relationship instead of the offer slot", () => {
  const offers = confirmResico({
    employee: {
      ...initialOffers.employee,
      relationship: "Contratista independiente",
      resicoEligibilityStatus: "eligible",
    },
    contractor: {
      ...initialOffers.contractor,
      relationship: "Nómina",
      statutoryBenefits: { ...initialOffers.employee.statutoryBenefits },
    },
  });
  const comparison = calculateComparison(offers, { fxRate: 17 }, "year");

  assert.equal(comparison.valid, true);
  assert.equal(comparison.employee.calculationType, "contractor");
  assert.equal(comparison.contractor.calculationType, "payroll");
  assert.equal(comparison.employee.imss, null);
  assert.ok(comparison.contractor.imss.monthly > 0);
});

test("one-time compensation is taxed and valued only in the first projection year", () => {
  const contractor = confirmResico().contractor;
  const oneTimeOffer = {
    ...contractor,
    components: [{
      id: "sign-on",
      name: "Bono de contratación",
      category: "bonus",
      amount: 40000,
      currency: "MXN",
      frequency: "once",
      taxable: true,
      cash: true,
      utilization: 100,
    }],
  };
  const baseYear = calculateOffer(contractor, { fxRate: 17 }, 12);
  const baseThreeYears = calculateOffer(contractor, { fxRate: 17 }, 36);
  const withBonusYear = calculateOffer(oneTimeOffer, { fxRate: 17 }, 12);
  const withBonusThreeYears = calculateOffer(oneTimeOffer, { fxRate: 17 }, 36);

  assert.equal(withBonusYear.bonuses, 40000);
  assert.equal(withBonusThreeYears.bonuses, 40000);
  assertClose(
    withBonusYear.taxes - baseYear.taxes,
    withBonusThreeYears.taxes - baseThreeYears.taxes,
  );
});

test("a long cliff defers earlier allocations into the actual vesting year", () => {
  const events = buildVestingEvents({
    ...testRsu,
    cliffMonth: 24,
  });

  assert.deepEqual(events.map((event) => event.month), [24, 27, 30, 33, 36]);
  assert.equal(events[0].percent, 83);
  assert.equal(events.at(-1).cumulative, 100);
});

test("USD RSUs convert at the comparison FX rate and deduct tax and sale costs", () => {
  const rsu = {
    grantValue: 100000,
    currency: "USD",
    cliffMonth: 0,
    cadence: 3,
    saleFeeRate: 1,
    allocations: [{ year: 1, percent: 100 }],
  };
  const offer = { ...initialOffers.employee, rsu };
  const baseline = calculateOffer({ ...offer, rsu: null }, { fxRate: 17 }, 12);
  const result = calculateOffer(offer, { fxRate: 17 }, 12);

  assert.equal(result.valid, true);
  assert.equal(result.equity, 1700000);
  assert.equal(result.equityFees, 17000);
  assert.ok(result.equityTax > 0);
  assertClose(result.equityNet, result.equity - result.equityTax - result.equityFees);
  assertClose(result.economicValue - baseline.economicValue, result.equityNet);
});

function ledgerEconomicValue(calculation) {
  return calculation.gross
    + calculation.aguinaldo
    + calculation.vacationPremium
    + calculation.ptu
    - calculation.taxes
    - calculation.equityTax
    - calculation.recurringCosts
    - calculation.fxFees
    - calculation.unpaidTime
    + calculation.reimbursements
    + calculation.bonuses
    + calculation.vouchers
    - calculation.employeeSavingsFund
    + calculation.employerSavingsFund
    + calculation.employeeSavingsFund
    + calculation.medicalInsurance
    + calculation.employerContributions.retirement
    + calculation.employerContributions.ceav
    + calculation.employerContributions.infonavit
    + calculation.protection
    + calculation.equity
    - calculation.equityFees;
}

test("every displayed ledger row reconciles exactly to economic value", () => {
  const payroll = calculateOffer({
    ...initialOffers.employee,
    statutoryBenefits: {
      ...initialOffers.employee.statutoryBenefits,
      annualPtu: 35000,
      monthlyVouchers: 1800,
      savingsFundIncluded: true,
      annualMedicalInsurance: 28000,
    },
    components: [
      {
        id: "bonus",
        name: "Bono anual",
        category: "bonus",
        amount: 40000,
        currency: "MXN",
        frequency: "annual",
        taxable: true,
        cash: true,
        utilization: 100,
      },
      {
        id: "wellness",
        name: "Wellness",
        category: "reimbursement",
        amount: 6250,
        currency: "MXN",
        frequency: "quarterly",
        taxable: false,
        cash: false,
        utilization: 100,
      },
    ],
    rsu: { ...testRsu, saleFeeRate: 0.5 },
  }, { fxRate: 17 }, 12);
  const contractor = calculateOffer({
    ...confirmResico().contractor,
    components: [{
      id: "insurance",
      name: "Apoyo para seguro",
      category: "protection",
      amount: 2500,
      currency: "USD",
      frequency: "monthly",
      taxable: true,
      cash: true,
      utilization: 100,
    }],
  }, { fxRate: 17 }, 12);

  assertClose(ledgerEconomicValue(payroll), payroll.economicValue);
  assertClose(ledgerEconomicValue(contractor), contractor.economicValue);
});

test("equity fees and taxes remain in the economic value when they exceed sale proceeds", () => {
  const payroll = calculateOffer({
    ...initialOffers.employee,
    rsu: { ...testRsu, saleFeeRate: 80 },
  }, { fxRate: 17 }, 12);
  const baseline = calculateOffer(initialOffers.employee, { fxRate: 17 }, 12);

  assert.equal(payroll.valid, true);
  assert.ok(payroll.equityNet < 0);
  assertClose(payroll.equityNet, payroll.equity - payroll.equityTax - payroll.equityFees);
  assertClose(ledgerEconomicValue(payroll), payroll.economicValue);
  assertClose(payroll.economicValue - baseline.economicValue, payroll.equityNet);
});

test("unpaid contractor time reduces the RESICO and FX-fee bases", () => {
  const result = calculateOffer(confirmResico().contractor, { fxRate: 17 }, 12);
  const year = result.yearResults[0];

  assertClose(year.billableBase, year.gross - year.unpaidTime);
  assertClose(year.taxProfile.annualIncome, year.billableBase);
  assertClose(year.taxes, year.billableBase * (year.taxProfile.rate / 100));
  assertClose(year.fxFees, year.billableBase * 0.007);
});

test("three-year payroll projections advance vacation tenure and enacted CEAV rates", () => {
  const result = calculateOffer(initialOffers.employee, { fxRate: 17 }, 36);

  assert.deepEqual(result.statutoryBenefits.vacationDaysByYear, [12, 14, 16]);
  assertClose(result.vacationPremium, 35000);
  assert.deepEqual(
    result.employerContributions.ceavRates.map(({ rate }) => rate),
    [7.513, 8.603, 9.694],
  );
  assert.equal(CEAV_EMPLOYER_RATES_BY_YEAR[2028].at(-1).rate, 9.694);
});

test("fixed taxable monthly compensation increases SBC before IMSS is calculated", () => {
  const baseOffer = { ...initialOffers.employee, monthlyPay: 60000 };
  const baseline = calculateOffer(baseOffer, { fxRate: 17 }, 12);
  const enhanced = calculateOffer({
    ...baseOffer,
    components: [{
      id: "monthly-bonus",
      name: "Bono fijo",
      category: "bonus",
      amount: 5000,
      currency: "MXN",
      frequency: "monthly",
      taxable: true,
      cash: true,
      utilization: 100,
    }],
  }, { fxRate: 17 }, 12);

  assertClose(enhanced.imss.dailySbc - baseline.imss.dailySbc, 5000 / 30);
  assert.ok(enhanced.imss.monthly > baseline.imss.monthly);
});

test("annual bonuses change the annual average but not a regular monthly paycheck", () => {
  const baseline = calculateOffer(initialOffers.employee, { fxRate: 17 }, 12);
  const withAnnualBonus = calculateOffer({
    ...initialOffers.employee,
    components: [{
      id: "experience-bonus",
      name: "Bono de experiencia",
      category: "bonus",
      amount: 40000,
      currency: "MXN",
      frequency: "annual",
      taxable: true,
      cash: true,
      utilization: 100,
    }],
  }, { fxRate: 17 }, 12);

  assertClose(withAnnualBonus.recurringMonthlyCash, baseline.recurringMonthlyCash);
  assert.ok(withAnnualBonus.averageMonthlyCash > baseline.averageMonthlyCash);
});

test("fondo de ahorro lowers regular cash while preserving the employee balance as value", () => {
  const baseline = calculateOffer(initialOffers.employee, { fxRate: 17 }, 12);
  const withSavings = calculateOffer({
    ...initialOffers.employee,
    statutoryBenefits: {
      ...initialOffers.employee.statutoryBenefits,
      savingsFundIncluded: true,
    },
  }, { fxRate: 17 }, 12);

  assertClose(
    baseline.recurringMonthlyCash - withSavings.recurringMonthlyCash,
    withSavings.employeeSavingsFund / 12,
  );
  assertClose(
    withSavings.economicValue - baseline.economicValue,
    withSavings.employerSavingsFund,
  );
});

test("invalid numeric, FX, statutory, and RSU inputs block results", () => {
  const invalidPay = validateOffer(
    { ...initialOffers.employee, monthlyPay: -1 },
    { fxRate: 17 },
  );
  const missingFx = validateOffer(
    { ...confirmResico().contractor },
    { fxRate: "" },
  );
  const invalidRsu = {
    ...testRsu,
    allocations: [
      { year: 1, percent: 50 },
      { year: 2, percent: 40 },
    ],
  };
  const result = calculateOffer(
    { ...initialOffers.employee, rsu: invalidRsu },
    { fxRate: 17 },
    12,
  );

  assert.ok(invalidPay.some(({ field }) => field === "monthlyPay"));
  assert.ok(missingFx.some(({ field }) => field === "fxRate"));
  assert.ok(validateRsu(invalidRsu, 17, "Nómina").some(({ field }) => field === "rsu.allocations"));
  assert.equal(result.valid, false);
  assert.equal(result.economicValue, null);
});

test("USD results wait for a confirmed live or manual exchange rate", () => {
  const usdOffers = [
    confirmResico().contractor,
    {
      ...initialOffers.employee,
      components: [{
        id: "usd-bonus",
        name: "Bono en USD",
        category: "bonus",
        amount: 1000,
        currency: "USD",
        frequency: "annual",
        taxable: true,
        cash: true,
      }],
    },
    { ...initialOffers.employee, rsu: { ...testRsu, currency: "USD" } },
  ];

  for (const offer of usdOffers) {
    for (const fxStatus of ["loading", "error"]) {
      const result = calculateOffer(offer, { fxRate: 17, fxStatus }, 12);
      assert.equal(result.valid, false);
      assert.equal(result.economicValue, null);
      assert.ok(result.inputErrors.some((error) => error.field === "fxRate"));
    }
    for (const fxStatus of ["ready", "manual", undefined]) {
      assert.equal(calculateOffer(offer, { fxRate: 17, fxStatus }, 12).valid, true);
    }
  }

  for (const fxStatus of ["loading", "error"]) {
    const mxnOnly = calculateOffer(initialOffers.employee, { fxRate: "", fxStatus }, 12);
    assert.equal(mxnOnly.valid, true);
  }
});

test("RESICO remains blocked until personal eligibility is confirmed", () => {
  const profile = calculateAnnualResico(1200000, "unconfirmed");
  const result = calculateOffer(initialOffers.contractor, { fxRate: 17 }, 12);

  assert.equal(profile.amountEligible, true);
  assert.equal(profile.profileEligible, false);
  assert.equal(profile.annualTax, null);
  assert.equal(result.valid, false);
  assert.equal(result.taxes, null);
  assert.ok(result.invalidReasons.some((reason) => reason.includes("Confirma")));
});

test("legacy RSU schedules without an explicit sale fee remain valid at zero", () => {
  assert.deepEqual(validateRsu(testRsu, 17, "Nómina"), []);
});

test("ISR remains monotonic across the full salary ranges used by the calculator", () => {
  let previousMonthlyTax = 0;
  for (let income = 0; income <= 1000000; income += 100) {
    const tax = calculateMonthlyPayrollIsr(income).monthlyTax;
    assert.ok(tax >= previousMonthlyTax, `monthly ISR fell at ${income}`);
    previousMonthlyTax = tax;
  }

  let previousAnnualTax = 0;
  for (let income = 0; income <= 10000000; income += 1000) {
    const tax = calculateAnnualPayrollIsr(income).annualTax;
    assert.ok(tax >= previousAnnualTax, `annual ISR fell at ${income}`);
    previousAnnualTax = tax;
  }
});

test("the RESICO limit includes exactly $3.5M and rejects the next cent", () => {
  const boundary = calculateAnnualResico(3500000, "eligible");
  const above = calculateAnnualResico(3500000.01, "eligible");

  assert.equal(boundary.eligible, true);
  assert.equal(boundary.rate, 2.5);
  assert.equal(above.eligible, false);
  assert.equal(above.rate, null);
  assert.equal(above.annualTax, null);
});
