export const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// Anexo 8 de la RMF 2026, tarifa mensual del artículo 96 de la LISR.
export const PAYROLL_ISR_MONTHLY_2026 = [
  { lower: 0.01, upper: 844.59, fixed: 0, rate: 1.92 },
  { lower: 844.6, upper: 7168.51, fixed: 16.22, rate: 6.4 },
  { lower: 7168.52, upper: 12598.02, fixed: 420.95, rate: 10.88 },
  { lower: 12598.03, upper: 14644.64, fixed: 1011.68, rate: 16 },
  { lower: 14644.65, upper: 17533.64, fixed: 1339.14, rate: 17.92 },
  { lower: 17533.65, upper: 35362.83, fixed: 1856.84, rate: 21.36 },
  { lower: 35362.84, upper: 55736.68, fixed: 5665.16, rate: 23.52 },
  { lower: 55736.69, upper: 106410.5, fixed: 10457.09, rate: 30 },
  { lower: 106410.51, upper: 141880.66, fixed: 25659.23, rate: 32 },
  { lower: 141880.67, upper: 425641.99, fixed: 37009.69, rate: 34 },
  { lower: 425642, upper: Number.POSITIVE_INFINITY, fixed: 133488.54, rate: 35 },
];

// Anexo 8 de la RMF 2026, tarifa anual de los artículos 97 y 152 de la LISR.
export const PAYROLL_ISR_ANNUAL_2026 = [
  { lower: 0.01, upper: 10135.11, fixed: 0, rate: 1.92 },
  { lower: 10135.12, upper: 86022.11, fixed: 194.59, rate: 6.4 },
  { lower: 86022.12, upper: 151176.19, fixed: 5051.37, rate: 10.88 },
  { lower: 151176.2, upper: 175735.66, fixed: 12140.13, rate: 16 },
  { lower: 175735.67, upper: 210403.69, fixed: 16069.64, rate: 17.92 },
  { lower: 210403.7, upper: 424353.97, fixed: 22282.14, rate: 21.36 },
  { lower: 424353.98, upper: 668840.14, fixed: 67981.92, rate: 23.52 },
  { lower: 668840.15, upper: 1276925.98, fixed: 125485.07, rate: 30 },
  { lower: 1276925.99, upper: 1702567.97, fixed: 307910.81, rate: 32 },
  { lower: 1702567.98, upper: 5107703.92, fixed: 444116.23, rate: 34 },
  { lower: 5107703.93, upper: Number.POSITIVE_INFINITY, fixed: 1601862.46, rate: 35 },
];

// Artículo 113-F de la LISR, tabla anual de RESICO para personas físicas.
export const RESICO_ANNUAL_2026 = [
  { upper: 300000, rate: 1 },
  { upper: 600000, rate: 1.1 },
  { upper: 1000000, rate: 1.5 },
  { upper: 2500000, rate: 2 },
  { upper: 3500000, rate: 2.5 },
];

export const TAX_YEAR = 2026;
export const UMA_2026 = { daily: 117.31, monthly: 3566.22, annual: 42794.64 };
export const MINIMUM_WAGE_2026 = { daily: 315.04 };
export const EMPLOYMENT_SUBSIDY_2026 = {
  incomeLimit: 11492.66,
  monthly: Number((UMA_2026.monthly * 0.1502).toFixed(2)),
};

export const PROJECTION_POLICY = {
  baseRuleYear: TAX_YEAR,
  label: "Reglas monetarias 2026; antigüedad y CEAV avanzan por año",
  heldConstant: ["ISR", "UMA", "salario mínimo", "subsidio al empleo"],
  scheduled: ["vacaciones por antigüedad", "cuota patronal CEAV"],
};

// LSS 29 converts monthly salary to a 30-day daily base for IMSS quotas.
// Voucher integration retains the existing 365 / 12 monthly convention.
const IMSS_QUOTA_MONTH_DAYS = 30;
const VOUCHER_MONTH_DAYS = 30.4;
const CONTRACTOR_WORK_DAYS_PER_YEAR = 260;
const SUPPORTED_CURRENCIES = new Set(["MXN", "USD"]);
const SUPPORTED_RELATIONSHIPS = new Set(["Nómina", "Contratista independiente"]);
const SUPPORTED_RSU_CADENCES = new Set([1, 3, 6, 12]);

// Artículo Segundo Transitorio de la reforma a la LSS publicada el 16-12-2020.
export const CEAV_EMPLOYER_RATES_BY_YEAR = {
  2026: [
    { upperUma: 1.5, rate: 3.676 },
    { upperUma: 2, rate: 4.851 },
    { upperUma: 2.5, rate: 5.556 },
    { upperUma: 3, rate: 6.026 },
    { upperUma: 3.5, rate: 6.361 },
    { upperUma: 4, rate: 6.613 },
    { upperUma: Number.POSITIVE_INFINITY, rate: 7.513 },
  ],
  2027: [
    { upperUma: 1.5, rate: 3.807 },
    { upperUma: 2, rate: 5.276 },
    { upperUma: 2.5, rate: 6.157 },
    { upperUma: 3, rate: 6.745 },
    { upperUma: 3.5, rate: 7.164 },
    { upperUma: 4, rate: 7.479 },
    { upperUma: Number.POSITIVE_INFINITY, rate: 8.603 },
  ],
  2028: [
    { upperUma: 1.5, rate: 3.939 },
    { upperUma: 2, rate: 5.701 },
    { upperUma: 2.5, rate: 6.759 },
    { upperUma: 3, rate: 7.464 },
    { upperUma: 3.5, rate: 7.967 },
    { upperUma: 4, rate: 8.345 },
    { upperUma: Number.POSITIVE_INFINITY, rate: 9.694 },
  ],
  2029: [
    { upperUma: 1.5, rate: 4.07 },
    { upperUma: 2, rate: 6.126 },
    { upperUma: 2.5, rate: 7.36 },
    { upperUma: 3, rate: 8.183 },
    { upperUma: 3.5, rate: 8.77 },
    { upperUma: 4, rate: 9.211 },
    { upperUma: Number.POSITIVE_INFINITY, rate: 10.784 },
  ],
  2030: [
    { upperUma: 1.5, rate: 4.202 },
    { upperUma: 2, rate: 6.552 },
    { upperUma: 2.5, rate: 7.962 },
    { upperUma: 3, rate: 8.902 },
    { upperUma: 3.5, rate: 9.573 },
    { upperUma: 4, rate: 10.077 },
    { upperUma: Number.POSITIVE_INFINITY, rate: 11.875 },
  ],
};

