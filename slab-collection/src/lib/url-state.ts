"use client";

/**
 * Mirror a view's search state into the URL's query string, shallowly.
 *
 * The search page keeps what you typed and picked in component state, which meant the URL always
 * said just "/search": refresh lost your query, Back from a card landed on a blank search, and a
 * filtered view couldn't be shared. Writing through `history.replaceState` (which Next syncs with
 * `useSearchParams`) records the state without adding history entries — Back still leaves the
 * page, it doesn't unwind every keystroke.
 *
 * Values equal to their default belong OUT of the URL (pass null), so a pristine search is still
 * just "/search".
 */
export function writeUrlParams(updates: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", url);
}

/** Read a param, keeping it only if it's one of the values the view actually accepts. */
export function readUrlParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | null {
  const value = params.get(key);
  return value !== null && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

/** Search → My Collection → Sets, with this set's dropdown open. */
export function collectionSetSearchHref(slug: string): string {
  const params = new URLSearchParams();
  params.set("browse", "sets");
  params.set("set", slug);
  return `/search?${params.toString()}`;
}
