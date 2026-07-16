import type { CaseType, DocumentType, ProceduralStage, ResearchGoal } from "@/types/intake";

export const CASE_TYPE_OPTIONS: { value: CaseType; label: string }[] = [
  { value: "criminal", label: "Criminal Case" },
  { value: "civil", label: "Civil Case" },
  { value: "family", label: "Family Law" },
  { value: "appeal", label: "Appeal" },
  { value: "post-conviction", label: "Post-Conviction" },
  { value: "unsure", label: "Unsure" },
];

export const PROCEDURAL_STAGE_OPTIONS: { value: ProceduralStage; label: string }[] = [
  { value: "investigation-or-charges", label: "Investigation or Charges" },
  { value: "pretrial", label: "Pretrial" },
  { value: "trial-completed", label: "Trial Completed" },
  { value: "sentencing", label: "Sentencing" },
  { value: "direct-appeal", label: "Direct Appeal" },
  { value: "post-conviction", label: "Post-Conviction" },
  { value: "civil-case-pending", label: "Civil Case Pending" },
  { value: "judgment-entered", label: "Judgment Entered" },
  { value: "unsure", label: "Unsure" },
];

export const RESEARCH_GOAL_OPTIONS: { value: ResearchGoal; label: string }[] = [
  { value: "find-starting-point", label: "I do not know where to begin." },
  { value: "understand-case", label: "I want to understand my case." },
  { value: "understand-opinion", label: "I need help understanding a court opinion." },
  { value: "research-issues", label: "I want to research possible legal issues." },
  { value: "understand-terms", label: "I need help understanding legal terms." },
  { value: "other", label: "Something else." },
];

export const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "none", label: "Not yet" },
  { value: "court-opinion", label: "Court opinion" },
  { value: "motion", label: "Motion" },
  { value: "order", label: "Court order" },
  { value: "transcript", label: "Transcript" },
  { value: "appeal", label: "Appeal paperwork" },
  { value: "other", label: "Other" },
];

function labelFor<T extends string>(options: { value: T; label: string }[], value: T | null): string {
  return options.find((option) => option.value === value)?.label ?? "";
}

export function caseTypeLabel(value: CaseType | null): string {
  return labelFor(CASE_TYPE_OPTIONS, value);
}

export function proceduralStageLabel(value: ProceduralStage | null): string {
  return labelFor(PROCEDURAL_STAGE_OPTIONS, value);
}
