// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { RoadmapStepCard } from "@/components/roadmap/roadmap-step-card";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const step = {
  id: "step-1",
  order: 1,
  title: "File the motion",
  description: "Description of the step.",
  whyItMatters: "This matters because...",
  suggestedActions: ["Talk to the clerk"],
  relatedTerms: [],
  status: "not-started" as const,
  note: null,
};

describe("RoadmapStepCard", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "updated", progress: { stepId: "step-1", status: "in-progress", note: null, startedAt: null, completedAt: null } }),
    );
  });

  it("renders the step content", () => {
    render(<RoadmapStepCard roadmapId="r1" step={step} />);
    expect(screen.getByText("File the motion")).toBeInTheDocument();
    expect(screen.getByText("Talk to the clerk", { exact: false })).toBeInTheDocument();
  });

  it("PATCHes the new status and marks it pressed on click", async () => {
    const user = userEvent.setup();
    render(<RoadmapStepCard roadmapId="r1" step={step} />);

    await user.click(screen.getByRole("button", { name: /^in progress$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/roadmap-progress/r1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ stepId: "step-1", status: "in-progress" }) }),
      );
      expect(screen.getByRole("button", { name: /^in progress$/i })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("reverts the status and shows an error when the update fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "invalid-step", message: "That step does not exist." }, 400));
    const user = userEvent.setup();
    render(<RoadmapStepCard roadmapId="r1" step={step} />);

    await user.click(screen.getByRole("button", { name: /^completed$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/that step does not exist/i);
    expect(screen.getByRole("button", { name: /^not started$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("links each related term to the glossary", () => {
    render(<RoadmapStepCard roadmapId="r1" step={{ ...step, relatedTerms: ["Arraignment"] }} />);
    const link = screen.getByRole("link", { name: "Arraignment" });
    expect(link).toHaveAttribute("href", "/resources/legal-terms-glossary?term=Arraignment");
  });

  it("saves a private note without altering the current status", async () => {
    const user = userEvent.setup();
    render(<RoadmapStepCard roadmapId="r1" step={step} />);

    await user.type(screen.getByLabelText(/private note/i), "Called the clerk on Monday.");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/roadmap-progress/r1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ stepId: "step-1", status: "not-started", note: "Called the clerk on Monday." }),
        }),
      );
    });
  });

  it("announces a successful note save", async () => {
    const user = userEvent.setup();
    render(<RoadmapStepCard roadmapId="r1" step={step} />);

    await user.type(screen.getByLabelText(/private note/i), "A note.");
    await user.click(screen.getByRole("button", { name: /save note/i }));

    expect(await screen.findByText(/note saved/i)).toBeInTheDocument();
  });
});
