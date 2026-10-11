import { lazy, Suspense } from "react";
import { buildVestingEvents } from "./compensation.js";

const DeferredVestingChart = lazy(() => import("./VestingChart.jsx"));

export function VestingChart({ compact = false, ...props }) {
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

export function VestingEventGrid({ rsu, compact = false }) {
  const events = buildVestingEvents(rsu);
  const lastEventYear = Math.max(1, Math.ceil((events.at(-1)?.month ?? 12) / 12));
  const displayYears = Math.max(rsu.allocations.length, lastEventYear);

  return (
    <div className={`vesting-event-grid ${compact ? "compact" : ""}`} aria-label="Eventos de vesting por año">
      {Array.from({ length: displayYears }, (_, index) => {
        const year = index + 1;
        const yearEvents = events.filter((event) => Math.ceil(event.month / 12) === year);
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
