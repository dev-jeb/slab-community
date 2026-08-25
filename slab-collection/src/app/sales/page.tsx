import { redirect } from "next/navigation";

/**
 * Sales moved into My Collection → Sales (`/?view=sales`) — a card you've listed is still a card
 * in your collection, so managing it belongs with the rest of the shelf rather than in a nav tab
 * of its own.
 *
 * Kept as a redirect rather than deleted, same as /grading and /portfolio: this was a nav tab, so
 * it lives in bookmarks and in links already sent.
 */
export default function SalesRedirectPage() {
  redirect("/?view=sales");
}
