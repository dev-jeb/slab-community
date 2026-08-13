/** Read tools for the user's own collection. */

import { z } from 'zod';
import { facetLines, glossaryLines, join, metric, money, pageHeader, text } from '../format.js';
import type { MetricInfo } from '../format.js';
import type { CardCopyOut, Paged } from '../types.js';
import { DEFAULT_LIMIT, cardFilterShape, paginationShape } from './filters.js';
import { READ_ONLY, defineTool } from './types.js';

const collectorArg = z
  .string()
  .optional()
  .describe('Collector UUID. Omit it — the server uses the collector this API key acts for. Only pass one for a multi-collector account.');

function copyLine(copy: CardCopyOut): string {
  const card = copy.card;
  const players = (card?.subjects ?? []).map((s) => s.name).filter(Boolean).join(' + ');
  const grade = copy.grading_company ? `${copy.grading_company} ${copy.grade ?? ''}`.trim() : 'raw';
  const fmv = (copy.market as { fair_market_value?: number } | null)?.fair_market_value;

  return join(
    '  |  ',
    copy.uuid,
    join(' ', card?.season ?? card?.year, card?.brand, card?.set_name),
    card?.subset,
    `#${card?.card_number ?? '?'}`,
    players || undefined,
    card?.finish ?? 'base',
    copy.serial_number && card?.print_run ? `${copy.serial_number}/${card.print_run}` : card?.print_run ? `/${card.print_run}` : undefined,
    grade,
    copy.quantity && copy.quantity > 1 ? `x${copy.quantity}` : undefined,
    `cost ${money(copy.cost_basis)}`,
    `FMV ${money(fmv)}`,
    copy.status && copy.status !== 'in_collection' ? copy.status : undefined,
    copy.storage_location ?? undefined,
  );
}

