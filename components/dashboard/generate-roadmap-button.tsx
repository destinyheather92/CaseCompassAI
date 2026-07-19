"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SAFE_ERROR_MESSAGE = "Could not build a roadmap right now. Please try again.";

export function GenerateRoadmapButton({ intakeId }: { intakeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/roadmap/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intakeId }),
      });
      const body = await response.json();
      if (body.status !== "created") {
        setError(body.message ?? SAFE_ERROR_MESSAGE);
        return;
      }
      router.push(`/dashboard/roadmaps/${body.roadmapId}`);
      router.refresh();
    } catch {
      setError(SAFE_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "Building…" : "Build My Roadmap"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
