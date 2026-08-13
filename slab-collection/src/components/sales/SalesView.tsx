"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { PlayerAvatar, primarySubjectName } from "@/components/collection/PlayerAvatar";
import {
  formatListingNotes,
  parseAskAmount,
  parseListingNotes,
} from "@/lib/listing";
import {
  sortForSaleCopies,
  sortSoldCopies,
  todayIsoDate,
  type SalesPayload,
} from "@/lib/sales";
import {
  cardSubtitle,
  cardTitle,
  formatCurrency,
  formatSignedCurrency,
  gradeLabel,
  ownedSerialLabel,
} from "@/lib/slab/format";
import type { CardCopyOut, CardCopyUpdate } from "@/lib/slab/types";

type SalesTab = "for_sale" | "sold";

function gainTone(value?: string | null): string {
  if (!value) return "text-slate-400";
  const num = Number(value);
  if (num > 0) return "text-emerald-400";
  if (num < 0) return "text-rose-400";
  return "text-slate-400";
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone ?? "text-white"}`}>{value}</p>
    </div>
  );
}

function ForSaleRow({
  copy,
  onUpdated,
}: {
  copy: CardCopyOut;
  onUpdated: () => void;
}) {
  const listing = parseListingNotes(copy.notes);
  const [showSoldForm, setShowSoldForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [askPrice, setAskPrice] = useState(listing.askPrice ?? "");
  const [listingNotes, setListingNotes] = useState(listing.notes ?? "");
  const [salePrice, setSalePrice] = useState("");
  const [soldDate, setSoldDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const playerName = primarySubjectName(copy.card?.subjects);
  const askAmount = parseAskAmount(listing.askPrice);
  const fmvAmount = parseAskAmount(copy.market?.fair_market_value ?? null);

  function patchCopy(body: CardCopyUpdate, onSuccess?: () => void) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/sales/${copy.uuid}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { detail?: string };
        setError(payload.detail ?? "Update failed");
        return;
      }

      setShowSoldForm(false);
      setShowEditForm(false);
      onSuccess?.();
      onUpdated();
    });
  }

  function handleMarkSold(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!salePrice.trim()) {
      setError("Enter a sale price.");
      return;
    }

    patchCopy({
      status: "sold",
      sale_price: salePrice.trim(),
      sold_date: soldDate,
    });
  }

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <PlayerAvatar name={playerName} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/cards/${copy.card_uuid}`}
            className="font-medium text-white transition hover:text-sky-300"
          >
            {cardTitle(copy.card)}
          </Link>
          <p className="mt-1 text-sm text-slate-400">{cardSubtitle(copy.card)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {gradeLabel(copy)}
            {ownedSerialLabel(copy) ? ` · Serial ${ownedSerialLabel(copy)}` : ""}
            {copy.quantity > 1 ? ` · Qty ${copy.quantity}` : ""}
          </p>
          {listing.askPrice ? (
            <p className="mt-2 text-sm font-medium text-amber-200">
              Ask {formatCurrency(listing.askPrice)}
              {askAmount !== null && fmvAmount !== null ? (
                <span className="ml-2 font-normal text-slate-400">
                  ({askAmount >= fmvAmount ? "+" : ""}
                  {formatCurrency(String(askAmount - fmvAmount))} vs FMV)
                </span>
              ) : null}
            </p>
          ) : null}
          {listing.notes ? (
            <p className="mt-1 text-sm text-slate-400">{listing.notes}</p>
          ) : null}
        </div>

        <div className="grid gap-3 text-right text-sm sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Ask</p>
            <p className="mt-1 font-medium text-amber-200">
              {listing.askPrice ? formatCurrency(listing.askPrice) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">FMV</p>
            <p className="mt-1 font-medium text-white">
              {formatCurrency(copy.market?.fair_market_value)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Cost basis</p>
            <p className="mt-1 text-white">{formatCurrency(copy.cost_basis)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Unrealized</p>
            <p
              className={`mt-1 font-medium ${gainTone(copy.market?.unrealized_gain_loss)}`}
            >
              {formatSignedCurrency(copy.market?.unrealized_gain_loss)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!showSoldForm && !showEditForm ? (
          <>
            <button
              type="button"
              onClick={() => setShowSoldForm(true)}
              disabled={isPending}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              Mark sold
            </button>
            <button
              type="button"
              onClick={() => setShowEditForm(true)}
              disabled={isPending}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-60"
            >
              Edit listing
            </button>
            <button
              type="button"
              onClick={() => patchCopy({ status: "in_collection" })}
              disabled={isPending}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-60"
            >
              Back to collection
            </button>
          </>
        ) : showEditForm ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              patchCopy({
                notes: formatListingNotes(askPrice, listingNotes),
              });
            }}
            className="flex w-full flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Ask price
              <input
                type="text"
                inputMode="decimal"
                value={askPrice}
                onChange={(event) => setAskPrice(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Notes
              <input
                type="text"
                value={listingNotes}
                onChange={(event) => setListingNotes(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowEditForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
          </form>
        ) : (
          <form onSubmit={handleMarkSold} className="flex w-full flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Sale price
              <input
                type="text"
                inputMode="decimal"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                placeholder="0.00"
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-400">
              Sold date
              <input
                type="date"
                value={soldDate}
                onChange={(event) => setSoldDate(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Confirm sale"}
            </button>
            <button
              type="button"
              onClick={() => setShowSoldForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </article>
  );
}

function SoldRow({ copy }: { copy: CardCopyOut }) {
  const playerName = primarySubjectName(copy.card?.subjects);

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start gap-4">
        <PlayerAvatar name={playerName} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={`/cards/${copy.card_uuid}`}
            className="font-medium text-white transition hover:text-sky-300"
          >
            {cardTitle(copy.card)}
          </Link>
          <p className="mt-1 text-sm text-slate-400">{cardSubtitle(copy.card)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {gradeLabel(copy)}
            {ownedSerialLabel(copy) ? ` · Serial ${ownedSerialLabel(copy)}` : ""}
            {copy.sold_date ? ` · Sold ${copy.sold_date}` : ""}
          </p>
        </div>

        <div className="grid gap-3 text-right text-sm sm:grid-cols-3 sm:gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Sale price</p>
            <p className="mt-1 font-medium text-white">
              {formatCurrency(copy.sale_price)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Cost basis</p>
            <p className="mt-1 text-white">{formatCurrency(copy.cost_basis)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Realized P&L</p>
            <p className={`mt-1 font-medium ${gainTone(copy.realized_gain_loss)}`}>
              {formatSignedCurrency(copy.realized_gain_loss)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SalesView({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<SalesTab>("for_sale");
  const [payload, setPayload] = useState<SalesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadSales = useCallback(() => {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/sales");

      if (response.status === 503) {
        setNeedsSetup(true);
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load sales");
        return;
      }

      setPayload(await response.json());
      setNeedsSetup(false);
    });
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const forSaleItems = useMemo(
    () => sortForSaleCopies(payload?.forSale.items ?? []),
    [payload?.forSale.items],
  );

  const soldItems = useMemo(
    () => sortSoldCopies(payload?.sold.items ?? []),
    [payload?.sold.items],
  );

  if (needsSetup) return <SetupPrompt />;

  return (
    <div className="space-y-6">
      {!embedded ? (
        <p className="text-sm text-slate-400">
          Manage listings and track realized gains from cards you&apos;ve sold.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "for_sale"} onClick={() => setTab("for_sale")}>
          For sale ({payload?.forSaleSummary.count ?? 0})
        </TabButton>
        <TabButton active={tab === "sold"} onClick={() => setTab("sold")}>
          Sold ({payload?.soldSummary.count ?? 0})
        </TabButton>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {isPending && !payload ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-slate-900" />
          ))}
        </div>
      ) : payload ? (
        <>
          {tab === "for_sale" ? (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  label="Listed"
                  value={String(payload.forSaleSummary.count)}
                />
                <SummaryCard
                  label="Total FMV"
                  value={formatCurrency(String(payload.forSaleSummary.totalFmv))}
                />
                <SummaryCard
                  label="Cost basis"
                  value={formatCurrency(String(payload.forSaleSummary.totalCostBasis))}
                />
                <SummaryCard
                  label="Unrealized P&L"
                  value={formatSignedCurrency(
                    String(payload.forSaleSummary.totalUnrealizedGainLoss),
                  )}
                  tone={gainTone(String(payload.forSaleSummary.totalUnrealizedGainLoss))}
                />
              </section>

              {forSaleItems.length > 0 ? (
                <div className="space-y-3">
                  {forSaleItems.map((copy) => (
                    <ForSaleRow key={copy.uuid} copy={copy} onUpdated={loadSales} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No cards listed for sale. Open a card you own and choose “List for sale”." />
              )}
            </>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Sold" value={String(payload.soldSummary.count)} />
                <SummaryCard
                  label="Sale proceeds"
                  value={formatCurrency(String(payload.soldSummary.totalSaleProceeds))}
                />
                <SummaryCard
                  label="Cost basis"
                  value={formatCurrency(String(payload.soldSummary.totalCostBasis))}
                />
                <SummaryCard
                  label="Realized P&L"
                  value={formatSignedCurrency(
                    String(payload.soldSummary.totalRealizedGainLoss),
                  )}
                  tone={gainTone(String(payload.soldSummary.totalRealizedGainLoss))}
                />
              </section>

              {soldItems.length > 0 ? (
                <div className="space-y-3">
                  {soldItems.map((copy) => (
                    <SoldRow key={copy.uuid} copy={copy} />
                  ))}
                </div>
              ) : (
                <EmptyState message="No sold cards yet. Mark a listing as sold to track realized gains here." />
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-lg border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200"
          : "rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }
    >
      {children}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
      {message}
    </div>
  );
}
