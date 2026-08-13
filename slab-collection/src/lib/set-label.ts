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
