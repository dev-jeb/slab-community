"use client";

import type { ReactNode } from "react";

/**
 * Tab strip that reads as a stack of file folders — overlapping rounded tabs, one body.
 *
 * Used where a card has several equally important slices (raw / graded / sales) that used to
 * stack into a tall page. The active tab shares a fill and a warm edge with the panel so they
 * read as one folder pulled to the front.
 */
export interface FolderTab<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

interface FolderTabsProps<T extends string> {
  tabs: FolderTab<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  children: ReactNode;
}

export function FolderTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  children,
}: FolderTabsProps<T>) {
  return (
    <div>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex flex-wrap items-end gap-1 px-2"
      >
        {tabs.map((tab, index) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={tab.hint}
              onClick={() => onChange(tab.id)}
              className={`relative rounded-t-lg border px-3.5 py-2 text-sm transition ${
                active
                  ? "z-10 -mb-px border-[#c4a574]/45 border-b-[#1a2744] bg-[#1a2744] font-medium text-[#f3e6c8]"
                  : "border-transparent bg-[#162040]/80 text-slate-400 hover:bg-[#1a2744]/80 hover:text-slate-200"
              }`}
              style={{ marginLeft: index === 0 ? 0 : -4 }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        className="rounded-xl border border-[#c4a574]/35 bg-[#1a2744] p-5"
      >
        {children}
      </div>
    </div>
  );
}
