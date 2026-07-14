import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * True only once hydrated on the client. Useful for gating APIs like
 * `useReducedMotion()` that read `matchMedia` synchronously on the client but
 * are always unavailable during SSR, so the first client render matches the
 * server-rendered markup and React doesn't hydration-fail.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
