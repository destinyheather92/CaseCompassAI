// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SingleChoiceStep } from "@/components/onboarding/single-choice-step";
import { MultiChoiceStep } from "@/components/onboarding/multi-choice-step";

const options = [
  { value: "criminal", label: "Criminal Case" },
  { value: "civil", label: "Civil Case" },
  { value: "unsure", label: "Unsure" },
];

describe("SingleChoiceStep", () => {
  it("renders the heading and all options", () => {
    render(
      <SingleChoiceStep
        heading="What best describes your situation?"
        options={options}
        selected={null}
        onSelect={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /what best describes your situation/i })).toBeInTheDocument();
    for (const option of options) {
      expect(screen.getByRole("button", { name: option.label })).toBeInTheDocument();
    }
  });

  it("moves focus to the step heading on mount (accessible step transitions)", () => {
    render(
      <SingleChoiceStep heading="Step heading" options={options} selected={null} onSelect={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "Step heading" })).toHaveFocus();
  });

  it("calls onSelect with the clicked option's value, supports keyboard activation, and shows the selected state", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <SingleChoiceStep heading="h" options={options} selected="criminal" onSelect={onSelect} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    const civilButton = screen.getByRole("button", { name: "Civil Case" });
    await user.click(civilButton);
    expect(onSelect).toHaveBeenCalledWith("civil");

    const criminalButton = screen.getByRole("button", { name: "Criminal Case" });
    expect(criminalButton).toHaveAttribute("aria-pressed", "true");
    expect(civilButton).toHaveAttribute("aria-pressed", "false");
  });

  it("shows a visible checkmark on the selected option and no checkmark on unselected ones", () => {
    render(
      <SingleChoiceStep heading="h" options={options} selected="criminal" onSelect={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    const criminalButton = screen.getByRole("button", { name: "Criminal Case" });
    const civilButton = screen.getByRole("button", { name: "Civil Case" });
    expect(criminalButton.querySelector("svg")).toBeInTheDocument();
    expect(civilButton.querySelector("svg")).not.toBeInTheDocument();
  });

  it("disables Continue until a selection is made", () => {
    render(
      <SingleChoiceStep heading="h" options={options} selected={null} onSelect={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("enables Continue and calls onContinue once a selection exists", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(
      <SingleChoiceStep heading="h" options={options} selected="criminal" onSelect={vi.fn()} onBack={vi.fn()} onContinue={onContinue} />,
    );
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeEnabled();
    await user.click(continueButton);
    expect(onContinue).toHaveBeenCalled();
  });

  it("calls onBack when Back is clicked, and hides Back when onBack is omitted", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SingleChoiceStep heading="h" options={options} selected={null} onSelect={vi.fn()} onBack={onBack} onContinue={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();

    rerender(<SingleChoiceStep heading="h" options={options} selected={null} onSelect={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
  });
});

const multiOptions = [
  { value: "understand-case", label: "I want to understand my case." },
  { value: "research-issues", label: "I want to research possible legal issues." },
  { value: "other", label: "Something else." },
];

describe("MultiChoiceStep", () => {
  it("supports selecting multiple options", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiChoiceStep heading="h" options={multiOptions} selected={[]} onToggle={onToggle} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: multiOptions[0].label }));
    await user.click(screen.getByRole("button", { name: multiOptions[1].label }));
    expect(onToggle).toHaveBeenNthCalledWith(1, "understand-case");
    expect(onToggle).toHaveBeenNthCalledWith(2, "research-issues");
  });

  it("requires at least one selection before Continue is enabled", () => {
    render(
      <MultiChoiceStep heading="h" options={multiOptions} selected={[]} onToggle={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("shows selected state for multiple chosen options", () => {
    render(
      <MultiChoiceStep
        heading="h"
        options={multiOptions}
        selected={["understand-case", "research-issues"]}
        onToggle={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: multiOptions[0].label })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: multiOptions[1].label })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: multiOptions[2].label })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: multiOptions[0].label }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: multiOptions[2].label }).querySelector("svg")).not.toBeInTheDocument();
  });

  it("shows and requires the 'other' text field when an otherValue option is selected", async () => {
    const onOtherTextChange = vi.fn();
    const user = userEvent.setup();
    render(
      <MultiChoiceStep
        heading="h"
        options={multiOptions}
        selected={["other"]}
        otherValue="other"
        otherText=""
        onOtherTextChange={onOtherTextChange}
        onToggle={vi.fn()}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    const otherInput = screen.getByLabelText(/please describe/i);
    expect(otherInput).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    await user.type(otherInput, "x");
    expect(onOtherTextChange).toHaveBeenCalled();
  });
});
