/**
 * The tool contract — the seam this whole server is built around.
 *
 * Adding a tool is: write a `defineTool({...})` in a module under `tools/`,
 * and add it to the array in `tools/index.ts`. Nothing else changes. No
 * registration code, no switch statement, no edit to `index.ts`.
 *
 * Two fields are required that most MCP examples leave optional, because
 * making them optional is how a write tool ships looking like a read tool:
 *
 *   - `mutates`  — the ONLY thing that decides whether a tool is registered
 *                  when SLAB_MCP_WRITE is off. Not a naming convention, not a
 *                  hand-maintained list.
 *   - `annotations` — the hints an MCP host uses to decide whether to prompt
 *                  the user before running a tool. A host cannot ask about a
 *                  hint that was never declared.
 *
 * `tests/registry.test.ts` enforces that these two agree with each other, so
 * a mislabelled tool fails the suite rather than silently shipping.
 */

import type { z } from 'zod';
import type { ToolContext } from '../context.js';
import type { ToolResult } from '../format.js';

/**
 * MCP tool annotations. All are advisory hints for the host UI — none of them
 * are enforced by the protocol, so they describe intent, never permission.
 */
export interface ToolAnnotations {
  /** The tool does not modify anything. */
  readOnlyHint: boolean;
  /** The tool may perform irreversible updates or deletions. */
  destructiveHint?: boolean;
  /** Calling it twice with the same arguments has the same effect as calling it once. */
  idempotentHint?: boolean;
  /** The tool touches data outside the closed world of this server. */
  openWorldHint?: boolean;
}

export interface ToolModule<S extends z.ZodType = z.ZodType> {
  /** Wire name. snake_case, verb-first, unique across the registry. */
  name: string;
  /** Short human label for host UIs. */
  title: string;
  /**
   * The tool's public reference text — this is what the calling model reads to
   * decide whether to call it. Write *when would I reach for this* and *what
   * do the numbers mean*, not a restatement of the parameter list. Name the
   * tool that produces any UUID this one consumes; a model that cannot see
   * where an argument comes from will invent one.
   */
  description: string;
  inputSchema: S;
  annotations: ToolAnnotations;
  /** True if the tool writes. Gates registration behind SLAB_MCP_WRITE. */
  mutates: boolean;
  /**
   * Declared as a method, not a property, so a concrete tool is assignable to
   * `ToolModule` in the registry array (TS treats method parameters
   * bivariantly). The registry validates arguments against `inputSchema`
   * before this runs.
   */
  handler(input: z.infer<S>, ctx: ToolContext): Promise<ToolResult>;
}

/** Identity helper that preserves the inferred input type for the handler. */
export function defineTool<S extends z.ZodType>(module: ToolModule<S>): ToolModule<S> {
  return module;
}

/** Annotation presets, so the common cases are one word and hard to get wrong. */
export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const CREATES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

export const UPDATES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export const DELETES: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};
