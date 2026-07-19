import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_INTAKE_MODEL",
  "INTAKE_MAX_AI_QUESTIONS",
  "CASE_SEARCH_PROVIDER",
  "COURTLISTENER_API_TOKEN",
  "CASE_SEARCH_RESULT_LIMIT",
] as const;
const originalValues: Record<string, string | undefined> = {};

async function freshEnvModule() {
  vi.resetModules();
  return import("@/lib/env");
}

beforeEach(() => {
  for (const key of ENV_KEYS) originalValues[key] = process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalValues[key] === undefined) delete process.env[key];
    else process.env[key] = originalValues[key];
  }
});

describe("getServerEnv", () => {
  it("defaults OPENAI_INTAKE_MODEL to gpt-5.6-luna when unset", async () => {
    delete process.env.OPENAI_INTAKE_MODEL;
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().OPENAI_INTAKE_MODEL).toBe("gpt-5.6-luna");
  });

  it("reads OPENAI_INTAKE_MODEL from the environment when set", async () => {
    process.env.OPENAI_INTAKE_MODEL = "some-other-model";
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().OPENAI_INTAKE_MODEL).toBe("some-other-model");
  });

  it("defaults INTAKE_MAX_AI_QUESTIONS to 12 when unset", async () => {
    delete process.env.INTAKE_MAX_AI_QUESTIONS;
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().INTAKE_MAX_AI_QUESTIONS).toBe(12);
  });

  it("coerces INTAKE_MAX_AI_QUESTIONS from a string env var to a number", async () => {
    process.env.INTAKE_MAX_AI_QUESTIONS = "8";
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().INTAKE_MAX_AI_QUESTIONS).toBe(8);
  });

  it("does not throw when OPENAI_API_KEY is unset — the app must still boot without it", async () => {
    delete process.env.OPENAI_API_KEY;
    const { getServerEnv } = await freshEnvModule();
    expect(() => getServerEnv()).not.toThrow();
    expect(getServerEnv().OPENAI_API_KEY).toBeUndefined();
  });
});

describe("requireOpenAIApiKey", () => {
  it("throws a clear, typed OpenAIConfigurationError when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { requireOpenAIApiKey, OpenAIConfigurationError } = await freshEnvModule();
    expect(() => requireOpenAIApiKey()).toThrow(OpenAIConfigurationError);
    expect(() => requireOpenAIApiKey()).toThrow(/OPENAI_API_KEY/);
  });

  it("never includes the key value itself in the thrown error message", async () => {
    process.env.OPENAI_API_KEY = "sk-should-never-appear-in-error-text";
    delete process.env.OPENAI_API_KEY;
    const { requireOpenAIApiKey } = await freshEnvModule();
    try {
      requireOpenAIApiKey();
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("sk-should-never-appear-in-error-text");
    }
  });

  it("returns the key when configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test-key-value";
    const { requireOpenAIApiKey } = await freshEnvModule();
    expect(requireOpenAIApiKey()).toBe("sk-test-key-value");
  });
});

describe("case search environment", () => {
  it("defaults CASE_SEARCH_PROVIDER to none when unset", async () => {
    delete process.env.CASE_SEARCH_PROVIDER;
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().CASE_SEARCH_PROVIDER).toBe("none");
  });

  it("rejects an unrecognized CASE_SEARCH_PROVIDER value", async () => {
    process.env.CASE_SEARCH_PROVIDER = "not-a-real-provider";
    const { getServerEnv } = await freshEnvModule();
    expect(() => getServerEnv()).toThrow();
  });

  it("defaults CASE_SEARCH_RESULT_LIMIT to 10 when unset", async () => {
    delete process.env.CASE_SEARCH_RESULT_LIMIT;
    const { getServerEnv } = await freshEnvModule();
    expect(getServerEnv().CASE_SEARCH_RESULT_LIMIT).toBe(10);
  });

  it("does not throw when COURTLISTENER_API_TOKEN is unset", async () => {
    delete process.env.COURTLISTENER_API_TOKEN;
    const { getServerEnv } = await freshEnvModule();
    expect(() => getServerEnv()).not.toThrow();
    expect(getServerEnv().COURTLISTENER_API_TOKEN).toBeUndefined();
  });
});
