// @vitest-environment jsdom
import { describe, expect, it, beforeAll, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ChoosePath } from "@/components/site/choose-path";

describe("ChoosePath", () => {
  beforeAll(() => {
    // framer-motion's whileInView needs IntersectionObserver, which jsdom
    // doesn't implement — a no-op stub is enough for these tests, which
    // only assert static content/links, not scroll-triggered animation.
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
  });

  it("presents both the individual and institution paths with distinct Get Started links", () => {
    render(<ChoosePath />);

    expect(screen.getByText("Individual User")).toBeInTheDocument();
    expect(screen.getByText("Correctional Facility / Institution")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /get started/i });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/get-started");
    expect(links[1]).toHaveAttribute("href", "/institution/register");
  });

  it("describes each path's purpose", () => {
    render(<ChoosePath />);
    expect(screen.getByText(/research your own case/i)).toBeInTheDocument();
    expect(screen.getByText(/manage incarcerated users/i)).toBeInTheDocument();
  });

  it("routes the individual card's CTA to a different destination than the institution card's", () => {
    render(<ChoosePath />);
    const [individualCard, institutionCard] = screen.getAllByRole("heading", { level: 3 }).map((h) => h.closest("div"));
    expect(within(individualCard!).getByRole("link")).toHaveAttribute("href", "/get-started");
    expect(within(institutionCard!).getByRole("link")).toHaveAttribute("href", "/institution/register");
  });
});
