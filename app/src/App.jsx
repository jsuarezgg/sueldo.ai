import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Check,
  Copy,
  DownloadSimple,
  ShareNetwork,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  MXN,
  USD,
  EMPLOYMENT_SUBSIDY_2026,
  TAX_YEAR,
  UMA_2026,
  buildVestingEvents,
  calculateComparison,
  createComponent,
  defaultRsu,
  describeDifference,
  frequencyLabels,
  initialOffers,
  isPayrollOffer,
  statutoryVacationDays,
  validateRsu,
} from "./compensation.js";
import {
  captureReducer,
  convertOfferCurrency,
  createCaptureState,
  getBaseCaptureIssues,
  patchOfferState,
} from "./capture-state.js";
import {
  createShareCardPng,
  createShareSummary,
} from "./share-summary.js";
import {
  buildUrlShareData,
  createShareUrl,
  isSharedComparisonHash,
  readSharedComparison,
} from "./share-link.js";
import { OfferComparison } from "./OfferComparison.jsx";
import { fetchFixReference } from "./fx-reference.js";

const DeferredVestingChart = lazy(() => import("./VestingChart.jsx"));
const MOBILE_DISCLOSURE_QUERY = "(max-width: 680px)";
const INITIAL_ASSUMPTIONS = {
  fxRate: 17,
  fxDate: null,
  fxManual: false,
  fxStatus: "loading",
};

function createInitialSession() {
  const fallback = {
    captureState: createCaptureState(initialOffers, INITIAL_ASSUMPTIONS),
    horizon: "year",
  };
  if (typeof window === "undefined") return fallback;

  const shared = readSharedComparison(window.location.hash);
  if (!shared) return fallback;

  try {
    const calculations = calculateComparison(
      shared.offers,
      shared.assumptions,
      shared.horizon,
    );
    if (!calculations.valid) return fallback;

    return {
      captureState: {
        ...createCaptureState(shared.offers, shared.assumptions),
        step: 2,
        view: "results",
      },
      horizon: shared.horizon,
    };
  } catch {
    return fallback;
  }
}

function clearSharedComparisonFromAddress() {
  if (typeof window === "undefined" || !isSharedComparisonHash(window.location.hash)) return;
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

const SOURCE_DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const MXN_WITH_CENTS = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatSourceDate(value) {
  if (!value) return null;
  return SOURCE_DATE_FORMATTER.format(new Date(`${value}T12:00:00`));
}

const CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN" },
  { value: "USD", label: "USD" },
];

const RELATIONSHIP_OPTIONS = [
  { value: "Nómina", label: "Nómina" },
  { value: "Contratista independiente", label: "Contratista independiente" },
];

const RESICO_STATUS_OPTIONS = [
  { value: "unconfirmed", label: "Por confirmar" },
  { value: "eligible", label: "Sí cumplo" },
  { value: "ineligible", label: "No cumplo / no sé" },
];

const FREQUENCY_OPTIONS = Object.entries(frequencyLabels).map(([value, label]) => ({
  value,
  label,
}));

const DURATION_OPTIONS = [3, 4, 5].map((value) => ({
  value,
  label: `${value} años`,
}));

