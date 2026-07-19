// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { RemoveSavedCaseButton } from "@/components/dashboard/remove-saved-case-button";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("RemoveSavedCaseButton", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ status: "removed" }));
  });

  it("sends a DELETE for the saved case and refreshes on success", async () => {
    const user = userEvent.setup();
    render(<RemoveSavedCaseButton savedCaseId="sc1" />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/saved-cases/sc1", expect.objectContaining({ method: "DELETE" }));
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("shows an error and does not refresh when removal fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "not-found" }, 404));
    const user = userEvent.setup();
    render(<RemoveSavedCaseButton savedCaseId="sc1" />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not remove/i);
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
