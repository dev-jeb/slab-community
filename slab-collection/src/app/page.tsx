import { redirect } from "next/navigation";

import {
  CollectionHome,
  type CollectionHomeView,
} from "@/components/collection/CollectionHome";

/**
 * My Collection: the Overview dashboard, plus Sales and the Grading Desk as sibling views — all
 * three are about the cards you own, which is the bar for living under this roof. Anything that
 * isn't (searching, the catalog) forwards elsewhere: the `?view=search` this page briefly used
 * goes to /search, where one page covers your collection AND the whole catalog.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; browse?: string; filter?: string }>;
}) {
  const { view, browse, filter } = await searchParams;

  if (view === "search") {
    const params = new URLSearchParams();
    if (browse) params.set("browse", browse);
    if (filter) params.set("filter", filter);
    const query = params.toString();
    redirect(query ? `/search?${query}` : "/search");
  }

  const known: CollectionHomeView[] = ["grading", "sales"];
  const active = known.find((candidate) => candidate === view) ?? "overview";

  return <CollectionHome view={active} />;
}
