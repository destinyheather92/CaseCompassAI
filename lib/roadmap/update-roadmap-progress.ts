import { prisma } from "@/lib/db";
import { requireOwnedRoadmap } from "@/lib/auth/dashboard-authorization";
import { updateRoadmapProgressSchema } from "@/lib/roadmap/roadmap-progress-schema";
import { toPrismaStepStatus, fromPrismaStepStatus } from "@/lib/roadmap/roadmap-step-status";
import { recordUserActivity } from "@/lib/activity/record-user-activity";
import type { AppUser } from "@/lib/auth/authorization";
import type { ResearchRoadmapContent, RoadmapStepStatus } from "@/types/roadmap";

export interface RoadmapProgressView {
  stepId: string;
  status: RoadmapStepStatus;
  note: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type UpdateRoadmapProgressResult =
  | { status: "updated"; progress: RoadmapProgressView }
  | { status: "invalid-request"; message: string }
  | { status: "not-found" }
  | { status: "invalid-step"; message: string };

/**
 * Never modifies `ResearchRoadmap.content` — the step must already exist
 * there, and this only writes tracking data layered on top of it (see
 * the RoadmapProgress model comment in prisma/schema.prisma). Ownership
 * is enforced via requireOwnedRoadmap, which returns `not-found` (not
 * `forbidden`) for another user's roadmap.
 */
export async function updateRoadmapProgress(
  roadmapId: string,
  rawInput: unknown,
  actorUser: AppUser,
): Promise<UpdateRoadmapProgressResult> {
  const parsed = updateRoadmapProgressSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid-request", message: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const owned = await requireOwnedRoadmap(roadmapId, actorUser);
  if (!owned.ok) {
    return { status: "not-found" };
  }

  const content = owned.resource.content as unknown as ResearchRoadmapContent;
  const step = content.steps.find((s) => s.id === parsed.data.stepId);
  if (!step) {
    return { status: "invalid-step", message: "That step does not exist on this roadmap." };
  }

  const existing = await prisma.roadmapProgress.findUnique({
    where: { userId_roadmapId_stepId: { userId: actorUser.id, roadmapId, stepId: parsed.data.stepId } },
  });

  const nextStatus = toPrismaStepStatus(parsed.data.status);
  const now = new Date();
  const note = parsed.data.note !== undefined ? parsed.data.note : (existing?.note ?? null);
  const startedAt = nextStatus === "NOT_STARTED" ? null : (existing?.startedAt ?? now);
  const completedAt = nextStatus === "COMPLETED" ? (existing?.completedAt ?? now) : null;

  const progress = await prisma.roadmapProgress.upsert({
    where: { userId_roadmapId_stepId: { userId: actorUser.id, roadmapId, stepId: parsed.data.stepId } },
    create: { userId: actorUser.id, roadmapId, stepId: parsed.data.stepId, status: nextStatus, note, startedAt, completedAt },
    update: { status: nextStatus, note, startedAt, completedAt },
  });

  if (nextStatus === "IN_PROGRESS" && existing?.status !== "IN_PROGRESS") {
    await recordUserActivity({
      userId: actorUser.id,
      type: "ROADMAP_STEP_STARTED",
      title: `Started: ${step.title}`,
      href: `/dashboard/roadmaps/${roadmapId}`,
    });
  }
  if (nextStatus === "COMPLETED" && existing?.status !== "COMPLETED") {
    await recordUserActivity({
      userId: actorUser.id,
      type: "ROADMAP_STEP_COMPLETED",
      title: `Completed: ${step.title}`,
      href: `/dashboard/roadmaps/${roadmapId}`,
    });
  }

  return {
    status: "updated",
    progress: {
      stepId: progress.stepId,
      status: fromPrismaStepStatus(progress.status),
      note: progress.note,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
    },
  };
}
