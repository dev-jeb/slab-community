import { redirect } from "next/navigation";

import { CollectionOverview } from "@/components/collection/CollectionOverview";

/**
 * My Collection is the dashboard now — one job, no tabs.
 *
 * Searching moved to /search, where it works over your collection OR the whole catalog, so the
 * `?view=search` this page briefly used forwards there instead of rendering a second copy.
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

  return <CollectionOverview />;
}
