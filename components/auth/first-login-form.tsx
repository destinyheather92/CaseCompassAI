"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { firstLoginPasswordSchema } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_ERROR_MESSAGE = "We could not update your password right now. Please try again.";

export function FirstLoginForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = firstLoginPasswordSchema.safeParse({ currentPassword, newPassword, confirmNewPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your entries and try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/first-login-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.message ?? GENERIC_ERROR_MESSAGE);
        return;
      }

      router.push(body.redirectTo ?? "/get-started");
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Temporary password</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <p className="text-xs text-cc-muted">
          At least 10 characters. Spaces and passphrases are welcome — you don&apos;t need symbols or numbers.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        Change Password
      </Button>
    </form>
  );
}
