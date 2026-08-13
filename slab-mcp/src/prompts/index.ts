/**
 * Prompts — user-invoked workflows, surfaced in the host's slash menu.
 *
 * The distinction that matters: a tool is something the MODEL decides to call;
 * a prompt is something the USER picks. So these are not instructions to the
 * model about how to behave — they are starting points a person chooses, each
 * one encoding the sequence of tool calls that a question actually requires,
 * plus the caveats that stop a confident wrong answer.
 *
 * Adding a prompt: one entry in PROMPTS.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';

interface PromptModule {
  name: string;
  title: string;
  description: string;
  argsSchema: z.ZodType;
  render(args: Record<string, string | undefined>): string;
}

export const PROMPTS: PromptModule[] = [
  {
    name: 'appraise-collection',
    title: 'Appraise my collection',
    description: 'Summarise what the collection is worth, what it cost, and where the value is concentrated.',
    argsSchema: z.object({
      focus: z.string().optional().describe('Optional narrowing, e.g. "rookies", "graded only", "2024-25".'),
    }),
    render: (args) =>
      [
        'Appraise my card collection.',
        args.focus ? `Focus on: ${args.focus}.` : '',
        '',
        'Use get_dashboard for the headline numbers, then search_collection to find where the value',
        'sits. Report: total cost basis, current market value, unrealised gain/loss, and the handful',
        'of copies driving most of the value.',
        '',
        'Constraints on how you report it:',
        '- Call explain_metrics and use slab\'s own wording for every figure you quote. Do not',
        '  paraphrase what cost basis, ROI, or priced coverage mean.',
        '- Unrealised gain is paper, not money made. Say so.',
        '- Do not describe the portfolio series as performance. It steps up when I buy a card, so',
        '  differencing it mixes purchases with price movement. Use portfolio_change_7d for drift.',
        '- Flag any value resting on a small sample size instead of quoting it flat.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  {
    name: 'research-player',
    title: 'Research a player',
    description: "Survey a player's cards — what exists, what is scarce, and what the market is doing.",
    argsSchema: z.object({
      player: z.string().describe('Player name, e.g. "Connor Bedard".'),
      budget: z.string().optional().describe('Optional budget ceiling, e.g. "$200".'),
    }),
    render: (args) =>
      [
        `Research ${args.player}'s trading cards.`,
        args.budget ? `I am working with a budget of about ${args.budget}.` : '',
        '',
        'Start with search_cards filtered by subject, using facets to see how the cards break down by',
        'year, set, and finish rather than paging through every parallel. Then use get_card_pricing on',
        'the handful worth a closer look.',
        '',
        'Tell me: what the notable cards are, which are genuinely scarce (print run, not vibes), and',
        'what recent sales actually show. When you talk about movement, count real sales from the comps',
        'in the window — do not quote the 30-day appraisal drift as a market move.',
        args.budget ? 'End with what you would actually buy at my budget, and why.' : '',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  {
    name: 'grading-decision',
    title: 'Should I grade this card?',
    description: 'Weigh the cost of grading a card against the uplift it would need to pay for itself.',
    argsSchema: z.object({
      card: z.string().describe('Which card — a name, or a copy uuid from search_collection.'),
      grading_cost: z.string().optional().describe('What grading would cost, e.g. "$25".'),
    }),
    render: (args) =>
      [
        `Help me decide whether to grade: ${args.card}.`,
        args.grading_cost ? `Grading would cost about ${args.grading_cost}.` : '',
        '',
        'Find the card, then use get_card_pricing to compare the raw value against the graded values at',
        'each grade key. The gap is the grading uplift, and it only pays if it exceeds the grading cost',
        'at a grade the card would realistically receive.',
        '',
        'Be honest about the uncertainty: I do not know what grade it would get, and the graded value',
        'may rest on very few sales. Give me the break-even grade rather than a single recommendation,',
        'and say plainly if the sample is too thin to call.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
];

export function registerPrompts(server: McpServer): void {
  for (const prompt of PROMPTS) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: prompt.argsSchema as never,
      },
      ((args: Record<string, string | undefined>) => ({
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: prompt.render(args ?? {}) },
          },
        ],
      })) as never,
    );
  }
}
