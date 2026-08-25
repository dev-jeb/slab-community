import type { ReactElement } from "react";

import { LifecyclePanel } from "@/components/market/LifecyclePanel";

/**
 * The benchmarks the Market page shows, in order, stacked.
 *
 * **This list is the answer to "where does the next metric go".** It goes here and the page grows
 * a block for it. Appending only stays honest because each benchmark is a fixed-size object — a
 * title, a definition and a folder of three faces at one height — rather than an open-ended run of
 * prose and chrome; that is what a metrics page usually gets wrong. Revisit when the stack passes
 * a couple of screens: this list is also the seam a switcher or an index would hang off.
 *
 * The lifecycle curve's two universes are two entries rather than a toggle inside one, because
 * they answer different questions: what a card does as it ages, and what an unopened box does.
 * They share a recipe and a component, not a reading. Each carries its own calibration (the box
 * curve uses wider bins and a lower evidence bar — one identical SKU prices steadier than a single
 * card), so their numbers are not interchangeable and the page never implies they are.
 *
 * Each entry renders its own loading, empty and error states, because they aren't the same
 * question: each universe 404s until ITS build is published, so one can be live while the other
 * says so. A shared fetch here would have to flatten that into one vague message.
 *
 * `label` names the block for screen readers — short, the pool being measured. It is deliberately
 * not rendered: the metric's real name comes from its glossary entry inside the panel, where it
 * stays the API's word rather than ours.
 */
export interface Benchmark {
  id: string;
  label: string;
  render: () => ReactElement;
}

export const BENCHMARKS: Benchmark[] = [
  {
    id: "raw-cards",
    label: "Raw cards",
    render: () => (
      <LifecyclePanel
        universe="raw_cards"
        glossaryKey="lifecycle"
        itemNoun="card"
      />
    ),
  },
  {
    id: "hobby-boxes",
    label: "Hobby boxes",
    render: () => (
      <LifecyclePanel
        universe="hobby_boxes"
        glossaryKey="sealed_lifecycle"
        itemNoun="box"
      />
    ),
  },
];
