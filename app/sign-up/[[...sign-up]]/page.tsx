import { SignUp } from "@clerk/nextjs";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

/** See app/sign-in/[[...sign-in]]/page.tsx — same redirect_url convention. */
export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirect_url?: string }> }) {
  const { redirect_url: redirectUrl } = await searchParams;
  const forceRedirectUrl = safeRedirectPath(redirectUrl, "/");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp forceRedirectUrl={forceRedirectUrl} signInForceRedirectUrl={forceRedirectUrl} />
    </div>
  );
}
