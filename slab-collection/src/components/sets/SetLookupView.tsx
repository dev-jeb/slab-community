"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import {
  EmptyResults,
  ResultsSkeleton,
  SearchToolbar,
  SortSelect,
} from "@/components/search/SearchToolbar";
import { SetsCatalogTable } from "@/components/sets/SetsCatalogTable";
import { setSearchText } from "@/lib/set-label";
import { readUrlParam, writeUrlParams } from "@/lib/url-state";
import {
  sortCatalogSets,
  type SetLookupSort,
} from "@/lib/set-lookup-sort";
import {
  diffNewSets,
  loadSetsSnapshot,
} from "@/lib/slab-news-snapshot";
import type { SetOut } from "@/lib/slab/types";

const SORT_OPTIONS: { value: SetLookupSort; label: string }[] = [
  { value: "year_desc", label: "Year (newest)" },
  { value: "year_asc", label: "Year (oldest)" },
  { value: "cards_desc", label: "Most cards" },
  { value: "priced_desc", label: "Most priced cards" },
  { value: "pct_priced_desc", label: "% Priced" },
];

export function SetLookupView() {
  // Query and sort seed from the URL and are written back below — same contract as the two card
  // scopes, so a filtered product list survives refresh and can be pasted to someone else.
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<SetOut[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [setSort, setSetSort] = useState<SetLookupSort>(
    () =>
      readUrlParam(searchParams, "sort", [
        "year_desc",
        "year_asc",
        "cards_desc",
        "priced_desc",
        "pct_priced_desc",
      ] as const) ?? "year_desc",
  );

  useEffect(() => {
    writeUrlParams({
      q: query || null,
      sort: setSort === "year_desc" ? null : setSort,
    });
  }, [query, setSort]);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/sets");

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load sets");
        return;
      }

      const data = (await response.json()) as { sets: SetOut[] };
      setSets(data.sets);
    });
  }, []);

  const filteredSets = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const matched = trimmed
      ? sets.filter((set) => setSearchText(set).includes(trimmed))
      : sets;
    return sortCatalogSets(matched, setSort);
  }, [sets, query, setSort]);

  const newSetUuids = useMemo(() => {
    const snapshot = loadSetsSnapshot();
    if (!snapshot) return new Set<string>();
    return new Set(diffNewSets(sets, snapshot).map((set) => set.uuid));
  }, [sets]);

  if (needsSetup) return <SetupPrompt />;

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {/* The same band the card scopes wear. A product has no autos, no rookies and no grid view,
          so those slots go unfilled — the geometry that remains is identical. Typing filters as you
          go here (the whole list is already in the browser); the button is the same affordance in
          the same place for when you'd rather press it. */}
      <SearchToolbar
        query={query}
        onQueryChange={setQuery}
        onSubmit={() => undefined}
        placeholder="Search products — name, brand, season…"
        isPending={isPending}
        sort={
          <SortSelect
            value={setSort}
            onChange={setSetSort}
            options={SORT_OPTIONS}
          />
        }
      />

      {isPending && !sets.length ? (
        <ResultsSkeleton />
      ) : filteredSets.length ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <SetsCatalogTable sets={filteredSets} newSetUuids={newSetUuids} />
        </section>
      ) : (
        <EmptyResults>No products match this search.</EmptyResults>
      )}
    </div>
  );
}
