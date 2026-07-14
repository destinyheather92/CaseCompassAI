import type { Metadata } from "next";
import { CircleCheckBig } from "lucide-react";
import { Breadcrumb } from "@/components/resources/Breadcrumb";
import { ResourceHero } from "@/components/resources/ResourceHero";
import { ResourceSection } from "@/components/resources/ResourceSection";
import { CitationBreakdown, type CitationSegment } from "@/components/resources/CitationBreakdown";
import { InfoCallout } from "@/components/resources/InfoCallout";
import { FAQAccordion } from "@/components/resources/FAQAccordion";
import { RelatedResourceCards } from "@/components/resources/RelatedResourceCards";
import { ResourceCTA } from "@/components/resources/ResourceCTA";
import { LegalDisclaimer } from "@/components/resources/LegalDisclaimer";
import { buildResourceMetadata } from "@/lib/resources-metadata";

export const metadata: Metadata = buildResourceMetadata("legal-citations");

const roeSegments: CitationSegment[] = [
  { text: "410", label: "Reporter Volume", definition: "The volume number of the reporter — the book series — where the case is published." },
  { text: " U.S. ", label: "Reporter Abbreviation", definition: "“U.S.” stands for United States Reports, the official reporter for U.S. Supreme Court decisions." },
  { text: "113", label: "First Page", definition: "The page in that volume where the case begins." },
  { text: " (1973)", label: "Year", definition: "The year the case was decided." },
];

const brownSegments: CitationSegment[] = [
  { text: "347", label: "Reporter Volume", definition: "The volume number of the reporter where the case is published." },
  { text: " U.S. ", label: "Reporter Abbreviation", definition: "“U.S.” stands for United States Reports, the official reporter for U.S. Supreme Court decisions." },
  { text: "483", label: "First Page", definition: "The page in that volume where the case begins." },
  { text: " (1954)", label: "Year", definition: "The year the case was decided." },
];

const statuteSegments: CitationSegment[] = [
  { text: "18", label: "Title Number", definition: "The title, or major division, of the United States Code." },
  { text: " U.S.C. ", label: "Code Abbreviation", definition: "“U.S.C.” stands for United States Code, the official compilation of federal statutes." },
  { text: "§", label: "Section Symbol", definition: "The section symbol marks the start of a specific numbered section." },
  { text: " 922", label: "Section Number", definition: "The specific section number within the title." },
];

const pinpointSegments: CitationSegment[] = [
  { text: "Roe v. Wade", label: "Case Name", definition: "The names of the parties, usually written as “Party A v. Party B.”" },
  { text: ", 410", label: "Reporter Volume", definition: "The volume of the reporter where the case is published." },
  { text: " U.S. ", label: "Reporter Abbreviation", definition: "The abbreviation for the reporter series — here, United States Reports." },
  { text: "113", label: "First Page", definition: "The page where the case begins." },
  { text: ", 164", label: "Pinpoint Citation", definition: "A specific page within the case being referenced — used to point to a particular passage rather than the whole opinion." },
  { text: " (1973)", label: "Year", definition: "The year the case was decided." },
];

const courtSegments: CitationSegment[] = [
  { text: "Doe v. State", label: "Case Name", definition: "The names of the parties in this fictional case." },
  { text: ", 12", label: "Reporter Volume", definition: "The volume of the reporter where the case is published." },
  { text: " F.4th ", label: "Reporter Abbreviation", definition: "“F.4th” stands for Federal Reporter, Fourth Series, which publishes U.S. Court of Appeals decisions." },
  { text: "55", label: "First Page", definition: "The page where the case begins." },
  { text: " (9th Cir. ", label: "Court", definition: "The court that decided the case — here, a fictional stand-in for the U.S. Court of Appeals for the Ninth Circuit." },
  { text: "2021)", label: "Year", definition: "The year the case was decided." },
];

