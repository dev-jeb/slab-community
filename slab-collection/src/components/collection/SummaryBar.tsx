import { gainTone, StatCard, StatGrid } from "@/components/ui/StatCard";
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


export function SummaryBar({ summary, total }: SummaryBarProps) {
  return (
    <>
      <StatGrid className="hidden md:grid">
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
          tone={gainTone(summary?.total_unrealized_gain_loss)}
          hint={
            summary?.portfolio_roi
              ? `${formatPercent(summary.portfolio_roi)} ROI`
              : undefined
          }
        />
      </StatGrid>

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
