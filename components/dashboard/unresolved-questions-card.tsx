import { HelpCircle } from "lucide-react";

export function UnresolvedQuestionsCard({ unresolvedInformation }: { unresolvedInformation: string[] }) {
  if (unresolvedInformation.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Still Unresolved</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {unresolvedInformation.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-cc-muted">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-cc-purple" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
