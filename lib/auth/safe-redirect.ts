/**
 * Only ever allows an internal, same-origin path — never an absolute URL,
 * protocol-relative URL (`//evil.com`), or anything with a scheme, so a
 * `redirect_url`/`redirectTo` query param can never be turned into an
 * open redirect. Returns `fallback` for anything that doesn't qualify.
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  try {
    // A relative path parses cleanly against any base; if it doesn't
    // start with "/" after resolution, something odd is going on (e.g. a
    // scheme snuck in another way) — reject it.
    const resolved = new URL(value, "https://internal.invalid");
    if (resolved.origin !== "https://internal.invalid") return fallback;
    return value;
  } catch {
    return fallback;
  }
}
