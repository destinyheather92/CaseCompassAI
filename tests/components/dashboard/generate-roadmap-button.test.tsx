// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { GenerateRoadmapButton } from "@/components/dashboard/generate-roadmap-button";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("GenerateRoadmapButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    fetchMock.mockReset();
  });

  it("posts the intakeId and navigates to the new roadmap on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "created", roadmapId: "r1" }, 201));
    const user = userEvent.setup();
    render(<GenerateRoadmapButton intakeId="intake-1" />);

    await user.click(screen.getByRole("button", { name: /build my roadmap/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/roadmap/generate",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ intakeId: "intake-1" }) }),
      );
      expect(pushMock).toHaveBeenCalledWith("/dashboard/roadmaps/r1");
    });
  });

  it("shows the server's error message and does not navigate on failure", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "intake-not-ready", message: "Please review and confirm your intake first." }, 400),
    );
    const user = userEvent.setup();
    render(<GenerateRoadmapButton intakeId="intake-1" />);

    await user.click(screen.getByRole("button", { name: /build my roadmap/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/please review and confirm your intake first/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a safe fallback message on a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    render(<GenerateRoadmapButton intakeId="intake-1" />);

    await user.click(screen.getByRole("button", { name: /build my roadmap/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not build a roadmap right now/i);
  });
});
