"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { ChartTooltip, SeriesKey } from "@/components/charts/ChartTooltip";
import {
  BAND_OPACITY,
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

/** The surface this chart draws on — the folder panel it lives inside, for the marker's ring. */
const SURFACE = "#1a2744";

interface PriceHistoryChartProps {
  points: PricePoint[];
  /** What the line IS — "FMV (PSA 9)", "Hobby Box price". Names the series, so no legend box. */
  label: string;
  startDate?: string;
  endDate?: string;
}

/**
 * The shape both price series arrive in.
 *
 * A card's daily snapshot and a sealed SKU's are the same record with different keys — median,
 * low, high, sample size, per day — which is why one chart draws both. Declared structurally
 * rather than importing one of the two named types, so neither page looks like it borrowed the
 * other's chart.
 */
interface PricePoint {
  date: string;
  price_median: string;
  price_low?: string | null;
  price_high?: string | null;
}

export function formatPriceHistoryRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate || !endDate) return null;
  return `${formatChartDate(parseChartDate(startDate), true)} – ${formatChartDate(parseChartDate(endDate), true)}`;
}

interface Row {
  t: number;
  median: number;
  /** [low, high] — Recharts draws a two-value dataKey as a range area. */
  band: [number, number];
}

/**
 * A price series over time, plus the spread of the sales behind it — a card's FMV at one grade, or
 * a sealed SKU's box price.
 *
 * Recharts rather than the hand-rolled SVG this used to be: it's the library the slab portal
 * already carries, and it brings the parts a chart is expected to have — a crosshair, a tooltip,
 * axis tick selection, responsive width — that a bespoke `<path>` builder has to reinvent badly.
 *
 * What it draws, and why in that shape:
 *  - **One line**, so no legend box: the key above the plot names the single series. Two colors
 *    on a one-series chart is the most common way a chart misses its point.
 *  - **A wash, not a second line**, for `price_low`–`price_high`. That pair is the min and max of
 *    the *trimmed* sample behind each day's median (the middle 80% of sales), so it's "where most
 *    sales landed" — context for the line, not a series competing with it.
 *  - **No dot on every point.** Ninety daily snapshots of dots is noise; the endpoint is marked,
 *    the hovered point gets a marker, and the tooltip carries the rest.
 *
 * Colors come from `charts/theme` and are validated there — don't inline a hex here.
 */
export function PriceHistoryChart({
  points,
  label,
  startDate,
  endDate,
}: PriceHistoryChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-dim)]">
        Not enough price history yet for {label}.
      </div>
    );
  }

  const rows: Row[] = points.map((point) => {
    const median = Number(point.price_median);
    return {
      t: parseChartDate(point.date),
      median,
      band: [
        point.price_low ? Number(point.price_low) : median,
        point.price_high ? Number(point.price_high) : median,
      ],
    };
  });

  // A band of zero width everywhere is ink with nothing to say — drop it rather than draw a
  // hairline shadow along the median.
  const hasBand = rows.some((row) => row.band[0] !== row.band[1]);

  const medians = rows.map((row) => row.median);
  const lows = hasBand ? rows.map((row) => row.band[0]) : medians;
  const highs = hasBand ? rows.map((row) => row.band[1]) : medians;
  const domain = paddedDomain(Math.min(...lows), Math.max(...highs));

  const rangeStart = startDate ? parseChartDate(startDate) : rows[0].t;
  const rangeEnd = endDate ? parseChartDate(endDate) : rows.at(-1)!.t;
  // Four evenly spaced dates rather than whatever Recharts picks: the axis then reads the same
  // from card to card, which is what makes two cards comparable at a glance.
  const ticks =
    rangeEnd > rangeStart
      ? [0, 1, 2, 3].map((i) => rangeStart + ((rangeEnd - rangeStart) * i) / 3)
      : [rangeStart];

  const last = rows.at(-1)!;
  const periodLow = Math.min(...medians);
  const periodHigh = Math.max(...medians);
  const periodChange = last.median - medians[0];
  const changePct = medians[0] !== 0 ? ((periodChange / medians[0]) * 100).toFixed(1) : null;

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as Row | undefined;
    if (!row) return null;

    return (
      <ChartTooltip
        label={formatChartDate(row.t, true)}
        rows={[
          {
            name: label,
            value: formatCurrency(String(row.median)),
            color: SERIES.value,
          },
          ...(hasBand && row.band[0] !== row.band[1]
            ? [
                {
                  name: "most sales",
                  value: `${formatCurrency(String(row.band[0]))} – ${formatCurrency(String(row.band[1]))}`,
                  color: SERIES.value,
                },
              ]
            : []),
        ]}
      />
    );
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <SeriesKey color={SERIES.value} label={label} />
          {hasBand ? (
            <SeriesKey color={SERIES.value} label="Where most sales landed" band />
          ) : null}
        </div>
        <span className="text-[var(--text-dim)]">
          Period {formatCurrency(String(periodLow))} – {formatCurrency(String(periodHigh))}
          {changePct !== null ? (
            <span
              className={
                periodChange > 0
                  ? "ml-2 text-emerald-400"
                  : periodChange < 0
                    ? "ml-2 text-rose-400"
                    : "ml-2 text-slate-400"
              }
            >
              {periodChange > 0 ? "+" : ""}
              {changePct}%
            </span>
          ) : null}
        </span>
      </div>

      {/* 210 including the x-axis band, not just the plot: this chart lives inside the card
          page's fixed-height folder panel, and a container that budgets only for the plot pushes
          the date labels out and gives the panel a tiny nested scrollbar. */}
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          {/* Solid hairline, horizontal only — a dashed grid reads as a threshold, and vertical
              rules compete with the crosshair. */}
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
          {hasBand ? (
            <Area
              dataKey="band"
              stroke="none"
              fill={SERIES.value}
              fillOpacity={BAND_OPACITY}
              isAnimationActive={false}
              activeDot={false}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="median"
            stroke={SERIES.value}
            strokeWidth={LINE_WIDTH}
            dot={false}
            // The hovered point gets a marker with a 2px ring in the surface color, so it stays
            // legible where it crosses the band.
            activeDot={{
              r: DOT_RADIUS,
              fill: SERIES.value,
              stroke: SURFACE,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
          {/* The one point worth marking without a hover: where the line ends up. */}
          <ReferenceDot
            x={last.t}
            y={last.median}
            r={DOT_RADIUS}
            fill={SERIES.value}
            stroke={SURFACE}
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
        <span>
          {formatPriceHistoryRange(
            startDate ?? points[0]?.date,
            endDate ?? points.at(-1)?.date,
          ) ?? "Date range unavailable"}
        </span>
        <span>{formatCurrency(String(last.median))} latest</span>
      </div>
    </div>
  );
}
