import { redirect } from "next/navigation";

/**
 * Browse was a catalog-only search sitting beside a collection-only search. They're one table with
 * a scope switch now — its two tabs are two of that page's scopes — so this forwards into it.
 */
export default async function BrowseRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(tab === "sets" ? "/search?scope=sets" : "/search?scope=catalog");
}
