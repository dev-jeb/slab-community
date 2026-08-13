export interface PriceConfidence {
  label: "High" | "Moderate" | "Low" | "Very low" | "No comps";
  tone: "emerald" | "amber" | "rose" | "slate";
  description: string;
}

export function getPriceConfidence(
  sampleSize?: number | null,
  lowConfidence?: boolean | null,
): PriceConfidence {
  const comps = sampleSize ?? 0;

  if (comps <= 0) {
    return {
      label: "No comps",
      tone: "slate",
      description: "No recent sales were used to price this card.",
    };
  }

  if (comps === 1 || lowConfidence) {
    return {
      label: comps === 1 ? "Very low" : "Low",
      tone: "rose",
      description: `Based on ${comps} recent sale${comps === 1 ? "" : "s"} in the last 90 days.`,
    };
  }

  if (comps < 5) {
    return {
      label: "Low",
      tone: "amber",
      description: `Based on ${comps} recent sales in the last 90 days.`,
    };
  }

  if (comps < 10) {
    return {
      label: "Moderate",
      tone: "amber",
      description: `Based on ${comps} recent sales in the last 90 days.`,
    };
  }

  return {
    label: "High",
    tone: "emerald",
    description: `Based on ${comps} recent sales in the last 90 days.`,
  };
}

export function confidenceScore(
  sampleSize?: number | null,
  lowConfidence?: boolean | null,
): number {
  const comps = sampleSize ?? 0;
  if (comps <= 0) return 0;
  if (comps === 1 || lowConfidence) return 1;
  if (comps < 5) return 2;
  if (comps < 10) return 3;
  return 4;
}

export function confidenceToneClass(tone: PriceConfidence["tone"]): string {
  switch (tone) {
    case "emerald":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "amber":
      return "text-amber-300 bg-amber-400/10 border-amber-400/20";
    case "rose":
      return "text-rose-300 bg-rose-400/10 border-rose-400/20";
    default:
      return "text-slate-400 bg-slate-400/10 border-slate-500/20";
  }
}
