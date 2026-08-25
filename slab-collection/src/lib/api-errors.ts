import { MISSING_API_KEY_CODE } from "@/lib/slab/errors";

/** The error body every `/api/*` route returns. `code` is set only when the browser must branch. */
export interface ApiErrorBody {
  detail?: unknown;
  code?: string;
}

export function formatApiDetail(detail: unknown, fallback = "Request failed"): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "object" && item && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return String(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    if ("msg" in detail) return String((detail as { msg: string }).msg);
    if ("message" in detail) return String((detail as { message: string }).message);
  }
  return fallback;
}

/**
 * True only for our own missing-key error — never for an upstream Slab 503 or timeout.
 *
 * The distinction is the whole point: "you haven't configured a key" is a setup prompt, "Slab is
 * unreachable" is an error message, and both arrive as a 503. This reads the `code` the route
 * stamps on the body rather than sniffing the human-readable detail, which is what it used to do.
 */
export function isMissingApiKeyError(body: ApiErrorBody | null | undefined): boolean {
  return body?.code === MISSING_API_KEY_CODE;
}
