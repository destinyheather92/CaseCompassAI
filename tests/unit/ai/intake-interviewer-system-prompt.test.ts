import { describe, expect, it } from "vitest";
import { INTAKE_INTERVIEWER_SYSTEM_PROMPT } from "@/lib/ai/prompts/intake-interviewer-system";

describe("INTAKE_INTERVIEWER_SYSTEM_PROMPT", () => {
  const prompt = INTAKE_INTERVIEWER_SYSTEM_PROMPT.toLowerCase();

  it.each([
    "not answer legal questions",
    "not give legal advice",
    "not predict outcomes",
    "not invent or cite",
    "not calculate deadlines",
    "one clear question at a time",
    "do not ask for facts already provided",
    "plain language",
    "sixth",
  ])("includes the required directive: %s", (fragment) => {
    expect(prompt).toContain(fragment);
  });

  it("instructs the model not to request or use chain-of-thought / step-by-step reasoning", () => {
    expect(prompt).not.toContain("think step by step");
    expect(prompt).not.toContain("chain-of-thought");
    expect(prompt).not.toContain("chain of thought");
  });

  it("instructs the model to continue fact-gathering rather than answer when the user asks for legal advice", () => {
    expect(prompt).toContain("if the user asks for legal advice");
  });

  it("instructs the model to record but not calculate a reported urgent deadline", () => {
    expect(prompt).toContain("possible deadline");
  });

  it("instructs the model to record case/docket/filing numbers verbatim and clarifies they are not sensitive PII", () => {
    expect(prompt).toContain("case numbers, docket numbers, and filing numbers are public court-record identifiers");
    expect(prompt).toContain("copy it into collectedfactssummary verbatim");
  });

  it("instructs the model to use answerType \"date\" for date-eliciting questions", () => {
    expect(prompt).toContain('set that question\'s answertype to "date"');
  });

  it("instructs the model to recompute collectedFactsSummary and unresolvedInformation from the full transcript every turn", () => {
    expect(prompt).toContain("rebuild collectedfactssummary and unresolvedinformation from the complete prior interview transcript");
    expect(prompt).toContain("remove from unresolvedinformation anything a prior answer already resolved");
  });

  it("is a non-empty static string (not accidentally emptied)", () => {
    expect(INTAKE_INTERVIEWER_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });
});
