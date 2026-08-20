import type { Liquidity, LiquidityLabel, MetricInfo } from "@/lib/slab/types";

/**
 * The liquidity pace label, rendered wherever a price appears — an FMV means different things at
 * 60 sales per 90 days and at 2, and this is the reader's cue for which one they're looking at.
 *
 * Two contracts from the API carry through untouched:
 *  - Descriptive, never prescriptive: the pace states what was observed. No green/red tones here
 *    on purpose — a rarely-selling card isn't bad, and coloring it would say otherwise.
 *  - Metric MEANING renders from the response's `liquidity.*` glossary (the tooltip), so this
 *    page, the CLI, and the API docs say the same words. The pace values themselves are vocab
 *    (`liquidity_labels`), humanized mechanically below.
 */
const PACE_TEXT: Record<LiquidityLabel, string> = {
  sells_daily: "Sells daily",
  sells_weekly: "Sells weekly",
  sells_monthly: "Sells monthly",
  sells_every_few_months: "Sells every few months",
  sells_rarely: "Sells rarely",
  no_recent_sales: "No recent sales",
  too_new_to_say: "Too new to say",
};

export function liquidityPaceText(label: LiquidityLabel): string {
  return PACE_TEXT[label] ?? label;
}

/** The observed stats behind the label, each named by its glossary entry — never by a caption
 *  written here. Skips stats the API reported as uncomputable (an honest null is not a 0). */
function statsLine(
  liquidity: Liquidity,
  glossary?: Record<string, MetricInfo>,
): string {
  const name = (key: string, fallback: string) =>
    glossary?.[`liquidity.${key}`]?.label ?? fallback;

  const parts = [
    `${name("sales_90d", "Sales (90 Days)")}: ${liquidity.sales_90d}`,
    `${name("sales_365d", "Sales (1 Year)")}: ${liquidity.sales_365d}`,
  ];
  if (liquidity.median_days_between_sales != null) {
    parts.push(
      `${name("median_days_between_sales", "Days Between Sales")}: ${liquidity.median_days_between_sales}`,
    );
  }
  return parts.join(" · ");
}

export function LiquidityPace({
  liquidity,
  glossary,
  className = "",
}: {
  liquidity?: Liquidity | null;
  /** The response's glossary — names the stats in the tooltip and explains the label. */
  glossary?: Record<string, MetricInfo>;
  className?: string;
}) {
  if (!liquidity) return null;

  const detail = glossary?.["liquidity.label"]?.detail;
  const title = detail
    ? `${statsLine(liquidity, glossary)}\n\n${detail}`
    : statsLine(liquidity, glossary);

  return (
    <span
      // No color of its own — it inherits, so each surface's tone wins without a class fight.
      className={`cursor-help whitespace-nowrap ${className}`}
      title={title}
    >
      {liquidityPaceText(liquidity.label)}
    </span>
  );
}
