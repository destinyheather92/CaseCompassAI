import type { CaseExplanation } from "@/lib/case-explainer/case-explanation-schema";
import type { CaseExplainerContext } from "@/lib/ai/prompts/build-case-explainer-input";

export type CaseExplainerResult =
  | { status: "ok"; explanation: CaseExplanation }
  | { status: "not-configured"; message: string }
  | { status: "provider-error"; message: string }
  | { status: "invalid-output"; message: string }
  | { status: "timeout"; message: string };

export interface CaseExplainerProvider {
  explainCase(context: CaseExplainerContext): Promise<CaseExplainerResult>;
}
