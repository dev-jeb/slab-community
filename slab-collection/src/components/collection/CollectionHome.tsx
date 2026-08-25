"use client";

import { useRouter } from "next/navigation";

import { CollectionOverview } from "@/components/collection/CollectionOverview";
import { GradingDeskView } from "@/components/grading/GradingDeskView";
import { SalesView } from "@/components/sales/SalesView";
import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";

export type CollectionHomeView = "overview" | "grading" | "sales";

/**
 * My Collection's three views, all of them reading the same shelf: Overview reports on the cards
 * you own, the Grading Desk asks what to do with the raw ones, and Sales tracks the ones you've
 * listed or sold.
 *
 * Sales and the Grading Desk were both top-level nav tabs. Neither earned one: a card you've
 * listed is still a card in your collection, with a status, and managing it is the same act as
 * managing the rest of the shelf. A nav entry says "this is a different part of the product",
 * which sent people out of their collection to do something to their collection.
 *
 * The active view sits in the URL (`/?view=sales`) rather than local state so each is linkable and
 * survives a reload; /grading and /sales redirect here for old bookmarks and links already sent.
 */
const tabs: SegmentedTab<CollectionHomeView>[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "Value, cost basis, and what's in the collection",
  },
  {
    id: "sales",
    label: "Sales",
    hint: "Cards you have listed, and what you've sold",
  },
  {
    id: "grading",
    label: "Grading Desk",
    hint: "Which of your raw cards are worth grading",
  },
];

/** The URL each view lives at — one definition, so the switcher and the redirects can't drift. */
export function collectionHomeHref(view: CollectionHomeView): string {
  return view === "overview" ? "/" : `/?view=${view}`;
}

export function CollectionHome({ view }: { view: CollectionHomeView }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <SegmentedTabs
        tabs={tabs}
        value={view}
        ariaLabel="My Collection view"
        onChange={(id) => router.push(collectionHomeHref(id), { scroll: false })}
      />
      {view === "grading" ? <GradingDeskView /> : null}
      {view === "sales" ? <SalesView /> : null}
      {view === "overview" ? <CollectionOverview /> : null}
    </div>
  );
}
