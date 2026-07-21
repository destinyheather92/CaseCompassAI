import type { ProgressiveSearchResult } from "@/lib/case-search/pipeline/types";

type CacheEntry = { result: ProgressiveSearchResult; expiresAt: number };

const TTL_MS = 1000 * 60 * 15; // 15 minutes — case data changes infrequently, and no private user data is ever part of the cache key.

const cache = new Map<string, CacheEntry>();

export function getCachedSearch(key: string): ProgressiveSearchResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedSearch(key: string, result: ProgressiveSearchResult): void {
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

/** Test-only escape hatch — this cache is otherwise process-lifetime, module-level state. */
export function resetCaseSearchCache(): void {
  cache.clear();
}
