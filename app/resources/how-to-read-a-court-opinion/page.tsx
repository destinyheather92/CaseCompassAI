import type { Metadata } from "next";
import {
  Gavel,
  Calendar,
  History,
  FileText,
  HelpCircle,
  Scale,
  CircleCheckBig,
  Lightbulb,
  Flag,
  Users,
} from "lucide-react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { DefinitionCard } from "@/components/resources/DefinitionCard";
import { ExampleCard } from "@/components/resources/ExampleCard";
import { InfoCallout } from "@/components/resources/InfoCallout";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";

export const metadata: Metadata = buildResourceMetadata("how-to-read-a-court-opinion");

const anatomy = [
  {
    icon: Gavel,
    title: "Case Name",
    description: "The parties involved, usually written as “Party A v. Party B.”",
  },
  {
    icon: Scale,
    title: "Court",
    description:
      "Which court decided the case. The court tells you how much authority the decision carries.",
  },
  {
    icon: Calendar,
    title: "Date",
    description:
      "When the court decided the case. Later cases may affect whether the rule is still current.",
  },
  {
    icon: History,
    title: "Procedural History",
    description:
      "What happened in the courts below before this decision, including who won and why the case was appealed.",
  },
  {
    icon: FileText,
    title: "Facts",
    description: "The relevant events that led to the lawsuit, as the court understood them.",
  },
  {
    icon: HelpCircle,
    title: "Legal Issue",
    description: "The specific legal question the court had to answer to decide the case.",
  },
  {
    icon: Scale,
    title: "Rule of Law",
    description: "The legal rule, statute, or precedent the court applies to answer the issue.",
  },
  {
    icon: CircleCheckBig,
    title: "Holding",
    description:
      "The court's answer to the legal issue — the actual ruling that becomes binding precedent.",
  },
  {
    icon: Lightbulb,
    title: "Reasoning",
    description:
      "The court's explanation for why it reached that holding, including how it applied the rule to the facts.",
  },
  {
    icon: Flag,
    title: "Disposition",
    description:
      "What the court ordered as a result, such as affirming, reversing, or remanding the lower court's decision.",
  },
];

const opinionTypes = [
  {
    icon: Users,
    title: "Majority Opinion",
    description:
      "The opinion joined by more than half of the judges deciding the case. It states the holding and is the binding part of the decision.",
  },
  {
    icon: Users,
    title: "Concurring Opinion",
    description:
      "Written by a judge who agrees with the outcome but wants to explain a different reason, or add a point the majority didn't address.",
  },
  {
    icon: Users,
    title: "Dissenting Opinion",
    description:
      "Written by a judge who disagrees with the outcome. A dissent is not binding, but it can explain weaknesses in the majority's reasoning.",
  },
];

const tips = [
  "Read the case name, court, and date first — they tell you what you're looking at before you read a word of the analysis.",
  "Identify what happened before the appeal, including who won at the lower court and why the case was appealed.",
  "Find the exact question the court decided. Opinions often discuss several related topics, but only one (or a few) is the actual issue decided.",
  "Separate the holding from broader discussion. Comments the court makes that go beyond what was necessary to decide the case are called dicta.",
  "Check whether the opinion is published or unpublished. Unpublished opinions may carry less precedential weight, depending on the court's rules.",
  "Check whether later courts have limited, questioned, or overruled the decision before relying on it.",
];

const faqItems = [
  {
    question: "What if the opinion doesn't use headings for facts, issue, and holding?",
    answer:
      "Many opinions, especially older ones, are written in flowing paragraphs without labeled sections. You'll often need to identify the facts, issue, and holding yourself by reading closely and asking what question the court was actually answering.",
  },
  {
    question: "What is the difference between the holding and dicta?",
    answer:
      "The holding is the court's ruling on the specific legal issue that was necessary to decide the case, and it's what later courts must follow as precedent. Dicta are additional comments, observations, or hypotheticals in the opinion that were not necessary to the decision — they can be persuasive, but they are not binding.",
  },
  {
    question: "Is the holding the same thing as the final result?",
    answer:
      "Not exactly. The final result (or disposition) is the court's order, such as “affirmed” or “reversed and remanded.” The holding is the legal rule the court applied to reach that result. You generally need both to fully understand a case.",
  },
  {
    question: "Why does it matter whether a case has been “limited” or “overruled”?",
    answer:
      "A case that has been overruled is no longer good law and generally cannot be relied on for its original holding. A case that has been limited may still be valid, but only within a narrower set of circumstances than before. Checking a case's later history helps you avoid relying on a rule that no longer applies.",
  },
];

