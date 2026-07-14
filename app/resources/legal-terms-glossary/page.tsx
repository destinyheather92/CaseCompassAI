import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { GlossaryIntroGrid } from "@/components/resources/GlossaryIntroGrid";
import { GlossarySearch } from "@/components/resources/GlossarySearch";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";
import { featuredGlossaryTerms } from "@/lib/legal-sources/curated-glossary-provider";

export const metadata: Metadata = buildResourceMetadata("legal-terms-glossary");

const faqItems = [
  {
    question: "Where do these definitions come from?",
    answer:
      "Every definition is either hand-curated from official sources, like federal court glossaries and the Cornell Legal Information Institute, or retrieved from an approved legal reference source. Nothing is generated from memory alone.",
  },
  {
    question: "What happens if a term isn't in the glossary yet?",
    answer:
      "If we can't verify a reliable definition for a term, the search tells you that directly instead of guessing. Try a different spelling, a shorter phrase, or consult an official legal source.",
  },
  {
    question: "Can I search a full question instead of a single term?",
    answer:
      "The glossary is built for words and short phrases, like “habeas corpus” or “burden of proof,” not full questions or case narratives. If you enter a question, the tool will ask you to rephrase it as a term.",
  },
  {
    question: "Can I share a link to a specific definition?",
    answer:
      "Yes. Searching a term updates the page's URL, so you can copy and share the link, or bookmark it to come back to that definition later.",
  },
];

type LegalTermsGlossaryPageProps = {
  searchParams: Promise<{ term?: string }>;
};

export default async function LegalTermsGlossaryPage({
  searchParams,
}: LegalTermsGlossaryPageProps) {
  const { term } = await searchParams;

  return (
    <>
      <Breadcrumb currentTitle="Legal Terms Glossary" />
      <ResourceHero
        eyebrow="Legal Research"
        title="Legal Terms Glossary"
        description="Legal writing is full of words that mean something very specific. Start with the common terms below, or search for any term you come across in your research."
      />

      <ResourceSection
        id="common-terms"
        title="Commonly Used Legal Terms"
        description="Filter by category, or browse the full list."
      >
        <GlossaryIntroGrid terms={featuredGlossaryTerms} />
      </ResourceSection>

      <ResourceSection
        id="term-search"
        title="Research a Legal Term"
        description="Search for a legal term to receive a plain-language definition, examples, related concepts, and trusted sources."
      >
        <Suspense fallback={<div className="h-32 animate-pulse rounded-2xl border border-cc-border bg-cc-card" />}>
          <GlossarySearch initialTerm={term} />
        </Suspense>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="legal-terms-glossary"
        preferredSlugs={["legal-citations", "how-to-read-a-court-opinion", "legal-research-basics"]}
      />

      <ResourceCTA
        heading="Ready to research with a plan?"
        description="Turn what you've learned into a personalized, step-by-step research roadmap."
        label="Build My Research Roadmap"
      />

      <LegalDisclaimer />
    </>
  );
}
