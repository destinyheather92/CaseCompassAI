"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { clearAllLocalSessionData } from "@/lib/client/user-scoped-storage";
import { cn } from "@/lib/utils";

/**
 * Shared-device privacy control. Requires an explicit confirm step (not a
 * single click) since it signs the user out and wipes any locally
 * persisted intake/dashboard data on this device. Clears local storage
 * and signs out even if the server-side audit notification fails — the
 * privacy action must never be blocked by a network error. See
 * docs/behavior/shared-device-privacy.md.
 */
export function ClearSessionButton({ className }: { className?: string }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleConfirm() {
    setClearing(true);
    try {
      await fetch("/api/dashboard/clear-session", { method: "POST" }).catch(() => {});
    } finally {
      clearAllLocalSessionData();
      await signOut();
      router.push("/");
    }
  }

  if (confirming) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="text-xs text-cc-muted">This signs you out and clears saved data on this device.</p>
        <div className="flex gap-2">
          <Button type="button" variant="destructive" size="sm" onClick={handleConfirm} disabled={clearing}>
            {clearing ? "Clearing…" : "Confirm"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={clearing}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => setConfirming(true)}>
      Clear My Session
    </Button>
  );
}
