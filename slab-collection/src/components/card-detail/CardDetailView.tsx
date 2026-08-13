"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { CardPriceChart, formatPriceHistoryRange } from "@/components/card-detail/CardPriceChart";
import { CopySaleActions } from "@/components/sales/CopySaleActions";
import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import {
  cardSubtitle,
  cardTitle,
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/slab/format";
import type { CardDetailResult } from "@/lib/card-detail";

function formatRange(low?: string | null, high?: string | null): string {
  if (!low && !high) return "—";
  if (low && high) return `${formatCurrency(low)} – ${formatCurrency(high)}`;
  return formatCurrency(low ?? high);
}

interface CardDetailViewProps {
  cardUuid: string;
}

function OwnedBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-200">
      Owned{count > 1 ? ` · ${count}` : ""}
    </span>
  );
}

export function CardDetailView({ cardUuid }: CardDetailViewProps) {
  const [detail, setDetail] = useState<CardDetailResult | null>(null);
  const [gradeKey, setGradeKey] = useState("RAW");
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadDetail = useCallback(() => {
    startTransition(async () => {
      setError(null);

      const response = await fetch(
        `/api/cards/${cardUuid}?grade_key=${encodeURIComponent(gradeKey)}`,
      );

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load card");
        return;
      }

      const data = (await response.json()) as CardDetailResult;
      setDetail(data);
      setNeedsSetup(false);
    });
  }, [cardUuid, gradeKey]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (needsSetup) return <SetupPrompt />;

  const market = detail?.market;
  const ownedCount = detail
    ? detail.ownedCopies.reduce(
        (sum, copy) => sum + Math.max(copy.quantity, 1),
        0,
      )
    : 0;
  const playerName = primarySubjectName(
    market?.subjects.map((name) => ({ name })) ?? [],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start gap-6">
        <PlayerAvatar
          name={playerName}
          size="md"
          className="h-16 w-16 border-2 border-slate-700/80"
        />
        <div className="min-w-0 flex-1">
          {isPending && !detail ? (
            <div className="h-24 animate-pulse rounded-xl bg-slate-900" />
          ) : market ? (
            <>
              <p className="text-xs uppercase tracking-[0.25em] text-sky-400">
                {market.set_name ?? "Catalog card"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-white">
                  {cardTitle({
                    uuid: cardUuid,
                    card_number: market.card_number,
                    subjects: market.subjects.map((name) => ({ name })),
                    set_name: market.set_name,
                    subset: market.subset,
                    finish: market.finish,
                    attributes: [],
                  })}
                </h2>
                <OwnedBadge count={ownedCount} />
              </div>
              <p className="mt-2 text-slate-400">
                {cardSubtitle({
                  uuid: cardUuid,
                  card_number: market.card_number,
                  subjects: market.subjects.map((name) => ({ name })),
                  set_name: market.set_name,
                  subset: market.subset,
                  finish: market.finish,
                  attributes: [],
                })}
              </p>
              <p className="mt-4 text-3xl font-semibold text-sky-300">
                {formatCurrency(detail?.raw?.median)}
              </p>
              {detail?.raw ? (
                <PriceConfidenceBadge
                  sampleSize={detail.raw.compTotal || detail.raw.sampleSize}
                  lowConfidence={detail.raw.lowConfidence}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {detail?.ownedCopies.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">Your copies</h3>
          <p className="mt-1 text-sm text-slate-400">
            {detail.ownedCopies.length} in your collection
          </p>
          <div className="mt-4 space-y-3">
            {detail.ownedCopies.map((copy) => (
              <OwnedCopyRow key={copy.uuid} copy={copy}>
                <CopySaleActions copy={copy} onUpdated={loadDetail} />
              </OwnedCopyRow>
            ))}
          </div>
        </section>
      ) : null}

      {detail?.raw ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">Raw pricing</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="FMV (median)" value={formatCurrency(detail.raw.median)} />
            <Stat label="Comp average" value={formatCurrency(detail.raw.average)} />
            <Stat
              label="Purchase range"
              value={formatRange(detail.raw.low, detail.raw.high)}
            />
            <Stat
              label="Comp sales range"
              value={formatRange(detail.raw.compMin, detail.raw.compMax)}
            />
          </div>
        </section>
      ) : null}

      {detail ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Price history</h3>
              <p className="mt-1 text-sm text-slate-400">
                {formatPriceHistoryRange(
                  detail.priceHistory.start_date,
                  detail.priceHistory.end_date,
                ) ?? "Last 90 days"}
              </p>
            </div>
            {detail.gradeKeys.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {detail.gradeKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setGradeKey(key)}
                    className={
                      gradeKey === key
                        ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-sm text-sky-200"
                        : "rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                    }
                  >
                    {key}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-4">
            <CardPriceChart
              points={detail.priceHistory.points}
              gradeKey={gradeKey}
              startDate={detail.priceHistory.start_date}
              endDate={detail.priceHistory.end_date}
            />
          </div>
        </section>
      ) : null}

      {detail?.graded.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">Graded pricing & uplift</h3>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Grade</th>
                  <th className="px-3 py-2 font-medium">Comps</th>
                  <th className="px-3 py-2 font-medium">Median</th>
                  <th className="px-3 py-2 font-medium">Range</th>
                  <th className="px-3 py-2 font-medium">Uplift vs raw</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {detail.graded.map((point) => (
                  <tr key={`${point.gradeKey}-${point.finish ?? "base"}`}>
                    <td className="px-3 py-2 text-slate-200">
                      {point.gradeKey}
                      {point.finish ? ` · ${point.finish}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{point.sampleSize}</td>
                    <td className="px-3 py-2 text-white">
                      {formatCurrency(point.median)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {formatRange(point.low, point.high)}
                    </td>
                    <td className="px-3 py-2 text-emerald-300">
                      {point.uplift
                        ? formatSignedCurrency(point.uplift)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {detail?.comps.comps.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">Recent comps</h3>
          <p className="mt-1 text-sm text-slate-400">
            {detail.comps.total} total · showing {detail.comps.comps.length} for{" "}
            {gradeKey}
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Grade</th>
                  <th className="px-3 py-2 font-medium">Marketplace</th>
                  <th className="px-3 py-2 font-medium">Listing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {detail.comps.comps.map((comp, index) => (
                  <tr key={`${comp.sold_date ?? "unknown"}-${index}`}>
                    <td className="px-3 py-2 text-slate-400">
                      {comp.sold_date ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-white">
                      {formatCurrency(comp.sale_price)}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {comp.grade_key ?? comp.grade ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {comp.marketplace}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-500">
                      {comp.title}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {detail?.parallels.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h3 className="text-lg font-semibold text-white">Parallels</h3>
          <p className="mt-1 text-sm text-slate-400">
            {detail.parallels.length} related variant
            {detail.parallels.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {detail.parallels.map(({ card, headlineFmv, ownedCount: parallelOwned }) => (
              <Link
                key={card.uuid}
                href={`/cards/${card.uuid}`}
                className="relative rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 transition hover:border-sky-500/40 hover:bg-slate-950/50"
              >
                {parallelOwned > 0 ? (
                  <span className="absolute right-3 top-3">
                    <OwnedBadge count={parallelOwned} />
                  </span>
                ) : null}
                <p className="pr-20 font-medium text-white">{cardTitle(card)}</p>
                <p className="mt-1 text-sm text-slate-400">{cardSubtitle(card)}</p>
                <p className="mt-3 text-lg font-semibold text-sky-300">
                  {formatCurrency(headlineFmv)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
