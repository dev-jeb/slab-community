"use client";

import {
  confidenceToneClass,
  getPriceConfidence,
} from "@/lib/slab/confidence";

interface PriceConfidenceBadgeProps {
  sampleSize?: number | null;
  lowConfidence?: boolean | null;
}

export function PriceConfidenceBadge({
  sampleSize,
  lowConfidence,
}: PriceConfidenceBadgeProps) {
  const confidence = getPriceConfidence(sampleSize, lowConfidence);

  return (
    <div
      className="mt-1.5 flex flex-wrap items-center gap-2"
      title={confidence.description}
    >
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${confidenceToneClass(confidence.tone)}`}
      >
        {confidence.label} confidence
      </span>
      <span className="text-[11px] text-slate-500">
        {sampleSize && sampleSize > 0
          ? `${sampleSize} comp${sampleSize === 1 ? "" : "s"}`
          : "0 comps"}
      </span>
    </div>
  );
}
