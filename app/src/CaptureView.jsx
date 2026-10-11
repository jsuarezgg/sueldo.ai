import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, WarningCircle } from "@phosphor-icons/react";
import { TAX_YEAR, calculateComparison, describeDifference, isPayrollOffer } from "./compensation.js";
import {
  OFFER_KEYS,
  OFFER_LABELS,
  OFFER_LETTERS,
  convertOfferCurrency,
  getBaseCaptureIssues,
  patchOfferState,
} from "./capture-state.js";
import { OfferAssumptionsEditor } from "./AssumptionsEditor.jsx";
import { OfferCompensationEditor } from "./CompensationEditor.jsx";
import { BrandHeader, MoneyInput, SelectField, TextInput } from "./fields.jsx";
import {
  CURRENCY_OPTIONS,
  PLAIN_AMOUNT,
  describeInvalidReason,
  describeResico,
  formatSourceDate,
  summarizeInvalidCalculation,
} from "./format.js";
import { OfferComparison } from "./OfferComparison.jsx";

const STEPS = [
  {
    label: "Ofertas",
    title: "Compara tus ofertas.",
    copy: "Empieza por el sueldo. Después sumamos prestaciones y restamos impuestos.",
    next: "Añadir prestaciones",
  },
  {
    label: "Compensación",
    title: "¿Qué más incluye cada oferta?",
    copy: "Bonos, prestaciones, acciones y días libres también cuentan.",
    next: "Revisar impuestos",
  },
  {
    label: "Supuestos",
    title: "Ahora, lo que sale de tu bolsillo.",
    copy: `Impuestos con reglas de ${TAX_YEAR}. Ajusta tus costos y confirma los supuestos.`,
  },
];

const RELATIONSHIP_OPTIONS = [
  { value: "Nómina", label: "Nómina" },
  { value: "Contratista independiente", label: "Contractor" },
];

const RESICO_OPTIONS = [
  { value: "eligible", label: "Sí cumplo" },
  { value: "ineligible", label: "No cumplo / no sé" },
];

const FX_STATUS_SHORT = {
  ready: "Banxico FIX",
  loading: "Consultando Banxico…",
  manual: "Tipo de cambio manual",
  error: "Tipo de cambio por confirmar",
};

function describeFxSource({ fxStatus, fxDate }) {
  if (fxStatus === "ready") return `Banxico FIX · ${formatSourceDate(fxDate)}`;
  if (fxStatus === "loading") return "Consultando el FIX más reciente de Banxico…";
  if (fxStatus === "manual") return "Valor ajustado manualmente";
  return "No pudimos consultar Banxico; confirma este valor";
}

function describeCurrencyChange(notice) {
  if (notice.kind === "warning") {
    return `Cambiamos la moneda a ${notice.toCurrency} sin convertir el monto porque falta un tipo de cambio válido. Confirma el pago.`;
  }
  const from = `${notice.fromCurrency} ${PLAIN_AMOUNT.format(notice.originalAmount)}`;
  const to = `${notice.toCurrency} ${PLAIN_AMOUNT.format(notice.convertedAmount)}`;
  return `Convertimos ${from} a ${to} con el tipo de cambio actual (${notice.fxRate.toFixed(4)}).`;
}

// RESICO is the only contractor regime we estimate, so eligibility is asked as soon as it applies.
function ResicoChoice({ offer, taxProfile, onChange }) {
  const blocked = taxProfile.reason === "income-limit" || taxProfile.reason === "profile-ineligible";
  return (
    <fieldset className="relationship-choice resico-choice">
      <legend>¿Cumples los requisitos de RESICO?</legend>
      {RESICO_OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={`resico-${offer.id}`}
            value={option.value}
            checked={offer.resicoEligibilityStatus === option.value}
            onChange={() => onChange({ resicoEligibilityStatus: option.value })}
          />
          <span>{option.label}</span>
        </label>
      ))}
      <p className="field-hint">
        No aplica a socios o accionistas, partes relacionadas, establecimiento permanente en
        México, REFIPRE ni ciertos ingresos asimilados.{" "}
        <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf" target="_blank" rel="noreferrer">LISR 113-E</a>
      </p>
      {blocked ? (
        <p className="currency-change-note warning" role="status">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>{describeResico(taxProfile)}. Esta calculadora solo estima contractors en RESICO.</span>
        </p>
      ) : null}
    </fieldset>
  );
}

