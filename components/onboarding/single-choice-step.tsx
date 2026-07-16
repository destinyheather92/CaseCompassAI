"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChoiceOption {
  value: string;
  label: string;
  helperText?: string;
}

export interface SingleChoiceStepProps {
  heading: string;
  helperText?: string;
  options: ChoiceOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  onContinue: () => void;
  onBack?: () => void;
  continueLabel?: string;
}

export function SingleChoiceStep({
  heading,
  helperText,
  options,
  selected,
  onSelect,
  onContinue,
  onBack,
  continueLabel = "Continue",
}: SingleChoiceStepProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-cc-text outline-none">
          {heading}
        </h2>
        {helperText && <p className="mt-2 text-sm text-cc-muted">{helperText}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label={heading}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "glass-card relative rounded-2xl p-4 pr-10 text-left transition-all duration-200",
                isSelected
                  ? "bg-cc-purple/20 shadow-[0_0_0_2px_var(--color-cc-purple)]"
                  : "hover:bg-cc-purple/5 hover:shadow-[0_0_0_1px_var(--color-cc-purple)]",
              )}
            >
              {isSelected && (
                <CheckCircle2
                  className="absolute top-3 right-3 size-5 text-cc-purple"
                  aria-hidden="true"
                  strokeWidth={2.5}
                />
              )}
              <span className="font-semibold text-cc-text">{option.label}</span>
              {option.helperText && <p className="mt-1 text-sm text-cc-muted">{option.helperText}</p>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" onClick={onContinue} disabled={!selected}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
