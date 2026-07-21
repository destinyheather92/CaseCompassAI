// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoadmapCategorySection } from "@/components/roadmap/roadmap-category-section";

describe("RoadmapCategorySection", () => {
  it("shows the category label and completed-of-total count", () => {
    render(
      <RoadmapCategorySection category="legal-concepts" steps={[{ status: "completed" }, { status: "not-started" }]}>
        <p>Step content</p>
      </RoadmapCategorySection>,
    );
    expect(screen.getByText("Legal Concepts")).toBeInTheDocument();
    expect(screen.getByText("(1/2)")).toBeInTheDocument();
  });

  it("is expanded by default", () => {
    render(
      <RoadmapCategorySection category="getting-started" steps={[{ status: "not-started" }]}>
        <p>Step content</p>
      </RoadmapCategorySection>,
    );
    expect(screen.getByText("Step content")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses and re-expands children on click", async () => {
    const user = userEvent.setup();
    render(
      <RoadmapCategorySection category="getting-started" steps={[{ status: "not-started" }]}>
        <p>Step content</p>
      </RoadmapCategorySection>,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.queryByText("Step content")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Step content")).toBeInTheDocument();
  });
});
