"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";

import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { BAND_OPACITY, CHROME, DOT_RADIUS, LINE_WIDTH, SERIES } from "@/components/charts/theme";
import type { LifecycleCurve, LifecyclePoint } from "@/lib/slab/types";

/** The surface this chart draws on — `.panel`, for the marker's ring. */
const SURFACE = "#162040";

/** Release day is 100 by construction, so it's the line every other level is read against. */
const RELEASE_LEVEL = 100;

export function formatAge(months: number): string {
  if (months === 0) return "Release";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} yr` : `${years} yr ${rest} mo`;
}

export function formatLevel(level: number): string {
  return level.toFixed(1);
}

export function formatMove(move: number): string {
  return `${move > 0 ? "+" : ""}${move.toFixed(2)}%`;
}

/**
 * The benchmark curve: index level against the card's age.
 *
 * The chart names itself: the benchmark's title and its one-line definition ARE the chart's header,
 * which is also why there's no legend key. One series needs no legend box — a swatch reading
 * "Typical raw card" beside a title already saying so is a label restating a label — and hoisting
 * the name out to a heading above the folder left it stranded over a tab strip, describing a
 * section rather than the thing on screen.
 *
 * The chart's whole job is
 * "where is this relative to release", so release day gets its own dashed reference line at 100.
 * Dashed is right *here*, where a gridline may not be: this line is a threshold, and the anti-
 * pattern is dashing a plain grid so it fakes being one.
 *
 * A single line on a wide dark panel reads as an empty room, so the level carries a wash beneath
 * it that fades out toward the floor of the scale. It adds mass, not data — the line is still the
 * mark that carries the value, and the fill's top edge IS the line.
 *
 * **The plot stops where the data stops.** `points` covers only the estimated region; past
 * `estimated_through_month` the API deliberately ships nothing, because out there it can't tell
 * flat from noise. Drawing a flat tail would fabricate exactly the reassurance the API refused to
 * fabricate. The header says how far the estimate runs; the Explanation tab says what happens
 * beyond it, in the API's own words.
 */
export function LifecycleChart({
  curve,
  title,
  subtitle,
  itemNoun,
}: {
  curve: LifecycleCurve;
  /** The benchmark's name — the API's word for it, not ours. */
  title: string;
  /** Its one-line definition, straight from the response's glossary. */
  subtitle?: string;
  /** What this universe measures, singular: "card", "box". Every label that names the thing
   *  being aged reads off this, so a box curve never says "card". */
  itemNoun: string;
}) {
  const points = curve.points;

  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-dim)]">
        This build has too few estimated ages to draw a curve.
      </div>
    );
  }

  // Round the scale to tens and tick it the same way. Left to Recharts the axis reads 105 / 86 /
  // 71 / 56 — arithmetic on the padded domain — and a reader has to do subtraction to see that
  // the low is a third off release. Tens are the numbers this index is spoken in.
  const levels = points.map((point) => point.level);
  const low = Math.floor(Math.min(...levels, RELEASE_LEVEL) / 10) * 10;
  const high = Math.ceil(Math.max(...levels, RELEASE_LEVEL) / 10) * 10;
  const levelTicks = [];
  for (let level = low; level <= high; level += 10) levelTicks.push(level);

  const lastAge = points.at(-1)!.age_months;
  // A tick a year, so the axis reads in the unit people think in ("a year old", "three years
  // old") rather than in whatever month count the build happens to reach. The final partial year
  // gets a tick only if it has room — "4 yr" and "4 yr 4 mo" printed four months apart collide,
  // and the header already says where the estimate ends.
  const ticks = [];
  for (let month = 0; month <= lastAge; month += 12) ticks.push(month);
  if (lastAge - (ticks.at(-1) ?? 0) >= 6) ticks.push(lastAge);

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as LifecyclePoint | undefined;
    if (!point) return null;

    return (
      <ChartTooltip
        label={formatAge(point.age_months)}
        rows={[
          {
            name: "of release price",
            value: formatLevel(point.level),
            color: SERIES.value,
          },
          // The move and the evidence count behind it. A tooltip may never be the ONLY way to
          // reach a number — both are in the table below the chart too.
          ...(point.age_months > 0
            ? [
                {
                  name: "typical move this month",
                  value: formatMove(point.monthly_move),
                  color: SERIES.value,
                },
                {
                  name: `same-${itemNoun} comparisons`,
                  value: point.pairs.toLocaleString(),
                  color: CHROME.axisText,
                },
              ]
            : []),
        ]}
      />
    );
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-xs text-[var(--text-dim)]">
            Estimated through {formatAge(curve.estimated_through_month)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {subtitle ? (
            <p className="max-w-3xl text-sm text-slate-400">{subtitle}</p>
          ) : (
            <span />
          )}
          {/* The dashed line's key, stated here rather than floated inside the plot. Its height
              is wherever 100 falls, which is the top of the scale for a curve that only falls and
              the bottom for one that only rises — so an in-plot label lands on the axis ticks
              half the time. It also says what the y scale IS, which is why the axis carries no
              rotated title: a unit is better read once in words than sideways. */}
          <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-dim)]">
            <span
              aria-hidden="true"
              className="h-px w-6 border-t border-dashed border-[var(--text-dim)]"
            />
            Release price = 100
          </span>
        </div>
      </div>

      {/* Sized to fill the folder body under the header rather than floating in it — the panel
          height is fixed, so a short chart just leaves a hole under the axis. */}
      <ResponsiveContainer width="100%" height={330}>
        <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            {/* Strong where it meets the line, gone by the floor — so the wash reads as depth
                under the line rather than as a block of color with its own edge. */}
            <linearGradient id="lifecycle-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES.value} stopOpacity={BAND_OPACITY * 2} />
              <stop offset="100%" stopColor={SERIES.value} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHROME.grid} strokeWidth={1} vertical={false} />
          <XAxis
            type="number"
            dataKey="age_months"
            domain={[0, lastAge]}
            ticks={ticks}
            tickFormatter={formatAge}
            tick={{ fill: CHROME.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHROME.grid }}
            minTickGap={16}
            // The axis reserves its own band (ticks + label) rather than borrowing the chart's
            // bottom margin — a negative offset into the margin is what clips an axis title.
            height={48}
            label={{
              value: `Age of the ${itemNoun}`,
              position: "insideBottom",
              offset: 0,
              fill: CHROME.axisText,
              fontSize: 11,
            }}
          />
          <YAxis
            domain={[low, high]}
            ticks={levelTicks}
            tickFormatter={(value: number) => value.toFixed(0)}
            tick={{ fill: CHROME.axisText, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            content={renderTooltip}
            cursor={{ stroke: CHROME.tooltipBorder, strokeWidth: 1 }}
          />
          <ReferenceLine
            y={RELEASE_LEVEL}
            stroke={CHROME.axisText}
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="level"
            stroke={SERIES.value}
            strokeWidth={LINE_WIDTH}
            fill="url(#lifecycle-wash)"
            dot={false}
            activeDot={{
              r: DOT_RADIUS,
              fill: SERIES.value,
              stroke: SURFACE,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
