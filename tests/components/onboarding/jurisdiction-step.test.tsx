// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JurisdictionStep } from "@/components/onboarding/jurisdiction-step";

describe("JurisdictionStep", () => {
  it("includes all 50 states, DC, Federal, and Not Sure", () => {
    render(<JurisdictionStep value="" onChange={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    const select = screen.getByLabelText(/state or court system/i);
    // 50 states + DC + Federal + Not Sure + the disabled "Select one" placeholder
    expect(select.querySelectorAll("option")).toHaveLength(54);
    expect(screen.getByRole("option", { name: "South Carolina" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Federal" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /not sure/i })).toBeInTheDocument();
  });

  it("calls onChange with the stable value code, not the label", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<JurisdictionStep value="" onChange={onChange} onBack={vi.fn()} onContinue={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText(/state or court system/i), "South Carolina");
    expect(onChange).toHaveBeenCalledWith("SC");
  });

  it("disables Continue until a jurisdiction is chosen", () => {
    render(<JurisdictionStep value="" onChange={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
  });

  it("enables Continue once a value is set", () => {
    render(<JurisdictionStep value="SC" onChange={vi.fn()} onBack={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });
});