export const CEAV_EMPLOYER_RATES_2026 = CEAV_EMPLOYER_RATES_BY_YEAR[2026];

export const defaultStatutoryBenefits = {
  tenureYears: 1,
  aguinaldoDays: 15,
  vacationDays: 12,
  vacationPremiumRate: 25,
  annualPtu: 0,
  monthlyVouchers: 0,
  savingsFundIncluded: false,
  annualMedicalInsurance: 0,
};

function finiteNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nonNegative(value) {
  return Math.max(0, finiteNumber(value));
}

function percentage(value) {
  return Math.min(100, Math.max(0, finiteNumber(value)));
}

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((finiteNumber(value) + Number.EPSILON) * factor) / factor;
}

function isPresentFiniteNumber(value) {
  if (value === "" || value === null || value === undefined) return false;
  return Number.isFinite(Number(value));
}

function sum(items, selector = (value) => value) {
  return items.reduce((total, item) => total + finiteNumber(selector(item)), 0);
}

function average(items, selector) {
  return items.length ? sum(items, selector) / items.length : 0;
}

function uniqueErrors(errors) {
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.field}:${error.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function isPayrollOffer(offer) {
  if (offer?.relationship) return offer.relationship === "Nómina";
  return offer?.id === "employee";
}

export function isContractorOffer(offer) {
  return !isPayrollOffer(offer);
}

export function calculateMonthlyPayrollIsr(monthlyIncome) {
  const income = nonNegative(monthlyIncome);
  if (income === 0) {
    return { monthlyTax: 0, taxBeforeSubsidy: 0, subsidy: 0, effectiveRate: 0, bracket: null };
  }

  const bracket = PAYROLL_ISR_MONTHLY_2026.find((item) => income <= item.upper)
    ?? PAYROLL_ISR_MONTHLY_2026.at(-1);
  const taxBeforeSubsidy = bracket.fixed + (income - bracket.lower) * (bracket.rate / 100);
  const subsidy = income <= EMPLOYMENT_SUBSIDY_2026.incomeLimit
    ? Math.min(EMPLOYMENT_SUBSIDY_2026.monthly, taxBeforeSubsidy)
    : 0;
  const monthlyTax = Math.max(0, taxBeforeSubsidy - subsidy);

  return {
    monthlyTax,
    taxBeforeSubsidy,
    subsidy,
    effectiveRate: (monthlyTax / income) * 100,
    bracket,
  };
}

export function calculateAnnualPayrollIsr(annualIncome) {
  const income = nonNegative(annualIncome);
  if (income === 0) return { annualTax: 0, effectiveRate: 0, bracket: null };

  const bracket = PAYROLL_ISR_ANNUAL_2026.find((item) => income <= item.upper)
    ?? PAYROLL_ISR_ANNUAL_2026.at(-1);
  const annualTax = bracket.fixed + (income - bracket.lower) * (bracket.rate / 100);
  return { annualTax, effectiveRate: (annualTax / income) * 100, bracket };
}

export function statutoryVacationDays(tenureYears) {
  const years = Math.max(1, Math.floor(finiteNumber(tenureYears, 1)));
  if (years <= 5) return 10 + years * 2;
  return 20 + Math.ceil((years - 5) / 5) * 2;
}

export function benefitsIntegrationFactor(benefits = defaultStatutoryBenefits) {
  const aguinaldoDays = nonNegative(benefits?.aguinaldoDays);
  const vacationDays = nonNegative(benefits?.vacationDays);
  const vacationPremiumRate = percentage(benefits?.vacationPremiumRate) / 100;
  return roundTo(
    1 + aguinaldoDays / 365 + (vacationDays * vacationPremiumRate) / 365,
    4,
  );
}

export function calculateEmployeeImss(
  monthlyIncome,
  benefits = defaultStatutoryBenefits,
  fixedMonthlyCompensation = 0,
) {
  const income = nonNegative(monthlyIncome);
  const fixedCompensation = nonNegative(fixedMonthlyCompensation);
  const integrationFactor = benefitsIntegrationFactor(benefits);
  if (income + fixedCompensation === 0) {
    return {
      monthly: 0,
      monthDays: IMSS_QUOTA_MONTH_DAYS,
      dailySbc: 0,
      capped: false,
      employerCovered: false,
      integrationFactor,
      integratedVoucherExcess: 0,
      fixedMonthlyCompensation: fixedCompensation,
    };
  }

  const monthlyVouchers = nonNegative(benefits?.monthlyVouchers);
  const monthlyVoucherExemption = UMA_2026.daily * 0.4 * VOUCHER_MONTH_DAYS;
  const integratedVoucherExcess = Math.max(0, monthlyVouchers - monthlyVoucherExemption)
    / VOUCHER_MONTH_DAYS;
  const dailySalary = roundTo(income / IMSS_QUOTA_MONTH_DAYS, 2);
  const fixedDailyCompensation = roundTo(fixedCompensation / IMSS_QUOTA_MONTH_DAYS, 2);
  const uncappedDailySbc = roundTo(
    dailySalary * integrationFactor + fixedDailyCompensation + integratedVoucherExcess,
    2,
  );
  const dailyCap = UMA_2026.daily * 25;
  const dailySbc = Math.min(uncappedDailySbc, dailyCap);
  const employerCovered = income + fixedCompensation
    <= MINIMUM_WAGE_2026.daily * IMSS_QUOTA_MONTH_DAYS;
  const monthlySbc = dailySbc * IMSS_QUOTA_MONTH_DAYS;
  const baseWorkerRate = 0.00375 + 0.0025 + 0.00625 + 0.01125;
  const excessOverThreeUma = Math.max(0, dailySbc - UMA_2026.daily * 3);
  const calculatedMonthly = monthlySbc * baseWorkerRate
    + excessOverThreeUma * IMSS_QUOTA_MONTH_DAYS * 0.004;

  return {
    monthly: employerCovered ? 0 : roundTo(calculatedMonthly, 2),
    monthDays: IMSS_QUOTA_MONTH_DAYS,
    dailySbc,
    capped: uncappedDailySbc > dailyCap,
    employerCovered,
    integrationFactor,
    integratedVoucherExcess,
    fixedMonthlyCompensation: fixedCompensation,
  };
}

export function ceavEmployerRate(dailySbc, calendarYear = TAX_YEAR) {
  const salary = nonNegative(dailySbc);
  if (salary <= MINIMUM_WAGE_2026.daily) return 3.15;
  const schedule = CEAV_EMPLOYER_RATES_BY_YEAR[calendarYear]
    ?? CEAV_EMPLOYER_RATES_BY_YEAR[2030];
  const salaryInUma = salary / UMA_2026.daily;
  return schedule.find((item) => salaryInUma <= item.upperUma)?.rate
    ?? schedule.at(-1).rate;
}

export function ceavEmployerRate2026(dailySbc) {
  return ceavEmployerRate(dailySbc, 2026);
}

export function calculateEmployerContributions(imss, years = 1, startYear = TAX_YEAR) {
  const annualSbc = nonNegative(imss?.dailySbc) * 365;
  const yearCount = Math.max(0, Math.floor(finiteNumber(years)));
  const rates = Array.from({ length: yearCount }, (_, index) => ({
    year: startYear + index,
    rate: ceavEmployerRate(imss?.dailySbc, startYear + index),
  }));

  return {
    annualSbc,
    retirement: annualSbc * 0.02 * yearCount,
    ceav: sum(rates, ({ rate }) => annualSbc * (rate / 100)),
    ceavRate: rates[0]?.rate ?? 0,
    ceavRates: rates,
    infonavit: annualSbc * 0.05 * yearCount,
  };
}

export function calculateAnnualStatutoryBenefits(
  monthlyIncome,
  benefits = defaultStatutoryBenefits,
) {
  const monthlyGross = nonNegative(monthlyIncome);
  const dailySalary = monthlyGross / 30;
  const aguinaldoGross = dailySalary * nonNegative(benefits?.aguinaldoDays);
  const vacationDays = nonNegative(benefits?.vacationDays);
  const vacationPremiumGross = dailySalary * vacationDays
    * (percentage(benefits?.vacationPremiumRate) / 100);
  const ptuGross = nonNegative(benefits?.annualPtu);
  const aguinaldoExempt = Math.min(aguinaldoGross, UMA_2026.daily * 30);
  const vacationPremiumExempt = Math.min(vacationPremiumGross, UMA_2026.daily * 15);
  const ptuExempt = Math.min(ptuGross, UMA_2026.daily * 15);
  const monthlyVouchers = nonNegative(benefits?.monthlyVouchers);
  const savingsFundIncluded = Boolean(benefits?.savingsFundIncluded);
  const qualifiedSavingsRate = savingsFundIncluded ? 13 : 0;
  const salaryBasedSavingsFund = monthlyGross * 12 * (qualifiedSavingsRate / 100);
  const employerSavingsFund = savingsFundIncluded
    ? Math.min(salaryBasedSavingsFund, UMA_2026.annual * 1.3)
    : 0;

  return {
    vacationDays,
    aguinaldoGross,
    aguinaldoExempt,
    aguinaldoTaxable: Math.max(0, aguinaldoGross - aguinaldoExempt),
    vacationPremiumGross,
    vacationPremiumExempt,
    vacationPremiumTaxable: Math.max(0, vacationPremiumGross - vacationPremiumExempt),
    ptuGross,
    ptuExempt,
    ptuTaxable: Math.max(0, ptuGross - ptuExempt),
    vouchers: monthlyVouchers * 12,
    employeeSavingsFund: employerSavingsFund,
    employerSavingsFund,
    savingsFundIncluded,
    qualifiedSavingsRate,
    savingsFundCapped: savingsFundIncluded
      && salaryBasedSavingsFund > UMA_2026.annual * 1.3,
    medicalInsurance: nonNegative(benefits?.annualMedicalInsurance),
  };
}

export function calculateAnnualResico(annualIncome, eligibilityStatus = "eligible") {
  const income = nonNegative(annualIncome);
  const bracket = RESICO_ANNUAL_2026.find((item) => income <= item.upper) ?? null;
  const amountEligible = Boolean(bracket);
  const profileEligible = eligibilityStatus === "eligible";
  const eligible = amountEligible && profileEligible;
  const rate = bracket?.rate ?? null;
  const reason = !amountEligible
    ? "income-limit"
    : eligibilityStatus === "unconfirmed"
      ? "profile-unconfirmed"
      : eligibilityStatus === "ineligible"
        ? "profile-ineligible"
        : null;

  return {
    annualIncome: income,
    eligible,
    amountEligible,
    profileEligible,
    eligibilityStatus,
    reason,
    rate,
    annualTax: eligible ? income * (rate / 100) : null,
    monthlyTax: eligible ? income * (rate / 100) / 12 : null,
    effectiveRate: rate,
    bracket,
  };
}

export function calculateMonthlyResico(monthlyIncome, eligibilityStatus = "eligible") {
  return calculateAnnualResico(nonNegative(monthlyIncome) * 12, eligibilityStatus);
}

export const defaultRsu = {
  grantValue: 0,
  currency: "MXN",
  cliffMonth: 12,
  cadence: 3,
  saleFeeRate: 0,
  allocations: [
    { year: 1, percent: 25 },
    { year: 2, percent: 25 },
    { year: 3, percent: 25 },
    { year: 4, percent: 25 },
  ],
};

export const initialOffers = {
  employee: {
    id: "employee",
    name: "Empresa en México",
    relationship: "Nómina",
    location: "México",
    currency: "MXN",
    monthlyPay: 100000,
    additionalDeductions: 0,
    accountant: 0,
    fxFee: 0,
    insurance: 0,
    plannedTimeOffDays: 0,
    paidVacationDays: null,
    resicoEligibilityStatus: "unconfirmed",
    components: [],
    rsu: null,
    statutoryBenefits: { ...defaultStatutoryBenefits },
  },
  contractor: {
    id: "contractor",
    name: "Cliente internacional",
    relationship: "Contratista independiente",
    location: "Exterior",
    currency: "USD",
    monthlyPay: 6000,
    additionalDeductions: 0,
    accountant: 1200,
    fxFee: 0.7,
    insurance: 0,
    plannedTimeOffDays: 15,
    paidVacationDays: null,
    resicoEligibilityStatus: "unconfirmed",
    components: [],
    rsu: null,
    statutoryBenefits: { ...defaultStatutoryBenefits },
  },
};

export const frequencyLabels = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  once: "Una sola vez",
};

