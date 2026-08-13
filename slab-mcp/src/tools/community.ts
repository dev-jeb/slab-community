/** The public, aggregate picture across all of slab. */

import { z } from 'zod';
import { glossaryLines, join, metric, money, text } from '../format.js';
import type { MetricInfo } from '../format.js';
import { READ_ONLY, defineTool } from './types.js';

interface CommunityBoard {
  stats?: Record<string, unknown>;
  ticker?: string[];
  glossary?: Record<string, MetricInfo>;
  [board: string]: unknown;
}

/**
 * Leaderboard rows vary in shape by board, and some nest the card under a
 * `card` key while carrying their own count alongside it (`rarest_owned` is
 * `{card: {...}, collector_count}`). Reading only top-level fields renders
 * those boards as blank lines — which is what an earlier version of this did,
 * silently, because a missing field formats as nothing rather than failing.
 */
function leaderboardLine(row: Record<string, unknown>): string {
  const card = (row.card ?? row) as Record<string, unknown>;
  const outer = row as Record<string, unknown>;

  return (
    '  ' +
    join(
      '  |  ',
      typeof card.uuid === 'string' ? card.uuid : undefined,
      Array.isArray(card.subjects) ? (card.subjects as string[]).join(' + ') : (card.name as string),
      join(' ', card.season as string, card.set_name as string),
      card.subset as string,
      card.card_number ? `#${card.card_number}` : undefined,
      (card.finish as string) ?? undefined,
      card.print_run ? `/${card.print_run}` : undefined,
      card.fair_market_value != null ? money(card.fair_market_value as number) : undefined,
      // Player-leaderboard measures. These come from counting real sales in a
      // window — the comps lane — so they ARE market activity, unlike an
      // appraisal difference.
      outer.sales_30d != null ? `${outer.sales_30d} sales/30d (prev ${outer.sales_prev_30d ?? '?'})` : undefined,
      outer.dollar_volume_30d != null ? `volume ${money(outer.dollar_volume_30d as string)}` : undefined,
      outer.distinct_cards_30d != null ? `${outer.distinct_cards_30d} distinct cards` : undefined,
      outer.price_trend_pct != null ? `trend ${outer.price_trend_pct}%` : undefined,
      outer.collector_count != null ? `${outer.collector_count} collectors` : undefined,
      outer.owner_count != null ? `${outer.owner_count} owners` : undefined,
      outer.count != null ? `n=${outer.count}` : undefined,
    )
  );
}

export const getCommunity = defineTool({
  name: 'get_community',
  title: 'Community activity and leaderboards',
  description:
    'The public picture across all of slab in one call: catalog totals, a feed of recent activity, ' +
    'and leaderboards — most valuable split by raw and graded, most-collected cards and players by ' +
    'how many distinct collectors own them, hottest players, and rarest-owned by print run.\n\n' +
    'Reach for this for "what is hot right now", "what is the rarest thing anyone owns", or to give ' +
    "a user a sense of where their collection sits against everyone else's.\n\n" +
    'Everything here is aggregate and anonymised by design: no collector identities and no ' +
    "individual collectors' prices. Do not present any of it as being about a specific person.\n\n" +
    "The response embeds slab's glossary entry for each leaderboard — use that wording when you " +
    'explain a board rather than inferring what it measures from its name, and call explain_metrics ' +
    'for anything the embedded set does not cover. "Hottest" in particular is computed from real ' +
    'sales in a window, which is not the same thing as an appraisal moving.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional().describe('Rows per leaderboard. Default 10.'),
    boards: z
      .array(z.string())
      .optional()
      .describe('Only these boards, e.g. ["hottest_players","rarest_owned"]. Omit for all — the full payload is large.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const board = await ctx.client.request<CommunityBoard>('GET', '/community', {
      query: { limit: input.limit ?? 10 },
    });

    const lines: string[] = [];

    if (board.stats && (!input.boards || input.boards.includes('stats'))) {
      lines.push('Catalog totals:');
      for (const [key, value] of Object.entries(board.stats)) lines.push(`  ${key}: ${metric(key, value)}`);
    }

    if (Array.isArray(board.ticker) && (!input.boards || input.boards.includes('ticker'))) {
      lines.push('', 'Recent activity:');
      lines.push(...board.ticker.map((entry) => `  ${entry}`));
    }

    const skip = new Set(['stats', 'ticker', 'glossary']);
    for (const [name, value] of Object.entries(board)) {
      if (skip.has(name) || !Array.isArray(value)) continue;
      if (input.boards && !input.boards.includes(name)) continue;
      lines.push('', `${name}:`);
      lines.push(...(value as Array<Record<string, unknown>>).map(leaderboardLine));
    }

    // slab ships the definitions with the data — render them, don't drop them.
    lines.push(...glossaryLines(board.glossary));

    return text(...lines);
  },
});

export const communityTools = [getCommunity];
