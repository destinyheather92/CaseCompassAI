"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SAFE_ERROR_MESSAGE = "Could not remove this case right now.";

export function RemoveSavedCaseButton({ savedCaseId }: { savedCaseId: string }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/saved-cases/${savedCaseId}`, { method: "DELETE" });
      const body = await response.json();
      if (body.status !== "removed") {
        setError(SAFE_ERROR_MESSAGE);
        return;
      }
      router.refresh();
    } catch {
      setError(SAFE_ERROR_MESSAGE);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="ghost" size="sm" onClick={handleClick} disabled={removing}>
        {removing ? "Removing…" : "Remove"}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