const annualFrequency = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  once: 1,
};

export function toMxn(amount, currency, fxRate) {
  const numericAmount = finiteNumber(amount);
  return currency === "USD" ? numericAmount * finiteNumber(fxRate) : numericAmount;
}

export function annualComponentValue(component, fxRate, years = 1) {
  const frequency = annualFrequency[component?.frequency] ?? 1;
  const annual = toMxn(
    finiteNumber(component?.amount) * frequency,
    component?.currency ?? "MXN",
    fxRate,
  );
  const utilization = percentage(component?.utilization ?? 100) / 100;
  const multiplier = component?.frequency === "once" ? 1 : nonNegative(years);
  return annual * utilization * multiplier;
}

function componentValueForYear(component, fxRate, yearIndex) {
  if (component?.frequency === "once" && yearIndex > 0) return 0;
  return annualComponentValue(component, fxRate, 1);
}

function componentTotalsForYear(offer, fxRate, yearIndex) {
  return (offer?.components ?? []).reduce((totals, component) => {
    const value = componentValueForYear(component, fxRate, yearIndex);
    const monthlyValue = component.frequency === "monthly"
      ? toMxn(
        finiteNumber(component.amount) * (percentage(component.utilization ?? 100) / 100),
        component.currency ?? "MXN",
        fxRate,
      )
      : 0;
    const category = component.category ?? "other";
    totals.categories[category] = (totals.categories[category] ?? 0) + value;
    if (component.cash) {
      totals.cash += value;
      totals.monthlyCash += monthlyValue;
      if ((component.currency ?? "MXN") === "USD") {
        totals.usdCash += value;
        totals.monthlyUsdCash += monthlyValue;
      }
    } else {
      totals.nonCash += value;
    }
    if (component.taxable) {
      totals.taxable += value;
      totals.monthlyTaxable += monthlyValue;
      if (component.cash) totals.fixedMonthlySbc += monthlyValue;
    }
    return totals;
  }, {
    categories: { reimbursement: 0, bonus: 0, protection: 0, other: 0 },
    cash: 0,
    nonCash: 0,
    taxable: 0,
    monthlyCash: 0,
    monthlyTaxable: 0,
    fixedMonthlySbc: 0,
    usdCash: 0,
    monthlyUsdCash: 0,
  });
}

