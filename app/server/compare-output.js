// Presentation and protocol only: amounts below come directly from compensation.js.
const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
};
const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const number = (label, unit, minimum = 0, maximum = 1e9) => ({ label, type: "number", unit, minimum, maximum });
const choice = (label, allowed_values) => ({ label, type: "string", allowed_values });
const boolean = (label) => ({ label, type: "boolean", allowed_values: [true, false] });
const FIELD_INFO = {
  type: choice("la relación contractual", ["payroll", "contractor"]),
  monthly_pay: { ...number("el salario base bruto mensual", "offer_currency/month"), exclusive_minimum: 0 },
  currency: choice("la moneda del importe", ["MXN", "USD"]),
  resico_eligible: boolean("tu elegibilidad personal confirmada para RESICO (no se deduce de la oferta)"),
  additional_deductions: number("las deducciones adicionales mensuales", "MXN/month"),
  accountant: number("el costo mensual de contabilidad", "MXN/month"),
  insurance: number("el costo mensual de tu seguro", "MXN/month"),
  fx_fee: number("la comisión cambiaria", "percent", 0, 100),
  planned_time_off_days: number("los días previstos sin trabajar por año", "days/year", 0, 260),
  paid_vacation_days: number("los días pagados sin trabajar por año", "days/year", 0, 260),
  tenure_years: number("la antigüedad aplicable al inicio", "years", 1),
  aguinaldo_days: number("los días de aguinaldo", "days/year", 15),
  vacation_days: number("los días de vacaciones, al menos el mínimo para tu antigüedad", "days/year", 12),
  vacation_premium_rate: number("la prima vacacional", "percent", 25, 100),
  annual_ptu: number("la PTU anual estimada", "MXN/year"),
  monthly_vouchers: number("los vales mensuales", "MXN/month"),
  savings_fund_included: boolean("si incluye el fondo de ahorro modelado por sueldo.ai"),
  annual_medical_insurance: number("el valor anual del seguro médico del empleador", "MXN/year"),
  components: { label: "los componentes adicionales", type: "array", max_items: 32 },
  "components.*.category": choice("la categoría del componente", ["reimbursement", "bonus", "protection", "other"]),
  "components.*.amount": number("el importe por periodo del componente", "component_currency/frequency"),
  "components.*.currency": choice("la moneda del componente", ["MXN", "USD"]),
  "components.*.frequency": choice("la frecuencia del componente", ["monthly", "quarterly", "semiannual", "annual", "once"]),
  "components.*.taxable": boolean("si el componente es gravable (confirma un tratamiento incierto)"),
  "components.*.cash": boolean("si el componente se recibe en efectivo"),
  "components.*.utilization": number("el porcentaje aprovechable del componente", "percent", 0, 100),
  rsu: { label: "el grant y calendario de RSUs", type: "object" },
  "rsu.grantValue": { ...number("el valor total del grant de RSUs", "grant_currency"), exclusive_minimum: 0 },
  "rsu.currency": choice("la moneda del grant", ["MXN", "USD"]),
  "rsu.cliffMonth": number("el mes del cliff de vesting", "months", 0, 144),
  "rsu.cadence": { label: "la frecuencia de vesting en meses", type: "number", allowed_values: [1, 3, 6, 12], unit: "months" },
  "rsu.saleFeeRate": number("la comisión de venta de RSUs", "percent", 0, 100),
  "rsu.allocations": { label: "la distribución anual del grant (años consecutivos, total 100%)", type: "array", min_items: 1, max_items: 12 },
  "rsu.allocations.*.year": { ...number("el año de vesting", "year_index", 1, 12), type: "integer" },
  "rsu.allocations.*.percent": number("el porcentaje del grant para ese año", "percent", 0, 100),
  horizon: choice("el horizonte en años", ["1", "3"]),
  fx_rate: { ...number("el tipo de cambio manual confirmado", "MXN/USD"), exclusive_minimum: 0 },
  fx_date: { label: "la fecha de la referencia cambiaria manual", type: "string", format: "YYYY-MM-DD" },
};

