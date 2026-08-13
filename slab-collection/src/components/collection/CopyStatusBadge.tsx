import type { CardCopyOut } from "@/lib/slab/types";

const STATUS_LABELS: Record<string, string> = {
  for_sale: "For sale",
  for_trade: "For trade",
  sold: "Sold",
};

const STATUS_STYLES: Record<string, string> = {
  for_sale: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  for_trade: "border-violet-400/40 bg-violet-400/10 text-violet-200",
  sold: "border-slate-600 bg-slate-900 text-slate-300",
};

export function CopyStatusBadge({ copy }: { copy: CardCopyOut }) {
  const status = copy.status;
  if (!status || status === "in_collection") return null;

  const label = STATUS_LABELS[status] ?? status;
  const style =
    STATUS_STYLES[status] ?? "border-slate-600 bg-slate-900 text-slate-300";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}
