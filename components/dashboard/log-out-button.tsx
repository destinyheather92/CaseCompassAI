"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { clearAllLocalSessionData } from "@/lib/client/user-scoped-storage";
import { cn } from "@/lib/utils";

/**
 * Plain sign-out — distinct from ClearSessionButton's shared-device
 * privacy flow (that one requires a confirm step since it also wipes
 * local data first). This still clears client-scoped state (invariant:
 * one user's browser state must never leak to the next person on a
 * shared device) but doesn't need a confirm step since it's the
 * ordinary "I'm done" action. Never deletes server-saved work — only
 * client storage and the Clerk session.
 */
export function LogOutButton({
  postLogoutRedirect,
  className,
}: {
  postLogoutRedirect: string;
  className?: string;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await Promise.resolve(signOut()).catch(() => {});
    } finally {
      clearAllLocalSessionData();
      router.push(postLogoutRedirect);
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" className={cn(className)} onClick={handleClick} disabled={loading}>
      {loading ? "Signing out…" : "Log Out"}
    </Button>
  );
}
