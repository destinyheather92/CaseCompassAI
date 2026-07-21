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

  it("archives a user via the PATCH endpoint and reflects the new status", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [{ ...sampleUser, accountStatus: "ACTIVE" }], total: 1, page: 1, pageSize: 25 }))
      .mockReturnValueOnce(jsonResponse({ status: "updated", accountStatus: "ARCHIVED" }))
      .mockReturnValueOnce(jsonResponse({ users: [{ ...sampleUser, accountStatus: "ARCHIVED" }], total: 1, page: 1, pageSize: 25 }));

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    await user.click(screen.getByRole("button", { name: /^archive$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/institution/users/user-1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ action: "archive" }) }),
      );
    });
    expect(await screen.findByText(/^archived$/i)).toBeInTheDocument();
  });

  it("offers Reactivate (not Archive) for an already-archived user", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ users: [{ ...sampleUser, accountStatus: "ARCHIVED" }], total: 1, page: 1, pageSize: 25 }));
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    expect(screen.getByRole("button", { name: /reactivate/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^archive$/i })).not.toBeInTheDocument();
  });

  it("submits the inmate-specific fields (first/last name, DOC number, housing unit) when creating a user", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [], total: 0, page: 1, pageSize: 25 }))
      .mockReturnValueOnce(
        jsonResponse(
          { status: "created", user: { id: "new-1", username: "fac-p52x91", role: "INCARCERATED_USER", accountStatus: "PENDING_FIRST_LOGIN" }, temporaryPassword: "pw" },
          201,
        ),
      )
      .mockReturnValueOnce(jsonResponse({ users: [], total: 0, page: 1, pageSize: 25 }));

    const user = userEvent.setup();
    render(<UserManagement />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /create user/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/first name/i), "Jordan");
    await user.type(within(dialog).getByLabelText(/last name/i), "Rivera");
    await user.type(within(dialog).getByLabelText(/doc number/i), "SC-00012345");
    await user.type(within(dialog).getByLabelText(/housing unit/i), "Block C");
    await user.click(within(dialog).getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      const [, init] = fetchMock.mock.calls[1];
      const body = JSON.parse(init.body);
      expect(body).toMatchObject({ firstName: "Jordan", lastName: "Rivera", docNumber: "SC-00012345", housingUnit: "Block C" });
    });
  });

  it("never offers Institution Staff as an assignable role — there is no institution-staff role", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ users: [], total: 0, page: 1, pageSize: 25 }));
    const user = userEvent.setup();
    render(<UserManagement />);
    await user.click(screen.getByRole("button", { name: /create user/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByRole("option", { name: /institution staff/i })).not.toBeInTheDocument();
  });

  it("searches users by submitting the search form", async () => {
    fetchMock
      .mockReturnValueOnce(jsonResponse({ users: [sampleUser], total: 1, page: 1, pageSize: 25 }))
      .mockReturnValueOnce(jsonResponse({ users: [], total: 0, page: 1, pageSize: 25 }));

    const user = userEvent.setup();
    render(<UserManagement />);
    await screen.findByText("scdc-k7m482");

    await user.type(screen.getByLabelText(/search users/i), "Rivera");
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/institution/users?search=Rivera");
    });
  });
});
