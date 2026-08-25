"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import {
  LifecycleChart,
  formatAge,
  formatLevel,
  formatMove,
} from "@/components/market/LifecycleChart";
import { SetupPrompt } from "@/components/collection/SetupPrompt";
import { FolderTabs } from "@/components/ui/FolderTabs";
import { Sheen, SheenBar } from "@/components/ui/sheen";
import type {
  LifecycleCurve,
  LifecycleUniverse,
  MetricInfo,
} from "@/lib/slab/types";
import { fetchJson } from "@/lib/slab/fetch-json";

/**
 * One lifecycle benchmark — a universe's curve — as one section: its name, one sentence saying
 * what it is, and a folder
 * with three faces of the same metric — the chart, the numbers behind it, and how it's derived.
 *
 * The three are tabs rather than sections stacked down the page for the same reason the card page
 * uses folders: they are three ways of asking about ONE thing, and stacking them made the page a
 * scroll where the chart — the reason anyone opened it — got smaller the more the metric had to
 * say. Tabbed, the metric is a fixed-size object on the page, which is also what makes a second
 * benchmark a sibling of this one rather than another screen of scroll.
 *
 * Two things it inherits from the API and must not quietly break:
 *  - **Descriptive, never prescriptive.** The benchmark is the baseline a card is judged against.
 *    It doesn't say buy, sell, rip, or grade, and neither does this panel.
 *  - **The definition comes from the response.** The `market.*` glossary travels with the data, so
 *    the words here are the words the API and the CLI use. Nothing here restates a definition in
 *    its own voice — that's how three surfaces end up explaining one number three ways.
 */
type Face = "chart" | "data" | "about";

export interface LifecyclePanelProps {
  /** Which pool to benchmark. Also the guard: a curve that comes back for a different one is
   *  an API that doesn't know this parameter yet, not an answer to what was asked. */
  universe: LifecycleUniverse;
  /** This universe's glossary key — `lifecycle` for cards, `sealed_lifecycle` for boxes. */
  glossaryKey: string;
  /** What this universe measures, singular: "card", "box". Every label that names the thing being
   *  aged reads off this, so the sealed curve never says "card" on a box. */
  itemNoun: string;
}

export function LifecyclePanel({
  universe,
  glossaryKey,
  itemNoun,
}: LifecyclePanelProps) {
  const [face, setFace] = useState<Face>("chart");
  const [curve, setCurve] = useState<LifecycleCurve | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unbuilt, setUnbuilt] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [, startTransition] = useTransition();

  // The fetch and every state write it causes live inside the transition, the way the rest of the
  // app's views load — an effect body that setStates synchronously cascades renders.
  const load = useCallback(() => {
    startTransition(async () => {
      const result = await fetchJson<LifecycleCurve>(
        `/api/market/lifecycle?universe=${universe}`,
        undefined,
        "Failed to load the benchmark",
      );

      // No API key configured — the whole app's answer to that, not this panel's.
      if (result.status === "setup") {
        setNeedsSetup(true);
        return;
      }

      if (result.status === "error") {
        // 404 is an answer, not a failure: no build has been published. Say that plainly rather
        // than showing an error, and never draw an empty curve to avoid the empty state.
        if (result.httpStatus === 404) {
          setUnbuilt(result.message || "No lifecycle build published yet.");
        } else {
          setError(result.message);
        }
        return;
      }

      // An API build from before this universe existed ignores the query param and answers with
      // the default curve. Showing card ageing under a "hobby boxes" heading would be worse than
      // showing nothing, so an answer about the wrong pool counts as no answer.
      const served = result.data;
      if ((served.universe ?? "raw_cards") !== universe) {
        setUnbuilt("This API build doesn't serve that benchmark yet.");
        return;
      }

      setUnbuilt(null);
      setCurve(served);
    });
  }, [universe]);

  useEffect(() => {
    load();
  }, [load]);

  const g = (key: string): MetricInfo | undefined => curve?.glossary?.[`market.${key}`];
  // Every universe's response carries the whole `market.*` glossary, so the panel picks out the
  // entry that defines ITS curve; the estimation rule is shared by all of them.
  const benchmark = g(glossaryKey);
  const estimation = g("lifecycle_estimation");

  if (needsSetup) return <SetupPrompt />;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
        {error}
      </div>
    );
  }

  if (unbuilt) return <NotBuiltYet detail={unbuilt} />;
  if (!curve) return <LoadingBenchmark />;

  // The name is navigation, so it has a plain fallback; the definition beside it has none — it
  // renders only from the response's own glossary. Both belong to the metric, so they travel INTO
  // the face being shown rather than sitting above the tab strip describing a section.
  const title = benchmark?.label ?? "Lifecycle benchmark";

  return (
    <div className="space-y-5">
      <FolderTabs
        ariaLabel="Lifecycle benchmark"
        tabs={[
          { id: "chart", label: "Chart" },
          { id: "data", label: "Raw data", hint: `${curve.points.length} ages` },
          { id: "about", label: "Explanation" },
        ]}
        value={face}
        onChange={setFace}
        /* One height for all three faces, and its own scroll inside. The chart is the tallest
           fixed thing here; the table is unbounded and the explanation is two paragraphs, so
           sizing to content would make switching tabs resize the page under the reader. */
        bodyClassName="h-[28rem] overflow-y-auto"
      >
        {face === "chart" ? (
          <LifecycleChart
            curve={curve}
            title={title}
            subtitle={benchmark?.summary}
            itemNoun={itemNoun}
          />
        ) : null}
        {face === "data" ? (
          <PointsTable curve={curve} itemNoun={itemNoun} />
        ) : null}
        {face === "about" ? (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
            {benchmark ? (
              <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                {benchmark.detail}
              </p>
            ) : null}
            {estimation ? (
              <>
                <h4 className="heading-section mt-5">{estimation.label}</h4>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                  {estimation.detail}
                </p>
              </>
            ) : null}
            <BuildLine curve={curve} />
          </div>
        ) : null}
      </FolderTabs>
    </div>
  );
}

