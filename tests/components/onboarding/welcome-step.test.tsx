// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeStep } from "@/components/onboarding/welcome-step";

describe("WelcomeStep", () => {
  it("renders the required heading and educational disclaimer", () => {
    render(<WelcomeStep hasSavedProgress={false} onStart={vi.fn()} onResume={vi.fn()} onStartOver={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /build your legal research roadmap/i })).toBeInTheDocument();
    expect(screen.getByText(/educational legal research guidance, not legal advice/i)).toBeInTheDocument();
  });

  it("shows a single Start button when there is no saved progress", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeStep hasSavedProgress={false} onStart={onStart} onResume={vi.fn()} onStartOver={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /continue where i left off/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^(get started|start|begin)/i }));
    expect(onStart).toHaveBeenCalled();
  });

  it("offers Continue where I left off and Start over when saved progress exists, without silently discarding it", async () => {
    const onResume = vi.fn();
    const onStartOver = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeStep hasSavedProgress={true} onStart={vi.fn()} onResume={onResume} onStartOver={onStartOver} />);

    await user.click(screen.getByRole("button", { name: /continue where i left off/i }));
    expect(onResume).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /start over/i }));
    expect(onStartOver).toHaveBeenCalled();
  });
});
