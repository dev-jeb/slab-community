import { formatApiDetail, isMissingApiKeyError, type ApiErrorBody } from "@/lib/api-errors";

/**
 * The three ways a call to our own `/api/*` routes can land, as one value.
 *
 * `setup` is separate from `error` because it isn't one: the app has no API key yet, and the answer
 * is a setup prompt rather than a red banner.
 */
export type JsonResult<T> =
  | { status: "ok"; data: T }
  | { status: "setup" }
  | { status: "error"; message: string; httpStatus?: number };

/**
 * What to show when a `setup` lands somewhere with no setup prompt to render — a write from a row,
 * say. It means the key went missing mid-session, so the honest instruction is to configure and
 * reload rather than to retry the button.
 */
export const SETUP_REQUIRED_MESSAGE =
  "Slab isn't configured. Add SLAB_API_KEY to .env.local and reload.";

/** A landing that wasn't `ok` — the two cases a caller with one error banner treats alike. */
export type JsonFailure = Extract<JsonResult<unknown>, { status: "setup" | "error" }>;

/**
 * One line of text for a surface that has no setup prompt to show — a panel inside a page, or a
 * write from a row. Views that CAN render `<SetupPrompt />` should branch on `setup` instead.
 */
export function failureMessage(failure: JsonFailure): string {
  return failure.status === "setup" ? SETUP_REQUIRED_MESSAGE : failure.message;
}

/**
 * Fetch one of our routes and say which of the three things happened.
 *
 * Every view was doing this by hand — thirty-odd copies of "503 means show the setup prompt, not-ok
 * means read `detail` off the body, otherwise use it" — and that hand-rolled 503 check was wrong:
 * a Slab cold start or gateway blip also returns 503, so a correctly-configured user was told to go
 * mint an API key. Only the setup case carries a `code`, and only that case is `setup` here.
 *
 * A thrown fetch (offline, aborted connection) is an `error` too; callers care that the data didn't
 * arrive, not which layer dropped it.
 */
export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
  fallback = "Request failed",
): Promise<JsonResult<T>> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    // No `httpStatus`: the request never got an answer, so there is no status to report.
    return { status: "error", message: fallback };
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // A non-JSON error body (a proxy's HTML 502, say) still gets the caller's fallback.
    }

    if (isMissingApiKeyError(body)) return { status: "setup" };
    return {
      status: "error",
      message: formatApiDetail(body?.detail, fallback),
      // Carried for the callers that read a specific code as an answer rather than a failure —
      // a 404 from the lifecycle benchmark means "no build published", not "something broke".
      httpStatus: response.status,
    };
  }

  try {
    return { status: "ok", data: (await response.json()) as T };
  } catch {
    return { status: "error", message: fallback, httpStatus: response.status };
  }
}
