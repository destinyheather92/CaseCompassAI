// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

let signedIn = false;

vi.mock("@clerk/nextjs", () => ({
  Show: ({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) =>
    (when === "signed-in") === signedIn ? children : null,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => <div data-testid="user-button" />,
}));

import { Navbar } from "@/components/site/navbar";

describe("Navbar authenticatedNav", () => {
  it("shows Get Started and Sign In for a signed-out visitor", () => {
    signedIn = false;
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("shows Dashboard and the resolved CTA for a signed-in user with nav state", () => {
    signedIn = true;
    render(<Navbar authenticatedNav={{ dashboardHref: "/dashboard", ctaLabel: "Continue Research", ctaHref: "/dashboard/roadmaps/r1" }} />);

    const dashboardLinks = screen.getAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    const ctaLinks = screen.getAllByRole("link", { name: /continue research/i });
    expect(ctaLinks[0]).toHaveAttribute("href", "/dashboard/roadmaps/r1");
  });

  it("falls back to just the account menu for a signed-in user when nav state is unavailable", () => {
    signedIn = true;
    render(<Navbar authenticatedNav={null} />);
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("user-button").length).toBeGreaterThan(0);
  });
});
