// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { CasesToResearch } from "@/components/roadmap/cases-to-research";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const sampleCase = {
  providerName: "courtlistener",
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

describe("CasesToResearch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("fetches on mount and renders the returned cases", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase], nextCursor: null } }));
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
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [], nextCursor: null } }));
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: /find additional cases/i }));
    const checkbox = screen.getByRole("checkbox", { name: /published only/i });
    await user.click(checkbox);

    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase], nextCursor: null } }));
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
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase, notVerifiedCase], nextCursor: null } }));
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    expect(screen.getByText("Doe v. Roe")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/verification status/i), "verified");

    expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    expect(screen.queryByText("Doe v. Roe")).not.toBeInTheDocument();
  });

  it("filters the visible list by authority type when a jurisdiction is provided", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase, notVerifiedCase], nextCursor: null } }));
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" jurisdiction="sc" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/authority type/i), "binding");

    expect(screen.getByText("Smith v. State")).toBeInTheDocument();
    expect(screen.queryByText("Doe v. Roe")).not.toBeInTheDocument();
  });

  it("filters the visible list by roadmap topic", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase, notVerifiedCase], nextCursor: null } }));
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/roadmap topic/i), "due process");

    expect(screen.queryByText("Smith v. State")).not.toBeInTheDocument();
    expect(screen.getByText("Doe v. Roe")).toBeInTheDocument();
  });

  it("shows the no-cases-found message when filters exclude every result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok", page: { cases: [sampleCase], nextCursor: null } }));
    const user = userEvent.setup();
    render(<CasesToResearch roadmapId="r1" />);

    await screen.findByText("Smith v. State");
    await user.selectOptions(screen.getByLabelText(/verification status/i), "not_verified");

    expect(screen.getByText(/no verified cases were found/i)).toBeInTheDocument();
  });
});
