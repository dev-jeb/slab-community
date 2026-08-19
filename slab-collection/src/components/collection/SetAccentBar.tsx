import { setAccent } from "@/lib/set-accent";

interface SetAccentBarProps {
  accentKey?: string | null;
}

/** Thin bottom edge — enough to cluster a grid, not enough to paint the card. */
export function SetAccentBar({ accentKey }: SetAccentBarProps) {
  if (!accentKey) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[3px] rounded-b-[0.7rem]"
      style={{ backgroundColor: setAccent(accentKey).bar }}
    />
  );
}
