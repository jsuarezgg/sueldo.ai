import { useId, useRef, useState } from "react";
import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { MXN, TAX_YEAR } from "./compensation.js";
import { PLAIN_AMOUNT } from "./format.js";

export function numericInputValue(event) {
  return event.target.value === "" ? "" : Number(event.target.value);
}

export function BrandHeader({ onHome }) {
  return (
    <header className="brand-header">
      <button type="button" className="brand" onClick={onHome} aria-label="Ir al inicio">
        <span className="brand-word">sueldo</span><span className="brand-suffix">.ai</span>
      </button>
      <div className="header-links">
        <span>México · {TAX_YEAR}</span>
        <a href="/como-usar" target="_blank" rel="noreferrer">Cómo funciona <ArrowRight size={14} aria-hidden="true" /></a>
      </div>
    </header>
  );
}

export function Disclosure({ className, summary, children }) {
  return (
    <details className={`responsive-disclosure always-collapsible ${className}`} aria-label={summary}>
      <summary>
        <span>{summary}</span>
        <CaretDown className="responsive-disclosure-caret" size={17} weight="bold" aria-hidden="true" />
      </summary>
      <div className="responsive-disclosure-content">{children}</div>
    </details>
  );
}

export function MoneyInput({
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
          {showFormatted ? <span className="formatted-amount" aria-hidden="true">{PLAIN_AMOUNT.format(value)}</span> : null}
        </div>
        {suffix ? <em>{suffix}</em> : null}
      </div>
      {error ? <small className="field-error" id={errorId}>{error}</small> : null}
    </label>
  );
}

export function QuantityInput({ label, value, onChange, suffix, max }) {
  return (
    <label className="field money-field">
      <span>{label}</span>
      <div className="input-shell">
        <input
          value={value}
          type="number"
          min="0"
          max={max}
          step="1"
          inputMode="numeric"
          onChange={(event) => onChange(numericInputValue(event))}
        />
        <em>{suffix}</em>
      </div>
    </label>
  );
}

export function PercentInput({ label, ariaLabel, value, onChange }) {
  return (
    <label className="field percent-field">
      <span>{label}</span>
      <div className="input-shell">
        <input
          aria-label={ariaLabel}
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

export function TextInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function CompactValueInput({ label, detail, value, onChange, suffix, step = 1, max }) {
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

export function CalculatedLine({ label, amount, detail, warning = false, formatter = MXN }) {
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

// Option values may be numbers; a native select reports strings, so map back by index.
export function SelectField({ label, ariaLabel, value, options, onChange, className = "" }) {
  const select = (
    <span className="select-control">
      <select
        aria-label={label ? undefined : ariaLabel}
        value={String(value)}
        onChange={(event) => onChange(options[event.target.selectedIndex].value)}
      >
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>{option.label}</option>
        ))}
      </select>
      <CaretDown size={16} weight="bold" aria-hidden="true" />
    </span>
  );
  if (!label) return <span className={`select-field ${className}`.trim()}>{select}</span>;
  return (
    <label className={`field select-field ${className}`.trim()}>
      <span>{label}</span>
      {select}
    </label>
  );
}