export const searchCollection = defineTool({
  name: 'search_collection',
  title: "Search the user's collection",
  description:
    'Search the physical copies the user owns. Takes the full card filter grammar from search_cards ' +
    'plus copy-level filters (grade, status, acquisition, storage), and returns a financial summary ' +
    'across the matched set.\n\n' +
    'Each row is one physical copy, so the same card owned twice is two rows with two cost bases. ' +
    'The `uuid` here is a COPY uuid — that is what update_copy and remove_copy take. The card\'s own ' +
    'uuid is a different value.\n\n' +
    'Money: `cost_basis` is what the copy cost all-in (acquisition plus grading, shipping, and any ' +
    'other logged costs); FMV is the current appraisal. The gap between them is paper profit, not ' +
    'realised — nothing is realised until the copy is sold.\n\n' +
    'The result ends with a financial summary across every match, not just the page shown. Call ' +
    "explain_metrics and use slab's own wording for those figures rather than paraphrasing them.",
  inputSchema: z.object({
    collector_uuid: collectorArg,
    ...cardFilterShape,
    ...paginationShape,
    status: z.array(z.string()).optional().describe('Copy status, any-of: in_collection, for_trade, for_sale, sold.'),
    graded: z.boolean().optional().describe('true = only professionally graded copies, false = only raw.'),
    grading_company: z.array(z.string()).optional().describe('Grading company, any-of (PSA, BGS, SGC, CGC).'),
    acquisition_type: z.array(z.string()).optional().describe('How it was acquired, any-of: purchase, pack_pull, trade, gift, other.'),
    acquired_after: z.string().optional().describe('ISO date (YYYY-MM-DD) — copies acquired on or after this date.'),
    acquired_before: z.string().optional().describe('ISO date (YYYY-MM-DD) — copies acquired on or before this date.'),
    storage_location: z.string().optional().describe('Storage location, substring match.'),
    facets: z
      .array(z.string())
      .optional()
      .describe('Return per-value counts for these dimensions — collection search accepts card-level dimensions as well as copy-level ones. get_vocab (`facet_dimensions`) serves the accepted list per search; read it rather than assuming.'),
    sort: z.string().optional().describe('Sort key. Call get_vocab for the grammar.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const { collector_uuid, limit = DEFAULT_LIMIT, offset = 0, ...rest } = input;
    const collector = await ctx.collector(collector_uuid);
    const result = await ctx.client.request<Paged<CardCopyOut>>(
      'POST',
      `/collectors/${collector}/collection/search`,
      { body: { ...rest, limit, offset } },
    );
    const items = result.items ?? [];
    const summary = result.summary
      ? [
          '',
          'Financial summary across all matches:',
          ...Object.entries(result.summary).map(([k, v]) => `  ${k}: ${metric(k, v)}`),
          '',
          'Call explain_metrics before reporting any of these figures to the user.',
        ]
      : [];

    return text(
      pageHeader('copies', result.total, items.length, offset),
      '',
      ...items.map(copyLine),
      ...summary,
      ...facetLines(result.facets),
    );
  },
});

export const getDashboard = defineTool({
  name: 'get_dashboard',
  title: 'Collection dashboard and portfolio history',
  description:
    "The headline numbers for the user's whole collection: total copies, cost basis, current market " +
    'value, unrealised gain/loss, and the biggest movers.\n\n' +
    'Optionally includes the portfolio value time series. That series is AS-OF: every point values ' +
    'only the copies owned on that date, so it steps UP when the user buys a card. Differencing two ' +
    'points therefore mixes purchases with price movement and is not a return — if the user asks how ' +
    'their portfolio performed, use `portfolio_change_7d` from the dashboard, which holds the basket ' +
    'constant and is pure appraisal drift.\n\n' +
    "Every number here has a definition in slab's glossary, and the response embeds the ones it " +
    'needs. Before you report a figure to the user, call explain_metrics and use that wording — ' +
    '`priced_coverage`, `portfolio_roi`, and `portfolio_change_7d` in particular all mean something ' +
    'narrower than their names suggest, and a plausible-sounding paraphrase of them is wrong.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    include_history: z.boolean().optional().describe('Include the as-of portfolio value series. Default false.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const collector = await ctx.collector(input.collector_uuid);
    const dashboard = await ctx.client.request<Record<string, unknown>>('GET', `/collectors/${collector}/dashboard`);

    const lines = ['Collection dashboard:'];
    for (const [key, value] of Object.entries(dashboard)) {
      if (value === null || value === undefined || typeof value === 'object') continue;
      lines.push(`  ${key}: ${metric(key, value)}`);
    }

    // The highlight lists are the most useful part of this payload and are
    // what a user actually asks about ("what's my best card?").
    //
    // The uuid on these rows is a COPY uuid, not a card uuid — the dashboard
    // is collector-scoped, so a highlight is one of the user's copies. The
    // wire field is a bare `uuid` on a model called HighlightCard, so it is
    // easy to mistake for a card id and feed to get_card_pricing, which 404s.
    // Prefixing it here is what stops that.
    for (const board of ['most_valuable', 'rarest', 'top_sets'] as const) {
      const rows = dashboard[board];
      if (!Array.isArray(rows) || !rows.length) continue;
      lines.push('', `${board}:`);
      for (const row of rows as Array<Record<string, unknown>>) {
        lines.push(
          '  ' +
            join(
              '  |  ',
              typeof row.uuid === 'string' ? `copy:${row.uuid}` : undefined,
              Array.isArray(row.subjects) ? (row.subjects as string[]).join(' + ') : (row.label as string),
              row.set_name as string,
              row.card_number ? `#${row.card_number}` : undefined,
              (row.finish as string) ?? undefined,
              row.print_run ? `/${row.print_run}` : undefined,
              row.grade_key as string,
              row.fair_market_value != null ? money(row.fair_market_value as number) : undefined,
              row.count != null ? `${row.count} cards` : undefined,
            ),
        );
      }
      if (board !== 'top_sets') {
        lines.push(
          '  (these are COPY uuids — pass them to update_copy/remove_copy. For pricing, find the ' +
            'card with search_cards first; a copy uuid will 404 on get_card_pricing.)',
        );
      }
    }

    // slab embeds the definitions for these boards in the payload itself.
    lines.push(...glossaryLines(dashboard.glossary as Record<string, MetricInfo> | undefined));

    if (input.include_history) {
      const history = await ctx.client.request<{ points?: Array<{ date?: string; value?: number | null; total_copies?: number | null }> }>(
        'GET',
        `/collectors/${collector}/portfolio/history`,
      );
      const points = history.points ?? [];
      lines.push('', `Portfolio value, as-of (${points.length} points). Steps up on purchases — not a return series:`);
      lines.push(...points.map((p) => `  ${p.date}  ${money(p.value)}${p.total_copies != null ? `  (${p.total_copies} copies)` : ''}`));
    }

    return text(...lines);
  },
});

export const collectionTools = [searchCollection, getDashboard];
