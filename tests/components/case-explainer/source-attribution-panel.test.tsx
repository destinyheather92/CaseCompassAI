// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SourceAttributionPanel } from "@/components/case-explainer/source-attribution-panel";
import type { VerifiedCaseResult } from "@/lib/case-search/types";

const baseCase: VerifiedCaseResult = {
  providerName: "courtlistener",
  providerCaseId: "12345",
  clusterId: null,
  caseName: "Strickland v. Washington",
  citation: "466 U.S. 668",
  citations: ["466 U.S. 668"],
  court: "Supreme Court of the United States",
  courtId: "scotus",
  jurisdiction: "scotus",
  decisionDate: "1984-05-14",
  docketNumber: "82-1554",
  sourceUrl: "https://www.courtlistener.com/opinion/12345/strickland-v-washington/",
  sourceName: "CourtListener (Free Law Project)",
  originalCollection: null,
  publicationStatus: "published",
  matchedTopics: [],
  relevanceSummary: "x",
  laterHistoryStatus: "not-checked",
  verificationStatus: "verified",
  verificationMethod: "citation-lookup",
  dateVerified: "2026-07-21T12:00:00.000Z",
  disclaimer: "x",
};

describe("SourceAttributionPanel", () => {
  it("displays the required fields per the source attribution spec", () => {
    render(<SourceAttributionPanel caseResult={baseCase} />);

    expect(screen.getByText(/free law project/i)).toBeInTheDocument();
    expect(screen.getByText("Strickland v. Washington")).toBeInTheDocument();
    expect(screen.getByText("466 U.S. 668")).toBeInTheDocument();
    expect(screen.getByText("Supreme Court of the United States")).toBeInTheDocument();
    expect(screen.getByText("1984-05-14")).toBeInTheDocument();
    expect(screen.getByText("82-1554")).toBeInTheDocument();
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view source opinion/i })).toHaveAttribute("href", baseCase.sourceUrl);
  });

  it("never labels CourtListener as the court itself — the court is a distinct field naming the actual issuing court", () => {
    render(<SourceAttributionPanel caseResult={baseCase} />);
    const sourceValue = screen.getByText(/free law project/i);
    expect(sourceValue.textContent).not.toContain("Supreme Court");
  });

  it("shows the verification method alongside the status", () => {
    render(<SourceAttributionPanel caseResult={baseCase} />);
    expect(screen.getByText(/verified.*citation lookup/i)).toBeInTheDocument();
  });

  it("shows the Caselaw Access Project notice only when the metadata identifies it as the original collection", () => {
    const { rerender } = render(<SourceAttributionPanel caseResult={baseCase} />);
    expect(screen.queryByText(/caselaw access project/i)).not.toBeInTheDocument();

    rerender(<SourceAttributionPanel caseResult={{ ...baseCase, originalCollection: "caselaw-access-project" }} />);
    expect(screen.getByText(/caselaw access project/i)).toBeInTheDocument();
  });

  it("omits optional fields (citation, docket number, decision date) when not available, without crashing", () => {
    render(
      <SourceAttributionPanel
        caseResult={{ ...baseCase, citation: null, docketNumber: null, decisionDate: null }}
      />,
    );
    expect(screen.queryByText("466 U.S. 668")).not.toBeInTheDocument();
    expect(screen.queryByText("82-1554")).not.toBeInTheDocument();
  });

  it("shows the retrieved date and time", () => {
    render(<SourceAttributionPanel caseResult={baseCase} />);
    expect(screen.getByText("Retrieved")).toBeInTheDocument();
  });
});
