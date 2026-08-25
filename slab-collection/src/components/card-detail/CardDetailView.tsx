"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  PriceHistoryChart,
  formatPriceHistoryRange,
} from "@/components/charts/PriceHistoryChart";
import { GradingDeskPanel } from "@/components/card-detail/GradingDeskPanel";
import { LiquidityPace } from "@/components/card-detail/LiquidityPace";
import { PrintingStrip } from "@/components/card-detail/PrintingStrip";
import { CopySaleActions } from "@/components/sales/CopySaleActions";
import { OwnedCopyRow } from "@/components/collection/OwnedCopyRow";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { Sheen, SheenBar } from "@/components/ui/sheen";
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

/** The rail's footprint before the rainbow lands — same heading row, same 3.75rem cells. */
function PrintingRailSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="flex items-baseline justify-between">
        <h3 className="heading-section">Printings</h3>
        <SheenBar className="h-4 w-10" />
      </div>
      <Sheen loading label="Loading printings" className="mt-2">
        <div className="flex gap-2 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SheenBar key={i} className="h-[3.75rem] w-[168px] shrink-0 rounded-lg" />
          ))}
        </div>
      </Sheen>
    </section>
  );
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
  // The printing on screen, which is not always the one the route was built with.
  //
  // Picking another printing off the rail used to be a route change: the page tore down, blanked
  // to a skeleton and rebuilt — a whole page for what is really a step sideways within one card.
  // So a pick swaps THIS component's data instead (the rail slides, the numbers below cross-fade)
  // and the address bar catches up afterwards via the history API, which Next syncs without
  // re-rendering the route. Every fetch keys off this, not the prop.
  const [activeUuid, setActiveUuid] = useState(cardUuid);
  const [routeUuid, setRouteUuid] = useState(cardUuid);

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

  // A real navigation — Back, or a link from elsewhere — moves the prop, and that wins. React's
  // documented "adjust state when a prop changes" pattern: done during render, so nothing renders
  // with the stale printing first.
  if (routeUuid !== cardUuid) {
    setRouteUuid(cardUuid);
    setActiveUuid(cardUuid);
    setFolder("pricing");
    resetGradeSelections();
  }

  /**
   * Grade selections are per-printing — a /10 parallel's graded rows aren't the base card's — so
   * every change of printing clears them. The open TAB deliberately survives a rail step: stepping
   * along the rainbow to compare the same panel across printings is what the rail is for, and
   * yanking you back to Pricing each time is the page-change feeling in miniature. A real arrival
   * (above) does reset it, since that's a different card, not a different printing of this one.
   */
  function resetGradeSelections() {
    setGradeKey("RAW");
    setSalesGrade("ALL");
    // The cached slice belongs to the printing that asked for it and carries no card of its own,
    // so a stale one would be shown as this printing's history the moment you re-pick that grade.
    setSlice(null);
  }

  const loadDetail = useCallback(() => {
    startTransition(async () => {
      setError(null);

      const response = await fetch(`/api/cards/${activeUuid}`);

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
  }, [activeUuid]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (gradeKey === "RAW") return;

    startSliceTransition(async () => {
      const response = await fetch(
        `/api/cards/${activeUuid}?slice=grade&grade_key=${encodeURIComponent(gradeKey)}`,
      );
      if (!response.ok) return;
      setSlice((await response.json()) as CardGradeSlice);
    });
  }, [activeUuid, gradeKey]);

  /**
   * Step the rail to another printing without leaving the page.
   *
   * The address bar is rewritten with `replaceState` rather than the Next router: `router.push`
   * re-renders the route and remounts this component, which is the teardown the swap exists to
   * avoid. Replace rather than push, so Back returns to wherever you came from (the search, the
   * set) instead of walking you back through every printing you glanced at — the rail is one page,
   * not fifteen. Either way the URL always names what's on screen, so a refresh or a pasted link
   * lands on the right printing.
   */
  const pickPrinting = useCallback(
    (uuid: string) => {
      if (uuid === activeUuid) return;
      setActiveUuid(uuid);
      setGradeKey("RAW");
      setSalesGrade("ALL");
      setSlice(null);
      window.history.replaceState(null, "", `/cards/${uuid}`);
    },
    [activeUuid],
  );

  // The old printing stays on screen while the new one loads, dimmed rather than blanked: these
  // cards differ by a finish and a price, so replacing the whole page with a skeleton to change
  // two numbers is what made a pick feel like a navigation.
  const swapping = detail !== null && detail.cardUuid !== activeUuid;

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
        <div
          className={`min-w-0 flex-1 transition-opacity duration-200 ${
            swapping ? "opacity-40" : "opacity-100"
          }`}
        >
          {isPending && !detail ? (
            // One bar per line of the loaded header, at that line's size and margin — the sheen
            // rule this file kept breaking: a placeholder that doesn't reserve the real content's
            // size just moves the jump to the moment the data lands. The old 96px block was half
            // the height of what replaced it, so every card load shoved the page down.
            <Sheen loading label="Loading card">
              <SheenBar className="h-4 w-48" />
              <SheenBar className="mt-2 h-9 w-72 max-w-full" />
              <SheenBar className="mt-2 h-6 w-96 max-w-full" />
              <SheenBar className="mt-4 h-9 w-28" />
              {/* Same reserved slot as the loaded header below, so the two states are the same
                  height by construction rather than by two numbers agreeing. */}
              <div className="min-h-12">
                <SheenBar className="mt-1.5 h-[21px] w-44" />
                <SheenBar className="mt-1 h-4 w-24" />
              </div>
            </Sheen>
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
              {/* A FIXED slot for what qualifies the price, whether or not there is anything to
                  put in it. Its contents have three natural heights — badge + pace, badge alone
                  (no liquidity in the response), or nothing at all for a printing with no raw
                  sales — so leaving it to the content meant every step along the rail shoved the
                  rail, the tabs and the panel up or down by up to 44px. `min-h` rather than `h`:
                  it reserves the tall case without clipping if a pace line wraps on a narrow
                  screen.

                  48px is the tall case measured from its own type: the badge row is a 10px label
                  at the inherited 1.5 line-height (15) + py-0.5 (4) + its border (2) = 21, under
                  mt-1.5 (6); the pace line is text-xs (16) under mt-1 (4). 27 + 20 = 47, plus a
                  pixel of slack. */}
              <div className="min-h-12">
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
                ) : (
                  // The dash above says a number is missing; this says which number and why, so
                  // the reserved space carries an answer instead of reading as a rendering gap.
                  // "Raw" specifically: a printing with no raw sales can still have graded ones,
                  // which the Pricing tab lists.
                  <p className="mt-1.5 text-xs text-slate-500">
                    No raw sales recorded for this printing.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {/* One printing is not a rainbow — the rail only earns its space when there's a choice.
          It renders from the LAST loaded detail during a swap and is not dimmed with the rest:
          it's the one thing on the page that must stay solid to step along.

          While the card is still loading the rail's space is held by a skeleton of the same
          height, so the tabs below don't get shoved down the moment the rainbow arrives. The one
          case that still moves is a card with a single printing, where the held space collapses
          once — rare enough to be worth the common case staying still. */}
      {detail ? (
        detail.printings.length > 1 ? (
          <PrintingStrip
            printings={detail.printings}
            activeUuid={activeUuid}
            onPick={pickPrinting}
          />
        ) : null
      ) : (
        <PrintingRailSkeleton />
      )}

      {detail ? (
        <div
          className={`transition-opacity duration-200 ${
            swapping ? "opacity-40" : "opacity-100"
          }`}
        >
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
          /* One height for every tab, and its own scroll inside.
             These five tabs answer the same question at wildly different sizes — "You don't own
             this printing" is one line, a sales list is a hundred rows — so a panel sized to its
             contents jumped from 40px to 3000px on a click, and reading down the tab strip made
             the page pump. A fixed box means the tabs, the rail and the header never move and the
             tab strip stays on screen while a long list scrolls.
             24rem is the tallest DESIGNED content — the 240px history chart plus its date/grade
             row — with padding and a little slack. Tables longer than that scroll; nothing else
             has to. */
          bodyClassName="h-96 overflow-y-auto"
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
                <PriceHistoryChart
                  points={priceHistory?.points ?? []}
                  label={`FMV (${gradeKey})`}
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
        </div>
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