export default function HowToReadACourtOpinionPage() {
  return (
    <>
      <Breadcrumb currentTitle="How to Read a Court Opinion" />
      <ResourceHero
        eyebrow="Legal Research"
        title="How to Read a Court Opinion"
        description="Court opinions can look intimidating, but most follow a recognizable structure. This guide breaks that structure down so you can find the parts that matter."
      />

      <ResourceSection
        id="overview"
        title="Overview"
        description="A court opinion is a written explanation of how and why a court decided a case. Learning to identify its parts helps you separate the binding rule from everything else the court discussed."
      >
        <InfoCallout title="Not every opinion looks the same">
          Not every opinion uses headings for these sections. Some courts label facts, issue, and
          holding clearly. Many do not. You may need to identify each part yourself by reading
          carefully and asking what the court decided and why.
        </InfoCallout>
      </ResourceSection>

      <ResourceSection
        id="anatomy"
        title="Anatomy of a Court Opinion"
        description="Most opinions include some version of these ten parts, even when they aren't labeled."
      >
        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {anatomy.map((part, i) => (
            <li key={part.title} className="relative">
              <span className="absolute -top-2 -left-2 z-10 flex size-6 items-center justify-center rounded-full bg-cc-purple text-[0.65rem] font-bold text-white">
                {i + 1}
              </span>
              <DefinitionCard icon={part.icon} term={part.title} definition={part.description} />
            </li>
          ))}
        </ol>
      </ResourceSection>

      <ResourceSection
        id="opinion-types"
        title="Majority, Concurring, and Dissenting Opinions"
        description="A single case can produce more than one opinion. Here's how to tell them apart."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {opinionTypes.map((type) => (
            <DefinitionCard
              key={type.title}
              icon={type.icon}
              term={type.title}
              definition={type.description}
            />
          ))}
        </div>
      </ResourceSection>

      <ResourceSection
        id="example"
        title="A Labeled Example"
        description="Here is a short, fictional example showing how these parts might appear in a real opinion."
      >
        <ExampleCard title="Sample opinion excerpt" fictional>
          <p>
            <strong className="text-cc-text">Case name &amp; court:</strong> Rivera v. Alden County
            Housing Authority, [Fictional] 88 F.4th 210 (10th Cir. 2024).
          </p>
          <p>
            <strong className="text-cc-text">Facts:</strong> Ms. Rivera was denied housing
            assistance after the agency claimed her application arrived late. She argued she never
            received notice of the deadline.
          </p>
          <p>
            <strong className="text-cc-text">Issue:</strong> Whether the agency&rsquo;s notice procedure
            satisfied due process before denying her benefits.
          </p>
          <p>
            <strong className="text-cc-text">Holding:</strong> The court holds that the agency&rsquo;s
            notice procedure did not satisfy due process because it did not reasonably ensure
            Ms. Rivera would receive actual notice of the deadline.
          </p>
          <p>
            <strong className="text-cc-text">Disposition:</strong> Reversed and remanded for further
            proceedings consistent with this opinion.
          </p>
          <p className="pt-1 text-xs text-cc-muted/80">
            This example and citation are entirely fictional and were created for teaching
            purposes only. They do not refer to any real case.
          </p>
        </ExampleCard>
      </ResourceSection>

      <ResourceSection
        id="tips"
        title="Helpful Tips"
        description="A few habits that make reading opinions faster and more reliable."
      >
        <ul className="space-y-3">
          {tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-3 rounded-xl border border-cc-border bg-cc-card px-4 py-3 text-sm leading-relaxed text-cc-muted"
            >
              <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
              {tip}
            </li>
          ))}
        </ul>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="how-to-read-a-court-opinion"
        preferredSlugs={["legal-citations", "legal-research-basics", "research-safety"]}
      />

      <ResourceCTA
        heading="Ready to break down a real opinion?"
        description="See how CaseCompass organizes an opinion into facts, issue, rule, holding, reasoning, and why it matters."
        label="Try the Case Breakdown Tool"
      />

      <LegalDisclaimer />
    </>
  );
}
