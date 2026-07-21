// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { CasesToResearch } from "@/components/roadmap/cases-to-research";
import type { RankedCaseResult } from "@/lib/case-search/pipeline/types";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const sampleCase = {
  providerName: "courtlistener" as const,
  providerCaseId: "1",
  clusterId: null,
  caseName: "Smith v. State",
  citation: null,
  citations: [],
  court: "sc",
  courtId: "sc",
  jurisdiction: "sc",
  decisionDate: null,
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
  sourceName: "CourtListener (Free Law Project)",
  originalCollection: null,
  publicationStatus: "published" as const,
  matchedTopics: ["habeas corpus"],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked" as const,
  verificationStatus: "verified" as const,
  verificationMethod: "search-match" as const,
  dateVerified: new Date().toISOString(),
  disclaimer: "x",
};

const notVerifiedCase = {
  ...sampleCase,
  providerCaseId: "2",
  caseName: "Doe v. Roe",
  jurisdiction: "ny",
  courtId: "ny",
  matchedTopics: ["due process"],
  verificationStatus: "not_verified" as const,
};

function rank(
  caseResult: VerifiedCaseResult,
  overrides: Partial<Pick<RankedCaseResult, "isPersuasiveAuthority" | "foundVia">> = {},
): RankedCaseResult {
  return {
    case: caseResult,
    confidence: { stars: 5, label: "Strong match", explanation: "Matches your research topics directly." },
    isPersuasiveAuthority: overrides.isPersuasiveAuthority ?? false,
    foundVia: overrides.foundVia ?? "primary-query",
  };
}

describe("CasesToResearch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("fetches on mount and renders the returned cases", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", cases: [rank(sampleCase)], succeededStage: "primary-query", attempts: [], isExhaustedFallback: false, suggestedResearchTerms: [] }),
    );
    render(<CasesToResearch roadmapId="r1" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/roadmaps/r1/cases");
      expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    });
  });

  it("shows the unavailable message when no provider is configured", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "unavailable", message: "Verified case search is not available yet. Your roadmap and educational resources are still available." }),
    );
    render(<CasesToResearch roadmapId="r1" />);

    expect(await screen.findByText(/not available yet/i)).toBeInTheDocument();
  });

  it("shows a safe error message on failure, never a raw error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    render(<CasesToResearch roadmapId="r1" />);

    expect(await screen.findByText(/legal source is temporarily unavailable/i)).toBeInTheDocument();
  });

  it("Find Additional Cases sends structured filters and replaces the list", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", cases: [], succeededStage: null, attempts: [], isExhaustedFallback: true, suggestedResearchTerms: [] }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /find additional cases/i }));
    const checkbox = screen.getByRole("checkbox", { name: /published only/i });
    await user.click(checkbox);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", cases: [rank(sampleCase)], succeededStage: "primary-query", attempts: [], isExhaustedFallback: false, suggestedResearchTerms: [] }),
    );
    await user.click(screen.getByRole("button", { name: /^search$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/roadmaps/r1/cases/search",
        expect.objectContaining({ method: "POST" }),
      );
      const lastCallBody = JSON.parse(vi.mocked(fetchMock).mock.calls[1][1].body as string);
      expect(lastCallBody.publishedOnly).toBe(true);
      expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    });
  });

  it("filters the visible list by verification status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        cases: [rank(sampleCase), rank(notVerifiedCase)],
        succeededStage: "primary-query",
        attempts: [],
        isExhaustedFallback: false,
        suggestedResearchTerms: [],
      }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    expect(screen.getByText("Doe v. Roe")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/verification status/i), "verified");

    expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    expect(screen.queryByText("Doe v. Roe")).not.toBeInTheDocument();
  });

  it("filters the visible list by authority type using the pipeline's own isPersuasiveAuthority flag", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        cases: [rank(sampleCase, { isPersuasiveAuthority: false }), rank(notVerifiedCase, { isPersuasiveAuthority: true, foundVia: "all-jurisdictions" })],
        succeededStage: "primary-query",
        attempts: [],
        isExhaustedFallback: false,
        suggestedResearchTerms: [],
      }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" jurisdiction="sc" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/authority type/i), "binding");

    expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    expect(screen.queryByText("Doe v. Roe")).not.toBeInTheDocument();
  });

  it("filters the visible list by roadmap topic", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        cases: [rank(sampleCase), rank(notVerifiedCase)],
        succeededStage: "primary-query",
        attempts: [],
        isExhaustedFallback: false,
        suggestedResearchTerms: [],
      }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/roadmap topic/i), "due process");

    expect(screen.queryByText("Smith v. State")).not.toBeInTheDocument();
    expect(screen.getByText("Doe v. Roe")).toBeInTheDocument();
  });

  it("shows a filtered-empty message (not the exhausted-search empty state) when filters exclude every result", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", cases: [rank(sampleCase)], succeededStage: "primary-query", attempts: [], isExhaustedFallback: false, suggestedResearchTerms: [] }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/verification status/i), "not_verified");

    expect(screen.getByText(/no cases match the selected filters/i)).toBeInTheDocument();
  });

  it("shows the exhausted-search empty state with suggested terms when the pipeline truly found nothing", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        cases: [],
        succeededStage: null,
        attempts: [{ stageName: "primary-query", label: "Searching South Carolina…", query: "due process", court: "sc", resultCount: 0, elapsedMs: 40, succeeded: false, errored: false }],
        isExhaustedFallback: true,
        suggestedResearchTerms: ["due process", "Miranda"],
      }),
    );
    render(<CasesToResearch roadmapId="r1" />);

    expect(await screen.findByText(/couldn't locate cases directly matching these facts/i)).toBeInTheDocument();
    expect(screen.getByText("due process")).toBeInTheDocument();
    expect(screen.getByText("Miranda")).toBeInTheDocument();
  });

  it("shows the real search-stage attempt log in the search-transparency panel", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        cases: [rank(sampleCase)],
        succeededStage: "all-jurisdictions",
        attempts: [
          { stageName: "primary-query", label: "Searching South Carolina…", query: "due process", court: "sc", resultCount: 0, elapsedMs: 40, succeeded: false, errored: false },
          { stageName: "all-jurisdictions", label: "Searching all jurisdictions…", query: "due process", court: null, resultCount: 1, elapsedMs: 55, succeeded: true, errored: false },
        ],
        isExhaustedFallback: false,
        suggestedResearchTerms: [],
      }),
    );
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    await user.click(screen.getByRole("button", { name: /show how we searched/i }));

    expect(screen.getByText(/searching south carolina… — 0 results/i)).toBeInTheDocument();
    expect(screen.getByText(/searching all jurisdictions… — 1 result \(55ms\) ✓/i)).toBeInTheDocument();
  });
});
