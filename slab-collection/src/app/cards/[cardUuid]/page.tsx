import Link from "next/link";

import { CardDetailView } from "@/components/card-detail/CardDetailView";

export default async function CardPage({
  params,
}: {
  params: Promise<{ cardUuid: string }>;
}) {
  const { cardUuid } = await params;

  return (
    <div className="space-y-6">
      {/* Search, not the collection's default tab: a card detail is something you reached by
          looking for it, so "back" should land on the finding tool, not the overview. */}
      <Link
        href="/?view=search"
        className="inline-flex text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← Back
      </Link>
      <CardDetailView cardUuid={cardUuid} />
    </div>
  );
}
