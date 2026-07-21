import { describe, expect, it } from "vitest";
import { CASE_EXPLAINER_SYSTEM_PROMPT } from "@/lib/ai/prompts/case-explainer-system";

describe("CASE_EXPLAINER_SYSTEM_PROMPT", () => {
  const prompt = CASE_EXPLAINER_SYSTEM_PROMPT.toLowerCase();

  it.each([
    "you do not give legal advice",
    "verbatim",
    "importantquotes must be an empty array",
    "basedonfullopiniontext",
    "plain language",
    "sixth",
    "never invent",
  ])("includes the required directive: %s", (fragment) => {
    expect(prompt).toContain(fragment);
  });

  it("instructs the model to stay cautious in howItMightRelate", () => {
    expect(prompt).toContain("never that it proves, guarantees, predicts, or definitely applies");
  });

  it("is a non-empty static string", () => {
    expect(CASE_EXPLAINER_SYSTEM_PROMPT.length).toBeGreaterThan(300);
  });
});
