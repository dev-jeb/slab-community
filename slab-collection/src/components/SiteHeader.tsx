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

  return (
    <header className="border-b border-slate-800/80 bg-[#0b1120]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6 md:py-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-sky-400 md:text-xs">
            Slab Collection
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold text-white md:text-2xl">
            {pageTitleForPath(pathname)}
          </h1>
        </div>
        <nav className="hidden flex-wrap gap-4 text-sm md:flex md:gap-6">
          {links.map((link) => {
            const active = linkActive(pathname, link.href);
            const badge = link.showBadge && alertCount > 0 ? alertCount : 0;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "relative text-white"
                    : "relative text-slate-400 transition hover:text-slate-200"
                }
              >
                {link.label}
                {badge > 0 ? (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white">
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
