"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GENERIC_ERROR_MESSAGE = "The username or password is incorrect.";

export function InstitutionLoginForm() {
  const { signIn } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A session from an earlier login (in this browser) may already be
  // active — signIn.password() would otherwise fail with "already
  // signed in" and look like a credentials error. Send them straight
  // through instead of asking them to log in again.
  useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace("/first-login");
    }
  }, [authLoaded, isSignedIn, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier || !password) return;

    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await signIn.password({ identifier, password });

      if (signInError) {
        setError(GENERIC_ERROR_MESSAGE);
        return;
      }

      const finalizeResult = await signIn.finalize({
        navigate: ({ decorateUrl }: { decorateUrl: (path: string) => string }) => {
          const url = decorateUrl("/first-login");
          if (url.startsWith("http")) {
            window.location.href = url;
          } else {
            router.push(url);
          }
        },
      });

      if (finalizeResult.error) {
        setError(GENERIC_ERROR_MESSAGE);
      }
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authLoaded || isSignedIn) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4" noValidate>
      <p className="text-sm text-cc-muted">Use the username and password provided by your institution.</p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="institution-username">Username</Label>
        <Input
          id="institution-username"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="institution-password">Password</Label>
        <Input
          id="institution-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        Sign In
      </Button>
    </form>
  );
}
