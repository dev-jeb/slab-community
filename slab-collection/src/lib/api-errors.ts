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

/** True only for our missing-key 503 — not an upstream Slab 503/timeout. */
export function isMissingApiKeyError(status: number, detail?: unknown): boolean {
  if (status !== 503) return false;
  return formatApiDetail(detail, "").includes("SLAB_API_KEY");
}
