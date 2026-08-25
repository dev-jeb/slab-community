import { BackButton } from "@/components/BackButton";
import { SetDetailView } from "@/components/sets/SetDetailView";

/**
 * One product: its sealed SKUs and their price history, plus the best cards in it.
 *
 * Reached from the Sets scope of /search. The card page's twin — a set is a thing with priced
 * variants, same as a card is.
 */
export default async function SetPage({
  params,
}: {
  params: Promise<{ setUuid: string }>;
}) {
  const { setUuid } = await params;

  return (
    <div className="space-y-6">
      <BackButton fallback="/search?scope=sets" />
      <SetDetailView setUuid={setUuid} />
    </div>
  );
}
