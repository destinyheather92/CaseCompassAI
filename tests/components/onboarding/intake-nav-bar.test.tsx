// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const signOutMock = vi.fn();
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: signOutMock }),
}));

vi.mock("@/lib/client/user-scoped-storage", () => ({
  clearAllLocalSessionData: vi.fn(),
}));

import { IntakeNavBar } from "@/components/onboarding/intake-nav-bar";

describe("IntakeNavBar", () => {
  it("renders nothing for a guest (no dashboard to return to)", () => {
    const { container } = render(<IntakeNavBar isSignedIn={false} onSaveAndExit={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Save and Exit, Return to Dashboard, and Log Out for a signed-in user", () => {
    render(<IntakeNavBar isSignedIn={true} onSaveAndExit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /save and exit/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: /^log out$/i })).toBeInTheDocument();
  });

  it("calls onSaveAndExit when Save and Exit is clicked", async () => {
    const onSaveAndExit = vi.fn();
    const user = userEvent.setup();
    render(<IntakeNavBar isSignedIn={true} onSaveAndExit={onSaveAndExit} />);
    await user.click(screen.getByRole("button", { name: /save and exit/i }));
    expect(onSaveAndExit).toHaveBeenCalled();
  });
});
