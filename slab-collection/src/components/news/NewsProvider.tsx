"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { NewsPayload } from "@/lib/slab-news";
import {
  diffCompAlerts,
  diffNewSets,
  hasNewsBaseline,
  loadCompsSnapshot,
  loadSetsSnapshot,
  saveAllSnapshots,
  type CompAlert,
} from "@/lib/slab-news-snapshot";
import type { SetOut } from "@/lib/slab/types";

interface NewsContextValue {
  payload: NewsPayload | null;
  isLoading: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasBaseline, setHasBaseline] = useState(false);
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/news");

      if (response.status === 503) {
        setNeedsSetup(true);
        setPayload(null);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load Slab News");
        return;
      }

      const data = (await response.json()) as NewsPayload;
      setPayload(data);
      setNeedsSetup(false);

      const baselineExists = hasNewsBaseline();
      setHasBaseline(baselineExists);

      if (!baselineExists) {
        saveAllSnapshots(data);
      }
    } catch {
      setError("Failed to load Slab News");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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
    if (!payload) return;
    saveAllSnapshots(payload);
    setHasBaseline(true);
    setSnapshotVersion((version) => version + 1);
  }, [payload]);

  const value = useMemo(
    () => ({
      payload,
      isLoading,
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
