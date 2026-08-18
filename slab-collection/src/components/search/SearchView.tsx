"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";

import { CollectionView } from "@/components/collection/CollectionView";
import { CatalogSearchView } from "@/components/search/CatalogSearchView";
import { SetLookupView } from "@/components/sets/SetLookupView";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Sheen, SheenBar } from "@/components/ui/sheen";
import type {
  CollectionBrowseMode,
  CollectionFilter,
} from "@/lib/collection-filters";

/**
 * One search, three things to point it at.
 *
 * Searching your collection and searching the catalog were two separate pages built twice — the
 * collection one grew filters, grouped views, tiles and a list; the catalog one stayed a
 * player-name box. They were never different features, just the same table over a different set of
 * cards, so this is a scope switch rather than a second page — and the card scopes keep the same
 * Cards / Sets / Teams tabs and the same filter pills.
 *
 * Sets is the third because looking a product up is the same act, and it's where you'd go next
 * from either card scope. Note it's not the catalog's *Sets tab*: that groups matching CARDS by
 * the product they came from, this lists the products themselves, with card counts and pricing
 * coverage.
 *
 * The scope lives in the URL (`?scope=catalog`) so a link can carry it.
 */
type SearchScope = "collection" | "catalog" | "sets";

function scopeFrom(value: string | null): SearchScope {
  return value === "catalog" || value === "sets" ? value : "collection";
}

function browseFrom(value: string | null): CollectionBrowseMode | undefined {
  return value === "sets" || value === "teams" || value === "duplicates"
    ? value
    : undefined;
}

function filterFrom(value: string | null): CollectionFilter | undefined {
  return value === "auto" || value === "rookie" || value === "numbered"
    ? value
    : undefined;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = scopeFrom(searchParams.get("scope"));

  const setScope = useCallback(
    (next: SearchScope) => {
      const params = new URLSearchParams(searchParams.toString());
      // browse/filter seed the collection scope only (they arrive from an overview pill). Carrying
      // them across a scope change would silently narrow a search you just widened.
      params.delete("browse");
      params.delete("filter");

      if (next === "collection") {
        params.delete("scope");
      } else {
        params.set("scope", next);
      }

      const query = params.toString();
      router.replace(query ? `/search?${query}` : "/search");
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SegmentedTabs
          tabs={[
            { id: "collection", label: "My Collection" },
            { id: "catalog", label: "Catalog" },
            { id: "sets", label: "Sets" },
          ]}
          value={scope}
          onChange={setScope}
          ariaLabel="Search scope"
        />
      </div>

      {scope === "collection" ? (
        <CollectionView
          initialBrowse={browseFrom(searchParams.get("browse"))}
          initialFilter={filterFrom(searchParams.get("filter"))}
        />
      ) : scope === "catalog" ? (
        <CatalogSearchView />
      ) : (
        <SetLookupView />
      )}
    </div>
  );
}

export function SearchView() {
  return (
    <Suspense
      fallback={
        <Sheen loading label="Loading search">
          <SheenBar className="h-48 w-full rounded-xl" />
        </Sheen>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
