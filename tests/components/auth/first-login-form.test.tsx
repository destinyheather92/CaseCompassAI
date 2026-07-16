// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { FirstLoginForm } from "@/components/auth/first-login-form";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("FirstLoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    fetchMock.mockReset();
  });

  it("renders current password, new password, and confirmation fields", () => {
    render(<FirstLoginForm />);
    expect(screen.getByLabelText(/temporary password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
  });

  it("blocks submission client-side when the new password and confirmation don't match, without calling the API", async () => {
    const user = userEvent.setup();
    render(<FirstLoginForm />);

    await user.type(screen.getByLabelText(/temporary password/i), "temp-pw-123");
    await user.type(screen.getByLabelText(/^new password/i), "correct horse battery");
    await user.type(screen.getByLabelText(/confirm new password/i), "different phrase");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks submission client-side when the new password is too short, without calling the API", async () => {
    const user = userEvent.setup();
    render(<FirstLoginForm />);

    await user.type(screen.getByLabelText(/temporary password/i), "temp-pw-123");
    await user.type(screen.getByLabelText(/^new password/i), "short1");
    await user.type(screen.getByLabelText(/confirm new password/i), "short1");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/must be at least 10 characters/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits valid input to the API and redirects on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "changed", redirectTo: "/get-started" }));
    const user = userEvent.setup();
    render(<FirstLoginForm />);

    await user.type(screen.getByLabelText(/temporary password/i), "temp-pw-123");
    await user.type(screen.getByLabelText(/^new password/i), "correct horse battery");
    await user.type(screen.getByLabelText(/confirm new password/i), "correct horse battery");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/first-login-password",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            currentPassword: "temp-pw-123",
            newPassword: "correct horse battery",
            confirmNewPassword: "correct horse battery",
          }),
        }),
      );
      expect(pushMock).toHaveBeenCalledWith("/get-started");
    });
  });

  it("shows the server's exact message when the current password is wrong, and preserves the new-password fields", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "incorrect-current-password", message: "Your current password is incorrect." }, 400));
    const user = userEvent.setup();
    render(<FirstLoginForm />);

    await user.type(screen.getByLabelText(/temporary password/i), "wrong-temp-pw");
    await user.type(screen.getByLabelText(/^new password/i), "correct horse battery");
    await user.type(screen.getByLabelText(/confirm new password/i), "correct horse battery");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(await screen.findByText(/your current password is incorrect/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toHaveValue("correct horse battery");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
