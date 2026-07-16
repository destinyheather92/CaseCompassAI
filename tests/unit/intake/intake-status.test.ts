import { describe, expect, it } from "vitest";
import { toPrismaIntakeStatus, fromPrismaIntakeStatus } from "@/lib/intake/intake-status";
import type { IntakeStatus } from "@/types/intake-interview";

const ALL_STATUSES: IntakeStatus[] = [
  "draft",
  "interviewing",
  "needs-clarification",
  "ready-for-review",
  "completed",
  "abandoned",
];

describe("intake status mapping", () => {
  it("round-trips every status through toPrisma -> fromPrisma", () => {
    for (const status of ALL_STATUSES) {
      expect(fromPrismaIntakeStatus(toPrismaIntakeStatus(status))).toBe(status);
    }
  });

  it("maps to the exact expected Prisma enum values", () => {
    expect(toPrismaIntakeStatus("draft")).toBe("DRAFT");
    expect(toPrismaIntakeStatus("interviewing")).toBe("INTERVIEWING");
    expect(toPrismaIntakeStatus("needs-clarification")).toBe("NEEDS_CLARIFICATION");
    expect(toPrismaIntakeStatus("ready-for-review")).toBe("READY_FOR_REVIEW");
    expect(toPrismaIntakeStatus("completed")).toBe("COMPLETED");
    expect(toPrismaIntakeStatus("abandoned")).toBe("ABANDONED");
  });
});
