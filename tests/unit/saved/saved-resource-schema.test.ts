import { describe, expect, it } from "vitest";
import { saveResourceSchema } from "@/lib/saved/saved-resource-schema";

describe("saveResourceSchema", () => {
  it("accepts a minimal valid RESOURCE save", () => {
    const result = saveResourceSchema.safeParse({
      resourceType: "RESOURCE",
      resourceKey: "legal-research-basics",
      title: "Legal Research Basics",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a relative internal href", () => {
    const result = saveResourceSchema.safeParse({
      resourceType: "RESOURCE",
      resourceKey: "legal-research-basics",
      title: "Legal Research Basics",
      href: "/resources/legal-research-basics",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a verified https external href", () => {
    const result = saveResourceSchema.safeParse({
      resourceType: "SOURCE",
      resourceKey: "official-court-site",
      title: "Official Court Site",
      href: "https://www.sccourts.org/",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a javascript: URI href", () => {
    const result = saveResourceSchema.safeParse({
      resourceType: "RESOURCE",
      resourceKey: "x",
      title: "x",
      href: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a plain http (non-https) external href", () => {
    const result = saveResourceSchema.safeParse({
      resourceType: "SOURCE",
      resourceKey: "x",
      title: "x",
      href: "http://example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid resourceType", () => {
    const result = saveResourceSchema.safeParse({ resourceType: "NOT_REAL", resourceKey: "x", title: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const result = saveResourceSchema.safeParse({ resourceType: "RESOURCE", resourceKey: "x", title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty resourceKey", () => {
    const result = saveResourceSchema.safeParse({ resourceType: "RESOURCE", resourceKey: "", title: "x" });
    expect(result.success).toBe(false);
  });
});
