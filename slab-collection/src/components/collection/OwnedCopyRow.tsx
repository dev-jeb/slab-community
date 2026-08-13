import type { CardCopyOut } from "@/lib/slab/types";
import {
  formatCurrency,
  formatSignedCurrency,
  gradeLabel,
  ownedSerialLabel,
} from "@/lib/slab/format";

export function OwnedCopyRow({
  copy,
  children,
}: {
  copy: CardCopyOut;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-white">{gradeLabel(copy)}</p>
          <p className="mt-1 text-sm text-slate-400">
            {ownedSerialLabel(copy) ? `Serial ${ownedSerialLabel(copy)}` : "Unnumbered"}
            {copy.quantity > 1 ? ` · Qty ${copy.quantity}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-white">
            {formatCurrency(copy.market?.fair_market_value)}
          </p>
          <p className="text-sm text-slate-400">
            Cost {formatCurrency(copy.cost_basis)} ·{" "}
            {formatSignedCurrency(copy.market?.unrealized_gain_loss)}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
