"use client";

import { useRouter } from "next/navigation";

/**
 * A back control that actually goes back.
 *
 * The card page used to hardcode this as a link to the search screen, so "Back" from a card you
 * reached via the collection, the chase board, or another card's rainbow dumped you somewhere you
 * hadn't been — and hopping three printings deep meant Back skipped you past all of them. Real
 * history is the only thing that unwinds those paths correctly. The fallback covers the one case
 * with no history to go back to: a card opened directly by URL, where `fallback` names the page
 * that most plausibly comes "before" a card.
 */
export function BackButton({ fallback = "/search" }: { fallback?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-slate-400 transition hover:text-slate-200"
    >
      ← Back
    </button>
  );
}
