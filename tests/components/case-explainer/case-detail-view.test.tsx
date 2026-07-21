// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { CaseDetailView } from "@/components/case-explainer/case-detail-view";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const sampleCase = {
  providerName: "courtlistener" as const,
  providerCaseId: "1",
  clusterId: null,
  caseName: "Smith v. State",
  citation: "123 S.E.2d 456",
  citations: ["123 S.E.2d 456"],
  court: "sc",
  courtId: "sc",
  jurisdiction: "sc",
  decisionDate: "2019-05-01",
  docketNumber: null,
  sourceUrl: "https://www.courtlistener.com/opinion/1/smith-v-state/",
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
};

const sampleExplanation = {
  caseSummary: "A brief summary of the case.",
  keyFacts: ["Officer approached a vehicle."],
  legalIssues: ["Was the search lawful?"],
  holding: "The search was lawful.",
  courtsReasoning: "Because of the plain-view exception.",
  ruleOfLaw: "Officers may seize items in plain view during a lawful stop.",
  whyThisCaseMatters: "It clarifies the plain-view exception.",
  howItMightRelate: "May be relevant background for a similar situation.",
  importantQuotes: [
    {
      quote: "officers may seize evidence in plain view",
      whyItMatters: "States the core rule.",
      location: { characterOffset: 20, paragraphNumber: 1 },
    },
  ],
  keyTerms: [{ term: "plain view", definition: "A doctrine allowing seizure of visible evidence." }],
  basedOnFullOpinionText: true,
};

const opinionText = "The Court held that officers may seize evidence in plain view during a lawful stop.";

describe("CaseDetailView", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // Citation-graph fetches (citing/cited) always fire alongside the
    // main explain fetch — default them to "unavailable" so they render
    // nothing, and let each test's explicit mockResolvedValueOnce for
    // the explain endpoint take priority as the first queued call.
    fetchMock.mockResolvedValue(jsonResponse({ status: "unavailable" }));
  });

  it("shows a loading state, then the plain-English explanation by default", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    render(<CaseDetailView caseId="1" />);

    expect(screen.getByText(/loading this case/i)).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Smith v. State" })).toBeInTheDocument();
    expect(screen.getByText("A brief summary of the case.")).toBeInTheDocument();
    expect(screen.getByText("The search was lawful.")).toBeInTheDocument();
    expect(screen.getByText(/officers may seize evidence in plain view/i)).toBeInTheDocument();
  });

  it("toggles to the original opinion view and highlights the quoted passage", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    const user = userEvent.setup();
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    await user.click(screen.getByRole("button", { name: /original opinion/i }));

    expect(screen.getByText(/the court held that/i)).toBeInTheDocument();
    const mark = document.querySelector("mark");
    expect(mark?.textContent?.toLowerCase()).toContain("officers may seize evidence in plain view");
  });

  it("shows a not-found state when the case doesn't exist", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "not-found" }, 404));
    render(<CaseDetailView caseId="does-not-exist" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn.t be found/i);
  });

  it("still shows the case header and original opinion when only the AI explanation is unavailable", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "explanation-unavailable",
        caseResult: sampleCase,
        opinionText,
        message: "CaseCompass could not prepare a plain-language explanation for this case right now.",
      }),
    );
    render(<CaseDetailView caseId="1" />);

    expect(await screen.findByRole("heading", { name: "Smith v. State" })).toBeInTheDocument();
    expect(screen.getByText(/could not prepare a plain-language explanation/i)).toBeInTheDocument();
    // Defaults to the original opinion view since there's no plain-English summary to show.
    expect(screen.getByText(/the court held that/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /plain-language guide/i })).toBeDisabled();
  });

  it("shows an honest 'not available' message in the original view when no opinion text exists", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "ok",
        caseResult: sampleCase,
        explanation: { ...sampleExplanation, importantQuotes: [], basedOnFullOpinionText: false },
        opinionText: null,
      }),
    );
    const user = userEvent.setup();
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    expect(screen.getByText(/full opinion text wasn.t available/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /original opinion/i }));
    expect(screen.getByText(/full opinion text isn.t available/i)).toBeInTheDocument();
  });

  it("saves the case via the save button", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    const user = userEvent.setup();
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "saved", id: "sc1" }, 201));
    await user.click(screen.getByRole("button", { name: /save case/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^saved$/i })).toBeDisabled();
    });
  });

  it("shows the AI-generated explanation label and disclaimer on the plain-language view", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    expect(screen.getByText(/ai-generated from the source opinion/i)).toBeInTheDocument();
    expect(screen.getByText(/not part of the court's opinion and is not legal advice/i)).toBeInTheDocument();
  });

  it("labels each quote as a quotation from the opinion and shows its paragraph location", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    expect(screen.getByText(/quotation from the opinion/i)).toBeInTheDocument();
    expect(screen.getByText(/paragraph 1 of the original opinion/i)).toBeInTheDocument();
  });

  it("shows the source attribution panel with verification status", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ status: "ok", caseResult: sampleCase, explanation: sampleExplanation, opinionText }),
    );
    render(<CaseDetailView caseId="1" />);

    await screen.findByRole("heading", { name: "Smith v. State" });
    expect(screen.getByRole("link", { name: /view source opinion/i })).toHaveAttribute("href", sampleCase.sourceUrl);
  });
});
