import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { APIConnectionTimeoutError } from "openai";
import { OpenAIIntakeInterviewer } from "@/lib/ai/providers/openai-intake-interviewer";
import type { IntakeInterviewContext } from "@/types/intake-interview";

const context: IntakeInterviewContext = {
  caseType: "criminal",
  jurisdiction: "SC",
  proceduralStage: "post-conviction",
  researchGoals: ["understand-case"],
  documentTypes: ["court-opinion"],
  factualSummary: "",
  unresolvedInformation: [],
  topicsCovered: [],
  priorTurns: [],
  questionCount: 0,
  maxQuestions: 12,
};

const validQuestionResponse = {
  status: "needs-more-information" as const,
  question: {
    id: "q1",
    text: "What court handled your case?",
    purpose: "Establish jurisdiction.",
    answerType: "short-text" as const,
    choices: null,
    required: true,
    sensitiveInformationWarning: null,
  },
  collectedFactsSummary: "The user has a pending criminal case.",
  unresolvedInformation: [],
  topicsCovered: ["case-type"],
  completionReason: null,
  safetyFlags: ["none" as const],
};

function fakeClient(overrides: Partial<{ parse: ReturnType<typeof vi.fn> }> = {}) {
  return {
    responses: {
      parse: overrides.parse ?? vi.fn(),
    },
  } as unknown as OpenAI;
}

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("OpenAIIntakeInterviewer", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test-fake-key";
  });

  it("returns not-configured when no key is set and no client was injected", async () => {
    delete process.env.OPENAI_API_KEY;
    const interviewer = new OpenAIIntakeInterviewer();
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("not-configured");
  });

  it("returns ok with the parsed response on success", async () => {
    const parse = vi.fn().mockResolvedValue({ error: null, output_parsed: validQuestionResponse });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result).toEqual({ status: "ok", response: validQuestionResponse });
  });

  it("calls responses.parse with the configured model, system+user messages, and a zodTextFormat schema", async () => {
    const parse = vi.fn().mockResolvedValue({ error: null, output_parsed: validQuestionResponse });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    await interviewer.getNextStep(context);

    expect(parse).toHaveBeenCalledTimes(1);
    const [body, options] = parse.mock.calls[0];
    expect(body.model).toBe("gpt-5.6-luna");
    expect(body.input).toHaveLength(2);
    expect(body.input[0]).toMatchObject({ role: "system" });
    expect(body.input[1]).toMatchObject({ role: "user" });
    expect(body.input[1].content).toContain("criminal");
    expect(body.text.format.name).toBe("casecompass_intake_interview");
    expect(options?.timeout).toBeGreaterThan(0);
  });

  it("returns invalid-output when output_parsed is null (refusal or unparseable output)", async () => {
    const parse = vi.fn().mockResolvedValue({ error: null, output_parsed: null });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("invalid-output");
  });

  it("returns invalid-output when output_parsed fails re-validation against the schema (defense in depth)", async () => {
    const parse = vi.fn().mockResolvedValue({ error: null, output_parsed: { status: "not-a-real-status" } });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("invalid-output");
  });

  it("returns provider-error when the response carries a provider-reported error", async () => {
    const parse = vi.fn().mockResolvedValue({ error: { message: "something went wrong" }, output_parsed: null });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("provider-error");
  });

  it("never leaks a raw provider error message verbatim to the caller", async () => {
    const parse = vi.fn().mockResolvedValue({
      error: { message: "internal trace: db=prod-secret-shard-7 key=sk-abcdef" },
      output_parsed: null,
    });
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(JSON.stringify(result)).not.toContain("sk-abcdef");
    expect(JSON.stringify(result)).not.toContain("prod-secret-shard-7");
  });

  it("returns timeout when the request times out", async () => {
    const parse = vi.fn().mockRejectedValue(
      new APIConnectionTimeoutError({ message: "Request timed out." }),
    );
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("timeout");
  });

  it("returns provider-error for any other thrown error, without crashing the caller", async () => {
    const parse = vi.fn().mockRejectedValue(new Error("network exploded"));
    const interviewer = new OpenAIIntakeInterviewer(fakeClient({ parse }));
    const result = await interviewer.getNextStep(context);
    expect(result.status).toBe("provider-error");
  });
});
