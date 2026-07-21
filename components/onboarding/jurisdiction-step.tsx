"use client";

import { useEffect, useRef } from "react";
import { MapPin, ChevronDown } from "lucide-react";
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
    <div className="glass-card flex w-full max-w-lg flex-col gap-6 rounded-3xl p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-cc-purple/50 bg-gradient-to-br from-cc-purple/20 to-cc-teal/10">
          <MapPin className="size-5 text-cc-purple" aria-hidden="true" strokeWidth={1.75} />
        </span>
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none">
            What state or court system is your case in?
          </h2>
          <p className="mt-2 text-sm text-cc-muted">
            The court system and location affect which laws and procedures may apply.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="jurisdiction-select">State or court system</Label>
        <div className="relative">
          <select
            id="jurisdiction-select"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="glass-card h-12 w-full appearance-none rounded-xl px-4 pr-10 text-base text-cc-text transition-colors focus:border-cc-purple/70 focus:shadow-[0_0_0_2px_var(--color-cc-purple)] focus:outline-none"
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
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-cc-muted"
            aria-hidden="true"
          />
        </div>
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
