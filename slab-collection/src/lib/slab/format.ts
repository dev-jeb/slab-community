import type { CardCopyOut, CardOut } from "./types";

export function formatCurrency(value?: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num >= 100 ? 0 : 2,
  }).format(num);
}

export function formatPercent(value?: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  return new Intl.NumberFormat("en-US", {
    style: "percent",
    signDisplay: "exceptZero",
    maximumFractionDigits: 1,
  }).format(num);
}

export function formatSignedCurrency(value?: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;

  const formatted = formatCurrency(value);
  if (num > 0) return `+${formatted}`;
  return formatted;
}

export function cardTitle(card?: CardOut | null): string {
  if (!card) return "Unknown card";
  const player = card.subjects.map((s) => s.name).join(" / ");
  const parts = [player, card.card_number].filter(Boolean);
  return parts.join(" · ") || card.card_number;
}

export function cardSubtitle(card?: CardOut | null): string {
  if (!card) return "";
  const parts = [
    card.set_name,
    card.subset,
    card.finish,
    card.print_run ? `/ ${card.print_run}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function gradeLabel(copy: CardCopyOut): string | null {
  if (copy.grading_company && copy.grade) {
    return `${copy.grading_company} ${copy.grade}`;
  }
  if (copy.grade) return copy.grade;
  return "Raw";
}

/** Checklist number within the set (e.g. 201, YG-201) — every card has one in Slab. */
export function setChecklistNumber(card?: CardOut | null): string | null {
  if (!card?.card_number) return null;
  return card.card_number;
}

/** Owned copy serial for numbered cards only (e.g. #12 of /99). */
export function ownedSerialLabel(copy: CardCopyOut): string | null {
  if (!copy.serial_number) return null;
  const run = copy.card?.print_run;
  return run ? `#${copy.serial_number} /${run}` : `#${copy.serial_number}`;
}
