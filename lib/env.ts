import { z } from "zod";

const serverEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  /**
   * Suggested default per product spec. Unverified against a live OpenAI
   * account (no key is configured in this environment) — confirm this is
   * a real Responses-API model with Structured Outputs support before
   * relying on it in production.
   */
  OPENAI_INTAKE_MODEL: z.string().min(1).default("gpt-5.6-luna"),
  INTAKE_MAX_AI_QUESTIONS: z.coerce.number().int().min(1).max(50).default(12),

  /** "none" (default) means no verified case-search provider is configured — see lib/case-search/. */
  CASE_SEARCH_PROVIDER: z.enum(["courtlistener", "none"]).default("none"),
  COURTLISTENER_API_TOKEN: z.string().min(1).optional(),
  CASE_SEARCH_RESULT_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment configuration: ${details}`);
  }
  return parsed.data;
}

/** Validated, defaulted server environment. Re-reads process.env each call — cheap, and avoids stale values across test module resets. */
export function getServerEnv(): ServerEnv {
  return loadServerEnv();
}

export class OpenAIConfigurationError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured. Set it in your environment to enable the AI intake interview.");
    this.name = "OpenAIConfigurationError";
  }
}

/** Throws a safe, typed error (never the key itself) when OPENAI_API_KEY is missing. */
export function requireOpenAIApiKey(): string {
  const { OPENAI_API_KEY } = getServerEnv();
  if (!OPENAI_API_KEY) {
    throw new OpenAIConfigurationError();
  }
  return OPENAI_API_KEY;
}
