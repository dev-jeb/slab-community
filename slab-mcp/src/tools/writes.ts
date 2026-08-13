/**
 * Write tools — registered only when SLAB_MCP_WRITE=1.
 *
 * Everything in this file has `mutates: true`, which is what the registry
 * checks; `tests/registry.test.ts` fails the build if a tool in here forgets
 * it, or claims `readOnlyHint: true`.
 *
 * These write to a real person's records, so the descriptions say what a wrong
 * call actually costs — a duplicated copy quietly doubles a reported
 * collection value, and a break's total cost is divided across every card
 * pulled from it, so the wrong figure re-prices dozens of cards at once.
 */

import { z } from 'zod';
import { text } from '../format.js';
import type { CardCopyOut } from '../types.js';
import { CREATES, DELETES, UPDATES, defineTool } from './types.js';

const collectorArg = z
  .string()
  .optional()
  .describe('Collector UUID. Omit it — the server uses the collector this API key acts for.');

const isoDate = (description: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be an ISO date, YYYY-MM-DD').describe(description);

export const addCopy = defineTool({
  name: 'add_copy',
  title: 'Add a card to the collection',
  description:
    'Record one physical copy the user owns. `card_uuid` comes from search_cards — a parallel is its ' +
    'own card, so make sure you picked the right finish before adding, not just the right player.\n\n' +
    'This is not idempotent: calling it twice adds two copies and doubles that card\'s contribution ' +
    'to the collection\'s value. Search the collection first if there is any chance the copy is ' +
    'already recorded.\n\n' +
    'Cost: pass `acquisition_cost` for a straight purchase. If the card came out of a sealed product, ' +
    'log the break with log_break and pass `break_uuid` instead — the break\'s cost is then split ' +
    'across every card pulled from it, which is the honest cost basis for a pack pull. Same idea with ' +
    '`lot_uuid` for a multi-card purchase. Do not pass both a cost and a container.\n\n' +
    'If you do not know a field, leave it out. Do not guess a serial number, a grade, or a price.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    card_uuid: z.string().describe('Catalog card UUID, from search_cards.'),
    quantity: z.number().int().min(1).optional().describe('Only for identical, ungraded, interchangeable duplicates. Default 1.'),
    serial_number: z.number().int().optional().describe('This copy\'s serial, the "54" of /100. Omit unless the card is actually numbered.'),
    grading_company: z.string().optional().describe('PSA, BGS, SGC, or CGC. Omit for a raw card.'),
    grade: z.string().optional().describe('The grade on the slab, e.g. "10", "9.5", "Authentic".'),
    cert_number: z.string().optional().describe('Certification number from the slab.'),
    self_grade: z.number().int().min(1).max(10).optional().describe('The user\'s own 1-10 assessment of a raw card.'),
    acquisition_type: z.enum(['purchase', 'pack_pull', 'trade', 'gift', 'other']).optional().describe('How the copy was acquired.'),
    acquisition_cost: z.number().min(0).optional().describe('What this copy cost. Leave unset for a pull or a gift, and unset when passing break_uuid or lot_uuid.'),
    acquired_date: z.string().optional().describe('ISO date (YYYY-MM-DD). Defaults to today. Matters: the portfolio series values a copy only from this date onward.'),
    acquired_source: z.string().optional().describe('Where it came from, e.g. "eBay", "card show".'),
    break_uuid: z.string().optional().describe('The break this card was pulled from, from log_break. Sets the cost basis by division.'),
    lot_uuid: z.string().optional().describe('The multi-card purchase this came from, from log_lot.'),
    storage_location: z.string().optional().describe('Where the physical card lives, e.g. "binder 3", "safe deposit box".'),
    notes: z.string().optional().describe('Free-text note about this copy. Condition observations, provenance, anything the fields do not capture.'),
  }),
  annotations: CREATES,
  mutates: true,
  async handler(input, ctx) {
    const { collector_uuid, ...body } = input;
    const collector = await ctx.collector(collector_uuid);
    const copy = await ctx.client.request<CardCopyOut>('POST', `/collectors/${collector}/copies`, { body });
    return text(`Added copy ${copy.uuid} of card ${copy.card_uuid}.`, 'Use this copy uuid for update_copy or remove_copy.');
  },
});

