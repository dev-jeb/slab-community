const STORAGE_KEY = "slab-player-images-v1";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface CachedPlayerImage {
  url: string | null;
  savedAt: string;
}

type PlayerImageSnapshot = Record<string, CachedPlayerImage>;

const memory = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const listeners = new Set<(name: string) => void>();

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

function persist(name: string, url: string | null): void {
  const key = normalizePlayerName(name);
  memory.set(key, url);

  const snapshot = loadSnapshot();
  snapshot[key] = { url, savedAt: new Date().toISOString() };
  saveSnapshot(snapshot);
  notify(name);
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

async function fetchPlayerImageUrl(name: string): Promise<string | null> {
  const response = await fetch(
    `/api/player-image?name=${encodeURIComponent(name)}`,
  );
  if (!response.ok) return null;
  const data = (await response.json()) as { url?: string | null };
  return data.url ?? null;
}

export async function resolvePlayerImageUrl(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const cached = getCachedPlayerImageUrl(trimmed);
  if (cached !== undefined) return cached;

  const key = normalizePlayerName(trimmed);
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = fetchPlayerImageUrl(trimmed)
    .then((url) => {
      persist(trimmed, url);
      return url;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export async function prefetchPlayerImages(names: string[]): Promise<void> {
  const unique = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ].filter((name) => getCachedPlayerImageUrl(name) === undefined);

  if (!unique.length) return;

  const batchSize = 25;
  for (let offset = 0; offset < unique.length; offset += batchSize) {
    const chunk = unique.slice(offset, offset + batchSize);

    try {
      const response = await fetch("/api/player-images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: chunk }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          images?: Record<string, string | null>;
        };

        for (const name of chunk) {
          const key = normalizePlayerName(name);
          const url = data.images?.[key] ?? data.images?.[name] ?? null;
          persist(name, url);
        }
        continue;
      }
    } catch {
      // Fall back to individual lookups below.
    }

    await Promise.all(chunk.map((name) => resolvePlayerImageUrl(name)));
  }
}
