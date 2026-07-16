// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeLoading } from "@/components/onboarding/intake-loading";
import { IntakeRecovery } from "@/components/onboarding/intake-recovery";

describe("IntakeLoading", () => {
  it("announces a loading message via aria-live, honestly describing preparation rather than claiming analysis of legal claims", () => {
    render(<IntakeLoading />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.textContent?.toLowerCase()).not.toContain("analyzing your legal claim");
    expect(region.textContent?.toLowerCase()).not.toContain("determining your rights");
  });
});

describe("IntakeRecovery", () => {
  it("shows the provided error message and preserves the user's framing that answers are saved", () => {
    render(<IntakeRecovery message="CaseCompass could not prepare the next question right now." onRetry={vi.fn()} onReview={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/could not prepare the next question/i);
  });

  it("calls onRetry when Try Again is clicked", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<IntakeRecovery message="error" onRetry={onRetry} onReview={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("calls onReview when Review My Answers is clicked", async () => {
    const onReview = vi.fn();
    const user = userEvent.setup();
    render(<IntakeRecovery message="error" onRetry={vi.fn()} onReview={onReview} />);
    await user.click(screen.getByRole("button", { name: /review my answers/i }));
    expect(onReview).toHaveBeenCalled();
  });
});
