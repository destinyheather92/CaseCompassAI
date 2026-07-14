import type { Metadata } from "next";
import {
  Bot,
  RefreshCw,
  MapPin,
  FileWarning,
  BookOpenCheck,
  BadgeCheck,
  BookMarked,
  History,
  Clock,
  Scale,
  Layers,
} from "lucide-react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { DefinitionCard } from "@/components/resources/DefinitionCard";
import { WarningCallout } from "@/components/resources/WarningCallout";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";

export const metadata: Metadata = buildResourceMetadata("research-safety");

const safetyPoints = [
  { icon: Bot, title: "AI Can Make Mistakes", description: "AI tools, including CaseCompass, can misstate the law or miss important details. Always verify what you're told against a real legal source." },
  { icon: RefreshCw, title: "Legal Rules Change", description: "Statutes get amended and court decisions get overturned. A rule that was accurate last year may not be accurate today." },
  { icon: MapPin, title: "Jurisdictions Differ", description: "The same legal question can have different answers depending on the state, court, or system involved." },
  { icon: FileWarning, title: "Summaries Can Miss Context", description: "A short summary can leave out exceptions, conditions, or nuances that change how a rule applies to your situation." },
  { icon: BookOpenCheck, title: "Read the Full Source", description: "Summaries are a starting point, not a substitute for reading the actual statute, regulation, or opinion." },
  { icon: BadgeCheck, title: "Verify Citations", description: "Confirm that a citation is accurate and actually says what it's claimed to say before relying on it." },
  { icon: BookMarked, title: "Publication Status Matters", description: "Some opinions are unpublished and may carry different precedential weight depending on the court's rules." },
  { icon: History, title: "Later History Matters", description: "Check whether a case has been limited, questioned, or overruled by a later decision before relying on it." },
  { icon: Clock, title: "Deadlines May Apply", description: "Many legal actions have strict time limits. Missing a deadline can permanently affect your rights, so confirm deadlines with an official source." },
  { icon: Scale, title: "Procedure vs. Substance", description: "The procedural rules for how to bring a claim can be just as important, and just as different, as the substantive law itself." },
  { icon: Layers, title: "Use Multiple Sources", description: "Cross-checking information across more than one authoritative source is safer than relying on a single summary." },
];

const scopeDefinitions = [
  { title: "Legal Education", description: "General teaching about how the legal system works, such as explaining what a statute is or how an appeal works." },
  { title: "Legal Information", description: "Factual information about the law, like the text of a statute or the outcome of a case, without applying it to a specific situation." },
  { title: "Legal Research Guidance", description: "Help identifying what to research and where to look, based on the facts you provide, without telling you what to do." },
  { title: "Legal Advice", description: "A licensed attorney's recommendation about what action you specifically should take, based on their professional judgment. CaseCompass does not provide this." },
];

const faqItems = [
  {
    question: "Can I rely on a CaseCompass explanation the same way I would rely on an attorney?",
    answer:
      "No. CaseCompass explanations are educational research guidance, not legal advice from a licensed attorney. Always verify information against official sources and consult a qualified attorney for advice about your specific situation.",
  },
  {
    question: "How do I check if a case is still good law?",
    answer:
      "Look for the case's later history — whether it has been affirmed, limited, questioned, or overruled by a later decision. Many legal databases include tools specifically for checking a case's subsequent treatment.",
  },
  {
    question: "Why does it matter whether an opinion is published?",
    answer:
      "Courts sometimes designate opinions as unpublished, which can affect whether the opinion counts as binding precedent under that court's rules. The rules for this vary by jurisdiction.",
  },
  {
    question: "What should I do if I'm not sure a deadline applies to me?",
    answer:
      "Confirm the deadline directly with the relevant court, agency, or an attorney as early as possible. Deadlines in legal matters are often strict, and missing one can permanently affect your rights.",
  },
];

export default function ResearchSafetyPage() {
  return (
    <>
      <Breadcrumb currentTitle="Research Safety Guide" />
      <ResourceHero
        eyebrow="Research Safety"
        title="Research Safety Guide"
        description="Good legal research means knowing not just where to look, but how much to trust what you find. This guide covers the habits that keep your research reliable."
      />

      <ResourceSection id="warning" title="Before You Rely on Anything">
        <WarningCallout title="Verify before you rely">
          Do not rely on an AI summary, search result, or single case without reviewing the full
          legal source and checking whether it is current and applicable to your jurisdiction.
        </WarningCallout>
      </ResourceSection>

      <ResourceSection
        id="safety-principles"
        title="What to Keep in Mind"
        description="Eleven habits that protect you from acting on outdated, incomplete, or inapplicable information."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {safetyPoints.map((point) => (
            <DefinitionCard
              key={point.title}
              icon={point.icon}
              term={point.title}
              definition={point.description}
            />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection
        id="scope"
        title="Education, Information, Guidance, and Advice"
        description="These four terms sound similar but mean very different things."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {scopeDefinitions.map((item) => (
            <DefinitionCard key={item.title} term={item.title} definition={item.description} />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="research-safety"
        preferredSlugs={[
          "what-casecompass-can-and-cannot-do",
          "legal-research-basics",
          "how-to-read-a-court-opinion",
        ]}
      />

      <ResourceCTA
        heading="Ready to research safely and with purpose?"
        description="Build a personalized roadmap that points you toward primary sources you can verify yourself."
        label="Start Your Research Roadmap"
      />

      <LegalDisclaimer />
    </>
  );
}
