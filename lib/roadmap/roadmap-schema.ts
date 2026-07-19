import { z } from "zod";

export const RoadmapStepSchema = z.object({
  id: z.string().min(1).max(100),
  order: z.number().int().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  whyItMatters: z.string().min(1).max(1000),
  suggestedActions: z.array(z.string().min(1).max(300)).min(1).max(10),
  relatedTerms: z.array(z.string().min(1).max(100)).max(10),
});

export const LegalTermPreviewSchema = z.object({
  term: z.string().min(1).max(100),
  plainLanguageDefinition: z.string().min(1).max(500),
});

export const SourceSuggestionSchema = z.object({
  name: z.string().min(1).max(200),
  sourceType: z.enum(["court-opinion", "statute", "court-rule", "official-guide", "secondary-source"]),
  reasonToReview: z.string().min(1).max(300),
  url: z.string().url().max(500).optional(),
});

export const ResearchRoadmapContentSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  jurisdiction: z.object({
    label: z.string().min(1).max(100),
    code: z.string().min(1).max(20),
    limitationNote: z.string().min(1).max(500),
  }),
  steps: z.array(RoadmapStepSchema).min(1).max(20),
  legalTerms: z.array(LegalTermPreviewSchema).max(20),
  sourceSuggestions: z.array(SourceSuggestionSchema).max(20),
  safetyNotes: z.array(z.string().min(1).max(500)).max(10),
  confidence: z.object({
    level: z.enum(["low", "medium", "high"]),
    explanation: z.string().min(1).max(500),
  }),
  disclaimer: z.string().min(1).max(1000),
  generatedAt: z.string().min(1),
});

export type ResearchRoadmapContent = z.infer<typeof ResearchRoadmapContentSchema>;
