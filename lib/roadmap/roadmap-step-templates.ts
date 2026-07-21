import type { CaseType } from "@/types/intake";

export const ROADMAP_STEP_CATEGORIES = [
  "getting-started",
  "legal-concepts",
  "procedural-steps",
  "case-documentation",
] as const;
export type RoadmapStepCategory = (typeof ROADMAP_STEP_CATEGORIES)[number];

export const ROADMAP_STEP_CATEGORY_LABELS: Record<RoadmapStepCategory, string> = {
  "getting-started": "Getting Started",
  "legal-concepts": "Legal Concepts",
  "procedural-steps": "Procedural Steps",
  "case-documentation": "Case Documentation",
};

export const ROADMAP_STEP_PRIORITIES = ["essential", "recommended", "optional"] as const;
export type RoadmapStepPriority = (typeof ROADMAP_STEP_PRIORITIES)[number];

export const ROADMAP_STEP_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type RoadmapStepDifficulty = (typeof ROADMAP_STEP_DIFFICULTIES)[number];

export interface RoadmapStepTemplate {
  title: string;
  description: string;
  whyItMatters: string;
  suggestedActions: string[];
  relatedTerms: string[];
  category: RoadmapStepCategory;
  priority: RoadmapStepPriority;
  difficulty: RoadmapStepDifficulty;
  /** Hand-estimated, not computed from word count — a deliberately rough, honest guide, not a precise claim. */
  estimatedMinutes: number;
}

export interface CaseTypeTemplate {
  roadmapTitle: string;
  summary: string;
  steps: RoadmapStepTemplate[];
  legalTerms: string[];
}

/**
 * Deterministic, hand-authored step content per case category. Every
 * `relatedTerms` entry must be a real, lookupable name from
 * lib/legal-sources/curated-glossary-provider.ts (enforced by
 * tests/unit/roadmap/generate-roadmap.test.ts) — never a term invented
 * on the fly. category/priority/difficulty/estimatedMinutes are likewise
 * hand-authored per step, not inferred or invented at render time.
 */
