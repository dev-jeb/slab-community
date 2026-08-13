"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  formatListingNotes,
  parseListingNotes,
} from "@/lib/listing";
import { todayIsoDate } from "@/lib/sales";
import { formatCurrency } from "@/lib/slab/format";
import type { CardCopyOut, CardCopyUpdate } from "@/lib/slab/types";

interface CopySaleActionsProps {
  copy: CardCopyOut;
  onUpdated?: () => void;
}

export function CopySaleActions({ copy, onUpdated }: CopySaleActionsProps) {
  const initialListing = parseListingNotes(copy.notes);
  const [showListForm, setShowListForm] = useState(false);
  const [showSoldForm, setShowSoldForm] = useState(false);
  const [askPrice, setAskPrice] = useState(initialListing.askPrice ?? "");
  const [listingNotes, setListingNotes] = useState(initialListing.notes ?? "");
  const [salePrice, setSalePrice] = useState("");
  const [soldDate, setSoldDate] = useState(todayIsoDate());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function patchCopy(body: CardCopyUpdate) {
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

      setShowListForm(false);
      setShowSoldForm(false);
      onUpdated?.();
    });
  }

  function listForSale() {
    patchCopy({
      status: "for_sale",
      notes: formatListingNotes(askPrice, listingNotes),
    });
  }

  if (copy.status === "sold") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3 text-sm">
        <span className="rounded-full border border-slate-600 bg-slate-900 px-2.5 py-0.5 text-slate-300">
          Sold
        </span>
        <span className="text-slate-400">
          {formatCurrency(copy.sale_price)}
          {copy.sold_date ? ` · ${copy.sold_date}` : ""}
        </span>
        <Link href="/portfolio?tab=sales" className="text-sky-400 hover:text-sky-300">
          View in Sales →
        </Link>
      </div>
    );
  }

  if (copy.status === "for_sale") {
    const listing = parseListingNotes(copy.notes);

    return (
      <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-amber-200">
            For sale
          </span>
          {listing.askPrice ? (
            <span className="text-amber-100">
              Ask {formatCurrency(listing.askPrice)}
            </span>
          ) : null}
          {listing.notes ? (
            <span className="text-slate-400">{listing.notes}</span>
          ) : null}
          <Link href="/portfolio?tab=sales" className="text-sky-400 hover:text-sky-300">
            Manage on Sales →
          </Link>
        </div>

        {!showSoldForm ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowSoldForm(true)}
              disabled={isPending}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              Mark sold
            </button>
            <button
              type="button"
              onClick={() => patchCopy({ status: "in_collection" })}
              disabled={isPending}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-60"
            >
              Remove listing
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
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
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Sale price
              <input
                type="text"
                inputMode="decimal"
                value={salePrice}
                onChange={(event) => setSalePrice(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Sold date
              <input
                type="date"
                value={soldDate}
                onChange={(event) => setSoldDate(event.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
            >
              Confirm
            </button>
          </form>
        )}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-slate-800/80 pt-3">
      {!showListForm ? (
        <button
          type="button"
          onClick={() => setShowListForm(true)}
          disabled={isPending}
          className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
        >
          List for sale
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            listForSale();
          }}
          className="space-y-2"
        >
          <label className="block text-xs text-slate-400">
            Ask price
            <input
              type="text"
              inputMode="decimal"
              value={askPrice}
              onChange={(event) => setAskPrice(event.target.value)}
              placeholder="250.00"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Listing notes
            <input
              type="text"
              value={listingNotes}
              onChange={(event) => setListingNotes(event.target.value)}
              placeholder="eBay · OBO · ships padded mailer"
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-slate-950 disabled:opacity-60"
            >
              {isPending ? "Listing…" : "List for sale"}
            </button>
            <button
              type="button"
              onClick={() => setShowListForm(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
