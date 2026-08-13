"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useNews } from "@/components/news/NewsProvider";

const links = [
  { href: "/", label: "Collection" },
  { href: "/chase", label: "Chase Sets" },
  { href: "/browse", label: "Browse" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/news", label: "Alerts", showBadge: true },
];

export const pageTitles: Record<string, string> = {
  "/": "Collection",
  "/chase": "Chase Sets",
  "/browse": "Browse",
  "/portfolio": "Portfolio",
  "/news": "Alerts",
};

export function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith("/cards/")) return "Card detail";
  if (pathname.startsWith("/portfolio")) return "Portfolio";
  if (pathname.startsWith("/browse")) return "Browse";
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
    <header className="border-b border-slate-800/80 bg-[#0b1120]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400 transition hover:text-sky-300"
          >
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

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = linkActive(pathname, link.href);
            const badge = link.showBadge && alertCount > 0 ? alertCount : 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/40"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {link.label}
                {badge > 0 ? (
                  // Inline, not absolutely positioned: on the last nav item an offset badge hung
                  // past the container and clipped at the window edge.
                  <span className="rounded-full bg-sky-500 px-1.5 py-px text-[10px] font-semibold text-white">
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
