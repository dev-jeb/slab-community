"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchJson } from "@/lib/slab/fetch-json";
import {
  NEWS_COMP_BATCH_MAX,
  type NewsPayload,
  type OwnedCardNews,
} from "@/lib/slab-news";
import {
  diffCompAlerts,
  diffNewSets,
  ensureCompsSnapshotIncludes,
  hasNewsBaseline,
  loadCompsSnapshot,
  loadSetsSnapshot,
  saveAllSnapshots,
  saveCompsSnapshot,
  saveSetsSnapshot,
  type CompAlert,
} from "@/lib/slab-news-snapshot";
import type { SetOut } from "@/lib/slab/types";

interface NewsContextValue {
  payload: NewsPayload | null;
  isLoading: boolean;
  isLoadingComps: boolean;
  compsLoaded: number;
  compsTotal: number;
  error: string | null;
  needsSetup: boolean;
  hasBaseline: boolean;
  alertCount: number;
  newSets: SetOut[];
  compAlerts: CompAlert[];
  markAllSeen: () => void;
  refresh: () => Promise<void>;
}

const NewsContext = createContext<NewsContextValue | null>(null);

export function NewsProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<NewsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComps, setIsLoadingComps] = useState(false);
  const [compsLoaded, setCompsLoaded] = useState(0);
  const [compsTotal, setCompsTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const compsGeneration = useRef(0);

  const finishCompsBaseline = useCallback((ownedCards: OwnedCardNews[]) => {
    if (!loadCompsSnapshot()) {
      saveCompsSnapshot(ownedCards);
    } else {
      ensureCompsSnapshotIncludes(ownedCards);
    }
    setHasBaseline(hasNewsBaseline());
    setSnapshotVersion((version) => version + 1);
  }, []);

  const hydrateComps = useCallback(
    async (ownedCards: OwnedCardNews[]) => {
      const generation = ++compsGeneration.current;
      const total = ownedCards.length;
      setCompsTotal(total);
      setCompsLoaded(0);

      if (total === 0) {
        finishCompsBaseline(ownedCards);
        setIsLoadingComps(false);
        return;
      }

      setIsLoadingComps(true);
      const merged = new Map(
        ownedCards.map((card) => [card.cardUuid, card] as const),
      );

      for (let offset = 0; offset < total; offset += NEWS_COMP_BATCH_MAX) {
        if (generation !== compsGeneration.current) return;

        const slice = ownedCards
          .slice(offset, offset + NEWS_COMP_BATCH_MAX)
          .map((card) => card.cardUuid);

        const result = await fetchJson<{
          comps?: Record<string, OwnedCardNews["comps"]>;
        }>(
          "/api/news/comps",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cardUuids: slice }),
          },
          "Some comp checks failed. Alerts may be incomplete.",
        );

        if (generation !== compsGeneration.current) return;

        if (result.status === "setup") {
          setNeedsSetup(true);
          setIsLoadingComps(false);
          return;
        }

        if (result.status === "error") {
          setError(result.message);
        } else {
          for (const [cardUuid, comps] of Object.entries(result.data.comps ?? {})) {
            const current = merged.get(cardUuid);
            if (current) merged.set(cardUuid, { ...current, comps });
          }

          const nextCards = ownedCards.map(
            (card) => merged.get(card.cardUuid) ?? card,
          );
          setPayload((previous) =>
            previous ? { ...previous, ownedCards: nextCards } : previous,
          );
        }

        setCompsLoaded(Math.min(offset + slice.length, total));
      }

      if (generation !== compsGeneration.current) return;

      const finalCards = ownedCards.map(
        (card) => merged.get(card.cardUuid) ?? card,
      );
      finishCompsBaseline(finalCards);
      setIsLoadingComps(false);
    },
    [finishCompsBaseline],
  );

  const refresh = useCallback(async () => {
    compsGeneration.current += 1;
    // One microtask of air so the mount effect never sets state synchronously in its own commit
    // (the resets still land before paint; manual refreshes are unaffected).
    await Promise.resolve();
    setIsLoading(true);
    setIsLoadingComps(false);
    setError(null);
    setCompsLoaded(0);
    setCompsTotal(0);

    try {
      const result = await fetchJson<NewsPayload>(
        "/api/news",
        undefined,
        "Alerts timed out loading catalog news. Try again.",
      );

      if (result.status === "setup") {
        setNeedsSetup(true);
        setPayload(null);
        return;
      }

      if (result.status === "error") {
        setNeedsSetup(false);
        setError(result.message);
        return;
      }

      const payload = result.data;
      setPayload(payload);
      setNeedsSetup(false);

      if (!loadSetsSnapshot()) {
        saveSetsSnapshot(payload.sets);
      }
      setHasBaseline(hasNewsBaseline());
      setIsLoading(false);

      await hydrateComps(payload.ownedCards);
    } catch {
      // fetchJson never throws; this covers the snapshot writes (a full localStorage quota).
      setError("Failed to load Slab News");
    } finally {
      setIsLoading(false);
    }
  }, [hydrateComps]);

  useEffect(() => {
    // refresh() awaits a microtask before its first setState, so nothing here sets state inside
    // the effect's own commit — the rule is static and can't see through the call + await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => {
      compsGeneration.current += 1;
    };
  }, [refresh]);

  // `snapshotVersion` is the dependency that matters and the one the rule can't see: the baseline
  // these diff against lives in localStorage, so marking alerts seen changes the answer without
  // changing any value in this closure. It bumps that counter; these recompute.
  const newSets = useMemo(() => {
    if (!payload || !hasBaseline) return [];
    return diffNewSets(payload.sets, loadSetsSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, hasBaseline, snapshotVersion]);

  const compAlerts = useMemo(() => {
    if (!payload || !hasBaseline) return [];
    return diffCompAlerts(payload.ownedCards, loadCompsSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, hasBaseline, snapshotVersion]);

  const alertCount = useMemo(() => {
    if (!payload || !hasBaseline) return 0;
    return newSets.length + compAlerts.length;
  }, [payload, hasBaseline, newSets.length, compAlerts.length]);

  const markAllSeen = useCallback(() => {
    if (!payload || isLoadingComps) return;
    saveAllSnapshots(payload);
    setHasBaseline(true);
    setSnapshotVersion((version) => version + 1);
  }, [payload, isLoadingComps]);

  const value = useMemo(
    () => ({
      payload,
      isLoading,
      isLoadingComps,
      compsLoaded,
      compsTotal,
      error,
      needsSetup,
      hasBaseline,
      alertCount,
      newSets,
      compAlerts,
      markAllSeen,
      refresh,
    }),
    [
      payload,
      isLoading,
      isLoadingComps,
      compsLoaded,
      compsTotal,
      error,
      needsSetup,
      hasBaseline,
      alertCount,
      newSets,
      compAlerts,
      markAllSeen,
      refresh,
    ],
  );

  return <NewsContext.Provider value={value}>{children}</NewsContext.Provider>;
}

export function useNews(): NewsContextValue {
  const context = useContext(NewsContext);
  if (!context) {
    throw new Error("useNews must be used within NewsProvider");
  }
  return context;
}
