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
      <Link
        href="/"
        className="inline-flex text-sm text-slate-400 transition hover:text-slate-200"
      >
        ← Back
      </Link>
      <CardDetailView cardUuid={cardUuid} />
    </div>
  );
}
