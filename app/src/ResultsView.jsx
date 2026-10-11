import { Check, PencilSimple, X } from "@phosphor-icons/react";
import {
  EMPLOYMENT_SUBSIDY_2026,
  MXN,
  USD,
  buildVestingEvents,
  calculateComparison,
  describeDifference,
} from "./compensation.js";
import { OFFER_KEYS, OFFER_LABELS, OFFER_LETTERS } from "./capture-state.js";
import { BrandHeader, Disclosure } from "./fields.jsx";
import { MXN_WITH_CENTS, cadenceLabel } from "./format.js";
import { OfferComparison } from "./OfferComparison.jsx";
import { ShareComparison } from "./ShareComparison.jsx";
import { VestingChart, VestingEventGrid } from "./Vesting.jsx";

const HORIZONS = [
  { value: "year", label: "12 meses" },
  { value: "three-years", label: "3 años" },
];

// Each row reads one figure from a calculation; rows that are zero for both offers are hidden.
const LEDGER_ROWS = [
  { label: "Aguinaldo", value: (c) => c.aguinaldo, positive: true },
  {
    label: "Prima vacacional",
    value: (c) => c.vacationPremium,
    detail: (c) => c.statutoryBenefits ? `${c.statutoryBenefits.vacationDaysByYear.join(" → ")} días por año` : null,
    positive: true,
  },
  { label: "PTU estimada", value: (c) => c.ptu, positive: true },
  { label: "ISR sobre efectivo y prestaciones", value: (c) => -c.taxes },
  { label: "ISR estimado sobre RSUs", value: (c) => -c.equityTax },
  { label: "IMSS, contador, seguro y otras deducciones", value: (c) => -c.recurringCosts },
  { label: "Costo cambiario", value: (c) => -c.fxFees },
  {
    label: "Tiempo libre sin pago",
    value: (c) => -c.unpaidTime,
    detail: (c) => c.unpaidDays ? `${c.unpaidDays} días por año` : null,
  },
  { label: "Reembolsos", value: (c) => c.reimbursements, positive: true },
  { label: "Bonos", value: (c) => c.bonuses, positive: true },
  {
    label: "Vales · valor económico, no efectivo",
    value: (c) => c.vouchers,
    detail: (c) => c.vouchers ? "No entran al promedio mensual neto" : null,
    positive: true,
  },
  {
    label: "Fondo de ahorro · empleado",
    value: (c) => -c.employeeSavingsFund,
    detail: (c) => c.employeeSavingsFund ? "Sale de tu efectivo, pero sigue siendo tuyo" : null,
  },
  {
    label: "Fondo de ahorro · empresa",
    value: (c) => c.employerSavingsFund,
    detail: (c) => {
      const benefits = c.statutoryBenefits;
      if (!benefits?.employerSavingsFund) return null;
      return `${MXN.format(benefits.employerSavingsFund / 12)} / mes${benefits.savingsFundCapped ? " · tope fiscal" : ""}`;
    },
    positive: true,
  },
  {
    label: "Fondo de ahorro · saldo propio",
    value: (c) => c.employeeSavingsFund,
    detail: (c) => c.employeeSavingsFund ? "Se suma al valor económico porque sigue siendo tuyo" : null,
    positive: true,
  },
  { label: "SGMM pagado por empresa", value: (c) => c.medicalInsurance, positive: true },
  { label: "Afore · retiro patronal", value: (c) => c.employerContributions.retirement, positive: true },
  {
    label: "Afore · cesantía y vejez",
    value: (c) => c.employerContributions.ceav,
    detail: (c) => c.employerContributions.ceavRates.length
      ? c.employerContributions.ceavRates.map(({ year, rate }) => `${year}: ${rate.toFixed(3)}%`).join(" · ")
      : null,
    positive: true,
  },
  { label: "Infonavit · aportación patronal", value: (c) => c.employerContributions.infonavit, positive: true },
  { label: "Seguro, ahorro y otra protección", value: (c) => c.protection, positive: true },
  { label: "RSUs vestidas · valor bruto", value: (c) => c.equity, positive: true },
  { label: "Venta y conversión de RSUs", value: (c) => -c.equityFees },
];

// The headline cards already show the average month and period value.
const REGULAR_MONTH = { className: "recurring-total", label: "Mes regular neto", value: (c) => c.recurringMonthlyCash };

