import type { PortfolioSummary } from "@/lib/slab/types";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/slab/format";

interface SummaryBarProps {
  summary?: PortfolioSummary | null;
  total: number;
}

function gainTone(value?: string | null): string {
  if (!value) return "text-slate-300";
  const num = Number(value);
  if (num > 0) return "text-emerald-400";
  if (num < 0) return "text-rose-400";
  return "text-slate-300";
}

export function SummaryBar({ summary, total }: SummaryBarProps) {
  return (
    <>
      <section className="hidden gap-4 sm:grid-cols-2 md:grid xl:grid-cols-4">
        <StatCard label="Cards shown" value={String(total)} />
        <StatCard
          label="Portfolio value"
          value={formatCurrency(summary?.portfolio_value)}
        />
        <StatCard
          label="Cost basis"
          value={formatCurrency(summary?.total_cost_basis)}
        />
        <StatCard
          label="Unrealized P&L"
          value={formatSignedCurrency(summary?.total_unrealized_gain_loss)}
          valueClassName={gainTone(summary?.total_unrealized_gain_loss)}
          hint={
            summary?.portfolio_roi
              ? `${formatPercent(summary.portfolio_roi)} ROI`
              : undefined
          }
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 md:hidden">
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">{total}</span> cards shown
          <span className="text-slate-500"> · </span>
          <span>{formatCurrency(summary?.portfolio_value)}</span> portfolio
          {summary?.total_unrealized_gain_loss ? (
            <>
              <span className="text-slate-500"> · </span>
              <span className={gainTone(summary.total_unrealized_gain_loss)}>
                {formatSignedCurrency(summary.total_unrealized_gain_loss)}
              </span>
            </>
          ) : null}
        </p>
      </section>
    </>
  );
}

function StatCard({
  label,
  value,
  hint,
  valueClassName = "text-white",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${valueClassName}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