/**
 * The empty state that isn't an error.
 *
 * The curve is a deliberate, manual build; until one has run there is nothing to serve and the API
 * says so with a 404. Reporting that as "something went wrong" sends someone looking for a bug
 * that isn't there.
 */
function NotBuiltYet({ detail }: { detail: string }) {
  return (
    <section className="panel p-6">
      <h3 className="text-base font-semibold text-white">No benchmark published yet</h3>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        A lifecycle curve is built deliberately, per universe, and frozen between builds — so it
        appears here once a build for this one has been published to this API. Nothing is
        estimated in the meantime.
      </p>
      <p className="mt-3 font-mono text-xs text-[var(--text-dim)]">{detail}</p>
    </section>
  );
}

function LoadingBenchmark() {
  return (
    <div className="space-y-5">
      {/* Sized like the loaded panel, so the page doesn't jump when the curve lands. */}
      <Sheen loading label="Loading the lifecycle benchmark">
        <SheenBar className="h-8 w-72 max-w-full" />
        <SheenBar className="mt-3 h-5 w-96 max-w-full" />
      </Sheen>
      <Sheen loading label="Loading the curve" className="panel p-5">
        <SheenBar className="h-4 w-40" />
        <SheenBar className="mt-4 h-[280px] w-full rounded-xl" />
        <SheenBar className="mt-3 h-4 w-2/3" />
      </Sheen>
    </div>
  );
}

/**
 * Which build you're looking at.
 *
 * The curve is frozen between builds and revisions are meant to be visible rather than silent —
 * comps harvesting backfills old sales, so two builds honestly differ. Quoting the build id
 * alongside a number is what makes that number reproducible later.
 */
function BuildLine({ curve }: { curve: LifecycleCurve }) {
  const computed = new Date(curve.computed_dt);
  const computedLabel = Number.isNaN(computed.getTime())
    ? curve.computed_dt
    : computed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

  return (
    <p className="mt-5 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-dim)]">
      Build <span className="font-mono text-slate-400">{curve.uuid.slice(0, 8)}</span>, computed{" "}
      {computedLabel} from {curve.comp_count.toLocaleString()} sales between {curve.data_from} and{" "}
      {curve.data_through}. An age joins the curve at{" "}
      {curve.min_bin_pairs.toLocaleString()}+ comparisons.
    </p>
  );
}

/**
 * The chart's table twin.
 *
 * Every value the tooltip shows is reachable here without hovering — the monthly move and, more
 * importantly, the evidence count behind each age. A benchmark that shows its shape but hides how
 * many sales sit under each point is asking to be trusted rather than checked.
 */
function PointsTable({
  curve,
  itemNoun,
}: {
  curve: LifecycleCurve;
  itemNoun: string;
}) {
  return (
    <table className="min-w-full text-left text-sm">
      {/* Sticky against the folder body's own scroll, in the folder's fill so rows pass under it
          rather than through it. */}
      <thead className="sticky top-0 bg-[#1a2744] text-[11px] uppercase tracking-wide text-[var(--text-dim)]">
        <tr>
          <th className="pb-2 pr-4 font-medium">Age</th>
          <th className="pb-2 pr-4 text-right font-medium">Level</th>
          <th className="pb-2 pr-4 text-right font-medium">Move that month</th>
          <th className="pb-2 text-right font-medium">
            Same-{itemNoun} comparisons
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]/60">
        {curve.points.map((point) => (
          <tr key={point.age_months}>
            <td className="py-2 pr-4 text-slate-300">{formatAge(point.age_months)}</td>
            <td className="py-2 pr-4 text-right font-mono tabular-nums text-white">
              {formatLevel(point.level)}
            </td>
            <td className="py-2 pr-4 text-right font-mono tabular-nums text-slate-300">
              {point.age_months === 0 ? "—" : formatMove(point.monthly_move)}
            </td>
            <td className="py-2 text-right font-mono tabular-nums text-slate-400">
              {point.age_months === 0 ? "—" : point.pairs.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
