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

import { LogOutButton } from "@/components/dashboard/log-out-button";

describe("LogOutButton", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signOutMock.mockReset();
    clearAllLocalSessionDataMock.mockReset();
  });

  it("clears local state, signs out, and redirects to the given destination", async () => {
    const user = userEvent.setup();
    render(<LogOutButton postLogoutRedirect="/" />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(clearAllLocalSessionDataMock).toHaveBeenCalled();
      expect(signOutMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("redirects institution-managed users to the institution login route when configured", async () => {
    const user = userEvent.setup();
    render(<LogOutButton postLogoutRedirect="/institution/login" />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/institution/login");
    });
  });

  it("clears local state before the redirect even if signOut rejects", async () => {
    signOutMock.mockRejectedValueOnce(new Error("network"));
    const user = userEvent.setup();
    render(<LogOutButton postLogoutRedirect="/" />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(clearAllLocalSessionDataMock).toHaveBeenCalled();
    });
  });
});
