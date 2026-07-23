"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";

/**
 * Shown as a real modal (never a silent redirect, never a trap) whenever
 * an unauthenticated visitor reaches a protected action — e.g.
 * /get-started with no session. `redirectTo` is threaded through to
 * sign-in/sign-up as `redirect_url` so the visitor lands back on the
 * exact page they were trying to reach once authenticated.
 *
 * Rendered already-open from a server component (there's no client
 * "trigger" in this entry path — the server itself decided to show this
 * instead of the protected content), so closing it (X, Escape, backdrop,
 * or "Back to Home") always navigates to "/" rather than leaving an
 * empty page behind. The underlying Dialog primitive (base-ui) already
 * provides Escape-to-close, backdrop-click-to-close, focus trapping, and
 * a keyboard-accessible close button — nothing extra was needed for
 * those.
 */
export function AuthRequiredModal({
  redirectTo,
  message = "Log in or create an account to get started.",
}: {
  redirectTo: string;
  message?: string;
}) {
  const router = useRouter();
  const redirectParam = encodeURIComponent(redirectTo);

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) router.push("/");
      }}
    >
      <DialogContent className="sm:max-w-md" data-testid="auth-required-modal">
        <DialogHeader className="items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full border border-cc-purple/40 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
            <LockKeyhole className="size-6 text-cc-purple" aria-hidden="true" strokeWidth={1.75} />
          </span>
          <DialogTitle className="text-xl">{message}</DialogTitle>
          <DialogDescription>
            Your legal research roadmap is personal to your account, so we need to know who you are first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/sign-in?redirect_url=${redirectParam}`} className={buttonVariants({ variant: "default" })} data-testid="auth-required-login">
            Log In
          </Link>
          <Link href={`/sign-up?redirect_url=${redirectParam}`} className={buttonVariants({ variant: "outline" })} data-testid="auth-required-signup">
            Create Account
          </Link>
        </div>

        <DialogFooter className="justify-center border-t-0 bg-transparent p-0 sm:justify-center">
          <Link href="/" className="text-sm text-cc-muted underline underline-offset-2 hover:text-cc-text" data-testid="auth-required-back-home">
            Back to Home
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
