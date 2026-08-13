/**
 * Error types and the single place where an error becomes a tool result.
 *
 * MCP draws a line most HTTP clients don't: a *protocol* failure (bad method,
 * server broken) is a JSON-RPC error, while a *tool* failure (the card wasn't
 * found, the key was revoked) is a successful response carrying
 * `isError: true`. The second kind is the one the model can see and react to,
 * so every expected failure goes through `toToolError` and comes back as text
 * the model can actually act on.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/** A 4xx/5xx from the slab API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly method: string,
    readonly path: string,
  ) {
    super(`[${status}] ${method} ${path}: ${detail}`);
    this.name = 'ApiError';
  }
}

/** The slab API could not be reached at all. */
export class ApiConnectionError extends Error {
  constructor(
    readonly url: string,
    reason: string,
  ) {
    super(`Cannot reach the slab API at ${url}: ${reason}`);
    this.name = 'ApiConnectionError';
  }
}

/**
 * Guidance the model can act on, keyed by status. Without this an agent sees
 * "[404] not found" and retries the identical call; with it, it knows the next
 * move.
 */
const STATUS_HINTS: Record<number, string> = {
  401: 'The API key is missing, unknown, revoked, or disabled. This is a configuration problem on the user\'s machine — tell them to check SLAB_API_KEY in their MCP client config. Do not retry.',
  404: 'Either the UUID does not exist or it belongs to another account. slab does not distinguish the two, on purpose. Re-run the matching search tool to get a current UUID rather than guessing one.',
  409: 'The request conflicts with existing data (usually a duplicate). Read the current state before writing again.',
  422: 'The request body failed validation. Check the field names and value vocabularies with get_vocab, then retry.',
  429: 'Rate limited. Wait before retrying, and batch work into fewer, larger calls.',
};

export interface ToolErrorResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
}

/**
 * Turn any thrown value into a tool result. Never leaks the API key: the key
 * is only ever a header value, and nothing here reads request headers back.
 */
export function toToolError(err: unknown): ToolErrorResult {
  let text: string;

  if (err instanceof ApiError) {
    const hint = STATUS_HINTS[err.status];
    text = `slab API error ${err.status} on ${err.method} ${err.path}: ${err.detail}`;
    if (hint) text += `\n\n${hint}`;
  } else if (err instanceof ApiConnectionError || err instanceof ConfigError) {
    text = err.message;
  } else if (err instanceof Error) {
    text = `Unexpected error: ${err.message}`;
  } else {
    text = `Unexpected error: ${String(err)}`;
  }

  return { content: [{ type: 'text', text }], isError: true };
}
