import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ResourceMeta, ResourceSlug } from "@/lib/resources-data";
import { getRelatedResources } from "@/lib/resources-data";

type RelatedResourceCardsProps = {
  current: ResourceSlug;
  preferredSlugs?: ResourceSlug[];
};

function RelatedCard({ resource }: { resource: ResourceMeta }) {
  const Icon = resource.icon;
  return (
    <Link
      href={resource.href}
      className="glass-card group flex flex-col items-start rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-cc-purple/60 hover:shadow-[0_12px_40px_rgba(139,92,246,0.2)] outline-none focus-visible:ring-2 focus-visible:ring-cc-purple"
    >
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl border border-cc-purple/40 bg-cc-purple/10 text-cc-purple transition-colors duration-300 group-hover:border-cc-teal/60 group-hover:text-cc-teal group-hover:bg-cc-teal/10">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-bold leading-snug text-cc-text">{resource.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-cc-muted">{resource.cardDescription}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cc-purple transition-colors group-hover:text-cc-teal">
        Read more
        <ArrowRight
          className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export function RelatedResourceCards({ current, preferredSlugs }: RelatedResourceCardsProps) {
  const related = getRelatedResources(current, preferredSlugs);

  return (
    <section className="px-6 py-16 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-extrabold tracking-tight text-cc-text sm:text-3xl">
          Continue Learning
        </h2>
        <div className="mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-cc-purple to-cc-teal" />
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {related.map((resource) => (
            <li key={resource.slug}>
              <RelatedCard resource={resource} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
