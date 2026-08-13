"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { PlayerLookupView } from "@/components/player-lookup/PlayerLookupView";
import { SetLookupView } from "@/components/sets/SetLookupView";

type BrowseTab = "players" | "sets";

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: BrowseTab =
    searchParams.get("tab") === "sets" ? "sets" : "players";

  const setTab = useCallback(
    (nextTab: BrowseTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "players") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `/browse?${query}` : "/browse");
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-400">
          Research Slab&apos;s catalog — search by player or browse imported product
          sets.
        </p>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          <TabButton
            active={tab === "players"}
            onClick={() => setTab("players")}
            label="Search players"
          />
          <TabButton
            active={tab === "sets"}
            onClick={() => setTab("sets")}
            label="Browse sets"
          />
        </div>
      </div>

      {tab === "sets" ? <SetLookupView embedded /> : <PlayerLookupView embedded />}
    </div>
  );
}

export function BrowseView() {
  return (
    <Suspense
      fallback={
        <div className="h-48 animate-pulse rounded-xl bg-slate-900" />
      }
    >
      <BrowseContent />
    </Suspense>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-sky-600 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
