interface Entry {
  value?: unknown
  expiresAt: number
  pending?: Promise<unknown>
}

// Stored on globalThis so every route bundle in the process shares one cache.
const STORE_KEY = Symbol.for("homelab-dashboard.cache")
const globalStore = globalThis as unknown as Record<symbol, Map<string, Entry>>
const store = (globalStore[STORE_KEY] ??= new Map<string, Entry>())

/**
 * Memoizes an async loader for `ttlMs` and coalesces concurrent calls, so any
 * number of open dashboards results in at most one upstream request per key
 * per TTL window. Failures are never cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const entry = store.get(key)

  if (entry?.pending) return entry.pending as Promise<T>
  if (entry && "value" in entry && entry.expiresAt > now) {
    return entry.value as T
  }

  const pending = loader()
  store.set(key, { ...entry, expiresAt: 0, pending })

  try {
    const value = await pending
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  } catch (error) {
    store.delete(key)
    throw error
  }
}

export function clearCache() {
  store.clear()
}
