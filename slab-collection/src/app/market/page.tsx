import { MarketView } from "@/components/market/MarketView";

/**
 * Market — what cards do in general, as opposed to what yours are worth.
 *
 * Every other page here is pointed at your shelf or at a specific card. This one is pointed at the
 * catalog: benchmarks built from every matched sale, starting with the lifecycle curve.
 */
export default function MarketPage() {
  return <MarketView />;
}