export const CASE_TYPE_TEMPLATES: Record<CaseType, CaseTypeTemplate> = {
  criminal: {
    roadmapTitle: "Criminal Case Research Roadmap",
    summary: "A general starting point for researching a pending criminal matter.",
    legalTerms: ["Arraignment", "Burden of Proof", "Due Process"],
    steps: [
      {
        title: "Understand the charge and procedural stage",
        description: "Identify exactly what you've been charged with and what stage the case is at.",
        whyItMatters: "The charge and stage determine which procedures and timelines may apply.",
        suggestedActions: ["Review the charging document if you have it", "Note the exact charge and case number"],
        relatedTerms: ["Arraignment", "Indictment"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
      {
        title: "Learn about the burden of proof and evidence",
        description: "Understand what the prosecution must show and how evidence is typically handled.",
        whyItMatters: "Knowing the burden of proof helps you understand what a case does and doesn't establish.",
        suggestedActions: ["Read the Burden of Proof glossary entry", "List the evidence you know about"],
        relatedTerms: ["Burden of Proof", "Evidence"],
        category: "legal-concepts",
        priority: "essential",
        difficulty: "intermediate",
        estimatedMinutes: 8,
      },
      {
        title: "Learn about pretrial motions",
        description: "Motions are formal requests made to the court before trial.",
        whyItMatters: "Understanding what a motion is helps you follow what's happening in your case.",
        suggestedActions: ["Read the Motion glossary entry", "Note any motions already filed in your case"],
        relatedTerms: ["Motion", "Due Process"],
        category: "procedural-steps",
        priority: "recommended",
        difficulty: "intermediate",
        estimatedMinutes: 7,
      },
    ],
  },
  civil: {
    roadmapTitle: "Civil Case Research Roadmap",
    summary: "A general starting point for researching a pending civil matter.",
    legalTerms: ["Complaint", "Plaintiff", "Defendant"],
    steps: [
      {
        title: "Understand the complaint and the parties",
        description: "Identify who is suing whom, and what the complaint alleges.",
        whyItMatters: "Knowing the parties and claims is the foundation for understanding a civil case.",
        suggestedActions: ["Read the Complaint glossary entry", "Note the plaintiff, defendant, and claims"],
        relatedTerms: ["Complaint", "Plaintiff", "Defendant"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
      {
        title: "Learn about the burden of proof in civil cases",
        description: "Civil cases use a different standard of proof than criminal cases.",
        whyItMatters: "This affects how strong the evidence on each side needs to be.",
        suggestedActions: ["Read the Burden of Proof glossary entry"],
        relatedTerms: ["Burden of Proof", "Evidence"],
        category: "legal-concepts",
        priority: "essential",
        difficulty: "intermediate",
        estimatedMinutes: 7,
      },
      {
        title: "Review possible pretrial motions",
        description: "Learn about common motions in civil cases, such as summary judgment.",
        whyItMatters: "Motions can significantly shape how and whether a case goes to trial.",
        suggestedActions: ["Read the Motion and Summary Judgment glossary entries"],
        relatedTerms: ["Motion", "Summary Judgment"],
        category: "procedural-steps",
        priority: "recommended",
        difficulty: "intermediate",
        estimatedMinutes: 7,
      },
    ],
  },
  family: {
    roadmapTitle: "Family Law Research Roadmap",
    summary: "A general starting point for researching a family court matter.",
    legalTerms: ["Jurisdiction", "Due Process"],
    steps: [
      {
        title: "Confirm which court has jurisdiction",
        description: "Family matters are usually handled by a specific state or county court.",
        whyItMatters: "The right court and jurisdiction affects which procedures apply to your matter.",
        suggestedActions: ["Read the Jurisdiction glossary entry", "Identify the court handling your matter"],
        relatedTerms: ["Jurisdiction"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
      {
        title: "Understand your rights in the process",
        description: "Family court proceedings still involve procedural protections.",
        whyItMatters: "Understanding the process helps you know what to expect at each stage.",
        suggestedActions: ["Read the Due Process glossary entry"],
        relatedTerms: ["Due Process"],
        category: "legal-concepts",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 6,
      },
      {
        title: "Review relevant motions and hearings",
        description: "Family cases often involve specific motions and scheduled hearings.",
        whyItMatters: "Knowing what a motion or hearing is helps you follow your case's progress.",
        suggestedActions: ["Read the Motion glossary entry", "Note any upcoming hearings"],
        relatedTerms: ["Motion"],
        category: "procedural-steps",
        priority: "recommended",
        difficulty: "intermediate",
        estimatedMinutes: 6,
      },
    ],
  },
  appeal: {
    roadmapTitle: "Appeal Research Roadmap",
    summary: "A general starting point for researching a direct appeal.",
    legalTerms: ["Appellant", "Appellee", "Brief"],
    steps: [
      {
        title: "Understand the appellate process",
        description: "Learn the basic roles and structure of an appeal.",
        whyItMatters: "Appeals work differently from trial court proceedings.",
        suggestedActions: ["Read the Appellant and Appellee glossary entries"],
        relatedTerms: ["Appellant", "Appellee"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
      {
        title: "Learn how to read the lower court's opinion",
        description: "The opinion being appealed explains the reasoning the lower court used.",
        whyItMatters: "Understanding the opinion and its holding is central to understanding an appeal.",
        suggestedActions: ["Read the Opinion, Holding, and Dissent glossary entries", "See the How to Read a Court Opinion guide"],
        relatedTerms: ["Opinion", "Holding"],
        category: "legal-concepts",
        priority: "essential",
        difficulty: "advanced",
        estimatedMinutes: 10,
      },
      {
        title: "Understand appellate briefs",
        description: "Briefs are the written arguments submitted to an appellate court.",
        whyItMatters: "Briefs are how each side presents its argument on appeal.",
        suggestedActions: ["Read the Brief and Precedent glossary entries"],
        relatedTerms: ["Brief", "Precedent"],
        category: "procedural-steps",
        priority: "recommended",
        difficulty: "intermediate",
        estimatedMinutes: 8,
      },
    ],
  },
  "post-conviction": {
    roadmapTitle: "Post-Conviction Research Roadmap",
    summary: "A general starting point for researching post-conviction options.",
    legalTerms: ["Habeas Corpus", "Exhaustion of Remedies"],
    steps: [
      {
        title: "Understand post-conviction relief options",
        description: "Post-conviction relief refers to legal avenues available after a conviction is final.",
        whyItMatters: "This is a distinct process from a direct appeal, with its own procedures.",
        suggestedActions: ["Read the Habeas Corpus and Writ glossary entries"],
        relatedTerms: ["Habeas Corpus", "Writ"],
        category: "getting-started",
        priority: "essential",
        difficulty: "intermediate",
        estimatedMinutes: 7,
      },
      {
        title: "Learn about exhaustion of remedies",
        description: "Courts often require other options to be pursued first.",
        whyItMatters: "Understanding this requirement helps you understand the order of options available.",
        suggestedActions: ["Read the Exhaustion of Remedies glossary entry"],
        relatedTerms: ["Exhaustion of Remedies"],
        category: "legal-concepts",
        priority: "essential",
        difficulty: "advanced",
        estimatedMinutes: 8,
      },
      {
        title: "Review your conviction and sentencing record",
        description: "Gather what you know about the conviction and sentence being challenged.",
        whyItMatters: "Having a clear record of the conviction helps organize your research.",
        suggestedActions: ["Read the Conviction glossary entry", "Note the conviction date and sentence"],
        relatedTerms: ["Conviction"],
        category: "case-documentation",
        priority: "recommended",
        difficulty: "beginner",
        estimatedMinutes: 6,
      },
    ],
  },
  unsure: {
    roadmapTitle: "General Legal Research Roadmap",
    summary: "A general starting point when the case type or next step isn't clear yet.",
    legalTerms: ["Jurisdiction", "Statute"],
    steps: [
      {
        title: "Identify your case type and jurisdiction",
        description: "Narrowing down the type of case and court involved is a helpful first step.",
        whyItMatters: "Different case types and jurisdictions follow different procedures.",
        suggestedActions: ["Read the Jurisdiction glossary entry", "Gather any paperwork identifying your case"],
        relatedTerms: ["Jurisdiction"],
        category: "getting-started",
        priority: "essential",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
      {
        title: "Learn foundational legal research terms",
        description: "A few core terms make later research easier to follow.",
        whyItMatters: "Understanding basic vocabulary makes other resources easier to use.",
        suggestedActions: ["Read the Statute and Precedent glossary entries", "Visit the Legal Terms Glossary"],
        relatedTerms: ["Statute", "Precedent"],
        category: "legal-concepts",
        priority: "recommended",
        difficulty: "beginner",
        estimatedMinutes: 6,
      },
      {
        title: "Gather your case documents",
        description: "Collect any paperwork you already have related to your situation.",
        whyItMatters: "Having documents organized makes it easier to figure out next steps.",
        suggestedActions: ["Read the Evidence glossary entry", "List what documents you have and don't have"],
        relatedTerms: ["Evidence"],
        category: "case-documentation",
        priority: "recommended",
        difficulty: "beginner",
        estimatedMinutes: 5,
      },
    ],
  },
};
