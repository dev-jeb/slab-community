/** Catalog tools: finding cards, products, and what's in a product. */

import { z } from 'zod';
import { join, money, pageHeader, text, facetLines } from '../format.js';
import type { CardOut, Paged, SetOut } from '../types.js';
import { DEFAULT_LIMIT, cardFilterShape, paginationShape } from './filters.js';
import { READ_ONLY, defineTool } from './types.js';

/** One card on one line. UUID first — it is the only field the model must carry forward. */
export function cardLine(card: CardOut): string {
  const players = (card.subjects ?? []).map((s) => join(' / ', s.name, s.team)).filter(Boolean).join(' + ');
  const attrs = (card.attributes ?? []).map((a) => a.name).filter(Boolean).join(', ');
  const fmv = card.market?.fair_market_value;

  return join(
    '  |  ',
    card.uuid,
    join(' ', card.season ?? card.year, card.brand, card.set_name),
    card.subset,
    `#${card.card_number ?? '?'}`,
    players || undefined,
    card.finish ?? 'base',
    card.print_run ? `/${card.print_run}` : undefined,
    attrs || undefined,
    fmv !== null && fmv !== undefined
      ? `FMV ${money(fmv)}${card.market?.grade_key ? ` (${card.market.grade_key})` : ''}`
      : undefined,
    card.owned_quantity ? `owned x${card.owned_quantity}` : undefined,
  );
}

export const searchCards = defineTool({
  name: 'search_cards',
  title: 'Search the card catalog',
  description:
    'Search slab\'s catalog of trading cards. This is the entry point for nearly everything else: ' +
    'the `uuid` on each result is what get_card_pricing and add_copy take, and there is no way to ' +
    'look a card up by UUID directly, so search first and carry the UUID forward.\n\n' +
    'A parallel is its own card — the same slot in a different finish — so a player in one set can ' +
    'return dozens of rows. Narrow with `finish`, `base_only`, or `numbered_max` rather than paging ' +
    'through them.\n\n' +
    'Set `include_market` to attach each card\'s current fair market value. That costs real query ' +
    'time, so leave it off when you are only identifying a card. Set `facets` to get counts per ' +
    'dimension instead of guessing what to filter on next — the cheapest way to explore a big result set.',
  inputSchema: z.object({
    ...cardFilterShape,
    ...paginationShape,
    include_market: z.boolean().optional().describe('Attach fair market value to each card. Off by default; slower.'),
    owned: z.boolean().optional().describe('true = only cards you own a copy of, false = only ones you do not.'),
    facets: z
      .array(z.string())
      .optional()
      .describe('Return per-value counts for these dimensions alongside the results. The dimensions each search accepts are served by get_vocab (`facet_dimensions`) — read them rather than assuming.'),
    sort: z.string().optional().describe('Sort key: year, card_number, numbered, subject, brand, or set. Call get_vocab for the exact grammar.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const { limit = DEFAULT_LIMIT, offset = 0, ...rest } = input;
    const result = await ctx.client.request<Paged<CardOut>>('POST', '/cards/search', {
      body: { ...rest, limit, offset },
    });
    const items = result.items ?? [];
    return text(
      pageHeader('cards', result.total, items.length, offset),
      '',
      ...items.map(cardLine),
      ...facetLines(result.facets),
    );
  },
});

export const searchSets = defineTool({
  name: 'search_sets',
  title: 'Search card products (sets)',
  description:
    'Find a release — a product like "2025-26 Upper Deck SP Authentic". Returns each set\'s UUID ' +
    '(for get_set_detail) and slug (for the `set_slug` filter on search_cards), plus its card count ' +
    'and current sealed hobby box price where one is known.\n\n' +
    'Reach for this when the user names a product rather than a player, or when you need to scope a ' +
    'card search to one release.',
  inputSchema: z.object({
    q: z.string().optional().describe('Set name, substring match (e.g. "sp authentic").'),
    brand: z.array(z.string()).optional().describe('Brand name(s), any-of.'),
    year: z.number().int().optional().describe('Season-start year — 2025 means 2025-26.'),
    sport: z.string().optional().describe('Sport name.'),
    ...paginationShape,
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const { limit = DEFAULT_LIMIT, offset = 0, ...rest } = input;
    const result = await ctx.client.request<Paged<SetOut>>('POST', '/sets/search', {
      body: { ...rest, limit, offset },
    });
    const items = result.items ?? [];
    return text(
      pageHeader('sets', result.total, items.length, offset),
      '',
      ...items.map((set) =>
        join(
          '  |  ',
          set.uuid,
          set.name ?? set.slug,
          set.slug,
          set.card_count ? `${set.card_count} cards` : undefined,
          set.box_price ? `box ${money(set.box_price)}` : undefined,
        ),
      ),
    );
  },
});

export const getSetDetail = defineTool({
  name: 'get_set_detail',
  title: 'Sealed prices and top cards for a set',
  description:
    'Everything you need to reason about one product: its sealed SKUs (hobby box, case, blaster…) ' +
    'with current market prices, and its most valuable single cards by fair market value.\n\n' +
    'This is the pair of numbers behind "is this box worth ripping" — what the sealed product costs ' +
    'against what the chase cards in it are worth. It is NOT a rip-EV calculation: it does not weight ' +
    'those cards by pull odds, so do not present the top card\'s value as an expected return.\n\n' +
    '`set_uuid` comes from search_sets.',
  inputSchema: z.object({
    set_uuid: z.string().describe('Set UUID, from search_sets.'),
    top_cards: z.number().int().min(1).max(50).optional().describe('How many top cards to return. Default 10.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const limit = input.top_cards ?? 10;
    const [sealed, top] = await Promise.all([
      ctx.client.request<Array<Record<string, unknown>>>('GET', `/sets/${input.set_uuid}/sealed`),
      ctx.client.request<{ items?: CardOut[] }>('GET', `/sets/${input.set_uuid}/top-cards`, {
        query: { limit },
      }),
    ]);

    const sealedLines = (sealed ?? []).map((product) =>
      join(
        '  |  ',
        String(product.uuid ?? ''),
        String(product.format ?? 'unknown format'),
        product.market_value != null ? `market ${money(product.market_value as number)}` : 'market —',
        product.msrp != null ? `MSRP ${money(product.msrp as number)}` : undefined,
      ),
    );

    return text(
      'Sealed products:',
      ...(sealedLines.length ? sealedLines : ['  (none — this set has no sealed SKUs loaded)']),
      '',
      `Top ${limit} cards by fair market value:`,
      ...((top.items ?? []).map(cardLine) ?? []),
    );
  },
});

export const catalogTools = [searchCards, searchSets, getSetDetail];
