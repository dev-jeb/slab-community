"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { ChaseSetWizard } from "@/components/collection/ChaseSetWizard";
import { PlayerAvatar } from "@/components/collection/PlayerAvatar";
import { TeamLogo } from "@/components/collection/TeamLogo";
import { Sheen, SheenBar } from "@/components/ui/sheen";
import {
  defaultChaseViewMode,
  entryTeam,
  filterChaseEntries,
  filterPlayerGroups,
  groupChaseEntriesByPlayer,
  playerSlotNeed,
  playerSlotQualifiers,
  searchChaseEntries,
  searchPlayerGroups,
  type ChaseEntryFilter,
  type ChaseViewMode,
  type PlayerChaseGroup,
} from "@/lib/chase-set-view";
import { cardSubtitle, cardTitle, formatCurrency } from "@/lib/slab/format";
import type { CustomSetDetail, CustomSetOut } from "@/lib/slab/types";

function completionTone(pct: number): string {
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 50) return "text-sky-300";
  return "text-slate-300";
}

function ChaseSetBanner({
  set,
  slotCount,
  expanded,
  onToggle,
}: {
  set: CustomSetOut;
  /** Full membership. The list's `card_count` is 0 for dynamic sets until detail loads. */
  slotCount: number | null;
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayCount = slotCount ?? (set.card_count > 0 ? set.card_count : null);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border px-5 py-4 text-left transition ${
        expanded
          ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/20"
          : "border-slate-800 bg-slate-900/60 hover:border-sky-500/30 hover:bg-slate-900"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-white">{set.name}</p>
        {set.description ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{set.description}</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-500">
          {set.set_type} · {set.visibility}
          {set.creator_name ? ` · by ${set.creator_name}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-5 text-sm">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Slots</p>
          <p className="font-semibold text-white">{displayCount ?? "—"}</p>
        </div>
        <span className="text-xs text-sky-400">{expanded ? "Hide" : "Show"}</span>
      </div>
    </button>
  );
}

function ChaseSetDetailPanel({
  setUuid,
  onSlotCount,
}: {
  setUuid: string;
  onSlotCount?: (count: number) => void;
}) {
  const [detail, setDetail] = useState<CustomSetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [entryFilter, setEntryFilter] = useState<ChaseEntryFilter>("all");
  const [viewMode, setViewMode] = useState<ChaseViewMode>("card");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/chase/${setUuid}`);
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load set");
        return;
      }
      const data = (await response.json()) as CustomSetDetail;
      setDetail(data);
      setViewMode(defaultChaseViewMode(data.cards.length));
      // List `card_count` is 0 for dynamic sets; completion covers the full membership.
      const count = data.completion?.total_cards ?? data.card_count;
      if (count != null) onSlotCount?.(count);
    });
    // onSlotCount is called once the fetch lands; listing it would refetch on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUuid]);

  const filteredEntries = useMemo(() => {
    if (!detail) return [];
    const searched = searchChaseEntries(detail.cards, search);
    return filterChaseEntries(searched, entryFilter);
  }, [detail, search, entryFilter]);

  const playerGroups = useMemo(() => {
    if (!detail) return [];
    const grouped = groupChaseEntriesByPlayer(detail.cards);
    const searched = searchPlayerGroups(grouped, search);
    return filterPlayerGroups(searched, entryFilter);
  }, [detail, search, entryFilter]);

  const playerCompletion = useMemo(() => {
    if (!detail?.cards.length) return null;
    const allGroups = groupChaseEntriesByPlayer(detail.cards);
    const ownedPlayers = allGroups.filter((group) => group.owned).length;
    return {
      ownedPlayers,
      totalPlayers: allGroups.length,
      pct: allGroups.length
        ? (ownedPlayers / allGroups.length) * 100
        : 0,
    };
  }, [detail]);

  if (isPending && !detail) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <Sheen loading label="Loading set">
          <SheenBar className="h-24 w-full rounded-lg" />
        </Sheen>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!detail) return null;

  const completion = detail.completion;

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      {completion ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Card slots
            </p>
            <p className={`text-3xl font-semibold ${completionTone(completion.completion_pct)}`}>
              {completion.completion_pct.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {completion.owned_cards} of {completion.total_cards} slots owned
            </p>
            {playerCompletion && playerCompletion.totalPlayers > 0 ? (
              <p className="mt-1 text-sm text-slate-500">
                {playerCompletion.ownedPlayers} of {playerCompletion.totalPlayers}{" "}
                players ({playerCompletion.pct.toFixed(1)}%)
              </p>
            ) : null}
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800 sm:w-48">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${Math.min(completion.completion_pct, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {detail.cards.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search players or cards…"
            className="min-w-[12rem] flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          {/* Two independent axes, so two labeled controls: WHICH entries (ownership) and
              HOW they're grouped (view). A flat row of five buttons read as one choice. */}
          <SegmentedControl
            label="Show"
            options={[
              { value: "all", label: "All" },
              { value: "owned", label: "Owned" },
              { value: "missing", label: "Missing" },
            ]}
            value={entryFilter}
            onChange={(value) => setEntryFilter(value as ChaseEntryFilter)}
          />
          <SegmentedControl
            label="Group"
            options={[
              { value: "player", label: "By player" },
              { value: "card", label: "By card" },
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as ChaseViewMode)}
          />
        </div>
      ) : null}

      {viewMode === "player" && playerGroups.length > 0 ? (
        <section className="space-y-2">
          {playerGroups.map((group) => (
            <PlayerChaseGroupRow key={group.playerName} group={group} />
          ))}
        </section>
      ) : null}

      {viewMode === "card" && filteredEntries.length > 0 ? (
        <section className="grid gap-2 sm:grid-cols-2">
          {filteredEntries.map((entry) => (
            <ChaseCardEntry key={entry.uuid} entry={entry} owned={entry.owned} />
          ))}
        </section>
      ) : null}

      {detail.cards.length > 0 &&
      ((viewMode === "player" && playerGroups.length === 0) ||
        (viewMode === "card" && filteredEntries.length === 0)) ? (
        <p className="text-sm text-slate-500">No matches for this filter.</p>
      ) : null}

      {detail.cards.length === 0 ? (
        <p className="text-sm text-slate-500">
          {detail.set_type === "dynamic"
            ? "No catalog cards match this set’s filter yet."
            : "This set has no cards yet. Use the roster wizard or CLI."}
        </p>
      ) : null}
    </div>
  );
}

