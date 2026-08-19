import type { PortfolioPoint } from "@/lib/slab/types";
import { formatCurrency } from "@/lib/slab/format";

interface PortfolioChartProps {
  points: PortfolioPoint[];
}

function parseChartDate(value: string): number {
  return Date.parse(value.includes("T") ? value : `${value}T12:00:00`);
}

function formatChartDate(value: string): string {
  const time = parseChartDate(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function dateTickIndexes(length: number, count = 6): number[] {
  if (length <= count) return Array.from({ length }, (_, index) => index);
  const last = length - 1;
  const ticks = new Set<number>();
  for (let index = 0; index < count; index += 1) {
    ticks.add(Math.round((index / (count - 1)) * last));
  }
  return [...ticks].sort((a, b) => a - b);
}

export function PortfolioChart({ points }: PortfolioChartProps) {
  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
        Not enough history yet to chart portfolio value.
      </div>
    );
  }

  const values = points.map((point) => Number(point.portfolio_value));
  const costs = points.map((point) =>
    point.cost_basis ? Number(point.cost_basis) : null,
  );
  const min = Math.min(...values, ...costs.filter((v): v is number => v !== null));
  const max = Math.max(...values, ...costs.filter((v): v is number => v !== null));
  const range = max - min || 1;
  const width = 800;
  const height = 220;
  const pad = 24;
  const padBottom = 36;
  const times = points.map((point) => parseChartDate(point.date));
  const rangeStart = Math.min(...times);
  const rangeEnd = Math.max(...times);
  const dateSpan = rangeEnd - rangeStart;

  function toX(index: number): number {
    if (dateSpan <= 0 || Number.isNaN(times[index])) {
      return pad + (index / (points.length - 1)) * (width - pad * 2);
    }
    return pad + ((times[index] - rangeStart) / dateSpan) * (width - pad * 2);
  }

  function toPath(nums: number[]) {
    return nums
      .map((value, index) => {
        const x = toX(index);
        const y = height - padBottom - ((value - min) / range) * (height - pad - padBottom);
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const valuePath = toPath(values);
  const costPath = costs.every((value) => value !== null)
    ? toPath(costs as number[])
    : null;
  const ticks = dateTickIndexes(points.length);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2 text-slate-300">
          <span className="h-0.5 w-6 bg-sky-400" />
          Market value
        </span>
        {costPath ? (
          <span className="flex items-center gap-2 text-slate-300">
            <span className="h-0.5 w-6 bg-slate-500" />
            Cost basis
          </span>
        ) : null}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <path d={valuePath} fill="none" stroke="#60a5fa" strokeWidth="2.5" />
        {costPath ? (
          <path d={costPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
        ) : null}
        {ticks.map((pointIndex, index) => {
          const point = points[pointIndex];
          const x = toX(pointIndex);
          const anchor =
            index === 0 ? "start" : index === ticks.length - 1 ? "end" : "middle";
          return (
            <text
              key={`${point.date}-${pointIndex}`}
              x={x}
              y={height - 8}
              textAnchor={anchor}
              fill="#64748b"
              fontSize="11"
            >
              {formatChartDate(point.date)}
            </text>
          );
        })}
      </svg>
      <div className="mt-1 text-right text-xs text-slate-500">
        {formatCurrency(String(values.at(-1)))} today
      </div>
    </div>
  );
}
