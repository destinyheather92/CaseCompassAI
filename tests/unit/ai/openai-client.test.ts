import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

describe("getOpenAIClient", () => {
  it("throws OpenAIConfigurationError instead of crashing when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");
    const { OpenAIConfigurationError } = await import("@/lib/env");
    expect(() => getOpenAIClient()).toThrow(OpenAIConfigurationError);
  });

  it("does not throw at module import time even when the key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(import("@/lib/ai/openai-client")).resolves.toBeDefined();
  });

  it("returns a usable client (with a .responses resource) when the key is configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test-fake-key";
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");
    const client = getOpenAIClient();
    expect(client.responses).toBeDefined();
    expect(typeof client.responses.parse).toBe("function");
  });

  it("caches and returns the same client instance across calls", async () => {
    process.env.OPENAI_API_KEY = "sk-test-fake-key";
    const { getOpenAIClient } = await import("@/lib/ai/openai-client");
    expect(getOpenAIClient()).toBe(getOpenAIClient());
  });
});
