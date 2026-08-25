"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

import { sheenClass, SheenContent } from "@/components/ui/sheen";

/**
 * A `<Link>`'s label, which says so while that link's navigation is still in flight.
 *
 * The press animation confirms the click landed; this answers the next question — is anything
 * happening? A nav link changes the route, and until the new page renders the header still shows
 * the OLD entry underlined, which reads as a click that did nothing. So the clicked label sheens
 * and takes the destination's color while its navigation is pending.
 *
 * `useLinkStatus` only works inside a `<Link>`, and that's the point: the state comes from Next's
 * own router rather than from a timer or an optimistic guess we'd have to clean up. A prefetched
 * route resolves in a frame or two and nothing flashes; a slow one shows the wait for as long as
 * it really lasts.
 *
 * The pending color is the caller's to pass, because "where you're going" is a different color in
 * the desktop header (foil) than in the mobile tab bar (sky) — a hardcoded one would be right in
 * one place and wrong in the other.
 */
export function LinkLabel({
  children,
  pendingClassName = "",
  className = "",
}: {
  children: ReactNode;
  /** Applied only while this link's navigation is pending — usually the active color. */
  pendingClassName?: string;
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sheenClass(pending)} ${
        pending ? pendingClassName : ""
      } ${className}`}
      aria-busy={pending || undefined}
    >
      <SheenContent block={false} className="inline-flex items-center gap-1.5">
        {children}
      </SheenContent>
    </span>
  );
}
