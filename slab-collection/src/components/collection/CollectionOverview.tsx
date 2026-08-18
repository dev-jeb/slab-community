"use client";

import { useEffect, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import Link from "next/link";

import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { gainTone, StatCard, StatGrid } from "@/components/ui/StatCard";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/slab/format";
import type { SetPortfolioSummary } from "@/lib/portfolio-sets";
import type { DashboardStats, HighlightCard, PortfolioHistory } from "@/lib/slab/types";

/**
 * The standing answer to "how is my collection doing" — money first, then what's actually in it.
 *
 * This was the /portfolio page. It moved here because the collection page was already showing a
 * smaller, second copy of these same figures above its search results, and two pages answering the
 * same question is how they drift. My Collection now has one tab that reports and one that finds;
 * /portfolio redirects here.
 */

export function CollectionOverview() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  const [topSetsByValue, setTopSetsByValue] = useState<SetPortfolioSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/portfolio");

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load your collection");
        return;
      }

      const data = (await response.json()) as {
        dashboard: DashboardStats;
        history: PortfolioHistory;
        topSetsByValue?: SetPortfolioSummary[];
      };

      setDashboard(data.dashboard);
      setHistory(data.history);
      setTopSetsByValue(data.topSetsByValue ?? []);
    });
  }, []);

  if (needsSetup) return <SetupPrompt />;

  const chartPoints =
    history?.points?.length ? history.points : (dashboard?.portfolio_series ?? []);

  return (
    <div className="space-y-8">
      {isPending && !dashboard ? (
        <StatGrid>
          {[
            "Portfolio value",
            "Cost basis",
            "Unrealized P&L",
            "ROI",
            "Total cards",
            "Priced coverage",
          ].map((label) => (
            <StatCard key={label} label={label} value="" loading />
          ))}
        </StatGrid>
      ) : null}

      {dashboard ? (
        <>
          <StatGrid>
            <StatCard
              label="Portfolio value"
              value={formatCurrency(dashboard.portfolio_value)}
            />
            <StatCard
              label="Cost basis"
              value={formatCurrency(dashboard.total_cost_basis)}
            />
            <StatCard
              label="Unrealized P&L"
              value={formatSignedCurrency(dashboard.total_unrealized_gain_loss)}
              tone={gainTone(dashboard.total_unrealized_gain_loss)}
            />
            <StatCard
              label="ROI"
              value={formatPercent(dashboard.portfolio_roi)}
              tone={gainTone(dashboard.portfolio_roi)}
              hint={
                dashboard.portfolio_change_7d
                  ? `7d ${formatSignedCurrency(dashboard.portfolio_change_7d)}`
                  : undefined
              }
            />
            <StatCard
              label="Total cards"
              value={String(dashboard.total_cards ?? 0)}
            />
            <StatCard
              label="Priced coverage"
              value={formatPercent(dashboard.priced_coverage)}
            />
          </StatGrid>

          <PortfolioChart points={chartPoints} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel p-5">
              <h2 className="heading-section">Most valuable</h2>
              <div className="mt-4 space-y-1">
                {(dashboard.most_valuable ?? []).slice(0, 8).map((card) => (
                  <HighlightRow key={card.uuid} card={card} />
                ))}
              </div>
            </section>

            <section className="panel p-5">
              <h2 className="heading-section">Top sets</h2>
              <div className="mt-4 space-y-3">
                {topSetsByValue.length ? (
                  topSetsByValue.map((set) => (
                    <div
                      key={set.label}
                      className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-white">{set.label}</p>
                        <p className="text-sm text-slate-400">
                          {set.count} card{set.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="shrink-0 font-medium text-white">
                        {formatCurrency(String(set.value))}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No set data available.</p>
                )}
              </div>
            </section>
          </div>
        </>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One row of the Most valuable list — a link into the card's drill-down when the API says which
 * catalog card the copy is of (`card_uuid`; older API builds don't send it, and a dead link is
 * worse than a plain row, so those render exactly as before).
 */
function HighlightRow({ card }: { card: HighlightCard }) {
  const body = (
    <>
      <div>
        <p className="font-medium text-white">
          {card.subjects.join(" / ")} · {card.card_number}
        </p>
        <p className="text-sm text-slate-400">
          {[card.set_name, card.finish, card.grade_key].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">
          {formatCurrency(card.fair_market_value)}
        </p>
        <p className="text-xs text-slate-500">
          {formatSignedCurrency(card.unrealized_gain_loss)}
        </p>
      </div>
    </>
  );

  if (!card.card_uuid) {
    return (
      <div className="flex items-start justify-between gap-4 border-b border-[#2a3a5c] px-2 py-3 last:border-0">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/cards/${card.card_uuid}`}
      className="-mx-2 flex items-start justify-between gap-4 rounded-lg border-b border-[#2a3a5c] px-2 py-3 transition last:border-0 hover:bg-[#1a2744]"
    >
      {body}
    </Link>
  );
}
