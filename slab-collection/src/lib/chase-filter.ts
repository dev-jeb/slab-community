import type { CardSearchQuery } from "@/lib/slab/types";

/** Wizard answers — mirrors the CLI dynamic-set questionnaire. */
export interface ChaseFilterInput {
  team?: string;
  year?: number;
  subject?: string;
  subset?: string;
  brand?: string;
  finish?: string;
  attribute?: string;
  baseOnly?: boolean;
  rookieOnly?: boolean;
  numberedOnly?: boolean;
  numberedMax?: number;
}

export type ChaseSetMode = "roster" | "master";
export type ChaseSetVisibility = "private" | "public";

export interface ChaseCreateRequest {
  name: string;
  description?: string | null;
  mode: ChaseSetMode;
  visibility?: ChaseSetVisibility;
  filter: ChaseFilterInput;
}

export function buildCardSearchQuery(
  input: ChaseFilterInput,
): CardSearchQuery {
  const query: CardSearchQuery = {};

  if (input.team?.trim()) query.team = [input.team.trim()];
  if (input.year) query.year = input.year;
  if (input.subject?.trim()) query.subject = input.subject.trim();
  if (input.subset?.trim()) query.subset = [input.subset.trim()];
  if (input.brand?.trim()) query.brand = [input.brand.trim()];
  if (input.finish?.trim()) query.finish = [input.finish.trim()];
  if (input.attribute?.trim()) query.attribute = [input.attribute.trim()];
  if (input.baseOnly) query.base_only = true;
  if (input.rookieOnly) query.rookie = true;
  if (input.numberedOnly) query.is_numbered = true;
  if (input.numberedMax && input.numberedMax > 0) {
    query.numbered_max = input.numberedMax;
  }

  return query;
}

/** Serialized CardFilter for dynamic custom sets — same shape as slab chase create. */
export function buildFilterJson(
  input: ChaseFilterInput,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.subject?.trim()) filter.subject = input.subject.trim();
  if (input.team?.trim()) filter.team = [input.team.trim()];
  if (input.subset?.trim()) filter.subset = [input.subset.trim()];
  if (input.brand?.trim()) filter.brand = [input.brand.trim()];
  if (input.year) filter.year = input.year;
  if (input.finish?.trim()) filter.finish = [input.finish.trim()];
  if (input.attribute?.trim()) filter.attribute = [input.attribute.trim()];
  if (input.rookieOnly) filter.rookie = true;
  if (input.numberedOnly) filter.is_numbered = true;
  if (input.numberedMax && input.numberedMax > 0) {
    filter.numbered_max = input.numberedMax;
  }
  if (input.baseOnly) filter.base_only = true;

  return filter;
}

export function validateChaseFilter(
  input: ChaseFilterInput,
): string | null {
  const filter = buildFilterJson(input);
  if (Object.keys(filter).length === 0) {
    return "Set at least one filter — team and season year is the usual starting point.";
  }
  return null;
}

export function filterSummary(input: ChaseFilterInput): string[] {
  const lines: string[] = [];
  if (input.team?.trim()) lines.push(`Team: ${input.team.trim()}`);
  if (input.year) lines.push(`Season: ${input.year}–${input.year + 1}`);
  if (input.subject?.trim()) lines.push(`Player: ${input.subject.trim()}`);
  if (input.subset?.trim()) lines.push(`Subset: ${input.subset.trim()}`);
  if (input.brand?.trim()) lines.push(`Brand: ${input.brand.trim()}`);
  if (input.finish?.trim()) lines.push(`Finish: ${input.finish.trim()}`);
  if (input.attribute?.trim()) lines.push(`Attribute: ${input.attribute.trim()}`);
  if (input.baseOnly) lines.push("Base cards only");
  if (input.rookieOnly) lines.push("Rookies only");
  if (input.numberedOnly) lines.push("Numbered only");
  if (input.numberedMax) lines.push(`Print run ≤ ${input.numberedMax}`);
  return lines;
}

export const CHASE_FILTER_PRESETS = {
  canes2026: {
    name: "2025/2026 Carolina Hurricanes",
    team: "Hurricanes",
    year: 2025,
  },
} as const;
