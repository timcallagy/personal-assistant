interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export function createCache<T>(ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | null {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.data;
    },
    set(key: string, data: T): void {
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
    },
  };
}
