// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeReview } from "@/components/onboarding/intake-review";

const baseProps = {
  caseType: "Criminal Case",
  jurisdiction: "South Carolina",
  proceduralStage: "Post-Conviction",
  factualSummary: "The user was convicted in state court and is exploring post-conviction options.",
  unresolvedInformation: ["Exact sentencing date"],
  answeredTurns: [{ questionId: "q1", questionText: "What court handled your case?", answerText: "Richland County Circuit Court" }],
  acknowledged: false,
  onAcknowledgedChange: vi.fn(),
  onConfirm: vi.fn(),
  onEditLayer1: vi.fn(),
  submitting: false,
};

describe("IntakeReview", () => {
  it("displays the case category, jurisdiction, procedural stage, and factual summary", () => {
    render(<IntakeReview {...baseProps} />);
    expect(screen.getByText("Criminal Case")).toBeInTheDocument();
    expect(screen.getByText("South Carolina")).toBeInTheDocument();
    expect(screen.getByText("Post-Conviction")).toBeInTheDocument();
    expect(screen.getByText(/exploring post-conviction options/i)).toBeInTheDocument();
  });

  it("displays unresolved information and the answered Q&A history", () => {
    render(<IntakeReview {...baseProps} />);
    expect(screen.getByText("Exact sentencing date")).toBeInTheDocument();
    expect(screen.getByText("What court handled your case?")).toBeInTheDocument();
    expect(screen.getByText("Richland County Circuit Court")).toBeInTheDocument();
  });

  it("requires the acknowledgement checkbox before Confirm is enabled", () => {
    render(<IntakeReview {...baseProps} acknowledged={false} />);
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });

  it("enables Confirm once acknowledged is true", () => {
    render(<IntakeReview {...baseProps} acknowledged={true} />);
    expect(screen.getByRole("button", { name: /confirm/i })).toBeEnabled();
  });

  it("calls onAcknowledgedChange when the checkbox is toggled", async () => {
    const onAcknowledgedChange = vi.fn();
    const user = userEvent.setup();
    render(<IntakeReview {...baseProps} onAcknowledgedChange={onAcknowledgedChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onAcknowledgedChange).toHaveBeenCalledWith(true);
  });

  it("calls onConfirm when Confirm is clicked while acknowledged", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<IntakeReview {...baseProps} acknowledged={true} onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows an Edit control that calls onEditLayer1", async () => {
    const onEditLayer1 = vi.fn();
    const user = userEvent.setup();
    render(<IntakeReview {...baseProps} onEditLayer1={onEditLayer1} />);
    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEditLayer1).toHaveBeenCalled();
  });

  it("renders the required educational-guidance acknowledgement text", () => {
    render(<IntakeReview {...baseProps} />);
    expect(screen.getByText(/not providing legal advice/i)).toBeInTheDocument();
  });

  it("disables Confirm while submitting even if acknowledged", () => {
    render(<IntakeReview {...baseProps} acknowledged={true} submitting={true} />);
    expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
  });
});
