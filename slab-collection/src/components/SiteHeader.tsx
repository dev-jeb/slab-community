"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNews } from "@/components/news/NewsProvider";

// "My Collection" and not "Collection": every page here is about your cards, so the bare noun
// didn't distinguish this one from Browse (the catalog) or Chase Sets. The possessive does.
// "My Collection" and not "Collection": every page here is about your cards, so the bare noun
// didn't distinguish this one from Search (which also covers the catalog) or Chase Sets. The
// possessive does. Browse is gone — it was a second, weaker search, and is now Search's catalog
// scope.
const links = [
  { href: "/", label: "My Collection" },
  { href: "/search", label: "Search" },
  { href: "/chase", label: "Chase Sets" },
  { href: "/sales", label: "Sales" },
  { href: "/grading", label: "Grading" },
  { href: "/news", label: "Alerts", showBadge: true },
];

export const pageTitles: Record<string, string> = {
  "/": "My Collection",
  "/search": "Search",
  "/chase": "Chase Sets",
  "/sales": "Sales",
  "/news": "Alerts",
};

export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith("/cards/")) return "Card detail";
  if (pathname.startsWith("/search")) return "Search";
  if (pathname.startsWith("/sales")) return "Sales";
  if (pathname.startsWith("/players")) return "Player pricing";
  if (pathname.startsWith("/chase")) return "Chase Sets";
  return pageTitles[pathname] ?? "Slab Collection";
}

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { alertCount } = useNews();

  // On desktop the nav already says where you are, so repeating it as a heading spent a whole row
  // saying nothing. Detail pages have no nav entry, so they still need a title.
  const inNav = links.some((link) => linkActive(pathname, link.href));

  return (
    <header className="border-b border-[#2a3a5c] bg-[#0f1729]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link href="/" className="heading-brand shrink-0 transition hover:brightness-110">
            Slab
          </Link>
          <h1
            className={`truncate text-base font-semibold text-white ${
              inNav ? "md:hidden" : ""
            }`}
          >
            {pageTitleForPath(pathname)}
          </h1>
        </div>

        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) => {
            const active = linkActive(pathname, link.href);
            const badge = link.showBadge && alertCount > 0 ? alertCount : 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 border-b-2 px-1 pb-0.5 text-sm transition ${
                  active
                    ? "border-[#f0b429] text-[#f0b429]"
                    : "border-transparent text-[#7a8baa] hover:text-[#f0b429]"
                }`}
              >
                {link.label}
                {badge > 0 ? (
                  // Inline, not absolutely positioned: on the last nav item an offset badge hung
                  // past the container and clipped at the window edge.
                  <span className="rounded-full bg-[#f0b429] px-1.5 py-px text-[10px] font-semibold text-[#0f1729]">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