export function buildVestingEvents(rsu) {
  if (!rsu || !Array.isArray(rsu.allocations)) return [];
  const cadence = finiteNumber(rsu.cadence, 3);
  const cliff = nonNegative(rsu.cliffMonth);
  if (!SUPPORTED_RSU_CADENCES.has(cadence)) return [];

  const events = new Map();
  for (const allocation of rsu.allocations) {
    const year = Math.max(1, Math.floor(finiteNumber(allocation.year, 1)));
    const allocationPercent = finiteNumber(allocation.percent);
    const yearStart = (year - 1) * 12;
    const vestMonths = [];
    for (let month = yearStart + cadence; month <= yearStart + 12; month += cadence) {
      vestMonths.push(month);
    }
    if (!vestMonths.length) continue;

    const eachPercent = allocationPercent / vestMonths.length;
    for (const scheduledMonth of vestMonths) {
      const actualMonth = scheduledMonth <= cliff ? cliff : scheduledMonth;
      events.set(actualMonth, (events.get(actualMonth) ?? 0) + eachPercent);
    }
  }

  const grantValue = nonNegative(rsu.grantValue);
  let cumulative = 0;
  return [...events.entries()]
    .sort(([left], [right]) => left - right)
    .map(([month, percent]) => {
      cumulative += percent;
      return {
        month,
        percent,
        cumulative,
        value: (grantValue * percent) / 100,
        cumulativeValue: (grantValue * cumulative) / 100,
      };
    });
}

function vestedValueForYear(rsu, yearIndex, fxRate) {
  if (!rsu) return 0;
  const startMonth = yearIndex * 12;
  const endMonth = startMonth + 12;
  const originalValue = buildVestingEvents(rsu)
    .filter((event) => event.month > startMonth && event.month <= endMonth)
    .reduce((total, event) => total + event.value, 0);
  return toMxn(originalValue, rsu.currency ?? "MXN", fxRate);
}

function validationError(field, message) {
  return { field, message };
}

