/**
 * The one place the charts get their colors, geometry and formatters.
 *
 * Both charts are Recharts (the same library the slab portal carries), and the series colors ARE
 * the app's accents — `sky-400` for what a thing is worth, foil for what it cost. Gold is the
 * money color everywhere else in slab, and warm-against-cool is the pairing that survives every
 * kind of color blindness.
 *
 * Checked with the dataviz validator against BOTH chart surfaces (`--surface-raised` #162040 for a
 * page panel, #1a2744 for a folder panel), in dark mode:
 *
 *   chroma floor    C 0.139 / 0.156, over the 0.10 floor — each reads as a hue, not a gray
 *   CVD separation  worst pair ΔE 25.5 (protanopia) / 24.5 (tritanopia), target is >= 8
 *   normal vision   ΔE 28.9, floor is 15
 *   contrast        6.9:1 – 8.6:1 on both surfaces, floor is 3:1
 *
 * One check they knowingly fail: the dark-mode LIGHTNESS BAND (0.48–0.67; these sit at 0.754 and
 * 0.804). The band exists so marks don't glare on a dark surface, and a dimmed pair — #0284c7 with
 * #b8860b — passed it. It was too quiet: the charts read as switched off next to an interface
 * built out of these two accents. Brand consistency won on purpose, so if a future palette pass
 * "fixes" this, it is undoing a decision rather than finding a bug. Everything the band is a proxy
 * for is measured above and passes with room.
 *
 * If you change a series color, re-run the validator — "these look different enough" is how a
 * palette stops being colorblind-safe without anyone noticing.
 */

/** Series colors — identity, assigned to an entity and never reassigned by rank. */
export const SERIES = {
  /** What a thing is worth today: FMV, portfolio market value, an index level. */
  value: "#38bdf8",
  /** What it cost: the portfolio's cost basis. The foil accent. */
  costBasis: "#f0b429",
} as const;

/** Chart chrome, one step off the surface so it stays recessive. */
export const CHROME = {
  /** Gridlines and the axis rule — hairline, SOLID (a dashed grid reads as a threshold). */
  grid: "#2a3a5c",
  /** Axis tick labels. --text-dim, 4.6:1 on the darker surface. */
  axisText: "#7a8baa",
  /** Tooltip card: the raised surface with a brighter edge so it lifts off the plot. */
  tooltipBg: "#0f1729",
  tooltipBorder: "#3d5a8a",
} as const;

/** Area fills are a wash, never a saturated block — the line stays the mark that carries value. */
export const BAND_OPACITY = 0.14;

/** 2px lines, >= 8px markers (r >= 4) with a 2px surface ring — the fixed mark specs. */
export const LINE_WIDTH = 2;
export const DOT_RADIUS = 4;

/**
 * A bare `YYYY-MM-DD` parses as UTC, so west of Greenwich every point lands on the previous day.
 * Noon keeps the label on the day the API actually reported.
 */
export function parseChartDate(value: string): number {
  return Date.parse(value.includes("T") ? value : `${value}T12:00:00`);
}

export function formatChartDate(time: number, withYear = false): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(
    "en-US",
    withYear
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" },
  );
}

/**
 * Axis money: whole dollars, thousands-comma'd, compacted past 10k so a tick reads as one token
 * rather than a wall of digits. Tick text is tabular elsewhere; here Recharts sets its own font.
 */
export function formatAxisCurrency(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 10_000) {
    return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }
  if (Math.abs(value) >= 100) return `$${Math.round(value).toLocaleString()}`;
  return `$${value.toFixed(2)}`;
}

/** A little headroom so the line never rides the top or bottom edge of the plot. */
export function paddedDomain(min: number, max: number): [number, number] {
  const span = max - min;
  const pad =
    span > 0
      ? span * 0.12
      : Math.max(Math.abs(min) * 0.08, min >= 100 ? 5 : min >= 10 ? 1 : 0.25);
  return [Math.max(0, min - pad), max + pad];
}
