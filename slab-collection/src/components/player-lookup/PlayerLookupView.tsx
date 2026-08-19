"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { confidenceScore } from "@/lib/slab/confidence";
import { cardSubtitle, cardTitle, formatCurrency } from "@/lib/slab/format";
import type {
  GradedPriceSummary,
  PlayerLookupResult,
  PlayerVariant,
  RawPriceSummary,
} from "@/lib/player-lookup";

type CardTypeFilter = "all" | "auto" | "rookie" | "numbered";
type SortMode = "price-desc" | "price-asc" | "confidence-desc" | "set";
type VariantFolder = "raw" | "graded" | "comps";

function variantHeadlinePrice(variant: PlayerVariant): number | null {
  const value =
    variant.raw?.median ?? variant.card.market?.fair_market_value ?? null;
  if (!value) return null;
  const num = Number(value);
  return Number.isNaN(num) || num <= 0 ? null : num;
}

function sortVariantsByPrice(
  variants: PlayerVariant[],
  direction: "desc" | "asc",
): PlayerVariant[] {
  const priced: PlayerVariant[] = [];
  const unpriced: PlayerVariant[] = [];

  for (const variant of variants) {
    if (variantHeadlinePrice(variant) === null) {
      unpriced.push(variant);
    } else {
      priced.push(variant);
    }
  }

  priced.sort((a, b) => {
    const aPrice = variantHeadlinePrice(a) ?? 0;
    const bPrice = variantHeadlinePrice(b) ?? 0;
    return direction === "desc" ? bPrice - aPrice : aPrice - bPrice;
  });

  unpriced.sort((a, b) => {
    const setCompare = (a.card.set_name ?? "").localeCompare(
      b.card.set_name ?? "",
    );
    if (setCompare !== 0) return setCompare;
    return a.card.card_number.localeCompare(b.card.card_number, undefined, {
      numeric: true,
    });
  });

  return [...priced, ...unpriced];
}

function variantConfidenceSample(variant: PlayerVariant): {
  sampleSize: number;
  lowConfidence: boolean;
} {
  const sampleSize =
    variant.raw?.compTotal ||
    variant.raw?.sampleSize ||
    variant.card.market?.sample_size ||
    0;
  const lowConfidence =
    variant.raw?.lowConfidence ?? variant.card.market?.low_confidence ?? false;

  return { sampleSize, lowConfidence };
}

function sortVariantsByConfidence(variants: PlayerVariant[]): PlayerVariant[] {
  return [...variants].sort((a, b) => {
    const aConf = variantConfidenceSample(a);
    const bConf = variantConfidenceSample(b);
    const scoreDiff =
      confidenceScore(bConf.sampleSize, bConf.lowConfidence) -
      confidenceScore(aConf.sampleSize, aConf.lowConfidence);
    if (scoreDiff !== 0) return scoreDiff;

    const compDiff = bConf.sampleSize - aConf.sampleSize;
    if (compDiff !== 0) return compDiff;

    const setCompare = (a.card.set_name ?? "").localeCompare(
      b.card.set_name ?? "",
    );
    if (setCompare !== 0) return setCompare;

    return a.card.card_number.localeCompare(b.card.card_number, undefined, {
      numeric: true,
    });
  });
}

