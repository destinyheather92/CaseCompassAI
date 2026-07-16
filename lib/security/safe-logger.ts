/**
 * Field names that must never reach a log line, keyed lowercase for
 * case-insensitive matching. This is defense in depth — callers should
 * still avoid passing secrets to safeLog in the first place — but it
 * guards against a mistake surfacing a password, token, or case
 * narrative in application logs.
 */
const SECRET_KEY_FRAGMENTS = [
  "password",
  "passwordhash",
  "token",
  "secret",
  "apikey",
  "ssn",
  "socialsecurity",
  "description",
  "prompt",
  "authorization",
  "sessiontoken",
] as const;

const REDACTED = "[REDACTED]";

function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SECRET_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

/** Recursively returns a redacted copy of `value` — never mutates the input. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = isSecretKey(key) ? REDACTED : redact(val);
    }
    return result;
  }

  return value;
}

type LogLevel = "info" | "warn" | "error";

/** Logs `message` with a redacted version of `data` — safe for request/response payloads that may contain user input. */
export function safeLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (data === undefined) {
    console[level](message);
    return;
  }
  console[level](message, redact(data));
}
