/**
 * Pricing tools.
 *
 * These carry the load-bearing caveat of the whole slab data model, so it is
 * written into the tool description rather than left to the caller to infer:
 * a price snapshot is a trailing-90-day trimmed-median appraisal, so
 * differencing two snapshots measures how the appraisal drifted, not what the
 * market did. An agent that says "this card is up 12% this month" from
 * `price_change_30d` has stated something false, confidently, about someone's
 * money — the description exists to stop exactly that.
 */

import { z } from 'zod';
import { join, money, text } from '../format.js';
import { READ_ONLY, defineTool } from './types.js';

interface CompRow {
  sold_date?: string;
  price?: number;
  title?: string;
  grade_key?: string | null;
  source?: string | null;
}

interface MarketOut {
  card_uuid?: string;
  prices?: Array<{
    grade_key?: string;
    finish?: string | null;
    fair_market_value?: number | null;
    sample_size?: number | null;
    price_change_7d?: number | null;
    price_change_30d?: number | null;
    last_sold_date?: string | null;
  }>;
}

interface HistoryOut {
  points?: Array<{ date?: string; value?: number | null; sample_size?: number | null }>;
}

export const getCardPricing = defineTool({
  name: 'get_card_pricing',
  title: 'Pricing for one card',
  description:
    'What one card is worth, and the individual sales behind that number. `card_uuid` comes from ' +
    'search_cards.\n\n' +
    'Returns a fair market value per price key — a (finish, grade) pair, so a RAW copy and a PSA 10 ' +
    'of the same card are priced separately — plus, optionally, the recent comparable sales and a ' +
    'daily value series.\n\n' +
    'READ THIS BEFORE QUOTING A PERCENTAGE. A fair market value is a trimmed median of the trailing ' +
    '90 days of sales, recomputed daily. Two of those snapshots a month apart share most of their ' +
    'underlying sales, so `price_change_30d` is how the APPRAISAL drifted — smooth, lagged, roughly ' +
    'a 90-day memory. It is not the market\'s move over 30 days, and reporting it as one is wrong. ' +
    'If the user asks what actually happened in a window, set `include_comps` and count the real ' +
    'sales in that window instead.\n\n' +
    '`sample_size` is how many sales a value rests on. A value drawn from two sales is a guess; say ' +
    'so rather than quoting it flat.\n\n' +
    'Call explain_metrics for the exact meaning of fair market value, appraisal drift, and sample ' +
    "size before explaining any of them to the user — use slab's wording, not your own.",
  inputSchema: z.object({
    card_uuid: z.string().describe('Card UUID, from search_cards.'),
    grade_key: z
      .string()
      .optional()
      .describe('Restrict to one price key, e.g. "RAW" or "PSA10". Omit for every key with data. Call get_vocab for valid keys.'),
    include_comps: z.boolean().optional().describe('Include the individual recent sales. Default true — this is the evidence behind the value.'),
    comps_limit: z.number().int().min(1).max(100).optional().describe('How many recent sales to return. Default 15.'),
    include_history: z.boolean().optional().describe('Include the daily value series. Default false; it is the largest part of the response.'),
    history_start: z.string().optional().describe('ISO date (YYYY-MM-DD) to start the series.'),
    history_end: z.string().optional().describe('ISO date (YYYY-MM-DD) to end the series.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const { card_uuid } = input;
    const includeComps = input.include_comps ?? true;
    const compsLimit = input.comps_limit ?? 15;

    const market = await ctx.client.request<MarketOut>('GET', `/cards/${card_uuid}/market`);

    const lines: string[] = ['Fair market value by price key (trailing-90-day trimmed median appraisal):'];
    const prices = (market.prices ?? []).filter((p) => !input.grade_key || p.grade_key === input.grade_key);
    if (!prices.length) {
      lines.push('  (no priced sales matched — this card has no comps yet, or none for that grade key)');
    }
    for (const price of prices) {
      lines.push(
        '  ' +
          join(
            '  |  ',
            join(' ', price.finish ?? 'base', price.grade_key),
            money(price.fair_market_value),
            price.sample_size != null ? `n=${price.sample_size}` : undefined,
            price.price_change_30d != null ? `appraisal drift 30d ${(price.price_change_30d * 100).toFixed(1)}%` : undefined,
            price.last_sold_date ? `last sale ${price.last_sold_date}` : undefined,
          ),
      );
    }

    if (includeComps) {
      const comps = await ctx.client.request<{ comps?: CompRow[] }>('GET', `/cards/${card_uuid}/comps`, {
        query: { limit: compsLimit, grade_key: input.grade_key },
      });
      const rows = comps.comps ?? [];
      lines.push('', `Recent sales (${rows.length}) — these are the actual transactions; count these for "what happened in a window":`);
      for (const comp of rows) {
        lines.push('  ' + join('  |  ', comp.sold_date, money(comp.price), comp.grade_key ?? 'RAW', comp.title));
      }
      if (!rows.length) lines.push('  (none)');
    }

    if (input.include_history) {
      const history = await ctx.client.request<HistoryOut>('GET', `/cards/${card_uuid}/price-history`, {
        query: {
          grade_key: input.grade_key ?? 'RAW',
          start: input.history_start,
          end: input.history_end,
          interval: 'daily',
        },
      });
      const points = history.points ?? [];
      lines.push('', `Daily appraisal series (${points.length} points, grade key ${input.grade_key ?? 'RAW'}):`);
      lines.push(...points.map((p) => `  ${p.date}  ${money(p.value)}${p.sample_size != null ? `  n=${p.sample_size}` : ''}`));
    }

    return text(...lines);
  },
});

export const pricingTools = [getCardPricing];
