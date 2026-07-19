// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/saved",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));

import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";

const navContext = { latestIntakeId: null, latestRoadmapId: null };

describe("DashboardMobileNav", () => {
  it("is closed by default and opens the panel on click", async () => {
    const user = userEvent.setup();
    render(<DashboardMobileNav navContext={navContext} postLogoutRedirect="/" />);

    const toggle = screen.getByRole("button", { name: /open dashboard menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /^dashboard$/i })).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByRole("button", { name: /close dashboard menu/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toBeInTheDocument();
  });

  it("marks the current route as the active link", async () => {
    const user = userEvent.setup();
    render(<DashboardMobileNav navContext={navContext} postLogoutRedirect="/" />);
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    expect(screen.getByRole("link", { name: /^saved$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^dashboard$/i })).not.toHaveAttribute("aria-current");
  });

  it("closes the panel after clicking a nav link", async () => {
    const user = userEvent.setup();
    render(<DashboardMobileNav navContext={navContext} postLogoutRedirect="/" />);
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    await user.click(screen.getByRole("link", { name: /^dashboard$/i }));
    expect(screen.getByRole("button", { name: /open dashboard menu/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("renders a Log Out control alongside Clear My Session", async () => {
    const user = userEvent.setup();
    render(<DashboardMobileNav navContext={navContext} postLogoutRedirect="/" />);
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    expect(screen.getByRole("button", { name: /^log out$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear my session/i })).toBeInTheDocument();
  });
});
