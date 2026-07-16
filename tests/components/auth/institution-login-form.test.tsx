// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const passwordMock = vi.fn();
const finalizeMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();
let mockIsSignedIn = false;

vi.mock("@clerk/nextjs", () => ({
  useSignIn: () => ({
    signIn: {
      password: passwordMock,
      finalize: finalizeMock,
    },
    errors: { fields: {}, global: null },
    fetchStatus: "idle",
  }),
  useAuth: () => ({ isLoaded: true, isSignedIn: mockIsSignedIn }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import { InstitutionLoginForm } from "@/components/auth/institution-login-form";

describe("InstitutionLoginForm", () => {
  beforeEach(() => {
    passwordMock.mockReset();
    finalizeMock.mockReset();
    pushMock.mockReset();
    replaceMock.mockReset();
    mockIsSignedIn = false;
    finalizeMock.mockImplementation(async ({ navigate }: { navigate: (args: unknown) => void }) => {
      navigate({ session: {}, decorateUrl: (path: string) => path });
      return { error: null };
    });
  });

  it("renders a username-or-email identifier field and a password field, with the required institutional instruction", () => {
    render(<InstitutionLoginForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByText(/use the username and password provided by your institution/i)).toBeInTheDocument();
  });

  it("submits the typed identifier and password to signIn.password", async () => {
    passwordMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<InstitutionLoginForm />);

    await user.type(screen.getByLabelText(/username/i), "scdc-k7m482");
    await user.type(screen.getByLabelText(/password/i), "temp-password-123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(passwordMock).toHaveBeenCalledWith({ identifier: "scdc-k7m482", password: "temp-password-123" });
    });
  });

  it("shows a single generic error message on failure, never revealing which field was wrong", async () => {
    passwordMock.mockResolvedValue({ error: { message: "Identifier not found" } });
    const user = userEvent.setup();
    render(<InstitutionLoginForm />);

    await user.type(screen.getByLabelText(/username/i), "does-not-exist");
    await user.type(screen.getByLabelText(/password/i), "whatever");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/username or password is incorrect/i);
    expect(alert).not.toHaveTextContent(/does-not-exist/i);
    expect(alert).not.toHaveTextContent(/not found/i);
  });

  it("finalizes the session and navigates to /first-login on success", async () => {
    passwordMock.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<InstitutionLoginForm />);

    await user.type(screen.getByLabelText(/username/i), "scdc-k7m482");
    await user.type(screen.getByLabelText(/password/i), "temp-password-123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(finalizeMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/first-login");
    });
  });

  it("requires both fields before allowing submission", async () => {
    const user = userEvent.setup();
    render(<InstitutionLoginForm />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(passwordMock).not.toHaveBeenCalled();
  });

  it("when a session is already active in this browser, redirects immediately instead of showing the form or re-attempting sign-in", () => {
    mockIsSignedIn = true;
    render(<InstitutionLoginForm />);

    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/first-login");
    expect(passwordMock).not.toHaveBeenCalled();
  });
});
