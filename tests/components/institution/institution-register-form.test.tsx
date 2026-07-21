// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstitutionRegisterForm } from "@/components/institution/institution-register-form";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/facility name/i), "Ridgeview Correctional");
  await user.type(screen.getByLabelText(/contact person/i), "J. Rivera");
  await user.type(screen.getByLabelText(/work email/i), "j.rivera@example.com");
}

describe("InstitutionRegisterForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("submits the form and shows the issued credentials exactly once", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ status: "registered", institutionId: "inst-1", adminUsername: "ridgeview-p52x91", temporaryPassword: "temp-pw-123" }, 201),
    );
    const user = userEvent.setup();
    render(<InstitutionRegisterForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /create institution account/i }));

    expect(await screen.findByText("ridgeview-p52x91")).toBeInTheDocument();
    expect(screen.getByText("temp-pw-123")).toBeInTheDocument();
    expect(screen.getByText(/cannot be viewed again/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continue to sign in/i })).toHaveAttribute("href", "/institution/login");
  });

  it("shows the 'please describe' field only when Other is selected as institution type", async () => {
    const user = userEvent.setup();
    render(<InstitutionRegisterForm />);

    expect(screen.queryByLabelText(/please describe/i)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/institution type/i), "Other");
    expect(screen.getByLabelText(/please describe/i)).toBeInTheDocument();
  });

  it("shows a server-provided error message and does not show credentials on failure", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "invalid-request", message: "Enter a valid work email." }, 400));
    const user = userEvent.setup();
    render(<InstitutionRegisterForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /create institution account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/enter a valid work email/i);
    expect(screen.queryByText(/temporary password/i)).not.toBeInTheDocument();
  });

  it("sends contactEmail but never a password field in the request body", async () => {
    fetchMock.mockReturnValueOnce(
      jsonResponse({ status: "registered", institutionId: "inst-1", adminUsername: "u", temporaryPassword: "p" }, 201),
    );
    const user = userEvent.setup();
    render(<InstitutionRegisterForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /create institution account/i }));

    const [, init] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(init.body);
    expect(sentBody.contactEmail).toBe("j.rivera@example.com");
    expect(sentBody).not.toHaveProperty("password");
  });
});
