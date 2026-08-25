"use client";

import { useState, useTransition } from "react";

import {
  CHASE_FILTER_PRESETS,
  filterSummary,
  type ChaseFilterInput,
  type ChaseSetMode,
  type ChaseSetVisibility,
} from "@/lib/chase-filter";
import type { CustomSetOut } from "@/lib/slab/types";
import { failureMessage, fetchJson } from "@/lib/slab/fetch-json";

interface ChaseSetWizardProps {
  onCreated: (set: CustomSetOut, slotCount?: number) => void;
}

interface PreviewPayload {
  total: number;
  playerCount: number;
  filterJson: Record<string, unknown>;
  samplePlayers: {
    playerName: string;
    cardCount: number;
    representativeLabel: string | null;
  }[];
  rosterReady: boolean;
}

type WizardStep = "basics" | "filters" | "preview" | "done";

const EMPTY_FILTER: ChaseFilterInput = {
  team: "",
  year: CHASE_FILTER_PRESETS.canes2026.year,
  subject: "",
  subset: "",
  brand: "",
  finish: "",
  attribute: "",
  baseOnly: false,
  rookieOnly: false,
  numberedOnly: false,
};

export function ChaseSetWizard({ onCreated }: ChaseSetWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("basics");
  const [name, setName] = useState("2025/2026 Hurricane Team");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ChaseSetVisibility>("private");
  const [filter, setFilter] = useState<ChaseFilterInput>({
    ...EMPTY_FILTER,
    team: CHASE_FILTER_PRESETS.canes2026.team,
  });
  const [mode, setMode] = useState<ChaseSetMode>("roster");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [createResult, setCreateResult] = useState<{
    added: number;
    playerCount?: number;
    totalCards?: number;
    mode: ChaseSetMode;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [, startTransition] = useTransition();

  function resetWizard() {
    setStep("basics");
    setPreview(null);
    setCreateResult(null);
    setError(null);
    setPreviewLoading(false);
    setCreateLoading(false);
  }

  function applyPreset() {
    const preset = CHASE_FILTER_PRESETS.canes2026;
    setName(preset.name);
    setFilter((current) => ({
      ...current,
      team: preset.team,
      year: preset.year,
    }));
  }

  function updateFilter<K extends keyof ChaseFilterInput>(
    key: K,
    value: ChaseFilterInput[K],
  ) {
    setFilter((current) => ({ ...current, [key]: value }));
    setPreview(null);
  }

  function runPreview() {
    setError(null);
    setPreview(null);
    setStep("preview");
    setPreviewLoading(true);

    startTransition(async () => {
      try {
        const result = await fetchJson<PreviewPayload>(
          "/api/chase/preview",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ filter }),
          },
          "Preview failed",
        );

        if (result.status !== "ok") {
          setError(failureMessage(result));
          setStep("filters");
          return;
        }

        setPreview(result.data);
      } finally {
        setPreviewLoading(false);
      }
    });
  }

  function createSet() {
    setError(null);
    setCreateLoading(true);

    startTransition(async () => {
      try {
        const result = await fetchJson<{
          set: CustomSetOut;
          mode: ChaseSetMode;
          added: number;
          playerCount?: number;
          totalCards?: number | null;
        }>(
          "/api/chase/create",
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              description: description.trim() || null,
              mode,
              visibility,
              filter,
            }),
          },
          "Failed to create chase set",
        );

        if (result.status !== "ok") {
          setError(failureMessage(result));
          return;
        }

        const payload = result.data;

        setCreateResult({
          added: payload.added,
          playerCount: payload.playerCount,
          totalCards: payload.totalCards ?? undefined,
          mode: payload.mode,
        });
        setStep("done");
        onCreated(
          payload.set,
          payload.set.card_count ||
            preview?.total ||
            payload.totalCards ||
            undefined,
        );
      } finally {
        setCreateLoading(false);
      }
    });
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) resetWizard();
        }}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-medium text-white">Create chase set</p>
          <p className="mt-0.5 text-sm text-slate-400">
            Step-by-step filters like slab chase create — roster or master set
          </p>
        </div>
        <span className="text-sm text-sky-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="space-y-5 border-t border-slate-800 px-5 py-4">
          <WizardSteps active={step} />

          {step === "basics" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-400">
                  Set name
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={applyPreset}
                    className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 hover:bg-sky-500/20"
                  >
                    Use Canes 2025–26 preset
                  </button>
                </div>
              </div>
              <label className="block text-sm text-slate-400">
                Description (optional)
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="2026 Stanley Cup roster chase"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
              </label>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-white">
                  Visibility
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <input
                    type="radio"
                    name="chase-visibility"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Private
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Only you can see and track this set
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                  <input
                    type="radio"
                    name="chase-visibility"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">
                      Public
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      Other collectors can find and subscribe via slab chase find
                    </span>
                  </span>
                </label>
              </fieldset>

              <StepNav
                onNext={() => setStep("filters")}
                nextLabel="Next: filters"
                disableNext={!name.trim()}
              />
            </div>
          ) : null}

          {step === "filters" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Set the criteria for this chase set. Leave a field blank to skip
                it — same as the CLI wizard.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FilterField
                    label="Team"
                    value={filter.team ?? ""}
                    onChange={(value) => updateFilter("team", value)}
                    placeholder="Hurricanes"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use the mascot only (e.g. Hurricanes, not Carolina
                    Hurricanes).
                  </p>
                </div>
                <FilterField
                  label="Season year"
                  value={filter.year?.toString() ?? ""}
                  onChange={(value) =>
                    updateFilter(
                      "year",
                      value.trim() ? Number(value) : undefined,
                    )
                  }
                  placeholder="2025"
                  inputMode="numeric"
                />
                <FilterField
                  label="Player name (optional)"
                  value={filter.subject ?? ""}
                  onChange={(value) => updateFilter("subject", value)}
                  placeholder="Leave blank for full team"
                />
                <FilterField
                  label="Subset (optional)"
                  value={filter.subset ?? ""}
                  onChange={(value) => updateFilter("subset", value)}
                  placeholder="Young Guns"
                />
                <FilterField
                  label="Brand (optional)"
                  value={filter.brand ?? ""}
                  onChange={(value) => updateFilter("brand", value)}
                  placeholder="Upper Deck"
                />
                <FilterField
                  label="Finish (optional)"
                  value={filter.finish ?? ""}
                  onChange={(value) => updateFilter("finish", value)}
                  placeholder="Rainbow"
                />
                <FilterField
                  label="Attribute (optional)"
                  value={filter.attribute ?? ""}
                  onChange={(value) => updateFilter("attribute", value)}
                  placeholder="Rookie"
                />
                <FilterField
                  label="Max print run (optional)"
                  value={filter.numberedMax?.toString() ?? ""}
                  onChange={(value) =>
                    updateFilter(
                      "numberedMax",
                      value.trim() ? Number(value) : undefined,
                    )
                  }
                  placeholder="99"
                  inputMode="numeric"
                />
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                <ToggleField
                  label="Base cards only"
                  checked={Boolean(filter.baseOnly)}
                  onChange={(checked) => updateFilter("baseOnly", checked)}
                />
                <ToggleField
                  label="Rookies only"
                  checked={Boolean(filter.rookieOnly)}
                  onChange={(checked) => updateFilter("rookieOnly", checked)}
                />
                <ToggleField
                  label="Numbered only"
                  checked={Boolean(filter.numberedOnly)}
                  onChange={(checked) => updateFilter("numberedOnly", checked)}
                />
              </div>

              <StepNav
                onBack={() => setStep("basics")}
                onNext={runPreview}
                nextLabel="Preview matches"
                loading={previewLoading}
                disableNext={previewLoading}
              />
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-4">
              {previewLoading ? (
                <LoadingPanel
                  title="Searching catalog…"
                  detail="Fetching matching cards and grouping by player. Large teams can take 10–30 seconds."
                />
              ) : preview ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Catalog cards" value={String(preview.total)} />
                    <StatCard
                      label="Unique players"
                      value={String(preview.playerCount)}
                    />
                    <StatCard
                      label="Filter fields"
                      value={String(filterSummary(filter).length)}
                    />
                  </div>

                  {preview.total === 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      No cards matched these filters. Try removing brand, base-only,
                      or other restrictions — team + year alone usually works best.
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Active filters
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      <li>
                        Visibility:{" "}
                        {visibility === "public" ? "Public" : "Private"}
                      </li>
                      {filterSummary(filter).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  {preview.samplePlayers.length > 0 ? (
                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Sample players
                      </p>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-400">
                        {preview.samplePlayers.map((row) => (
                          <li key={row.playerName}>
                            <span className="text-slate-200">{row.playerName}</span>
                            {" · "}
                            {row.cardCount} catalog card
                            {row.cardCount === 1 ? "" : "s"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* One radio per rung of the match ladder, loosest first: what does a
                      single slot MEAN, and what fills it? */}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-white">
                      What does one slot mean?
                    </legend>
                    {(
                      [
                        {
                          id: "roster",
                          title: "Roster chase — auto-growing (recommended)",
                          desc: `One slot per player (${preview.playerCount} today) — any matching card of them fills it, and new players join the set as they get carded.`,
                        },
                        {
                          id: "roster-frozen",
                          title: "Roster chase — fixed list",
                          desc: `These ${preview.playerCount} players as editable player slots — prune or retune them afterward; the list never changes on its own.`,
                        },
                        {
                          id: "slots",
                          title: "Team set — one slot per card",
                          desc: "Every card in the filter, collapsed to its slot — the base or ANY parallel of it checks the box.",
                        },
                        {
                          id: "printings",
                          title: "Full rainbow — every printing",
                          desc: `All ${preview.total} matching printings, each its own slot — only that exact card fills it.`,
                        },
                      ] as const
                    ).map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                      >
                        <input
                          type="radio"
                          name="chase-mode"
                          checked={mode === option.id}
                          onChange={() => setMode(option.id)}
                          className="mt-1"
                          disabled={createLoading}
                        />
                        <span>
                          <span className="block text-sm font-medium text-white">
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-400">
                            {option.desc}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </>
              ) : null}

              {createLoading ? (
                <LoadingPanel
                  title={
                    mode === "roster-frozen"
                      ? "Building roster set…"
                      : "Creating chase set…"
                  }
                  detail={
                    mode === "roster-frozen"
                      ? "Adding one player slot per player — any matching card counts."
                      : "Saving filter rules to your chase set."
                  }
                />
              ) : null}

              {!previewLoading && !createLoading ? (
                <StepNav
                  onBack={() => setStep("filters")}
                  onNext={createSet}
                  nextLabel={
                    mode === "roster" || mode === "roster-frozen"
                      ? "Create roster chase"
                      : mode === "slots"
                        ? "Create team set"
                        : "Create printing set"
                  }
                  disableNext={
                    !preview ||
                    ((mode === "roster" || mode === "roster-frozen") &&
                      preview.playerCount === 0) ||
                    ((mode === "slots" || mode === "printings") && preview.total === 0)
                  }
                />
              ) : null}
            </div>
          ) : null}

          {step === "done" && createResult ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {createResult.mode === "roster" ? (
                <p>
                  Roster chase created — one slot per player
                  {preview ? ` (${preview.playerCount} today)` : ""}, filled by any
                  matching card of them, growing as new players get carded.
                </p>
              ) : createResult.mode === "roster-frozen" ? (
                <p>
                  Roster set created with {createResult.added} player slots
                  {createResult.totalCards
                    ? ` from ${createResult.totalCards} catalog cards`
                    : ""}
                  .
                </p>
              ) : createResult.mode === "slots" ? (
                <p>
                  Team set created — one slot per card; the base or any parallel of
                  it checks the box.
                </p>
              ) : (
                <p>
                  Printing set created — all {preview?.total ?? "matching"} printings
                  tracked, each as its own slot.
                </p>
              )}
              <button
                type="button"
                onClick={resetWizard}
                className="mt-3 text-sky-300 hover:text-sky-200"
              >
                Create another
              </button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function WizardSteps({ active }: { active: WizardStep }) {
  const steps: { id: WizardStep; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "filters", label: "Filters" },
    { id: "preview", label: "Preview" },
    { id: "done", label: "Done" },
  ];

  const activeIndex = steps.findIndex((step) => step.id === active);

  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {steps.map((step, index) => {
        const current = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <li
            key={step.id}
            className={
              current
                ? "rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-sky-200"
                : complete
                  ? "rounded-full border border-emerald-500/30 px-3 py-1 text-emerald-300"
                  : "rounded-full border border-slate-800 px-3 py-1 text-slate-500"
            }
          >
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block text-sm text-slate-400">
      {label}
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-slate-700 bg-slate-950"
      />
      {label}
    </label>
  );
}

function LoadingPanel({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/5 px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 max-w-md text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400"
      aria-hidden="true"
    />
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel,
  disableNext,
  loading = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  disableNext?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-60"
        >
          Back
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext || loading}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
      >
        {loading ? <SpinnerSmall /> : null}
        {loading ? "Working…" : nextLabel}
      </button>
    </div>
  );
}

function SpinnerSmall() {
  return (
    <div
      className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
      aria-hidden="true"
    />
  );
}
