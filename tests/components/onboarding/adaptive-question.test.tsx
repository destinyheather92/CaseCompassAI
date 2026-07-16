// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdaptiveQuestion } from "@/components/onboarding/adaptive-question";
import type { IntakeQuestion } from "@/types/intake-interview";

const shortTextQuestion: IntakeQuestion = {
  id: "q1",
  text: "What court handled your case?",
  purpose: "Establish jurisdiction.",
  answerType: "short-text",
  choices: null,
  required: true,
  sensitiveInformationWarning: null,
};

const dateQuestion: IntakeQuestion = { ...shortTextQuestion, id: "q2", answerType: "date", text: "When was the trial?" };
const yesNoQuestion: IntakeQuestion = { ...shortTextQuestion, id: "q3", answerType: "yes-no", text: "Was there a jury trial?" };
const singleChoiceQuestion: IntakeQuestion = {
  ...shortTextQuestion,
  id: "q4",
  answerType: "single-choice",
  text: "Has judgment been entered?",
  choices: ["Yes", "No", "Not sure"],
};
const multipleChoiceQuestion: IntakeQuestion = {
  ...shortTextQuestion,
  id: "q5",
  answerType: "multiple-choice",
  text: "Which documents do you have?",
  choices: ["Court opinion", "Transcript", "Order"],
};

describe("AdaptiveQuestion", () => {
  it("renders the question text and moves focus to it", () => {
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={false} />);
    expect(screen.getByRole("heading", { name: shortTextQuestion.text })).toHaveFocus();
  });

  it("shows a sensitive-information warning when present", () => {
    render(
      <AdaptiveQuestion
        question={{ ...shortTextQuestion, sensitiveInformationWarning: "Please don't include your SSN." }}
        onSubmit={vi.fn()}
        submitting={false}
      />,
    );
    expect(screen.getByText(/please don't include your ssn/i)).toBeInTheDocument();
  });

  it("renders a short-text input and submits the typed answer", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={onSubmit} submitting={false} />);
    await user.type(screen.getByRole("textbox"), "Richland County Circuit Court");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("Richland County Circuit Court");
  });

  it("renders a date input for answerType date", () => {
    render(<AdaptiveQuestion question={dateQuestion} onSubmit={vi.fn()} submitting={false} />);
    const input = screen.getByLabelText(dateQuestion.text);
    expect(input).toHaveAttribute("type", "date");
  });

  it("renders Yes/No controls for answerType yes-no", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={yesNoQuestion} onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("button", { name: "Yes" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("Yes");
  });

  it("renders one radio per choice for answerType single-choice and submits the chosen label", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={singleChoiceQuestion} onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("No");
  });

  it("renders one checkbox per choice for answerType multiple-choice and submits a joined answer", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={multipleChoiceQuestion} onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("checkbox", { name: "Court opinion" }));
    await user.click(screen.getByRole("checkbox", { name: "Transcript" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("Court opinion, Transcript");
  });

  it("disables Continue until a required answer is provided", () => {
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={false} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("disables the submit control and shows a busy state while submitting", () => {
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={true} />);
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
  });

  it("renders user-provided question text safely — never as raw HTML", () => {
    const maliciousQuestion: IntakeQuestion = {
      ...shortTextQuestion,
      text: "<img src=x onerror=alert(1)>What happened?",
    };
    render(<AdaptiveQuestion question={maliciousQuestion} onSubmit={vi.fn()} submitting={false} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("heading").textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("does not render the question text twice (heading + duplicate label)", () => {
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={false} />);
    const matches = screen.getAllByText(shortTextQuestion.text);
    expect(matches).toHaveLength(1);
  });

  it("the short-text input remains properly labelled without a visibly duplicated label", () => {
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={false} />);
    expect(screen.getByLabelText(shortTextQuestion.text)).toBeInTheDocument();
  });

  it("offers an 'I don't know' option that submits a standard answer without requiring typed text", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={onSubmit} submitting={false} />);

    const dontKnowCheckbox = screen.getByRole("checkbox", { name: /don't know/i });
    await user.click(dontKnowCheckbox);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("I don't know");
  });

  it("disables the main answer input while 'I don't know' is checked, and restores it when unchecked", async () => {
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={shortTextQuestion} onSubmit={vi.fn()} submitting={false} />);

    const textbox = screen.getByRole("textbox");
    const dontKnowCheckbox = screen.getByRole("checkbox", { name: /don't know/i });

    await user.click(dontKnowCheckbox);
    expect(textbox).toBeDisabled();

    await user.click(dontKnowCheckbox);
    expect(textbox).toBeEnabled();
  });

  it("offers 'I don't know' for choice-based answer types too", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AdaptiveQuestion question={singleChoiceQuestion} onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("checkbox", { name: /don't know/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onSubmit).toHaveBeenCalledWith("I don't know");
  });
});
