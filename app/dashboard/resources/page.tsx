import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, BookOpen } from "lucide-react";
import { requireDashboardAccess } from "@/lib/auth/dashboard-authorization";
import { resourcesList, type ResourceMeta } from "@/lib/resources-data";

export const metadata: Metadata = {
  title: "Resources | CaseCompass AI",
};

/** Real resource topics not yet built — labeled clearly rather than implied to exist, per docs/behavior/matters.md's sibling documentation discipline. */
const FUTURE_RESOURCES = [
  "Understanding Court Hierarchy",
  "How to Identify Binding Authority",
  "How to Compare Cases",
  "How to Read a Docket",
];

function groupByCategory(resources: ResourceMeta[]): Map<string, ResourceMeta[]> {
  const groups = new Map<string, ResourceMeta[]>();
  for (const resource of resources) {
    const existing = groups.get(resource.eyebrow) ?? [];
    existing.push(resource);
    groups.set(resource.eyebrow, existing);
  }
  return groups;
}

function ResourceCard({ resource }: { resource: ResourceMeta }) {
  const Icon = resource.icon;
  return (
    <Link
      href={resource.href}
      data-testid="resource-card"
      className="glass-card group flex flex-col gap-3 rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-cc-purple/50 outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
    >
      <span className="flex size-10 items-center justify-center rounded-xl border border-cc-purple/40 bg-cc-purple/10 text-cc-purple transition-colors duration-200 group-hover:border-cc-teal/60 group-hover:text-cc-teal group-hover:bg-cc-teal/10">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-cc-text">{resource.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-cc-muted">{resource.cardDescription}</p>
      </div>
      <div className="mt-auto flex items-center gap-3 text-[0.7rem] text-cc-muted">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          {resource.readingTimeMinutes} min read
        </span>
        <span>{resource.difficulty}</span>
      </div>
      <span className="text-xs font-semibold text-cc-purple group-hover:underline">Explore Resource →</span>
    </Link>
  );
}

export default async function DashboardResourcesPage() {
  const authResult = await requireDashboardAccess();
  if (!authResult.ok) {
    redirect(authResult.redirectTo);
  }

  const grouped = groupByCategory(resourcesList);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-bold text-cc-text">Resources</h1>
        <p className="mt-1 text-sm text-cc-muted">
          Educational guides to help you research your own matter — not specific to any one matter, useful any time.
        </p>
      </div>

      {resourcesList.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
          <BookOpen className="size-8 text-cc-purple" aria-hidden="true" />
          <p className="text-sm text-cc-muted">No educational resources are available yet.</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([category, resources]) => (
          <section key={category} className="flex flex-col gap-4">
            <h2 className="text-xs font-semibold tracking-[0.15em] text-cc-muted uppercase">{category}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="resources-grid">
              {resources.map((resource) => (
                <ResourceCard key={resource.slug} resource={resource} />
              ))}
            </div>
          </section>
        ))
      )}

      <section className="flex flex-col gap-3 border-t border-white/[0.06] pt-6">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-cc-muted uppercase">Coming Soon</h2>
        <ul className="flex flex-wrap gap-2">
          {FUTURE_RESOURCES.map((title) => (
            <li key={title} className="rounded-full border border-cc-border px-3 py-1 text-xs text-cc-muted">
              {title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