export const updateCopy = defineTool({
  name: 'update_copy',
  title: 'Update a copy already in the collection',
  description:
    'Change fields on a copy the user already owns. `copy_uuid` comes from search_collection (it is ' +
    'the copy uuid, not the card uuid). Only the fields you pass are changed.\n\n' +
    'To record a sale, set `status` to "sold" and pass `sale_price` and `sold_date`. That is what ' +
    'turns paper gain into realised gain, so get the figure right rather than approximating it.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    copy_uuid: z.string().describe('Copy UUID, from search_collection.'),
    quantity: z.number().int().min(1).optional().describe('New quantity, for identical ungraded duplicates collapsed into one row.'),
    serial_number: z.number().int().optional().describe("This copy's serial, the \"54\" of /100."),
    grading_company: z.string().optional().describe('PSA, BGS, SGC, or CGC. Set this when a raw card comes back from grading.'),
    grade: z.string().optional().describe('The grade on the slab, e.g. "10", "9.5", "Authentic".'),
    cert_number: z.string().optional().describe('Certification number from the slab.'),
    self_grade: z.number().int().min(1).max(10).optional().describe("The user's own 1-10 assessment of a raw card."),
    acquisition_type: z.enum(['purchase', 'pack_pull', 'trade', 'gift', 'other']).optional().describe('How the copy was acquired.'),
    acquisition_cost: z.number().min(0).optional().describe('What this copy cost. Only for standalone copies — a copy attached to a break or lot derives its cost from the container.'),
    acquired_date: z.string().optional().describe('ISO date (YYYY-MM-DD) the copy was acquired. Changes where it enters the portfolio series.'),
    acquired_source: z.string().optional().describe('Where it came from, e.g. "eBay", "card show".'),
    status: z.enum(['in_collection', 'for_trade', 'for_sale', 'sold']).optional().describe('Set to "sold" to record a sale — pair it with sale_price and sold_date.'),
    sale_price: z.number().min(0).optional().describe('What it actually sold for. Required in practice when status is "sold"; this is what turns paper gain into realised gain.'),
    sold_date: z.string().optional().describe('ISO date (YYYY-MM-DD) of the sale.'),
    storage_location: z.string().optional().describe('Where the physical card lives.'),
    notes: z.string().optional().describe('Free-text note about this copy.'),
  }),
  annotations: UPDATES,
  mutates: true,
  async handler(input, ctx) {
    const { collector_uuid, copy_uuid, ...body } = input;
    const collector = await ctx.collector(collector_uuid);
    const copy = await ctx.client.request<CardCopyOut>('PATCH', `/collectors/${collector}/copies/${copy_uuid}`, { body });
    return text(`Updated copy ${copy.uuid}.`);
  },
});

export const removeCopy = defineTool({
  name: 'remove_copy',
  title: 'Delete a copy from the collection',
  description:
    'Permanently delete a copy record and its cost history. There is no undo and no trash — the ' +
    'purchase price, grading costs, and acquisition date are gone with it.\n\n' +
    'This is for correcting a mistaken entry. If the user SOLD the card, do not use this: call ' +
    'update_copy with status "sold" instead, which keeps the record and computes the realised gain. ' +
    'Deleting a sold card erases the profit it made.\n\n' +
    'Confirm with the user before calling this.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    copy_uuid: z.string().describe('Copy UUID, from search_collection.'),
  }),
  annotations: DELETES,
  mutates: true,
  async handler(input, ctx) {
    const collector = await ctx.collector(input.collector_uuid);
    await ctx.client.request<void>('DELETE', `/collectors/${collector}/copies/${input.copy_uuid}`);
    return text(`Deleted copy ${input.copy_uuid}.`);
  },
});

export const logBreak = defineTool({
  name: 'log_break',
  title: 'Log a sealed product that was opened',
  description:
    'Record that the user opened a sealed product — a box, case, or pack — and what it cost. Returns ' +
    'a break uuid to pass as `break_uuid` on each add_copy for the cards pulled from it.\n\n' +
    'This is how pack pulls get an honest cost basis: the break\'s total cost is divided across the ' +
    'copies linked to it, so the split changes every time another card is added. Log the break first, ' +
    'then add the cards.\n\n' +
    '`set_uuid` comes from search_sets.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    set_uuid: z.string().describe('UUID of the product that was opened, from search_sets.'),
    break_type: z.string().describe('Format opened, e.g. hobby_box, hobby_case, blaster_box, retail_pack. Call get_vocab for the current list.'),
    total_cost: z.number().min(0).describe('Total paid for the sealed product.'),
    break_date: isoDate('Date the product was opened (YYYY-MM-DD).'),
    source: z.string().optional().describe('Where it was bought, e.g. "eBay", "LCS".'),
    notes: z.string().optional().describe('Free-text note about this break.'),
  }),
  annotations: CREATES,
  mutates: true,
  async handler(input, ctx) {
    const { collector_uuid, ...body } = input;
    const collector = await ctx.collector(collector_uuid);
    const result = await ctx.client.request<{ uuid: string }>('POST', `/collectors/${collector}/breaks`, { body });
    return text(`Logged break ${result.uuid}.`, 'Pass this as `break_uuid` on add_copy for each card pulled from it.');
  },
});

export const logLot = defineTool({
  name: 'log_lot',
  title: 'Log a multi-card purchase',
  description:
    'Record a single purchase of several cards for one price — a lot, a collection buy, a trade-in. ' +
    'Returns a lot uuid to pass as `lot_uuid` on each add_copy.\n\n' +
    'Same mechanic as log_break, without a sealed product: the total is divided across the copies ' +
    'linked to the lot, which is the only defensible way to price cards bought as a bundle.',
  inputSchema: z.object({
    collector_uuid: collectorArg,
    total_cost: z.number().min(0).describe('Total paid for the whole purchase.'),
    lot_date: isoDate('Date of the purchase (YYYY-MM-DD).'),
    source: z.string().optional().describe('Where it was bought, e.g. "eBay", a seller, "card show".'),
    notes: z.string().optional().describe('Free-text note about this purchase.'),
  }),
  annotations: CREATES,
  mutates: true,
  async handler(input, ctx) {
    const { collector_uuid, ...body } = input;
    const collector = await ctx.collector(collector_uuid);
    const result = await ctx.client.request<{ uuid: string }>('POST', `/collectors/${collector}/lots`, { body });
    return text(`Logged lot ${result.uuid}.`, 'Pass this as `lot_uuid` on add_copy for each card in it.');
  },
});

export const writeTools = [addCopy, updateCopy, removeCopy, logBreak, logLot];
