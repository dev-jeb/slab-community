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
import { SetRow } from "@/components/sets/SetRow";
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
  { value: "release_desc", label: "Newest release" },
  { value: "release_asc", label: "Oldest release" },
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
        "release_desc",
        "release_asc",
        "cards_desc",
        "priced_desc",
        "pct_priced_desc",
      ] as const) ?? "release_desc",
  );

  useEffect(() => {
    writeUrlParams({
      q: query || null,
      sort: setSort === "release_desc" ? null : setSort,
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
        // A plain stack, not a bordered card around a table: each row is already a surface, and
        // wrapping a hundred of them in one more panel just draws a box around the page.
        <div className="space-y-3">
          {filteredSets.map((set) => (
            <SetRow key={set.uuid} set={set} isNew={newSetUuids.has(set.uuid)} />
          ))}
        </div>
      ) : (
        <EmptyResults>No products match this search.</EmptyResults>
      )}
    </div>
  );
}
