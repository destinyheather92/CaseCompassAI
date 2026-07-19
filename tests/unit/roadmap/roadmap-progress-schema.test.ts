import { describe, expect, it } from "vitest";
import { updateRoadmapProgressSchema } from "@/lib/roadmap/roadmap-progress-schema";

describe("updateRoadmapProgressSchema", () => {
  it("accepts a minimal valid update", () => {
    const result = updateRoadmapProgressSchema.safeParse({ stepId: "step-1", status: "in-progress" });
    expect(result.success).toBe(true);
  });

  it("accepts an optional note", () => {
    const result = updateRoadmapProgressSchema.safeParse({ stepId: "step-1", status: "completed", note: "Filed the motion." });
    expect(result.success).toBe(true);
  });

  it("rejects a missing stepId", () => {
    const result = updateRoadmapProgressSchema.safeParse({ status: "in-progress" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status value", () => {
    const result = updateRoadmapProgressSchema.safeParse({ stepId: "step-1", status: "done" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty stepId", () => {
    const result = updateRoadmapProgressSchema.safeParse({ stepId: "", status: "not-started" });
    expect(result.success).toBe(false);
  });

  it("rejects a note over 1000 characters", () => {
    const result = updateRoadmapProgressSchema.safeParse({
      stepId: "step-1",
      status: "in-progress",
      note: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
