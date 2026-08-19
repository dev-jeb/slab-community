"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { CardPriceChart, formatPriceHistoryRange } from "@/components/card-detail/CardPriceChart";
import { GradingDeskPanel } from "@/components/card-detail/GradingDeskPanel";
import { CopySaleActions } from "@/components/sales/CopySaleActions";
import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { FolderTabs } from "@/components/ui/FolderTabs";
import {
  cardSubtitle,
  cardTitle,
  formatCurrency,
  formatSignedCurrency,
} from "@/lib/slab/format";
import type { CardDetailResult, CardGradeSlice } from "@/lib/card-detail";

function formatRange(low?: string | null, high?: string | null): string {
  if (!low && !high) return "—";
  if (low && high) return `${formatCurrency(low)} – ${formatCurrency(high)}`;
  return formatCurrency(low ?? high);
}

interface CardDetailViewProps {
  cardUuid: string;
}

type DetailFolder = "copies" | "pricing" | "history" | "comps" | "grade";

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
  // The grade selector swaps only what depends on the grade — that grade's comps and history —
  // fetched as a slice. The full detail (market, rainbow, copies, raw summary) loads once per
  // card and stays put, so switching grades doesn't blank the whole page. A slice for the wrong
  // grade is ignored rather than cleared, which is what makes switching back to RAW instant.
  const [slice, setSlice] = useState<CardGradeSlice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSlicePending, startSliceTransition] = useTransition();
  const [folder, setFolder] = useState<DetailFolder>("pricing");

  const loadDetail = useCallback(() => {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/cards/${cardUuid}`);

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
  }, [cardUuid]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    setFolder("pricing");
    setGradeKey("RAW");
  }, [cardUuid]);

  useEffect(() => {
    if (gradeKey === "RAW") return;

    startSliceTransition(async () => {
      const response = await fetch(
        `/api/cards/${cardUuid}?slice=grade&grade_key=${encodeURIComponent(gradeKey)}`,
      );
      if (!response.ok) return;
      setSlice((await response.json()) as CardGradeSlice);
    });
  }, [cardUuid, gradeKey]);

  // RAW comes from the full detail; other grades from their slice once it lands.
  const activeSlice = gradeKey !== "RAW" && slice?.gradeKey === gradeKey ? slice : null;
  const comps = activeSlice?.comps ?? detail?.comps;
  const priceHistory = activeSlice?.priceHistory ?? detail?.priceHistory;
  const sliceLoading = gradeKey !== "RAW" && !activeSlice && isSlicePending;

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

      {detail && detail.parallels.length > 0 ? (
        <RainbowStrip
          currentFinish={market?.finish ?? null}
          currentFmv={detail.raw?.median ?? null}
          currentOwned={ownedCount}
          parallels={detail.parallels}
        />
      ) : null}

      {detail ? (
        <FolderTabs
          ariaLabel="Card details"
          tabs={[
            { id: "copies", label: "Copies" },
            { id: "pricing", label: "Pricing" },
            { id: "history", label: "History" },
            { id: "comps", label: "Sales" },
            { id: "grade", label: "Grade it" },
          ]}
          value={folder}
          onChange={setFolder}
        >
          {folder === "copies" ? (
            detail.ownedCopies.length ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  {detail.ownedCopies.length} in your collection
                </p>
                {detail.ownedCopies.map((copy) => (
                  <OwnedCopyRow key={copy.uuid} copy={copy}>
                    <CopySaleActions copy={copy} onUpdated={loadDetail} />
                  </OwnedCopyRow>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                You don&apos;t own this printing.
              </p>
            )
          ) : null}

          {folder === "pricing" ? (
            <div className="space-y-6">
              {detail.raw ? (
                <div>
                  <h3 className="text-sm font-medium text-slate-300">Raw</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                </div>
              ) : (
                <p className="text-sm text-slate-400">No raw comps yet.</p>
              )}

              {detail.graded.length ? (
                <div>
                  <h3 className="text-sm font-medium text-slate-300">
                    Graded pricing &amp; uplift
                  </h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800/80">
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
                            <td className="px-3 py-2 text-slate-400">
                              {point.sampleSize}
                            </td>
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
                </div>
              ) : null}
            </div>
          ) : null}

          {folder === "history" ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  {formatPriceHistoryRange(
                    priceHistory?.start_date,
                    priceHistory?.end_date,
                  ) ?? "Last 90 days"}
                </p>
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
              <div className={`mt-4 transition-opacity ${sliceLoading ? "opacity-50" : ""}`}>
                <CardPriceChart
                  points={priceHistory?.points ?? []}
                  gradeKey={gradeKey}
                  startDate={priceHistory?.start_date}
                  endDate={priceHistory?.end_date}
                />
              </div>
            </div>
          ) : null}

          {folder === "comps" ? (
            comps?.comps.length ? (
              <div className={sliceLoading ? "opacity-50" : ""}>
                <p className="text-sm text-slate-400">
                  {comps.total} total · showing {comps.comps.length} for {gradeKey}
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
                      {comps.comps.map((comp, index) => (
                        <tr key={`${comp.sold_date ?? "unknown"}-${index}`}>
                          <td className="px-3 py-2 text-slate-400">
                            {comp.sold_date ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-white">
                            {formatCurrency(comp.sale_price)}
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {comp.grade_key ?? comp.grade ?? "—"}
                            {comp.grade_unconfirmed ? (
                              <span
                                className="ml-1 cursor-help text-amber-400"
                                title="Grade unconfirmed: no grade in the listing title, but priced like this card's graded copies — likely a graded sale, so don't read it as raw value."
                              >
                                ?
                              </span>
                            ) : null}
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
              </div>
            ) : (
              <p className="text-sm text-slate-400">No recent comps for {gradeKey}.</p>
            )
          ) : null}

          {folder === "grade" ? <GradingDeskPanel cardUuid={cardUuid} /> : null}
        </FolderTabs>
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

/**
 * The whole rainbow on one quiet rail, the printing you're on included and highlighted.
 *
 * A rainbow can run 16 printings deep, so the strip has to stay calm at that size: one
 * horizontally-scrolling row of identical cells rather than three wrapped rows of ragged chips.
 * Every cell is the same width, the same two lines (name, then run · price in one muted tone),
 * and ownership is a small emerald dot instead of a badge — so sixteen variants read as one row
 * of options, not sixteen competing labels. Click a cell and this same page re-anchors on that
 * printing.
 */
function RainbowCell({
  name,
  printRun,
  fmv,
  owned,
  active = false,
}: {
  name: string;
  printRun?: number | null;
  fmv: string | null;
  owned: number;
  active?: boolean;
}) {
  const meta = [printRun ? `/${printRun}` : null, fmv ? formatCurrency(fmv) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`flex w-36 shrink-0 flex-col rounded-lg px-3 py-2 transition ${
        active
          ? "bg-slate-800/80 ring-1 ring-sky-400/40"
          : "bg-slate-900/40 group-hover:bg-slate-800/60"
      }`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`truncate text-sm font-medium ${active ? "text-white" : "text-slate-200"}`}
        >
          {name}
        </span>
        {owned > 0 ? (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            title={`You own ${owned}`}
          />
        ) : null}
      </span>
      <span className="mt-0.5 truncate text-xs text-slate-500">{meta || "—"}</span>
    </span>
  );
}

function RainbowStrip({
  currentFinish,
  currentFmv,
  currentOwned,
  parallels,
}: {
  currentFinish: string | null;
  currentFmv: string | null;
  currentOwned: number;
  parallels: CardDetailResult["parallels"];
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
          Printings
        </h3>
        <span className="text-xs text-slate-600">
          {parallels.length + 1} total
        </span>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span aria-current="true" title={currentFinish ?? "Base"}>
          <RainbowCell
            name={currentFinish ?? "Base"}
            fmv={currentFmv}
            owned={currentOwned}
            active
          />
        </span>

        {parallels.map(({ card, headlineFmv, ownedCount }) => (
          <Link
            key={card.uuid}
            href={`/cards/${card.uuid}`}
            className="group"
            title={card.finish ?? "Base"}
          >
            <RainbowCell
              name={card.finish ?? "Base"}
              printRun={card.print_run}
              fmv={headlineFmv}
              owned={ownedCount}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