export function inputIssue(field, reason, code = "invalid_value") {
  const offer = field.match(/^([ab])\./u)?.[1];
  const key = field.replace(/^[ab]\./u, "").replace(/\.\d+(?=\.|$)/gu, ".*");
  const info = FIELD_INFO[key];
  const { label, ...expected } = info ?? { label: "el dato indicado", type: "documented_value" };
  const question = `${offer ? `Oferta ${offer.toUpperCase()}: ` : ""}¿Puedes confirmar ${label}?`;
  return { field, code, reason, question, expected };
}

export function summarizeOffer(inputs, result) {
  return {
    inputs,
    net_cash: result.regularCash,
    recurring_month_cash: result.recurringMonthlyCash,
    average_month_cash: result.averageMonthlyCash,
    economic_value: result.economicValue,
    contingent_value: result.equityNet,
    taxes: { income: result.taxes, equity: result.equityTax, total: result.totalTaxes },
    benefits: {
      aguinaldo: result.aguinaldo, vacation_premium: result.vacationPremium,
      ptu: result.ptu, vouchers: result.vouchers,
      employee_savings_fund: result.employeeSavingsFund,
      employer_savings_fund: result.employerSavingsFund,
      medical_insurance: result.medicalInsurance, protection: result.protection,
      employer_contributions: result.employerContributions,
    },
    equity: { gross: result.equity, net: result.equityNet, tax: result.equityTax, fees: result.equityFees },
  };
}

function overview(body) {
  if (body.status !== "ok") {
    return `<h2>Información necesaria</h2><ul>${[...(body.missing_fields ?? []), ...(body.errors ?? [])].map((issue) => `<li><code>${escapeHtml(issue.field)}</code>: ${escapeHtml(issue.reason)} ${escapeHtml(issue.question ?? "")}</li>`).join("")}</ul>`;
  }
  const format = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const rows = [
    ["Efectivo neto del periodo", "net_cash"], ["Efectivo de un mes regular", "recurring_month_cash"],
    ["Promedio mensual neto", "average_month_cash"], ["Valor económico del periodo", "economic_value"],
    ["Valor contingente modelado: equity neto", "contingent_value"],
  ];
  return `<h2>Comparación a ${body.horizon_months} meses · MXN</h2><table><thead><tr><th>Concepto</th><th>Oferta A</th><th>Oferta B</th></tr></thead><tbody>${rows.map(([label, key]) => `<tr><th>${label}</th><td>${format.format(body.summary.offer_a[key])}</td><td>${format.format(body.summary.offer_b[key])}</td></tr>`).join("")}</tbody></table><p>El valor contingente mostrado incluye solo equity neto modelado y ya forma parte del valor económico. No cuantifica todo bono condicionado o PTU incierta. No lo sumes de nuevo.</p>`;
}

export function comparisonResponse(body, status, html = false, extraHeaders = {}) {
  const headers = { ...HEADERS, ...extraHeaders, "Content-Type": html ? "text/html; charset=utf-8" : "application/json; charset=utf-8" };
  const json = JSON.stringify(body, null, 2);
  if (!html) return new Response(json, { status, headers });
  // application/json is inert data, not JavaScript. Escape '<' so even '</script>' cannot terminate it.
  const embeddedJson = json.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
  const content = `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>Comparación sueldo.ai</title></head><body><h1>Resultado de sueldo.ai</h1><p>Estado: <strong>${escapeHtml(body.status)}</strong>. Metodología ${escapeHtml(body.methodology_version)}. Año fiscal base ${body.tax_year}. Importes en MXN. Diferencias: B menos A.</p>${overview(body)}${body.view_url ? `<p><a rel="noreferrer" href="${escapeHtml(body.view_url)}">Abrir comparación interactiva</a></p>` : ""}<h2>Cálculo estructurado completo</h2><p>El JSON siguiente se incluye en esta respuesta HTML inicial; no requiere ejecutar JavaScript. También está disponible en el bloque application/json con id sueldo-result.</p><script id="sueldo-result" type="application/json">${embeddedJson}</script><pre id="sueldo-result-text">${escapeHtml(json)}</pre></body></html>`;
  return new Response(content, { status, headers });
}
