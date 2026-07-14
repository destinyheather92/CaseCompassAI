import type { Metadata } from "next";
import { CircleCheckBig, CircleX } from "lucide-react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { WarningCallout } from "@/components/resources/WarningCallout";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";

export const metadata: Metadata = buildResourceMetadata("what-casecompass-can-and-cannot-do");

const canDo = [
  "Explain legal terms",
  "Simplify difficult legal writing",
  "Break down court opinions",
  "Help organize facts",
  "Identify possible research topics",
  "Create educational research roadmaps",
  "Show relevant sources",
  "Help users understand citations",
  "Help users save and organize research",
];

const cannotDo = [
  "Provide legal advice",
  "Form an attorney-client relationship",
  "Predict a court outcome",
  "Guarantee legal accuracy",
  "Guarantee that a source applies to a user's case",
  "Replace an attorney",
  "Represent a user",
  "File legal documents",
  "Calculate or extend court deadlines",
  "Make legal decisions for the user",
  "Verify every fact entered by the user",
];

const faqItems = [
  {
    question: "If CaseCompass can explain the law, why can't it give legal advice?",
    answer:
      "Explaining what a law generally says is legal education. Legal advice means applying the law to your specific facts and telling you what to do — that requires a licensed attorney who can be held professionally accountable for that judgment, and who has reviewed the full details of your situation.",
  },
  {
    question: "Can CaseCompass tell me if I have a good case?",
    answer:
      "No. Predicting how a court would rule, or evaluating the strength of a case, is a legal judgment that requires an attorney. CaseCompass can help you understand relevant law and organize your research instead.",
  },
  {
    question: "Will CaseCompass remind me about deadlines?",
    answer:
      "CaseCompass does not calculate, track, or extend legal deadlines. Deadlines in legal matters are often strict and vary by court and case type, so confirm them directly with the relevant court, agency, or an attorney.",
  },
  {
    question: "Does CaseCompass check whether the facts I enter are accurate?",
    answer:
      "No. CaseCompass does not verify facts you provide. The research and explanations it gives are only as good as the information entered, so it's important to describe your situation as accurately as you can.",
  },
];

export default function WhatCaseCompassCanAndCannotDoPage() {
  return (
    <>
      <Breadcrumb currentTitle="What CaseCompass Can and Cannot Do" />
      <ResourceHero
        eyebrow="About CaseCompass"
        title="What CaseCompass Can and Cannot Do"
        description="Being clear about our limits is part of being useful. Here's an honest breakdown of what CaseCompass helps with, and what it doesn't."
      />

      <ResourceSection id="statement" title="The Short Version">
        <WarningCallout title="Direction, not decisions">
          CaseCompass helps users understand what to research. It does not tell users what legal
          action they should take.
        </WarningCallout>
      </ResourceSection>

      <ResourceSection id="comparison" title="A Balanced Look">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="glass-card rounded-2xl border-cc-teal/30 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-cc-text">
              <CircleCheckBig className="size-5 text-cc-teal" aria-hidden="true" />
              CaseCompass CAN
            </h3>
            <ul className="mt-4 space-y-3">
              {canDo.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-cc-muted">
                  <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card rounded-2xl border-cc-purple/30 p-6">
            <h3 className="flex items-center gap-2 text-lg font-bold text-cc-text">
              <CircleX className="size-5 text-cc-purple" aria-hidden="true" />
              CaseCompass CANNOT
            </h3>
            <ul className="mt-4 space-y-3">
              {cannotDo.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-cc-muted">
                  <CircleX className="mt-0.5 size-4 shrink-0 text-cc-purple" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="what-casecompass-can-and-cannot-do"
        preferredSlugs={["research-safety", "legal-research-basics", "how-to-read-a-court-opinion"]}
      />

      <ResourceCTA
        heading="Know the limits. Use the roadmap."
        description="Now that you know what CaseCompass does, put it to work organizing your own research."
        label="Build My Research Roadmap"
      />

      <LegalDisclaimer />
    </>
  );
}