function ResultCell({ amount, positive = false, detail, label, accessibleLabel }) {
  return (
    <div className={`result-cell ${positive ? "positive" : ""}`}>
      <span className="visually-hidden">{accessibleLabel}: </span>
      <small className="result-cell-label" aria-hidden="true">{label}</small>
      <span>{amount ? MXN.format(amount) : "—"}</span>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function LedgerRow({ className, label, offers, calculations, value, detail, positive }) {
  return (
    <div className={className ? `ledger-row ${className}` : "ledger-row"}>
      <span>{label}</span>
      {OFFER_KEYS.map((key) => (
        <ResultCell
          key={key}
          amount={value(calculations[key])}
          positive={positive}
          detail={detail?.(calculations[key])}
          label={OFFER_LETTERS[key]}
          accessibleLabel={offers[key].name}
        />
      ))}
    </div>
  );
}

function ComparisonTable({ offers, calculations }) {
  const grossRow = {
    label: `Sueldo / honorarios · ${calculations.months === 36 ? "3 años" : "12 meses"}`,
    value: (c) => c.gross,
  };
  const visibleRows = [grossRow, ...LEDGER_ROWS]
    .filter((row) => OFFER_KEYS.some((key) => row.value(calculations[key])));

  return (
    <section
      className="comparison-ledger"
      id="comparison-ledger"
      role="tabpanel"
      aria-labelledby={`comparison-period-${calculations.months === 36 ? "three-years" : "year"}`}
      tabIndex={0}
    >
      <div className="ledger-row ledger-head">
        <span>Concepto</span>
        {OFFER_KEYS.map((key) => (
          <div key={key}>
            <strong>{offers[key].name}</strong>
            <small>{[offers[key].relationship, offers[key].location].filter(Boolean).join(" · ")}</small>
          </div>
        ))}
      </div>

      <div className="ledger-mobile-key" aria-label="Identidad de las ofertas">
        {OFFER_KEYS.map((key) => (
          <div key={key}>
            <span>{OFFER_LABELS[key]}</span>
            <strong>{offers[key].name}</strong>
          </div>
        ))}
      </div>

      <div className="ledger-totals">
        <LedgerRow {...REGULAR_MONTH} offers={offers} calculations={calculations} />
      </div>
      <Disclosure
        className="ledger-detail-disclosure"
        summary={`Ver desglose completo · ${visibleRows.length} conceptos`}
      >
        <div className="ledger-body">
          {visibleRows.map((row) => (
            <LedgerRow key={row.label} {...row} offers={offers} calculations={calculations} />
          ))}
        </div>
      </Disclosure>
    </section>
  );
}

function cumulativeAt(events, month) {
  return events.filter((event) => event.month <= month).at(-1)?.cumulative ?? 0;
}

function RsuStatement({ offer, calculation, onEdit }) {
  const { rsu } = offer;
  if (!rsu) return null;
  const events = buildVestingEvents(rsu);
  const month11 = cumulativeAt(events, 11);
  const month18 = cumulativeAt(events, 18);
  const grantLabel = rsu.currency === "USD"
    ? `${USD.format(Number(rsu.grantValue) || 0)} USD`
    : MXN.format(rsu.grantValue);

  return (
    <section className="rsu-statement">
      <div className="rsu-copy">
        <p>RSUs de {offer.name}</p>
        <h2>{grantLabel} <span>· {rsu.allocations.length} años</span></h2>
        <strong>{rsu.allocations.map((item) => `${item.percent}% año ${item.year}`).join(" · ")}</strong>
        <span>{cadenceLabel(rsu.cadence)} · primer vesting en el mes {events[0]?.month ?? 0}</span>
        <span>
          En este periodo: {MXN.format(calculation.equity)} bruto · {MXN.format(calculation.equityTax)} ISR estimado · {MXN.format(calculation.equityNet)} neto
        </span>
        <p className="rsu-explanation">
          Las RSUs se liberan según este calendario. Si dejas la empresa antes de cada fecha,
          pierdes lo que todavía no se ha liberado.
        </p>
        <div className="leaving-facts">
          {month11 > 0 ? (
            <div className="positive-fact">
              <Check size={13} weight="bold" /> Si sales en el mes 11: ya recibiste {month11.toFixed(1)}%.
            </div>
          ) : (
            <div className="negative-fact">
              <X size={13} weight="bold" /> Si sales en el mes 11: todavía recibes $0.
            </div>
          )}
          <div className="positive-fact">
            <Check size={13} weight="bold" /> Si sales en el mes 18: ya recibiste {month18.toFixed(1)}% del grant.
          </div>
        </div>
      </div>
      <div className="rsu-chart-panel">
        <button className="edit-calendar" onClick={onEdit}>Editar calendario</button>
        <div className="chart-legend">
          <span><i /> Vesting acumulado</span>
          {rsu.cliffMonth ? (
            <span><i className="cliff-key" /> Cliff (mes {rsu.cliffMonth})</span>
          ) : null}
        </div>
        <VestingChart rsu={rsu} compact />
        <VestingEventGrid rsu={rsu} compact />
      </div>
    </section>
  );
}

function MethodNote({ offers, assumptions, calculations }) {
  const entries = OFFER_KEYS.map((key) => [offers[key], calculations[key]]);
  const payrollSubsidies = entries.filter(([, calculation]) => (
    calculation.calculationType === "payroll" && calculation.taxProfile.subsidy > 0
  ));
  const assumptionSummary = entries.map(([offer, calculation]) => (
    calculation.calculationType === "payroll"
      ? `${offer.name}: ISR ${MXN.format(calculation.taxProfile.monthlyTax)}/mes${calculation.taxProfile.subsidy > 0 ? ` después de ${MXN_WITH_CENTS.format(calculation.taxProfile.subsidy)} de subsidio para el empleo` : ""} e IMSS ${MXN.format(calculation.imss.monthly)}/mes`
      : `${offer.name}: RESICO ${calculation.taxProfile.rate}% y costo cambiario ${offer.fxFee || 0}%`
  )).join(" · ");

  return (
    <Disclosure className="method-disclosure" summary="Supuestos y fuentes">
      <section className="method-note">
        <span>Supuestos usados</span>
        <p>
          Tipo de cambio {Number(assumptions.fxRate).toFixed(4)} MXN por USD · {assumptionSummary}.
        </p>
        {payrollSubsidies.length ? (
          <p>
            Subsidio para el empleo: {payrollSubsidies.map(([offer, calculation]) => (
              `${offer.name} ${MXN_WITH_CENTS.format(calculation.taxProfile.subsidy)}/mes`
            )).join(" · ")}. Aplica con ingresos de hasta {MXN_WITH_CENTS.format(EMPLOYMENT_SUBSIDY_2026.incomeLimit)} al mes,
            se acredita contra ISR y cualquier excedente no se entrega en efectivo.
          </p>
        ) : null}
        {calculations.months === 36 ? (
          <p>
            Proyección 2026–2028: ISR, UMA, salario mínimo y subsidio permanecen en valores 2026;
            vacaciones y cuotas CEAV avanzan con las reglas ya publicadas de cada año.
          </p>
        ) : null}
        <small>
          Fuentes: <a href="https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf" target="_blank" rel="noreferrer">tarifa ISR 2026</a>, {" "}
          <a href="https://www.dof.gob.mx/nota_detalle.php?codigo=5725287&fecha=01/05/2024" target="_blank" rel="noreferrer">decreto de subsidio para el empleo</a> y {" "}
          <a href="https://www.dof.gob.mx/nota_detalle.php?codigo=5777649&fecha=31/12/2025" target="_blank" rel="noreferrer">actualización 2026</a>, {" "}
          <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf" target="_blank" rel="noreferrer">LISR 93, 94, 113-E y 113-F</a>, {" "}
          <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf" target="_blank" rel="noreferrer">Ley Federal del Trabajo</a>, {" "}
          <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf" target="_blank" rel="noreferrer">Ley del Seguro Social</a>, {" "}
          <a href="https://www.diputados.gob.mx/sedia/biblio/prog_leg/Prog_leg_LXIV/110_DOF_16dic20.pdf" target="_blank" rel="noreferrer">reforma CEAV 2021–2030</a>, {" "}
          <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LIFNVT.pdf" target="_blank" rel="noreferrer">Ley del Infonavit</a> y {" "}
          <a href="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf" target="_blank" rel="noreferrer">UMA 2026</a>. Tipo de cambio: {" "}
          <a href="https://www.banxico.org.mx/tipcamb/tipCamMIAction.do?idioma=sp" target="_blank" rel="noreferrer">Banxico FIX</a>. El ISR adicional de prestaciones y RSUs usa la tarifa anual después de exenciones aplicables; las RSUs se estiman como ingreso ligado al empleo y su tratamiento real puede variar. Vales, fondo y SGMM suponen que el plan cumple los requisitos fiscales. Es una estimación informativa, no una declaración fiscal.
        </small>
      </section>
    </Disclosure>
  );
}

export function ResultsView({ offers, assumptions, horizon, setHorizon, onEditOffers, onEditRsu }) {
  const calculations = calculateComparison(offers, assumptions, horizon);
  const difference = describeDifference(offers, calculations);
  const economicDifference = calculations.contractor.economicValue - calculations.employee.economicValue;
  const economicWinner = economicDifference >= 0 ? offers.contractor.name : offers.employee.name;

  function handleHorizonKeyDown(event) {
    const other = horizon === "year" ? "three-years" : "year";
    const nextHorizon = { ArrowLeft: other, ArrowRight: other, Home: "year", End: "three-years" }[event.key];
    if (!nextHorizon) return;
    event.preventDefault();
    setHorizon(nextHorizon);
    event.currentTarget.parentElement?.querySelector(`[data-horizon="${nextHorizon}"]`)?.focus();
  }

  return (
    <div className="app-shell results-shell">
      <BrandHeader onHome={onEditOffers} />
      <main className="results-main">
        <section className="results-heading">
          <div className="results-title">
            <h1 tabIndex={-1}>Tus ofertas, en la misma cuenta.</h1>
            <button className="edit-offers" onClick={onEditOffers}>
              <PencilSimple size={16} aria-hidden="true" />
              Editar ofertas
            </button>
          </div>
          <div className="horizon-tabs" role="tablist" aria-label="Periodo de comparación">
            {HORIZONS.map(({ value, label }) => (
              <button
                key={value}
                id={`comparison-period-${value}`}
                data-horizon={value}
                role="tab"
                aria-selected={horizon === value}
                aria-controls="comparison-ledger"
                tabIndex={horizon === value ? 0 : -1}
                className={horizon === value ? "active" : ""}
                onClick={() => setHorizon(value)}
                onKeyDown={handleHorizonKeyDown}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="comparison-overview" aria-live="polite">
          <section className="comparison-metric" aria-labelledby="cash-comparison-title">
            <header>
              <h2 id="cash-comparison-title">Efectivo mensual</h2>
              <p>Promedio neto · MXN</p>
            </header>
            <OfferComparison items={OFFER_KEYS.map((key) => ({
              key,
              name: offers[key].name,
              amount: calculations[key].averageMonthlyCash,
            }))} />
            <p className="metric-difference">
              {Math.abs(difference.difference) < 1
                ? "El mismo promedio mensual."
                : <><strong>{difference.amount} más al mes</strong> con {difference.winner}.</>}
            </p>
            <p className="metric-footnote">Incluye pagos anuales. El mes regular está en el desglose.</p>
          </section>
          <section className="comparison-metric" aria-labelledby="economic-comparison-title">
            <header>
              <h2 id="economic-comparison-title">Valor a {calculations.months === 36 ? "3 años" : "12 meses"}</h2>
              <p>Efectivo + prestaciones + acciones · MXN</p>
            </header>
            <OfferComparison items={OFFER_KEYS.map((key) => ({
              key,
              name: offers[key].name,
              amount: calculations[key].economicValue,
            }))} />
            <p className="metric-difference">
              {Math.abs(economicDifference) < 1
                ? "El mismo valor económico."
                : <><strong>{MXN.format(Math.abs(economicDifference))} más en total</strong> con {economicWinner}.</>}
            </p>
            <p className="metric-footnote">Incluye valor que no recibes en efectivo y RSUs sujetas a vesting.</p>
          </section>
        </div>

        <ComparisonTable offers={offers} calculations={calculations} />
        {OFFER_KEYS.map((key) => (
          <RsuStatement
            key={key}
            offer={offers[key]}
            calculation={calculations[key]}
            onEdit={() => onEditRsu(key)}
          />
        ))}
        <MethodNote offers={offers} assumptions={assumptions} calculations={calculations} />
        <ShareComparison
          offers={offers}
          assumptions={assumptions}
          horizon={horizon}
          calculations={calculations}
        />
      </main>
    </div>
  );
}
