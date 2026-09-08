import { initialOffers } from "./compensation.js";

const SHARE_BASE_URL = "https://sueldo.ai/";
const SHARE_HASH_KEY = "c";
const SHARE_VERSION = 1;
const MAX_SHARE_TOKEN_LENGTH = 20000;
const MAX_COMPONENTS = 32;
const MAX_ALLOCATIONS = 12;

const CURRENCIES = new Set(["MXN", "USD"]);
const RELATIONSHIPS = new Set(["Nómina", "Contratista independiente"]);
const RESICO_STATUSES = new Set(["unconfirmed", "eligible", "ineligible"]);
const FREQUENCIES = new Set(["monthly", "quarterly", "semiannual", "annual", "once"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function textValue(value, fallback, maxLength = 160) {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new Error("Invalid shared text");
  return value.slice(0, maxLength);
}

function choiceValue(value, choices, fallback) {
  if (value === undefined) return fallback;
  if (!choices.has(value)) throw new Error("Invalid shared option");
  return value;
}

function editableNumber(value, fallback) {
  if (value === undefined) return fallback;
  if (value === "") return "";
  if ((typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && !value.trim())) {
    throw new Error("Invalid shared number");
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Invalid shared number");
  return number;
}

function nullableEditableNumber(value, fallback) {
  if (value === null) return null;
  return editableNumber(value, fallback);
}

function booleanValue(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error("Invalid shared boolean");
  return value;
}

function normalizeBenefits(value, fallback) {
  if (value !== undefined && !isObject(value)) throw new Error("Invalid shared benefits");
  const benefits = value ?? {};
  return {
    tenureYears: editableNumber(benefits.tenureYears, fallback.tenureYears),
    aguinaldoDays: editableNumber(benefits.aguinaldoDays, fallback.aguinaldoDays),
    vacationDays: editableNumber(benefits.vacationDays, fallback.vacationDays),
    vacationPremiumRate: editableNumber(
      benefits.vacationPremiumRate,
      fallback.vacationPremiumRate,
    ),
    annualPtu: editableNumber(benefits.annualPtu, fallback.annualPtu),
    monthlyVouchers: editableNumber(benefits.monthlyVouchers, fallback.monthlyVouchers),
    savingsFundIncluded: booleanValue(
      benefits.savingsFundIncluded,
      fallback.savingsFundIncluded,
    ),
    annualMedicalInsurance: editableNumber(
      benefits.annualMedicalInsurance,
      fallback.annualMedicalInsurance,
    ),
  };
}

function normalizeComponent(value, index) {
  if (!isObject(value) || value.amount === undefined || value.frequency === undefined) {
    throw new Error("Invalid shared compensation");
  }
  return {
    id: textValue(value.id, `shared-component-${index}`, 120),
    category: textValue(value.category, "other", 60),
    name: textValue(value.name, "Compensación", 120),
    amount: editableNumber(value.amount, 0),
    frequency: choiceValue(value.frequency, FREQUENCIES, "annual"),
    taxable: booleanValue(value.taxable, false),
    cash: booleanValue(value.cash, false),
    currency: choiceValue(value.currency, CURRENCIES, "MXN"),
    utilization: editableNumber(value.utilization, 100),
  };
}

function normalizeRsu(value) {
  if (value === null || value === undefined) return null;
  if (!isObject(value) || !Array.isArray(value.allocations)
    || !value.allocations.length || value.allocations.length > MAX_ALLOCATIONS
    || value.grantValue === undefined || value.cliffMonth === undefined
    || value.cadence === undefined) {
    throw new Error("Invalid shared vesting schedule");
  }

  const allocations = value.allocations
    .map((allocation, index) => {
      if (!isObject(allocation) || allocation.year === undefined || allocation.percent === undefined) {
        throw new Error("Invalid shared vesting allocation");
      }
      return {
        year: editableNumber(allocation.year, index + 1),
        percent: editableNumber(allocation.percent, 0),
      };
    });

  return {
    grantValue: editableNumber(value.grantValue, 0),
    currency: choiceValue(value.currency, CURRENCIES, "MXN"),
    cliffMonth: editableNumber(value.cliffMonth, 12),
    cadence: editableNumber(value.cadence, 3),
    saleFeeRate: editableNumber(value.saleFeeRate, 0),
    allocations,
  };
}

function normalizeOffer(value, fallback, key) {
  if (!isObject(value) || value.monthlyPay === undefined
    || value.currency === undefined || value.relationship === undefined) {
    throw new Error("Invalid shared offer");
  }
  const offer = value;
  if (offer.components !== undefined && (!Array.isArray(offer.components)
    || offer.components.length > MAX_COMPONENTS)) {
    throw new Error("Invalid shared compensation list");
  }
  const components = offer.components === undefined
    ? structuredClone(fallback.components)
    : offer.components.map(normalizeComponent);

  return {
    id: key,
    name: textValue(offer.name, fallback.name, 160),
    relationship: choiceValue(offer.relationship, RELATIONSHIPS, fallback.relationship),
    location: textValue(offer.location, fallback.location, 80),
    currency: choiceValue(offer.currency, CURRENCIES, fallback.currency),
    monthlyPay: editableNumber(offer.monthlyPay, fallback.monthlyPay),
    additionalDeductions: editableNumber(
      offer.additionalDeductions,
      fallback.additionalDeductions,
    ),
    accountant: editableNumber(offer.accountant, fallback.accountant),
    fxFee: editableNumber(offer.fxFee, fallback.fxFee),
    insurance: editableNumber(offer.insurance, fallback.insurance),
    plannedTimeOffDays: editableNumber(
      offer.plannedTimeOffDays,
      fallback.plannedTimeOffDays,
    ),
    paidVacationDays: nullableEditableNumber(
      offer.paidVacationDays,
      fallback.paidVacationDays,
    ),
    resicoEligibilityStatus: choiceValue(
      offer.resicoEligibilityStatus,
      RESICO_STATUSES,
      fallback.resicoEligibilityStatus,
    ),
    components,
    rsu: normalizeRsu(offer.rsu),
    statutoryBenefits: normalizeBenefits(
      offer.statutoryBenefits,
      fallback.statutoryBenefits,
    ),
  };
}

function normalizeOffers(offers) {
  if (!isObject(offers)) throw new Error("Invalid shared offers");
  return {
    employee: normalizeOffer(offers.employee, initialOffers.employee, "employee"),
    contractor: normalizeOffer(offers.contractor, initialOffers.contractor, "contractor"),
  };
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("Invalid share token");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodePayload(payload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(token) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(token)));
}

function shareTokenFrom(value) {
  const input = String(value ?? "");
  const hash = input.includes("://") ? new URL(input).hash : input;
  const parameters = new URLSearchParams(hash.replace(/^#/u, ""));
  return parameters.get(SHARE_HASH_KEY);
}

export function createShareUrl({ offers, assumptions, horizon }) {
  const fxRate = editableNumber(assumptions.fxRate);
  if (!(fxRate > 0)) throw new Error("Invalid shared exchange rate");
  const payload = {
    v: SHARE_VERSION,
    h: horizon === "three-years" ? "3" : "1",
    o: normalizeOffers(offers),
    a: {
      r: fxRate,
      d: assumptions.fxDate ?? null,
    },
  };
  const token = encodePayload(payload);
  if (token.length > MAX_SHARE_TOKEN_LENGTH) {
    throw new Error("La comparación es demasiado grande para compartirla en un enlace.");
  }
  return `${SHARE_BASE_URL}#${SHARE_HASH_KEY}=${token}`;
}

export function readSharedComparison(value) {
  try {
    const token = shareTokenFrom(value);
    if (!token || token.length > MAX_SHARE_TOKEN_LENGTH) return null;
    const payload = decodePayload(token);
    if (!isObject(payload) || payload.v !== SHARE_VERSION || !isObject(payload.o)) return null;

    const fxRate = editableNumber(payload.a?.r);
    if (!(fxRate > 0)) return null;

    return {
      horizon: payload.h === "3" ? "three-years" : "year",
      offers: normalizeOffers(payload.o),
      assumptions: {
        fxRate,
        fxDate: typeof payload.a?.d === "string" ? payload.a.d.slice(0, 32) : null,
        fxManual: true,
        fxStatus: "manual",
      },
    };
  } catch {
    return null;
  }
}

export function buildUrlShareData(shareUrl) {
  return { url: shareUrl };
}

export function isSharedComparisonHash(value) {
  try {
    return Boolean(shareTokenFrom(value));
  } catch {
    return false;
  }
}
