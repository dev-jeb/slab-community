"use client";

import { BENCHMARKS } from "@/components/market/benchmarks";

/**
 * Market — catalog-level benchmarks built from real sales.
 *
 * This page is about the CATALOG, not your shelf: every other page here answers "what do I have
 * and what is it worth", and this one answers "what does a hockey card normally do". That's why
 * it's a top-level tab rather than a panel inside My Collection.
 *
 * **Benchmarks stack.** Each one is a fixed-size object — a title, a definition, and a folder of
 * three faces at one height — so a second doesn't push the first off the page the way an
 * appending page of prose and chrome would. That is what makes stacking safe here and what a
 * switcher would cost: the card curve and the box curve are the two sides of a rip decision, and
 * you can scroll from one to the other instead of losing one to see the other.
 *
 * A new benchmark is a line in `benchmarks.tsx`. Revisit this when the stack outgrows a couple of
 * screens — at that point the list earns a switcher or an index, and the registry is already the
 * seam for either.
 */
export function MarketView() {
  return (
    <div className="space-y-10">
      {BENCHMARKS.map((benchmark) => (
        // Each benchmark names itself inside its own chart, so the section carries the label for
        // screen readers rather than repeating it as a heading above the block.
        <section key={benchmark.id} aria-label={benchmark.label}>
          {benchmark.render()}
        </section>
      ))}
    </div>
  );
}
