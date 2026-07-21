"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogOutButton } from "@/components/dashboard/log-out-button";

/**
 * Shown on every intake step for a signed-in user so the wizard never
 * traps them — guests keep the existing flow unchanged (there is no
 * dashboard/account for a guest to return to). Sits in IntakeShell's
 * header row.
 */
export function IntakeNavBar({
  isSignedIn,
  onSaveAndExit,
}: {
  isSignedIn: boolean;
  onSaveAndExit: () => void;
}) {
  if (!isSignedIn) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onSaveAndExit}>
        Save and Exit
      </Button>
      <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        Return to Dashboard
      </Link>
      <LogOutButton postLogoutRedirect="/" />
    </div>
  );
}
