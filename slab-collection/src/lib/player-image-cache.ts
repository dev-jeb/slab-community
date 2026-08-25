import { fetchJson } from "@/lib/slab/fetch-json";

const STORAGE_KEY = "slab-player-images-v1";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface CachedPlayerImage {
  url: string | null;
  savedAt: string;
}

type PlayerImageSnapshot = Record<string, CachedPlayerImage>;

const memory = new Map<string, string | null>();
const listeners = new Set<(name: string) => void>();

// Every PlayerAvatar asks for its own image as it mounts, and child effects run before the
// parent's — so a page of 300 cards fired 300 individual requests before any parent-level
// prefetch could batch them. Instead of relying on the caller to batch, requests are queued here
// and flushed together on the next tick, which collapses that page load into a couple of POSTs.
const BATCH_SIZE = 25;

interface PendingLookup {
  promise: Promise<string | null>;
  resolve: (url: string | null) => void;
}

/** Names asked for but not yet flushed: normalized key -> the name as given. */
const queued = new Map<string, string>();
/** Lookups in flight or waiting to flush, so the same name is only ever requested once. */
const pending = new Map<string, PendingLookup>();
let flushHandle: ReturnType<typeof setTimeout> | null = null;

function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadSnapshot(): PlayerImageSnapshot {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PlayerImageSnapshot;
  } catch {
    return {};
  }
}

function saveSnapshot(snapshot: PlayerImageSnapshot): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function isFresh(entry: CachedPlayerImage | undefined): boolean {
  if (!entry) return false;
  return Date.now() - Date.parse(entry.savedAt) < TTL_MS;
}

function notify(name: string): void {
  for (const listener of listeners) {
    listener(name);
  }
}

interface ResolvedImage {
  key: string;
  name: string;
  url: string | null;
}

// Written as a bulk operation on purpose: persisting one name at a time re-parsed and
// re-serialized the whole localStorage snapshot per player, which on a full collection is
// hundreds of parse/stringify round trips over a growing object.
function persistMany(resolved: ResolvedImage[]): void {
  if (!resolved.length) return;

  for (const { key, url } of resolved) {
    memory.set(key, url);
  }

  if (canUseStorage()) {
    const snapshot = loadSnapshot();
    const savedAt = new Date().toISOString();
    for (const { key, url } of resolved) {
      snapshot[key] = { url, savedAt };
    }
    saveSnapshot(snapshot);
  }

  for (const { name } of resolved) {
    notify(name);
  }
}

export function subscribePlayerImage(listener: (name: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedPlayerImageUrl(name: string): string | null | undefined {
  const key = normalizePlayerName(name);
  if (!key) return undefined;

  if (memory.has(key)) {
    return memory.get(key) ?? null;
  }

  const snapshot = loadSnapshot();
  const entry = snapshot[key];
  if (!isFresh(entry)) return undefined;

  memory.set(key, entry.url);
  return entry.url;
}

/** Cache the answers and hand each waiting caller its URL. */
function settle(resolved: ResolvedImage[]): void {
  persistMany(resolved);

  for (const { key, url } of resolved) {
    const lookup = pending.get(key);
    if (!lookup) continue;
    pending.delete(key);
    lookup.resolve(url);
  }
}

async function fetchOne(name: string): Promise<string | null> {
  const result = await fetchJson<{ url?: string | null }>(
    `/api/player-image?name=${encodeURIComponent(name)}`,
  );
  // A missing portrait is never an error worth surfacing — the avatar falls back to initials.
  if (result.status !== "ok") return null;
  return result.data.url ?? null;
}

async function fetchBatch(chunk: Array<[string, string]>): Promise<void> {
  const names = chunk.map(([, name]) => name);

  const result = await fetchJson<{ images?: Record<string, string | null> }>(
    "/api/player-images",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ names }),
    },
  );

  if (result.status === "ok") {
    const images = result.data.images;
    settle(
      chunk.map(([key, name]) => ({
        key,
        name,
        url: images?.[key] ?? images?.[name] ?? null,
      })),
    );
    return;
  }
  // Anything else falls back to the individual lookups below.

  const urls = await Promise.all(names.map(fetchOne));
  settle(chunk.map(([key, name], index) => ({ key, name, url: urls[index] })));
}

function flush(): void {
  flushHandle = null;
  if (!queued.size) return;

  const batch = [...queued.entries()];
  queued.clear();

  const chunks: Array<Array<[string, string]>> = [];
  for (let offset = 0; offset < batch.length; offset += BATCH_SIZE) {
    chunks.push(batch.slice(offset, offset + BATCH_SIZE));
  }

  // Chunks go out together — one slow batch shouldn't hold up the rest.
  void Promise.all(chunks.map(fetchBatch));
}

function scheduleFlush(): void {
  if (flushHandle !== null) return;
  flushHandle = setTimeout(flush, 0);
}

export async function resolvePlayerImageUrl(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const cached = getCachedPlayerImageUrl(trimmed);
  if (cached !== undefined) return cached;

  const key = normalizePlayerName(trimmed);
  const existing = pending.get(key);
  if (existing) return existing.promise;

  let resolve!: (url: string | null) => void;
  const promise = new Promise<string | null>((resolveLookup) => {
    resolve = resolveLookup;
  });

  pending.set(key, { promise, resolve });
  queued.set(key, trimmed);
  scheduleFlush();

  return promise;
}

/**
 * Warm the cache for a list of names. Batching and de-duplication happen in
 * `resolvePlayerImageUrl`, so this is now just a convenience wrapper — callers that render a
 * PlayerAvatar per name get the same batching without calling it at all.
 */
export async function prefetchPlayerImages(names: string[]): Promise<void> {
  await Promise.all(names.map((name) => resolvePlayerImageUrl(name)));
}
