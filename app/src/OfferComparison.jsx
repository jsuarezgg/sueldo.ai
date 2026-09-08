import { MXN } from "./compensation.js";

// A shared scale keeps the lengths comparable, including values below zero.
export function OfferComparison({ items, compact = false }) {
  const maximum = Math.max(1, ...items.map(({ amount }) => Math.abs(amount ?? 0)));
  const signed = items.some(({ amount }) => amount < 0);

  return (
    <dl className={`offer-comparison ${compact ? "is-compact" : ""}`}>
      {items.map(({ key, name, amount, detail }, index) => {
        const length = Math.abs(amount ?? 0) / maximum * (signed ? 50 : 100);
        const start = signed ? (amount < 0 ? 50 - length : 50) : 0;

        return (
          <div className="offer-comparison-row" data-offer={key} key={key}>
            <dt>
              <span className="offer-letter" aria-hidden="true">{index === 0 ? "A" : "B"}</span>
              <span>{name}</span>
            </dt>
            <dd>
              <strong>{amount === null ? "—" : MXN.format(amount)}</strong>
              <div className={`offer-bar-track ${signed ? "is-signed" : ""}`} aria-hidden="true">
                <div className="offer-bar" style={{ width: `${length}%`, marginLeft: `${start}%` }} />
              </div>
              {detail ? <small>{detail}</small> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
