export type { IntakeQuestion, IntakeInterviewResponse } from "@/lib/intake/intake-interview-schema";

/** API/app-level status union — kebab-case, mapped to/from the Prisma enum in lib/intake/intake-status.ts. */
export type IntakeStatus =
  | "draft"
  | "interviewing"
  | "needs-clarification"
  | "ready-for-review"
  | "completed"
  | "abandoned";

export interface PriorInterviewTurn {
  questionId: string;
  questionText: string;
  answerText: string;
  answerType: string;
  sequence: number;
}

/** Compact context sent to the AI interviewer — never the whole app-state object, see lib/ai/prompts/build-intake-interview-input.ts. */
export interface IntakeInterviewContext {
  caseType: string;
  jurisdiction: string;
  proceduralStage: string;
  researchGoals: string[];
  documentTypes: string[];
  factualSummary: string;
  unresolvedInformation: string[];
  topicsCovered: string[];
  priorTurns: PriorInterviewTurn[];
  questionCount: number;
  maxQuestions: number;
}
