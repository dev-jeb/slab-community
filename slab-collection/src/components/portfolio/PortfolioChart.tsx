import type { PortfolioPoint } from "@/lib/slab/types";
import { formatCurrency } from "@/lib/slab/format";

interface PortfolioChartProps {
  points: PortfolioPoint[];
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

  function toPath(nums: number[]) {
    return nums
      .map((value, index) => {
        const x = pad + (index / (nums.length - 1)) * (width - pad * 2);
        const y = height - pad - ((value - min) / range) * (height - pad * 2);
        return `${index === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  const valuePath = toPath(values);
  const costPath = costs.every((value) => value !== null)
    ? toPath(costs as number[])
    : null;

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
        <path d={valuePath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
        {costPath ? (
          <path d={costPath} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
        ) : null}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        <span>{points[0]?.date}</span>
        <span>{formatCurrency(String(values.at(-1)))} today</span>
        <span>{points.at(-1)?.date}</span>
      </div>
    </div>
  );
}
