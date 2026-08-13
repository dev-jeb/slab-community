/**
 * Configuration, read from the environment exactly once at startup.
 *
 * The API key lives here and nowhere else. It is never a tool argument and is
 * never included in a tool result, so the model on the other end of the
 * transport cannot read it, echo it, or be tricked into exfiltrating it.
 */

import { ConfigError } from './errors.js';

export const DEFAULT_API_URL = 'https://api.slab.dev-jeb.com';

export interface Config {
  /** Base URL of the slab API, no trailing slash. */
  apiUrl: string;
  /** Value sent as the `x-api-key` header on every request. */
  apiKey: string;
  /** Collector the key acts for. Undefined = resolve lazily from `GET /account`. */
  collectorUuid: string | undefined;
  /** Whether mutating tools are registered at all. Off unless SLAB_MCP_WRITE=1. */
  writesEnabled: boolean;
  /** Per-request HTTP timeout. */
  timeoutMs: number;
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.SLAB_API_KEY?.trim();
  if (!apiKey) {
    throw new ConfigError(
      'SLAB_API_KEY is not set. Get a key at https://app.slab.dev-jeb.com -> Account -> API Keys, ' +
        'then set it in the "env" block of your MCP client config (see this tool\'s README).',
    );
  }

  const timeoutRaw = env.SLAB_MCP_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : 30_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError(`SLAB_MCP_TIMEOUT_MS must be a positive number of milliseconds, got "${timeoutRaw}".`);
  }

  return {
    apiUrl: (env.SLAB_API_URL?.trim() || DEFAULT_API_URL).replace(/\/+$/, ''),
    apiKey,
    collectorUuid: env.SLAB_COLLECTOR?.trim() || undefined,
    writesEnabled: truthy(env.SLAB_MCP_WRITE),
    timeoutMs,
  };
}
