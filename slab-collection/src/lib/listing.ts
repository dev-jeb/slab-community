/** Structured listing fields stored in copy `notes` (Slab has no dedicated ask_price). */

const ASK_PREFIX = "[ask:";

export interface ParsedListing {
  askPrice: string | null;
  notes: string | null;
}

export function parseListingNotes(raw?: string | null): ParsedListing {
  if (!raw?.trim()) {
    return { askPrice: null, notes: null };
  }

  const trimmed = raw.trim();
  if (!trimmed.startsWith(ASK_PREFIX)) {
    return { askPrice: null, notes: trimmed };
  }

  const close = trimmed.indexOf("]");
  if (close === -1) {
    return { askPrice: null, notes: trimmed };
  }

  const askPrice = trimmed.slice(ASK_PREFIX.length, close).trim() || null;
  const rest = trimmed.slice(close + 1).trim();
  return {
    askPrice,
    notes: rest || null,
  };
}

export function formatListingNotes(
  askPrice?: string | null,
  notes?: string | null,
): string | null {
  const ask = askPrice?.trim().replace(/^\$/, "") ?? "";
  const text = notes?.trim() ?? "";

  if (!ask && !text) return null;
  if (!ask) return text;

  const normalizedAsk = ask.replace(/,/g, "");
  return text ? `${ASK_PREFIX}${normalizedAsk}]\n${text}` : `${ASK_PREFIX}${normalizedAsk}]`;
}

export function parseAskAmount(askPrice?: string | null): number | null {
  if (!askPrice?.trim()) return null;
  const num = Number(askPrice.replace(/[$,]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}
