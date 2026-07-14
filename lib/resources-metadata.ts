import type { Metadata } from "next";
import { resourcesRegistry, type ResourceSlug } from "@/lib/resources-data";

export function buildResourceMetadata(slug: ResourceSlug): Metadata {
  const resource = resourcesRegistry[slug];

  return {
    title: `${resource.title} | CaseCompass AI`,
    description: resource.metaDescription,
    alternates: {
      canonical: resource.href,
    },
    openGraph: {
      title: `${resource.title} | CaseCompass AI`,
      description: resource.metaDescription,
      url: resource.href,
      type: "article",
    },
  };
}
