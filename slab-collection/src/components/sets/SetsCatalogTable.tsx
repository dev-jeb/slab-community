"use client";

import { formatPricedPercent } from "@/lib/set-lookup-sort";
import { formatCurrency } from "@/lib/slab/format";
import type { SetOut } from "@/lib/slab/types";

interface SetsCatalogTableProps {
  sets: SetOut[];
  newSetUuids?: Set<string>;
}

export function SetsCatalogTable({
  sets,
  newSetUuids = new Set(),
}: SetsCatalogTableProps) {
  if (!sets.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">No sets match your search.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-500">
            <th className="pb-3 pr-4 font-medium">Set</th>
            <th className="pb-3 pr-4 font-medium">Brand</th>
            <th className="pb-3 pr-4 font-medium">Season</th>
            <th className="pb-3 pr-4 font-medium text-right">Year</th>
            <th className="pb-3 pr-4 font-medium">Sport</th>
            <th className="pb-3 pr-4 font-medium text-right">Cards</th>
            <th className="pb-3 pr-4 font-medium text-right">Priced</th>
            <th className="pb-3 pr-4 font-medium text-right">% Priced</th>
            <th className="pb-3 pr-4 font-medium text-right">90d sales</th>
            <th className="pb-3 font-medium text-right">Box</th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => {
            const isNew = newSetUuids.has(set.uuid);
            return (
              <tr
                key={set.uuid}
                className="border-b border-slate-800/60 last:border-0 hover:bg-slate-950/30"
              >
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {set.name ?? set.slug}
                    </span>
                    {isNew ? (
                      <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-300">
                        New
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-300">{set.brand ?? "—"}</td>
                <td className="py-3 pr-4 text-slate-300">{set.season ?? "—"}</td>
                <td className="py-3 pr-4 text-right text-slate-300">
                  {set.year ?? "—"}
                </td>
                <td className="py-3 pr-4 text-slate-300">{set.sport ?? "—"}</td>
                <td className="py-3 pr-4 text-right text-slate-300">
                  {set.card_count ?? "—"}
                </td>
                <td className="py-3 pr-4 text-right text-slate-300">
                  {set.priced_count ?? "—"}
                </td>
                <td className="py-3 pr-4 text-right text-slate-300">
                  {formatPricedPercent(set)}
                </td>
                <td className="py-3 pr-4 text-right text-slate-300">
                  {set.sales_90d ?? "—"}
                </td>
                <td className="py-3 text-right text-slate-300">
                  {formatCurrency(set.box_price)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
