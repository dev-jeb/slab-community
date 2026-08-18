import { BackButton } from "@/components/BackButton";
import { CardDetailView } from "@/components/card-detail/CardDetailView";

export default async function CardPage({
  params,
}: {
  params: Promise<{ cardUuid: string }>;
}) {
  const { cardUuid } = await params;

  return (
    <div className="space-y-6">
      <BackButton />
      <CardDetailView cardUuid={cardUuid} />
    </div>
  );
}
