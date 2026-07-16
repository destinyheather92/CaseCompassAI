import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { FirstLoginForm } from "@/components/auth/first-login-form";

export const metadata: Metadata = {
  title: "Change Your Password | CaseCompass AI",
};

/**
 * The mandatory gate between a temporary-password login and the rest of
 * the product. Server-enforced (not just a client redirect) — see
 * docs/behavior/first-login-password-change.md and security-invariants
 * #6/#32: entering this route directly cannot be used to bypass or skip
 * the requirement, and a user who has already completed it is bounced
 * onward rather than shown the form again.
 */
export default async function FirstLoginPage() {
  const authResult = await requireAuthenticatedUser({ allowPendingPasswordChange: true });

  if (!authResult.ok) {
    if (authResult.reason === "unauthenticated" || authResult.reason === "account-not-found") {
      redirect("/institution/login");
    }
    redirect(authResult.redirectTo);
  }

  if (!authResult.user.mustChangePassword) {
    redirect(authResult.user.role === "INSTITUTION_ADMIN" ? "/institution/dashboard" : "/get-started");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-cc-bg px-6 py-16">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-bold text-cc-text">Create a new password</h1>
        <p className="mt-2 text-sm text-cc-muted">
          For your privacy, you must set a new, private password before continuing.
        </p>
      </div>
      <div className="glass-card w-full max-w-sm rounded-2xl p-6">
        <FirstLoginForm />
      </div>
    </div>
  );
}
