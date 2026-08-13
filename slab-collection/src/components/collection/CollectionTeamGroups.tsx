"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { CardListRow } from "@/components/collection/CardListRow";
import { TeamLogo } from "@/components/collection/TeamLogo";
import {
  groupByTeam,
  sortTeamGroups,
  type TeamGroupSort,
} from "@/lib/collection-filters";
import type { CardCopyOut } from "@/lib/slab/types";

interface CollectionTeamGroupsProps {
  items: CardCopyOut[];
}

interface TeamTileProps {
  team: string;
  playerCount: number;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

function TeamTile({ team, playerCount, count, expanded, onToggle }: TeamTileProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full flex-col overflow-hidden rounded-xl border bg-slate-900/60 text-left transition ${
        expanded
          ? "border-sky-500/50 bg-slate-900 ring-2 ring-sky-500/20"
          : "border-slate-800 hover:border-sky-500/40 hover:bg-slate-900"
      }`}
    >
      <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-3">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_55%)]" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2">
          <TeamLogo team={team} size="lg" className="border-2 border-slate-700/80" />
          <p className="line-clamp-2 text-center text-sm font-semibold leading-tight text-white">
            {team}
          </p>
        </div>
      </div>

      <div className="border-t border-slate-800 px-3 py-2.5">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Players · Cards
            </p>
            <p className="text-lg font-semibold text-white">
              {playerCount}
              <span className="mx-1 text-sm font-normal text-slate-500">·</span>
              {count}
            </p>
          </div>
          <span className="text-xs text-sky-400">
            {expanded ? "Hide" : "Show"}
          </span>
        </div>
      </div>
    </button>
  );
}

function useTeamGridColumns(): number {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    function updateColumns() {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(6);
      else if (width >= 1024) setColumns(5);
      else if (width >= 768) setColumns(4);
      else if (width >= 640) setColumns(3);
      else setColumns(1);
    }

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return columns;
}

function rowEndIndex(index: number, columns: number, total: number): number {
  return Math.min(Math.floor(index / columns) * columns + columns - 1, total - 1);
}

export function CollectionTeamGroups({ items }: CollectionTeamGroupsProps) {
  const [teamSort, setTeamSort] = useState<TeamGroupSort>("players_desc");
  const groups = useMemo(
    () => sortTeamGroups(groupByTeam(items), teamSort),
    [items, teamSort],
  );
  const columns = useTeamGridColumns();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const panelRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const expandedIndex = expandedTeam
    ? groups.findIndex((group) => group.team === expandedTeam)
    : -1;

  function toggleTeam(team: string) {
    setExpandedTeam((current) => {
      const next = current === team ? null : team;
      if (next) {
        requestAnimationFrame(() => {
          tileRefs.current.get(next)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
      }
      return next;
    });
  }

  useEffect(() => {
    setExpandedTeam(null);
  }, [teamSort]);

  useEffect(() => {
    if (!expandedTeam) return;

    requestAnimationFrame(() => {
      const panel = panelRefs.current.get(expandedTeam);
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      const overflow = rect.bottom - window.innerHeight;
      if (overflow > 0) {
        window.scrollBy({ top: overflow + 24, behavior: "smooth" });
      }
    });
  }, [expandedTeam, columns]);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center text-slate-400">
        No team cards found in your collection.
      </div>
    );
  }

  const expandedGroup =
    expandedIndex >= 0 ? groups[expandedIndex] : null;
  const expandedRowEnd =
    expandedIndex >= 0
      ? rowEndIndex(expandedIndex, columns, groups.length)
      : -1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {groups.length} team{groups.length === 1 ? "" : "s"} in your collection
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Sort teams</span>
          <select
            value={teamSort}
            onChange={(event) =>
              setTeamSort(event.target.value as TeamGroupSort)
            }
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
          >
            <option value="players_desc">Most players</option>
            <option value="cards_desc">Most cards</option>
            <option value="alpha">Team name (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {groups.map(({ team, copies, playerCount }, index) => {
        const expanded = expandedTeam === team;
        const showPanelBelowRow =
          expandedGroup && index === expandedRowEnd;

        return (
          <Fragment key={team}>
            <div
              ref={(node) => {
                if (node) tileRefs.current.set(team, node);
                else tileRefs.current.delete(team);
              }}
              className="min-w-0"
            >
              <TeamTile
                team={team}
                playerCount={playerCount}
                count={copies.length}
                expanded={expanded}
                onToggle={() => toggleTeam(team)}
              />
            </div>

            {showPanelBelowRow ? (
              <div
                key={`${expandedGroup.team}-panel`}
                ref={(node) => {
                  if (node) panelRefs.current.set(expandedGroup.team, node);
                  else panelRefs.current.delete(expandedGroup.team);
                }}
                className="col-span-full space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      {expandedGroup.team}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {expandedGroup.playerCount} player
                      {expandedGroup.playerCount === 1 ? "" : "s"} ·{" "}
                      {expandedGroup.copies.length} card
                      {expandedGroup.copies.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedTeam(null)}
                    className="text-sm text-sky-400 transition hover:text-sky-300"
                  >
                    Close
                  </button>
                </div>
                {expandedGroup.copies.map((copy) => (
                  <CardListRow
                    key={`${expandedGroup.team}-${copy.uuid}`}
                    copy={copy}
                  />
                ))}
              </div>
            ) : null}
          </Fragment>
        );
      })}
      </div>
    </div>
  );
}
