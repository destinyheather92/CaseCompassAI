import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CaseType, DocumentType, ProceduralStage, ResearchGoal } from "@/types/intake";
import type { IntakeQuestion, IntakeStatus } from "@/types/intake-interview";

export type IntakeStep =
  | "welcome"
  | "case-type"
  | "jurisdiction"
  | "procedural-stage"
  | "research-goals"
  | "document-types"
  | "ai-interview"
  | "review"
  | "complete";

export interface AnsweredTurn {
  questionId: string;
  questionText: string;
  answerText: string;
}

interface IntakeState {
  step: IntakeStep;
  caseType: CaseType | null;
  jurisdiction: string;
  proceduralStage: ProceduralStage | null;
  researchGoals: ResearchGoal[];
  documentTypes: DocumentType[];

  sessionId: string | null;
  intakeStatus: IntakeStatus | null;
  currentQuestion: IntakeQuestion | null;
  factualSummary: string;
  unresolvedInformation: string[];
  topicsCovered: string[];
  answeredTurns: AnsweredTurn[];

  acknowledged: boolean;
  submitting: boolean;
  error: string | null;
}

interface IntakeActions {
  goToStep: (step: IntakeStep) => void;
  setCaseType: (value: CaseType) => void;
  setJurisdiction: (value: string) => void;
  setProceduralStage: (value: ProceduralStage) => void;
  toggleResearchGoal: (value: ResearchGoal) => void;
  toggleDocumentType: (value: DocumentType) => void;
  setSubmitting: (value: boolean) => void;
  setError: (message: string | null) => void;
  setAcknowledged: (value: boolean) => void;
  applyStartedSession: (input: {
    sessionId: string;
    intakeStatus: IntakeStatus;
    question: IntakeQuestion | null;
    factualSummary: string;
    unresolvedInformation: string[];
    topicsCovered: string[];
  }) => void;
  applyAnsweredTurn: (input: {
    intakeStatus: IntakeStatus;
    question: IntakeQuestion | null;
    factualSummary: string;
    unresolvedInformation: string[];
    topicsCovered: string[];
  }) => void;
  recordAnsweredTurn: (questionId: string, questionText: string, answerText: string) => void;
  clearSession: () => void;
  reset: () => void;
}

const initialState: IntakeState = {
  step: "welcome",
  caseType: null,
  jurisdiction: "",
  proceduralStage: null,
  researchGoals: [],
  documentTypes: [],

  sessionId: null,
  intakeStatus: null,
  currentQuestion: null,
  factualSummary: "",
  unresolvedInformation: [],
  topicsCovered: [],
  answeredTurns: [],

  acknowledged: false,
  submitting: false,
  error: null,
};

/**
 * Local persistence is opt-in and controlled by a single deployment-wide
 * flag, not per-account detection — an institution deploying CaseCompass
 * for shared/kiosk devices sets NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE
 * to false for that whole deployment. This is a client-behavior flag
 * only; it is never treated as an authorization control (server-side
 * privacy enforcement doesn't depend on it) — see
 * docs/behavior/shared-device-privacy.md.
 */
function isLocalPersistenceEnabled(): boolean {
  return process.env.NEXT_PUBLIC_INSTITUTION_LOCAL_PERSISTENCE === "true";
}

const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useIntakeStore = create<IntakeState & IntakeActions>()(
  persist(
    (set) => ({
      ...initialState,

      goToStep: (step) => set({ step }),
      setCaseType: (caseType) => set({ caseType }),
      setJurisdiction: (jurisdiction) => set({ jurisdiction }),
      setProceduralStage: (proceduralStage) => set({ proceduralStage }),

      toggleResearchGoal: (value) =>
        set((state) => ({
          researchGoals: state.researchGoals.includes(value)
            ? state.researchGoals.filter((goal) => goal !== value)
            : [...state.researchGoals, value],
        })),

      toggleDocumentType: (value) =>
        set((state) => {
          if (value === "none") {
            return { documentTypes: state.documentTypes.includes("none") ? [] : ["none"] };
          }
          const withoutNone = state.documentTypes.filter((type) => type !== "none");
          return {
            documentTypes: withoutNone.includes(value)
              ? withoutNone.filter((type) => type !== value)
              : [...withoutNone, value],
          };
        }),

      setSubmitting: (submitting) => set({ submitting }),
      setError: (error) => set({ error }),
      setAcknowledged: (acknowledged) => set({ acknowledged }),

      applyStartedSession: (input) =>
        set({
          sessionId: input.sessionId,
          intakeStatus: input.intakeStatus,
          currentQuestion: input.question,
          factualSummary: input.factualSummary,
          unresolvedInformation: input.unresolvedInformation,
          topicsCovered: input.topicsCovered,
          answeredTurns: [],
          error: null,
        }),

      applyAnsweredTurn: (input) =>
        set({
          intakeStatus: input.intakeStatus,
          currentQuestion: input.question,
          factualSummary: input.factualSummary,
          unresolvedInformation: input.unresolvedInformation,
          topicsCovered: input.topicsCovered,
          error: null,
        }),

      recordAnsweredTurn: (questionId, questionText, answerText) =>
        set((state) => ({
          answeredTurns: [...state.answeredTurns, { questionId, questionText, answerText }],
        })),

      clearSession: () =>
        set({
          sessionId: null,
          intakeStatus: null,
          currentQuestion: null,
          factualSummary: "",
          unresolvedInformation: [],
          topicsCovered: [],
          answeredTurns: [],
          error: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: "casecompass-intake-v1",
      storage: createJSONStorage(() => (isLocalPersistenceEnabled() ? window.localStorage : noopStorage)),
      partialize: (state) => ({
        step: state.step,
        caseType: state.caseType,
        jurisdiction: state.jurisdiction,
        proceduralStage: state.proceduralStage,
        researchGoals: state.researchGoals,
        documentTypes: state.documentTypes,
        sessionId: state.sessionId,
        intakeStatus: state.intakeStatus,
        currentQuestion: state.currentQuestion,
        factualSummary: state.factualSummary,
        unresolvedInformation: state.unresolvedInformation,
        topicsCovered: state.topicsCovered,
        answeredTurns: state.answeredTurns,
        acknowledged: state.acknowledged,
      }),
    },
  ),
);
