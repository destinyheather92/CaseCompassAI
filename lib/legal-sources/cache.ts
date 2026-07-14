import type { LegalTermDefinition } from "./types";

type CacheEntry = {
  definition: LegalTermDefinition;
  expiresAt: number;
};

const TTL_MS = 1000 * 60 * 60 * 6; // 6 hours — terms rarely change same-day

/**
 * Process-local cache for resolved term lookups. This is intentionally
 * simple (no Redis) since the curated glossary is already in memory and
 * cheap to read; this mainly saves repeated normalization/matching work and
 * gives future network-backed providers a real cache layer to land in.
 */
const cache = new Map<string, CacheEntry>();

export function getCachedTerm(normalizedTerm: string): LegalTermDefinition | null {
  const entry = cache.get(normalizedTerm);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(normalizedTerm);
    return null;
  }
  return entry.definition;
}

export function setCachedTerm(normalizedTerm: string, definition: LegalTermDefinition): void {
  cache.set(normalizedTerm, { definition, expiresAt: Date.now() + TTL_MS });
}
