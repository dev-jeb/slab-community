"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { LiquidityPace } from "@/components/card-detail/LiquidityPace";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { formatCurrency, formatSignedCurrency } from "@/lib/slab/format";
import type {
  BreakEvenRegion,
  CollectionGradingDesk,
  GradingDeskEntry,
  MetricInfo,
} from "@/lib/slab/types";

/**
 * The Grading Desk sweep (My Collection → Grading Desk, `/?view=grading`): every raw copy in the
 * collection, desked and ranked
 * best-case first. This is the batch view where the per-card break-even bars become real odds —
 * graded as a group, wins at these bars pay for the losses.
 *
 * Same contracts as the per-card panel: the bar framing (never "X% of the time" for one card),
 * data statements only (never "send it" / "keep it raw" — the decision is the user's), and
 * metric meaning rendered from the response's `grading.*` glossary.
 */
export function GradingDeskView() {
  const [sweep, setSweep] = useState<CollectionGradingDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [feeInput, setFeeInput] = useState("");
  const appliedFee = useRef("");
  const [loading, startTransition] = useTransition();

  const load = useCallback((fee: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const params = fee ? `?fee=${encodeURIComponent(fee)}` : "";
        const response = await fetch(`/api/grading${params}`);
        const body = await response.json();
        if (!response.ok) {
          if (response.status === 503) {
            setNeedsSetup(true);
            return;
          }
          throw new Error(typeof body?.detail === "string" ? body.detail : "Request failed");
        }
        setSweep(body as CollectionGradingDesk);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  if (needsSetup) return <SetupPrompt />;

  const g = (key: string): MetricInfo | undefined => sweep?.glossary?.[`grading.${key}`];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Grading Desk</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400" title={g("ten_confidence_needed")?.detail}>
            {sweep
              ? `${sweep.deskable} of your ${sweep.total_raw_copies} raw copies have a graded market to read. Break-even is the chance of a gem at which grading and staying raw pay the same — below it grading loses, above it grading wins. You can see each card's corners; slab can't.`
              : "The grading math for every raw copy you own."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400" title={g("fee")?.detail}>
          Fee $
          <input
            type="number"
            min="0"
            step="1"
            placeholder="25"
            value={feeInput}
            onChange={(event) => setFeeInput(event.target.value)}
            onBlur={() => {
              if (feeInput !== appliedFee.current) {
                appliedFee.current = feeInput;
                load(feeInput);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            className="w-20 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-right text-slate-200 focus:border-sky-400/60 focus:outline-none"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {loading && !sweep ? (
        <p className="text-sm text-slate-500">Reading the graded market for your collection…</p>
      ) : null}

      {sweep && sweep.entries.length === 0 && !loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          None of your raw cards have graded sales to compare against yet, so there is no market
          to read. That&apos;s the honest answer, not an error — coverage grows as slab keeps
          collecting graded sales.
        </div>
      ) : null}

      {sweep && sweep.entries.length > 0 ? (
        <div className={`overflow-x-auto rounded-2xl border border-slate-800 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Card</th>
                <th className="px-4 py-3 font-medium">Raw value</th>
                <th className="px-4 py-3 font-medium" title={g("payoff")?.detail}>Gem pays</th>
                <th className="px-4 py-3 font-medium" title={g("payoff")?.detail}>Miss pays</th>
                <th className="px-4 py-3 font-medium" title={g("break_even")?.detail}>Break-even</th>
                <th className="px-4 py-3 font-medium">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {sweep.entries.map((entry) => (
                <SweepRow key={entry.copy_uuid} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {sweep ? <p className="text-xs text-slate-500">{sweep.fee_note}</p> : null}
    </div>
  );
}

// Descriptive labels for the regions with no bar to show — statements about the math, never
// instructions ("Send it" / "Keep raw" told the user what to do; slab shows, the user decides).
const BREAK_EVEN_BADGE: Record<BreakEvenRegion, { text: string; className: string }> = {
  pays_at_any_grade: { text: "any grade pays", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
  depends_on_grade: { text: "depends on grade", className: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  pays_at_no_grade: { text: "no grade pays", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
  not_enough_data: { text: "no data", className: "border-slate-700 bg-slate-800/40 text-slate-400" },
};

function SweepRow({ entry }: { entry: GradingDeskEntry }) {
  const desk = entry.desk;
  const badge = BREAK_EVEN_BADGE[desk.break_even];
  const gem = desk.lanes.find(
    (lane) => lane.grade_key.startsWith(`${desk.grading_company}-`) && lane.payoff != null,
  );
  const miss = desk.lanes.find((lane) => lane.grade_key === desk.miss_grade);
  const who = desk.subjects.join(", ") || (desk.card_number ? `#${desk.card_number}` : "—");
  const subtitle = [desk.set_name, desk.finish].filter(Boolean).join(" · ");
  const breakEven =
    desk.break_even === "depends_on_grade" && desk.ten_confidence_needed != null
      ? { text: `${Math.round(desk.ten_confidence_needed * 100)}% gem`, className: badge.className }
      : badge;

  return (
    <tr>
      <td className="px-4 py-3">
        <Link href={`/cards/${desk.card_uuid}`} className="text-slate-200 transition hover:text-white">
          {who}
        </Link>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </td>
      <td className="px-4 py-3 text-slate-300">
        {formatCurrency(desk.raw?.fair_market_value ?? null)}
      </td>
      <td className={`px-4 py-3 ${gem && Number(gem.payoff) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
        {gem?.payoff != null ? formatSignedCurrency(gem.payoff) : "—"}
        {/* The wait behind the win: a gem payoff at a grade that trades twice a year is a
            different bet than one that trades weekly. Absent until the API desks lane liquidity. */}
        {gem?.liquidity ? (
          <LiquidityPace
            liquidity={gem.liquidity}
            glossary={desk.glossary}
            className="block text-xs text-slate-500"
          />
        ) : null}
      </td>
      <td className={`px-4 py-3 ${miss && Number(miss.payoff) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
        {miss?.payoff != null ? formatSignedCurrency(miss.payoff) : "—"}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${breakEven.className}`}>
          {breakEven.text}
        </span>
        {desk.thin_data ? (
          <span
            className="ml-1 cursor-help text-amber-400"
            title="Thin data — this reading rests on very few sales."
          >
            !
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-slate-400">{entry.quantity}</td>
    </tr>
  );
}
