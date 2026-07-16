import {
  CASE_TYPES,
  PROCEDURAL_STAGES,
  RESEARCH_GOALS,
  DOCUMENT_TYPES,
} from "@/lib/intake/intake-deterministic-schema";

export type CaseType = (typeof CASE_TYPES)[number];
export type ProceduralStage = (typeof PROCEDURAL_STAGES)[number];
export type ResearchGoal = (typeof RESEARCH_GOALS)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
