import { describe, expect, it } from "vitest";
import { getInstitutionNavItems } from "@/lib/institution/institution-nav-items";

describe("getInstitutionNavItems", () => {
  it("includes Institution Settings", () => {
    const items = getInstitutionNavItems();
    expect(items.some((item) => item.label === "Institution Settings")).toBe(true);
  });

  it("includes User Management and Dashboard", () => {
    const items = getInstitutionNavItems();
    expect(items.some((item) => item.label === "User Management")).toBe(true);
    expect(items.some((item) => item.label === "Dashboard")).toBe(true);
  });

  it("never duplicates hrefs", () => {
    const items = getInstitutionNavItems();
    const hrefs = items.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
