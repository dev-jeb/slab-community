import { setAccent } from "@/lib/set-accent";

/**
 * Quiet 3px set color along the bottom edge. Pointer-events stay off so it never
 * steals clicks or hover from the card.
 */
export function SetAccentBar({ accentKey }: { accentKey?: string | null }) {
  if (!accentKey) return null;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] rounded-b-[0.7rem]"
      style={{ backgroundColor: setAccent(accentKey).bar }}
    />
  );
}
