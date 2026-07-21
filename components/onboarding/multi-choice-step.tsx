"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChoiceOption } from "@/components/onboarding/single-choice-step";

export interface MultiChoiceStepProps {
  heading: string;
  helperText?: string;
  options: ChoiceOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onContinue: () => void;
  onBack?: () => void;
  continueLabel?: string;
  /** When this option value is selected, an additional required text field is shown. */
  otherValue?: string;
  otherText?: string;
  onOtherTextChange?: (value: string) => void;
  /** Purely decorative per-option icons, looked up by option.value — never affects the option's accessible name. */
  icons?: Partial<Record<string, LucideIcon>>;
}

export function MultiChoiceStep({
  heading,
  helperText,
  options,
  selected,
  onToggle,
  onContinue,
  onBack,
  continueLabel = "Continue",
  otherValue,
  otherText = "",
  onOtherTextChange,
  icons,
}: MultiChoiceStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const otherSelected = otherValue !== undefined && selected.includes(otherValue);
  const otherSatisfied = !otherSelected || otherText.trim().length > 0;
  const canContinue = selected.length > 0 && otherSatisfied;

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="text-center sm:text-left">
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none sm:text-3xl">
          {heading}
        </h2>
        {helperText && <p className="mt-2 text-sm text-cc-muted">{helperText}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={heading}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          const Icon = icons?.[option.value];
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(option.value)}
              className={cn(
                "glass-card relative flex items-center gap-3 rounded-2xl p-4 pr-10 text-left transition-all duration-200",
                isSelected
                  ? "bg-cc-purple/15 shadow-[0_0_0_2px_var(--color-cc-purple),0_0_24px_rgba(139,92,246,0.25)]"
                  : "hover:-translate-y-0.5 hover:bg-cc-purple/5 hover:shadow-[0_0_0_1px_var(--color-cc-purple)]",
              )}
            >
              {isSelected && (
                <CheckCircle2
                  className="absolute top-3 right-3 size-5 text-cc-purple"
                  aria-hidden="true"
                  strokeWidth={2.5}
                />
              )}
              {Icon && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                    isSelected ? "border-cc-purple bg-cc-purple/25 text-cc-purple" : "border-white/10 bg-white/[0.03] text-cc-muted",
                  )}
                >
                  <Icon className="size-4" />
                </span>
              )}
              <span className="font-semibold text-cc-text">{option.label}</span>
            </button>
          );
        })}
      </div>

      {otherSelected && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="multi-choice-other">Please describe</Label>
          <Input
            id="multi-choice-other"
            value={otherText}
            onChange={(event) => onOtherTextChange?.(event.target.value)}
            required
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onContinue} disabled={!canContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
