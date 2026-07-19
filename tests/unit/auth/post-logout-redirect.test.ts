import { describe, expect, it } from "vitest";
import { postLogoutRedirectFor } from "@/lib/auth/post-logout-redirect";

describe("postLogoutRedirectFor", () => {
  it("sends individual users to the public landing page", () => {
    expect(postLogoutRedirectFor("INDIVIDUAL")).toBe("/");
  });

  it.each(["INCARCERATED_USER", "EDUCATOR", "LEGAL_AID_STAFF", "INSTITUTION_ADMIN", "SYSTEM_ADMIN"] as const)(
    "sends institution-managed role %s to the institution login route",
    (role) => {
      expect(postLogoutRedirectFor(role)).toBe("/institution/login");
    },
  );
});
