import { exampleInput } from "./mcp.mjs";

// Entirely synthetic submission scenarios. Each case starts a fresh conversation.
const context = "Es un caso ficticio para una persona residente fiscal en México. Todos los sueldos son brutos mensuales; usa etiquetas Oferta A y Oferta B. ";
const payroll = "Para cada nómina: antigüedad de 1 año, aguinaldo de 15 días, 12 días de vacaciones y prima de 25%; PTU, vales y seguro patronal en cero, sin fondo de ahorro. Sin costos personales, comisiones cambiarias ni otros conceptos, salvo los indicados. ";
const contractor = "Para cada contractor confirmo elegibilidad personal para RESICO: contabilidad de 1,000 MXN y seguro personal de 2,000 MXN al mes, comisión cambiaria de 0.5%, 15 días sin trabajar al año y 5 pagados. Sin otras deducciones, prestaciones, bonos, reembolsos o RSUs. ";
const assumptions = "Compara 12 meses con tipo de cambio fijo de 18 MXN/USD, sin fecha de referencia; es mi supuesto, no una tasa actual. Muestra efectivo, valor económico, supuestos y enlace editable. ";

const mixed = exampleInput();
const payrollPair = exampleInput();
payrollPair.offers.employee.monthlyPay = 60000;
payrollPair.offers.contractor = { ...structuredClone(payrollPair.offers.employee), monthlyPay: 70000 };
payrollPair.offers.contractor.statutoryBenefits.monthlyVouchers = 2000;
const contractorPair = exampleInput();
contractorPair.offers.employee = { ...structuredClone(contractorPair.offers.contractor), monthlyPay: 4000 };
contractorPair.offers.contractor.monthlyPay = 4500;
const equity = structuredClone(payrollPair);
equity.horizon = "three-years";
equity.offers.employee.monthlyPay = 70000;
equity.offers.contractor.monthlyPay = 80000;
equity.offers.contractor.statutoryBenefits.monthlyVouchers = 0;
equity.offers.employee.rsu = {
  grantValue: 36000, currency: "USD", cliffMonth: 12, cadence: 3, saleFeeRate: 1,
  allocations: [{ year: 1, percent: 10 }, { year: 2, percent: 20 }, { year: 3, percent: 30 }, { year: 4, percent: 40 }],
};
equity.offers.employee.components = [{
  name: "Equipo", category: "reimbursement", amount: 10000, currency: "MXN",
  frequency: "once", taxable: false, cash: false, utilization: 50,
}];
const lowerFx = structuredClone(mixed);
lowerFx.assumptions.fxRate = 16;

