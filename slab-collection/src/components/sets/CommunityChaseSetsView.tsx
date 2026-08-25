"use client";

import Link from "next/link";
import { Sheen, SheenBar } from "@/components/ui/sheen";
import { useCallback, useEffect, useState, useTransition } from "react";

import { cardSubtitle, cardTitle } from "@/lib/slab/format";
import type { CustomSetDetail, CustomSetOut } from "@/lib/slab/types";
import { CompletionMeter } from "@/components/ui/CompletionMeter";
import { failureMessage, fetchJson } from "@/lib/slab/fetch-json";

function setTypeLabel(setType: string): string {
  return setType === "dynamic" ? "Master (dynamic)" : "Roster (curated)";
}

function CommunitySetDetail({ setUuid }: { setUuid: string }) {
  const [detail, setDetail] = useState<CustomSetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const result = await fetchJson<CustomSetDetail>(
        `/api/chase/${setUuid}`,
        undefined,
        "Failed to load set",
      );
      if (result.status !== "ok") {
        setError(failureMessage(result));
        return;
      }
      setDetail(result.data);
    });
  }, [setUuid]);

  if (isPending && !detail) {
    return (
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <Sheen loading label="Loading set">
          <SheenBar className="h-16 w-full rounded" />
        </Sheen>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!detail) return null;

  const completion = detail.completion;
  const sampleCards = detail.cards.slice(0, 8);

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      {completion ? (
        <CompletionMeter
          label="Your completion"
          pct={completion.completion_pct}
          ownedCards={completion.owned_cards}
          totalCards={completion.total_cards}
          size="md"
        />
      ) : (
        <p className="text-sm text-slate-400">
          Subscribe to track your completion against this set.
        </p>
      )}

      {sampleCards.length > 0 ? (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-500">
            Sample cards
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {sampleCards.map((entry) => (
              <li key={entry.uuid} className="flex items-center gap-2">
                <span
                  className={
                    entry.owned ? "text-emerald-400" : "text-slate-600"
                  }
                >
                  {entry.owned ? "✓" : "○"}
                </span>
                <span>
                  {cardTitle(entry.card)}
                  {cardSubtitle(entry.card) ? (
                    <span className="text-slate-400">
                      {" "}
                      · {cardSubtitle(entry.card)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          {detail.cards.length > sampleCards.length ? (
            <p className="mt-2 text-xs text-slate-500">
              + {detail.cards.length - sampleCards.length} more cards
            </p>
          ) : null}
        </div>
      ) : null}

      {detail.is_subscribed ? (
        <p className="text-sm text-slate-400">
          Tracking in{" "}
          <Link href="/chase" className="text-sky-400 hover:underline">
            Chase Sets
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

function CommunitySetRow({
  set,
  expanded,
  onToggle,
  onSubscribeChange,
}: {
  set: CustomSetOut;
  expanded: boolean;
  onToggle: () => void;
  onSubscribeChange: (setUuid: string, subscribed: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleSubscribe() {
    setBusy(true);
    setError(null);
    const method = set.is_subscribed ? "DELETE" : "POST";

    try {
      const result = await fetchJson<unknown>(
        `/api/chase/${set.uuid}/subscribe`,
        { method },
        "Subscribe failed",
      );

      if (result.status !== "ok") {
        setError(failureMessage(result));
        return;
      }

      onSubscribeChange(set.uuid, !set.is_subscribed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{set.name}</h3>
            {set.is_subscribed ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Subscribed
              </span>
            ) : null}
          </div>
          {set.description ? (
            <p className="mt-1 text-sm text-slate-400">{set.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            {setTypeLabel(set.set_type)}
            {set.creator_name ? ` · by ${set.creator_name}` : ""}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right text-sm">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Cards
            </p>
            <p className="font-semibold text-white">{set.card_count}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Subscribers
            </p>
            <p className="font-semibold text-white">{set.subscriber_count}</p>
          </div>
          <button
            type="button"
            onClick={() => void toggleSubscribe()}
            disabled={busy}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
              set.is_subscribed
                ? "border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600"
                : "bg-sky-600 text-white hover:bg-sky-500"
            }`}
          >
            {busy
              ? "…"
              : set.is_subscribed
                ? "Unsubscribe"
                : "Subscribe"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-300">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        className="mt-3 text-xs text-sky-400 hover:underline"
      >
        {expanded ? "Hide details" : "Preview set"}
      </button>

      {expanded ? <CommunitySetDetail setUuid={set.uuid} /> : null}
    </article>
  );
}

export function CommunityChaseSetsView() {
  const [sets, setSets] = useState<CustomSetOut[]>([]);
  const [query, setQuery] = useState("");
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadSets = useCallback((search?: string) => {
    startTransition(async () => {
      setError(null);
      const trimmed = search?.trim();
      const endpoint = trimmed
        ? `/api/chase/discover?q=${encodeURIComponent(trimmed)}`
        : "/api/chase/community";

      const result = await fetchJson<{ sets: CustomSetOut[] }>(
        endpoint,
        undefined,
        "Failed to load community sets",
      );
      if (result.status !== "ok") {
        setError(failureMessage(result));
        return;
      }

      setSets(result.data.sets);
    });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      loadSets();
      return;
    }

    const timer = window.setTimeout(() => {
      loadSets(trimmed);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, loadSets]);

  function handleSubscribeChange(setUuid: string, subscribed: boolean) {
    setSets((current) =>
      current.map((set) => {
        if (set.uuid !== setUuid) return set;
        return {
          ...set,
          is_subscribed: subscribed,
          subscriber_count: Math.max(
            0,
            set.subscriber_count + (subscribed ? 1 : -1),
          ),
        };
      }),
    );
  }

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          Public chase sets from collectors on Slab. Subscribe to track your
          completion — subscribed sets appear in{" "}
          <Link href="/chase" className="text-sky-400 hover:underline">
            Chase Sets
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search community sets by name…"
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
        />
        <span className="text-sm text-slate-400">
          {sets.length} set{sets.length === 1 ? "" : "s"}
          {isSearching ? " found" : " · sorted by subscribers"}
        </span>
      </div>

      {isPending && !sets.length ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="sheen h-28 rounded-xl border border-slate-800 bg-slate-900/40"
            />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
          {isSearching
            ? "No public chase sets matched that search."
            : "No popular community sets yet. Check back soon, or create a public set with the chase wizard."}
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
            {isSearching ? "Search results" : "Top community sets"}
          </h2>
          {sets.map((set) => (
            <CommunitySetRow
              key={set.uuid}
              set={set}
              expanded={expandedUuid === set.uuid}
              onToggle={() =>
                setExpandedUuid((current) =>
                  current === set.uuid ? null : set.uuid,
                )
              }
              onSubscribeChange={handleSubscribeChange}
            />
          ))}
        </section>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
