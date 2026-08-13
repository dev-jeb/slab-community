/**
 * The shared card filter grammar, defined once.
 *
 * This mirrors `CardFilter` in the slab wire contract, and both `search_cards`
 * and `search_collection` spread it — the same seam the slab CLI keeps between
 * `flags.py` and `CardFilter`, for the same reason: two copies of a filter
 * grammar drift, and the drift shows up as a filter that silently does nothing.
 *
 * Note what these descriptions do NOT do: enumerate valid brands, teams,
 * attributes, or finishes. Those are live catalog dimensions that grow every
 * time a set is seeded, so a hardcoded copy here would rot. `get_vocab` and
 * the `slab://vocab` resource serve the current values instead.
 *
 * The full grammar is in `GET /openapi.json` (exposed as `slab://openapi`);
 * this is the well-trodden subset. Adding a filter is one line here and it
 * appears in both search tools at once.
 */

import { z } from 'zod';

/** A list-valued filter: any-of semantics. The API also accepts a CSV string. */
const list = (description: string) => z.array(z.string()).optional().describe(description);

export const cardFilterShape = {
  q: z.string().optional().describe('Free text across player name, set name, and card number. Start here when the user gave you a phrase rather than structured criteria.'),
  subject: z.string().optional().describe('Player name, case-insensitive substring match (e.g. "mcdavid").'),
  subject_exact: z.boolean().optional().describe('Match `subject` exactly instead of as a substring.'),
  card_number: z.string().optional().describe('Card number, exact match (e.g. "YG-201").'),

  set_slug: list('Set slug(s), any-of. Precise catalog membership. Slugs come from search_sets.'),
  brand: list('Brand name(s), any-of. Valid values come from get_vocab.'),
  subset: list('Subset / insert name(s), any-of (e.g. "Young Guns").'),
  year: z.number().int().optional().describe('Exact season-start year — 2025 means the 2025-26 season.'),
  year_min: z.number().int().optional().describe('Minimum season-start year, inclusive.'),
  year_max: z.number().int().optional().describe('Maximum season-start year, inclusive.'),
  team: list('Team name(s), any-of — the team the player is shown with on the card.'),
  league: list('League name(s), any-of.'),

  attribute: list('Attribute name(s), any-of (e.g. "Rookie", "Autograph"). Valid values come from get_vocab.'),
  attribute_all: list('Attribute name(s) the card must have ALL of.'),
  attribute_not: list('Attribute name(s) to exclude.'),
  rookie: z.boolean().optional().describe('Shortcut for attribute "Rookie".'),
  auto: z.boolean().optional().describe('Shortcut for attribute "Autograph".'),
  relic: z.boolean().optional().describe('Shortcut for attribute "Memorabilia".'),

  finish: list('Finish / parallel name(s), any-of (e.g. "Rainbow"). Valid values come from get_vocab.'),
  base_only: z.boolean().optional().describe('Only base printings (no finish).'),
  parallel_only: z.boolean().optional().describe('Only parallels (cards that have a finish).'),
  numbered_min: z.number().int().optional().describe('Print run at least this large.'),
  numbered_max: z.number().int().optional().describe('Print run at most this large — the lever for "rare" (e.g. 25).'),
  is_numbered: z.boolean().optional().describe('Only serial-numbered cards.'),
  is_1of1: z.boolean().optional().describe('Only one-of-ones.'),
} as const;

export const paginationShape = {
  limit: z.number().int().min(1).max(200).optional().describe('Results per page, 1-200. Default 25. Keep this small — every row costs context.'),
  offset: z.number().int().min(0).optional().describe('Rows to skip. Use with the total in the result header to page.'),
} as const;

/** Default page size. Lower than the API's own default of 50, on purpose. */
export const DEFAULT_LIMIT = 25;
