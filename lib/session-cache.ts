// Lightweight in-memory session cache for stale-while-revalidate flows.
// Survives client-side navigations (same JS context), cleared on full reload.
// Not for in-flight form data — only for read-mostly screen payloads.

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCachedData<T>(key: string): T | undefined {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return undefined;
  // Return even if expired — caller decides whether to revalidate.
  return e.value;
}

export function isFresh(key: string): boolean {
  const e = store.get(key);
  return !!e && e.expiresAt > Date.now();
}

export function setCachedData<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string | RegExp): void {
  if (typeof key === "string") {
    store.delete(key);
    return;
  }
  for (const k of Array.from(store.keys())) if (key.test(k)) store.delete(k);
}

/**
 * Returns cached value immediately if present (even stale), and triggers a
 * background fetch when stale. `onUpdate` fires when fresh data arrives.
 */
export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  onUpdate?: (v: T) => void,
): Promise<T> {
  const cached = getCachedData<T>(key);
  const fresh = isFresh(key);
  if (cached !== undefined && fresh) return cached;

  // Coalesce concurrent fetches.
  let p = inflight.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetcher()
      .then((v) => {
        setCachedData(key, v, ttlMs);
        if (onUpdate) onUpdate(v);
        return v;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p as Promise<unknown>);
  }

  if (cached !== undefined) {
    // Stale-while-revalidate: don't block on the refresh.
    void p.catch(() => undefined);
    return cached;
  }
  return p;
}

export const CACHE_TTL = {
  home: 30_000,
  today: 30_000,
  missions: 45_000,
  notifications: 45_000,
  insights: 60_000,
  progress: 60_000,
  fasting: 15_000,
} as const;
