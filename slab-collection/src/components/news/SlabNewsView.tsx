"use client";

import Link from "next/link";
import { useMemo } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { useNews } from "@/components/news/NewsProvider";
import { confidenceToneClass } from "@/lib/slab/confidence";
import { setLabel } from "@/lib/set-label";
import { cardSubtitle, cardTitle, formatCurrency } from "@/lib/slab/format";
import type { CompAlert } from "@/lib/slab-news-snapshot";
import type { SetOut } from "@/lib/slab/types";

function formatSoldDate(value?: string | null): string {
  if (!value) return "Unknown date";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function ConfidenceChange({ alert }: { alert: CompAlert }) {
  const changed = alert.previousConfidence.label !== alert.currentConfidence.label;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">
        Confidence
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${confidenceToneClass(alert.previousConfidence.tone)}`}
        >
          {alert.previousConfidence.label}
        </span>
        <span className="text-slate-500">→</span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${confidenceToneClass(alert.currentConfidence.tone)}`}
        >
          {alert.currentConfidence.label}
        </span>
        {changed ? (
          <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
            Updated
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PriceConfidenceBadge
          sampleSize={alert.previousSampleSize}
          lowConfidence={alert.previousLowConfidence}
        />
        <PriceConfidenceBadge
          sampleSize={alert.currentSampleSize}
          lowConfidence={alert.currentLowConfidence}
        />
      </div>
    </div>
  );
}

function NewSetCard({ set }: { set: SetOut }) {
  return (
    <div className="rounded-xl border border-sky-400/20 bg-slate-950/40 px-4 py-3">
      <p className="font-medium text-white">{setLabel(set)}</p>
      <p className="mt-1 text-sm text-slate-400">
        {[set.sport, set.slug].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
        <span>{set.card_count ?? "—"} cards</span>
        <span>{set.priced_count ?? "—"} priced</span>
        <span>{set.sales_90d ?? "—"} sales (90d)</span>
        {set.box_price ? <span>Box {formatCurrency(set.box_price)}</span> : null}
      </div>
    </div>
  );
}

function CompAlertRow({ alert }: { alert: CompAlert }) {
  const card = {
    uuid: alert.cardUuid,
    card_number: alert.cardNumber,
    subjects: alert.subjects.map((name) => ({ name })),
    set_name: alert.setName,
    subset: alert.subset,
    finish: alert.finish,
    attributes: [],
  };

  return (
    <Link
      href={`/cards/${alert.cardUuid}`}
      className="block rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-4 transition hover:border-slate-700 hover:bg-slate-950/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-white">{cardTitle(card)}</p>
          <p className="mt-1 text-sm text-slate-400">{cardSubtitle(card)}</p>
        </div>
        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          New comp
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Latest sale
          </p>
          <p className="mt-1 font-medium text-white">
            {formatCurrency(alert.latestComp.sale_price)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {formatSoldDate(alert.latestComp.sold_date)} · {alert.latestComp.marketplace}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Comps {alert.previousTotal} → {alert.currentTotal}
          </p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">FMV</p>
          <p className="mt-1 text-white">
            {formatCurrency(alert.previousFmv)} → {formatCurrency(alert.currentFmv)}
          </p>
          {alert.fmvDelta ? (
            <p className="mt-1 text-sm text-slate-400">Change {alert.fmvDelta}</p>
          ) : null}
        </div>
      </div>

      <ConfidenceChange alert={alert} />
    </Link>
  );
}

export function SlabNewsView() {
  const {
    payload,
    isLoading,
    error,
    needsSetup,
    hasBaseline,
    newSets,
    compAlerts,
    markAllSeen,
  } = useNews();

  const catalogTicker = useMemo(
    () => (payload?.ticker ?? []).filter((item) => item.kind === "catalog"),
    [payload],
  );

  if (needsSetup) return <SetupPrompt />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">
            New packs imported into Slab and comp updates on cards you own.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllSeen}
          disabled={!payload}
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark all as seen
        </button>
      </div>

      {isLoading && !payload ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-slate-900" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-900" />
        </div>
      ) : null}

      {payload ? (
        <>
          <section className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">New imported sets</h2>
              {hasBaseline && newSets.length > 0 ? (
                <span className="rounded-full bg-sky-400/20 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                  {newSets.length} new
                </span>
              ) : null}
            </div>

            {!hasBaseline ? (
              <p className="mt-3 text-sm text-sky-100/80">
                Baseline saved on first visit. Newly imported sets will appear here next time.
              </p>
            ) : newSets.length ? (
              <div className="mt-4 space-y-3">
                {catalogTicker.slice(0, 3).map((item, index) => (
                  <p key={`${item.text}-${index}`} className="text-sm text-sky-100/90">
                    {item.icon} {item.text}
                  </p>
                ))}
                <div className="grid gap-3 sm:grid-cols-2">
                  {newSets.map((set) => (
                    <NewSetCard key={set.uuid} set={set} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-sky-100/80">
                No new sets imported since your last visit.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Comp alerts</h2>
              <span className="text-sm text-slate-400">
                {compAlerts.length} alert{compAlerts.length === 1 ? "" : "s"}
              </span>
            </div>

            {compAlerts.length ? (
              <div className="mt-4 space-y-3">
                {compAlerts.map((alert) => (
                  <CompAlertRow key={alert.cardUuid} alert={alert} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {hasBaseline
                  ? "No new comps on owned cards since your last visit."
                  : "Comp alerts will appear after your baseline snapshot is saved."}
              </p>
            )}
          </section>
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
