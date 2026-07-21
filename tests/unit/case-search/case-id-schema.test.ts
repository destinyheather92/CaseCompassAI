import { describe, expect, it } from "vitest";
import { isValidProviderCaseId, providerCaseIdSchema, citationTextSchema } from "@/lib/case-search/case-id-schema";

describe("providerCaseIdSchema / isValidProviderCaseId", () => {
  it("accepts a plain numeric id", () => {
    expect(isValidProviderCaseId("123456")).toBe(true);
  });

  it("accepts an alphanumeric id with hyphens/underscores", () => {
    expect(isValidProviderCaseId("abc_123-XYZ")).toBe(true);
  });

  it("rejects a value containing a path segment (SSRF/path-injection defense)", () => {
    expect(isValidProviderCaseId("123/../../admin")).toBe(false);
  });

  it("rejects a value containing a full URL", () => {
    expect(isValidProviderCaseId("https://evil.example.com")).toBe(false);
  });

  it("rejects a value containing a query string", () => {
    expect(isValidProviderCaseId("123?admin=true")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidProviderCaseId("")).toBe(false);
  });

  it("rejects a value over 64 characters", () => {
    expect(isValidProviderCaseId("a".repeat(65))).toBe(false);
  });

  it("rejects whitespace", () => {
    expect(isValidProviderCaseId("123 456")).toBe(false);
  });

  it("exposes the schema directly for use in Zod object shapes", () => {
    expect(providerCaseIdSchema.safeParse("123").success).toBe(true);
  });
});

describe("citationTextSchema", () => {
  it("accepts a real reporter citation", () => {
    expect(citationTextSchema.safeParse("466 U.S. 668").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(citationTextSchema.safeParse("").success).toBe(false);
  });

  it("rejects a citation that is too short to be meaningful", () => {
    expect(citationTextSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects HTML/script-shaped input", () => {
    expect(citationTextSchema.safeParse("<script>alert(1)</script>").success).toBe(false);
  });

  it("rejects an excessively long input", () => {
    expect(citationTextSchema.safeParse("1 U.S. 1 ".repeat(50)).success).toBe(false);
  });
});
