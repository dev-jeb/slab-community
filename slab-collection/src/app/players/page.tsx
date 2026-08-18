import { PlayerLookupView } from "@/components/player-lookup/PlayerLookupView";

/**
 * Player pricing — its own page again.
 *
 * It used to be a tab inside Browse, whose other half (catalog card search) is now a scope of
 * /search. This isn't that: it's the per-player pricing deep dive — every variant with raw and
 * graded medians, comp ranges, and the sales behind them, side by side. Search finds cards; this
 * compares what they go for.
 */
export default function PlayersPage() {
  return <PlayerLookupView />;
}
