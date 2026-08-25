"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useNews } from "@/components/news/NewsProvider";
import { LinkLabel } from "@/components/ui/LinkLabel";

// Portfolio was a primary tab because it was where the money lived; it's the My Collection
// dashboard now. Search takes the freed slot — it's the one screen you open with a question, and
// it covers the catalog as well as your shelf. Sales and player pricing are occasional, so they
// sit under More.
const primaryTabs = [
  {
    href: "/",
    label: "My Collection",
    match: (path: string) => path === "/" || path.startsWith("/cards/"),
  },
  {
    href: "/search",
    label: "Search",
    match: (path: string) => path.startsWith("/search"),
  },
  {
    href: "/chase",
    label: "Chase Sets",
    match: (path: string) => path.startsWith("/chase"),
  },
];

// Grading and Sales aren't here: both live inside My Collection (`/?view=grading`,
// `/?view=sales`), reachable from that tab's view switcher.
const moreLinks = [
  { href: "/market", label: "Market" },
  { href: "/players", label: "Player pricing" },
  { href: "/news", label: "Alerts", showBadge: true },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { alertCount } = useNews();
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = moreLinks.some((link) => pathname.startsWith(link.href));

  return (
    <>
      {moreOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          // A full-screen scrim: it's a button only so a stray tap closes the sheet. Nudging the
          // whole screen a pixel would be motion confirming nothing.
          className="no-press fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <div className="fixed inset-x-4 bottom-20 z-50 rounded-2xl border border-slate-700 bg-slate-950 p-2 shadow-xl md:hidden">
          {moreLinks.map((link) => {
            const active = pathname.startsWith(link.href);
            const badge = link.showBadge && alertCount > 0 ? alertCount : 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={`pressable flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                  active
                    ? "bg-sky-500/10 text-sky-200"
                    : "text-slate-200 hover:bg-slate-900"
                }`}
              >
                <LinkLabel pendingClassName="text-sky-300">{link.label}</LinkLabel>
                {badge > 0 ? (
                  <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2a3a5c] bg-[#0f1729]/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-4 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
          {primaryTabs.map((tab) => {
            const active = tab.match(pathname);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pressable block rounded-lg px-2 py-2 text-center text-xs font-medium ${
                  active ? "text-sky-300" : "text-slate-400"
                }`}
              >
                <LinkLabel pendingClassName="text-sky-300">{tab.label}</LinkLabel>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${
              moreActive || moreOpen ? "text-sky-300" : "text-slate-400"
            }`}
          >
            More
          </button>
        </div>
      </nav>
    </>
  );
}
