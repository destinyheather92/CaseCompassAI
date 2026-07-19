// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const signOutMock = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: signOutMock }),
}));

const clearAllLocalSessionDataMock = vi.fn();
vi.mock("@/lib/client/user-scoped-storage", () => ({
  clearAllLocalSessionData: () => clearAllLocalSessionDataMock(),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { ClearSessionButton } from "@/components/dashboard/clear-session-button";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("ClearSessionButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signOutMock.mockReset();
    clearAllLocalSessionDataMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ status: "cleared" }));
  });

  it("shows a confirmation step before doing anything, so a stray click can't sign someone out", async () => {
    const user = userEvent.setup();
    render(<ClearSessionButton />);
    await user.click(screen.getByRole("button", { name: /clear my session/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("cancels without clearing anything", async () => {
    const user = userEvent.setup();
    render(<ClearSessionButton />);
    await user.click(screen.getByRole("button", { name: /clear my session/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("button", { name: /confirm/i })).not.toBeInTheDocument();
    expect(clearAllLocalSessionDataMock).not.toHaveBeenCalled();
  });

  it("clears local storage, notifies the server, signs out, and redirects home on confirm", async () => {
    const user = userEvent.setup();
    render(<ClearSessionButton />);
    await user.click(screen.getByRole("button", { name: /clear my session/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(clearAllLocalSessionDataMock).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledWith("/api/dashboard/clear-session", expect.objectContaining({ method: "POST" }));
      expect(signOutMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("still clears local data and signs out even when the server notification fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(<ClearSessionButton />);
    await user.click(screen.getByRole("button", { name: /clear my session/i }));
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(clearAllLocalSessionDataMock).toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });
});
