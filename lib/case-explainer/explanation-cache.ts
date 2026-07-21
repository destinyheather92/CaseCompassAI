import type { VerifiedCaseExplanation } from "@/lib/case-explainer/case-explanation-schema";

export interface CachedExplanation {
  explanation: VerifiedCaseExplanation;
  opinionText: string | null;
}

type CacheEntry = CachedExplanation & { expiresAt: number };

const TTL_MS = 1000 * 60 * 60; // 1 hour — a case's opinion text and explanation don't change; no private user data is ever part of the key.

const cache = new Map<string, CacheEntry>();

function keyFor(providerName: string, providerCaseId: string): string {
  return `${providerName}:${providerCaseId}`;
}

export function getCachedExplanation(providerName: string, providerCaseId: string): CachedExplanation | null {
  const entry = cache.get(keyFor(providerName, providerCaseId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(keyFor(providerName, providerCaseId));
    return null;
  }
  return { explanation: entry.explanation, opinionText: entry.opinionText };
}

export function setCachedExplanation(
  providerName: string,
  providerCaseId: string,
  explanation: VerifiedCaseExplanation,
  opinionText: string | null,
): void {
  cache.set(keyFor(providerName, providerCaseId), { explanation, opinionText, expiresAt: Date.now() + TTL_MS });
}

/** Test-only escape hatch — this cache is otherwise process-lifetime, module-level state. */
export function resetExplanationCache(): void {
  cache.clear();
}
