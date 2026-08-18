import Link from "next/link";

import { CopyStatusBadge } from "@/components/collection/CopyStatusBadge";
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { gainTone as sharedGainTone } from "@/components/ui/StatCard";
import type { CardRow } from "@/lib/card-row";
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
  row: CardRow;
  highlightChecklist?: boolean;
  highlightSerial?: boolean;
}

/**
 * Denser surface than a stat card, so flat/unknown rests dimmer than the shared default. The
 * gain/loss logic itself is shared — it was copied into three files and had already drifted.
 */
function gainTone(value?: string | null): string {
  return sharedGainTone(value, "text-slate-400");
}

/**
 * One card, as a tile — a copy you own or a catalog printing.
 *
 * The card half (art, player, set, checklist number, market value) is identical either way; only
 * the footer differs, because only a copy has a cost basis and only a catalog row can tell you
 * that you own none of it. See CardRow for why that's one component and not two.
 */
export function CardTile({
  row,
  highlightChecklist = false,
  highlightSerial = false,
}: CardTileProps) {
  const { card, copy } = row;
  const playerName = primarySubjectName(card?.subjects);
  const checklist = setChecklistNumber(card);
  const ownedSerial = copy ? ownedSerialLabel(copy) : null;
  const owned = row.ownedCount ?? 0;

  return (
    <Link
      href={`/cards/${row.cardUuid}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition hover:border-sky-500/40 hover:bg-slate-900"
    >
      <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {copy ? (
                <>
                  <span className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sky-300">
                    {gradeLabel(copy)}
                  </span>
                  <CopyStatusBadge copy={copy} />
                </>
              ) : null}
              {owned > 1 || (!copy && owned > 0) ? (
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  {copy ? `×${owned}` : `Owned ×${owned}`}
                </span>
              ) : null}
              {row.printingCount && row.printingCount > 1 ? (
                <span className="rounded-full border border-slate-600 bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                  {row.printingCount} printings
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

      {/* A price belongs to a PRINTING, not to a card: the base and its /10 parallel are worth
          wildly different money, and a catalog row is the whole slot folded into one. So money
          shows on a copy you own (that's a specific printing) and never on a catalog row — open
          the card for per-printing prices, comps and history. */}
      {copy ? (
        <div className="space-y-3 border-t border-slate-800 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Market value
              </p>
              <p className="text-xl font-semibold text-white">
                {formatCurrency(row.fmv)}
              </p>
              <PriceConfidenceBadge
                sampleSize={row.sampleSize ?? undefined}
                lowConfidence={row.lowConfidence ?? undefined}
              />
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Unrealized
              </p>
              <p
                className={`text-sm font-medium ${gainTone(
                  copy.market?.unrealized_gain_loss,
                )}`}
              >
                {formatSignedCurrency(copy.market?.unrealized_gain_loss)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cost basis {formatCurrency(copy.cost_basis)}</span>
            {copy.quantity > 1 ? <span>Qty {copy.quantity}</span> : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 p-4 text-xs text-slate-500">
          <span>
            {row.printingCount && row.printingCount > 1
              ? `${row.printingCount} printings`
              : "No parallels"}
          </span>
          <span className="text-sky-400">Prices & sales →</span>
        </div>
      )}
    </Link>
  );
}
