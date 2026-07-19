import { ShieldAlert } from "lucide-react";

export function DashboardDisclaimer({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="glass-card flex items-start gap-3 rounded-xl p-4">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
      <p className="text-xs text-cc-muted">{disclaimer}</p>
    </div>
  );
}
