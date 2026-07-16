import type {
  IntakeInterviewerProvider,
  IntakeInterviewResult,
} from "@/lib/ai/providers/intake-interviewer-provider";
import type { IntakeInterviewContext } from "@/types/intake-interview";

/**
 * Deterministic, no-network fake for the AI interviewer, used across
 * service-layer integration tests, evaluation fixtures, and e2e mocking.
 * Never talks to OpenAI — this is what "use dependency injection... so
 * OpenAI can be mocked" resolves to across this codebase.
 */
export function createScriptedInterviewerProvider(script: IntakeInterviewResult[]): IntakeInterviewerProvider & {
  calls: IntakeInterviewContext[];
} {
  const calls: IntakeInterviewContext[] = [];
  let index = 0;
  return {
    calls,
    async getNextStep(context: IntakeInterviewContext): Promise<IntakeInterviewResult> {
      calls.push(context);
      const result = script[Math.min(index, script.length - 1)];
      index += 1;
      return result;
    },
  };
}

export function createStaticInterviewerProvider(result: IntakeInterviewResult) {
  return createScriptedInterviewerProvider([result]);
}
