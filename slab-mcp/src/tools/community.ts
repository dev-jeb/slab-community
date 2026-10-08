/** The public, aggregate picture across all of slab. */

import { z } from 'zod';
import { glossaryLines, join, metric, money, text } from '../format.js';
import type { MetricInfo } from '../format.js';
import { READ_ONLY, defineTool } from './types.js';

/** What slab saw sell over one window — the API's one shape for real-sales counts + dollars. */
interface ObservedSales {
  window_days: number;
  sales: number;
  dollars: string;
  cards?: number | null;
}

/**
 * Sales velocity (glossary `sales.velocity`): the sales slab saw in 30 days
 * against the 30 before, both windows ending `lag_days` back. Read the way
 * every slab client reads it — hot, warm or cold (served), then the ratio and
 * both counts: "hot 2× (2 → 4)".
 */
interface SalesVelocity {
  window_days: number;
  lag_days: number;
  through: string;
  sales: number;
  sales_prior: number;
  ratio?: number | null;
  heat?: 'hot' | 'warm' | 'cold' | null;
  label?: string | null;
}

function velocityText(v: SalesVelocity): string {
  const r = v.ratio;
  const ratio = r == null ? undefined : `${Number(r.toFixed(r >= 10 ? 0 : r >= 1 ? 1 : 2))}×`;
  // An API older than `heat` names the same reading in `label`.
  const heat =
    v.heat ?? (v.label === 'up' || v.label === 'new' ? 'hot' : v.label === 'steady' ? 'warm' : 'cold');
  return join(' ', 'velocity', heat, ratio, `(${v.sales_prior} → ${v.sales})`);
}

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
  const seen = outer.observed as ObservedSales | undefined;
  const prior = outer.observed_prior as ObservedSales | undefined;
  const velocity = outer.velocity as SalesVelocity | null | undefined;

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
      // Player-leaderboard measures: the `observed` block (glossary
      // `sales.observed`). They come from counting real sales in a window — the
      // comps lane — so they ARE market activity, unlike an appraisal
      // difference; but only the sales slab SAW, so they read "seen", never
      // "volume" (a missed sale is simply absent).
      seen ? `${seen.sales} sales seen/${seen.window_days}d (prev ${prior?.sales ?? '?'})` : undefined,
      seen ? `${money(seen.dollars)} seen` : undefined,
      seen?.cards != null ? `${seen.cards} distinct cards` : undefined,
      // Sales velocity, served (its label too): the windows end a week back.
      velocity ? velocityText(velocity) : undefined,
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
    'sales in a window, which is not the same thing as an appraisal moving — and those counts and ' +
    'dollars are the sales slab saw (sales.observed), never every sale made: say "seen", not "volume".',
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
