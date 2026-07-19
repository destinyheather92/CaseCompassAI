import type { RoadmapStepStatus as PrismaRoadmapStepStatus } from "@/lib/generated/prisma/enums";
import type { RoadmapStepStatus } from "@/types/roadmap";

const API_TO_PRISMA: Record<RoadmapStepStatus, PrismaRoadmapStepStatus> = {
  "not-started": "NOT_STARTED",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
};

const PRISMA_TO_API: Record<PrismaRoadmapStepStatus, RoadmapStepStatus> = {
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
};

export function toPrismaStepStatus(status: RoadmapStepStatus): PrismaRoadmapStepStatus {
  return API_TO_PRISMA[status];
}

export function fromPrismaStepStatus(status: PrismaRoadmapStepStatus): RoadmapStepStatus {
  return PRISMA_TO_API[status];
}
