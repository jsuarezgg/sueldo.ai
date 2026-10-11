import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, CaretDown, Check } from "@phosphor-icons/react";
import { MXN, TAX_YEAR } from "./compensation.js";
import { PLAIN_AMOUNT } from "./format.js";

export function numericInputValue(event) {
  return event.target.value === "" ? "" : Number(event.target.value);
}

export function BrandHeader({ children, onHome }) {
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

export function PickerField({
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
    setActiveIndex((current) => (current + direction + options.length) % options.length);
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
