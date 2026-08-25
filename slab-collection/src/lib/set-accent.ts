/**
 * Quiet per-set color, so a shelf of mixed products still clusters by set.
 *
 * The site is navy with foil-gold chrome, sky for actions, emerald/rose for money. Accents
 * here stay off those jobs: same lightness, different hue, low alpha, used as a thin bottom
 * edge rather than a fill. The pick is a hash of `set_slug`, so OPC Platinum is the same violet
 * wherever it appears.
 *
 * Only on rows that ARE a set — the set banners, the top-sets list. It used to run along the
 * bottom of every card row too, which put a different color under every line of a search result
 * and gave the reader nothing to do with any of them: the set is already written in the subtitle.
 */

interface AccentHue {
  h: number;
  s: number;
  l: number;
}

/** Jewel tones that sit on #0f1729 without reading as gold, sky, gain, or loss. */
const HUES: AccentHue[] = [
  { h: 268, s: 62, l: 74 }, // violet
  { h: 176, s: 52, l: 58 }, // teal
  { h: 312, s: 58, l: 72 }, // orchid
  { h: 22, s: 68, l: 68 }, // peach
  { h: 228, s: 58, l: 74 }, // periwinkle
  { h: 84, s: 42, l: 62 }, // olive
  { h: 338, s: 52, l: 70 }, // dusty pink
  { h: 192, s: 48, l: 62 }, // steel cyan (cooler / duller than action sky)
  { h: 252, s: 50, l: 72 }, // indigo
  { h: 48, s: 38, l: 62 }, // sand (desaturated so it isn't foil)
];

export interface SetAccent {
  bar: string;
  /** Open/selected wash. */
  wash: string;
  /** Open/selected ring. */
  ring: string;
  /** Full border when a set row is expanded. */
  border: string;
}

function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hsl({ h, s, l }: AccentHue, alpha: number): string {
  return `hsl(${h} ${s}% ${l}% / ${alpha})`;
}

export function setAccent(key?: string | null): SetAccent {
  const hue = HUES[hashKey(key?.trim() || "unknown") % HUES.length];
  return {
    bar: hsl(hue, 0.78),
    wash: hsl(hue, 0.1),
    ring: hsl(hue, 0.28),
    border: hsl(hue, 0.5),
  };
}
