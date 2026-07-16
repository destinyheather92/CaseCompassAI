// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserManagement } from "@/components/institution/user-management";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
}

const sampleUser = {
  id: "user-1",
  username: "scdc-k7m482",
  displayName: null,
  role: "INCARCERATED_USER",
  accountStatus: "PENDING_FIRST_LOGIN",
  facilityId: null,
  mustChangePassword: true,
  lastLoginAt: null,
  createdAt: new Date().toISOString(),
};

describe("UserManagement", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("loads and displays the user list on mount", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 }));
    render(<UserManagement />);

    expect(await screen.findByText("scdc-k7m482")).toBeInTheDocument();
    expect(screen.getByText(/pending first login/i)).toBeInTheDocument();
  });

  it("creates a new user and displays the temporary password exactly once, with a copy-now warning", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [], total: 0, page: 1, pageSize: 25 })) // initial list
      .mockReturnValueOnce(
        jsonResponse(
          {
            status: "created",
            user: { id: "new-1", username: "fac-p52x91", role: "INCARCERATED_USER", accountStatus: "PENDING_FIRST_LOGIN" },
            temporaryPassword: "gener8ed-pw-xyz",
          },
          201,
        ),
      )
      .mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 })); // refetch after create

    const user = userEvent.setup();
    render(<UserManagement />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /create user/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

    expect(await screen.findByText("gener8ed-pw-xyz")).toBeInTheDocument();
    expect(screen.getByText(/copy this temporary password now.*cannot be viewed again/i)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/institution/users",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deactivates a user via the PATCH endpoint and reflects the new status", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [{ ...sampleUser, accountStatus: "ACTIVE" }], total: 1, page: 1, pageSize: 25 }))
      .mockReturnValueOnce(jsonResponse({ status: "updated", accountStatus: "DISABLED" }))
      .mockReturnValueOnce(jsonResponse({ users: [{ ...sampleUser, accountStatus: "DISABLED" }], total: 1, page: 1, pageSize: 25 }));

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    await user.click(screen.getByRole("button", { name: /deactivate/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/institution/users/user-1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ action: "deactivate" }) }),
      );
    });
    expect(await screen.findByText(/^disabled$/i)).toBeInTheDocument();
  });

  it("resets a user's password via the reset-password endpoint and shows the new temporary password once", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 }))
      .mockReturnValueOnce(jsonResponse({ status: "reset", temporaryPassword: "new-reset-pw-456" }))
      .mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 }));

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText("new-reset-pw-456")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/institution/users/user-1/reset-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("never renders a password field for existing users in the table", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 }));
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    expect(screen.queryByText(/password/i, { selector: "td" })).not.toBeInTheDocument();
  });
});
