// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { CaseResultCard } from "@/components/roadmap/case-result-card";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const sampleCase = {
  providerName: "courtlistener",
  providerCaseId: "1",
  caseName: "Smith v. State",
  citation: "123 S.E.2d 456",
  court: "sc",
  jurisdiction: "sc",
  decisionDate: "2019-05-01",
  docketNumber: "2018-CP-01-001",
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  publicationStatus: "published" as const,
  matchedTopics: ["habeas corpus"],
  relevanceSummary: "This case may be useful to review because it discusses a topic identified in your roadmap: habeas corpus.",
  laterHistoryStatus: "not-checked" as const,
  verificationStatus: "verified" as const,
  dateVerified: new Date().toISOString(),
  disclaimer: "This case is provided for educational research purposes only.",
};

describe("CaseResultCard", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders the verified case fields, source link, and later-history notice", () => {
    render(<CaseResultCard caseResult={sampleCase} roadmapId="r1" />);
    expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on courtlistener/i })).toHaveAttribute("href", sampleCase.sourceUrl);
    expect(screen.getByText(/has not confirmed whether this decision/i)).toBeInTheDocument();
    expect(screen.getByText(sampleCase.disclaimer)).toBeInTheDocument();
  });

  it("saves the case and disables the button once saved", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "saved", id: "sc1" }, 201));
    const user = userEvent.setup();
    render(<CaseResultCard caseResult={sampleCase} roadmapId="r1" />);

    await user.click(screen.getByRole("button", { name: /save case/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/saved-cases",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"providerCaseId":"1"'),
        }),
      );
      expect(screen.getByRole("button", { name: /^saved$/i })).toBeDisabled();
    });
  });

  it("shows an error and keeps the button enabled when saving fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "invalid-request", message: "x" }, 400));
    const user = userEvent.setup();
    render(<CaseResultCard caseResult={sampleCase} roadmapId="r1" />);

    await user.click(screen.getByRole("button", { name: /save case/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not save this case/i);
    expect(screen.getByRole("button", { name: /save case/i })).not.toBeDisabled();
  });
});
