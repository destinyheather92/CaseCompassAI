import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/authorization";
import { requireOwnedMatter } from "@/lib/auth/dashboard-authorization";
import { AuthRequiredModal } from "@/components/auth/auth-required-modal";
import { GetStartedWizard } from "@/components/onboarding/get-started-wizard";

/**
 * Beginning a matter/intake now always requires a real, signed-in
 * account — this route used to be guest-reachable end to end. An
 * unauthenticated visit shows a clear prompt (never a silent redirect)
 * with a path back to exactly this page once they've logged in or
 * signed up. Every other failure reason (disabled account, must-change-
 * password, etc.) keeps the existing hard redirect, since those aren't
 * "you're not logged in" — they're a real account that needs something
 * else first. See docs/behavior/matters.md.
 */
export default async function GetStartedPage({ searchParams }: { searchParams: Promise<{ matterId?: string }> }) {
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    if (authResult.reason === "unauthenticated" || authResult.reason === "account-not-found") {
      return (
        <div className="min-h-screen bg-cc-bg">
          <AuthRequiredModal
            redirectTo="/get-started"
            message="Log in or create an account to build your legal research roadmap."
          />
        </div>
      );
    }
    redirect(authResult.redirectTo);
  }

  const { matterId: requestedMatterId } = await searchParams;
  let matterId: string | undefined;
  if (requestedMatterId) {
    const owned = await requireOwnedMatter(requestedMatterId, authResult.user);
    // An invalid/foreign matterId is silently dropped rather than erroring
    // out — starting a fresh matter is always a safe fallback.
    matterId = owned.ok ? owned.resource.id : undefined;
  }

  return <GetStartedWizard matterId={matterId} />;
}
