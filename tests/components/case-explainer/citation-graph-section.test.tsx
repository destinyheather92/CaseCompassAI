// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CitationGraphSection } from "@/components/case-explainer/citation-graph-section";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: async () => body } as Response);
}

const relatedCase = {
  case: {
    providerName: "courtlistener" as const,
    providerCaseId: "200",
    clusterId: null,
    caseName: "Later Case v. State",
    citation: null,
    citations: [],
    court: "sc",
    courtId: "sc",
    jurisdiction: "sc",
    decisionDate: "2020-01-01",
    docketNumber: null,
    sourceUrl: "https://www.courtlistener.com/opinion/200/later-case/",
    sourceName: "CourtListener (Free Law Project)",
    originalCollection: null,
    publicationStatus: "published" as const,
    matchedTopics: [],
    relevanceSummary: "x",
    laterHistoryStatus: "not-checked" as const,
    verificationStatus: "verified" as const,
    verificationMethod: "id-lookup" as const,
    dateVerified: new Date().toISOString(),
    disclaimer: "x",
  },
  treatment: "cited" as const,
  depth: 2,
};

describe("CitationGraphSection", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("fetches the citing endpoint for direction='citing' and renders results", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "ok", cases: [relatedCase] }));
    render(<CitationGraphSection caseId="100" direction="citing" />);

    expect(await screen.findByText("Later Case v. State")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/cases/100/citing");
    expect(screen.getByText("Later Cases Citing This Opinion")).toBeInTheDocument();
  });

  it("fetches the cited endpoint for direction='cited'", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "ok", cases: [relatedCase] }));
    render(<CitationGraphSection caseId="100" direction="cited" />);

    await screen.findByText("Later Case v. State");
    expect(fetchMock).toHaveBeenCalledWith("/api/cases/100/cited");
    expect(screen.getByText("Cases Cited By This Opinion")).toBeInTheDocument();
  });

  it("never renders a treatment other than 'Cited'", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "ok", cases: [relatedCase] }));
    render(<CitationGraphSection caseId="100" direction="citing" />);
    await screen.findByText("Later Case v. State");
    expect(screen.getByText("Cited")).toBeInTheDocument();
    expect(screen.queryByText(/followed|distinguished|overruled|questioned|limited/i)).not.toBeInTheDocument();
  });

  it("renders nothing when the endpoint is unavailable", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "unavailable" }));
    const { container } = render(<CitationGraphSection caseId="100" direction="citing" />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.textContent).toBe("");
  });

  it("renders nothing when there are no related cases", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "ok", cases: [] }));
    const { container } = render(<CitationGraphSection caseId="100" direction="citing" />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(container.textContent).toBe("");
  });

  it("shows how many times the citing opinion references the cited opinion", async () => {
    fetchMock.mockReturnValueOnce(jsonResponse({ status: "ok", cases: [relatedCase] }));
    render(<CitationGraphSection caseId="100" direction="citing" />);
    expect(await screen.findByText(/cited 2 times/i)).toBeInTheDocument();
  });
});
