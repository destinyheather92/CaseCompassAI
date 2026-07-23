import { SignIn } from "@clerk/nextjs";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

/**
 * `redirect_url` lets a caller return the user to whatever they were
 * trying to do before being asked to log in (e.g. /get-started) — always
 * validated as an internal path only, never trusted as-is (see
 * safeRedirectPath), so this can never become an open redirect.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url: redirectUrl } = await searchParams;
  const forceRedirectUrl = safeRedirectPath(redirectUrl, "/");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn forceRedirectUrl={forceRedirectUrl} signUpForceRedirectUrl={forceRedirectUrl} />
    </div>
  );
}
