"use client";

import { CHROME } from "@/components/charts/theme";

export interface TooltipRow {
  /** Series name — secondary here; the reader already knows which series they asked about. */
  name: string;
  /** Preformatted value. Leads the row: it's what the hover was for. */
  value: string;
  /** The series color, worn by the short line key — never by the text. */
  color: string;
}

/**
 * The readout under the crosshair, shared by every chart so they all answer a hover the same way.
 *
 * Three rules from the chart method, all of them easy to get backwards:
 *  - **One tooltip, every series.** It lists every series at that x, so the pointer never has to
 *    land on a particular line to get its number.
 *  - **Values lead, labels follow.** The value is the high-contrast element and the series name is
 *    secondary — the legend's hierarchy inverted, because here you have the series and want the
 *    number.
 *  - **Line keys, not swatches.** A short stroke of the series color identifies the row; a filled
 *    box at this size is data-weight ink doing a label's job. Text never wears the series color.
 */
export function ChartTooltip({
  label,
  rows,
}: {
  label: string;
  rows: TooltipRow[];
}) {
  if (!rows.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ background: CHROME.tooltipBg, borderColor: CHROME.tooltipBorder }}
    >
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
        {label}
      </p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="font-mono text-sm tabular-nums text-white">
              {row.value}
            </span>
            <span className="text-[11px] text-[var(--text-dim)]">{row.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The legend key that rides above a chart — a stroke of the series color, then its name. */
export function SeriesKey({
  color,
  label,
  band = false,
}: {
  color: string;
  label: string;
  /** Draw the key as a filled wash instead of a stroke, for an area series. */
  band?: boolean;
}) {
  return (
    <span className="flex items-center gap-2 text-slate-300">
      <span
        aria-hidden="true"
        className={band ? "h-2.5 w-4 rounded-sm" : "h-0.5 w-5 rounded-full"}
        style={band ? { background: color, opacity: 0.35 } : { background: color }}
      />
      {label}
    </span>
  );
}
