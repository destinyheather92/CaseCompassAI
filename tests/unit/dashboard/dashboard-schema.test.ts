import { describe, expect, it } from "vitest";
import { SavedItemsQuerySchema, ActivityQuerySchema } from "@/lib/dashboard/dashboard-schema";

describe("SavedItemsQuerySchema", () => {
  it("accepts an omitted resourceType", () => {
    const result = SavedItemsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid resourceType", () => {
    const result = SavedItemsQuerySchema.safeParse({ resourceType: "LEGAL_TERM" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid resourceType", () => {
    const result = SavedItemsQuerySchema.safeParse({ resourceType: "NOT_A_REAL_TYPE" });
    expect(result.success).toBe(false);
  });
});

describe("ActivityQuerySchema", () => {
  it("defaults limit to 20 when omitted", () => {
    const result = ActivityQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("caps limit at 50 even if a caller requests more", () => {
    const result = ActivityQuerySchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive limit", () => {
    const result = ActivityQuerySchema.safeParse({ limit: "0" });
    expect(result.success).toBe(false);
  });

  it("coerces a numeric string limit", () => {
    const result = ActivityQuerySchema.parse({ limit: "5" });
    expect(result.limit).toBe(5);
  });
});
