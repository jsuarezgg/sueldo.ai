import { z } from "zod";
import { calculateComparison, defaultStatutoryBenefits, validateOffer } from "../src/compensation.js";
import { createShareUrl } from "../src/share-link.js";

const money = z.number().min(0).max(1_000_000_000);
const percent = z.number().min(0).max(100);
const currency = z.enum(["MXN", "USD"]);
const days = z.number().min(0).max(260);

const benefitsSchema = z.strictObject({
  tenureYears: z.number().int().min(1).max(80),
  aguinaldoDays: z.number().min(15).max(365),
  vacationDays: z.number().min(12).max(365),
  vacationPremiumRate: z.number().min(25).max(100),
  annualPtu: money.describe("PTU anual en MXN; 0 si no se incluye."),
  monthlyVouchers: money.describe("Vales mensuales en MXN."),
  savingsFundIncluded: z.boolean().describe("Fondo de ahorro calificado: aportaciones iguales, 13% con tope de 1.3 UMA anual."),
  annualMedicalInsurance: money.describe("Valor anual del seguro patronal en MXN, no efectivo."),
});

const componentSchema = z.strictObject({
  name: z.string().min(1).max(120).describe("Etiqueta genérica del concepto; no incluir datos personales."),
  category: z.enum(["bonus", "reimbursement", "protection", "other"]),
  amount: money,
  currency,
  frequency: z.enum(["monthly", "quarterly", "semiannual", "annual", "once"]),
  taxable: z.boolean(),
  cash: z.boolean().describe("Si llega como efectivo disponible; un reembolso o protección no necesariamente lo es."),
  utilization: percent.describe("Porcentaje del beneficio que se espera utilizar."),
});

const rsuSchema = z.strictObject({
  grantValue: money.positive(),
  currency,
  cliffMonth: z.number().int().min(0).max(144),
  cadence: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  saleFeeRate: percent,
  allocations: z.array(z.strictObject({
    year: z.number().int().min(1).max(12),
    percent,
  })).min(1).max(12).describe("Años consecutivos desde 1; los porcentajes deben sumar 100."),
});

const offerSchema = z.strictObject({
  name: z.string().min(1).max(160).optional().describe("Etiqueta opcional. Preferir Oferta A/B; no enviar nombres de personas o empresas."),
  relationship: z.enum(["Nómina", "Contratista independiente"]),
  currency,
  monthlyPay: money.positive().describe("Pago bruto mensual en la moneda indicada."),
  additionalDeductions: money.describe("Otras deducciones mensuales en MXN, sin duplicar ISR o IMSS calculados."),
  accountant: money.describe("Costo mensual de contabilidad en MXN. En nómina usar 0 e incluir este costo en additionalDeductions."),
  insurance: money.describe("Seguro personal mensual en MXN. En nómina usar 0 e incluir este costo en additionalDeductions."),
  fxFee: percent.describe("Comisión porcentual sobre ingresos en USD convertidos a MXN. En nómina con sueldo base MXN usar 0."),
  plannedTimeOffDays: days.describe("Días al año sin trabajar como contractor; 0 para nómina."),
  paidVacationDays: days.nullable().describe("Días pagados como contractor. null significa sin prestación, equivalente a 0; para nómina usar null."),
  resicoEligibilityStatus: z.enum(["eligible", "unconfirmed", "ineligible"])
    .describe("Contractor requiere eligible confirmado por la persona; nunca inferirlo del sueldo. En nómina usar unconfirmed."),
  statutoryBenefits: benefitsSchema.nullable().describe("Obligatorio para nómina; null para contractor. No inventar prestaciones."),
  components: z.array(componentSchema).max(32).describe("Compensación adicional. [] sólo si se confirmó que no se incluye."),
  rsu: rsuSchema.nullable().describe("RSUs sólo en nómina; null si no hay grant incluido."),
});

export const compareOffersInputSchema = z.strictObject({
  offers: z.strictObject({
    employee: offerSchema.describe("Oferta A. La clave histórica employee NO obliga a que sea nómina."),
    contractor: offerSchema.describe("Oferta B. La clave histórica contractor NO obliga a que sea contractor."),
  }),
  assumptions: z.strictObject({
    fxRate: z.number().positive().max(1_000)
      .describe("MXN por USD, tasa explícita y fija. Se requiere incluso con montos sólo en MXN para futuras ediciones de moneda en el enlace; no inventar una tasa."),
    fxDate: z.iso.date().nullable().describe("Fecha de referencia proporcionada para la tasa, YYYY-MM-DD, o null si no hay. No se verifica con Banxico."),
  }),
  horizon: z.enum(["year", "three-years"]).describe("12 o 36 meses, comenzando con las reglas 2026 del sitio."),
});

const notices = [
  "Estimación informativa para residentes fiscales en México; no es asesoría fiscal, contable, legal ni de inversión.",
  "Mantén separados el efectivo disponible, las prestaciones restringidas, la protección, las aportaciones patronales y las RSUs.",
  "El enlace contiene ambas ofertas y sus supuestos; cualquiera con la URL completa puede leerlos. No equivale a cifrado.",
  "El servidor procesa los datos durante la solicitud, sin guardarlos ni registrarlos en logs de la aplicación. El cliente de IA y el alojamiento tienen sus propias políticas.",
];

