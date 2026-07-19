"use client";

/**
 * All CaseCompass client storage keys share this prefix, so a shared
 * device's "Clear My Session" action can find and remove every one of
 * them without having to separately enumerate each feature's key names.
 * See docs/behavior/shared-device-privacy.md.
 */
const NAMESPACE_PREFIX = "casecompass";

/**
 * Local persistence is opt-in and controlled by a single deployment-wide
 * flag (see stores/use-intake-store.ts for the same convention) — never
 * an authorization control, purely a client UX/privacy choice for
 * shared/kiosk devices.
 */
function isLocalPersistenceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE === "true";
}

function scopedKey(userKey: string, key: string): string {
  return `${NAMESPACE_PREFIX}:${userKey}:${key}`;
}

export function getUserScopedItem(userKey: string, key: string): string | null {
  if (!isLocalPersistenceEnabled() || typeof window === "undefined") return null;
  return window.localStorage.getItem(scopedKey(userKey, key));
}

export function setUserScopedItem(userKey: string, key: string, value: string): void {
  if (!isLocalPersistenceEnabled() || typeof window === "undefined") return;
  window.localStorage.setItem(scopedKey(userKey, key), value);
}

/** Removal always succeeds regardless of the persistence flag — clearing data can never be blocked by a policy meant to limit writing it. */
export function removeUserScopedItem(userKey: string, key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(scopedKey(userKey, key));
}

function clearNamespacedKeys(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(NAMESPACE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => storage.removeItem(key));
}

/**
 * The "Clear My Session" action for shared/kiosk devices. Removes every
 * CaseCompass-namespaced key from both localStorage and sessionStorage —
 * not just the current user's, since a shared device may hold data from
 * a prior user's session that the current user has no way to enumerate
 * by user id — and does so unconditionally, regardless of the local
 * persistence flag, since stale data can predate a flag change.
 */
export function clearAllLocalSessionData(): void {
  if (typeof window === "undefined") return;
  clearNamespacedKeys(window.localStorage);
  clearNamespacedKeys(window.sessionStorage);
}
