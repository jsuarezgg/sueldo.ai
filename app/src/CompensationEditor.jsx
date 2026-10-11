import { CaretDown, Check, X } from "@phosphor-icons/react";
import {
  MXN,
  UMA_2026,
  createComponent,
  frequencyLabels,
  isPayrollOffer,
  statutoryVacationDays,
} from "./compensation.js";
import { OFFER_LABELS } from "./capture-state.js";
import { CompactValueInput, Disclosure, PercentInput, SelectField, numericInputValue } from "./fields.jsx";
import { CURRENCY_OPTIONS, cadenceLabel, formatGrantValue } from "./format.js";

const FREQUENCY_OPTIONS = Object.entries(frequencyLabels).map(([value, label]) => ({ value, label }));

export function ComponentRow({ component, onChange, onRemove }) {
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
      <SelectField
        ariaLabel={`Moneda de ${component.name}`}
        className="component-currency-picker"
        value={component.currency ?? "MXN"}
        options={CURRENCY_OPTIONS}
        onChange={(currency) => onChange({ currency })}
      />
      <SelectField
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
      <div className="component-assumptions">
        <label className="tax-check">
          <input
            type="checkbox"
            aria-label={`Disponible en efectivo de ${component.name}`}
            checked={component.cash ?? false}
            onChange={(event) => onChange({ cash: event.target.checked })}
          />
          <span>Disponible en efectivo</span>
        </label>
        <PercentInput
          label="Uso previsto"
          ariaLabel={`Uso previsto de ${component.name}`}
          value={component.utilization ?? 100}
          onChange={(utilization) => onChange({ utilization })}
        />
      </div>
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

function BenefitToggle({ label, detail, checked, onChange }) {
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
  const extraCount = [
    benefits.annualPtu,
    benefits.monthlyVouchers,
    benefits.savingsFundIncluded,
    benefits.annualMedicalInsurance,
  ].filter(Boolean).length;

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
            detail={`Mínimo legal: ${statutoryVacationDays(benefits.tenureYears)}`}
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
          <BenefitToggle
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
      <Disclosure className="statutory-disclosure" summary="Cómo calculamos estas prestaciones">
        <p className="statutory-note">
          PTU: la ley limita el pago a tres meses de sueldo o al promedio recibido en los últimos
          tres años, lo que resulte más favorable. Para fondo de ahorro suponemos aportaciones
          iguales de empresa y empleado al 13%, con el tope fiscal de 1.3 UMA anual. Vales, fondo
          y SGMM se tratan como previsión social cuando cumplen los requisitos fiscales.
        </p>
      </Disclosure>
    </section>
  );
}

const CONTRACTOR_INSURANCE = {
  name: "Apoyo para seguro",
  amount: 2500,
  frequency: "monthly",
  taxable: true,
  cash: true,
};

export function OfferCompensationEditor({ offer, onChange, onEditRsu }) {
  const payroll = isPayrollOffer(offer);
  const { components, rsu, paidVacationDays } = offer;
  const hasItems = components.length > 0 || rsu || paidVacationDays !== null;

  const setComponents = (next) => onChange({ components: next });
  const addComponent = (category, overrides) => setComponents([
    ...components,
    { ...createComponent(category), ...overrides },
  ]);

  return (
    <section className="offer-compensation-column" data-offer={offer.id}>
      <header className="offer-compensation-heading">
        <div>
          <span>{OFFER_LABELS[offer.id]}</span>
          <strong>{offer.name}</strong>
        </div>
        <small>{offer.relationship}</small>
      </header>

      {payroll ? (
        <PayrollBenefitsEditor
          benefits={offer.statutoryBenefits}
          onChange={(patch) => onChange({ statutoryBenefits: { ...offer.statutoryBenefits, ...patch } })}
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
          <button onClick={() => addComponent("bonus")}>
            <strong>{payroll ? "Bono" : "Pago adicional"}</strong>
            <span>Mensual, trimestral o anual</span>
          </button>
          {payroll ? (
            <button onClick={onEditRsu}>
              <strong>Acciones o RSUs</strong><span>Con cliff y calendario de vesting</span>
            </button>
          ) : (
            <button onClick={() => addComponent("protection", CONTRACTOR_INSURANCE)}>
              <strong>Apoyo para seguro</strong><span>Efectivo mensual para tu póliza</span>
            </button>
          )}
          <button onClick={() => addComponent("reimbursement")}>
            <strong>Reembolso</strong><span>Wellness, internet o transporte</span>
          </button>
          {payroll ? (
            <button onClick={() => addComponent("protection")}>
              <strong>Seguro o ahorro</strong><span>GMM, fondo de ahorro u otra protección</span>
            </button>
          ) : (
            <button
              onClick={() => onChange({
                paidVacationDays: 15,
                plannedTimeOffDays: Math.max(15, Number(offer.plannedTimeOffDays) || 0),
              })}
              disabled={paidVacationDays !== null}
            >
              <strong>Vacaciones pagadas</strong>
              <span>{paidVacationDays === null ? "Días cubiertos por el cliente" : "Ya agregado"}</span>
            </button>
          )}
        </div>
      </details>

      {hasItems ? (
        <div className="component-list">
          {components.map((component, index) => (
            <ComponentRow
              key={component.id}
              component={component}
              onChange={(patch) => setComponents(components.map((item, itemIndex) => (
                itemIndex === index ? { ...item, ...patch } : item
              )))}
              onRemove={() => setComponents(components.filter((_, itemIndex) => itemIndex !== index))}
            />
          ))}
          {paidVacationDays !== null ? (
            <PaidLeaveRow
              days={paidVacationDays}
              onChange={(days) => onChange({ paidVacationDays: days })}
              onRemove={() => onChange({ paidVacationDays: null })}
            />
          ) : null}
          {rsu ? (
            <div className="rsu-inline-shell">
              <button className="rsu-inline-row" onClick={onEditRsu}>
                <span>
                  <strong>RSUs</strong>
                  <small>
                    {rsu.allocations.map((item) => `${item.percent}%`).join(" / ")} · {" "}
                    {cadenceLabel(rsu.cadence)} · {" "}
                    {rsu.cliffMonth ? `cliff mes ${rsu.cliffMonth}` : "sin cliff"}
                  </small>
                </span>
                <b>{formatGrantValue(rsu.grantValue, rsu.currency)}</b>
              </button>
              <button className="icon-button" onClick={() => onChange({ rsu: null })} aria-label="Quitar RSUs">
                <X size={17} weight="bold" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
