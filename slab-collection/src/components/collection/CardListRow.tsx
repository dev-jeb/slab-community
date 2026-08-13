import Link from "next/link";

import { CopyStatusBadge } from "@/components/collection/CopyStatusBadge";
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
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";

interface CardListRowProps {
  copy: CardCopyOut;
  highlightChecklist?: boolean;
  highlightSerial?: boolean;
  ownedTotal?: number;
  compact?: boolean;
}

export function CardListRow({
  copy,
  highlightChecklist = false,
  highlightSerial = false,
  ownedTotal,
  compact = false,
}: CardListRowProps) {
  const card = copy.card;
  const fmv = copy.market?.fair_market_value;
  const gain = copy.market?.unrealized_gain_loss;
  const playerName = primarySubjectName(card?.subjects);
  const checklist = setChecklistNumber(card);
  const ownedSerial = ownedSerialLabel(copy);

  if (compact) {
    return (
      <Link
        href={`/cards/${copy.card_uuid}`}
        className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-500/40 hover:bg-slate-900/70"
      >
        <PlayerAvatar name={playerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-white">{cardTitle(card)}</p>
            <CopyStatusBadge copy={copy} />
            {ownedTotal && ownedTotal > 1 ? (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                ×{ownedTotal}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-400">{cardSubtitle(card)}</p>
          <p className="mt-1 text-xs text-slate-500">{gradeLabel(copy)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium text-white">{formatCurrency(fmv)}</p>
          <p className="mt-1 text-xs text-slate-500">{formatSignedCurrency(gain)}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/cards/${copy.card_uuid}`}
      className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-500/40 hover:bg-slate-900/70 lg:grid-cols-[auto_minmax(0,2fr)_repeat(5,minmax(0,1fr))] lg:items-center"
    >
      <PlayerAvatar name={playerName} size="sm" />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{cardTitle(card)}</p>
          <CopyStatusBadge copy={copy} />
          {ownedTotal && ownedTotal > 1 ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
              ×{ownedTotal}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-400">{cardSubtitle(card)}</p>
        <p className="mt-1 text-xs text-slate-500">{gradeLabel(copy)}</p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Set #
        </p>
        <p
          className={`mt-1 font-mono ${highlightChecklist ? "text-lg font-bold text-sky-300" : "text-white"}`}
        >
          {checklist ? `#${checklist}` : "—"}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Serial #
        </p>
        <p
          className={`mt-1 ${highlightSerial ? "text-lg font-bold text-amber-300" : "text-white"}`}
        >
          {ownedSerial ?? "—"}
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Market value
        </p>
        <p className="mt-1 font-medium text-white">{formatCurrency(fmv)}</p>
        <PriceConfidenceBadge
          sampleSize={copy.market?.sample_size}
          lowConfidence={copy.market?.low_confidence}
        />
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Cost basis
        </p>
        <p className="mt-1 text-white">{formatCurrency(copy.cost_basis)}</p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Unrealized
        </p>
        <p className="mt-1 text-white">{formatSignedCurrency(gain)}</p>
      </div>
    </Link>
  );
}
