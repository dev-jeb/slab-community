import Link from "next/link";

import { CopyStatusBadge } from "@/components/collection/CopyStatusBadge";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import type { CardCopyOut } from "@/lib/slab/types";
import {
  cardSubtitle,
  cardTitle,
  formatCurrency,
  formatSignedCurrency,
  gradeLabel,
  ownedSerialLabel,
  setChecklistNumber,
} from "@/lib/slab/format";

interface CardTileProps {
  copy: CardCopyOut;
  highlightChecklist?: boolean;
  highlightSerial?: boolean;
  ownedTotal?: number;
}

function gainTone(value?: string | null): string {
  if (!value) return "text-slate-400";
  const num = Number(value);
  if (num > 0) return "text-emerald-400";
  if (num < 0) return "text-rose-400";
  return "text-slate-400";
}

export function CardTile({
  copy,
  highlightChecklist = false,
  highlightSerial = false,
  ownedTotal,
}: CardTileProps) {
  const card = copy.card;
  const fmv = copy.market?.fair_market_value;
  const gain = copy.market?.unrealized_gain_loss;
  const playerName = primarySubjectName(card?.subjects);
  const checklist = setChecklistNumber(card);
  const ownedSerial = ownedSerialLabel(copy);

  return (
    <Link
      href={`/cards/${copy.card_uuid}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition hover:border-sky-500/40 hover:bg-slate-900"
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-300">
                {gradeLabel(copy)}
              </span>
              <CopyStatusBadge copy={copy} />
              {ownedTotal && ownedTotal > 1 ? (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  ×{ownedTotal}
                </span>
              ) : null}
            </div>
            {checklist ? (
              <span
                className={`rounded-full bg-slate-950/70 px-2 py-0.5 font-mono text-[10px] ${
                  highlightChecklist ? "text-sky-300" : "text-slate-300"
                }`}
              >
                #{checklist}
              </span>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-2">
            <PlayerAvatar
              name={playerName}
              size="lg"
              className="h-28 w-28 border-2 border-slate-700/80"
            />
            {highlightChecklist && checklist ? (
              <p className="mt-3 font-mono text-2xl font-bold tracking-wide text-white">
                #{checklist}
              </p>
            ) : null}
            {highlightSerial && ownedSerial ? (
              <p className="mt-2 text-lg font-semibold text-amber-300">
                Serial {ownedSerial}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {card?.brand ?? "Card"}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-semibold leading-tight text-white">
              {cardTitle(card)}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">
              {cardSubtitle(card)}
            </p>
            {checklist ? (
              <p className="mt-2 font-mono text-sm text-sky-300">
                Set #{checklist}
                {ownedSerial ? ` · Serial ${ownedSerial}` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-800 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Market value
            </p>
            <p className="text-xl font-semibold text-white">
              {formatCurrency(fmv)}
            </p>
            <PriceConfidenceBadge
              sampleSize={copy.market?.sample_size}
              lowConfidence={copy.market?.low_confidence}
            />
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Unrealized
            </p>
            <p className={`text-sm font-medium ${gainTone(gain)}`}>
              {formatSignedCurrency(gain)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Cost basis {formatCurrency(copy.cost_basis)}</span>
          {copy.quantity > 1 ? <span>Qty {copy.quantity}</span> : null}
        </div>
      </div>
    </Link>
  );
}
