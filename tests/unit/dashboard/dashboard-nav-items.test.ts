import { describe, expect, it } from "vitest";
import { getDashboardNavItems } from "@/lib/dashboard/dashboard-nav-items";

describe("getDashboardNavItems", () => {
  it("points My Intake at get-started when no intake exists yet", () => {
    const items = getDashboardNavItems({ latestIntakeId: null, latestRoadmapId: null });
    const myIntake = items.find((item) => item.label === "My Intake");
    expect(myIntake?.href).toBe("/get-started");
  });

  it("points My Intake at the latest intake's detail page when one exists", () => {
    const items = getDashboardNavItems({ latestIntakeId: "intake-1", latestRoadmapId: null });
    const myIntake = items.find((item) => item.label === "My Intake");
    expect(myIntake?.href).toBe("/dashboard/intakes/intake-1");
  });

  it("points My Roadmap at the research history page when no roadmap exists yet", () => {
    const items = getDashboardNavItems({ latestIntakeId: null, latestRoadmapId: null });
    const myRoadmap = items.find((item) => item.label === "My Roadmap");
    expect(myRoadmap?.href).toBe("/dashboard/research");
  });

  it("points My Roadmap at the latest roadmap's detail page when one exists", () => {
    const items = getDashboardNavItems({ latestIntakeId: null, latestRoadmapId: "roadmap-1" });
    const myRoadmap = items.find((item) => item.label === "My Roadmap");
    expect(myRoadmap?.href).toBe("/dashboard/roadmaps/roadmap-1");
  });

  it("includes Dashboard, Research, Saved, Resources, and Settings as stable links", () => {
    const items = getDashboardNavItems({ latestIntakeId: null, latestRoadmapId: null });
    const labels = items.map((item) => item.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Research");
    expect(labels).toContain("Saved");
    expect(labels).toContain("Resources");
    expect(labels).toContain("Settings");
  });
});
