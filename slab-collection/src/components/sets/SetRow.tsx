"use client";

import Link from "next/link";

import { releaseLabel } from "@/lib/set-label";
import { formatPricedPercent } from "@/lib/set-lookup-sort";
import { formatCurrency } from "@/lib/slab/format";
import type { SetOut } from "@/lib/slab/types";

/**
 * One product, as a row you can walk into.
 *
 * This was a ten-column table — set, brand, season, released, sport, cards, priced, % priced, 90d
 * sales, box — and it read as a spreadsheet export rather than as part of the app. Three problems,
 * all of them the same problem: every column was equally loud, so nothing was findable; `sport`
 * said "hockey" on all 106 rows; and brand, season and released are three ways of saying *which
 * release this is*, which belongs in a subtitle under the name rather than in three columns you
 * scan across.
 *
 * So it's the shape the rest of the app uses for a thing you can open — the same row as a card,
 * with the same press and hover. What survives on the right are the three numbers that answer a
 * different question each: what a box costs, whether anyone is trading it, and how big it is.
 */
export function SetRow({ set, isNew }: { set: SetOut; isNew?: boolean }) {
  const released = releaseLabel(set);
  const subtitle = [set.brand, set.season, released !== "—" ? released : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/sets/${set.uuid}`}
      className="pressable group grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-sky-500/40 hover:bg-slate-900/70 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] lg:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-white">{set.name ?? set.slug}</p>
          {isNew ? (
            <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-300">
              New
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-400">{subtitle}</p>
      </div>

      <Figure
        label="Box"
        value={set.box_price ? formatCurrency(set.box_price) : "—"}
        hint={set.box_price ? "hobby, latest" : "not priced yet"}
        strong
      />
      <Figure
        label="90d sales"
        value={set.sales_90d != null ? set.sales_90d.toLocaleString() : "—"}
        hint={set.sales_90d ? "recorded" : "none recorded"}
      />
      <Figure
        label="Cards"
        value={set.card_count != null ? set.card_count.toLocaleString() : "—"}
        hint={`${formatPricedPercent(set)} priced`}
      />
    </Link>
  );
}

/**
 * A labelled number in the row.
 *
 * The label rides with the value rather than living in a header, because at this width the row
 * wraps to a stack on a phone and a header three rows up stops being a label at all.
 */
function Figure({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="lg:text-right">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`font-mono tabular-nums ${
          strong ? "text-base text-white" : "text-sm text-slate-200"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}