export const positiveCases = [
  {
    description: "Payroll versus confirmed RESICO contractor",
    prompt: context + "A: nómina de 70,000 MXN. B: contractor de 5,000 USD. " + payroll + "No hay RSUs. " + contractor + assumptions,
    inputs: [mixed],
    expectedCash: [[53267.89, 84750]],
    expected_behavior: "Call compare_offers with the confirmed inputs. Recurring monthly cash is MXN 53,267.89 for A and 84,750.00 for B; B's average monthly cash after time off is 81,375.00. Separate recurring and average cash from benefits/economic value, show fixed FX 18 and the 12-month horizon, explain estimate/link privacy limits, and return the editable sueldo.ai link.",
  },
  {
    description: "Two payroll offers with restricted benefits",
    prompt: context + "A: nómina de 60,000 MXN. B: nómina de 70,000 MXN. " + payroll + "La única excepción es que B tiene vales de 2,000 MXN al mes. Ninguna tiene RSUs. " + assumptions,
    inputs: [payrollPair],
    expectedCash: [[46559.07, 53252.18]],
    expected_behavior: "Accept two payroll offers even though the schema keys are employee and contractor. Recurring monthly cash is MXN 46,559.07 for A and 53,252.18 for B. Show B's vouchers separately from spendable cash; do not classify B as RESICO. Return assumptions and an editable link.",
  },
  {
    description: "Two confirmed RESICO contractor offers",
    prompt: context + "A: contractor de 4,000 USD. B: contractor de 4,500 USD. " + contractor + assumptions,
    inputs: [contractorPair],
    expectedCash: [[67560, 76380]],
    expected_behavior: "Accept two eligible RESICO offers. Recurring monthly cash is MXN 67,560.00 for A and 76,380.00 for B. Average monthly cash, including time off, is 64,846.15 and 73,326.92 respectively. Show explicit FX, costs, time off and the editable link; do not add payroll benefits.",
  },
  {
    description: "Three-year payroll RSU vesting and noncash reimbursement",
    prompt: context + "A: nómina de 70,000 MXN. B: nómina de 80,000 MXN. " + payroll + "B no tiene RSUs. A tiene un grant total de RSUs de 36,000 USD con asignaciones de 10%, 20%, 30% y 40% en los años 1 a 4; cliff de 12 meses, cadencia de 3 meses y comisión de venta de 1%. A también tiene un reembolso de equipo único de 10,000 MXN, no gravable ni efectivo disponible, con utilización de 50%. Compara 36 meses con FX fijo de 18 MXN/USD y sin fecha de referencia. Separa efectivo, reembolso y equity vestida; muestra supuestos y enlace editable.",
    inputs: [equity],
    expectedCash: [[53265.17, 59973.59]],
    expected_behavior: "Calculate 36 months. A has MXN 388,800.00 of gross vested equity (60% of the grant), not the entire four-year grant, and a MXN 5,000.00 utilized noncash reimbursement. Show equity taxes/fees and net equity separately; recurring monthly cash is MXN 53,265.17 for A and 59,973.59 for B. Do not add restricted/reimbursement value to spendable cash. The editable link must preserve the four-year schedule, cliff, cadence, utilization and three-year horizon.",
  },
  {
    description: "Follow-up changes only FX. After the initial result, send a second message: ¿Y si el dólar baja a 16? Mantén los demás datos.",
    prompt: context + "A: nómina de 70,000 MXN. B: contractor de 5,000 USD. " + payroll + "No hay RSUs. " + contractor + assumptions,
    inputs: [mixed, lowerFx],
    expectedCash: [[53267.89, 84750], [53267.89, 75400]],
    expected_behavior: "First reproduce case 1. After the user sends the FX follow-up, call compare_offers again, changing only fxRate from 18 to 16. B's recurring monthly cash changes from MXN 84,750.00 to 75,400.00; A stays at 53,267.89. Show that 16 is a hypothetical fixed rate, not a live quote, and return an updated editable link. Do not recalculate taxes outside the tool or ask again for already confirmed inputs.",
  },
];

export const negativeCases = [
  {
    description: "Ambiguous currency and only one offer: clarification, no calculation",
    prompt: "Me ofrecen $65,000 al mes, ¿me conviene?",
    expected_behavior: "Do not call compare_offers or invent a second offer or net pay. Explain that two scenarios are required. Ask at most three concrete questions to clarify missing scope, currency and gross/net basis; continue intake in stages.",
  },
  {
    description: "Unconfirmed RESICO eligibility: block calculation",
    prompt: context + "A: nómina mexicana de 70,000 MXN. B: contractor de 5,000 USD. No sé si soy elegible para RESICO; asume que sí y dime el neto.",
    expected_behavior: "Do not assume eligibility from income or call with eligible. Explain that personal eligibility must be confirmed before a RESICO result. Ask a focused clarification; do not invent net pay or a result link. If called with unconfirmed, the tool must return an error without a calculation.",
  },
  {
    description: "Tax residence outside Mexico: unsupported jurisdiction",
    prompt: "Soy residente fiscal en Colombia. Compara dos ofertas de contractor de 5,000 y 6,000 USD mensuales aplicando impuestos colombianos.",
    expected_behavior: "Do not call compare_offers or substitute Mexican taxes. Explain that this tool supports tax residents of Mexico and cannot calculate Colombian taxes. Do not return Mexican estimates as a supported comparison.",
  },
];
