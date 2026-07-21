import { APIConnectionTimeoutError } from "openai";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { getServerEnv, OpenAIConfigurationError } from "@/lib/env";
import { CASE_EXPLAINER_SYSTEM_PROMPT } from "@/lib/ai/prompts/case-explainer-system";
import { buildCaseExplainerInput, type CaseExplainerContext } from "@/lib/ai/prompts/build-case-explainer-input";
import { CaseExplanationSchema } from "@/lib/case-explainer/case-explanation-schema";
import type { CaseExplainerProvider, CaseExplainerResult } from "./case-explainer-provider";

const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Real OpenAI Responses API implementation, mirroring
 * lib/ai/providers/openai-intake-interviewer.ts's structure and DI seam.
 */
export class OpenAICaseExplainer implements CaseExplainerProvider {
  constructor(private readonly injectedClient?: OpenAI) {}

  async explainCase(context: CaseExplainerContext): Promise<CaseExplainerResult> {
    let client: OpenAI;
    if (this.injectedClient) {
      client = this.injectedClient;
    } else {
      try {
        client = getOpenAIClient();
      } catch (error) {
        if (error instanceof OpenAIConfigurationError) {
          return { status: "not-configured", message: error.message };
        }
        throw error;
      }
    }

    const { OPENAI_INTAKE_MODEL } = getServerEnv();

    try {
      const response = await client.responses.parse(
        {
          model: OPENAI_INTAKE_MODEL,
          input: [
            { role: "system", content: CASE_EXPLAINER_SYSTEM_PROMPT },
            { role: "user", content: buildCaseExplainerInput(context) },
          ],
          text: { format: zodTextFormat(CaseExplanationSchema, "casecompass_case_explanation") },
        },
        { timeout: REQUEST_TIMEOUT_MS },
      );

      if (response.error) {
        return { status: "provider-error", message: "The AI provider reported an error." };
      }

      if (response.output_parsed === null) {
        return {
          status: "invalid-output",
          message: "The AI response could not be parsed into the expected structure.",
        };
      }

      // Defense in depth: re-validate independently of the SDK's own parser.
      const revalidated = CaseExplanationSchema.safeParse(response.output_parsed);
      if (!revalidated.success) {
        return { status: "invalid-output", message: "The AI response failed schema validation." };
      }

      return { status: "ok", explanation: revalidated.data };
    } catch (error) {
      if (error instanceof APIConnectionTimeoutError) {
        return { status: "timeout", message: "The AI provider took too long to respond." };
      }
      return { status: "provider-error", message: "The AI provider request failed." };
    }
  }
}

export const defaultOpenAICaseExplainer = new OpenAICaseExplainer();
