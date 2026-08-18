import { redirect } from "next/navigation";

/**
 * The portfolio moved into My Collection → Overview, and its Sales tab became its own page.
 *
 * Kept as a redirect rather than deleted: /portfolio was in the nav, so it's in bookmarks and in
 * links already sent — including the "view your sales" links from the sale actions.
 */
export default async function PortfolioRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(tab === "sales" ? "/sales" : "/");
}