const faqItems = [
  {
    question: "Does a citation tell me whether a case is still good law?",
    answer:
      "No. A citation only tells you where to find a source — it doesn't tell you whether that source is still valid, whether it's been overruled, or whether it applies to your situation. You have to check those separately.",
  },
  {
    question: "Why do citation formats look different for cases versus statutes?",
    answer:
      "Cases are published in reporters organized by volume and page, so case citations reference a volume, reporter abbreviation, and page. Statutes are organized by title and section within a code, so statutory citations reference a title number, code abbreviation, and section number instead.",
  },
  {
    question: "Are citation formats the same in every court?",
    answer:
      "No. Federal courts, state courts, agencies, and local court rules can all use different citation conventions. Many courts follow a widely used style guide, but always check the specific requirements of the court you're dealing with.",
  },
  {
    question: "What is a pinpoint citation for?",
    answer:
      "A pinpoint citation (sometimes called a “jump cite”) points to a specific page within a case, rather than just the page where the case begins. It's used when referencing a particular passage or quote.",
  },
];

export default function LegalCitationsPage() {
  return (
    <>
      <Breadcrumb currentTitle="Understanding Legal Citations" />
      <ResourceHero
        eyebrow="Legal Research"
        title="Understanding Legal Citations"
        description="A legal citation is like an address — it tells you exactly where to find a source. This guide breaks real citations down piece by piece so you can read them with confidence."
      />

      <ResourceSection
        id="what-a-citation-does"
        title="What a Citation Does"
        description="A citation identifies where a legal source — a case, statute, or regulation — can be found, so it can be located and verified by anyone."
      >
        <InfoCallout title="A citation doesn't prove a source still applies">
          A citation helps you locate a source. It does not, by itself, establish whether that
          source is still valid or whether it applies to your case. Always read the source and
          check its current status.
        </InfoCallout>
      </ResourceSection>

      <ResourceSection
        id="case-citations"
        title="Breaking Down a Case Citation"
        description="Select any highlighted part of the citations below to see what it means."
      >
        <div className="space-y-6">
          <CitationBreakdown segments={roeSegments} />
          <CitationBreakdown segments={brownSegments} />
        </div>
      </ResourceSection>

      <ResourceSection
        id="statute-citations"
        title="Breaking Down a Statute Citation"
        description="Statutory citations reference a title and section in a code, rather than a volume and page in a reporter."
      >
        <CitationBreakdown segments={statuteSegments} />
      </ResourceSection>

      <ResourceSection
        id="full-citations"
        title="Case Name, Pinpoint Citations, and Court"
        description="Full citations often include more than just the reporter reference. These two examples show a real pinpoint citation and a fictional example showing how a court abbreviation appears."
      >
        <div className="space-y-6">
          <CitationBreakdown segments={pinpointSegments} />
          <CitationBreakdown segments={courtSegments} fictional />
        </div>
      </ResourceSection>

      <ResourceSection
        id="format-varies"
        title="Formats Vary by Source"
        description="There isn't one universal citation format."
      >
        <ul className="space-y-3">
          {[
            "Federal court citations often differ from state court citations.",
            "Statutes are cited by title and section, not by volume and page.",
            "Regulations follow their own citation conventions, separate from statutes.",
            "Individual courts may have local rules governing how citations must be formatted in filings.",
          ].map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-cc-border bg-cc-card px-4 py-3 text-sm leading-relaxed text-cc-muted"
            >
              <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-cc-teal" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </ResourceSection>

      <ResourceSection id="faq" title="Frequently Asked Questions">
        <FAQAccordion items={faqItems} />
      </ResourceSection>

      <RelatedResourceCards
        current="legal-citations"
        preferredSlugs={["how-to-read-a-court-opinion", "legal-research-basics", "legal-terms-glossary"]}
      />

      <ResourceCTA
        heading="Want to see citations in context?"
        description="Explore how CaseCompass surfaces and explains citations inside real case breakdowns."
        label="Explore Case Breakdowns"
      />

      <LegalDisclaimer />
    </>
  );
}
