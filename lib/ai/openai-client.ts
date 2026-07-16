import "server-only";
import OpenAI from "openai";
import { requireOpenAIApiKey } from "@/lib/env";

let cachedClient: OpenAI | null = null;

/**
 * Lazily constructs the OpenAI client. Never called at module import
 * time, so a missing OPENAI_API_KEY can't crash unrelated module graphs
 * — only the code path that actually needs the client throws (and the
 * intake interviewer provider catches it and fails safely).
 */
export function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = requireOpenAIApiKey();
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}
