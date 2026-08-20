"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { LiquidityPace } from "@/components/card-detail/LiquidityPace";
import { formatCurrency, formatSignedCurrency } from "@/lib/slab/format";
import type { BreakEvenRegion, GradingDesk, MetricInfo } from "@/lib/slab/types";

/**
 * The grading math — the per-card grading desk (GET /cards/{uuid}/grading-desk).
 *
 * Three contracts from the API carry through here untouched:
 *  - The desk computes a BAR, not a probability: the reading frames the number as where
 *    break-even sits for YOUR copy, never "how often it happens".
 *  - The desk describes, never prescribes: every sentence states what the prices show; whether
 *    to grade stays the user's call (grading is subjective and they're holding the card).
 *  - Metric meaning renders from the response's embedded `grading.*` glossary (tooltips + the
 *    section explainer), so this panel, the CLI, and the API docs always say the same words.
 */
export function GradingDeskPanel({ cardUuid }: { cardUuid: string }) {
  const [desk, setDesk] = useState<GradingDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState("");
  const appliedFee = useRef<string>("");
  const [loading, startTransition] = useTransition();

  const load = useCallback((fee: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const params = fee ? `?fee=${encodeURIComponent(fee)}` : "";
        const response = await fetch(`/api/cards/${cardUuid}/grading${params}`);
        const body = await response.json();
        if (!response.ok) {
          throw new Error(typeof body?.detail === "string" ? body.detail : "Request failed");
        }
        setDesk(body as GradingDesk);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      }
    });
  }, [cardUuid]);

  useEffect(() => {
    load("");
  }, [load]);

  const applyFee = () => {
    if (feeInput === appliedFee.current) return;
    appliedFee.current = feeInput;
    load(feeInput);
  };

  if (error) {
    // A desk that can't load shouldn't break the card page — say so quietly and move on.
    return (
      <section>
        <h3 className="text-lg font-semibold text-white">The grading math</h3>
        <p className="mt-2 text-sm text-slate-400">Couldn&apos;t load the grading desk: {error}</p>
      </section>
    );
  }
  if (!desk) {
    return (
      <section>
        <h3 className="text-lg font-semibold text-white">The grading math</h3>
        <p className="mt-2 text-sm text-slate-500">Reading the graded market…</p>
      </section>
    );
  }

  const g = (key: string): MetricInfo | undefined => desk.glossary?.[`grading.${key}`];

  return (
    <section className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">The grading math</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-400" title={g("ten_confidence_needed")?.detail}>
            {g("ten_confidence_needed")?.summary ??
              "How likely a gem would have to be for grading and keeping it raw to pay the same."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400" title={g("fee")?.detail}>
          {desk.grading_company} fee $
          <input
            type="number"
            min="0"
            step="1"
            placeholder={desk.fee}
            value={feeInput}
            onChange={(event) => setFeeInput(event.target.value)}
            onBlur={applyFee}
            onKeyDown={(event) => {
              if (event.key === "Enter") (event.target as HTMLInputElement).blur();
            }}
            className="w-20 rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1 text-right text-slate-200 focus:border-sky-400/60 focus:outline-none"
          />
        </label>
      </div>

      <BreakEvenBanner desk={desk} breakEvenInfo={g("break_even")} />

      {desk.lanes.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">If it grades</th>
                <th className="px-3 py-2 font-medium">Sells for</th>
                <th className="px-3 py-2 font-medium" title={g("payoff")?.detail}>
                  You clear
                </th>
                <th className="px-3 py-2 font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {desk.lanes.map((lane) => (
                <tr key={lane.grade_key}>
                  <td className="px-3 py-2 text-slate-200">{lane.grade_key}</td>
                  <td className="px-3 py-2 text-white">{formatCurrency(lane.fair_market_value)}</td>
                  <td className={`px-3 py-2 ${payoffTone(lane.payoff)}`}>
                    {lane.payoff != null ? formatSignedCurrency(lane.payoff) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {lane.sample_size}
                    {lane.low_confidence ? (
                      <span
                        className="ml-1 text-amber-400"
                        title="Priced off very few sales — an anecdote, not a market."
                      >
                        !
                      </span>
                    ) : null}
                    {/* A payoff at a grade that trades twice a year is a different wait than one
                        that trades weekly. Conditional: lanes without liquidity render as before. */}
                    <LiquidityPace
                      liquidity={lane.liquidity}
                      glossary={desk.glossary}
                      className="ml-2 text-xs text-slate-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        Raw value {formatCurrency(desk.raw?.fair_market_value ?? null)}
        {desk.raw?.sample_size ? ` (from ${desk.raw.sample_size} sales)` : ""} · payoffs are after
        the {formatCurrency(desk.fee)} fee
        {desk.fee_source === "default" ? " — an approximate default; enter your rate above" : " (your rate)"}
        .
      </p>
      {desk.thin_data ? (
        <p className="mt-1 text-xs text-amber-400/90">
          Thin data — part of this reading rests on 1–2 sales. Treat it as a hint, not a market
          reading.
        </p>
      ) : null}
    </section>
  );
}

function payoffTone(payoff?: string | null): string {
  if (payoff == null) return "text-slate-400";
  return Number(payoff) >= 0 ? "text-emerald-300" : "text-rose-300";
}

const BREAK_EVEN_STYLE: Record<BreakEvenRegion, string> = {
  pays_at_any_grade: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  depends_on_grade: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  pays_at_no_grade: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  not_enough_data: "border-slate-700 bg-slate-800/40 text-slate-300",
};

/** Where the math lands, as one plain DATA sentence — same framing as the CLI, built from the
 *  desk's own fields so the wording tracks the data, with glossary detail on hover. Never an
 *  instruction: the reader is holding the card, and the send/keep decision is theirs. */
function BreakEvenBanner({
  desk,
  breakEvenInfo,
}: {
  desk: GradingDesk;
  breakEvenInfo?: MetricInfo;
}) {
  const payoffOf = (gradeKey?: string | null) =>
    desk.lanes.find((lane) => lane.grade_key === gradeKey)?.payoff ?? null;
  const gem = desk.lanes.find((lane) => lane.grade_key.startsWith(`${desk.grading_company}-`));

  let headline: string;
  let sub: string | null = null;

  if (desk.break_even === "not_enough_data") {
    headline = "No graded market to read yet";
    sub = "Nobody has sold graded copies of this card recently. Not a no — an honest shrug.";
  } else if (desk.break_even === "pays_at_no_grade") {
    headline = "No grade covers the fee";
    sub = gem?.payoff != null
      ? `At today's prices even a ${gem.grade_key} returns ${formatSignedCurrency(gem.payoff)} after the ${formatCurrency(desk.fee)} fee.`
      : `At today's prices no grade covers the ${formatCurrency(desk.fee)} fee.`;
  } else if (desk.break_even === "pays_at_any_grade") {
    const missPayoff = payoffOf(desk.miss_grade);
    headline = "Every grade pays";
    sub = missPayoff != null
      ? `At today's prices even a ${desk.miss_grade} nets ${formatSignedCurrency(missPayoff)} after the fee.`
      : "At today's prices even a realistic miss nets more than staying raw.";
  } else {
    const pct = desk.ten_confidence_needed != null
      ? `${Math.round(desk.ten_confidence_needed * 100)}%`
      : "—";
    headline = `Depends on the grade — break-even sits at ${pct}`;
    const gemText = gem?.payoff != null
      ? `a ${gem.grade_key} nets ${formatSignedCurrency(gem.payoff)}`
      : null;
    const missPayoff = payoffOf(desk.miss_grade);
    const missText = desk.miss_grade === "raw value"
      ? "a miss holds roughly raw value"
      : missPayoff != null
        ? `a ${desk.miss_grade} comes back ${formatSignedCurrency(missPayoff)}`
        : null;
    const outcomes = [gemText, missText].filter(Boolean).join("; ");
    sub = [
      outcomes || null,
      `Below a ${pct} chance of a gem, grading loses; above it, grading wins. You can see the card — that read is yours.`,
    ]
      .filter(Boolean)
      .join(". ");
  }

  const badDay =
    (desk.break_even === "pays_at_any_grade" || desk.break_even === "depends_on_grade") &&
    desk.ten_confidence_needed_bad_day != null &&
    desk.bad_day_grade
      ? `Cautious read: if misses come back ${desk.bad_day_grade} instead, break-even moves to ${Math.round(desk.ten_confidence_needed_bad_day * 100)}%.`
      : null;

  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 ${BREAK_EVEN_STYLE[desk.break_even]}`}
      title={breakEvenInfo?.detail}
    >
      <p className="font-semibold">{headline}</p>
      {sub ? <p className="mt-1 text-sm opacity-90">{sub}</p> : null}
      {badDay ? <p className="mt-1 text-xs opacity-75">{badDay}</p> : null}
    </div>
  );
}
