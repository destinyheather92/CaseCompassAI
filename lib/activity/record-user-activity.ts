import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { UserActivityType } from "@/lib/generated/prisma/enums";
import { redact } from "@/lib/security/safe-logger";
import { isApprovedActivityEvent } from "@/lib/activity/approved-activity-events";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 300;

export interface RecordActivityInput {
  userId: string;
  type: UserActivityType;
  title: string;
  description?: string;
  href?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

/**
 * Records a safe, UI-facing activity event. Silently no-ops (never
 * throws) for an unapproved event type — activity logging must never be
 * able to crash the flow that triggered it. Titles/descriptions are hard
 * length-capped so a caller can never accidentally store a full case
 * narrative here, and metadata goes through the same redaction guard as
 * safeLog/recordAuditEvent — reused, not reimplemented.
 */
export async function recordUserActivity(input: RecordActivityInput): Promise<void> {
  if (!isApprovedActivityEvent(input.type)) {
    return;
  }

  const redactedMetadata = input.metadata ? (redact(input.metadata) as Prisma.InputJsonValue) : undefined;

  await prisma.userActivity.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: truncate(input.title, MAX_TITLE_LENGTH),
      description: input.description ? truncate(input.description, MAX_DESCRIPTION_LENGTH) : undefined,
      href: input.href,
      metadata: redactedMetadata,
    },
  });
}
