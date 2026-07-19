// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { PreferencesForm } from "@/components/dashboard/preferences-form";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("PreferencesForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ status: "updated", preferences: {} }));
  });

  it("renders the current preferences", () => {
    render(<PreferencesForm initialPreferences={{ reducedMotion: true, textSize: "large" }} />);
    expect(screen.getByRole("checkbox", { name: /reduced motion/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /large text/i })).toBeChecked();
  });

  it("PATCHes reducedMotion when toggled and announces the save", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initialPreferences={{}} />);

    await user.click(screen.getByRole("checkbox", { name: /reduced motion/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/preferences",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ reducedMotion: true }) }),
      );
    });
    expect(await screen.findByText(/preferences saved/i)).toBeInTheDocument();
  });

  it("PATCHes textSize when changed", async () => {
    const user = userEvent.setup();
    render(<PreferencesForm initialPreferences={{}} />);

    await user.click(screen.getByRole("radio", { name: /large text/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/dashboard/preferences",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ textSize: "large" }) }),
      );
    });
  });
});
