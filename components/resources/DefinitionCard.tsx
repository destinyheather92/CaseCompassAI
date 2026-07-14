import type { LucideIcon } from "lucide-react";

type DefinitionCardProps = {
  term: string;
  definition: string;
  icon?: LucideIcon;
  category?: string;
};

export function DefinitionCard({ term, definition, icon: Icon, category }: DefinitionCardProps) {
  return (
    <div className="glass-card group flex flex-col items-start rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)]">
      {Icon && (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-cc-purple/40 bg-cc-purple/10 text-cc-purple transition-colors duration-300 group-hover:border-cc-teal/60 group-hover:text-cc-teal group-hover:bg-cc-teal/10">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      {category && (
        <span className="mb-1.5 text-xs font-bold tracking-widest text-cc-purple/80 uppercase">
          {category}
        </span>
      )}
      <h3 className="text-base font-bold leading-snug text-cc-text">{term}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cc-muted">{definition}</p>
    </div>
  );
}
