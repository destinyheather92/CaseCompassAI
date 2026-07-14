import type { LucideIcon } from "lucide-react";
import { FileSearch, Search, Link2, BookMarked, ShieldCheck, HelpCircle } from "lucide-react";

export type ResourceSlug =
  | "how-to-read-a-court-opinion"
  | "legal-research-basics"
  | "legal-citations"
  | "legal-terms-glossary"
  | "research-safety"
  | "what-casecompass-can-and-cannot-do";

export type ResourceMeta = {
  slug: ResourceSlug;
  href: `/resources/${ResourceSlug}`;
  icon: LucideIcon;
  title: string;
  /** Short card copy used on the landing page and in related-resource cards. */
  cardDescription: string;
  /** SEO meta description — can be the same as cardDescription or slightly longer. */
  metaDescription: string;
  eyebrow: string;
};

export const resourcesRegistry: Record<ResourceSlug, ResourceMeta> = {
  "how-to-read-a-court-opinion": {
    slug: "how-to-read-a-court-opinion",
    href: "/resources/how-to-read-a-court-opinion",
    icon: FileSearch,
    title: "How to Read a Court Opinion",
    cardDescription: "Learn the parts of a court opinion and how to find the holding.",
    metaDescription:
      "A plain-language guide to reading court opinions — case name, facts, issue, holding, reasoning, and how to tell a holding from dicta.",
    eyebrow: "Legal Research",
  },
  "legal-research-basics": {
    slug: "legal-research-basics",
    href: "/resources/legal-research-basics",
    icon: Search,
    title: "Legal Research Basics",
    cardDescription: "Understand jurisdiction, authority, and a simple research sequence.",
    metaDescription:
      "An introduction to legal research fundamentals: jurisdiction, primary vs. secondary authority, binding vs. persuasive authority, and a step-by-step research sequence.",
    eyebrow: "Legal Research",
  },
  "legal-citations": {
    slug: "legal-citations",
    href: "/resources/legal-citations",
    icon: Link2,
    title: "Understanding Legal Citations",
    cardDescription: "Break down what each part of a legal citation means.",
    metaDescription:
      "Learn how to read legal citations for cases, statutes, and regulations, with real examples broken down piece by piece.",
    eyebrow: "Legal Research",
  },
  "legal-terms-glossary": {
    slug: "legal-terms-glossary",
    href: "/resources/legal-terms-glossary",
    icon: BookMarked,
    title: "Legal Terms Glossary",
    cardDescription: "Search plain-language definitions for common legal terms.",
    metaDescription:
      "A searchable glossary of common legal terms with plain-language definitions, examples, related concepts, and trusted sources.",
    eyebrow: "Legal Research",
  },
  "research-safety": {
    slug: "research-safety",
    href: "/resources/research-safety",
    icon: ShieldCheck,
    title: "Research Safety Guide",
    cardDescription: "Learn how to double-check sources and avoid common research mistakes.",
    metaDescription:
      "Why you should verify citations, check publication and later history, and avoid relying on a single summary when doing legal research.",
    eyebrow: "Research Safety",
  },
  "what-casecompass-can-and-cannot-do": {
    slug: "what-casecompass-can-and-cannot-do",
    href: "/resources/what-casecompass-can-and-cannot-do",
    icon: HelpCircle,
    title: "What CaseCompass Can and Cannot Do",
    cardDescription: "A clear, honest breakdown of the tool's abilities and limits.",
    metaDescription:
      "A balanced look at what CaseCompass AI can and cannot do — it provides educational research guidance, not legal advice.",
    eyebrow: "About CaseCompass",
  },
};

export const resourcesList: ResourceMeta[] = Object.values(resourcesRegistry);

export function getRelatedResources(
  current: ResourceSlug,
  preferredSlugs?: ResourceSlug[],
  count = 3,
): ResourceMeta[] {
  if (preferredSlugs && preferredSlugs.length > 0) {
    const preferred = preferredSlugs
      .filter((slug) => slug !== current)
      .map((slug) => resourcesRegistry[slug]);
    if (preferred.length >= count) return preferred.slice(0, count);
  }
  return resourcesList.filter((resource) => resource.slug !== current).slice(0, count);
}
