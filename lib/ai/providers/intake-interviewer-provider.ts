import type { IntakeInterviewContext, IntakeInterviewResponse } from "@/types/intake-interview";

export type IntakeInterviewResult =
  | { status: "ok"; response: IntakeInterviewResponse }
  | { status: "not-configured"; message: string }
  | { status: "provider-error"; message: string }
  | { status: "invalid-output"; message: string }
  | { status: "timeout"; message: string };

export interface IntakeInterviewerProvider {
  getNextStep(context: IntakeInterviewContext): Promise<IntakeInterviewResult>;
}
