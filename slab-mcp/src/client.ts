/**
 * Thin typed HTTP client for the slab API.
 *
 * Deliberately dumb: it knows about auth, timeouts, and error shapes, and
 * nothing about cards. Endpoint knowledge lives in the tool modules, so adding
 * an endpoint never means touching this file.
 *
 * The response types are declared structurally in `types.ts` rather than
 * generated, because a generated client would have to be regenerated to stay
 * honest. `GET /openapi.json` is the authoritative contract and is exposed to
 * the model as a resource — see src/resources/index.ts.
 */

import type { Config } from './config.js';
import { ApiConnectionError, ApiError } from './errors.js';

export interface RequestOptions {
  /** JSON request body. Undefined keys are stripped before sending. */
  body?: unknown;
  /** Query parameters. Undefined/null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

/** Strip undefined values so we never send `{"brand": undefined}` -> `{"brand": null}`. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prune);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = prune(v);
    }
    return out;
  }
  return value;
}

export class SlabClient {
  constructor(private readonly config: Config) {}

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(this.config.apiUrl + path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      'x-api-key': this.config.apiKey,
      accept: 'application/json',
      'user-agent': 'slab-mcp',
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(prune(options.body)),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'TimeoutError'
          ? `request timed out after ${this.config.timeoutMs}ms`
          : err instanceof Error
            ? err.message
            : String(err);
      throw new ApiConnectionError(this.config.apiUrl, reason);
    }

    if (!response.ok) {
      let detail = await response.text();
      try {
        const parsed = JSON.parse(detail) as { detail?: unknown };
        if (parsed && typeof parsed === 'object' && 'detail' in parsed) {
          detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
        }
      } catch {
        // Body was not JSON; the raw text is the best detail we have.
      }
      throw new ApiError(response.status, detail.slice(0, 2000), method, path);
    }

    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** Fetch a public document verbatim (used by the resource handlers). */
  async raw(path: string): Promise<string> {
    const url = this.config.apiUrl + path;
    try {
      const response = await fetch(url, {
        headers: { 'x-api-key': this.config.apiKey, 'user-agent': 'slab-mcp' },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
      if (!response.ok) throw new ApiError(response.status, await response.text(), 'GET', path);
      return await response.text();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiConnectionError(this.config.apiUrl, err instanceof Error ? err.message : String(err));
    }
  }
}
