/**
 * Vocabulary and glossary tools — the two anti-drift devices, as tools.
 *
 * slab serves both of these rather than documenting them, and this server
 * follows that: no tool description here lists brands, teams, attributes, or
 * finishes, and none writes its own definition of a metric. A list copied into
 * this repo would be stale the next time a set is seeded, and a hand-written
 * gloss of `priced_coverage` would drift from the one the portal and CLI show.
 *
 * They are two tools, not one, because they answer different questions and a
 * model picks tools by name: `get_vocab` is "what may I send", and
 * `explain_metrics` is "what does this number mean". Folding them together
 * meant an agent asked to explain a figure never thought to look in "vocab".
 *
 * Both are also exposed as resources (`slab://vocab`, `slab://glossary`) for
 * clients that can pull context without a tool call.
 */

import { z } from 'zod';
import { text } from '../format.js';
import type { MetricInfo } from '../format.js';
import { READ_ONLY, defineTool } from './types.js';

export const getVocab = defineTool({
  name: 'get_vocab',
  title: 'Values the API accepts',
  description:
    'Every value slab will accept: copy statuses, acquisition types, cost categories, grades, ' +
    'sealed formats, sort grammars, and the LIVE catalog dimensions — every attribute and grading ' +
    'company that exists right now.\n\n' +
    'Call this before guessing a filter value, and call it again rather than trusting a value you ' +
    'saw earlier in a long session. Attributes and grading companies grow whenever new products are ' +
    'ingested, which is exactly why no tool description in this server lists them. A filter value ' +
    'that is nearly right returns zero rows and no error — indistinguishable from "there are none", ' +
    'so a wrong guess reads as a confident, wrong answer.\n\n' +
    'For what a returned NUMBER means rather than what a value may be, use explain_metrics.',
  inputSchema: z.object({
    fields: z
      .array(z.string())
      .optional()
      .describe('Return only these vocabulary lists (e.g. ["copy_statuses","attributes"]). Omit for all of them.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const vocab = await ctx.client.request<Record<string, unknown>>('GET', '/vocab');
    const wanted = input.fields?.length
      ? Object.fromEntries(Object.entries(vocab).filter(([k]) => input.fields!.includes(k)))
      : vocab;

    const unknown = (input.fields ?? []).filter((f) => !(f in vocab));
    return text(
      'Accepted values, live from the catalog — do not cache these across sessions:',
      JSON.stringify(wanted, null, 1),
      unknown.length ? `\nNo such vocabulary list: ${unknown.join(', ')}. Available: ${Object.keys(vocab).join(', ')}.` : '',
    );
  },
});

export const explainMetrics = defineTool({
  name: 'explain_metrics',
  title: 'What a slab number means',
  description:
    "Plain-language definitions for every number slab reports, in slab's own words — each with a " +
    'label, a one-line summary, and the caveats that make it easy to misread.\n\n' +
    'Use this whenever you report a figure you have not explained before, and whenever a user asks ' +
    'what something means — "what is cost basis", "what does priced coverage tell me", "is my ROI ' +
    'good". Quote or closely follow this wording instead of composing your own. There is exactly ' +
    'one source of truth for it, shared by the API, the portal, and the CLI, so an explanation you ' +
    'take from here matches what the user sees everywhere else in slab; one you invent will not.\n\n' +
    'It matters most for the numbers that mislead quietly: which values rest on a thin sample, why ' +
    'a price series tracks an appraisal rather than the month\'s sales, and why the portfolio series ' +
    'is not a return.\n\n' +
    'Ids are namespaced (`dashboard.most_valuable`, `community.hottest_players`). Pass `ids` for ' +
    'specific ones, `search` to find them by keyword, or neither for everything.',
  inputSchema: z.object({
    ids: z.array(z.string()).optional().describe('Specific metric ids, e.g. ["dashboard.rarest"]. Omit to get all.'),
    search: z.string().optional().describe('Case-insensitive keyword match across id, label, and summary — use when you know the concept but not the id.'),
    detail: z.boolean().optional().describe('Include the longer caveat text, not just the one-line summary. Default true.'),
  }),
  annotations: READ_ONLY,
  mutates: false,
  async handler(input, ctx) {
    const glossary = await ctx.client.request<Record<string, MetricInfo>>('GET', '/glossary');
    const detail = input.detail ?? true;

    let entries = Object.entries(glossary);
    if (input.ids?.length) entries = entries.filter(([id]) => input.ids!.includes(id));
    if (input.search) {
      const needle = input.search.toLowerCase();
      entries = entries.filter(([id, info]) =>
        `${id} ${info.label ?? ''} ${info.summary ?? ''}`.toLowerCase().includes(needle),
      );
    }

    if (!entries.length) {
      return text(
        'No metric matched.',
        `Known ids: ${Object.keys(glossary).join(', ')}`,
      );
    }

    const lines: string[] = [];
    for (const [id, info] of entries) {
      lines.push(`${id} — ${info.label ?? id}`);
      if (info.summary) lines.push(`  ${info.summary}`);
      if (detail && info.detail) lines.push(`  ${info.detail}`);
      lines.push('');
    }
    return text(...lines);
  },
});

export const metaTools = [getVocab, explainMetrics];
