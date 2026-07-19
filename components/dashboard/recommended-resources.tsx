import Link from "next/link";
import type { ResourceMeta } from "@/lib/resources-data";

export function RecommendedResources({ resources }: { resources: ResourceMeta[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold tracking-wide text-cc-muted uppercase">Recommended Resources</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <li key={resource.slug}>
              <Link href={resource.href} className="flex items-start gap-3 rounded-lg p-2 -m-2 transition-colors hover:bg-white/[0.04]">
                <Icon className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-cc-text">{resource.title}</p>
                  <p className="text-xs text-cc-muted">{resource.cardDescription}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
