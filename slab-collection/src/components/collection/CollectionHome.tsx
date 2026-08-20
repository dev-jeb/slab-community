"use client";

import { useRouter } from "next/navigation";

import { CollectionOverview } from "@/components/collection/CollectionOverview";
import { GradingDeskView } from "@/components/grading/GradingDeskView";
import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";

export type CollectionHomeView = "overview" | "grading";

/**
 * My Collection's two views: Overview reports on the cards you own, the Grading Desk asks what
 * to do with the raw ones. The desk was a top-level nav tab, but it reads the same collection the
 * dashboard does — every page under this roof is about your cards — so it lives here now, the way
 * Portfolio did before it.
 *
 * The active view sits in the URL (`/?view=grading`) rather than local state so the desk is
 * linkable and survives a reload; /grading redirects there for old bookmarks.
 */
const tabs: SegmentedTab<CollectionHomeView>[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "Value, cost basis, and what's in the collection",
  },
  {
    id: "grading",
    label: "Grading Desk",
    hint: "Which of your raw cards are worth grading",
  },
];

export function CollectionHome({ view }: { view: CollectionHomeView }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <SegmentedTabs
        tabs={tabs}
        value={view}
        ariaLabel="My Collection view"
        onChange={(id) =>
          router.push(id === "grading" ? "/?view=grading" : "/", { scroll: false })
        }
      />
      {view === "grading" ? <GradingDeskView /> : <CollectionOverview />}
    </div>
  );
}
