/**
 * Result formatting.
 *
 * The constraint that shapes every tool in this server: a tool result is spent
 * out of the calling model's context window. A raw `POST /cards/search` page
 * is tens of thousands of tokens of JSON, most of it nulls and repeated keys,
 * and an agent that burns its window on one search has nothing left to reason
 * with. So results are rendered as dense lines — one entity per line, UUID
 * first because that is the only field the model must carry to the next call.
 *
 * Note what is deliberately absent: `outputSchema` / `structuredContent`. MCP
 * supports it, but a tool that declares an output schema must return the data
 * BOTH as structured content and as text, which doubles the cost of exactly
 * the payloads that are already the largest thing here. Add it per-tool if a
 * client appears that consumes structured content and skips the text — not
 * before.
 */

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export function text(...parts: Array<string | undefined | null | false>): ToolResult {
  return {
    content: [{ type: 'text', text: parts.filter(Boolean).join('\n').trim() || '(no results)' }],
  };
}

/** Money, rendered the way a person reads it. `null` becomes an em dash. */
export function money(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A 0-1 ratio as a percentage. `portfolio_roi: 0.0645` reads as `6.45%`. */
export function percent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

/** A count, rendered as an integer with no currency symbol. */
export function count(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Metric formatting is keyed on the FIELD NAME, never on the value's runtime
// type. Two reasons, both found by running this against a real collection:
// slab serializes Decimal as a JSON string, so a `typeof v === 'number'` test
// silently let `total_cost_basis` through as "775.5800000000000000000000000";
// and `priced_copies` is an integer count that a type-based rule happily
// rendered as "$159.00". A number labelled with the wrong unit is worse than
// an unformatted one — so anything unrecognised falls through to plain text
// rather than being guessed into a currency.
const COUNT_KEYS =
  /^(total|total_cards|players|teams|breaks|lots|rookies|autos|relics|numbered|one_of_ones|priced_copies|unpriced_copies|sample_size|.*_count)$/;
const RATIO_KEYS = /(roi|coverage)$/;
const MONEY_KEYS = /(cost|basis|value|gain|loss|price|fmv|change_\d+d)/;

/** Render one dashboard/summary metric with the right unit for its name. */
export function metric(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean' || typeof value === 'object') return String(value);
  if (COUNT_KEYS.test(key)) return count(value as number | string);
  if (RATIO_KEYS.test(key)) return percent(value as number | string);
  if (MONEY_KEYS.test(key)) return money(value as number | string);
  return String(value);
}

/** Join non-empty fragments with a separator, dropping blanks. */
export function join(sep: string, ...parts: Array<string | number | null | undefined | false>): string {
  return parts.filter((p) => p !== null && p !== undefined && p !== false && p !== '').join(sep);
}

/**
 * The standard header for a paged result. Says how much was returned out of
 * how much exists, so the model knows whether to page rather than assuming it
 * has seen everything — the most common silent failure in agent search loops.
 */
export function pageHeader(label: string, total: number | undefined, shown: number, offset = 0): string {
  if (total === undefined) return `${shown} ${label}`;
  const end = offset + shown;
  if (end >= total && offset === 0) return `${total} ${label}`;
  return `${label}: showing ${offset + 1}-${end} of ${total} (raise \`offset\` to page)`;
}

export interface MetricInfo {
  label?: string;
  summary?: string;
  detail?: string;
}

/**
 * Render an embedded glossary block.
 *
 * Several slab responses carry the definitions of their own metrics, keyed by
 * namespaced id. Rendering them next to the numbers is the whole point: the
 * agent gets slab's wording for what a figure means, in the same result, so it
 * explains `priced_coverage` correctly instead of inventing a gloss. Dropping
 * this block — which an earlier version of this file did — is how an agent
 * ends up confidently paraphrasing a metric it has never seen defined.
 */
export function glossaryLines(
  glossary: Record<string, MetricInfo> | null | undefined,
  opts: { detail?: boolean } = {},
): string[] {
  if (!glossary || !Object.keys(glossary).length) return [];
  const out = ['', 'What these mean (slab\'s own wording — use it rather than paraphrasing):'];
  for (const [id, info] of Object.entries(glossary)) {
    out.push(`  ${id} — ${info.label ?? id}: ${info.summary ?? ''}`);
    if (opts.detail && info.detail) out.push(`      ${info.detail}`);
  }
  return out;
}

/** Render facet buckets compactly: `brand: Upper Deck (412), O-Pee-Chee (88)`. */
export function facetLines(facets: Record<string, Array<{ value: string; count: number }>> | null | undefined): string[] {
  if (!facets) return [];
  const out: string[] = [];
  for (const [dimension, buckets] of Object.entries(facets)) {
    if (!buckets?.length) continue;
    out.push(`  ${dimension}: ${buckets.map((b) => `${b.value} (${b.count})`).join(', ')}`);
  }
  return out.length ? ['', 'Facets:', ...out] : [];
}
