"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { JURISDICTION_OPTIONS } from "@/lib/jurisdictions-data";

export interface JurisdictionStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack?: () => void;
}

export function JurisdictionStep({ value, onChange, onContinue, onBack }: JurisdictionStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none">
          What state or court system is your case in?
        </h2>
        <p className="mt-2 text-sm text-cc-muted">
          The court system and location affect which laws and procedures may apply.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jurisdiction-select">State or court system</Label>
        <select
          id="jurisdiction-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="glass-card h-11 rounded-xl px-3 text-cc-text focus:border-cc-purple/70 focus:outline-none"
        >
          <option value="" disabled>
            Select one
          </option>
          {JURISDICTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onContinue} disabled={!value}>
          Continue
        </Button>
      </div>
    </div>
  );
}
