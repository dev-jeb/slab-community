"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { SalesView } from "@/components/sales/SalesView";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
} from "@/lib/slab/format";
import type { SetPortfolioSummary } from "@/lib/portfolio-sets";
import type { DashboardStats, PortfolioHistory } from "@/lib/slab/types";

type PortfolioTab = "overview" | "sales";

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: PortfolioTab =
    searchParams.get("tab") === "sales" ? "sales" : "overview";

  const setTab = useCallback(
    (nextTab: PortfolioTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `/portfolio?${query}` : "/portfolio");
    },
    [router, searchParams],
  );

  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  const [topSetsByValue, setTopSetsByValue] = useState<SetPortfolioSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (tab !== "overview") return;

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/portfolio");

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load portfolio");
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
  }, [tab]);

  if (needsSetup) return <SetupPrompt />;

  const chartPoints =
    history?.points?.length ? history.points : (dashboard?.portfolio_series ?? []);

  return (
    <div className="space-y-6">
      <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
        <TabButton
          active={tab === "overview"}
          onClick={() => setTab("overview")}
          label="Portfolio"
        />
        <TabButton
          active={tab === "sales"}
          onClick={() => setTab("sales")}
          label="Sales"
        />
      </div>

      {tab === "sales" ? (
        <SalesView embedded />
      ) : (
        <div className="space-y-8">
          {isPending && !dashboard ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-900" />
              ))}
            </div>
          ) : null}

          {dashboard ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                />
                <StatCard
                  label="ROI"
                  value={formatPercent(dashboard.portfolio_roi)}
                  hint={
                    dashboard.portfolio_change_7d
                      ? `7d change ${formatSignedCurrency(dashboard.portfolio_change_7d)}`
                      : undefined
                  }
                />
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <StatCard label="Total cards" value={String(dashboard.total_cards ?? 0)} />
                <StatCard
                  label="Priced coverage"
                  value={formatPercent(dashboard.priced_coverage)}
                />
              </section>

              <PortfolioChart points={chartPoints} />

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
                  <p className="mt-1 text-sm text-slate-400">
                    Sorted by comp-based set value
                  </p>
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
      )}
    </div>
  );
}

export function PortfolioView() {
  return (
    <Suspense
      fallback={
        <div className="h-48 animate-pulse rounded-xl bg-slate-900" />
      }
    >
      <PortfolioContent />
    </Suspense>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-sky-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