function OfferBaseEditor({ offer, taxProfile, onChange, onCurrencyChange, monthlyPayError, currencyNotice }) {
  return (
    <section className="offer-editor" data-offer={offer.id} aria-label={OFFER_LABELS[offer.id]}>
      <div className="offer-editor-heading">
        <span className="offer-letter" aria-hidden="true">{OFFER_LETTERS[offer.id]}</span>
        <TextInput
          label="Empresa o cliente"
          value={offer.name}
          onChange={(name) => onChange({ name })}
        />
      </div>
      <div className="field-row salary-row">
        <MoneyInput
          label="Pago bruto al mes"
          value={offer.monthlyPay}
          prefix={offer.currency === "USD" ? "US$" : "$"}
          onChange={(monthlyPay) => onChange({ monthlyPay })}
          error={monthlyPayError}
          selectOnFocus
        />
        <SelectField
          label="Moneda"
          className="compact-field"
          value={offer.currency}
          options={CURRENCY_OPTIONS}
          onChange={onCurrencyChange}
        />
      </div>
      {currencyNotice ? (
        <p className={`currency-change-note ${currencyNotice.kind}`} role="status" aria-live="polite">
          {currencyNotice.kind === "converted"
            ? <Check size={16} weight="bold" aria-hidden="true" />
            : <WarningCircle size={16} weight="fill" aria-hidden="true" />}
          <span>{describeCurrencyChange(currencyNotice)}</span>
        </p>
      ) : null}
      <fieldset className="relationship-choice">
        <legend>Tipo de contratación</legend>
        {RELATIONSHIP_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={`relationship-${offer.id}`}
              value={option.value}
              checked={offer.relationship === option.value}
              onChange={() => onChange({ relationship: option.value })}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      {isPayrollOffer(offer) ? null : <ResicoChoice offer={offer} taxProfile={taxProfile} onChange={onChange} />}
    </section>
  );
}

function FxAssumption({ assumptions, setAssumptions }) {
  return (
    <section className="shared-assumption">
      <MoneyInput
        label="Tipo de cambio FIX"
        value={assumptions.fxRate}
        onChange={(fxRate) => setAssumptions((current) => ({
          ...current,
          fxRate,
          fxDate: null,
          fxManual: true,
          fxStatus: "manual",
        }))}
        suffix="MXN / USD"
      />
      <div className={`fx-source ${assumptions.fxStatus}`}>
        {assumptions.fxStatus === "ready" ? <Check size={17} weight="bold" /> : <WarningCircle size={17} />}
        <span>{describeFxSource(assumptions)}</span>
      </div>
      <div className="plain-caveat">
        <WarningCircle size={20} />
        <p>
          IVA al 0% no se asume por defecto en una declaración. Aquí solo comparamos el
          dinero usando tus propios supuestos.
        </p>
      </div>
    </section>
  );
}

function CaptureSummary({ offers, assumptions, calculations, onReviewAssumptions }) {
  const difference = describeDifference(offers, calculations);

  return (
    <aside
      className={`capture-summary ${difference ? "has-difference" : "offers-only"}`}
      aria-label="Resumen vigente de las ofertas"
    >
      <header>
        <h2>Lo que te queda</h2>
        <p>Promedio mensual neto · MXN</p>
      </header>
      <OfferComparison
        compact
        items={OFFER_KEYS.map((key) => {
          const calculation = calculations[key];
          return {
            key,
            name: offers[key].name,
            amount: calculation.valid ? calculation.averageMonthlyCash : null,
            detail: calculation.valid ? null : summarizeInvalidCalculation(calculation),
          };
        })}
      />
      {difference && Math.abs(difference.difference) >= 1 ? (
        <div className="summary-difference">
          <strong>{difference.amount} más al mes</strong>
          <span>con {difference.winner}</span>
        </div>
      ) : difference ? (
        <p className="summary-equal">El mismo promedio mensual.</p>
      ) : (
        <button className="summary-review" onClick={onReviewAssumptions}>
          Revisar datos pendientes <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
      <p className="summary-note">Incluye pagos anuales. En el resultado verás también un mes regular.</p>
      <div className="summary-fx">
        <span>1 USD = {Number(assumptions.fxRate).toFixed(2)} MXN</span>
        <small>{FX_STATUS_SHORT[assumptions.fxStatus] ?? FX_STATUS_SHORT.error}</small>
      </div>
    </aside>
  );
}

// Contractor RESICO problems are explained beside each offer; list only the rest.
function pendingMessages(calculations) {
  const explainedBesideOffer = new Set(OFFER_KEYS
    .map((key) => calculations[key])
    .filter((calculation) => calculation.calculationType === "contractor" && !calculation.taxProfile.eligible)
    .map((calculation) => describeInvalidReason(calculation.taxProfile.reason)));
  const messages = OFFER_KEYS
    .flatMap((key) => calculations[key].invalidReasons)
    .map(describeInvalidReason)
    .filter((message) => !explainedBesideOffer.has(message));
  return [...new Set(messages)].slice(0, 5);
}

export function CaptureView({
  offers,
  setOffers,
  assumptions,
  setAssumptions,
  step,
  setStep,
  onCompare,
  onEditRsu,
}) {
  const [currencyNotices, setCurrencyNotices] = useState({});
  const baseIssues = getBaseCaptureIssues(offers);
  const calculations = calculateComparison(offers, assumptions, "year");
  const validationMessages = calculations.valid ? [] : pendingMessages(calculations);
  const stepContent = STEPS[step];
  const resicoPending = OFFER_KEYS.some((key) => calculations[key].taxProfile.reason?.startsWith("profile-"));

  function updateOffer(key, patch) {
    setOffers((current) => patchOfferState(current, key, patch));
    if (Object.hasOwn(patch, "monthlyPay")) {
      setCurrencyNotices((current) => ({ ...current, [key]: null }));
    }
  }

  function updateCurrency(key, currency) {
    const confirmedFxRate = ["ready", "manual"].includes(assumptions.fxStatus)
      ? assumptions.fxRate
      : null;
    const conversion = convertOfferCurrency(offers[key], currency, confirmedFxRate);
    setOffers((current) => patchOfferState(current, key, conversion.patch));
    setCurrencyNotices((current) => ({ ...current, [key]: conversion.notice }));
  }

  function navigateToStep(nextStep) {
    if (nextStep > step && baseIssues.length) return;
    setStep(nextStep);
  }

  return (
    <div className="app-shell capture-shell">
      <BrandHeader onHome={() => setStep(0)} />
      <nav className="step-rail" aria-label={`Paso ${step + 1} de 3`}>
        <ol>
          {STEPS.map(({ label }, index) => (
            <li key={label} className={index === step ? "current" : index < step ? "done" : ""}>
              <button
                onClick={() => navigateToStep(index)}
                aria-current={index === step ? "step" : undefined}
                disabled={index > step && baseIssues.length > 0}
              >
                <span className="step-number" aria-hidden="true">{index < step ? <Check size={14} weight="bold" /> : index + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <main className="capture-layout">
        <section className="capture-main">
          <div className="capture-intro">
            <h1 tabIndex={-1}>{stepContent.title}</h1>
            <span>{stepContent.copy}</span>
          </div>

          {step === 0 ? (
            <div className="base-grid">
              {OFFER_KEYS.map((key) => (
                <OfferBaseEditor
                  key={key}
                  offer={offers[key]}
                  taxProfile={calculations[key].taxProfile}
                  onChange={(patch) => updateOffer(key, patch)}
                  onCurrencyChange={(currency) => updateCurrency(key, currency)}
                  monthlyPayError={baseIssues.find((issue) => issue.offerKey === key && issue.field === "monthlyPay")?.message}
                  currencyNotice={currencyNotices[key]}
                />
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="compensation-editor">
              {OFFER_KEYS.map((key) => (
                <OfferCompensationEditor
                  key={key}
                  offer={offers[key]}
                  onChange={(patch) => updateOffer(key, patch)}
                  onEditRsu={() => onEditRsu(key)}
                />
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="assumptions-grid">
              {OFFER_KEYS.map((key) => (
                <OfferAssumptionsEditor
                  key={key}
                  offer={offers[key]}
                  calculation={calculations[key]}
                  onChange={(patch) => updateOffer(key, patch)}
                />
              ))}
              <FxAssumption assumptions={assumptions} setAssumptions={setAssumptions} />
            </div>
          ) : null}

          {step === 2 && validationMessages.length ? (
            <div className="input-validation-blocker" role="alert">
              <WarningCircle size={20} weight="fill" />
              <div>
                <strong>Faltan datos para una comparación válida</strong>
                <ul>
                  {validationMessages.map((message) => <li key={message}>{message}</li>)}
                </ul>
              </div>
            </div>
          ) : null}

          <footer className="capture-actions">
            {step > 0 ? (
              <button className="text-action" onClick={() => navigateToStep(step - 1)}>
                <ArrowLeft size={17} aria-hidden="true" />
                Anterior
              </button>
            ) : <span className="capture-privacy">Sin registro. Tus datos se quedan en tu navegador.</span>}
            {step < 2 ? (
              <button
                className="primary-action"
                onClick={() => navigateToStep(step + 1)}
                disabled={step === 0 && baseIssues.length > 0}
              >
                {step === 0 && baseIssues.length ? baseIssues[0].action : stepContent.next}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button className="primary-action" onClick={onCompare} disabled={!calculations.valid}>
                {calculations.valid ? "Comparar ofertas" : "Completa los datos"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </footer>
        </section>
        <CaptureSummary
          offers={offers}
          assumptions={assumptions}
          calculations={calculations}
          onReviewAssumptions={() => navigateToStep(baseIssues.length || resicoPending ? 0 : 2)}
        />
      </main>
    </div>
  );
}