export function validateRsu(rsu, fxRate, relationship = "Nómina") {
  if (!rsu) return [];
  const errors = [];
  if (relationship !== "Nómina") {
    errors.push(validationError("rsu", "Las RSUs sólo se calculan dentro de una oferta de nómina."));
  }
  if (!isPresentFiniteNumber(rsu.grantValue) || Number(rsu.grantValue) <= 0) {
    errors.push(validationError("rsu.grantValue", "El grant debe tener un valor mayor a cero."));
  }
  if (!SUPPORTED_CURRENCIES.has(rsu.currency ?? "MXN")) {
    errors.push(validationError("rsu.currency", "La moneda del grant no es válida."));
  }
  if ((rsu.currency ?? "MXN") === "USD" && (!isPresentFiniteNumber(fxRate) || Number(fxRate) <= 0)) {
    errors.push(validationError("fxRate", "Hace falta un tipo de cambio válido para las RSUs en USD."));
  }
  if (!SUPPORTED_RSU_CADENCES.has(Number(rsu.cadence))) {
    errors.push(validationError("rsu.cadence", "La frecuencia de vesting no es válida."));
  }
  if (!isPresentFiniteNumber(rsu.cliffMonth) || Number(rsu.cliffMonth) < 0) {
    errors.push(validationError("rsu.cliffMonth", "El cliff no puede ser negativo."));
  }
  const saleFeeRate = rsu.saleFeeRate ?? 0;
  if (!isPresentFiniteNumber(saleFeeRate)
    || Number(saleFeeRate) < 0
    || Number(saleFeeRate) > 100) {
    errors.push(validationError("rsu.saleFeeRate", "El costo de venta debe estar entre 0% y 100%."));
  }
  if (!Array.isArray(rsu.allocations) || !rsu.allocations.length) {
    errors.push(validationError("rsu.allocations", "El calendario necesita al menos un año."));
    return errors;
  }
  if (Number(rsu.cliffMonth) > rsu.allocations.length * 12) {
    errors.push(validationError(
      "rsu.cliffMonth",
      "El cliff no puede quedar después del final del calendario.",
    ));
  }
  for (const [index, allocation] of rsu.allocations.entries()) {
    if (Number(allocation.year) !== index + 1) {
      errors.push(validationError(
        `rsu.allocations.${index}.year`,
        "Los años del calendario deben ser consecutivos.",
      ));
    }
    if (!isPresentFiniteNumber(allocation.percent)
      || Number(allocation.percent) < 0
      || Number(allocation.percent) > 100) {
      errors.push(validationError(
        `rsu.allocations.${index}`,
        `El porcentaje del año ${index + 1} debe estar entre 0% y 100%.`,
      ));
    }
  }
  const total = sum(rsu.allocations, ({ percent }) => finiteNumber(percent));
  if (Math.abs(total - 100) >= 0.01) {
    errors.push(validationError("rsu.allocations", "Los porcentajes de vesting deben sumar 100%."));
  }
  return uniqueErrors(errors);
}

export function validateOffer(offer, assumptions = {}) {
  const errors = [];
  if (!SUPPORTED_RELATIONSHIPS.has(offer?.relationship)) {
    errors.push(validationError("relationship", "Selecciona nómina o contratista independiente."));
  }
  if (!SUPPORTED_CURRENCIES.has(offer?.currency)) {
    errors.push(validationError("currency", "Selecciona MXN o USD."));
  }
  if (!isPresentFiniteNumber(offer?.monthlyPay) || Number(offer.monthlyPay) <= 0) {
    errors.push(validationError("monthlyPay", "El pago mensual debe ser mayor a cero."));
  }

  const usesUsd = offer?.currency === "USD"
    || (offer?.components ?? []).some((component) => (component.currency ?? "MXN") === "USD")
    || offer?.rsu?.currency === "USD";
  if (usesUsd && (!isPresentFiniteNumber(assumptions.fxRate) || Number(assumptions.fxRate) <= 0)) {
    errors.push(validationError("fxRate", "Ingresa un tipo de cambio mayor a cero."));
  } else if (usesUsd && ["loading", "error"].includes(assumptions.fxStatus)) {
    errors.push(validationError(
      "fxRate",
      assumptions.fxStatus === "loading"
        ? "Espera el tipo de cambio de Banxico o ingresa uno manual antes de comparar."
        : "No pudimos confirmar el tipo de cambio. Ingresa uno manual antes de comparar.",
    ));
  }

  const nonNegativeFields = [
    ["additionalDeductions", "Las deducciones adicionales no pueden ser negativas."],
    ["accountant", "El costo del contador no puede ser negativo."],
    ["insurance", "El costo del seguro no puede ser negativo."],
  ];
  for (const [field, message] of nonNegativeFields) {
    const value = offer?.[field];
    if (value !== "" && value !== null && value !== undefined
      && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      errors.push(validationError(field, message));
    }
  }
  if (isContractorOffer(offer)) {
    for (const field of ["plannedTimeOffDays", "paidVacationDays"]) {
      const value = offer?.[field];
      if (value !== "" && value !== null && value !== undefined
        && (!Number.isFinite(Number(value))
          || Number(value) < 0
          || Number(value) > CONTRACTOR_WORK_DAYS_PER_YEAR)) {
        errors.push(validationError(
          field,
          `Los días libres deben estar entre 0 y ${CONTRACTOR_WORK_DAYS_PER_YEAR} por año.`,
        ));
      }
    }
  }
  if (offer?.fxFee !== "" && offer?.fxFee !== null && offer?.fxFee !== undefined
    && (!Number.isFinite(Number(offer.fxFee)) || Number(offer.fxFee) < 0 || Number(offer.fxFee) > 100)) {
    errors.push(validationError("fxFee", "El costo cambiario debe estar entre 0% y 100%."));
  }

  for (const [index, component] of (offer?.components ?? []).entries()) {
    if (!isPresentFiniteNumber(component.amount) || Number(component.amount) < 0) {
      errors.push(validationError(`components.${index}.amount`, `Revisa el monto de ${component.name || "la compensación"}.`));
    }
    if (!annualFrequency[component.frequency]) {
      errors.push(validationError(`components.${index}.frequency`, "La frecuencia de la compensación no es válida."));
    }
    if (!SUPPORTED_CURRENCIES.has(component.currency ?? "MXN")) {
      errors.push(validationError(`components.${index}.currency`, "La moneda de la compensación no es válida."));
    }
    if (!isPresentFiniteNumber(component.utilization ?? 100)
      || Number(component.utilization ?? 100) < 0
      || Number(component.utilization ?? 100) > 100) {
      errors.push(validationError(`components.${index}.utilization`, "La utilización debe estar entre 0% y 100%."));
    }
  }

  if (isPayrollOffer(offer)) {
    const benefits = offer?.statutoryBenefits ?? {};
    const tenure = finiteNumber(benefits.tenureYears);
    const legalVacationDays = statutoryVacationDays(tenure);
    if (!isPresentFiniteNumber(benefits.tenureYears) || tenure < 1) {
      errors.push(validationError("statutoryBenefits.tenureYears", "La antigüedad debe ser de al menos un año."));
    }
    if (!isPresentFiniteNumber(benefits.vacationDays) || Number(benefits.vacationDays) < legalVacationDays) {
      errors.push(validationError(
        "statutoryBenefits.vacationDays",
        `Las vacaciones no pueden estar debajo del mínimo legal de ${legalVacationDays} días.`,
      ));
    }
    if (!isPresentFiniteNumber(benefits.aguinaldoDays) || Number(benefits.aguinaldoDays) < 15) {
      errors.push(validationError("statutoryBenefits.aguinaldoDays", "El aguinaldo no puede estar debajo de 15 días."));
    }
    if (!isPresentFiniteNumber(benefits.vacationPremiumRate)
      || Number(benefits.vacationPremiumRate) < 25
      || Number(benefits.vacationPremiumRate) > 100) {
      errors.push(validationError(
        "statutoryBenefits.vacationPremiumRate",
        "La prima vacacional debe estar entre 25% y 100%.",
      ));
    }
    for (const field of ["annualPtu", "monthlyVouchers", "annualMedicalInsurance"]) {
      const value = benefits[field];
      if (value !== "" && value !== null && value !== undefined
        && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        errors.push(validationError(`statutoryBenefits.${field}`, "Este beneficio no puede ser negativo."));
      }
    }
  } else if (offer?.resicoEligibilityStatus !== "eligible") {
    errors.push(validationError(
      "resicoEligibilityStatus",
      offer?.resicoEligibilityStatus === "ineligible"
        ? "Esta oferta necesita otro régimen fiscal; RESICO no aplica al perfil indicado."
        : "Confirma los requisitos personales de RESICO antes de comparar.",
    ));
  }

  errors.push(...validateRsu(offer?.rsu, assumptions.fxRate, offer?.relationship));
  return uniqueErrors(errors);
}

