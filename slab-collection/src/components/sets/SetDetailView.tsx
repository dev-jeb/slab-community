"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { PriceHistoryChart } from "@/components/charts/PriceHistoryChart";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { Sheen, SheenBar } from "@/components/ui/sheen";
import { formatLabel, type SetDetailResult } from "@/lib/set-detail";
import { releaseLabel } from "@/lib/set-label";
import { formatPricedPercent } from "@/lib/set-lookup-sort";
import { formatCurrency } from "@/lib/slab/format";
import type {
  CompOut,
  SealedMarket,
  SealedPriceHistory,
  SealedProductOut,
} from "@/lib/slab/types";
import { fetchJson } from "@/lib/slab/fetch-json";

type Face = "history" | "sales" | "cards";

/**
 * One product, opened up: what its sealed SKUs cost and what the best cards in it are worth.
 *
 * Built as the card page's twin on purpose. A set has the same two-level shape a card does — a
 * thing with several priced variants — so it gets the same furniture: a rail of variants across
 * the top with one selected, and a folder of views underneath. On a card the variants are
 * printings; here they're the sealed SKUs, because "what does a hobby box go for, and is a blaster
 * worth it" is the same question as "what does the base go for next to the Gold".
 *
 * Price history is per SKU and loaded when that SKU is picked, the way the card page loads a
 * grade's slice — a set can carry half a dozen formats, and five of their series are answers to a
 * question nobody asked yet.
 */
