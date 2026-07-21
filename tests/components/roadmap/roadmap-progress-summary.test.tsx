// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoadmapProgressSummary } from "@/components/roadmap/roadmap-progress-summary";

describe("RoadmapProgressSummary", () => {
  it("computes the completion percentage and count", () => {
    render(
      <RoadmapProgressSummary
        steps={[{ status: "completed" }, { status: "completed" }, { status: "not-started" }, { status: "not-started" }]}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("2 of 4 steps completed")).toBeInTheDocument();
  });

  it("mentions steps in progress when any exist", () => {
    render(<RoadmapProgressSummary steps={[{ status: "in-progress" }, { status: "not-started" }]} />);
    expect(screen.getByText(/1 in progress/i)).toBeInTheDocument();
  });

  it("shows 0% for an empty roadmap without dividing by zero", () => {
    render(<RoadmapProgressSummary steps={[]} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("shows 100% when every step is completed", () => {
    render(<RoadmapProgressSummary steps={[{ status: "completed" }, { status: "completed" }]} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
