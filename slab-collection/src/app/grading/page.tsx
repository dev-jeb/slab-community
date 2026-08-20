import { redirect } from "next/navigation";

/**
 * The Grading Desk moved into My Collection → Grading Desk (`/?view=grading`) — it's a view over
 * your own raw copies, so it belongs with the rest of your cards.
 *
 * Kept as a redirect rather than deleted, same as /portfolio: this was a nav tab, so it lives in
 * bookmarks and links already sent.
 */
export default function GradingRedirectPage() {
  redirect("/?view=grading");
}