/** One labeled axis of options rendered as a joined segment group — visually one control,
 * so two side-by-side axes (ownership vs grouping) can't be misread as five peer buttons. */
function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={option.value === value}
            className={`px-3 py-2 text-xs transition ${
              index > 0 ? "border-l border-slate-800" : ""
            } ${
              option.value === value
                ? "bg-sky-500/15 font-medium text-sky-200"
                : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlayerChaseGroupRow({ group }: { group: PlayerChaseGroup }) {
  const [expanded, setExpanded] = useState(false);
  const team = group.entries[0] ? entryTeam(group.entries[0]) : null;

  return (
    <div
      className={`rounded-lg border ${
        group.owned
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        {team ? <TeamLogo team={team} size="sm" className="shrink-0" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{group.playerName}</p>
          <p className="text-xs text-slate-500">
            {group.ownedCount}/{group.totalCount} card slots
          </p>
        </div>
        <span
          className={`text-xs font-medium ${
            group.owned ? "text-emerald-400" : "text-slate-500"
          }`}
        >
          {group.owned ? "Owned" : "Need"}
        </span>
      </button>
      {expanded ? (
        <div className="grid gap-2 border-t border-slate-800/80 p-2 sm:grid-cols-2">
          {group.entries.map((entry) => (
            <ChaseCardEntry key={entry.uuid} entry={entry} owned={entry.owned} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChaseCardEntry({
  entry,
  owned,
}: {
  entry: CustomSetDetail["cards"][number];
  owned: boolean;
}) {
  const card = entry.card;
  if (!card) return <PlayerSlotEntry entry={entry} owned={owned} />;
  const team = card.subjects.find((subject) => subject.team?.trim())?.team;

  return (
    <Link
      href={`/cards/${card.uuid}`}
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
        owned
          ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
          : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
      }`}
    >
      {team ? (
        <TeamLogo team={team} size="sm" className="mt-0.5 shrink-0" />
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{cardTitle(card)}</p>
        <p className="truncate text-xs text-slate-500">{cardSubtitle(card)}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-600">
          {entry.match_mode}
        </p>
        {owned && entry.owned_printing ? (
          <p className="mt-0.5 truncate text-xs text-emerald-300">
            Yours: {entry.owned_printing}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium text-sky-300">
          {formatCurrency(card.market?.fair_market_value)}
        </p>
        <p className={`text-xs ${owned ? "text-emerald-400" : "text-slate-500"}`}>
          {owned ? "Owned" : "Need"}
        </p>
      </div>
    </Link>
  );
}

/** A player slot (match_mode any_card): the goal is the player, not a card. Filled, it shows
 * the exact owned card that filled it; missing, it says what would count. */
function PlayerSlotEntry({
  entry,
  owned,
}: {
  entry: CustomSetDetail["cards"][number];
  owned: boolean;
}) {
  const quals = playerSlotQualifiers(entry);
  const team = entry.subject_team ?? null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
        owned
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-slate-800 bg-slate-950/40"
      }`}
    >
      {team ? (
        <TeamLogo team={team} size="sm" className="mt-0.5 shrink-0" />
      ) : (
        <PlayerAvatar name={entry.subject ?? "?"} size="sm" className="mt-0.5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {entry.subject ?? "Unknown player"}
        </p>
        <p className="truncate text-xs text-slate-500">
          Player slot{quals.length ? ` · ${quals.join(" · ")}` : " · any card"}
        </p>
        {owned && entry.owned_printing ? (
          <p className="mt-1 truncate text-xs text-emerald-300">
            Filled by {entry.owned_printing}
          </p>
        ) : (
          <p className="mt-1 truncate text-xs text-slate-500">
            Needs {playerSlotNeed(entry)} of {entry.subject ?? "this player"}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-xs ${owned ? "text-emerald-400" : "text-slate-500"}`}>
          {owned ? "Owned" : "Need"}
        </p>
      </div>
    </div>
  );
}

function ChaseCliHelp() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-medium text-white">Create sets with the CLI</p>
          <p className="mt-0.5 text-sm text-slate-400">
            Example: 2025/2026 Carolina Hurricanes team chase
          </p>
        </div>
        <span className="text-sm text-sky-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <p>
            Slab calls these <strong className="text-white">chase sets</strong>. Use{" "}
            <code className="rounded bg-slate-950 px-1.5 py-0.5 text-sky-300">slab chase</code>{" "}
            commands (not <code className="rounded bg-slate-950 px-1.5 py-0.5">custom-set</code>
            ).
          </p>

          <div>
            <p className="font-medium text-white">Create in the app</p>
            <p className="mt-1 text-slate-400">
              Use the wizard above for filter-based roster or master sets. For
              hand-picked cards, use curated + slab chase add.
            </p>
          </div>

          <div>
            <p className="font-medium text-white">Roster chase (one per player)</p>
            <p className="mt-1 text-slate-400">
              Wizard → preview catalog → choose a roster chase: auto-growing (a
              dynamic any_card set) or a fixed list of editable player slots. Either
              way, any matching card of a player fills their slot.
            </p>
          </div>

          <div>
            <p className="font-medium text-white">Master set (dynamic)</p>
            <p className="mt-1 text-slate-400">
              Wizard → choose Master set, or CLI: slab chase create with type
              dynamic and the same filters.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-200">{`slab chase create
# Set type: dynamic
# Team: Hurricanes
# Season year: 2025`}</pre>
          </div>

          <p className="text-xs text-slate-500">
            Large dynamic sets: use By player + Missing filters in the detail view.
            Refresh after CLI changes with slab chase list.
          </p>
        </div>
      ) : null}
    </section>
  );
}

export function CollectionChaseSets({
  onCountChange,
}: {
  onCountChange?: (count: number) => void;
}) {
  const [sets, setSets] = useState<CustomSetOut[]>([]);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [expandedUuid, setExpandedUuid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rememberSlotCount = useCallback((uuid: string, count: number) => {
    setSlotCounts((current) =>
      current[uuid] === count ? current : { ...current, [uuid]: count },
    );
  }, []);

  function loadSets() {
    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/chase");
      if (!response.ok) {
        const body = (await response.json()) as { detail?: string };
        setError(body.detail ?? "Failed to load chase sets");
        return;
      }
      const data = (await response.json()) as { sets: CustomSetOut[] };
      setSets(data.sets);
      setSlotCounts((current) => {
        const next = { ...current };
        for (const set of data.sets) {
          if (set.card_count > 0) next[set.uuid] = set.card_count;
        }
        return next;
      });
    });
  }

  useEffect(() => {
    loadSets();
  }, []);

  useEffect(() => {
    onCountChange?.(sets.length);
  }, [sets.length, onCountChange]);

  function handleSetCreated(set: CustomSetOut, slotCount?: number) {
    setSets((current) => {
      const exists = current.some((item) => item.uuid === set.uuid);
      return exists ? current : [set, ...current];
    });
    if (slotCount && slotCount > 0) rememberSlotCount(set.uuid, slotCount);
    setExpandedUuid(set.uuid);
    loadSets();
  }

  if (isPending && sets.length === 0) {
    return (
      <Sheen loading label="Loading chase sets" className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SheenBar key={index} className="h-20 w-full rounded-xl" />
        ))}
      </Sheen>
    );
  }

  return (
    <div className="space-y-4">
      <ChaseSetWizard onCreated={handleSetCreated} />
      <ChaseCliHelp />

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
          {error}
        </div>
      ) : null}

      {sets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
          No chase sets yet. Create one with{" "}
          <code className="text-sky-300">slab chase create</code> and it will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => {
            const expanded = expandedUuid === set.uuid;
            return (
              <section key={set.uuid} className="space-y-3">
                <ChaseSetBanner
                  set={set}
                  slotCount={slotCounts[set.uuid] ?? null}
                  expanded={expanded}
                  onToggle={() =>
                    setExpandedUuid((current) =>
                      current === set.uuid ? null : set.uuid,
                    )
                  }
                />
                {expanded ? (
                  <ChaseSetDetailPanel
                    setUuid={set.uuid}
                    onSlotCount={(count) => rememberSlotCount(set.uuid, count)}
                  />
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