const CLIFF_OPTIONS = [
  { value: 0, label: "Sin cliff" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses" },
  { value: 24, label: "24 meses" },
];

const CADENCE_OPTIONS = [
  { value: 1, label: "Mensual" },
  { value: 3, label: "Trimestral" },
  { value: 6, label: "Semestral" },
  { value: 12, label: "Al final del año" },
];

function numericInputValue(event) {
  return event.target.value === "" ? "" : Number(event.target.value);
}

const CAPTURE_AMOUNT_FORMATTER = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

function formatCaptureAmount(value, currency) {
  return `${currency} ${CAPTURE_AMOUNT_FORMATTER.format(value)}`;
}

function formatCurrencyChangeNotice(notice) {
  if (!notice) return null;
  if (notice.kind === "warning") {
    return `Cambiamos la moneda a ${notice.toCurrency} sin convertir el monto porque falta un tipo de cambio válido. Confirma el pago.`;
  }
  return `Convertimos ${formatCaptureAmount(notice.originalAmount, notice.fromCurrency)} a ${formatCaptureAmount(notice.convertedAmount, notice.toCurrency)} con el tipo de cambio actual (${notice.fxRate.toFixed(4)}).`;
}

function formatGrantValue(value, currency = "MXN") {
  return (currency === "USD" ? USD : MXN).format(Number(value) || 0);
}

const INVALID_REASON_COPY = {
  "income-limit": "Los ingresos anualizados superan el límite de $3,500,000 para RESICO.",
  "profile-ineligible": "El perfil indicado requiere otro régimen fiscal.",
  "profile-unconfirmed": "Confirma los requisitos personales de RESICO antes de comparar.",
};

const INVALID_REASON_SUMMARY_COPY = {
  "income-limit": "Supera el límite anual de RESICO",
  "profile-ineligible": "RESICO no aplica a este perfil",
  "profile-unconfirmed": "Confirma tu perfil de RESICO",
};

const CAPTURE_STEPS = [
  {
    title: "Compara tus ofertas.",
    copy: "Empieza por el sueldo. Después sumamos prestaciones y restamos impuestos.",
  },
  {
    title: "¿Qué más incluye cada oferta?",
    copy: "Bonos, prestaciones, acciones y días libres también cuentan.",
  },
  {
    title: "Ahora, lo que sale de tu bolsillo.",
    copy: `Impuestos con reglas de ${TAX_YEAR}. Ajusta tus costos y confirma los supuestos.`,
  },
];

const CAPTURE_STEP_LABELS = ["Ofertas", "Compensación", "Supuestos"];

function subscribeToMobileLayout(onChange) {
  const mediaQuery = window.matchMedia(MOBILE_DISCLOSURE_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMobileLayoutSnapshot() {
  return typeof window !== "undefined"
    && window.matchMedia(MOBILE_DISCLOSURE_QUERY).matches;
}

function ResponsiveDisclosure({ className = "", summary, children, collapsible = false }) {
  const isMobile = useSyncExternalStore(
    subscribeToMobileLayout,
    getMobileLayoutSnapshot,
    () => false,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const canCollapse = isMobile || collapsible;
  const open = !canCollapse || mobileOpen;

  return (
    <details
      className={`responsive-disclosure ${collapsible ? "always-collapsible" : ""} ${className}`.trim()}
      aria-label={typeof summary === "string" ? summary : undefined}
      open={open}
      onToggle={(event) => {
        if (canCollapse && event.currentTarget.open !== mobileOpen) {
          setMobileOpen(event.currentTarget.open);
        }
      }}
    >
      <summary>
        <span>{summary}</span>
        <CaretDown className="responsive-disclosure-caret" size={17} weight="bold" aria-hidden="true" />
      </summary>
      <div className="responsive-disclosure-content">{children}</div>
    </details>
  );
}

function describeInvalidReason(reason) {
  return INVALID_REASON_COPY[reason] ?? reason ?? "Faltan datos para calcular";
}

function summarizeInvalidCalculation(calculation) {
  const reason = calculation.taxProfile?.reason;
  return INVALID_REASON_SUMMARY_COPY[reason]
    ?? describeInvalidReason(calculation.invalidReasons[0]);
}

function BrandHeader({ children, onHome }) {
  return (
    <header className="brand-header">
      <button type="button" className="brand" onClick={onHome} aria-label="Ir al inicio">
        <span className="brand-word">sueldo</span><span className="brand-suffix">.ai</span>
      </button>
      {children ? <div className="header-context">{children}</div> : null}
      <div className="header-links">
        <span>México · {TAX_YEAR}</span>
        <a href="/como-usar" target="_blank" rel="noreferrer">Cómo funciona <ArrowRight size={14} aria-hidden="true" /></a>
      </div>
    </header>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  prefix = "$",
  suffix,
  error,
  selectOnFocus = false,
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const selectOnPointerUp = useRef(false);
  const [focused, setFocused] = useState(false);
  const showFormatted = selectOnFocus && !focused && value !== "" && Number.isFinite(Number(value));

  return (
    <label className="field money-field">
      <span>{label}</span>
      <div className={`input-shell ${error ? "has-error" : ""}`}>
        <b>{prefix}</b>
        <div className="money-value">
          <input
            className={showFormatted ? "has-formatted-value" : undefined}
            value={value}
            type="number"
            min="0"
            inputMode="decimal"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            onPointerDown={(event) => {
              selectOnPointerUp.current = selectOnFocus
                && document.activeElement !== event.currentTarget;
            }}
            onPointerUp={(event) => {
              if (!selectOnPointerUp.current) return;
              event.preventDefault();
              event.currentTarget.select();
              selectOnPointerUp.current = false;
            }}
            onFocus={(event) => {
              setFocused(true);
              if (selectOnFocus && event.currentTarget.value !== "") {
                event.currentTarget.select();
              }
            }}
            onBlur={() => {
              setFocused(false);
              selectOnPointerUp.current = false;
            }}
            onChange={(event) => onChange(numericInputValue(event))}
          />
          {showFormatted ? <span className="formatted-amount" aria-hidden="true">{CAPTURE_AMOUNT_FORMATTER.format(value)}</span> : null}
        </div>
        {suffix ? <em>{suffix}</em> : null}
      </div>
      {error ? <small className="field-error" id={errorId}>{error}</small> : null}
    </label>
  );
}

function QuantityInput({ label, value, onChange, suffix }) {
  return (
    <label className="field money-field">
      <span>{label}</span>
      <div className="input-shell">
        <input
          value={value}
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          onChange={(event) => onChange(numericInputValue(event))}
        />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

function PercentInput({ label, value, onChange }) {
  return (
    <label className="field percent-field">
      <span>{label}</span>
      <div className="input-shell">
        <input
          value={value}
          type="number"
          min="0"
          max="100"
          step="0.1"
          inputMode="decimal"
          onChange={(event) => onChange(numericInputValue(event))}
        />
        <em>%</em>
      </div>
    </label>
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CalculatedLine({ label, amount, detail, warning = false, formatter = MXN }) {
  return (
    <div className={`calculated-line ${warning ? "warning" : ""}`}>
      <div>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
      <strong>{amount === null ? "—" : formatter.format(amount)}</strong>
    </div>
  );
}

function VestingChart({ compact = false, ...props }) {
  return (
    <Suspense
      fallback={(
        <div className={`vesting-chart chart-loading ${compact ? "compact" : ""}`} role="status">
          <span>Cargando calendario…</span>
        </div>
      )}
    >
      <DeferredVestingChart compact={compact} {...props} />
    </Suspense>
  );
}

function CompactValueInput({ label, detail, value, onChange, suffix, step = 1, max }) {
  return (
    <label className="compact-value-field">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="compact-value-control">
        <input
          type="number"
          min="0"
          max={max}
          step={step}
          value={value}
          inputMode="decimal"
          onChange={(event) => onChange(numericInputValue(event))}
        />
        <em>{suffix}</em>
      </span>
    </label>
  );
}

function PickerField({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const ignorePointerClick = useRef(false);
  const labelId = useId();
  const listboxId = useId();
  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsidePress = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    // Let the page scroll to options below the viewport without closing the
    // anchored menu. Outside presses, Escape and Tab still dismiss it.
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  function selectOption(index) {
    const option = options[index];
    if (!option) return;
    setOpen(false);
    onChange(option.value);
    requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus({ preventScroll: true });
      }
    });
  }

  function moveActive(direction) {
    setActiveIndex((current) => {
      const next = current + direction;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  }

  function handleKeyDown(event) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        setActiveIndex(event.key === "ArrowUp" ? options.length - 1 : selectedIndex);
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      selectOption(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key.length === 1) {
      const matchIndex = options.findIndex((option) =>
        option.label.toLocaleLowerCase("es").startsWith(event.key.toLocaleLowerCase("es")),
      );
      if (matchIndex >= 0) setActiveIndex(matchIndex);
    }
  }

  return (
    <div
      className={`${label ? "field" : ""} picker-field ${open ? "is-open" : ""} ${className}`.trim()}
      ref={rootRef}
    >
      {label ? <span id={labelId}>{label}</span> : null}
      <div className="picker-control">
        <button
          ref={triggerRef}
          type="button"
          className="picker-trigger"
          role="combobox"
          aria-label={label ? undefined : ariaLabel}
          aria-labelledby={label ? labelId : undefined}
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
          onClick={() => {
            if (!open) setActiveIndex(selectedIndex);
            setOpen((current) => !current);
          }}
          onKeyDown={handleKeyDown}
        >
          <span>{selectedOption?.label}</span>
          <CaretDown size={16} weight="bold" aria-hidden="true" />
        </button>
        {open ? (
          <div className="picker-menu" id={listboxId} role="listbox">
            {options.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <button
                  type="button"
                  role="option"
                  tabIndex={-1}
                  id={`${listboxId}-option-${index}`}
                  aria-selected={selected}
                  className={`picker-option ${selected ? "selected" : ""} ${active ? "active" : ""}`}
                  key={option.value}
                  onPointerMove={() => setActiveIndex(index)}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    ignorePointerClick.current = true;
                    selectOption(index);
                    requestAnimationFrame(() => {
                      ignorePointerClick.current = false;
                    });
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (ignorePointerClick.current) {
                      ignorePointerClick.current = false;
                      return;
                    }
                    selectOption(index);
                  }}
                >
                  <span>{option.label}</span>
                  {selected ? <Check size={15} weight="bold" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OfferBaseEditor({
  offer,
  onChange,
  onCurrencyChange,
  monthlyPayError,
  currencyNotice,
}) {
  return (
    <section className="offer-editor" data-offer={offer.id} aria-label={offer.id === "employee" ? "Oferta A" : "Oferta B"}>
      <div className="offer-editor-heading">
        <span className="offer-letter" aria-hidden="true">{offer.id === "employee" ? "A" : "B"}</span>
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
        <PickerField
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
          <span>{formatCurrencyChangeNotice(currencyNotice)}</span>
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
            <span>{option.value === "Nómina" ? "Nómina" : "Contractor"}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

function ComponentRow({ component, onChange, onRemove }) {
  return (
    <div className="component-row">
      <input
        className="component-name"
        aria-label="Nombre de la compensación"
        value={component.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <div className="component-amount">
        <span>$</span>
        <input
          aria-label={`Monto de ${component.name}`}
          type="number"
          min="0"
          value={component.amount}
          onChange={(event) => onChange({ amount: numericInputValue(event) })}
        />
      </div>
      <PickerField
        ariaLabel={`Moneda de ${component.name}`}
        className="component-currency-picker"
        value={component.currency ?? "MXN"}
        options={CURRENCY_OPTIONS}
        onChange={(currency) => onChange({ currency })}
      />
      <PickerField
        ariaLabel={`Frecuencia de ${component.name}`}
        className="component-frequency-picker"
        value={component.frequency}
        options={FREQUENCY_OPTIONS}
        onChange={(frequency) => onChange({ frequency })}
      />
      <label className="tax-check">
        <input
          type="checkbox"
          checked={component.taxable}
          onChange={(event) => onChange({ taxable: event.target.checked })}
        />
        <span>Gravado</span>
      </label>
      <button className="icon-button" onClick={onRemove} aria-label={`Quitar ${component.name}`}>
        <X size={17} weight="bold" />
      </button>
    </div>
  );
}

function PaidLeaveRow({ days, onChange, onRemove }) {
  return (
    <div className="paid-leave-row">
      <div>
        <strong>Vacaciones pagadas</strong>
        <small>El cliente mantiene tu pago durante estos días</small>
      </div>
      <div className="paid-leave-input">
        <input
          aria-label="Días de vacaciones pagadas"
          type="number"
          min="0"
          max="60"
          step="1"
          value={days}
          onChange={(event) => onChange(numericInputValue(event))}
        />
        <span>días / año</span>
      </div>
      <button className="icon-button" onClick={onRemove} aria-label="Quitar vacaciones pagadas">
        <X size={17} weight="bold" />
      </button>
    </div>
  );
}

function BenefitOfferToggle({ label, detail, checked, onChange }) {
  return (
    <button
      type="button"
      className={`benefit-offer-toggle ${checked ? "selected" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${checked ? "incluido" : "no incluido"}`}
      onClick={() => onChange(!checked)}
    >
      <span className="benefit-offer-copy">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span className="benefit-offer-state" aria-hidden="true">
        <span className="benefit-offer-mark">
          {checked ? <Check size={13} weight="bold" /> : null}
        </span>
        {checked ? "Incluido" : "No"}
      </span>
    </button>
  );
}

function PayrollBenefitsEditor({ benefits, onChange }) {
  const legalVacationDays = statutoryVacationDays(benefits.tenureYears);
  const extraCount = [benefits.annualPtu, benefits.monthlyVouchers, benefits.savingsFundIncluded, benefits.annualMedicalInsurance].filter(Boolean).length;

  return (
    <section className="payroll-benefits">
      <details className="payroll-group">
        <summary>
          <span>
            <strong>Prestaciones de ley</strong>
            <small>{benefits.vacationDays} días de vacaciones · {benefits.aguinaldoDays} de aguinaldo · {benefits.vacationPremiumRate}% de prima</small>
          </span>
          <CaretDown size={17} aria-hidden="true" />
        </summary>
        <div className="statutory-field-grid">
          <CompactValueInput
            label="Antigüedad"
            detail="Años cumplidos"
            value={benefits.tenureYears}
            suffix="años"
            onChange={(tenureYears) => onChange({
              tenureYears,
              vacationDays: statutoryVacationDays(tenureYears),
            })}
          />
          <CompactValueInput
            label="Vacaciones"
            detail={`Mínimo legal: ${legalVacationDays}`}
            value={benefits.vacationDays}
            suffix="días"
            onChange={(vacationDays) => onChange({ vacationDays })}
          />
          <CompactValueInput
            label="Aguinaldo"
            detail="Mínimo legal: 15 días"
            value={benefits.aguinaldoDays}
            suffix="días"
            onChange={(aguinaldoDays) => onChange({ aguinaldoDays })}
          />
          <CompactValueInput
            label="Prima vacacional"
            detail="Mínimo legal: 25%"
            value={benefits.vacationPremiumRate}
            suffix="%"
            step={0.1}
            max={100}
            onChange={(vacationPremiumRate) => onChange({ vacationPremiumRate })}
          />
        </div>
      </details>
      <details className="payroll-group">
        <summary>
          <span>
            <strong>Otras prestaciones</strong>
            <small>{extraCount ? `${extraCount} ${extraCount === 1 ? "prestación capturada" : "prestaciones capturadas"}` : "PTU, vales, fondo de ahorro y seguro"}</small>
          </span>
          <CaretDown size={17} aria-hidden="true" />
        </summary>
        <div className="statutory-field-grid variable-fields">
          <CompactValueInput
            label="PTU estimada"
            detail="Anual; depende de utilidades"
            value={benefits.annualPtu}
            suffix="MXN"
            onChange={(annualPtu) => onChange({ annualPtu })}
          />
          <CompactValueInput
            label="Vales"
            detail="Monto mensual"
            value={benefits.monthlyVouchers}
            suffix="MXN"
            onChange={(monthlyVouchers) => onChange({ monthlyVouchers })}
          />
          <BenefitOfferToggle
            label="Fondo de ahorro"
            detail={`La empresa iguala 13%, hasta ${MXN.format(UMA_2026.monthly * 1.3)} / mes`}
            checked={benefits.savingsFundIncluded}
            onChange={(savingsFundIncluded) => onChange({ savingsFundIncluded })}
          />
          <CompactValueInput
            label="SGMM"
            detail="Valor anual pagado por empresa"
            value={benefits.annualMedicalInsurance}
            suffix="MXN"
            onChange={(annualMedicalInsurance) => onChange({ annualMedicalInsurance })}
          />
        </div>
      </details>
      <ResponsiveDisclosure
        className="statutory-disclosure"
        summary="Cómo calculamos estas prestaciones"
        collapsible
      >
        <p className="statutory-note">
          PTU: la ley limita el pago a tres meses de sueldo o al promedio recibido en los últimos
          tres años, lo que resulte más favorable. Para fondo de ahorro suponemos aportaciones
          iguales de empresa y empleado al 13%, con el tope fiscal de 1.3 UMA anual. Vales, fondo
          y SGMM se tratan como previsión social cuando cumplen los requisitos fiscales.
        </p>
      </ResponsiveDisclosure>
    </section>
  );
}

function OfferCompensationEditor({
  offer,
  type,
  onAdd,
  onUpdate,
  onRemove,
  onEditRsu,
  onRemoveRsu,
  onAddPaidLeave,
  onChangePaidLeave,
  onRemovePaidLeave,
  onUpdateStatutoryBenefits,
}) {
  const payroll = isPayrollOffer(offer);
  const hasItems = offer.components.length > 0
    || offer.rsu
    || offer.paidVacationDays !== null;

  return (
    <section className="offer-compensation-column" data-offer={type}>
      <header className="offer-compensation-heading">
        <div>
          <span>{type === "employee" ? "Oferta A" : "Oferta B"}</span>
          <strong>{offer.name}</strong>
        </div>
        <small>{offer.relationship}</small>
      </header>

      {payroll ? (
        <PayrollBenefitsEditor
          benefits={offer.statutoryBenefits ?? initialOffers.employee.statutoryBenefits}
          onChange={onUpdateStatutoryBenefits}
        />
      ) : null}

      <details className="component-picker">
        <summary>
          <span>
            <strong>Agregar beneficio</strong>
            <small>{payroll ? "Bonos, acciones, seguros o reembolsos" : "Pagos, seguro, reembolsos o días libres"}</small>
          </span>
          <CaretDown className="component-picker-caret" size={17} weight="bold" aria-hidden="true" />
        </summary>
        <div className="quick-adds">
          <button onClick={() => onAdd("bonus")}>
            <strong>{payroll ? "Bono" : "Pago adicional"}</strong>
            <span>Mensual, trimestral o anual</span>
          </button>
          {payroll ? (
            <button onClick={onEditRsu}>
              <strong>Acciones o RSUs</strong><span>Con cliff y calendario de vesting</span>
            </button>
          ) : (
            <button
              onClick={() => onAdd("protection", {
                name: "Apoyo para seguro",
                amount: 2500,
                frequency: "monthly",
                taxable: true,
                cash: true,
              })}
            >
              <strong>Apoyo para seguro</strong><span>Efectivo mensual para tu póliza</span>
            </button>
          )}
          <button onClick={() => onAdd("reimbursement")}>
            <strong>Reembolso</strong><span>Wellness, internet o transporte</span>
          </button>
          {payroll ? (
            <button onClick={() => onAdd("protection")}>
              <strong>Seguro o ahorro</strong><span>GMM, fondo de ahorro u otra protección</span>
            </button>
          ) : (
            <button onClick={onAddPaidLeave} disabled={offer.paidVacationDays !== null}>
              <strong>Vacaciones pagadas</strong>
              <span>{offer.paidVacationDays === null ? "Días cubiertos por el cliente" : "Ya agregado"}</span>
            </button>
          )}
        </div>
      </details>

      {hasItems ? (
        <div className="component-list">
          {offer.components.map((component, index) => (
            <ComponentRow
              key={component.id}
              component={component}
              onChange={(patch) => onUpdate(index, patch)}
              onRemove={() => onRemove(index)}
            />
          ))}
          {offer.paidVacationDays !== null ? (
            <PaidLeaveRow
              days={offer.paidVacationDays}
              onChange={onChangePaidLeave}
              onRemove={onRemovePaidLeave}
            />
          ) : null}
          {offer.rsu ? (
            <div className="rsu-inline-shell">
              <button className="rsu-inline-row" onClick={onEditRsu}>
                <span>
                  <strong>RSUs</strong>
                  <small>
                    {offer.rsu.allocations.map((item) => `${item.percent}%`).join(" / ")} · {" "}
                    {CADENCE_OPTIONS.find((option) => option.value === offer.rsu.cadence)?.label ?? "Periódico"} · {" "}
                    {offer.rsu.cliffMonth ? `cliff mes ${offer.rsu.cliffMonth}` : "sin cliff"}
                  </small>
                </span>
                <b>{formatGrantValue(offer.rsu.grantValue, offer.rsu.currency)}</b>
              </button>
              <button className="icon-button" onClick={onRemoveRsu} aria-label="Quitar RSUs">
                <X size={17} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CaptureSummary({ offers, assumptions, onReviewAssumptions }) {
  const calculations = calculateComparison(offers, assumptions, "year");
  const difference = describeDifference(offers, calculations);
  const summaries = [
    { key: "employee", offer: offers.employee, calculation: calculations.employee },
    { key: "contractor", offer: offers.contractor, calculation: calculations.contractor },
  ];

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
        items={summaries.map(({ key, offer, calculation }) => ({
          key,
          name: offer.name,
          amount: calculation.valid ? calculation.averageMonthlyCash : null,
          detail: calculation.valid ? null : summarizeInvalidCalculation(calculation),
        }))}
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
        <small>{assumptions.fxStatus === "ready" ? "Banxico FIX" : assumptions.fxStatus === "loading" ? "Consultando Banxico…" : assumptions.fxStatus === "manual" ? "Tipo de cambio manual" : "Tipo de cambio por confirmar"}</small>
      </div>
    </aside>
  );
}

function OfferAssumptionsEditor({ offer, calculation, onChange }) {
  const payroll = isPayrollOffer(offer);

  if (payroll) {
    const imssBasisDetail = calculation.imss.employerCovered
      ? "El patrón absorbe la cuota al salario mínimo"
      : calculation.imss.capped
        ? "SBC estimado · aplica tope de 25 UMA"
        : calculation.imss.fixedMonthlyCompensation > 0
          ? `SBC integra ${MXN.format(calculation.imss.fixedMonthlyCompensation)} de compensación fija mensual`
          : "SBC integrado con las prestaciones capturadas";

    return (
      <section>
        <div className="assumption-heading">
          <span>{offer.name}</span>
          <small>Nómina</small>
        </div>
        <ResponsiveDisclosure
          className="calculation-disclosure"
          summary="Ver ISR, IMSS y aportaciones"
          collapsible
        >
          <div className="calculation-sheet" aria-label={`Deducciones calculadas de ${offer.name}`}>
            <CalculatedLine
              label="ISR retenido"
              amount={calculation.taxProfile.monthlyTax}
              detail={`${calculation.taxProfile.effectiveRate.toFixed(2)}% efectivo · tarifa mensual SAT ${TAX_YEAR}`}
            />
            {calculation.taxProfile.subsidy > 0 ? (
              <CalculatedLine
                label="Subsidio para el empleo aplicado"
                amount={calculation.taxProfile.subsidy}
                detail={`Reduce el ISR con ingresos de hasta ${MXN_WITH_CENTS.format(EMPLOYMENT_SUBSIDY_2026.incomeLimit)} al mes; el excedente no se paga en efectivo`}
                formatter={MXN_WITH_CENTS}
              />
            ) : null}
            <CalculatedLine
              label="Cuota obrera IMSS"
              amount={calculation.imss.monthly}
              detail={`${imssBasisDetail} · cuota mensual sobre ${calculation.imss.monthDays} días`}
            />
            <CalculatedLine
              label="Afore · retiro (empresa)"
              amount={calculation.employerContributions.retirement / 12}
              detail="2% del salario base de cotización"
            />
            <CalculatedLine
              label="Afore · cesantía y vejez"
              amount={calculation.employerContributions.ceav / 12}
              detail={`${calculation.employerContributions.ceavRate.toFixed(3)}% patronal en 2026`}
            />
            <CalculatedLine
              label="Infonavit (empresa)"
              amount={calculation.employerContributions.infonavit / 12}
              detail="5% del salario base de cotización"
            />
          </div>
        </ResponsiveDisclosure>
        <MoneyInput
          label="Deducciones adicionales al mes"
          value={offer.additionalDeductions}
          onChange={(additionalDeductions) => onChange({ additionalDeductions })}
          suffix="MXN"
        />
        {offer.currency === "USD" ? (
          <PercentInput
            label="Costo cambiario"
            value={offer.fxFee}
            onChange={(fxFee) => onChange({ fxFee })}
          />
        ) : null}
      </section>
    );
  }

  const profile = calculation.taxProfile;
  const resicoDetail = profile.reason === "income-limit"
    ? `${MXN.format(profile.annualIncome)} gravados · supera el límite de ${MXN.format(3500000)}`
    : profile.reason === "profile-unconfirmed"
      ? "Confirma tu perfil; el límite de ingresos por sí solo no basta"
      : profile.reason === "profile-ineligible"
        ? "El perfil indicado requiere otro régimen fiscal"
        : `${profile.rate.toFixed(2)}% · ${MXN.format(profile.annualIncome)} gravados en el año`;

  return (
    <section>
      <div className="assumption-heading">
        <span>{offer.name}</span>
        <small>Contratista independiente</small>
      </div>
      <ResponsiveDisclosure
        className="calculation-disclosure"
        summary="Ver RESICO y tiempo libre"
        collapsible
      >
        <div className="calculation-sheet" aria-label={`ISR RESICO calculado de ${offer.name}`}>
          <CalculatedLine
            label={profile.eligible ? "ISR RESICO" : "RESICO pendiente"}
            amount={profile.monthlyTax}
            detail={resicoDetail}
            warning={!profile.eligible}
          />
          <CalculatedLine
            label="Tiempo libre sin pago"
            amount={calculation.unpaidTime / 12}
            detail={`${calculation.unpaidDays} días no cubiertos de ${offer.plannedTimeOffDays || 0} planeados`}
          />
        </div>
      </ResponsiveDisclosure>
      <div className="resico-attestation">
        <PickerField
          label="Elegibilidad personal para RESICO"
          value={offer.resicoEligibilityStatus ?? "unconfirmed"}
          options={RESICO_STATUS_OPTIONS}
          onChange={(resicoEligibilityStatus) => onChange({ resicoEligibilityStatus })}
        />
        <ResponsiveDisclosure
          className="resico-eligibility-disclosure"
          summary="Qué confirma esta selección"
          collapsible
        >
          <p>
            “Sí cumplo” confirma que revisaste las exclusiones personales: socios o accionistas,
            partes relacionadas, establecimiento permanente en México, REFIPRE y ciertos ingresos
            asimilados. <a href="https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf" target="_blank" rel="noreferrer">LISR 113-E</a>
          </p>
        </ResponsiveDisclosure>
      </div>
      {!profile.eligible ? (
        <div className="resico-blocker" role="alert">
          <WarningCircle size={20} weight="fill" />
          <div>
            <strong>No mostramos un neto RESICO sin confirmar</strong>
            <p>{resicoDetail}. Selecciona otro régimen fuera de esta calculadora si no aplica.</p>
          </div>
        </div>
      ) : null}
      <MoneyInput
        label="Contador al mes"
        value={offer.accountant}
        onChange={(accountant) => onChange({ accountant })}
        suffix="MXN"
      />
      <MoneyInput
        label="Otras deducciones al mes"
        value={offer.additionalDeductions}
        onChange={(additionalDeductions) => onChange({ additionalDeductions })}
        suffix="MXN"
      />
      <div className="field-row">
        <PercentInput
          label="Costo cambiario"
          value={offer.fxFee}
          onChange={(fxFee) => onChange({ fxFee })}
        />
        <MoneyInput
          label="Seguro propio"
          value={offer.insurance}
          onChange={(insurance) => onChange({ insurance })}
        />
      </div>
      <QuantityInput
        label="Días libres que tomarías"
        value={offer.plannedTimeOffDays}
        onChange={(plannedTimeOffDays) => onChange({ plannedTimeOffDays })}
        suffix="días / año"
      />
    </section>
  );
}

function CaptureView({
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

  function updateComponent(key, index, patch) {
    setOffers((current) => {
      const components = current[key].components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component,
      );
      return {
        ...current,
        [key]: { ...current[key], components },
      };
    });
  }

  function addComponent(key, category, overrides = {}) {
    const component = { ...createComponent(category), ...overrides };
    setOffers((current) => ({
      ...current,
      [key]: {
        ...current[key],
        components: [...current[key].components, component],
      },
    }));
  }

  function removeComponent(key, index) {
    setOffers((current) => ({
      ...current,
      [key]: {
        ...current[key],
        components: current[key].components.filter((_, componentIndex) => componentIndex !== index),
      },
    }));
  }

  const stepContent = CAPTURE_STEPS[step];
  const baseCaptureIssues = getBaseCaptureIssues(offers);
  const firstBaseCaptureIssue = baseCaptureIssues[0] ?? null;
  const monthlyPayIssues = baseCaptureIssues.reduce((issues, issue) => {
    if (issue.field === "monthlyPay") issues[issue.offerKey] = issue;
    return issues;
  }, {});
  const assumptionCalculations = calculateComparison(offers, assumptions, "year");
  const employeeCalculation = assumptionCalculations.employee;
  const contractorCalculation = assumptionCalculations.contractor;
  const locallyExplainedMessages = [employeeCalculation, contractorCalculation].reduce(
    (messages, calculation) => {
      if (calculation.calculationType === "contractor" && !calculation.taxProfile?.eligible) {
        messages.add(describeInvalidReason(calculation.taxProfile.reason));
      }
      return messages;
    },
    new Set(),
  );
  const validationMessages = [...new Set([
    ...employeeCalculation.invalidReasons,
    ...contractorCalculation.invalidReasons,
  ].reduce((messages, reason) => {
    const message = describeInvalidReason(reason);
    if (!locallyExplainedMessages.has(message)) messages.push(message);
    return messages;
  }, []))].slice(0, 5);

  function navigateToStep(nextStep) {
    if (nextStep > step && baseCaptureIssues.length) return;
    setStep(nextStep);
  }

  return (
    <div className="app-shell capture-shell">
      <BrandHeader onHome={() => setStep(0)} />
      <nav className="step-rail" aria-label={`Paso ${step + 1} de 3`}>
        <ol>
          {CAPTURE_STEP_LABELS.map((label, index) => (
            <li key={label} className={index === step ? "current" : index < step ? "done" : ""}>
              <button
                onClick={() => navigateToStep(index)}
                aria-current={index === step ? "step" : undefined}
                disabled={index > step && baseCaptureIssues.length > 0}
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
              <OfferBaseEditor
                offer={offers.employee}
                onChange={(patch) => updateOffer("employee", patch)}
                onCurrencyChange={(currency) => updateCurrency("employee", currency)}
                monthlyPayError={monthlyPayIssues.employee?.message}
                currencyNotice={currencyNotices.employee}
              />
              <OfferBaseEditor
                offer={offers.contractor}
                onChange={(patch) => updateOffer("contractor", patch)}
                onCurrencyChange={(currency) => updateCurrency("contractor", currency)}
                monthlyPayError={monthlyPayIssues.contractor?.message}
                currencyNotice={currencyNotices.contractor}
              />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="compensation-editor">
              <OfferCompensationEditor
                offer={offers.employee}
                type="employee"
                onAdd={(category, overrides) => addComponent("employee", category, overrides)}
                onUpdate={(index, patch) => updateComponent("employee", index, patch)}
                onRemove={(index) => removeComponent("employee", index)}
                onEditRsu={() => onEditRsu("employee")}
                onRemoveRsu={() => updateOffer("employee", { rsu: null })}
                onAddPaidLeave={() => updateOffer("employee", {
                  paidVacationDays: 15,
                  plannedTimeOffDays: Math.max(15, Number(offers.employee.plannedTimeOffDays) || 0),
                })}
                onChangePaidLeave={(paidVacationDays) => updateOffer("employee", { paidVacationDays })}
                onRemovePaidLeave={() => updateOffer("employee", { paidVacationDays: null })}
                onUpdateStatutoryBenefits={(patch) => updateOffer("employee", {
                  statutoryBenefits: {
                    ...(offers.employee.statutoryBenefits ?? initialOffers.employee.statutoryBenefits),
                    ...patch,
                  },
                })}
              />
              <OfferCompensationEditor
                offer={offers.contractor}
                type="contractor"
                onAdd={(category, overrides) => addComponent("contractor", category, overrides)}
                onUpdate={(index, patch) => updateComponent("contractor", index, patch)}
                onRemove={(index) => removeComponent("contractor", index)}
                onEditRsu={() => onEditRsu("contractor")}
                onRemoveRsu={() => updateOffer("contractor", { rsu: null })}
                onAddPaidLeave={() => updateOffer("contractor", {
                  paidVacationDays: 15,
                  plannedTimeOffDays: Math.max(15, Number(offers.contractor.plannedTimeOffDays) || 0),
                })}
                onChangePaidLeave={(paidVacationDays) => updateOffer("contractor", { paidVacationDays })}
                onRemovePaidLeave={() => updateOffer("contractor", { paidVacationDays: null })}
                onUpdateStatutoryBenefits={(patch) => updateOffer("contractor", {
                  statutoryBenefits: {
                    ...(offers.contractor.statutoryBenefits ?? initialOffers.employee.statutoryBenefits),
                    ...patch,
                  },
                })}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="assumptions-grid">
              <OfferAssumptionsEditor
                offer={offers.employee}
                calculation={employeeCalculation}
                onChange={(patch) => updateOffer("employee", patch)}
              />
              <OfferAssumptionsEditor
                offer={offers.contractor}
                calculation={contractorCalculation}
                onChange={(patch) => updateOffer("contractor", patch)}
              />
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
                  <span>
                    {assumptions.fxStatus === "ready"
                      ? `Banxico FIX · ${formatSourceDate(assumptions.fxDate)}`
                      : assumptions.fxStatus === "loading"
                        ? "Consultando el FIX más reciente de Banxico…"
                        : assumptions.fxStatus === "manual"
                          ? "Valor ajustado manualmente"
                          : "No pudimos consultar Banxico; confirma este valor"}
                  </span>
                </div>
                <div className="plain-caveat">
                  <WarningCircle size={20} />
                  <p>
                    IVA al 0% no se asume por defecto en una declaración. Aquí solo comparamos el
                    dinero usando tus propios supuestos.
                  </p>
                </div>
              </section>
            </div>
          ) : null}

          {step === 2 && !assumptionCalculations.valid && validationMessages.length ? (
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
            {step > 0 ? <button
              className="text-action"
              onClick={() => navigateToStep(Math.max(0, step - 1))}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Anterior
            </button> : <span className="capture-privacy">Sin registro. Tus datos se quedan en tu navegador.</span>}
            {step < 2 ? (
              <button
                className="primary-action"
                onClick={() => navigateToStep(step + 1)}
                disabled={step === 0 && Boolean(firstBaseCaptureIssue)}
              >
                {step === 0 && firstBaseCaptureIssue
                  ? firstBaseCaptureIssue.action
                  : step === 0 ? "Añadir prestaciones" : "Revisar impuestos"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="primary-action"
                onClick={onCompare}
                disabled={!assumptionCalculations.valid}
              >
                {assumptionCalculations.valid ? "Comparar ofertas" : "Completa los datos"}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </footer>
        </section>
        <CaptureSummary offers={offers} assumptions={assumptions} onReviewAssumptions={() => navigateToStep(baseCaptureIssues.length ? 0 : 2)} />
      </main>
    </div>
  );
}

function ResultCell({ amount, positive = false, detail, label, accessibleLabel }) {
  const isZero = !amount;
  return (
    <div className={`result-cell ${positive ? "positive" : ""}`}>
      {accessibleLabel ? <span className="visually-hidden">{accessibleLabel}: </span> : null}
      {label ? <small className="result-cell-label" aria-hidden="true">{label}</small> : null}
      <span>{isZero ? "—" : MXN.format(amount)}</span>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function ComparisonTable({ offers, calculations }) {
  const periodLabel = calculations.months === 36 ? "3 años" : "12 meses";
  const rows = [
    { label: `Sueldo / honorarios · ${periodLabel}`, value: (calculation) => calculation.gross },
    { label: "Aguinaldo", value: (calculation) => calculation.aguinaldo, positive: true },
    {
      label: "Prima vacacional",
      value: (calculation) => calculation.vacationPremium,
      detail: (calculation) => calculation.statutoryBenefits
        ? `${calculation.statutoryBenefits.vacationDaysByYear.join(" → ")} días por año`
        : null,
      positive: true,
    },
    { label: "PTU estimada", value: (calculation) => calculation.ptu, positive: true },
    { label: "ISR sobre efectivo y prestaciones", value: (calculation) => -calculation.taxes },
    { label: "ISR estimado sobre RSUs", value: (calculation) => -calculation.equityTax },
    { label: "IMSS, contador, seguro y otras deducciones", value: (calculation) => -calculation.recurringCosts },
    { label: "Costo cambiario", value: (calculation) => -calculation.fxFees },
    {
      label: "Tiempo libre sin pago",
      value: (calculation) => -calculation.unpaidTime,
      detail: (calculation) => calculation.unpaidDays ? `${calculation.unpaidDays} días por año` : null,
    },
    { label: "Reembolsos", value: (calculation) => calculation.reimbursements, positive: true },
    { label: "Bonos", value: (calculation) => calculation.bonuses, positive: true },
    {
      label: "Vales · valor económico, no efectivo",
      value: (calculation) => calculation.vouchers,
      detail: (calculation) => calculation.vouchers
        ? "No entran al promedio mensual neto"
        : null,
      positive: true,
    },
    {
      label: "Fondo de ahorro · empleado",
      value: (calculation) => -calculation.employeeSavingsFund,
      detail: (calculation) => calculation.employeeSavingsFund
        ? "Sale de tu efectivo, pero sigue siendo tuyo"
        : null,
    },
    {
      label: "Fondo de ahorro · empresa",
      value: (calculation) => calculation.employerSavingsFund,
      detail: (calculation) => {
        const benefits = calculation.statutoryBenefits;
        if (!benefits?.employerSavingsFund) return null;
        const monthly = MXN.format(benefits.employerSavingsFund / 12);
        return `${monthly} / mes${benefits.savingsFundCapped ? " · tope fiscal" : ""}`;
      },
      positive: true,
    },
    {
      label: "Fondo de ahorro · saldo propio",
      value: (calculation) => calculation.employeeSavingsFund,
      detail: (calculation) => calculation.employeeSavingsFund
        ? "Se suma al valor económico porque sigue siendo tuyo"
        : null,
      positive: true,
    },
    { label: "SGMM pagado por empresa", value: (calculation) => calculation.medicalInsurance, positive: true },
    { label: "Afore · retiro patronal", value: (calculation) => calculation.employerContributions.retirement, positive: true },
    {
      label: "Afore · cesantía y vejez",
      value: (calculation) => calculation.employerContributions.ceav,
      detail: (calculation) => calculation.employerContributions.ceavRates.length
        ? calculation.employerContributions.ceavRates
          .map(({ year, rate }) => `${year}: ${rate.toFixed(3)}%`)
          .join(" · ")
        : null,
      positive: true,
    },
    { label: "Infonavit · aportación patronal", value: (calculation) => calculation.employerContributions.infonavit, positive: true },
    { label: "Seguro, ahorro y otra protección", value: (calculation) => calculation.protection, positive: true },
    { label: "RSUs vestidas · valor bruto", value: (calculation) => calculation.equity, positive: true },
    { label: "Venta y conversión de RSUs", value: (calculation) => -calculation.equityFees },
  ];
  const visibleRows = rows.reduce((visible, row) => {
    const employeeValue = row.value(calculations.employee);
    const contractorValue = row.value(calculations.contractor);
    if (employeeValue || contractorValue) visible.push(row);
    return visible;
  }, []);

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
        <div>
          <strong>{offers.employee.name}</strong>
          <small>{offers.employee.relationship} · {offers.employee.location}</small>
        </div>
        <div>
          <strong>{offers.contractor.name}</strong>
          <small>{offers.contractor.relationship} · {offers.contractor.location}</small>
        </div>
      </div>

      <div className="ledger-mobile-key" aria-label="Identidad de las ofertas">
        <div>
          <span>Oferta A</span>
          <strong>{offers.employee.name}</strong>
        </div>
        <div>
          <span>Oferta B</span>
          <strong>{offers.contractor.name}</strong>
        </div>
      </div>

      <div className="ledger-totals">
        <div className="ledger-row recurring-total">
          <span>Mes regular neto</span>
          <ResultCell amount={calculations.employee.recurringMonthlyCash} label="A" accessibleLabel={offers.employee.name} />
          <ResultCell amount={calculations.contractor.recurringMonthlyCash} label="B" accessibleLabel={offers.contractor.name} />
        </div>
        <div className="ledger-row cash-total">
          <span>Promedio mensual neto</span>
          <ResultCell amount={calculations.employee.averageMonthlyCash} label="A" accessibleLabel={offers.employee.name} />
          <ResultCell amount={calculations.contractor.averageMonthlyCash} label="B" accessibleLabel={offers.contractor.name} />
        </div>
        <div className="ledger-row economic-total">
          <span>Valor económico del periodo</span>
          <ResultCell amount={calculations.employee.economicValue} label="A" accessibleLabel={offers.employee.name} />
          <ResultCell amount={calculations.contractor.economicValue} label="B" accessibleLabel={offers.contractor.name} />
        </div>
      </div>
      <ResponsiveDisclosure
        className="ledger-detail-disclosure"
        summary={`Ver desglose completo · ${visibleRows.length} conceptos`}
        collapsible
      >
        <div className="ledger-body">
          {visibleRows.map((row) => (
            <div className="ledger-row" key={row.label}>
              <span>{row.label}</span>
              <ResultCell
                amount={row.value(calculations.employee)}
                positive={row.positive}
                detail={row.detail?.(calculations.employee)}
                label="A"
                accessibleLabel={offers.employee.name}
              />
              <ResultCell
                amount={row.value(calculations.contractor)}
                positive={row.positive}
                detail={row.detail?.(calculations.contractor)}
                label="B"
                accessibleLabel={offers.contractor.name}
              />
            </div>
          ))}
        </div>
      </ResponsiveDisclosure>
    </section>
  );
}

function VestingEventGrid({ rsu, compact = false }) {
  const events = buildVestingEvents(rsu);
  const lastEventYear = Math.max(1, Math.ceil((events.at(-1)?.month ?? 12) / 12));
  const displayYears = Math.max(rsu.allocations.length, lastEventYear);

  return (
    <div className={`vesting-event-grid ${compact ? "compact" : ""}`} aria-label="Eventos de vesting por año">
      {Array.from({ length: displayYears }, (_, index) => index + 1).map((year) => {
        const yearStart = (year - 1) * 12;
        const yearEvents = events.filter((event) => event.month > yearStart && event.month <= year * 12);
        const vestedThisYear = yearEvents.reduce((sum, event) => sum + event.percent, 0);
        return (
          <section className="vesting-year" key={year}>
            <header>
              <span>Año {year}</span>
              <strong>{vestedThisYear.toFixed(2)}%</strong>
            </header>
            <div className="vesting-event-cells">
              {yearEvents.length ? yearEvents.map((event) => (
                <div className={event.month === rsu.cliffMonth ? "cliff-event" : ""} key={event.month}>
                  <span>Mes {event.month}</span>
                  <strong>{event.percent.toFixed(2)}%</strong>
                </div>
              )) : (
                <div className="no-vesting-event">
                  <span>Sin liberaciones</span>
                  <strong>—</strong>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RsuStatement({ offer, calculation, onEdit }) {
  const rsu = offer.rsu;
  if (!rsu) return null;
  const events = buildVestingEvents(rsu);
  const month18 = events.filter((event) => event.month <= 18).at(-1)?.cumulative ?? 0;
  const grantLabel = rsu.currency === "USD"
    ? `${USD.format(Number(rsu.grantValue) || 0)} USD`
    : MXN.format(rsu.grantValue);
  const cadenceLabel = CADENCE_OPTIONS.find((option) => option.value === rsu.cadence)?.label
    ?? "Periódico";
  const firstVestingMonth = events[0]?.month ?? 0;
  const month11 = events.filter((event) => event.month <= 11).at(-1)?.cumulative ?? 0;

  return (
    <section className="rsu-statement">
      <div className="rsu-copy">
        <p>RSUs de {offer.name}</p>
        <h2>{grantLabel} <span>· {rsu.allocations.length} años</span></h2>
        <strong>{rsu.allocations.map((item) => `${item.percent}% año ${item.year}`).join(" · ")}</strong>
        <span>{cadenceLabel} · primer vesting en el mes {firstVestingMonth}</span>
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

function ShareComparison({ offers, assumptions, horizon, calculations }) {
  const [includeDetails, setIncludeDetails] = useState(false);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const summary = useMemo(() => createShareSummary({
    offers,
    calculations,
    months: calculations.months,
    includeDetails,
  }), [offers, calculations, includeDetails]);

  const economicHeadline = summary.economic.tied
    ? "≈"
    : summary.economic.percentLabel
      ? `+${summary.economic.percentLabel}`
      : "Mayor";
  const economicSupport = summary.economic.tied
    ? "Valor económico prácticamente igual"
    : `Mayor valor económico: ${summary.economic.winnerLabel}${summary.economic.differenceLabel ? ` · ${summary.economic.differenceLabel}` : ""}`;
  const cashSupport = summary.cash.tied
    ? "Efectivo mensual prácticamente igual"
    : `Más efectivo mensual: ${summary.cash.winnerLabel}${summary.cash.percentLabel ? ` · +${summary.cash.percentLabel}` : ""}${summary.cash.differenceLabel ? ` · ${summary.cash.differenceLabel}` : ""}`;

  function currentShareUrl() {
    return createShareUrl({ offers, assumptions, horizon });
  }

  async function copyShareLink(successMessage = "Enlace copiado. Ya puedes pegarlo donde quieras.") {
    if (!navigator.clipboard?.writeText) {
      setStatus("Tu navegador no permite copiar el enlace automáticamente.");
      return false;
    }

    try {
      await navigator.clipboard.writeText(currentShareUrl());
      setStatus(successMessage);
      return true;
    } catch {
      setStatus("No pudimos copiar el enlace. Descarga la imagen para compartirla.");
      return false;
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      await copyShareLink("Tu navegador no abre el menú de compartir; copiamos el enlace.");
      return;
    }

    try {
      await navigator.share(buildUrlShareData(currentShareUrl()));
      setStatus("Comparación compartida.");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("No se compartió nada.");
        return;
      }
      setStatus("No pudimos abrir el menú de compartir. Puedes copiar el enlace o descargar la imagen.");
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setStatus("Preparando la imagen…");
    try {
      const blob = await createShareCardPng(summary);
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "comparacion-sueldo-ai.png";
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setStatus("Imagen descargada.");
    } catch {
      setStatus("No pudimos generar la imagen en este navegador. Copia el enlace para compartirlo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <details className="share-disclosure">
      <summary>
        <ShareNetwork size={19} aria-hidden="true" />
        <span>Guardar o compartir</span>
        <CaretDown size={17} aria-hidden="true" />
      </summary>
      <section className="share-comparison" aria-labelledby="share-comparison-title">
        <div className="share-comparison-copy">
          <h2 id="share-comparison-title">Llévate la comparación.</h2>
          <p>
            El enlace incluye todos los montos y supuestos. Cualquiera que lo reciba podrá verlos.
          </p>
          <label className="share-detail-choice">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(event) => {
                setIncludeDetails(event.target.checked);
                setStatus("");
              }}
            />
            <span>
              <strong>Mostrar detalles en la imagen</strong>
              <small>Actívalo para poner nombres y montos en la vista previa y el PNG.</small>
            </span>
          </label>
          <div className="share-actions">
            <button type="button" className="share-primary" onClick={handleShare}>
              <ShareNetwork size={18} weight="bold" aria-hidden="true" />
              Compartir enlace
            </button>
            <button type="button" className="share-secondary" onClick={() => copyShareLink()}>
              <Copy size={18} weight="bold" aria-hidden="true" />
              Copiar enlace
            </button>
            <button type="button" className="share-secondary" onClick={handleDownload} disabled={downloading}>
              <DownloadSimple size={18} weight="bold" aria-hidden="true" />
              {downloading ? "Preparando…" : "Descargar PNG"}
            </button>
          </div>
          <p className="share-status" role="status" aria-live="polite">{status}</p>
        </div>

        <div className="share-preview-shell">
          <span className="share-preview-label">Vista previa</span>
          <div className="share-preview" aria-label="Vista previa de la tarjeta para compartir">
            <div className="share-preview-brand">
              <strong>sueldo<span>.ai</span></strong>
              <small>{summary.periodLabel}</small>
            </div>
            <p className="share-preview-offers">{summary.offerALabel} <span>vs.</span> {summary.offerBLabel}</p>
            <strong className="share-preview-value">{economicHeadline}</strong>
            <p className="share-preview-result">{economicSupport}</p>
            <div className="share-preview-footer">
              <span>{cashSupport}</span>
              <small>Compara cualquier oferta</small>
            </div>
          </div>
        </div>
      </section>
    </details>
  );
}

function ResultsView({ offers, assumptions, horizon, setHorizon, onEditOffers, onEditRsu }) {
  const calculations = calculateComparison(offers, assumptions, horizon);
  const difference = describeDifference(offers, calculations);
  const economicDifference = Math.abs(
    calculations.contractor.economicValue - calculations.employee.economicValue,
  );
  const periodWinner = calculations.contractor.economicValue >= calculations.employee.economicValue
    ? offers.contractor.name
    : offers.employee.name;
  const payrollSubsidies = [
    [offers.employee, calculations.employee],
    [offers.contractor, calculations.contractor],
  ].filter(([, calculation]) => (
    calculation.calculationType === "payroll" && calculation.taxProfile.subsidy > 0
  ));
  const assumptionSummary = [
    [offers.employee, calculations.employee],
    [offers.contractor, calculations.contractor],
  ].map(([offer, calculation]) => (
    calculation.calculationType === "payroll"
      ? `${offer.name}: ISR ${MXN.format(calculation.taxProfile.monthlyTax)}/mes${calculation.taxProfile.subsidy > 0 ? ` después de ${MXN_WITH_CENTS.format(calculation.taxProfile.subsidy)} de subsidio para el empleo` : ""} e IMSS ${MXN.format(calculation.imss.monthly)}/mes`
      : `${offer.name}: RESICO ${calculation.taxProfile.rate}% y costo cambiario ${offer.fxFee || 0}%`
  )).join(" · ");

  function handleHorizonKeyDown(event) {
    const nextHorizon = {
      ArrowLeft: horizon === "year" ? "three-years" : "year",
      ArrowRight: horizon === "year" ? "three-years" : "year",
      Home: "year",
      End: "three-years",
    }[event.key];

    if (!nextHorizon) return;
    event.preventDefault();
    setHorizon(nextHorizon);
    event.currentTarget.parentElement
      ?.querySelector(`[data-horizon="${nextHorizon}"]`)
      ?.focus();
  }

  return (
    <div className="app-shell results-shell">
      <BrandHeader onHome={onEditOffers}>Estado de compensación</BrandHeader>
      <main className="results-main">
        <section className="results-heading">
          <div className="results-title">
            <h1 tabIndex={-1}>Tus ofertas, en la misma cuenta.</h1>
            <button className="edit-offers" onClick={onEditOffers}>
              Editar ofertas
            </button>
          </div>
          <div className="horizon-tabs" role="tablist" aria-label="Periodo de comparación">
            <button
              id="comparison-period-year"
              data-horizon="year"
              role="tab"
              aria-selected={horizon === "year"}
              aria-controls="comparison-ledger"
              tabIndex={horizon === "year" ? 0 : -1}
              className={horizon === "year" ? "active" : ""}
              onClick={() => setHorizon("year")}
              onKeyDown={handleHorizonKeyDown}
            >
              12 meses
            </button>
            <button
              id="comparison-period-three-years"
              data-horizon="three-years"
              role="tab"
              aria-selected={horizon === "three-years"}
              aria-controls="comparison-ledger"
              tabIndex={horizon === "three-years" ? 0 : -1}
              className={horizon === "three-years" ? "active" : ""}
              onClick={() => setHorizon("three-years")}
              onKeyDown={handleHorizonKeyDown}
            >
              3 años
            </button>
          </div>
        </section>

        <div className="comparison-overview" aria-live="polite">
          <section className="comparison-metric" aria-labelledby="cash-comparison-title">
            <header>
              <h2 id="cash-comparison-title">Efectivo mensual</h2>
              <p>Promedio neto · MXN</p>
            </header>
            <OfferComparison items={["employee", "contractor"].map((key) => ({
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
            <OfferComparison items={["employee", "contractor"].map((key) => ({
              key,
              name: offers[key].name,
              amount: calculations[key].economicValue,
            }))} />
            <p className="metric-difference">
              {economicDifference < 1
                ? "El mismo valor económico."
                : <><strong>{MXN.format(economicDifference)} más en total</strong> con {periodWinner}.</>}
            </p>
            <p className="metric-footnote">Incluye valor que no recibes en efectivo y RSUs sujetas a vesting.</p>
          </section>
        </div>

        <ComparisonTable offers={offers} calculations={calculations} />
        <RsuStatement
          offer={offers.employee}
          calculation={calculations.employee}
          onEdit={() => onEditRsu("employee")}
        />
        <RsuStatement
          offer={offers.contractor}
          calculation={calculations.contractor}
          onEdit={() => onEditRsu("contractor")}
        />

        <ResponsiveDisclosure
          className="method-disclosure"
          summary="Supuestos y fuentes"
          collapsible
        >
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
        </ResponsiveDisclosure>
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

function RsuWorkspace({ offer, assumptions, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(offer.rsu ?? defaultRsu));
  const events = useMemo(() => buildVestingEvents(draft), [draft]);
  const total = draft.allocations.reduce((sum, item) => {
    const percent = item.percent === "" ? 0 : Number(item.percent);
    return sum + (Number.isFinite(percent) ? percent : 0);
  }, 0);
  const rsuErrors = useMemo(
    () => validateRsu(draft, assumptions.fxRate, offer.relationship),
    [draft, assumptions.fxRate, offer.relationship],
  );
  const valid = rsuErrors.length === 0;
  const statusCopy = valid
    ? "El calendario está completo"
    : rsuErrors.find((error) => error.field.startsWith("rsu.allocations"))?.message
      ?? rsuErrors[0]?.message
      ?? "Revisa los datos del calendario.";

  function updateAllocation(index, patch) {
    setDraft((current) => ({
      ...current,
      allocations: current.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index ? { ...allocation, ...patch } : allocation,
      ),
    }));
  }

  function changeYears(years) {
    setDraft((current) => {
      const allocations = Array.from({ length: years }, (_, index) => {
        const existing = current.allocations[index];
        return existing ?? { year: index + 1, percent: 0 };
      });
      return { ...current, allocations };
    });
  }

  return (
    <div className="app-shell rsu-workspace">
      <BrandHeader onHome={onCancel}>Calendario de RSUs</BrandHeader>
      <main className="rsu-workspace-main">
        <button className="back-link" onClick={onCancel}>Volver a la comparación</button>

        <div className="rsu-workspace-heading">
          <div>
            <p>RSUs de {offer.name}</p>
            <h1 tabIndex={-1}>Calendario de vesting</h1>
            <span>
              Distribución anual, cliff y eventos periódicos en una sola vista.
            </span>
          </div>
          <div className={`allocation-total ${valid ? "valid" : "invalid"}`}>
            <span>Asignado</span>
            <strong>{total}%</strong>
            <small>{statusCopy}</small>
          </div>
        </div>

        <div className="rsu-workspace-grid">
          <section className="schedule-controls">
            <div className="control-section">
              <h2>Grant</h2>
              <div className="field-row">
                <MoneyInput
                  label="Valor total"
                  value={draft.grantValue}
                  prefix={draft.currency === "USD" ? "US$" : "$"}
                  onChange={(grantValue) => setDraft({ ...draft, grantValue })}
                />
                <PickerField
                  label="Moneda"
                  value={draft.currency ?? "MXN"}
                  options={CURRENCY_OPTIONS}
                  onChange={(currency) => setDraft({ ...draft, currency })}
                />
              </div>
              <div className="field-row">
                <PickerField
                  label="Duración"
                  value={draft.allocations.length}
                  options={DURATION_OPTIONS}
                  onChange={changeYears}
                />
                <PickerField
                  label="Cliff"
                  value={draft.cliffMonth}
                  options={CLIFF_OPTIONS}
                  onChange={(cliffMonth) => setDraft({ ...draft, cliffMonth })}
                />
              </div>
              <PickerField
                label="Frecuencia dentro de cada año"
                value={draft.cadence}
                options={CADENCE_OPTIONS}
                onChange={(cadence) => setDraft({ ...draft, cadence })}
              />
              <PercentInput
                label="Costo de venta y conversión"
                value={draft.saleFeeRate ?? 0}
                onChange={(saleFeeRate) => setDraft({ ...draft, saleFeeRate })}
              />
              <p className="rsu-control-note">
                Se descuenta del valor liberado después del ISR estimado. Déjalo en 0 si no aplica.
              </p>
            </div>

            <div className="control-section allocation-controls">
              <h2>Porcentaje que corresponde a cada año</h2>
              {draft.allocations.map((allocation, index) => (
                <div className="allocation-row" key={allocation.year}>
                  <span>Año {allocation.year}</span>
                  <div className="input-shell">
                    <input
                      aria-label={`Porcentaje correspondiente al año ${allocation.year}`}
                      type="number"
                      min="0"
                      max="100"
                      inputMode="decimal"
                      value={allocation.percent}
                      onChange={(event) => updateAllocation(index, { percent: numericInputValue(event) })}
                    />
                    <em>%</em>
                  </div>
                </div>
              ))}
              {rsuErrors.length ? (
                <ul className="rsu-validation-list" aria-live="polite">
                  {rsuErrors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}
                </ul>
              ) : null}
            </div>

            <div className="workspace-actions">
              <button className="text-action" onClick={onCancel}>Cancelar</button>
              <button className="primary-action" disabled={!valid} onClick={() => onSave(draft)}>
                Guardar calendario <Check size={18} weight="bold" />
              </button>
            </div>
          </section>

          <section className="schedule-preview">
            <div className="preview-heading">
              <span>Eventos reales del grant</span>
              <strong>{formatGrantValue(draft.grantValue, draft.currency)}</strong>
            </div>
            <VestingEventGrid rsu={draft} />
            <VestingChart rsu={draft} />
            <div className="event-ledger">
              <div className="event-ledger-head">
                <span>Mes</span>
                <span>Este vesting</span>
                <span>Acumulado</span>
                <span>Valor acumulado ({draft.currency ?? "MXN"})</span>
              </div>
              {events.map((event) => (
                <div className="event-ledger-row" key={event.month}>
                  <span>{event.month}</span>
                  <span>{event.percent.toFixed(2)}%</span>
                  <span>{event.cumulative.toFixed(2)}%</span>
                  <strong>{formatGrantValue(event.cumulativeValue, draft.currency)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export function App() {
  const [initialSession] = useState(createInitialSession);
  const [captureState, dispatchCapture] = useReducer(
    captureReducer,
    initialSession.captureState,
  );
  const {
    offers,
    assumptions,
    step: captureStep,
    view,
  } = captureState;
  const [horizon, setHorizon] = useState(initialSession.horizon);
  const rsuReturnView = useRef("capture");
  const [rsuOfferKey, setRsuOfferKey] = useState("employee");

  useEffect(() => {
    const heading = document.querySelector("#root main h1");
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, captureStep]);

  function setOffers(update) {
    dispatchCapture({ type: "set-offers", update });
  }

  function setAssumptions(update) {
    dispatchCapture({ type: "set-assumptions", update });
  }

  function setView(nextView) {
    dispatchCapture({ type: "set-view", view: nextView });
  }

  function setCaptureStep(step) {
    dispatchCapture({ type: "set-step", step });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchFixReference({ signal: controller.signal })
      .then((fix) => {
        setAssumptions((current) => current.fxManual ? current : {
          ...current,
          fxRate: fix.rate,
          fxDate: fix.date,
          fxStatus: "ready",
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAssumptions((current) => current.fxManual ? current : {
          ...current,
          fxStatus: "error",
        });
      });

    return () => controller.abort();
  }, []);

  function openRsuEditor(offerKey, returnView) {
    if (returnView === "results") clearSharedComparisonFromAddress();
    setRsuOfferKey(offerKey);
    rsuReturnView.current = returnView;
    setView("rsu");
  }

  function editOffers() {
    clearSharedComparisonFromAddress();
    dispatchCapture({ type: "edit-offers" });
  }

  if (view === "rsu") {
    return (
      <RsuWorkspace
        offer={offers[rsuOfferKey]}
        assumptions={assumptions}
        onCancel={() => setView(rsuReturnView.current)}
        onSave={(rsu) => {
          setOffers((current) => ({
            ...current,
            [rsuOfferKey]: { ...current[rsuOfferKey], rsu },
          }));
          setView(rsuReturnView.current);
        }}
      />
    );
  }

  if (view === "results") {
    return (
      <ResultsView
        offers={offers}
        assumptions={assumptions}
        horizon={horizon}
        setHorizon={setHorizon}
        onEditOffers={editOffers}
        onEditRsu={(offerKey) => openRsuEditor(offerKey, "results")}
      />
    );
  }

  return (
    <CaptureView
      offers={offers}
      setOffers={setOffers}
      assumptions={assumptions}
      setAssumptions={setAssumptions}
      step={captureStep}
      setStep={setCaptureStep}
      onCompare={() => setView("results")}
      onEditRsu={(offerKey) => openRsuEditor(offerKey, "capture")}
    />
  );
}
