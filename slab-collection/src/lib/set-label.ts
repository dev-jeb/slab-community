import type { SetOut } from "@/lib/slab/types";

export function setLabel(set: SetOut): string {
  const parts = [
    set.brand,
    set.season,
    set.year ? String(set.year) : null,
    set.name,
  ]
    .filter(Boolean)
    .join(" · ");
  return parts || set.slug;
}

/**
 * The day a product hit shelves, for display beside the sets that sort by it.
 *
 * Parsed at noon rather than midnight: a bare `YYYY-MM-DD` parses as UTC, so west of Greenwich a
 * release renders as the day before itself.
 */
export function releaseLabel(set: SetOut): string {
  if (!set.release_date) return "—";
  const parsed = Date.parse(`${set.release_date}T12:00:00`);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function setSearchText(set: SetOut): string {
  return [
    set.name,
    set.slug,
    set.brand,
    set.season,
    set.year ? String(set.year) : null,
    set.sport,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
