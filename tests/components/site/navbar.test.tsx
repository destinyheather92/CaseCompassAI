// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let signedIn = false;

vi.mock("@clerk/nextjs", () => ({
  Show: ({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) =>
    (when === "signed-in") === signedIn ? children : null,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
  UserButton: () => <div data-testid="user-button" />,
  useAuth: () => ({ isLoaded: true, isSignedIn: signedIn }),
}));

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: refreshMock }),
}));

import { Navbar } from "@/components/site/navbar";

describe("Navbar authenticatedNav", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  it("shows Get Started and Sign In for a signed-out visitor", () => {
    signedIn = false;
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("gives a signed-out visitor a direct link to institution registration, without needing to scroll or type the URL", () => {
    signedIn = false;
    render(<Navbar />);
    const links = screen.getAllByRole("link", { name: /register your facility/i });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute("href", "/institution/register");
  });

  it("does not show the facility registration link to a signed-in user", () => {
    signedIn = true;
    render(<Navbar authenticatedNav={null} />);
    expect(screen.queryByRole("link", { name: /register your facility/i })).not.toBeInTheDocument();
  });

  it("shows Dashboard and the resolved CTA for a signed-in user with nav state", () => {
    signedIn = true;
    render(<Navbar authenticatedNav={{ dashboardHref: "/dashboard", ctaLabel: "Continue Research", ctaHref: "/dashboard/roadmaps/r1" }} />);

    const dashboardLinks = screen.getAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    const ctaLinks = screen.getAllByRole("link", { name: /continue research/i });
    expect(ctaLinks[0]).toHaveAttribute("href", "/dashboard/roadmaps/r1");
  });

  it("still shows a working Dashboard link for a signed-in user even when nav state is unavailable", () => {
    signedIn = true;
    render(<Navbar authenticatedNav={null} />);
    const dashboardLinks = screen.getAllByRole("link", { name: /^dashboard$/i });
    expect(dashboardLinks.length).toBeGreaterThan(0);
    expect(dashboardLinks[0]).toHaveAttribute("href", "/dashboard");
    expect(screen.getAllByTestId("user-button").length).toBeGreaterThan(0);
  });

  it("refreshes the page once when Clerk's client auth state flips to signed-in (e.g. after a modal sign-in), so the real Dashboard/CTA links replace the stale server-rendered state", async () => {
    signedIn = false;
    const { rerender } = render(<Navbar authenticatedNav={null} />);
    expect(refreshMock).not.toHaveBeenCalled();

    signedIn = true;
    rerender(<Navbar authenticatedNav={null} />);

    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1);
    });
  });
});
