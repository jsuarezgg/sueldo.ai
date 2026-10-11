import { MXN, USD } from "./compensation.js";

export const MXN_WITH_CENTS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const PLAIN_AMOUNT = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

const SOURCE_DATE = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatSourceDate(value) {
  return value ? SOURCE_DATE.format(new Date(`${value}T12:00:00`)) : null;
}

export function formatGrantValue(value, currency = "MXN") {
  return (currency === "USD" ? USD : MXN).format(Number(value) || 0);
}

export const CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN" },
  { value: "USD", label: "USD" },
];

export const CADENCE_OPTIONS = [
  { value: 1, label: "Mensual" },
  { value: 3, label: "Trimestral" },
  { value: 6, label: "Semestral" },
  { value: 12, label: "Al final del año" },
];

export function cadenceLabel(cadence) {
  return CADENCE_OPTIONS.find((option) => option.value === cadence)?.label ?? "Periódico";
}

// Calculation reasons are either engine messages (already Spanish) or RESICO codes.
const REASON_COPY = {
  "income-limit": "Los ingresos anualizados superan el límite de $3,500,000 para RESICO.",
  "profile-ineligible": "El perfil indicado requiere otro régimen fiscal.",
  "profile-unconfirmed": "Confirma los requisitos personales de RESICO antes de comparar.",
};

const REASON_SUMMARY = {
  "income-limit": "Supera el límite anual de RESICO",
  "profile-ineligible": "RESICO no aplica a este perfil",
  "profile-unconfirmed": "Confirma tu perfil de RESICO",
};

export function describeInvalidReason(reason) {
  return REASON_COPY[reason] ?? reason ?? "Faltan datos para calcular";
}

export function summarizeInvalidCalculation(calculation) {
  return REASON_SUMMARY[calculation.taxProfile?.reason]
    ?? describeInvalidReason(calculation.invalidReasons[0]);
}

export function describeResico(profile) {
  switch (profile.reason) {
    case "income-limit":
      return `${MXN.format(profile.annualIncome)} gravados al año superan el límite de RESICO de ${MXN.format(3500000)}`;
    case "profile-unconfirmed":
      return "Confirma tu elegibilidad para RESICO en el paso Ofertas";
    case "profile-ineligible":
      return "El perfil indicado requiere otro régimen fiscal";
    default:
      return `${profile.rate.toFixed(2)}% · ${MXN.format(profile.annualIncome)} gravados en el año`;
  }
}
