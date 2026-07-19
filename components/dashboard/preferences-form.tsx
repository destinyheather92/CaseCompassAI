"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { UserPreferences } from "@/lib/dashboard/user-preferences-schema";

const SAFE_ERROR_MESSAGE = "Could not save your preferences right now.";

/** Accessibility/display preferences only — never a credential or authorization control. */
export function PreferencesForm({ initialPreferences }: { initialPreferences: UserPreferences }) {
  const [reducedMotion, setReducedMotion] = useState(initialPreferences.reducedMotion ?? false);
  const [textSize, setTextSize] = useState(initialPreferences.textSize ?? "default");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(update: Partial<UserPreferences>) {
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/dashboard/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });
      const body = await response.json();
      if (body.status !== "updated") {
        setError(SAFE_ERROR_MESSAGE);
        return;
      }
      setSaved(true);
    } catch {
      setError(SAFE_ERROR_MESSAGE);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="pref-reduced-motion"
          checked={reducedMotion}
          onCheckedChange={(checked) => {
            const value = checked === true;
            setReducedMotion(value);
            void patch({ reducedMotion: value });
          }}
        />
        <Label htmlFor="pref-reduced-motion" className="text-sm text-cc-text">
          Reduced motion
        </Label>
      </div>

      <div>
        <p className="text-sm text-cc-text">Text size</p>
        <RadioGroup
          value={textSize}
          onValueChange={(value) => {
            const next = value as UserPreferences["textSize"];
            setTextSize(next ?? "default");
            void patch({ textSize: next });
          }}
          className="mt-2 grid-flow-col justify-start gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="default" id="pref-text-default" />
            <Label htmlFor="pref-text-default">Default text</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="large" id="pref-text-large" />
            <Label htmlFor="pref-text-large">Large text</Label>
          </div>
        </RadioGroup>
      </div>

      <span role="status" aria-live="polite" className="text-xs text-cc-teal">
        {saved ? "Preferences saved." : ""}
      </span>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