function result(payload, isError = false) {
  const text = JSON.stringify(payload);
  // An unbounded tax bracket has Infinity as its upper limit in the engine.
  // JSON represents that as null; keep text and structured output identical.
  return { isError, content: [{ type: "text", text }], structuredContent: JSON.parse(text) };
}

// SDK validation runs first; keep this boundary independently usable and testable.
export function compareOffers(input) {
  const parsed = compareOffersInputSchema.safeParse(input);
  if (!parsed.success) {
    return result({ status: "invalid_input", errors: parsed.error.issues.map((issue) => ({
      field: issue.path.join("."), message: issue.message,
    })), nextStep: "Pregunta por los datos faltantes o inválidos; no los sustituyas por valores de ejemplo." }, true);
  }
  const { offers: supplied, assumptions: fx, horizon } = parsed.data;
  const errors = [];
  const usesUsd = Object.values(supplied).some((offer) => offer.currency === "USD"
    || offer.components.some((component) => component.currency === "USD") || offer.rsu?.currency === "USD");
  for (const [key, offer] of Object.entries(supplied)) {
    if (offer.relationship === "Nómina" && offer.statutoryBenefits === null) {
      errors.push({ field: `offers.${key}.statutoryBenefits`, message: "Confirma las prestaciones de nómina." });
    }
    if (offer.relationship === "Contratista independiente" && offer.statutoryBenefits !== null) {
      errors.push({ field: `offers.${key}.statutoryBenefits`, message: "Las prestaciones legales son de nómina. Para contractor usa components y días pagados; statutoryBenefits debe ser null." });
    }
    if (offer.relationship === "Nómina" && (offer.plannedTimeOffDays !== 0 || offer.paidVacationDays !== null)) {
      errors.push({ field: `offers.${key}.plannedTimeOffDays`, message: "Para nómina usa statutoryBenefits.vacationDays; plannedTimeOffDays debe ser 0 y paidVacationDays null." });
    }
    if (offer.relationship === "Nómina" && (offer.accountant !== 0 || offer.insurance !== 0)) {
      errors.push({ field: `offers.${key}.additionalDeductions`, message: "El editor de nómina agrupa costos personales en additionalDeductions. Incluye ahí contabilidad y seguro personal, y usa 0 en accountant e insurance." });
    }
    if (offer.relationship === "Nómina" && offer.currency === "MXN" && offer.fxFee !== 0) {
      errors.push({ field: `offers.${key}.fxFee`, message: "El editor sólo permite comisión cambiaria en nómina con sueldo base USD. Usa 0 o solicita una comparación que el editor soporte." });
    }
  }
  if (errors.length) return result({ status: "invalid_input", errors }, true);

  const assumptions = { fxRate: fx.fxRate, fxDate: fx.fxDate, fxManual: true, fxStatus: "manual" };
  const offers = Object.fromEntries(Object.entries(supplied).map(([key, offer], index) => [key, {
    ...offer,
    id: key,
    name: offer.name ?? (index === 0 ? "Oferta A" : "Oferta B"),
    // The editor retains this display field; MCP does not collect location.
    location: "",
    // Unused for contractor calculations; complete the existing editor's state.
    statutoryBenefits: offer.statutoryBenefits ?? { ...defaultStatutoryBenefits },
    components: offer.components.map((component, i) => ({ ...component, id: `${key}-${i}` })),
  }]));
  for (const [key, offer] of Object.entries(offers)) {
    errors.push(...validateOffer(offer, assumptions).map((error) => ({ ...error, field: `offers.${key}.${error.field}` })));
  }
  if (errors.length) return result({ status: "invalid_input", errors }, true);

  const calculations = calculateComparison(offers, assumptions, horizon);
  if (!calculations.valid) {
    return result({ status: "unsupported", errors: ["employee", "contractor"].flatMap((key) => (
      calculations[key].invalidReasons.map((reason) => ({
        field: `offers.${key}`,
        message: reason === "income-limit" ? "El ingreso anualizado supera el límite de MXN 3.5 millones de RESICO. Este régimen no es aplicable." : reason,
      }))
    )) }, true);
  }
  let editUrl;
  try {
    editUrl = createShareUrl({ offers, assumptions, horizon });
  } catch {
    return result({ status: "invalid_input", errors: [{ field: "offers", message: "La comparación excede el tamaño del enlace editable. Reduce conceptos o etiquetas." }] }, true);
  }
  return result({
    status: "ok", currency: "MXN", horizon,
    // Echo schema-valid arguments so a client can change one assumption and
    // call again without copying editor-only IDs or ignored benefit defaults.
    inputs: {
      offers: Object.fromEntries(Object.entries(supplied).map(([key, offer]) => [key, {
        name: offers[key].name, ...offer,
      }])),
      assumptions: fx, horizon,
    },
    fx: { used: usesUsd, source: usesUsd ? "provided_fixed_rate" : "not_used", referenceDateVerified: false },
    calculations, editUrl, methodologyUrl: "https://sueldo.ai/metodologia", notices,
  });
}
