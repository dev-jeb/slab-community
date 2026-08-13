import type { CardPricePoint } from "@/lib/slab/types";
import { formatCurrency } from "@/lib/slab/format";

interface CardPriceChartProps {
  points: CardPricePoint[];
  gradeKey: string;
  startDate?: string;
  endDate?: string;
}

function parseChartDate(value: string): number {
  return Date.parse(value.includes("T") ? value : `${value}T12:00:00`);
}

function formatTimestamp(time: number, short = false): string {
  const date = new Date(time);
  return date.toLocaleDateString("en-US", short
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

export function formatPriceHistoryRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate || !endDate) return null;
  return `${formatTimestamp(parseChartDate(startDate))} – ${formatTimestamp(parseChartDate(endDate))}`;
}

function chartPadding(min: number, max: number): number {
  const span = max - min;
  if (span <= 0) {
    return Math.max(min * 0.08, min >= 100 ? 5 : min >= 10 ? 1 : 0.25);
  }
  return span * 0.12;
}

function buildDateTicks(rangeStart: number, rangeEnd: number, count = 4) {
  if (rangeEnd <= rangeStart) {
    return [{ time: rangeStart, fraction: 0.5 }];
  }

  return Array.from({ length: count }, (_, index) => ({
    time: rangeStart + ((rangeEnd - rangeStart) * index) / (count - 1),
    fraction: index / (count - 1),
  }));
}

export function CardPriceChart({
  points,
  gradeKey,
  startDate,
  endDate,
}: CardPriceChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
        Not enough price history yet for {gradeKey}.
      </div>
    );
  }

  const medians = points.map((point) => Number(point.price_median));
  const medianMin = Math.min(...medians);
  const medianMax = Math.max(...medians);
  const padding = chartPadding(medianMin, medianMax);
  const scaleMin = Math.max(0, medianMin - padding);
  const scaleMax = medianMax + padding;
  const range = scaleMax - scaleMin || 1;

  const pointTimes = points.map((point) => parseChartDate(point.date));
  const rangeStart = startDate
    ? parseChartDate(startDate)
    : Math.min(...pointTimes);
  const rangeEnd = endDate
    ? parseChartDate(endDate)
    : Math.max(...pointTimes);
  const dateSpan = rangeEnd - rangeStart;

  const width = 800;
  const height = 240;
  const padLeft = 72;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 44;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  function toY(value: number): number {
    return padTop + plotHeight - ((value - scaleMin) / range) * plotHeight;
  }

  function toX(index: number): number {
    if (dateSpan <= 0) {
      return padLeft + (index / (points.length - 1)) * plotWidth;
    }

    const time = pointTimes[index];
    return padLeft + ((time - rangeStart) / dateSpan) * plotWidth;
  }

  const medianPath = medians
    .map((value, index) => {
      const x = toX(index);
      const y = toY(value);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const bandPoints = points
    .map((point, index) => {
      const low = point.price_low ? Number(point.price_low) : Number(point.price_median);
      const high = point.price_high ? Number(point.price_high) : Number(point.price_median);
      return { x: toX(index), low: toY(low), high: toY(high) };
    })
    .filter((point) => point.low !== point.high);

  const bandPath =
    bandPoints.length > 0
      ? [
          ...bandPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.high}`),
          ...[...bandPoints].reverse().map((point) => `L${point.x},${point.low}`),
          "Z",
        ].join(" ")
      : null;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const value = scaleMin + range * fraction;
    const y = toY(value);
    return { value, y };
  });

  const dateTicks = buildDateTicks(rangeStart, rangeEnd);
  const rangeStartLabel = startDate ?? points[0]?.date ?? "";
  const rangeEndLabel = endDate ?? points.at(-1)?.date ?? "";

  const periodLow = Math.min(...medians);
  const periodHigh = Math.max(...medians);
  const periodChange = medians.at(-1)! - medians[0]!;
  const changePct =
    medians[0] !== 0 ? ((periodChange / medians[0]) * 100).toFixed(1) : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="h-0.5 w-6 bg-sky-400" />
          FMV ({gradeKey})
        </span>
        <span className="text-slate-500">
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
      <svg viewBox={`0 0 ${width} ${height}`} className="h-60 w-full">
        {gridLines.map(({ value, y }) => (
          <g key={value}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              stroke="#1e293b"
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={y + 4}
              textAnchor="end"
              fill="#64748b"
              fontSize="11"
            >
              {formatCurrency(String(value))}
            </text>
          </g>
        ))}
        <line
          x1={padLeft}
          x2={width - padRight}
          y1={padTop + plotHeight}
          y2={padTop + plotHeight}
          stroke="#334155"
          strokeWidth="1"
        />
        {dateTicks.map(({ time, fraction }, index) => {
          const x = padLeft + fraction * plotWidth;
          const anchor =
            index === 0 ? "start" : index === dateTicks.length - 1 ? "end" : "middle";

          return (
            <g key={`${time}-${fraction}`}>
              <line
                x1={x}
                x2={x}
                y1={padTop + plotHeight}
                y2={padTop + plotHeight + 4}
                stroke="#475569"
                strokeWidth="1"
              />
              <text
                x={x}
                y={height - 14}
                textAnchor={anchor}
                fill="#64748b"
                fontSize="11"
              >
                {formatTimestamp(time, true)}
              </text>
            </g>
          );
        })}
        {bandPath ? (
          <path d={bandPath} fill="rgba(56, 189, 248, 0.12)" stroke="none" />
        ) : null}
        <path d={medianPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
        {medians.map((value, index) => (
          <circle
            key={points[index]?.date ?? index}
            cx={toX(index)}
            cy={toY(value)}
            r="3"
            fill="#38bdf8"
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {rangeStartLabel && rangeEndLabel
            ? `${formatTimestamp(parseChartDate(rangeStartLabel))} – ${formatTimestamp(parseChartDate(rangeEndLabel))}`
            : "Date range unavailable"}
        </span>
        <span>{formatCurrency(String(medians.at(-1)))} latest</span>
      </div>
    </div>
  );
}
