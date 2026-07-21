import type { AuthorizationFailureReason } from "@/lib/auth/authorization";

export interface AuthorizationFailureResponse {
  status: number;
  body: { status: string; message: string };
}

const GENERIC_SIGN_IN_MESSAGE = "Please sign in to continue.";
const GENERIC_FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";

/**
 * Maps an authorization failure reason to an HTTP status + response body
 * for route handlers. `unauthenticated` and `account-not-found` return
 * the identical response — an attacker probing this endpoint can't tell
 * "you're not logged in" from "that account doesn't exist" (invariant
 * #13). The three `forbidden-*` reasons likewise all collapse to one
 * generic "forbidden" body so a caller can't map out institution/facility
 * boundaries by reading error text.
 */
export function authorizationFailureResponse(reason: AuthorizationFailureReason): AuthorizationFailureResponse {
  switch (reason) {
    case "unauthenticated":
    case "account-not-found":
      return { status: 401, body: { status: "unauthenticated", message: GENERIC_SIGN_IN_MESSAGE } };
    case "account-disabled":
      return { status: 403, body: { status: "account-disabled", message: "This account has been disabled." } };
    case "account-archived":
      return { status: 403, body: { status: "account-archived", message: "This account has been archived." } };
    case "account-locked":
      return { status: 403, body: { status: "account-locked", message: "This account is locked." } };
    case "temporary-password-expired":
      return {
        status: 403,
        body: {
          status: "temporary-password-expired",
          message: "This temporary password has expired. Ask authorized staff to reset your password.",
        },
      };
    case "must-change-password":
      return {
        status: 403,
        body: { status: "must-change-password", message: "You must change your password before continuing." },
      };
    case "forbidden-role":
    case "forbidden-institution":
    case "forbidden-facility":
      return { status: 403, body: { status: "forbidden", message: GENERIC_FORBIDDEN_MESSAGE } };
  }
}
