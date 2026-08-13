"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { CollectionChaseSets } from "@/components/collection/CollectionChaseSets";
import { CommunityChaseSetsView } from "@/components/sets/CommunityChaseSetsView";

type ChaseTab = "mine" | "discover";

function ChaseSetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: ChaseTab =
    searchParams.get("tab") === "discover" ? "discover" : "mine";
  const [mySetCount, setMySetCount] = useState(0);

  const setTab = useCallback(
    (nextTab: ChaseTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "mine") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      router.replace(query ? `/chase?${query}` : "/chase");
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="text-sm text-slate-400">
          {tab === "mine"
            ? "Create and track custom chase sets against your collection."
            : "Discover public chase sets from other collectors and subscribe to track completion."}
        </p>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
          <TabButton
            active={tab === "mine"}
            onClick={() => setTab("mine")}
            label={`My sets${mySetCount ? ` (${mySetCount})` : ""}`}
          />
          <TabButton
            active={tab === "discover"}
            onClick={() => setTab("discover")}
            label="Discover"
          />
        </div>
      </div>

      {tab === "discover" ? (
        <CommunityChaseSetsView />
      ) : (
        <CollectionChaseSets onCountChange={setMySetCount} />
      )}
    </div>
  );
}

export function ChaseSetsView() {
  return (
    <Suspense
      fallback={
        <div className="h-48 animate-pulse rounded-xl bg-slate-900" />
      }
    >
      <ChaseSetsContent />
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
