import { describe, expect, it } from "vitest";
import { authorizationFailureResponse } from "@/lib/auth/authorization-http";

describe("authorizationFailureResponse", () => {
  it("maps unauthenticated to 401 without revealing whether the account exists", () => {
    expect(authorizationFailureResponse("unauthenticated")).toEqual({
      status: 401,
      body: { status: "unauthenticated", message: "Please sign in to continue." },
    });
  });

  it("maps account-not-found to the same generic 401 as unauthenticated", () => {
    const notFound = authorizationFailureResponse("account-not-found");
    const unauth = authorizationFailureResponse("unauthenticated");
    expect(notFound.status).toBe(unauth.status);
    expect(notFound.body.message).toBe(unauth.body.message);
  });

  it("maps must-change-password to 403 with a distinct, non-generic status", () => {
    const result = authorizationFailureResponse("must-change-password");
    expect(result.status).toBe(403);
    expect(result.body.status).toBe("must-change-password");
  });

  it("maps every forbidden-* reason to a generic 'forbidden' body so it doesn't leak why", () => {
    for (const reason of ["forbidden-role", "forbidden-institution", "forbidden-facility"] as const) {
      const result = authorizationFailureResponse(reason);
      expect(result.status).toBe(403);
      expect(result.body.status).toBe("forbidden");
    }
  });

  it("maps account-disabled and account-locked to distinct 403 bodies", () => {
    expect(authorizationFailureResponse("account-disabled").body.status).toBe("account-disabled");
    expect(authorizationFailureResponse("account-locked").body.status).toBe("account-locked");
  });
});
