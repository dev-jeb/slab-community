/**
 * The two failures a Slab call can have that a caller actually branches on, as types rather than
 * as substrings of a message.
 *
 * They used to be told apart by `message.includes("SLAB_API_KEY")`, sniffed in twenty-five copies
 * of the same route handler — which meant a rewording of one error string silently changed control
 * flow everywhere. This module has no imports on purpose: both the server routes and the client
 * bundle need it.
 */

/** A non-2xx from the Slab API. `status` is Slab's, and routes pass it straight through. */
export class SlabApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SlabApiError";
    this.status = status;
  }
}

/**
 * This app isn't configured yet — no `SLAB_API_KEY` in the environment.
 *
 * Distinct from a Slab 503 because the answer is completely different: one asks the user to mint a
 * key, the other asks them to wait. Both used to surface as a bare 503, so a cold start or a
 * gateway blip told a correctly-configured user to go set up their API key.
 */
export class MissingApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingApiKeyError";
  }
}

/** Wire code for {@link MissingApiKeyError}, so the browser branches on a field, not on prose. */
export const MISSING_API_KEY_CODE = "missing_api_key";
