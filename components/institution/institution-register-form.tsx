"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { INSTITUTION_TYPE_OPTIONS } from "@/lib/institution/register-institution-schema";

function humanizeType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

interface IssuedCredential {
  username: string;
  temporaryPassword: string;
}

export function InstitutionRegisterForm() {
  const [institutionType, setInstitutionType] = useState<(typeof INSTITUTION_TYPE_OPTIONS)[number]>("STATE_PRISON");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    const body = {
      facilityName: formData.get("facilityName") as string,
      institutionType,
      institutionTypeOther: (formData.get("institutionTypeOther") as string) || undefined,
      organizationName: (formData.get("organizationName") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      contactName: formData.get("contactName") as string,
      contactTitle: (formData.get("contactTitle") as string) || undefined,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: (formData.get("contactPhone") as string) || undefined,
      estimatedPopulation: formData.get("estimatedPopulation") ? Number(formData.get("estimatedPopulation")) : undefined,
      estimatedUsers: formData.get("estimatedUsers") ? Number(formData.get("estimatedUsers")) : undefined,
    };

    try {
      const response = await fetch("/api/institution/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseBody = await response.json();
      if (!response.ok) {
        setError(responseBody.message ?? "Could not complete registration. Please try again.");
        return;
      }
      setIssued({ username: responseBody.adminUsername, temporaryPassword: responseBody.temporaryPassword });
    } catch {
      setError("Could not complete registration. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (issued) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-sm text-cc-text">Your institution account has been created. Your administrator login:</p>
        <div className="glass-card rounded-xl border border-cc-purple/40 p-4 text-left">
          <p className="text-sm text-cc-text">
            Username: <span className="font-mono text-cc-purple">{issued.username}</span>
          </p>
          <p className="mt-1 text-sm text-cc-text">
            Temporary password: <span className="font-mono text-cc-purple">{issued.temporaryPassword}</span>
          </p>
        </div>
        <p className="text-xs text-cc-muted">
          Copy this temporary password now — it cannot be viewed again. You&apos;ll be asked to set a new password on
          first login.
        </p>
        <Link href="/institution/login" className={buttonVariants({ variant: "default" })}>
          Continue to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="facilityName">Facility Name</Label>
        <Input id="facilityName" name="facilityName" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="institutionType">Institution Type</Label>
        <select
          id="institutionType"
          value={institutionType}
          onChange={(event) => setInstitutionType(event.target.value as typeof institutionType)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {INSTITUTION_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {humanizeType(option)}
            </option>
          ))}
        </select>
      </div>

      {institutionType === "OTHER" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="institutionTypeOther">Please describe</Label>
          <Input id="institutionTypeOther" name="institutionTypeOther" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="organizationName">Organization / Agency Name (optional)</Label>
        <Input id="organizationName" name="organizationName" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Facility Address (optional)</Label>
        <Input id="address" name="address" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactName">Contact Person</Label>
          <Input id="contactName" name="contactName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactTitle">Job Title (optional)</Label>
          <Input id="contactTitle" name="contactTitle" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactEmail">Work Email</Label>
          <Input id="contactEmail" name="contactEmail" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactPhone">Phone Number (optional)</Label>
          <Input id="contactPhone" name="contactPhone" type="tel" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedPopulation">Estimated Population (optional)</Label>
          <Input id="estimatedPopulation" name="estimatedPopulation" type="number" min="0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="estimatedUsers">Estimated Expected Users (optional)</Label>
          <Input id="estimatedUsers" name="estimatedUsers" type="number" min="0" />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Registering…" : "Create Institution Account"}
      </Button>

      <p className="text-xs text-cc-muted">
        Your work email is stored as contact information only. Your administrator account is authenticated with a
        username and password, never email — no password is ever set here.
      </p>
    </form>
  );
}
