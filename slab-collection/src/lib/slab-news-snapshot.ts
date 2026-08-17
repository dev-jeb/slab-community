import { getPriceConfidence } from "@/lib/slab/confidence";
import { formatSignedCurrency } from "@/lib/slab/format";
import type { CompOut, SetOut } from "@/lib/slab/types";
import type { OwnedCardNews } from "@/lib/slab-news";

const SETS_KEY = "slab-news-sets-v1";
const COMPS_KEY = "slab-news-comps-v1";

export interface SetsSnapshot {
  setUuids: string[];
  savedAt: string;
}

export interface CompCardSnapshot {
  total: number;
  latestSoldDate: string | null;
  fmv: string | null;
  sampleSize: number | null;
  lowConfidence: boolean | null;
}

export interface CompsSnapshot {
  cards: Record<string, CompCardSnapshot>;
  savedAt: string;
}

export interface CompAlert {
  cardUuid: string;
  cardNumber: string;
  subjects: string[];
  setName?: string | null;
  subset?: string | null;
  finish?: string | null;
  previousTotal: number;
  currentTotal: number;
  latestComp: CompOut;
  previousFmv: string | null;
  currentFmv: string | null;
  fmvDelta: string | null;
  previousSampleSize: number | null;
  currentSampleSize: number | null;
  previousLowConfidence: boolean | null;
  currentLowConfidence: boolean | null;
  previousConfidence: ReturnType<typeof getPriceConfidence>;
  currentConfidence: ReturnType<typeof getPriceConfidence>;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSetsSnapshot(): SetsSnapshot | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(SETS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SetsSnapshot;
  } catch {
    return null;
  }
}

export function saveSetsSnapshot(sets: SetOut[]): void {
  if (!canUseStorage()) return;

  const snapshot: SetsSnapshot = {
    setUuids: sets.map((set) => set.uuid),
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(SETS_KEY, JSON.stringify(snapshot));
}

export function loadCompsSnapshot(): CompsSnapshot | null {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(COMPS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CompsSnapshot;
  } catch {
    return null;
  }
}

export function saveCompsSnapshot(ownedCards: OwnedCardNews[]): void {
  if (!canUseStorage()) return;

  const cards: Record<string, CompCardSnapshot> = {};

  for (const card of ownedCards) {
    cards[card.cardUuid] = {
      total: card.comps.total,
      latestSoldDate: card.comps.latest?.sold_date ?? null,
      fmv: card.market?.fmv ?? null,
      sampleSize: card.market?.sampleSize ?? null,
      lowConfidence: card.market?.lowConfidence ?? null,
    };
  }

  const snapshot: CompsSnapshot = {
    cards,
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(COMPS_KEY, JSON.stringify(snapshot));
}

/**
 * First time we see a card, record it as the baseline so it doesn't fire a
 * "new comp" alert. Used when expanding coverage from a partial snapshot.
 */
export function ensureCompsSnapshotIncludes(ownedCards: OwnedCardNews[]): void {
  if (!canUseStorage()) return;

  const existing = loadCompsSnapshot();
  if (!existing) {
    saveCompsSnapshot(ownedCards);
    return;
  }

  let changed = false;
  const cards = { ...existing.cards };

  for (const card of ownedCards) {
    if (cards[card.cardUuid]) continue;
    cards[card.cardUuid] = {
      total: card.comps.total,
      latestSoldDate: card.comps.latest?.sold_date ?? null,
      fmv: card.market?.fmv ?? null,
      sampleSize: card.market?.sampleSize ?? null,
      lowConfidence: card.market?.lowConfidence ?? null,
    };
    changed = true;
  }

  if (!changed) return;

  const snapshot: CompsSnapshot = {
    cards,
    savedAt: existing.savedAt,
  };
  window.localStorage.setItem(COMPS_KEY, JSON.stringify(snapshot));
}

export function diffNewSets(
  sets: SetOut[],
  snapshot: SetsSnapshot | null,
): SetOut[] {
  if (!snapshot) return [];

  const known = new Set(snapshot.setUuids);
  return sets.filter((set) => !known.has(set.uuid));
}

function soldDateMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fmvDelta(previous: string | null, current: string | null): string | null {
  if (!previous || !current) return null;

  const prevNum = Number(previous);
  const currNum = Number(current);
  if (Number.isNaN(prevNum) || Number.isNaN(currNum)) return null;

  return formatSignedCurrency(String(currNum - prevNum));
}

export function diffCompAlerts(
  ownedCards: OwnedCardNews[],
  snapshot: CompsSnapshot | null,
): CompAlert[] {
  if (!snapshot) return [];

  const alerts: CompAlert[] = [];

  for (const card of ownedCards) {
    const previous = snapshot.cards[card.cardUuid];
    if (!previous || !card.comps.latest) continue;

    const totalIncreased = card.comps.total > previous.total;
    const newerComp =
      soldDateMs(card.comps.latest.sold_date) > soldDateMs(previous.latestSoldDate);

    if (!totalIncreased && !newerComp) continue;

    const previousFmv = previous.fmv;
    const currentFmv = card.market?.fmv ?? null;

    alerts.push({
      cardUuid: card.cardUuid,
      cardNumber: card.cardNumber,
      subjects: card.subjects,
      setName: card.setName,
      subset: card.subset,
      finish: card.finish,
      previousTotal: previous.total,
      currentTotal: card.comps.total,
      latestComp: card.comps.latest,
      previousFmv,
      currentFmv,
      fmvDelta: fmvDelta(previousFmv, currentFmv),
      previousSampleSize: previous.sampleSize,
      currentSampleSize: card.market?.sampleSize ?? null,
      previousLowConfidence: previous.lowConfidence,
      currentLowConfidence: card.market?.lowConfidence ?? null,
      previousConfidence: getPriceConfidence(
        previous.sampleSize,
        previous.lowConfidence,
      ),
      currentConfidence: getPriceConfidence(
        card.market?.sampleSize,
        card.market?.lowConfidence,
      ),
    });
  }

  return alerts.sort(
    (a, b) =>
      soldDateMs(b.latestComp.sold_date) - soldDateMs(a.latestComp.sold_date),
  );
}

export function saveAllSnapshots(payload: {
  sets: SetOut[];
  ownedCards: OwnedCardNews[];
}): void {
  saveSetsSnapshot(payload.sets);
  saveCompsSnapshot(payload.ownedCards);
}

export function countNewsAlerts(payload: {
  sets: SetOut[];
  ownedCards: OwnedCardNews[];
}): number {
  const setsSnapshot = loadSetsSnapshot();
  const compsSnapshot = loadCompsSnapshot();
  if (!setsSnapshot || !compsSnapshot) return 0;

  return (
    diffNewSets(payload.sets, setsSnapshot).length +
    diffCompAlerts(payload.ownedCards, compsSnapshot).length
  );
}

export function hasNewsBaseline(): boolean {
  return Boolean(loadSetsSnapshot() && loadCompsSnapshot());
}
