import type { Metadata } from "next";
import {
  BookOpen,
  Landmark,
  FileText,
  Gavel,
  Scale,
  Building2,
  MapPin,
  Flag,
} from "lucide-react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { DefinitionCard } from "@/components/resources/DefinitionCard";
import { InfoCallout } from "@/components/resources/InfoCallout";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";

export const metadata: Metadata = buildResourceMetadata("legal-research-basics");

const authorityTypes = [
  {
    icon: Landmark,
    title: "Constitutions",
    description: "The foundational law of a government, setting out its structure and basic rights.",
  },
  {
    icon: BookOpen,
    title: "Statutes",
    description: "Written laws passed by a legislature, such as Congress or a state legislature.",
  },
  {
    icon: FileText,
    title: "Regulations",
    description: "Detailed rules created by government agencies to carry out a statute.",
  },
  {
    icon: Gavel,
    title: "Court Rules",
    description: "Procedural rules that govern how cases move through a specific court.",
  },
  {
    icon: Scale,
    title: "Judicial Opinions",
    description: "Written decisions by courts explaining how they resolved a legal dispute.",
  },
  {
    icon: Building2,
    title: "Administrative Decisions",
    description: "Rulings issued by government agencies acting in a judge-like role.",
  },
];

const authorityRankings = [
  {
    title: "Primary Authority",
    description:
      "The actual law itself — constitutions, statutes, regulations, and court opinions. This is what you ultimately rely on.",
  },
  {
    title: "Secondary Authority",
    description:
      "Materials that explain or comment on the law, such as legal encyclopedias, treatises, and law review articles.",
  },
  {
    title: "Binding Authority",
    description:
      "Primary authority that a court must follow, usually because it comes from a higher court in the same jurisdiction.",
  },
  {
    title: "Persuasive Authority",
    description:
      "Authority a court may consider but does not have to follow, such as a decision from a different state or jurisdiction.",
  },
];

const lawLevels = [
  {
    icon: Flag,
    title: "Federal Law",
    description: "Law that applies across the entire United States, created by Congress, federal agencies, and federal courts.",
  },
  {
    icon: MapPin,
    title: "State Law",
    description: "Law that applies within a specific state, created by that state's legislature, agencies, and courts.",
  },
  {
    icon: Gavel,
    title: "Local Rules",
    description: "Rules specific to an individual court or municipality, often governing procedure or local ordinances.",
  },
];

const researchSequence = [
  "Identify the issue.",
  "Identify the correct jurisdiction.",
  "Learn the important legal terms.",
  "Find primary legal authority.",
  "Read the full source.",
  "Check whether the authority is still valid.",
  "Compare related cases.",
  "Save citations and notes.",
];

const faqItems = [
  {
    question: "Why does jurisdiction matter so much?",
    answer:
      "A rule that applies in one state, or in federal court, may not apply the same way somewhere else. Researching the wrong jurisdiction can lead you to a rule that doesn't actually govern your situation.",
  },
  {
    question: "Why do dates matter in legal research?",
    answer:
      "Laws and court rulings change over time. A source that was accurate five years ago may have been amended, replaced, or overruled since then, so checking how current a source is matters as much as finding it.",
  },
  {
    question: "Can I just rely on a secondary source, like an article explaining the law?",
    answer:
      "Secondary sources can help you understand a topic and point you toward primary authority, but they generally do not replace it. Courts decide cases based on primary authority, not on how a secondary source summarized it.",
  },
  {
    question: "Why does court level matter?",
    answer:
      "Decisions from higher courts generally carry more weight than decisions from lower courts, and only some decisions are binding on a particular court. Knowing the court level helps you judge how authoritative a source is.",
  },
];

export default function LegalResearchBasicsPage() {
  return (
    <>
      <Breadcrumb currentTitle="Legal Research Basics" />
      <ResourceHero
        eyebrow="Legal Research"
        title="Legal Research Basics"
        description="Legal research is the process of finding and understanding the law that applies to a specific question. This guide covers the fundamentals: jurisdiction, authority, and a simple sequence to follow."
      />

      <ResourceSection
        id="what-is-legal-research"
        title="What Legal Research Is"
        description="Legal research means locating accurate, current legal sources — and understanding which ones actually apply to your situation."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <InfoCallout title="Why jurisdiction matters">
            Laws differ between states, and between state and federal systems. Research in the wrong
            jurisdiction can point you toward a rule that has no bearing on your situation.
          </InfoCallout>
          <InfoCallout title="Why dates matter">
            Laws change. A statute can be amended, and a court decision can be limited or overruled.
            Always check whether a source still reflects the current law.
          </InfoCallout>
          <InfoCallout title="Why court level matters">
            A ruling from a state&rsquo;s highest court generally carries more authority than a ruling from
            a lower trial court in the same state.
          </InfoCallout>
          <InfoCallout title="Why authority is ranked">
            Not all legal sources carry equal weight. Understanding primary versus secondary, and
            binding versus persuasive authority, helps you judge how much a source actually proves.
          </InfoCallout>
        </div>
      </ResourceSection>

      <ResourceSection
        id="types-of-authority"
        title="Types of Legal Authority"
        description="Legal authority comes in several forms, each created differently and used differently."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {authorityTypes.map((type) => (
            <DefinitionCard key={type.title} icon={type.icon} term={type.title} definition={type.description} />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection
        id="authority-rankings"
        title="How Authority Is Ranked"
        description="Sources aren't all equally weighty. These four concepts describe how strong a source is."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {authorityRankings.map((item) => (
            <DefinitionCard key={item.title} term={item.title} definition={item.description} />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection
        id="levels-of-law"
        title="Federal, State, and Local Law"
        description="Where a rule comes from affects who it applies to."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {lawLevels.map((level) => (
            <DefinitionCard key={level.title} icon={level.icon} term={level.title} definition={level.description} />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection
        id="research-sequence"
        title="A Basic Research Sequence"
        description="There's no single right way to research, but this order works well for most questions."
      >
        <ol className="space-y-3">
          {researchSequence.map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-4 rounded-xl border border-cc-border bg-cc-card px-4 py-3.5"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cc-purple/15 text-xs font-bold text-cc-purple">
                {i + 1}
              </span>
              <span className="text-sm leading-relaxed text-cc-text">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6">
          <InfoCallout title="Secondary sources have a role, but not the final word">
            Secondary sources, like legal encyclopedias or plain-language guides, can help you
            understand a topic quickly. They generally do not replace primary authority — the actual
            constitution, statute, regulation, or court opinion that governs your situation.
          </InfoCallout>
        </div>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="legal-research-basics"
        preferredSlugs={["legal-citations", "legal-terms-glossary", "research-safety"]}
      />

      <ResourceCTA
        heading="Ready to research with a plan?"
        description="Turn what you've learned into a step-by-step research roadmap built around your situation."
        label="Build Your Personalized Research Roadmap"
      />

      <LegalDisclaimer />
    </>
  );
}
