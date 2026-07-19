import type { ResearchStatus } from "@/lib/dashboard/research-status";

export const RESEARCH_STATUS_LABELS: Record<ResearchStatus, string> = {
  "not-started": "Not started",
  "intake-in-progress": "Intake in progress",
  "ready-for-review": "Ready for review",
  "intake-confirmed": "Intake confirmed",
  "roadmap-ready": "Ready to build roadmap",
  "roadmap-generated": "Roadmap ready",
  "research-in-progress": "Research in progress",
  "roadmap-completed": "Research complete",
};
