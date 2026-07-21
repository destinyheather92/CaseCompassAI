import type { LucideIcon } from "lucide-react";
import {
  Gavel,
  Scale,
  Users,
  FileStack,
  ShieldQuestion,
  HelpCircle,
  Siren,
  Hourglass,
  CheckCheck,
  Landmark,
  BadgeCheck,
  FileWarning,
  Compass,
  BookOpenText,
  ScrollText,
  MessageCircleQuestion,
  Sparkles,
  FileQuestion,
  FileText,
  FileSignature,
  ClipboardList,
  FileClock,
  FolderOpen,
} from "lucide-react";
import type { CaseType, ProceduralStage, ResearchGoal, DocumentType } from "@/types/intake";

/** Purely decorative per-option icons for the intake wizard — never affects accessible names (rendered aria-hidden). */
export const CASE_TYPE_ICONS: Record<CaseType, LucideIcon> = {
  criminal: Gavel,
  civil: Scale,
  family: Users,
  appeal: FileStack,
  "post-conviction": ShieldQuestion,
  unsure: HelpCircle,
};

export const PROCEDURAL_STAGE_ICONS: Record<ProceduralStage, LucideIcon> = {
  "investigation-or-charges": Siren,
  pretrial: Hourglass,
  "trial-completed": CheckCheck,
  sentencing: Landmark,
  "direct-appeal": FileStack,
  "post-conviction": ShieldQuestion,
  "civil-case-pending": BadgeCheck,
  "judgment-entered": FileWarning,
  unsure: HelpCircle,
};

export const RESEARCH_GOAL_ICONS: Record<ResearchGoal, LucideIcon> = {
  "find-starting-point": Compass,
  "understand-case": BookOpenText,
  "understand-opinion": ScrollText,
  "research-issues": MessageCircleQuestion,
  "understand-terms": Sparkles,
  other: FileQuestion,
};

export const DOCUMENT_TYPE_ICONS: Record<DocumentType, LucideIcon> = {
  none: FolderOpen,
  "court-opinion": FileText,
  motion: FileSignature,
  order: ClipboardList,
  transcript: FileClock,
  appeal: FileStack,
  other: FileQuestion,
};
