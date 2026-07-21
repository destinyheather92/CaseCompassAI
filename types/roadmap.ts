export type RoadmapStepStatus = "not-started" | "in-progress" | "completed";

export type RoadmapStepCategory = "getting-started" | "legal-concepts" | "procedural-steps" | "case-documentation";
export type RoadmapStepPriority = "essential" | "recommended" | "optional";
export type RoadmapStepDifficulty = "beginner" | "intermediate" | "advanced";

export interface ResearchRoadmapStep {
  id: string;
  order: number;
  title: string;
  description: string;
  whyItMatters: string;
  suggestedActions: string[];
  relatedTerms: string[];
  category: RoadmapStepCategory;
  priority: RoadmapStepPriority;
  difficulty: RoadmapStepDifficulty;
  /** Hand-estimated reading time in minutes — a rough guide, not a precise measurement. */
  estimatedMinutes: number;
}

export interface LegalTermPreview {
  term: string;
  plainLanguageDefinition: string;
}

export type SourceSuggestionType = "court-opinion" | "statute" | "court-rule" | "official-guide" | "secondary-source";

export interface SourceSuggestion {
  name: string;
  sourceType: SourceSuggestionType;
  reasonToReview: string;
  url?: string;
}

export interface RoadmapJurisdictionNote {
  label: string;
  code: string;
  limitationNote: string;
}

export interface RoadmapConfidence {
  level: "low" | "medium" | "high";
  explanation: string;
}

/** The full structured roadmap payload stored in ResearchRoadmap.content. */
export interface ResearchRoadmapContent {
  title: string;
  summary: string;
  jurisdiction: RoadmapJurisdictionNote;
  steps: ResearchRoadmapStep[];
  legalTerms: LegalTermPreview[];
  sourceSuggestions: SourceSuggestion[];
  safetyNotes: string[];
  confidence: RoadmapConfidence;
  disclaimer: string;
  generatedAt: string;
}
