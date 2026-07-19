import type { UserRole } from "@/lib/generated/prisma/enums";

/** Individual users authenticate through the public site; every other role is provisioned/authenticated through the institution login flow. */
export function postLogoutRedirectFor(role: UserRole): string {
  return role === "INDIVIDUAL" ? "/" : "/institution/login";
}
