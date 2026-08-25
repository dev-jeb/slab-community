"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { ChartTooltip, SeriesKey } from "@/components/charts/ChartTooltip";
import {
  CHROME,
  DOT_RADIUS,
  LINE_WIDTH,
  SERIES,
  formatAxisCurrency,
  formatChartDate,
  paddedDomain,
  parseChartDate,
} from "@/components/charts/theme";
import { formatCurrency } from "@/lib/slab/format";
import type { PortfolioPoint } from "@/lib/slab/types";

/** The surface this chart draws on — `.panel`, for the marker's ring. */
const SURFACE = "#162040";

interface Row {
  t: number;
  value: number;
  cost: number | null;
}

/**
 * What the collection is worth over time, against what it cost.
 *
 * Recharts rather than the hand-rolled SVG this used to be — same reasoning as `PriceHistoryChart`,
 * and the two share `charts/theme` so a series color means the same thing on both.
 *
 * Two things this chart is careful about:
 *  - **Cost basis is a real series, not a gray dashed reference.** It gets the foil hue (gold is
 *    the money color everywhere else in slab) and a legend key of its own. Warm-against-cool is
 *    also the pairing that survives color blindness; a near-gray line fails the chroma floor and
 *    stops doing identity work at all.
 *  - **The series is AS-OF, so it steps up when you BUY.** Each point values only the copies owned
 *    on that date, which is why the gap between the two lines is the paper gain and why a jump in
 *    both at once is an acquisition, not the market moving. The caption says so — differencing two
 *    points of this line is not price movement.
 */
export function PortfolioChart({ points }: { points: PortfolioPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-dim)]">
        Not enough history yet to chart portfolio value.
      </div>
    );
  }

  const rows: Row[] = points.map((point) => ({
    t: parseChartDate(point.date),
    value: Number(point.portfolio_value),
    cost: point.cost_basis != null ? Number(point.cost_basis) : null,
  }));

  // Only chart cost basis when every point has one: a line that vanishes for a stretch reads as
  // "cost went to zero" rather than "we don't know".
  const hasCost = rows.every((row) => row.cost !== null);

  const values = rows.map((row) => row.value);
  const costs = hasCost ? rows.map((row) => row.cost as number) : [];
  const domain = paddedDomain(
    Math.min(...values, ...costs),
    Math.max(...values, ...costs),
  );

  const rangeStart = rows[0].t;
  const rangeEnd = rows.at(-1)!.t;
  const ticks =
    rangeEnd > rangeStart
      ? [0, 1, 2, 3, 4].map((i) => rangeStart + ((rangeEnd - rangeStart) * i) / 4)
      : [rangeStart];

  const last = rows.at(-1)!;

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as Row | undefined;
    if (!row) return null;

    return (
      <ChartTooltip
        label={formatChartDate(row.t, true)}
        rows={[
          {
            name: "market value",
            value: formatCurrency(String(row.value)),
            color: SERIES.value,
          },
          ...(hasCost && row.cost !== null
            ? [
                {
                  name: "cost basis",
                  value: formatCurrency(String(row.cost)),
                  color: SERIES.costBasis,
                },
              ]
            : []),
        ]}
      />
    );
  };

  return (
    <section className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <SeriesKey color={SERIES.value} label="Market value" />
          {hasCost ? (
            <SeriesKey color={SERIES.costBasis} label="Cost basis" />
          ) : null}
        </div>
        <span className="text-[var(--text-dim)]">
          {formatCurrency(String(last.value))} today
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHROME.grid} strokeWidth={1} vertical={false} />
          <XAxis
            type="number"
            dataKey="t"
            scale="time"
            domain={[rangeStart, rangeEnd]}
            ticks={ticks}
            tickFormatter={(value: number) => formatChartDate(value)}
            tick={{ fill: CHROME.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHROME.grid }}
            minTickGap={16}
          />
          <YAxis
            domain={domain}
            tickFormatter={formatAxisCurrency}
            tick={{ fill: CHROME.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: CHROME.tooltipBorder, strokeWidth: 1 }}
          />
          {hasCost ? (
            <Line
              type="monotone"
              dataKey="cost"
              stroke={SERIES.costBasis}
              strokeWidth={LINE_WIDTH}
              dot={false}
              activeDot={{
                r: DOT_RADIUS,
                fill: SERIES.costBasis,
                stroke: SURFACE,
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke={SERIES.value}
            strokeWidth={LINE_WIDTH}
            dot={false}
            activeDot={{
              r: DOT_RADIUS,
              fill: SERIES.value,
              stroke: SURFACE,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={last.t}
            y={last.value}
            r={DOT_RADIUS}
            fill={SERIES.value}
            stroke={SURFACE}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-3 text-xs text-[var(--text-dim)]">
        Each point values only the cards you owned that day, so the line steps up when you buy —
        the distance between it and cost basis is your paper gain, not a market move.
      </p>
    </section>
  );
}
