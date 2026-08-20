"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { CardPriceChart, formatPriceHistoryRange } from "@/components/card-detail/CardPriceChart";
import { GradingDeskPanel } from "@/components/card-detail/GradingDeskPanel";
import { LiquidityPace } from "@/components/card-detail/LiquidityPace";
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
import type { CompOut, Liquidity, MetricInfo } from "@/lib/slab/types";

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
  // The Sales tab's own filter — all grades by default, narrowed client-side from the one
  // unfiltered comps load. Separate from gradeKey on purpose: picking a grade to inspect sales
  // shouldn't silently swap the History chart out from under the other tab.
  const [salesGrade, setSalesGrade] = useState("ALL");
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
    setSalesGrade("ALL");
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

  // RAW history comes from the full detail; other grades from their slice once it lands. Sales
  // are grade-independent — loaded once for all grades, narrowed client-side by salesGrade.
  const activeSlice = gradeKey !== "RAW" && slice?.gradeKey === gradeKey ? slice : null;
  const comps = detail?.comps;
  const priceHistory = activeSlice?.priceHistory ?? detail?.priceHistory;
  const sliceLoading = gradeKey !== "RAW" && !activeSlice && isSlicePending;

  // The grade a comp displays as is the grade it filters as — one expression, no drift.
  const compGrade = (comp: CompOut) => comp.grade_key ?? comp.grade ?? "—";
  const saleGrades = [...new Set((comps?.comps ?? []).map(compGrade))].sort((a, b) => {
    if (a === "RAW") return -1;
    if (b === "RAW") return 1;
    return a.localeCompare(b);
  });
  const visibleComps =
    salesGrade === "ALL"
      ? comps?.comps ?? []
      : (comps?.comps ?? []).filter((comp) => compGrade(comp) === salesGrade);

  if (needsSetup) return <SetupPrompt />;

  const market = detail?.market;
  // Old API builds send no liquidity at all — then the pricing table skips the column entirely
  // rather than rendering a rail of dashes.
  const pricingHasLiquidity = Boolean(
    detail?.raw?.liquidity || detail?.graded.some((point) => point.liquidity),
  );
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
                <>
                  {/* sampleSize first: it's the count behind the FMV. compTotal only counts
                      confirmed-raw rows among the loaded sales — a floor, for point-less cards. */}
                  <PriceConfidenceBadge
                    sampleSize={detail.raw.sampleSize || detail.raw.compTotal}
                    lowConfidence={detail.raw.lowConfidence}
                  />
                  <LiquidityPace
                    liquidity={detail.raw.liquidity}
                    glossary={market.glossary}
                    className="mt-1 block text-xs text-slate-400"
                  />
                </>
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
            /* One table, one row per grade, RAW first — raw used to be a grid of stat blocks
               above a graded table, and the two shapes read as different kinds of data when
               they're the same five questions asked of every grade. (The comp min/max range is
               gone on purpose: it surfaced exactly the outliers the median trims.) */
            detail.raw || detail.graded.length ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Grade</th>
                      <th className="px-3 py-2 font-medium">Comps</th>
                      <th className="px-3 py-2 font-medium">Median</th>
                      <th className="px-3 py-2 font-medium">Range</th>
                      <th className="px-3 py-2 font-medium">Uplift vs raw</th>
                      {pricingHasLiquidity ? (
                        <th
                          className="px-3 py-2 font-medium"
                          title={market?.glossary?.["liquidity.label"]?.summary}
                        >
                          {market?.glossary?.["liquidity.label"]?.label ??
                            "How often it sells"}
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {detail.raw ? (
                      <PricingRow
                        gradeKey="RAW"
                        sampleSize={detail.raw.sampleSize}
                        median={detail.raw.median}
                        low={detail.raw.low}
                        high={detail.raw.high}
                        uplift={null}
                        baseline
                        liquidity={detail.raw.liquidity}
                        showLiquidity={pricingHasLiquidity}
                        glossary={market?.glossary}
                      />
                    ) : null}
                    {detail.graded.map((point) => (
                      <PricingRow
                        key={`${point.gradeKey}-${point.finish ?? "base"}`}
                        gradeKey={point.gradeKey}
                        finish={point.finish}
                        sampleSize={point.sampleSize}
                        median={point.median}
                        low={point.low}
                        high={point.high}
                        uplift={point.uplift}
                        liquidity={point.liquidity}
                        showLiquidity={pricingHasLiquidity}
                        glossary={market?.glossary}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No priced sales yet.</p>
            )
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
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    {comps.total} sales · showing {visibleComps.length}
                    {salesGrade !== "ALL" ? ` for ${salesGrade}` : ""}
                  </p>
                  {saleGrades.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {["ALL", ...saleGrades].map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSalesGrade(key)}
                          className={
                            salesGrade === key
                              ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-sm text-sky-200"
                              : "rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                          }
                        >
                          {key === "ALL" ? "All" : key}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
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
                      {visibleComps.map((comp, index) => (
                        <tr key={`${comp.sold_date ?? "unknown"}-${index}`}>
                          <td className="px-3 py-2 text-slate-400">
                            {comp.sold_date ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-white">
                            {formatCurrency(comp.sale_price)}
                          </td>
                          <td className="px-3 py-2 text-slate-400">
                            {compGrade(comp)}
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
              <p className="text-sm text-slate-400">No recent sales.</p>
            )
          ) : null}

          {folder === "grade" ? <GradingDeskPanel cardUuid={cardUuid} /> : null}
        </FolderTabs>
      ) : null}

    </div>
  );
}

function PricingRow({
  gradeKey,
  finish,
  sampleSize,
  median,
  low,
  high,
  uplift,
  baseline = false,
  liquidity,
  showLiquidity,
  glossary,
}: {
  gradeKey: string;
  finish?: string | null;
  sampleSize: number;
  median: string | null;
  low?: string | null;
  high?: string | null;
  uplift: string | null;
  /** The RAW row — the grade every uplift is measured against, so it shows the word, not a dash. */
  baseline?: boolean;
  liquidity?: Liquidity | null;
  showLiquidity: boolean;
  glossary?: Record<string, MetricInfo>;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-200">
        {gradeKey}
        {finish ? ` · ${finish}` : ""}
      </td>
      <td className="px-3 py-2 text-slate-400">{sampleSize}</td>
      <td className="px-3 py-2 text-white">{formatCurrency(median)}</td>
      <td className="px-3 py-2 text-slate-300">{formatRange(low, high)}</td>
      <td className={`px-3 py-2 ${baseline ? "text-slate-500" : "text-emerald-300"}`}>
        {baseline ? "baseline" : uplift ? formatSignedCurrency(uplift) : "—"}
      </td>
      {showLiquidity ? (
        <td className="px-3 py-2 text-slate-300">
          {liquidity ? (
            <LiquidityPace liquidity={liquidity} glossary={glossary} />
          ) : (
            "—"
          )}
        </td>
      ) : null}
    </tr>
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
