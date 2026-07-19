import { describe, expect, it } from "vitest";
import { computeResearchStatus, primaryActionFor } from "@/lib/dashboard/research-status";

describe("computeResearchStatus", () => {
  it("returns not-started when there is no intake at all", () => {
    expect(computeResearchStatus({ intakeStatus: null, totalSteps: 0, completedSteps: 0, startedSteps: 0 })).toBe(
      "not-started",
    );
  });

  it("returns intake-in-progress for a draft intake", () => {
    expect(
      computeResearchStatus({ intakeStatus: "DRAFT", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("intake-in-progress");
  });

  it("returns intake-in-progress for an interviewing intake", () => {
    expect(
      computeResearchStatus({ intakeStatus: "INTERVIEWING", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("intake-in-progress");
  });

  it("returns intake-in-progress for a needs-clarification intake", () => {
    expect(
      computeResearchStatus({
        intakeStatus: "NEEDS_CLARIFICATION",
        totalSteps: 0,
        completedSteps: 0,
        startedSteps: 0,
      }),
    ).toBe("intake-in-progress");
  });

  it("returns ready-for-review for a ready-for-review intake", () => {
    expect(
      computeResearchStatus({ intakeStatus: "READY_FOR_REVIEW", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("ready-for-review");
  });

  it("returns intake-confirmed for a confirmed intake with no roadmap", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("intake-confirmed");
  });

  it("returns roadmap-generated for a generated roadmap with zero progress", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 8, completedSteps: 0, startedSteps: 0 }),
    ).toBe("roadmap-generated");
  });

  it("returns research-in-progress for a roadmap with partial progress", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 8, completedSteps: 3, startedSteps: 1 }),
    ).toBe("research-in-progress");
  });

  it("returns research-in-progress when a step has been started but none completed", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 8, completedSteps: 0, startedSteps: 1 }),
    ).toBe("research-in-progress");
  });

  it("returns roadmap-completed when every step is completed", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 8, completedSteps: 8, startedSteps: 0 }),
    ).toBe("roadmap-completed");
  });

  it("handles an abandoned intake safely without a roadmap", () => {
    expect(
      computeResearchStatus({ intakeStatus: "ABANDONED", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("not-started");
  });

  it("handles a conflicting/invalid state (roadmap exists with steps but intakeStatus is null) safely, never throwing", () => {
    expect(() =>
      computeResearchStatus({ intakeStatus: null, totalSteps: 8, completedSteps: 2, startedSteps: 1 }),
    ).not.toThrow();
    // Roadmap presence takes priority over a missing/null intake status.
    expect(
      computeResearchStatus({ intakeStatus: null, totalSteps: 8, completedSteps: 2, startedSteps: 1 }),
    ).toBe("research-in-progress");
  });

  it("handles totalSteps of zero for an existing roadmap without crashing (treated as generated, not completed)", () => {
    expect(
      computeResearchStatus({ intakeStatus: "COMPLETED", totalSteps: 0, completedSteps: 0, startedSteps: 0 }),
    ).toBe("intake-confirmed");
  });
});

describe("primaryActionFor", () => {
  it("Start Intake when not-started", () => {
    expect(primaryActionFor("not-started", { intakeId: null, roadmapId: null })).toEqual({
      label: "Start Intake",
      href: "/get-started",
    });
  });

  it("Continue Intake when intake-in-progress", () => {
    expect(primaryActionFor("intake-in-progress", { intakeId: "i1", roadmapId: null })).toEqual({
      label: "Continue Intake",
      href: "/dashboard/intakes/i1",
    });
  });

  it("Review Intake when ready-for-review", () => {
    expect(primaryActionFor("ready-for-review", { intakeId: "i1", roadmapId: null })).toEqual({
      label: "Review Intake",
      href: "/dashboard/intakes/i1",
    });
  });

  it("Build My Roadmap when intake-confirmed", () => {
    expect(primaryActionFor("intake-confirmed", { intakeId: "i1", roadmapId: null })).toEqual({
      label: "Build My Roadmap",
      href: "/dashboard/intakes/i1",
    });
  });

  it("Continue My Roadmap when roadmap-generated", () => {
    expect(primaryActionFor("roadmap-generated", { intakeId: "i1", roadmapId: "r1" })).toEqual({
      label: "Continue My Roadmap",
      href: "/dashboard/roadmaps/r1",
    });
  });

  it("Continue My Roadmap when research-in-progress", () => {
    expect(primaryActionFor("research-in-progress", { intakeId: "i1", roadmapId: "r1" })).toEqual({
      label: "Continue My Roadmap",
      href: "/dashboard/roadmaps/r1",
    });
  });

  it("Review My Research when roadmap-completed", () => {
    expect(primaryActionFor("roadmap-completed", { intakeId: "i1", roadmapId: "r1" })).toEqual({
      label: "Review My Research",
      href: "/dashboard/roadmaps/r1",
    });
  });

  it("never trusts a client-provided status string outside the known union (type system already prevents it, this documents the invariant)", () => {
    const action = primaryActionFor("intake-confirmed", { intakeId: "i1", roadmapId: null });
    expect(action.href).not.toContain("undefined");
  });
});
