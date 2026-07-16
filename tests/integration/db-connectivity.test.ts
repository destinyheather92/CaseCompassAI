import { describe, expect, it, afterAll } from "vitest";
import { prisma } from "@/lib/db";

describe("database connectivity", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects to Postgres and can round-trip a row", async () => {
    const code = `test-conn-${Date.now()}`;
    const institution = await prisma.institution.create({
      data: { name: "Connectivity Test Institution", code },
    });

    expect(institution.id).toBeTruthy();
    expect(institution.code).toBe(code);

    const found = await prisma.institution.findUnique({ where: { id: institution.id } });
    expect(found?.name).toBe("Connectivity Test Institution");

    await prisma.institution.delete({ where: { id: institution.id } });
  });
});
