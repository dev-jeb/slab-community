"use client";

import { useEffect, useRef, useState } from "react";

import { COLLECTION_PAGE_SIZE } from "@/lib/collection-paging";
import type { CardCopyOut, CollectionResult } from "@/lib/slab/types";
import { fetchJson } from "@/lib/slab/fetch-json";

/**
 * Fetch a single group's copies, on expand.
 *
 * Grouped views used to ask for every group's copies with the list — `include_copies: true` — even
 * though the copies are only rendered when someone opens a group. On a real collection that cost
 * 9.3s for sets and 6.9s for teams, against 0.74s for the same lists without them. The copies were
 * paid for on every switch and read on almost none of them.
 *
 * So the list is headers-only and this fills a group in when it's opened. Each group is reachable
 * through the ordinary collection filters — a set by `set_slug`, a team by `team` — which is why
 * no new endpoint is needed: an expanded group is just a filtered collection.
 *
 * Results are cached per group for the life of the view, so reopening one is instant and toggling
 * doesn't re-fetch.
 *
 * Pages at the collection page size (48) rather than `all=true`. That path asked Slab for 200 rows
 * even when the set had two dozen cards, and a 200-row collection search is several times slower
 * than the same filter at 48.
 */
async function fetchGroupCopies(filterQuery: string): Promise<CardCopyOut[]> {
  const firstResult = await fetchJson<CollectionResult>(
    `/api/collection?limit=${COLLECTION_PAGE_SIZE}&offset=0&${filterQuery}`,
  );
  if (firstResult.status !== "ok") return [];

  const first = firstResult.data;
  const copies: CardCopyOut[] = [...(first.items ?? [])];
  const total = first.total ?? copies.length;

  if (copies.length >= total) return copies;

  const offsets: number[] = [];
  for (
    let offset = COLLECTION_PAGE_SIZE;
    offset < total;
    offset += COLLECTION_PAGE_SIZE
  ) {
    offsets.push(offset);
  }

  const pages = await Promise.all(
    offsets.map(async (offset) => {
      const result = await fetchJson<CollectionResult>(
        `/api/collection?limit=${COLLECTION_PAGE_SIZE}&offset=${offset}&${filterQuery}`,
      );
      if (result.status !== "ok") return [] as CardCopyOut[];
      return result.data.items ?? [];
    }),
  );

  for (const items of pages) copies.push(...items);
  return copies;
}

export function useGroupCopies(
  /** Query params identifying the group, or null when nothing is expanded. */
  params: Record<string, string> | null,
) {
  const [cache, setCache] = useState<Record<string, CardCopyOut[]>>({});

  const key = params ? new URLSearchParams(params).toString() : null;

  useEffect(() => {
    if (!key || cache[key]) return;

    let cancelled = false;

    fetchGroupCopies(key)
      .then((copies) => {
        if (cancelled) return;
        setCache((current) => ({ ...current, [key]: copies }));
      })
      .catch(() => {
        if (!cancelled) setCache((current) => ({ ...current, [key]: [] }));
      });

    return () => {
      cancelled = true;
    };
    // `cache` is deliberately absent: including it would re-run the effect on every fill and
    // re-fetch forever. The cache check above is the guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Loading is not tracked, it's derived: an expanded key with no cache entry IS the in-flight
  // state. The tracked flag was a second copy of that fact, set synchronously inside the effect.
  return {
    copies: key ? cache[key] : undefined,
    loading: Boolean(key) && !cache[key!],
    cache,
  };
}

const PRICED_SHARE_CONCURRENCY = 4;

/**
 * % priced for set banners, without loading every copy.
 *
 * The grouped set list has value and counts but no coverage. A 1-row collection search still
 * returns `summary.priced_copies` for that set, which is enough to fill the column.
 */
export function useSetPricedShares(slugs: string[]): Record<string, number | null> {
  const [shares, setShares] = useState<Record<string, number | null>>({});
  const seen = useRef(new Set<string>());
  const slugKey = slugs.filter(Boolean).join("|");

  useEffect(() => {
    // Read the ref once, into a local the cleanup closes over. The set is created on first render
    // and never replaced, so this is the same object either way — but the effect and its cleanup
    // are now provably talking about the same one, which is what the hooks rule is asking for.
    const inFlight = seen.current;
    const missing = slugKey ? slugKey.split("|").filter((slug) => !inFlight.has(slug)) : [];
    if (!missing.length) return;

    for (const slug of missing) inFlight.add(slug);
    let cancelled = false;

    void (async () => {
      for (let i = 0; i < missing.length; i += PRICED_SHARE_CONCURRENCY) {
        const chunk = missing.slice(i, i + PRICED_SHARE_CONCURRENCY);
        const entries = await Promise.all(
          chunk.map(async (slug) => {
            const result = await fetchJson<CollectionResult>(
              `/api/collection?limit=1&offset=0&set_slug=${encodeURIComponent(slug)}`,
            );
            if (result.status !== "ok") return [slug, null] as const;
            const priced = result.data.summary?.priced_copies;
            const total = result.data.total ?? 0;
            if (priced == null || total <= 0) return [slug, null] as const;
            return [slug, priced / total] as const;
          }),
        );
        if (cancelled) return;
        setShares((current) => ({ ...current, ...Object.fromEntries(entries) }));
      }
    })();

    return () => {
      cancelled = true;
      for (const slug of missing) inFlight.delete(slug);
    };
  }, [slugKey]);

  return shares;
}