function projectedBenefits(baseBenefits, yearIndex) {
  const base = { ...defaultStatutoryBenefits, ...(baseBenefits ?? {}) };
  const tenureYears = Math.max(1, Math.floor(finiteNumber(base.tenureYears, 1))) + yearIndex;
  return {
    ...base,
    tenureYears,
    vacationDays: Math.max(nonNegative(base.vacationDays), statutoryVacationDays(tenureYears)),
  };
}

function calculatePayrollYear(offer, assumptions, yearIndex) {
  const calendarYear = TAX_YEAR + yearIndex;
  const fxRate = finiteNumber(assumptions.fxRate);
  const monthlyGross = toMxn(offer.monthlyPay, offer.currency, fxRate);
  const gross = monthlyGross * 12;
  const components = componentTotalsForYear(offer, fxRate, yearIndex);
  const benefitsInput = projectedBenefits(offer.statutoryBenefits, yearIndex);
  const statutoryBenefits = calculateAnnualStatutoryBenefits(monthlyGross, benefitsInput);
  const imss = calculateEmployeeImss(monthlyGross, benefitsInput, components.fixedMonthlySbc);
  const employerContributions = calculateEmployerContributions(imss, 1, calendarYear);

  const monthlyTaxBasis = monthlyGross + components.monthlyTaxable;
  const taxProfile = calculateMonthlyPayrollIsr(monthlyTaxBasis);
  const annualBaseTaxable = monthlyTaxBasis * 12;
  const statutoryTaxable = statutoryBenefits.aguinaldoTaxable
    + statutoryBenefits.vacationPremiumTaxable
    + statutoryBenefits.ptuTaxable;
  const otherComponentTaxable = Math.max(0, components.taxable - components.monthlyTaxable * 12);
  const annualNonEquityTaxable = statutoryTaxable + otherComponentTaxable;
  const equity = vestedValueForYear(offer.rsu, yearIndex, fxRate);
  const annualTaxAtBase = calculateAnnualPayrollIsr(annualBaseTaxable).annualTax;
  const annualTaxBeforeEquity = calculateAnnualPayrollIsr(
    annualBaseTaxable + annualNonEquityTaxable,
  ).annualTax;
  const annualTaxWithEquity = calculateAnnualPayrollIsr(
    annualBaseTaxable + annualNonEquityTaxable + equity,
  ).annualTax;
  const baseTaxes = taxProfile.monthlyTax * 12;
  const benefitTaxes = Math.max(0, annualTaxBeforeEquity - annualTaxAtBase);
  const equityTax = Math.max(0, annualTaxWithEquity - annualTaxBeforeEquity);
  const taxes = baseTaxes + benefitTaxes;

  const monthlyRecurringCosts = nonNegative(offer.additionalDeductions)
    + nonNegative(offer.accountant)
    + nonNegative(offer.insurance)
    + imss.monthly;
  const recurringCosts = monthlyRecurringCosts * 12;
  const fxFeeRate = percentage(offer.fxFee) / 100;
  const fxFees = (offer.currency === "USD" ? gross : 0) * fxFeeRate
    + components.usdCash * fxFeeRate;
  const monthlyFxFees = (offer.currency === "USD" ? monthlyGross : 0) * fxFeeRate
    + components.monthlyUsdCash * fxFeeRate;
  const statutoryCash = statutoryBenefits.aguinaldoGross
    + statutoryBenefits.vacationPremiumGross
    + statutoryBenefits.ptuGross;
  const employeeSavingsFund = statutoryBenefits.employeeSavingsFund;
  const employerSavingsFund = statutoryBenefits.employerSavingsFund;
  const equityFees = equity * (percentage(offer.rsu?.saleFeeRate) / 100);
  const equityNet = equity - equityTax - equityFees;
  const regularCash = gross
    + components.cash
    + statutoryCash
    - taxes
    - recurringCosts
    - fxFees
    - employeeSavingsFund;
  const recurringMonthlyCash = monthlyGross
    + components.monthlyCash
    - taxProfile.monthlyTax
    - monthlyRecurringCosts
    - monthlyFxFees
    - employeeSavingsFund / 12;
  const employerContributionValue = employerContributions.retirement
    + employerContributions.ceav
    + employerContributions.infonavit;
  const economicValue = regularCash
    + components.nonCash
    + employeeSavingsFund
    + employerSavingsFund
    + statutoryBenefits.vouchers
    + statutoryBenefits.medicalInsurance
    + employerContributionValue
    + equityNet;

  return {
    calendarYear,
    valid: true,
    monthlyGross,
    gross,
    taxes,
    totalTaxes: taxes + equityTax,
    baseTaxes,
    benefitTaxes,
    equityTax,
    taxProfile,
    imss,
    statutoryBenefits,
    employerContributions,
    recurringCosts,
    fxFees,
    unpaidDays: 0,
    unpaidTime: 0,
    costs: recurringCosts + fxFees,
    categories: components.categories,
    cashComponents: components.cash,
    nonCashComponents: components.nonCash,
    aguinaldo: statutoryBenefits.aguinaldoGross,
    vacationPremium: statutoryBenefits.vacationPremiumGross,
    ptu: statutoryBenefits.ptuGross,
    vouchers: statutoryBenefits.vouchers,
    employeeSavingsFund,
    employerSavingsFund,
    medicalInsurance: statutoryBenefits.medicalInsurance,
    equity,
    equityFees,
    equityNet,
    regularCash,
    recurringMonthlyCash,
    economicValue,
  };
}