function groupVariantsBySet(
  variants: PlayerVariant[],
): [string, PlayerVariant[]][] {
  const groups = new Map<string, PlayerVariant[]>();

  for (const variant of variants) {
    const setName = variant.card.set_name ?? "Unknown set";
    const current = groups.get(setName) ?? [];
    current.push(variant);
    groups.set(setName, current);
  }

  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatRange(low?: string | null, high?: string | null): string {
  if (!low && !high) return "—";
  if (low && high) return `${formatCurrency(low)} – ${formatCurrency(high)}`;
  return formatCurrency(low ?? high);
}

function RawPricingStats({ raw }: { raw: RawPriceSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          FMV (median)
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {formatCurrency(raw.median)}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Comp average
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {formatCurrency(raw.average)}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Purchase range
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {formatRange(raw.low, raw.high)}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Comp sales range
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {formatRange(raw.compMin, raw.compMax)}
        </p>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <PriceConfidenceBadge
          sampleSize={raw.compTotal || raw.sampleSize}
          lowConfidence={raw.lowConfidence}
        />
      </div>
    </div>
  );
}

function GradedPricingTable({ graded }: { graded: GradedPriceSummary[] }) {
  if (graded.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800/80">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Grade</th>
            <th className="px-3 py-2 font-medium">Comps</th>
            <th className="px-3 py-2 font-medium">Median</th>
            <th className="px-3 py-2 font-medium">Range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {graded.map((point) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariantPick({
  variant,
  selected,
  onSelect,
}: {
  variant: PlayerVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  const { card, raw } = variant;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        selected
          ? "border-[#c4a574]/50 bg-[#1a2744] ring-1 ring-[#c4a574]/20"
          : "border-slate-800/80 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{cardTitle(card)}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{cardSubtitle(card)}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-sky-300">
        {formatCurrency(raw?.median ?? card.market?.fair_market_value)}
      </p>
    </button>
  );
}

function VariantFolder({ variant }: { variant: PlayerVariant }) {
  const [folder, setFolder] = useState<VariantFolder>("raw");
  const { card, raw, graded } = variant;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h4 className="font-medium text-white">{cardTitle(card)}</h4>
          <p className="mt-1 text-sm text-slate-400">{cardSubtitle(card)}</p>
          {card.odds ? (
            <p className="mt-1 text-xs text-slate-500">Odds: {card.odds}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Headline FMV
          </p>
          <p className="mt-1 text-lg font-semibold text-sky-300">
            {formatCurrency(raw?.median ?? card.market?.fair_market_value)}
          </p>
          <Link
            href={`/cards/${card.uuid}`}
            className="mt-2 inline-block text-sm text-sky-400 hover:text-sky-300"
          >
            Open card →
          </Link>
        </div>
      </div>

      <FolderTabs
        ariaLabel="Card pricing folders"
        tabs={[
          { id: "raw", label: "Raw" },
          { id: "graded", label: "Graded" },
          { id: "comps", label: "Sales" },
        ]}
        value={folder}
        onChange={setFolder}
      >
        {folder === "raw" ? (
          raw ? (
            <RawPricingStats raw={raw} />
          ) : (
            <p className="text-sm text-slate-500">
              No raw comps yet for this variant.
            </p>
          )
        ) : null}

        {folder === "graded" ? (
          graded.length > 0 ? (
            <GradedPricingTable graded={graded} />
          ) : (
            <p className="text-sm text-slate-500">
              No graded comps yet for this variant.
            </p>
          )
        ) : null}

        {folder === "comps" ? (
          raw && raw.recentComps.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Marketplace</th>
                    <th className="px-3 py-2 font-medium">Listing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {raw.recentComps.map((comp, index) => (
                    <tr key={`${comp.sold_date ?? "unknown"}-${index}`}>
                      <td className="px-3 py-2 text-slate-400">
                        {comp.sold_date ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-white">
                        {formatCurrency(comp.sale_price)}
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
              {raw.compTotal > raw.recentComps.length ? (
                <p className="px-3 py-2 text-xs text-slate-500">
                  Showing {raw.recentComps.length} of {raw.compTotal} sales
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No recent sales on file.</p>
          )
        ) : null}
      </FolderTabs>
    </div>
  );
}

export function PlayerLookupView({ embedded = false }: { embedded?: boolean }) {
  const [player, setPlayer] = useState("");
  const [cardQuery, setCardQuery] = useState("");
  const [cardType, setCardType] = useState<CardTypeFilter>("all");
  const [result, setResult] = useState<PlayerLookupResult | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("price-desc");
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  const sortedVariants = useMemo(() => {
    if (!result) return [];

    if (sortMode === "set") {
      return result.variants;
    }

    if (sortMode === "confidence-desc") {
      return sortVariantsByConfidence(result.variants);
    }

    return sortVariantsByPrice(
      result.variants,
      sortMode === "price-desc" ? "desc" : "asc",
    );
  }, [result, sortMode]);

  const groupedVariants = useMemo(() => {
    if (!result || sortMode !== "set") return [];
    return groupVariantsBySet(result.variants);
  }, [result, sortMode]);

  const selectedVariant =
    sortedVariants.find((variant) => variant.card.uuid === selectedUuid) ??
    sortedVariants[0] ??
    null;

  function runSearch() {
    if (!player.trim()) {
      setError("Enter a player name first.");
      return;
    }

    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/player-lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: player.trim(),
          q: cardQuery.trim() || undefined,
          auto: cardType === "auto" ? true : undefined,
          rookie: cardType === "rookie" ? true : undefined,
          is_numbered: cardType === "numbered" ? true : undefined,
        }),
      });

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Search failed");
        return;
      }

      const data = (await response.json()) as PlayerLookupResult;
      setResult(data);
      setSelectedUuid(data.variants[0]?.card.uuid ?? null);
    });
  }

  if (needsSetup) {
    return <SetupPrompt />;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        {!embedded ? (
          <>
            <h2 className="text-lg font-semibold text-white">Player lookup</h2>
            <p className="mt-1 text-sm text-slate-400">
              Search Slab&apos;s catalog for every variant of a player and compare
              comp counts, FMV, purchase ranges, and raw sale averages.
            </p>
          </>
        ) : (
          <h2 className="text-lg font-semibold text-white">Search players</h2>
        )}

        <div className={`grid gap-4 lg:grid-cols-2 ${embedded ? "mt-5" : "mt-5"}`}>
          <label className="block">
            <span className="text-sm text-slate-400">Player</span>
            <input
              value={player}
              onChange={(event) => setPlayer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              placeholder="Connor McDavid"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-400">
              Narrow cards (optional)
            </span>
            <input
              value={cardQuery}
              onChange={(event) => setCardQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runSearch();
              }}
              placeholder="Young Guns, Canvas, Auto..."
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none ring-sky-500/40 focus:ring"
            />
            <p className="mt-1 text-xs text-slate-500">
              Matches subset, parallel, set, card number, or attributes
            </p>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">Card type</span>
          {(
            [
              ["all", "All"],
              ["auto", "Autos"],
              ["rookie", "Rookies"],
              ["numbered", "Numbered"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCardType(value)}
              className={
                cardType === value
                  ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-sm text-sky-200"
                  : "rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
              }
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={runSearch}
          disabled={isPending}
          className="mt-5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Searching…" : "Look up player"}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      {result ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {result.subject}
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {result.variants.length} variant
                {result.variants.length === 1 ? "" : "s"} loaded
                {result.total > result.variants.length
                  ? ` of ${result.total} total`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-400">Sort</span>
              {(
                [
                  ["price-desc", "Price ↓"],
                  ["price-asc", "Price ↑"],
                  ["confidence-desc", "Best confidence"],
                  ["set", "By set"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortMode(value)}
                  className={
                    sortMode === value
                      ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-sm text-sky-200"
                      : "rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {result.truncated ? (
            <p className="text-sm text-amber-300">
              Showing the first {result.variants.length} variants. Narrow your
              search to see more.
            </p>
          ) : null}

          {sortedVariants.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
              No catalog variants found for that player
              {cardQuery.trim() ? ` matching “${cardQuery.trim()}”.` : "."}
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start">
              <nav
                aria-label="Card variants"
                className="max-h-[70vh] space-y-2 overflow-y-auto pr-1"
              >
                {sortMode === "set"
                  ? groupedVariants.map(([setName, variants]) => (
                      <div key={setName} className="space-y-2">
                        <p className="sticky top-0 z-[1] bg-[#0f1729]/95 px-1 py-1 text-xs font-medium uppercase tracking-wider text-slate-500">
                          {setName}
                        </p>
                        {variants.map((variant) => (
                          <VariantPick
                            key={variant.card.uuid}
                            variant={variant}
                            selected={selectedVariant?.card.uuid === variant.card.uuid}
                            onSelect={() => setSelectedUuid(variant.card.uuid)}
                          />
                        ))}
                      </div>
                    ))
                  : sortedVariants.map((variant) => (
                      <VariantPick
                        key={variant.card.uuid}
                        variant={variant}
                        selected={selectedVariant?.card.uuid === variant.card.uuid}
                        onSelect={() => setSelectedUuid(variant.card.uuid)}
                      />
                    ))}
              </nav>

              {selectedVariant ? (
                <VariantFolder
                  key={selectedVariant.card.uuid}
                  variant={selectedVariant}
                />
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
