"use client";

import { useEffect, useState } from "react";

import type { CardCopyOut, CollectionResult } from "@/lib/slab/types";

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
 */
export function useGroupCopies(
  /** Query params identifying the group, or null when nothing is expanded. */
  params: Record<string, string> | null,
) {
  const [cache, setCache] = useState<Record<string, CardCopyOut[]>>({});
  const [loading, setLoading] = useState(false);

  const key = params ? new URLSearchParams(params).toString() : null;

  useEffect(() => {
    if (!key || cache[key]) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/collection?all=true&${key}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CollectionResult | null) => {
        if (cancelled || !data) return;
        setCache((current) => ({ ...current, [key]: data.items ?? [] }));
      })
      .catch(() => {
        // An expanded group that fails to load shows as empty; the list itself is unaffected.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `cache` is deliberately absent: including it would re-run the effect on every fill and
    // re-fetch forever. The cache check above is the guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    copies: key ? cache[key] : undefined,
    loading: loading && Boolean(key) && !(key && cache[key]),
  };
}
