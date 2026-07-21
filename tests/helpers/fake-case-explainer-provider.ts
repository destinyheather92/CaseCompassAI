import type { CaseExplainerProvider, CaseExplainerResult } from "@/lib/ai/providers/case-explainer-provider";
import type { CaseExplainerContext } from "@/lib/ai/prompts/build-case-explainer-input";

/** Deterministic, no-network fake for the AI case explainer — never talks to OpenAI. */
export function createStaticCaseExplainerProvider(
  result: CaseExplainerResult,
): CaseExplainerProvider & { calls: CaseExplainerContext[] } {
  const calls: CaseExplainerContext[] = [];
  return {
    calls,
    async explainCase(context: CaseExplainerContext): Promise<CaseExplainerResult> {
      calls.push(context);
      return result;
    },
  };
}
