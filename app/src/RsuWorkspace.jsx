import { useMemo, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { buildVestingEvents, defaultRsu, validateRsu } from "./compensation.js";
import { BrandHeader, MoneyInput, PercentInput, PickerField, QuantityInput, numericInputValue } from "./fields.jsx";
import { CADENCE_OPTIONS, formatGrantValue } from "./format.js";
import { VestingChart, VestingEventGrid } from "./Vesting.jsx";

const CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN" },
  { value: "USD", label: "USD" },
];

const DURATION_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: index === 0 ? "1 año" : `${index + 1} años`,
}));

export function RsuWorkspace({ offer, assumptions, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(offer.rsu ?? defaultRsu));
  const update = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const events = useMemo(() => buildVestingEvents(draft), [draft]);
  const errors = useMemo(
    () => validateRsu(draft, assumptions.fxRate, offer.relationship),
    [draft, assumptions.fxRate, offer.relationship],
  );
  const total = draft.allocations.reduce((sum, { percent }) => {
    const value = Number(percent);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const valid = errors.length === 0;
  const status = valid
    ? "El calendario está completo"
    : (errors.find((error) => error.field.startsWith("rsu.allocations")) ?? errors[0]).message;

  function updateAllocation(index, percent) {
    update({
      allocations: draft.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index ? { ...allocation, percent } : allocation,
      ),
    });
  }

  function changeYears(years) {
    update({
      allocations: Array.from({ length: years }, (_, index) => (
        draft.allocations[index] ?? { year: index + 1, percent: 0 }
      )),
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
            <small>{status}</small>
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
                  onChange={(grantValue) => update({ grantValue })}
                />
                <PickerField
                  label="Moneda"
                  value={draft.currency ?? "MXN"}
                  options={CURRENCY_OPTIONS}
                  onChange={(currency) => update({ currency })}
                />
              </div>
              <div className="field-row">
                <PickerField
                  label="Duración"
                  value={draft.allocations.length}
                  options={DURATION_OPTIONS}
                  onChange={changeYears}
                />
                <QuantityInput
                  label="Cliff"
                  value={draft.cliffMonth}
                  suffix="meses"
                  max={draft.allocations.length * 12}
                  onChange={(cliffMonth) => update({ cliffMonth })}
                />
              </div>
              <p className="rsu-control-note">Usa 0 si no hay cliff.</p>
              <PickerField
                label="Frecuencia dentro de cada año"
                value={draft.cadence}
                options={CADENCE_OPTIONS}
                onChange={(cadence) => update({ cadence })}
              />
              <PercentInput
                label="Costo de venta y conversión"
                value={draft.saleFeeRate ?? 0}
                onChange={(saleFeeRate) => update({ saleFeeRate })}
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
                      onChange={(event) => updateAllocation(index, numericInputValue(event))}
                    />
                    <em>%</em>
                  </div>
                </div>
              ))}
              {errors.length ? (
                <ul className="rsu-validation-list" aria-live="polite">
                  {errors.map((error) => <li key={`${error.field}-${error.message}`}>{error.message}</li>)}
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
