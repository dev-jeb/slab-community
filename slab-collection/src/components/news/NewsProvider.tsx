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

import { formatApiDetail, isMissingApiKeyError } from "@/lib/api-errors";
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

        try {
          const response = await fetch("/api/news/comps", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cardUuids: slice }),
          });
          const body = (await response.json().catch(() => ({}))) as {
            comps?: Record<string, OwnedCardNews["comps"]>;
            detail?: unknown;
          };

          if (generation !== compsGeneration.current) return;

          if (isMissingApiKeyError(response.status, body.detail)) {
            setNeedsSetup(true);
            setIsLoadingComps(false);
            return;
          }

          if (!response.ok) {
            setError(
              formatApiDetail(
                body.detail,
                "Some comp checks failed. Alerts may be incomplete.",
              ),
            );
          } else {
            for (const [cardUuid, comps] of Object.entries(body.comps ?? {})) {
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
        } catch {
          if (generation !== compsGeneration.current) return;
          setError("Some comp checks failed. Alerts may be incomplete.");
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
    setIsLoading(true);
    setIsLoadingComps(false);
    setError(null);
    setCompsLoaded(0);
    setCompsTotal(0);

    try {
      const response = await fetch("/api/news");
      const body = (await response.json().catch(() => ({}))) as NewsPayload & {
        detail?: unknown;
      };

      if (isMissingApiKeyError(response.status, body.detail)) {
        setNeedsSetup(true);
        setPayload(null);
        return;
      }

      if (!response.ok) {
        setNeedsSetup(false);
        setError(
          formatApiDetail(
            body.detail,
            "Alerts timed out loading catalog news. Try again.",
          ),
        );
        return;
      }

      setPayload(body);
      setNeedsSetup(false);

      if (!loadSetsSnapshot()) {
        saveSetsSnapshot(body.sets);
      }
      setHasBaseline(hasNewsBaseline());
      setIsLoading(false);

      await hydrateComps(body.ownedCards);
    } catch {
      setError("Failed to load Slab News");
    } finally {
      setIsLoading(false);
    }
  }, [hydrateComps]);

  useEffect(() => {
    void refresh();
    return () => {
      compsGeneration.current += 1;
    };
  }, [refresh]);

  const newSets = useMemo(() => {
    if (!payload || !hasBaseline) return [];
    return diffNewSets(payload.sets, loadSetsSnapshot());
  }, [payload, hasBaseline, snapshotVersion]);

  const compAlerts = useMemo(() => {
    if (!payload || !hasBaseline) return [];
    return diffCompAlerts(payload.ownedCards, loadCompsSnapshot());
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
