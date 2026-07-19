import type { CaseSearchResultPage } from "@/lib/case-search/types";

type CacheEntry = { page: CaseSearchResultPage; expiresAt: number };

const TTL_MS = 1000 * 60 * 15; // 15 minutes — case data changes infrequently, and no private user data is ever part of the cache key.

const cache = new Map<string, CacheEntry>();

export function getCachedSearch(key: string): CaseSearchResultPage | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.page;
}

export function setCachedSearch(key: string, page: CaseSearchResultPage): void {
  cache.set(key, { page, expiresAt: Date.now() + TTL_MS });
}

/** Test-only escape hatch — this cache is otherwise process-lifetime, module-level state. */
export function resetCaseSearchCache(): void {
  cache.clear();
}
