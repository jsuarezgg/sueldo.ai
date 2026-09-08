import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MXN, USD, buildVestingEvents } from "./compensation.js";

function formatGrantValue(value, currency = "MXN") {
  return (currency === "USD" ? USD : MXN).format(Number(value) || 0);
}

function VestingTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <span>Mes {item.month}</span>
      <strong>{item.cumulative.toFixed(2)}% vested</strong>
      <small>{formatGrantValue(item.cumulativeValue, currency)}</small>
    </div>
  );
}

export default function VestingChart({ rsu, compact = false }) {
  const events = buildVestingEvents(rsu);
  const maxMonth = Math.max(
    12,
    rsu.allocations.length * 12,
    events.at(-1)?.month ?? 0,
  );
  const tickStep = maxMonth <= 36 ? 6 : 12;
  const monthTicks = Array.from(
    { length: Math.floor(maxMonth / tickStep) + 1 },
    (_, index) => index * tickStep,
  );
  const data = [
    { month: 0, cumulative: 0, cumulativeValue: 0 },
    ...events.map((event) => ({
      month: event.month,
      cumulative: Number(event.cumulative.toFixed(2)),
      cumulativeValue: event.cumulativeValue,
      eventLabel: events.length <= 12 ? `${Number(event.percent.toFixed(2))}%` : "",
    })),
  ];

  return (
    <div className={compact ? "vesting-chart compact" : "vesting-chart"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 18, bottom: 12, left: compact ? -20 : 4 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="2 5" />
          <XAxis
            type="number"
            dataKey="month"
            domain={[0, maxMonth]}
            ticks={monthTicks}
            tickLine={false}
            axisLine={{ stroke: "var(--line-strong)" }}
            tick={{ fill: "var(--ink-soft)", fontSize: compact ? 11 : 12 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value) => `${value}%`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--ink-soft)", fontSize: compact ? 11 : 12 }}
          />
          {rsu.cliffMonth > 0 ? (
            <ReferenceLine
              x={rsu.cliffMonth}
              stroke="var(--ink-soft)"
              strokeDasharray="3 4"
              label={{
                value: `Cliff · mes ${rsu.cliffMonth}`,
                position: "insideTopLeft",
                fill: "var(--ink-soft)",
                fontSize: 11,
              }}
            />
          ) : null}
          <Tooltip
            content={<VestingTooltip currency={rsu.currency ?? "MXN"} />}
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "2 4" }}
          />
          <Line
            type="stepAfter"
            dataKey="cumulative"
            stroke="var(--chart)"
            strokeWidth={2}
            dot={{ r: compact ? 2.5 : 3, fill: "var(--chart)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--chart)", stroke: "var(--surface)", strokeWidth: 3 }}
            isAnimationActive={false}
          >
            <LabelList dataKey="eventLabel" position="top" fill="var(--ink-soft)" fontSize={9} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
