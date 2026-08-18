"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { sheenClass, SheenContent } from "@/components/ui/sheen";
import { gainTone, StatCard, StatGrid } from "@/components/ui/StatCard";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/slab/format";
import type { SetPortfolioSummary } from "@/lib/portfolio-sets";
import type { DashboardStats, PortfolioHistory } from "@/lib/slab/types";

/**
 * The standing answer to "how is my collection doing" — money first, then what's actually in it.
 *
 * This was the /portfolio page. It moved here because the collection page was already showing a
 * smaller, second copy of these same figures above its search results, and two pages answering the
 * same question is how they drift. My Collection now has one tab that reports and one that finds;
 * /portfolio redirects here.
 */

/**
 * The counts that describe the collection's shape, each one a way into search.
 *
 * They're links, not stat cards, because every one of them is a question you'd want to follow —
 * "31 duplicates" is only useful if the next click shows you which. `href` carries the seed the
 * search page opens with (see SearchView).
 */
const SHAPE_LINKS: {
  key: keyof DashboardStats;
  label: string;
  href: string;
}[] = [
  {
    key: "total_cards",
    label: "Cards",
    href: "/search",
  },
  {
    key: "sets",
    label: "Sets",
    href: "/search?browse=sets",
  },
  {
    key: "teams",
    label: "Teams",
    href: "/search?browse=teams",
  },
  {
    key: "duplicates",
    label: "Duplicates",
    href: "/search?browse=duplicates",
  },
  {
    key: "autos",
    label: "Autos",
    href: "/search?filter=auto",
  },
  {
    key: "rookies",
    label: "Rookies",
    href: "/search?filter=rookie",
  },
  {
    key: "numbered",
    label: "Numbered",
    href: "/search?filter=numbered",
  },
];

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

          <ShapeSection stats={dashboard} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Most valuable</h2>
              <div className="mt-4 space-y-3">
                {(dashboard.most_valuable ?? []).slice(0, 8).map((card) => (
                  <div
                    key={card.uuid}
                    className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-white">
                        {card.subjects.join(" / ")} · {card.card_number}
                      </p>
                      <p className="text-sm text-slate-400">
                        {[card.set_name, card.finish, card.grade_key]
                          .filter(Boolean)
                          .join(" · ")}
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
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Top sets</h2>
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

function ShapeSection({ stats }: { stats: DashboardStats }) {
  const graded = stats.graded_count;
  const raw = stats.raw_count;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <h2 className="text-lg font-semibold text-white">What&apos;s in it</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {SHAPE_LINKS.map((item) => {
          const value = stats[item.key] as number | undefined;
          const loading = value === undefined;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-busy={loading}
              className={`inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 py-1.5 pl-3 pr-2 text-sm text-slate-300 transition hover:border-sky-400/50 hover:bg-slate-900 hover:text-sky-100 ${sheenClass(
                loading,
              )}`}
            >
              <SheenContent block={false}>{item.label}</SheenContent>
              <SheenContent
                block={false}
                className="min-w-[1.75rem] rounded-full bg-slate-800 px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-white"
              >
                {loading ? (
                  <>
                    <span className="sr-only">
                      Counting {item.label.toLowerCase()}
                    </span>
                    {/* Holds the badge's width so the pill doesn't jump when the number lands. */}
                    <span aria-hidden="true">&nbsp;</span>
                  </>
                ) : (
                  value
                )}
              </SheenContent>
            </Link>
          );
        })}
      </div>

      {/* Graded/raw is a readout, not a link: it's the one split the collection filters can't
          express, so a pill here would promise a view that doesn't exist. */}
      {graded !== undefined || raw !== undefined ? (
        <p className="mt-4 text-sm text-slate-400">
          <span className="font-medium text-white">{graded ?? 0}</span> graded ·{" "}
          <span className="font-medium text-white">{raw ?? 0}</span> raw
        </p>
      ) : null}
    </section>
  );
}
