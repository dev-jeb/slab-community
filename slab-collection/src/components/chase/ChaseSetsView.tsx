"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { CollectionChaseSets } from "@/components/collection/CollectionChaseSets";
import { CommunityChaseSetsView } from "@/components/sets/CommunityChaseSetsView";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Sheen, SheenBar } from "@/components/ui/sheen";

type ChaseTab = "mine" | "discover";

function ChaseSetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: ChaseTab =
    searchParams.get("tab") === "discover" ? "discover" : "mine";
  // undefined until the list loads, so the tab sheens instead of claiming zero sets.
  const [mySetCount, setMySetCount] = useState<number | undefined>(undefined);

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
        <SegmentedTabs
          tabs={[
            {
              id: "mine",
              label: "My sets",
              hint: "Sets you created or subscribed to",
              showCount: true,
              count: mySetCount,
            },
            {
              id: "discover",
              label: "Discover",
              hint: "Public sets from other collectors",
            },
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="Chase set list"
        />
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
        <Sheen loading label="Loading chase sets" className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SheenBar key={index} className="h-20 w-full rounded-xl" />
          ))}
        </Sheen>
      }
    >
      <ChaseSetsContent />
    </Suspense>
  );
}