export function SetDetailView({ setUuid }: { setUuid: string }) {
  const [detail, setDetail] = useState<SetDetailResult | null>(null);
  const [productUuid, setProductUuid] = useState<string | null>(null);
  const [history, setHistory] = useState<SealedPriceHistory | null>(null);
  const [market, setMarket] = useState<SealedMarket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [face, setFace] = useState<Face>("history");
  const [, startTransition] = useTransition();
  const [, startSkuTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchJson<SetDetailResult>(
        `/api/sets/${setUuid}`,
        undefined,
        "Failed to load this product",
      );

      if (result.status === "setup") {
        setNeedsSetup(true);
        return;
      }

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setDetail(result.data);
      // Open on the SKU the list is sorted to lead with — the priced hobby box, when there is one.
      setProductUuid(result.data.sealed[0]?.uuid ?? null);
    });
  }, [setUuid]);

  useEffect(() => {
    load();
  }, [load]);

  // The series and the sales behind it are one SKU's story, so they load together — switching
  // to Sales after picking a box shouldn't be a second wait for something already asked for.
  useEffect(() => {
    if (!productUuid) return;

    startSkuTransition(async () => {
      const [historyResult, marketResult] = await Promise.all([
        fetchJson<SealedPriceHistory>(`/api/sealed/${productUuid}/history`),
        fetchJson<SealedMarket>(`/api/sealed/${productUuid}/market`),
      ]);

      // Either half missing leaves that panel empty; the set above it is already on screen.
      if (historyResult.status === "ok") setHistory(historyResult.data);
      if (marketResult.status === "ok") setMarket(marketResult.data);
    });
  }, [productUuid]);

  if (needsSetup) return <SetupPrompt />;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
        {error}
      </div>
    );
  }

  if (!detail) return <LoadingSet />;

  const { set, sealed, topCards } = detail;
  const active = sealed.find((sku) => sku.uuid === productUuid) ?? sealed[0];
  // The previous SKU's numbers are worse than none: they would sit under the new SKU's name.
  const activeHistory = history?.product_uuid === active?.uuid ? history : null;
  const activeMarket = market?.product?.uuid === active?.uuid ? market : null;
  const released = releaseLabel(set);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-sky-400">
          {set.brand ?? "Product"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-white">
          {set.name ?? set.slug}
        </h2>
        <p className="mt-2 text-slate-400">
          {[set.season, released !== "—" ? `Released ${released}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {set.card_count?.toLocaleString() ?? "—"} printings ·{" "}
          {formatPricedPercent(set)} with a recorded price ·{" "}
          {set.sales_90d?.toLocaleString() ?? 0} sales in 90 days
        </p>
      </header>

      {sealed.length ? (
        <SealedRail
          sealed={sealed}
          activeUuid={active?.uuid ?? null}
          onPick={setProductUuid}
        />
      ) : null}

      <FolderTabs
        ariaLabel="Product views"
        tabs={[
          { id: "history", label: "Price history" },
          {
            id: "sales",
            label: "Sales",
            hint: "The recorded sealed sales this price is built from",
          },
          {
            id: "cards",
            label: "Top cards",
            hint: "The set's most valuable printings",
          },
        ]}
        value={face}
        onChange={setFace}
        bodyClassName="h-[28rem] overflow-y-auto"
      >
        {face === "history" ? (
          active ? (
            <SkuHistory sku={active} history={activeHistory} />
          ) : (
            <EmptyNote>
              No sealed products catalogued for this set yet, so there&apos;s nothing to price.
              Sealed SKUs arrive with the set&apos;s overview.
            </EmptyNote>
          )
        ) : null}

        {face === "sales" ? (
          active ? (
            <SealedSales sku={active} market={activeMarket} />
          ) : (
            <EmptyNote>No sealed products catalogued for this set yet.</EmptyNote>
          )
        ) : null}

        {face === "cards" ? (
          topCards.cards.length ? (
            <TopCards cards={topCards.cards} />
          ) : (
            <EmptyNote>No printings in this set have a recorded sale yet.</EmptyNote>
          )
        ) : null}
      </FolderTabs>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-sm text-slate-400">{children}</p>;
}

/**
 * The sealed SKUs on one rail, the picked one highlighted — the printings strip's sibling.
 *
 * Deliberately not the same component: a printing rail can run sixteen cells deep and needs paging
 * arrows, while a set carries a handful of formats that fit on one line. The shared thing is the
 * cell — name on top, price as the number that matters below — so the two read as the same idea
 * at a glance without one inheriting the other's machinery.
 */
function SealedRail({
  sealed,
  activeUuid,
  onPick,
}: {
  sealed: SealedProductOut[];
  activeUuid: string | null;
  onPick: (uuid: string) => void;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h3 className="heading-section">Sealed</h3>
        <span className="text-xs text-[var(--text-dim)]">
          {sealed.length} {sealed.length === 1 ? "format" : "formats"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {sealed.map((sku) => {
          const active = sku.uuid === activeUuid;
          return (
            <button
              key={sku.uuid}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => onPick(sku.uuid)}
              className={`relative flex h-[3.75rem] w-[10.5rem] flex-col justify-between rounded-lg border px-3 py-2 text-left transition ${
                active
                  ? "border-[var(--foil-dim)] bg-[#1a2744]"
                  : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-bright)] hover:bg-[#1a2744]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute -left-px -top-px h-0.5 bg-[var(--foil)] transition-all duration-200 ${
                  active ? "w-3" : "w-0"
                }`}
              />
              <span
                className={`truncate text-[13px] font-medium ${
                  active ? "text-[var(--foil)]" : "text-slate-200"
                }`}
              >
                {formatLabel(sku.format)}
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`font-mono text-sm tabular-nums ${
                    sku.price_median ? "text-slate-100" : "text-[var(--text-dim)]"
                  }`}
                >
                  {sku.price_median ? formatCurrency(sku.price_median) : "—"}
                </span>
                {sku.packs_per_box ? (
                  <span className="shrink-0 rounded border border-[var(--border)] px-1 font-mono text-[10px] leading-4 text-[var(--text-dim)]">
                    {sku.packs_per_box}pk
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/**
 * "12 cards/pack", but "1 card/pack" — a one-card pack is a real configuration (Clear Cut ships
 * one card in one pack in one box), and it read as "1 cards/pack · 1 packs/box".
 */
function countOf(
  count: number | null | undefined,
  unit: string,
  per: string,
): string | null {
  if (!count) return null;
  return `${count} ${unit}${count === 1 ? "" : "s"}/${per}`;
}

/** The picked SKU's headline, its confidence, and its series. */
function SkuHistory({
  sku,
  history,
}: {
  sku: SealedProductOut;
  history: SealedPriceHistory | null;
}) {
  const config = [
    countOf(sku.cards_per_pack, "card", "pack"),
    countOf(sku.packs_per_box, "pack", "box"),
    countOf(sku.boxes_per_case, "box", "case"),
  ].filter(Boolean);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">
            {formatLabel(sku.format)}
          </p>
          {config.length ? (
            <p className="mt-0.5 text-xs text-slate-500">{config.join(" · ")}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold text-sky-300">
            {sku.price_median ? formatCurrency(sku.price_median) : "—"}
          </p>
          {sku.price_median ? (
            <PriceConfidenceBadge
              sampleSize={sku.sample_size}
              lowConfidence={sku.low_confidence}
            />
          ) : (
            <p className="text-xs text-slate-500">no recorded sales</p>
          )}
        </div>
      </div>

      {history ? (
        // The chart prints its own date range and latest price; adding them here again is how the
        // footer ended up saying "Aug 19, 2026 – Aug 24, 2026" twice.
        <PriceHistoryChart
          points={history.points}
          label={`${formatLabel(sku.format)} price`}
          startDate={history.start_date}
          endDate={history.end_date}
        />
      ) : (
        <Sheen loading label="Loading price history">
          <SheenBar className="h-[210px] w-full rounded-xl" />
        </Sheen>
      )}
    </div>
  );
}

/**
 * The sales behind a sealed price — the same receipts the card page shows under Sales.
 *
 * A sealed FMV is a trimmed median of these, and a box price is the number people are most likely
 * to argue with, so the individual sales have to be readable: date, price, marketplace, and the
 * listing title it was matched from. The title is what lets someone catch a bad match themselves
 * rather than take the median on faith.
 */
function SealedSales({
  sku,
  market,
}: {
  sku: SealedProductOut;
  market: SealedMarket | null;
}) {
  if (!market) {
    return (
      <Sheen loading label="Loading sales">
        <SheenBar className="h-4 w-48" />
        <SheenBar className="mt-4 h-64 w-full rounded-xl" />
      </Sheen>
    );
  }

  if (!market.comps.length) {
    return (
      <EmptyNote>
        No recorded sales for this {formatLabel(sku.format).toLowerCase()} yet. Sealed sales are
        harvested per SKU, so a format can be catalogued before anything of it has sold.
      </EmptyNote>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        {market.total_comps.toLocaleString()} recorded{" "}
        {market.total_comps === 1 ? "sale" : "sales"} · showing {market.comps.length}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Price</th>
              <th className="px-3 py-2 font-medium">Marketplace</th>
              <th className="px-3 py-2 font-medium">Sale type</th>
              <th className="px-3 py-2 font-medium">Listing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {market.comps.map((comp: CompOut, index: number) => (
              <tr key={`${comp.sold_date ?? "unknown"}-${index}`}>
                <td className="px-3 py-2 text-slate-400">{comp.sold_date ?? "—"}</td>
                <td className="px-3 py-2 font-mono tabular-nums text-white">
                  {formatCurrency(comp.sale_price)}
                </td>
                <td className="px-3 py-2 text-slate-400">{comp.marketplace}</td>
                <td className="px-3 py-2 text-slate-400">
                  {comp.sale_type ? comp.sale_type.replace(/_/g, " ") : "—"}
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
  );
}

function TopCards({ cards }: { cards: SetDetailResult["topCards"]["cards"] }) {
  return (
    <ol className="space-y-2">
      {cards.map((card, index) => (
        <li key={card.card_uuid}>
          <Link
            href={`/cards/${card.card_uuid}`}
            className="pressable flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5 hover:border-[var(--border-bright)]"
          >
            <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-500">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {card.subjects.join(", ")} · {card.card_number}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {[card.subset, card.finish, card.print_run ? `/${card.print_run}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm tabular-nums text-white">
                {formatCurrency(card.market?.fair_market_value)}
              </span>
              {card.market?.grade_key ? (
                <span className="block text-[11px] text-slate-500">
                  {card.market.grade_key}
                </span>
              ) : null}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function LoadingSet() {
  return (
    <div className="space-y-6">
      <Sheen loading label="Loading product">
        <SheenBar className="h-4 w-32" />
        <SheenBar className="mt-3 h-9 w-96 max-w-full" />
        <SheenBar className="mt-3 h-5 w-64 max-w-full" />
      </Sheen>
      <Sheen loading label="Loading sealed products">
        <SheenBar className="h-4 w-24" />
        <SheenBar className="mt-2 h-[3.75rem] w-full rounded-lg" />
      </Sheen>
    </div>
  );
}
