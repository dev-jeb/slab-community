import Link from "next/link";

import { CopyStatusBadge } from "@/components/collection/CopyStatusBadge";
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
import { PriceConfidenceBadge } from "@/components/collection/PriceConfidenceBadge";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import { SetAccentBar } from "@/components/collection/SetAccentBar";
import { setAccentKey } from "@/lib/set-accent";

interface CardListRowProps {
  row: CardRow;
  highlightChecklist?: boolean;
  highlightSerial?: boolean;
  compact?: boolean;
}

/**
 * One card, as a row. Same two shapes as CardTile: a copy you own, or a catalog printing.
 *
 * The last three columns are the ones that change. A copy reports serial / market / cost basis /
 * unrealized; a catalog printing reports print run / market / whether you own one — because
 * "do I have this?" is the question you're asking when the table is pointed at the whole catalog.
 */
export function CardListRow({
  row,
  highlightChecklist = false,
  highlightSerial = false,
  compact = false,
}: CardListRowProps) {
  const { card, copy } = row;
  const playerName = primarySubjectName(card?.subjects);
  const checklist = setChecklistNumber(card);
  const ownedSerial = copy ? ownedSerialLabel(copy) : null;
  const owned = row.ownedCount ?? 0;
  const accentKey = setAccentKey(card);

  const ownedBadge =
    owned > 1 || (!copy && owned > 0) ? (
      <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
        {copy ? `×${owned}` : `Owned ×${owned}`}
      </span>
    ) : null;

  if (compact) {
    return (
      <Link
        href={`/cards/${row.cardUuid}`}
        className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-sky-500/40 hover:bg-slate-900/70"
      >
        <SetAccentBar accentKey={accentKey} />
        <PlayerAvatar name={playerName} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-white">{cardTitle(card)}</p>
            {copy ? <CopyStatusBadge copy={copy} /> : null}
            {ownedBadge}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-400">{cardSubtitle(card)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {copy ? gradeLabel(copy) : (card?.set_name ?? "")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {copy ? (
            <>
              <p className="font-medium text-white">{formatCurrency(row.fmv)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatSignedCurrency(copy.market?.unrealized_gain_loss)}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                {row.printingCount ?? 1} printing
                {(row.printingCount ?? 1) === 1 ? "" : "s"}
              </p>
              <span className="mt-1 inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200 transition group-hover:bg-sky-500/25">
                Prices →
              </span>
            </>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/cards/${row.cardUuid}`}
      className="group relative grid gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-500/40 hover:bg-slate-900/70 lg:grid-cols-[auto_minmax(0,2fr)_repeat(5,minmax(0,1fr))] lg:items-center"
    >
      <SetAccentBar accentKey={accentKey} />
      <PlayerAvatar name={playerName} size="sm" />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-white">{cardTitle(card)}</p>
          {copy ? <CopyStatusBadge copy={copy} /> : null}
          {ownedBadge}
          {row.printingCount && row.printingCount > 1 ? (
            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {row.printingCount} printings
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-400">{cardSubtitle(card)}</p>
        <p className="mt-1 text-xs text-slate-500">
          {copy ? gradeLabel(copy) : [card?.brand, card?.season].filter(Boolean).join(" · ")}
        </p>
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

      {/* Serial, price, basis and P&L all describe a single printing you hold. A catalog row is a
          card with its parallels folded in, so it reports what's true of the whole slot and sends
          you to the card for the per-printing money. */}
      {copy ? (
        <>
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
            <p className="mt-1 font-medium text-white">{formatCurrency(row.fmv)}</p>
            <PriceConfidenceBadge
              sampleSize={row.sampleSize ?? undefined}
              lowConfidence={row.lowConfidence ?? undefined}
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
            <p className="mt-1 text-white">
              {formatSignedCurrency(copy.market?.unrealized_gain_loss)}
            </p>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Subset
            </p>
            <p className="mt-1 truncate text-white">{card?.subset ?? "—"}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Printings
            </p>
            <p className="mt-1 text-white">{row.printingCount ?? 1}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Owned
            </p>
            <p
              className={`mt-1 font-medium ${owned > 0 ? "text-emerald-300" : "text-slate-500"}`}
            >
              {owned > 0 ? `×${owned}` : "—"}
            </p>
          </div>

          {/* Styled as the button it acts as. The row is one link, so this is a shape, not a
              nested anchor — but it has to read as "press me", not as a stray caption. */}
          <div>
            <span className="inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200 transition group-hover:border-sky-400/60 group-hover:bg-sky-500/25">
              Prices &amp; sales →
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