function calculateContractorYear(offer, assumptions, yearIndex) {
  const calendarYear = TAX_YEAR + yearIndex;
  const fxRate = finiteNumber(assumptions.fxRate);
  const monthlyGross = toMxn(offer.monthlyPay, offer.currency, fxRate);
  const gross = monthlyGross * 12;
  const components = componentTotalsForYear(offer, fxRate, yearIndex);
  const paidVacationDays = offer.paidVacationDays === null
    ? 0
    : nonNegative(offer.paidVacationDays);
  const unpaidDays = Math.max(0, nonNegative(offer.plannedTimeOffDays) - paidVacationDays);
  const unpaidTime = gross * (unpaidDays / CONTRACTOR_WORK_DAYS_PER_YEAR);
  const billableBase = Math.max(0, gross - unpaidTime);
  const taxableIncome = billableBase + components.taxable;
  const taxProfile = calculateAnnualResico(
    taxableIncome,
    offer.resicoEligibilityStatus ?? "unconfirmed",
  );
  const baseTaxes = taxProfile.eligible ? billableBase * (taxProfile.rate / 100) : null;
  const benefitTaxes = taxProfile.eligible ? components.taxable * (taxProfile.rate / 100) : null;
  const taxes = taxProfile.eligible ? baseTaxes + benefitTaxes : null;
  const monthlyRecurringCosts = nonNegative(offer.additionalDeductions)
    + nonNegative(offer.accountant)
    + nonNegative(offer.insurance);
  const recurringCosts = monthlyRecurringCosts * 12;
  const fxFeeRate = percentage(offer.fxFee) / 100;
  const fxFees = (offer.currency === "USD" ? billableBase : 0) * fxFeeRate
    + components.usdCash * fxFeeRate;
  const monthlyFxFees = (offer.currency === "USD" ? monthlyGross : 0) * fxFeeRate
    + components.monthlyUsdCash * fxFeeRate;
  const recurringMonthlyTax = taxProfile.eligible
    ? (monthlyGross + components.monthlyTaxable) * (taxProfile.rate / 100)
    : null;
  const regularCash = taxProfile.eligible
    ? gross + components.cash - unpaidTime - taxes - recurringCosts - fxFees
    : null;
  const recurringMonthlyCash = taxProfile.eligible
    ? monthlyGross
      + components.monthlyCash
      - recurringMonthlyTax
      - monthlyRecurringCosts
      - monthlyFxFees
    : null;
  const economicValue = regularCash === null ? null : regularCash + components.nonCash;

  return {
    calendarYear,
    valid: taxProfile.eligible,
    monthlyGross,
    gross,
    billableBase,
    taxes,
    totalTaxes: taxes,
    baseTaxes,
    benefitTaxes,
    equityTax: 0,
    taxProfile,
    imss: null,
    statutoryBenefits: null,
    employerContributions: {
      annualSbc: 0,
      retirement: 0,
      ceav: 0,
      ceavRate: 0,
      ceavRates: [],
      infonavit: 0,
    },
    recurringCosts,
    fxFees,
    unpaidDays,
    unpaidTime,
    costs: recurringCosts + fxFees + unpaidTime,
    categories: components.categories,
    cashComponents: components.cash,
    nonCashComponents: components.nonCash,
    aguinaldo: 0,
    vacationPremium: 0,
    ptu: 0,
    vouchers: 0,
    employeeSavingsFund: 0,
    employerSavingsFund: 0,
    medicalInsurance: 0,
    equity: 0,
    equityFees: 0,
    equityNet: 0,
    regularCash,
    recurringMonthlyCash,
    economicValue,
  };
}

function aggregateEmployerContributions(yearResults) {
  const ceavRates = yearResults.flatMap((year) => year.employerContributions.ceavRates ?? []);
  return {
    annualSbc: yearResults[0]?.employerContributions.annualSbc ?? 0,
    retirement: sum(yearResults, (year) => year.employerContributions.retirement),
    ceav: sum(yearResults, (year) => year.employerContributions.ceav),
    ceavRate: ceavRates[0]?.rate ?? 0,
    ceavRates,
    infonavit: sum(yearResults, (year) => year.employerContributions.infonavit),
  };
}

