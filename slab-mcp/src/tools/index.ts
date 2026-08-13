/**
 * THE REGISTRY.
 *
 * One array is the whole tool surface. Adding a tool is a module under
 * `tools/` plus a line here; nothing downstream changes, because registration
 * is a loop, not a sequence of hand-written `server.registerTool` calls.
 *
 * Write tools are a separate array only so the gate is structural: read tools
 * are always registered, write tools only when the operator turned them on. A
 * tool the server never registers is a tool a model cannot call, which is a
 * stronger guarantee than any instruction in a description.
 */

import type { McpServer } from '@modelcontextprotocol/server';
import type { ToolContext } from '../context.js';
import { toToolError } from '../errors.js';
import { catalogTools } from './catalog.js';
import { collectionTools } from './collection.js';
import { communityTools } from './community.js';
import { metaTools } from './meta.js';
import { pricingTools } from './pricing.js';
import type { ToolModule } from './types.js';
import { writeTools } from './writes.js';

/** Always registered. */
export const READ_TOOLS: ToolModule[] = [
  ...catalogTools,
  ...pricingTools,
  ...collectionTools,
  ...communityTools,
  ...metaTools,
];

/** Registered only when SLAB_MCP_WRITE is on. */
export const WRITE_TOOLS: ToolModule[] = [...writeTools];

/** Everything, for tests and documentation. */
export const ALL_TOOLS: ToolModule[] = [...READ_TOOLS, ...WRITE_TOOLS];

export function registerTools(server: McpServer, ctx: ToolContext): ToolModule[] {
  const active = ctx.config.writesEnabled ? ALL_TOOLS : READ_TOOLS;

  for (const tool of active) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema as never,
        annotations: tool.annotations,
      },
      // Every handler is wrapped once, here. An unhandled throw in a tool
      // would otherwise surface as a protocol error the model cannot read;
      // toToolError turns it into a result it can act on.
      (async (args: unknown) => {
        try {
          return await tool.handler(args as never, ctx);
        } catch (err) {
          return toToolError(err);
        }
      }) as never,
    );
  }

  return active;
}
