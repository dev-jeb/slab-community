import type { CardCopyOut, CollectionResult } from "@/lib/slab/types";
import { parseAskAmount, parseListingNotes } from "@/lib/listing";

export interface SalesSummary {
  count: number;
  totalCostBasis: number;
  totalFmv: number;
  totalSaleProceeds: number;
  totalRealizedGainLoss: number;
  totalUnrealizedGainLoss: number;
}

function sumMoney(
  items: CardCopyOut[],
  pick: (copy: CardCopyOut) => string | null | undefined,
): number {
  return items.reduce((sum, copy) => {
    const value = pick(copy);
    return sum + (value ? Number(value) : 0);
  }, 0);
}

export function summarizeForSale(items: CardCopyOut[]): SalesSummary {
  return {
    count: items.length,
    totalCostBasis: sumMoney(items, (copy) => copy.cost_basis),
    totalFmv: sumMoney(items, (copy) => copy.market?.fair_market_value),
    totalSaleProceeds: 0,
    totalRealizedGainLoss: 0,
    totalUnrealizedGainLoss: sumMoney(
      items,
      (copy) => copy.market?.unrealized_gain_loss,
    ),
  };
}

export function summarizeSold(items: CardCopyOut[]): SalesSummary {
  return {
    count: items.length,
    totalCostBasis: sumMoney(items, (copy) => copy.cost_basis),
    totalFmv: 0,
    totalSaleProceeds: sumMoney(items, (copy) => copy.sale_price),
    totalRealizedGainLoss: sumMoney(items, (copy) => copy.realized_gain_loss),
    totalUnrealizedGainLoss: 0,
  };
}

export function sortForSaleCopies(items: CardCopyOut[]): CardCopyOut[] {
  return [...items].sort((a, b) => {
    const askA =
      parseAskAmount(parseListingNotes(a.notes).askPrice) ??
      Number(a.market?.fair_market_value ?? 0);
    const askB =
      parseAskAmount(parseListingNotes(b.notes).askPrice) ??
      Number(b.market?.fair_market_value ?? 0);
    if (askB !== askA) return askB - askA;
    return (a.card?.set_name ?? "").localeCompare(b.card?.set_name ?? "");
  });
}

export function sortSoldCopies(items: CardCopyOut[]): CardCopyOut[] {
  return [...items].sort((a, b) => {
    const dateA = a.sold_date ? Date.parse(a.sold_date) : 0;
    const dateB = b.sold_date ? Date.parse(b.sold_date) : 0;
    if (dateB !== dateA) return dateB - dateA;
    return Number(b.sale_price ?? 0) - Number(a.sale_price ?? 0);
  });
}

export interface SalesPayload {
  forSale: CollectionResult;
  sold: CollectionResult;
  forSaleSummary: SalesSummary;
  soldSummary: SalesSummary;
}

export function buildSalesPayload(
  forSale: CollectionResult,
  sold: CollectionResult,
): SalesPayload {
  const forSaleItems = forSale.items ?? [];
  const soldItems = sold.items ?? [];

  return {
    forSale,
    sold,
    forSaleSummary: summarizeForSale(forSaleItems),
    soldSummary: summarizeSold(soldItems),
  };
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