export function calculateOffer(offer, assumptions, months) {
  const yearCount = Math.max(1, Math.floor(nonNegative(months) / 12));
  const inputErrors = validateOffer(offer, assumptions);
  const payroll = isPayrollOffer(offer);
  const yearResults = Array.from({ length: yearCount }, (_, yearIndex) => (
    payroll
      ? calculatePayrollYear(offer, assumptions, yearIndex)
      : calculateContractorYear(offer, assumptions, yearIndex)
  ));
  const taxInvalidReasons = yearResults.reduce((reasons, year) => {
    const reason = !payroll && !year.taxProfile?.eligible
      ? year.taxProfile.reason
      : null;
    if (reason) reasons.push(reason);
    return reasons;
  }, []);
  const valid = inputErrors.length === 0 && yearResults.every((year) => year.valid);
  const regularCash = valid ? sum(yearResults, (year) => year.regularCash) : null;
  const economicValue = valid ? sum(yearResults, (year) => year.economicValue) : null;
  const recurringMonthlyCash = valid
    ? average(yearResults, (year) => year.recurringMonthlyCash)
    : null;
  const firstYear = yearResults[0];
  const employerContributions = aggregateEmployerContributions(yearResults);
  const statutoryYears = yearResults.reduce((years, year) => {
    if (year.statutoryBenefits) years.push(year.statutoryBenefits);
    return years;
  }, []);
  const statutoryBenefits = statutoryYears.length
    ? {
      ...statutoryYears[0],
      yearBenefits: statutoryYears,
      vacationDaysByYear: statutoryYears.map((benefits) => benefits.vacationDays),
    }
    : null;
  const imss = firstYear.imss
    ? { ...firstYear.imss, yearProfiles: yearResults.map((year) => year.imss) }
    : null;
  const taxProfile = {
    ...firstYear.taxProfile,
    yearProfiles: yearResults.map((year) => year.taxProfile),
  };
  const categories = yearResults.reduce((totals, year) => {
    for (const [category, value] of Object.entries(year.categories)) {
      totals[category] = (totals[category] ?? 0) + value;
    }
    return totals;
  }, { reimbursement: 0, bonus: 0, protection: 0, other: 0 });

  return {
    calculationType: payroll ? "payroll" : "contractor",
    inputErrors,
    invalidReasons: [...inputErrors.map((error) => error.message), ...taxInvalidReasons],
    projection: { ...PROJECTION_POLICY, years: yearResults.map((year) => year.calendarYear) },
    yearResults,
    monthlyGross: firstYear.monthlyGross,
    gross: sum(yearResults, (year) => year.gross),
    taxes: valid ? sum(yearResults, (year) => year.taxes) : null,
    totalTaxes: valid ? sum(yearResults, (year) => year.totalTaxes) : null,
    baseTaxes: valid ? sum(yearResults, (year) => year.baseTaxes) : null,
    benefitTaxes: valid ? sum(yearResults, (year) => year.benefitTaxes) : null,
    equityTax: sum(yearResults, (year) => year.equityTax),
    taxProfile,
    imss,
    statutoryBenefits,
    employerContributions,
    valid,
    unpaidDays: firstYear.unpaidDays,
    unpaidTime: sum(yearResults, (year) => year.unpaidTime),
    recurringCosts: sum(yearResults, (year) => year.recurringCosts),
    fxFees: sum(yearResults, (year) => year.fxFees),
    costs: sum(yearResults, (year) => year.costs),
    reimbursements: categories.reimbursement,
    bonuses: categories.bonus,
    protection: categories.protection + categories.other,
    aguinaldo: sum(yearResults, (year) => year.aguinaldo),
    vacationPremium: sum(yearResults, (year) => year.vacationPremium),
    ptu: sum(yearResults, (year) => year.ptu),
    vouchers: sum(yearResults, (year) => year.vouchers),
    employeeSavingsFund: sum(yearResults, (year) => year.employeeSavingsFund),
    employerSavingsFund: sum(yearResults, (year) => year.employerSavingsFund),
    medicalInsurance: sum(yearResults, (year) => year.medicalInsurance),
    equity: sum(yearResults, (year) => year.equity),
    equityFees: sum(yearResults, (year) => year.equityFees),
    equityNet: sum(yearResults, (year) => year.equityNet),
    regularCash,
    recurringMonthlyCash,
    averageMonthlyCash: regularCash === null ? null : regularCash / (yearCount * 12),
    monthlyCash: regularCash === null ? null : regularCash / (yearCount * 12),
    economicValue,
  };
}

export function calculateComparison(offers, assumptions, horizon) {
  const months = horizon === "three-years" ? 36 : 12;
  const employee = calculateOffer(offers.employee, assumptions, months);
  const contractor = calculateOffer(offers.contractor, assumptions, months);
  return { months, employee, contractor, valid: employee.valid && contractor.valid };
}

export function describeDifference(offers, calculations) {
  if (!calculations.employee.valid || !calculations.contractor.valid) return null;
  const difference = calculations.contractor.averageMonthlyCash
    - calculations.employee.averageMonthlyCash;
  const winner = difference >= 0 ? offers.contractor.name : offers.employee.name;
  const other = difference >= 0 ? offers.employee.name : offers.contractor.name;
  const amount = MXN.format(Math.abs(difference));
  return { winner, other, amount, difference };
}

export function createComponent(category) {
  const defaults = {
    bonus: {
      name: "Bono",
      amount: 40000,
      frequency: "annual",
      taxable: true,
      cash: true,
    },
    reimbursement: {
      name: "Reembolso",
      amount: 1600,
      frequency: "monthly",
      taxable: false,
      cash: false,
    },
    protection: {
      name: "Seguro o ahorro",
      amount: 30000,
      frequency: "annual",
      taxable: false,
      cash: false,
    },
  };

  return {
    id: `${category}-${Date.now()}`,
    category,
    currency: "MXN",
    utilization: 100,
    ...defaults[category],
  };
}
