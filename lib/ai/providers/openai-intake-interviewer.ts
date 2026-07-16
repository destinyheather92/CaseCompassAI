import { APIConnectionTimeoutError } from "openai";
import type OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { getServerEnv, OpenAIConfigurationError } from "@/lib/env";
import { INTAKE_INTERVIEWER_SYSTEM_PROMPT } from "@/lib/ai/prompts/intake-interviewer-system";
import { buildIntakeInterviewInput } from "@/lib/ai/prompts/build-intake-interview-input";
import { IntakeInterviewResponseSchema } from "@/lib/intake/intake-interview-schema";
import type { IntakeInterviewContext } from "@/types/intake-interview";
import type { IntakeInterviewerProvider, IntakeInterviewResult } from "./intake-interviewer-provider";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Real OpenAI Responses API implementation. Accepts an optional injected
 * client so tests can exercise this class's actual parsing/error-handling
 * logic without a network call or API key — the DI seam the rest of the
 * codebase already uses for external services (see
 * lib/institution/create-user.ts's ClerkUserCreator).
 */
export class OpenAIIntakeInterviewer implements IntakeInterviewerProvider {
  constructor(private readonly injectedClient?: OpenAI) {}

  async getNextStep(context: IntakeInterviewContext): Promise<IntakeInterviewResult> {
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
            { role: "system", content: INTAKE_INTERVIEWER_SYSTEM_PROMPT },
            { role: "user", content: buildIntakeInterviewInput(context) },
          ],
          text: { format: zodTextFormat(IntakeInterviewResponseSchema, "casecompass_intake_interview") },
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

      // Defense in depth: re-validate even though output_parsed already
      // passed the SDK's own parsing step — never trust it implicitly.
      const revalidated = IntakeInterviewResponseSchema.safeParse(response.output_parsed);
      if (!revalidated.success) {
        return { status: "invalid-output", message: "The AI response failed schema validation." };
      }

      return { status: "ok", response: revalidated.data };
    } catch (error) {
      if (error instanceof APIConnectionTimeoutError) {
        return { status: "timeout", message: "The AI provider took too long to respond." };
      }
      return { status: "provider-error", message: "The AI provider request failed." };
    }
  }
}

export const defaultOpenAIInterviewerProvider = new OpenAIIntakeInterviewer();
