/**
 * The object every tool handler receives.
 *
 * Collector resolution lives here because it is the one piece of state the
 * whole server shares. A model cannot invent a collector UUID, so no
 * collection tool should require one: the acting collector comes from
 * SLAB_COLLECTOR, or from `GET /account` once, memoised for the process.
 */

import { SlabClient } from './client.js';
import type { Config } from './config.js';
import { ApiError } from './errors.js';
import type { AccountOut } from './types.js';

export interface ToolContext {
  client: SlabClient;
  config: Config;
  /**
   * The collector to act as. Pass an explicit UUID to override (the tools
   * expose an optional `collector_uuid` for multi-collector accounts).
   */
  collector(override?: string): Promise<string>;
}

export function createContext(config: Config): ToolContext {
  const client = new SlabClient(config);
  let resolved: Promise<string> | undefined;

  async function resolveDefault(): Promise<string> {
    const account = await client.request<AccountOut>('GET', '/account');
    const uuid = account.default_collector_uuid ?? account.collectors?.[0]?.uuid;
    if (!uuid) {
      throw new ApiError(
        404,
        'This API key resolves to an account with no collectors. Create one in the slab portal or with `slab collector create`, then retry.',
        'GET',
        '/account',
      );
    }
    return uuid;
  }

  return {
    client,
    config,
    async collector(override?: string): Promise<string> {
      if (override) return override;
      if (config.collectorUuid) return config.collectorUuid;
      // Memoise the promise, not the value, so concurrent first calls share one request.
      resolved ??= resolveDefault().catch((err: unknown) => {
        resolved = undefined; // let a later call retry after a transient failure
        throw err;
      });
      return resolved;
    },
  };
}
