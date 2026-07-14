import type { LegalSource, LegalSourceProvider, LegalTermDefinition } from "./types";

const DISCLAIMER = "General legal education only. Not legal advice.";
const LAST_VERIFIED = "2026-01-15";

const USCOURTS_GLOSSARY: LegalSource = {
  title: "U.S. Courts — Glossary of Legal Terms",
  url: "https://www.uscourts.gov/glossary",
  sourceType: "official",
};

function lii(slug: string, label: string): LegalSource {
  return {
    title: `Cornell Law School Legal Information Institute — ${label}`,
    url: `https://www.law.cornell.edu/wex/${slug}`,
    sourceType: "cornell-lii",
  };
}

export type CuratedGlossaryEntry = LegalTermDefinition & {
  slug: string;
  /** Shown in the page's curated 24-term introduction grid. */
  featured: boolean;
};

/**
 * A hand-authored, human-reviewed glossary. This is the first (and, in this
 * deployment, only reliably available) stop in the retrieval pipeline —
 * every entry here has a verified plain-language definition and real
 * source citations, so results never depend on a model "recalling" a
 * definition from memory.
 */
export const curatedGlossary: CuratedGlossaryEntry[] = [
  {
    slug: "affidavit",
    term: "Affidavit",
    plainLanguageDefinition:
      "A written statement of facts that a person swears is true, usually signed in front of a notary or other authorized official.",
    formalDefinition:
      "A voluntary written statement of facts confirmed by the oath or affirmation of the person making it, administered by an officer authorized to administer oaths.",
    category: "Evidence",
    example:
      "A witness signs an affidavit describing what they saw during a car accident so the statement can be used later in court.",
    relatedTerms: ["Testimony", "Declaration", "Evidence"],
    jurisdictionNote: "Notarization and formatting requirements can vary by state.",
    sources: [lii("affidavit", "Affidavit"), USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "appeal",
    term: "Appeal",
    plainLanguageDefinition:
      "A request asking a higher court to review and change the decision of a lower court.",
    formalDefinition:
      "A proceeding in which a case is brought before a higher court for review of a lower court's decision.",
    category: "Court Process",
    example:
      "After losing at trial, a party files an appeal asking the court of appeals to review whether the trial judge applied the law correctly.",
    relatedTerms: ["Appellant", "Appellee", "Holding"],
    jurisdictionNote: "Appeal deadlines and procedures differ between state and federal courts.",
    sources: [USCOURTS_GLOSSARY, lii("appeal", "Appeal")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "appellant",
    term: "Appellant",
    plainLanguageDefinition: "The party who asks a higher court to review a lower court's decision.",
    formalDefinition: "The party who files an appeal.",
    category: "Court Process",
    example: "If a defendant loses at trial and appeals, that defendant becomes the appellant.",
    relatedTerms: ["Appeal", "Appellee"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "appellee",
    term: "Appellee",
    plainLanguageDefinition:
      "The party in a case who did not appeal and must respond to the appellant's arguments.",
    formalDefinition:
      "The party against whom an appeal is filed; sometimes called the respondent.",
    category: "Court Process",
    example:
      "If the losing party at trial appeals, the winning party who must respond is the appellee.",
    relatedTerms: ["Appeal", "Appellant"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "brief",
    term: "Brief",
    plainLanguageDefinition:
      "A written legal document that presents a party's arguments and supporting law to a court.",
    formalDefinition:
      "A written statement submitted by a party arguing why the court should rule in that party's favor.",
    category: "Court Process",
    example:
      "Before oral argument, each side files a brief explaining why the appeals court should affirm or reverse the trial court's decision.",
    relatedTerms: ["Motion", "Opinion", "Appeal"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY, lii("brief", "Brief")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "burden-of-proof",
    term: "Burden of Proof",
    plainLanguageDefinition:
      "The duty to prove a disputed fact, and the level of certainty required to prove it.",
    formalDefinition:
      "The obligation of a party to establish a fact or issue to the degree required by law, such as 'beyond a reasonable doubt' in criminal cases or 'preponderance of the evidence' in most civil cases.",
    category: "Evidence",
    example:
      "In a criminal trial, the prosecution has the burden of proof and must convince the jury beyond a reasonable doubt.",
    relatedTerms: ["Preponderance of the Evidence", "Evidence", "Conviction"],
    jurisdictionNote: "The required standard can differ by case type and jurisdiction.",
    sources: [lii("burden_of_proof", "Burden of Proof")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "citation",
    term: "Citation",
    plainLanguageDefinition:
      "A reference that identifies where a legal source, such as a case, statute, or regulation, can be found.",
    formalDefinition:
      "A standardized reference to the volume, source, and page or section where a legal authority is published.",
    category: "Legal Research",
    example:
      "\"410 U.S. 113 (1973)\" tells you the case appears in volume 410 of the United States Reports, starting at page 113, decided in 1973.",
    relatedTerms: ["Precedent", "Statute", "Jurisdiction"],
    jurisdictionNote: "Citation formats vary between federal courts, state courts, and secondary sources.",
    sources: [lii("citation", "Citation")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "complaint",
    term: "Complaint",
    plainLanguageDefinition:
      "The document that starts a civil lawsuit by describing the plaintiff's claims against the defendant.",
    formalDefinition:
      "The initial pleading that sets out the plaintiff's factual allegations and legal claims and asks the court for relief.",
    category: "Civil Law",
    example:
      "A tenant who was injured by a broken staircase files a complaint against the landlord asking for compensation.",
    relatedTerms: ["Plaintiff", "Defendant", "Motion"],
    jurisdictionNote: "Filing requirements and required contents differ by court.",
    sources: [USCOURTS_GLOSSARY, lii("complaint", "Complaint")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "conviction",
    term: "Conviction",
    plainLanguageDefinition:
      "A formal court finding, usually after a trial or guilty plea, that a person is guilty of a crime.",
    formalDefinition:
      "The judgment of a court, based on a guilty plea or a verdict, that a defendant is guilty of a criminal offense.",
    category: "Criminal Law",
    example: "After a jury finds the defendant guilty of theft, the court enters a conviction on the record.",
    relatedTerms: ["Verdict", "Indictment", "Arraignment"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "defendant",
    term: "Defendant",
    plainLanguageDefinition:
      "The person or organization being sued in a civil case or accused of a crime in a criminal case.",
    formalDefinition: "The party against whom a civil action or criminal prosecution is brought.",
    category: "Court Process",
    example: "In a lawsuit over a car accident, the driver who is being sued is the defendant.",
    relatedTerms: ["Plaintiff", "Complaint", "Indictment"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "dissent",
    term: "Dissent",
    plainLanguageDefinition:
      "A separate opinion written by a judge who disagrees with the majority's decision in a case.",
    formalDefinition:
      "A written opinion by one or more judges explaining their disagreement with the outcome or reasoning of the majority opinion.",
    category: "Court Process",
    example:
      "Three judges vote to uphold a law, while one judge writes a dissent explaining why they believe the law is unconstitutional.",
    relatedTerms: ["Opinion", "Holding", "Precedent"],
    jurisdictionNote: "",
    sources: [lii("dissent", "Dissent")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "due-process",
    term: "Due Process",
    plainLanguageDefinition:
      "The constitutional guarantee that the government must follow fair procedures and respect legal rights before taking away a person's life, liberty, or property.",
    formalDefinition:
      "The principle, rooted in the Fifth and Fourteenth Amendments, that the government must provide fair procedures and act within the bounds of established law before depriving a person of life, liberty, or property.",
    category: "Constitutional Law",
    example:
      "Before a public school can suspend a student for a serious violation, due process generally requires notice of the charges and a chance to respond.",
    relatedTerms: ["Fourteenth Amendment", "Habeas Corpus", "Jurisdiction"],
    jurisdictionNote:
      "Specific procedural requirements can vary depending on the type of right at stake and the level of government involved.",
    sources: [lii("due_process", "Due Process")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "evidence",
    term: "Evidence",
    plainLanguageDefinition:
      "Information presented in court, such as documents, testimony, or physical objects, used to prove or disprove a fact.",
    formalDefinition:
      "Testimony, documents, or tangible objects offered to prove or disprove a fact in a legal proceeding.",
    category: "Evidence",
    example:
      "A security camera recording introduced to show what happened during an alleged theft is a form of evidence.",
    relatedTerms: ["Burden of Proof", "Affidavit", "Deposition"],
    jurisdictionNote: "Rules about what evidence can be used differ between federal and state courts.",
    sources: [USCOURTS_GLOSSARY, lii("evidence", "Evidence")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "exhaustion-of-remedies",
    term: "Exhaustion of Remedies",
    plainLanguageDefinition:
      "A rule that generally requires a person to complete all available steps within an agency or lower process before asking a court to intervene.",
    formalDefinition:
      "A legal doctrine requiring a party to pursue and complete all available administrative or procedural remedies before seeking judicial review.",
    category: "Court Process",
    example:
      "Before suing a government agency, a person may first need to complete the agency's internal appeal process.",
    relatedTerms: ["Jurisdiction", "Standing", "Motion"],
    jurisdictionNote:
      "Whether exhaustion is required, and any exceptions, depend heavily on the specific law and agency involved.",
    sources: [lii("exhaustion_of_remedies", "Exhaustion of Remedies")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "habeas-corpus",
    term: "Habeas Corpus",
    plainLanguageDefinition:
      "A legal action that lets a person challenge the legality of their detention or imprisonment.",
    formalDefinition:
      "A writ used to bring a detained person before a court to determine whether the detention is lawful.",
    category: "Constitutional Law",
    example:
      "A person who believes they are being held in violation of their constitutional rights can file a habeas corpus petition asking a court to review the detention.",
    relatedTerms: ["Due Process", "Writ", "Jurisdiction"],
    jurisdictionNote: "Procedures and available grounds differ between state and federal habeas review.",
    sources: [lii("habeas_corpus", "Habeas Corpus")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "holding",
    term: "Holding",
    plainLanguageDefinition:
      "The court's specific legal ruling on the issue actually decided in a case, which becomes binding precedent.",
    formalDefinition:
      "The court's determination of the legal question presented, distinguished from dicta — side comments that were not necessary to the decision.",
    category: "Legal Research",
    example:
      "If a court rules that a specific search was unconstitutional because officers lacked a warrant, that ruling is the holding, even if the opinion also discusses other search situations in passing.",
    relatedTerms: ["Precedent", "Opinion", "Dissent"],
    jurisdictionNote: "",
    sources: [lii("holding", "Holding")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "indictment",
    term: "Indictment",
    plainLanguageDefinition:
      "A formal written accusation, typically issued by a grand jury, charging a person with a serious crime.",
    formalDefinition:
      "A formal charging document returned by a grand jury finding probable cause that a person committed a felony.",
    category: "Criminal Law",
    example: "A grand jury reviews evidence and issues an indictment charging a person with armed robbery.",
    relatedTerms: ["Probable Cause", "Arraignment", "Conviction"],
    jurisdictionNote: "Not all jurisdictions require grand jury indictments for all felony charges.",
    sources: [USCOURTS_GLOSSARY, lii("indictment", "Indictment")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "jurisdiction",
    term: "Jurisdiction",
    plainLanguageDefinition: "A court's legal authority to hear and decide a particular case.",
    formalDefinition:
      "The power of a court to hear a case, decide the issues, and enter a binding judgment, based on subject matter, geography, or the parties involved.",
    category: "Legal Research",
    example:
      "A state family court generally has jurisdiction over divorce cases, while a federal court generally does not unless another basis for federal jurisdiction exists.",
    relatedTerms: ["Standing", "Exhaustion of Remedies", "Statute"],
    jurisdictionNote: "Rules for establishing jurisdiction vary significantly between state and federal systems.",
    sources: [USCOURTS_GLOSSARY, lii("jurisdiction", "Jurisdiction")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "motion",
    term: "Motion",
    plainLanguageDefinition:
      "A formal written or oral request asking a court to make a ruling or take a specific action.",
    formalDefinition: "An application to the court requesting an order or ruling on a particular issue.",
    category: "Court Process",
    example:
      "A party files a motion to dismiss, asking the court to end the case before trial because the complaint does not state a valid legal claim.",
    relatedTerms: ["Brief", "Complaint", "Opinion"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY, lii("motion", "Motion")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "opinion",
    term: "Opinion",
    plainLanguageDefinition: "A court's written explanation of its decision and the reasons behind it.",
    formalDefinition:
      "The document issued by a court setting out its ruling, the facts, and the legal reasoning supporting the decision.",
    category: "Court Process",
    example:
      "After deciding an appeal, the court issues a written opinion explaining why it affirmed the lower court's ruling.",
    relatedTerms: ["Holding", "Dissent", "Precedent"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY, lii("opinion", "Opinion")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "plaintiff",
    term: "Plaintiff",
    plainLanguageDefinition: "The person or organization who starts a civil lawsuit.",
    formalDefinition: "The party who initiates a civil action by filing a complaint against the defendant.",
    category: "Court Process",
    example:
      "A person injured in a car accident who files a lawsuit against the other driver is the plaintiff.",
    relatedTerms: ["Defendant", "Complaint"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "precedent",
    term: "Precedent",
    plainLanguageDefinition:
      "A previously decided case that guides how courts decide similar cases in the future.",
    formalDefinition:
      "A court decision that serves as an authoritative rule or example for resolving later cases involving similar facts or legal issues.",
    category: "Legal Research",
    example:
      "A state supreme court ruling on how a specific statute should be interpreted becomes precedent that lower courts in that state generally must follow.",
    relatedTerms: ["Stare Decisis", "Holding", "Citation"],
    jurisdictionNote:
      "Whether a precedent is binding or only persuasive depends on the deciding court and the jurisdiction of the later case.",
    sources: [lii("precedent", "Precedent")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "probable-cause",
    term: "Probable Cause",
    plainLanguageDefinition:
      "A reasonable basis, grounded in facts, for believing that a crime has been committed or that evidence of a crime exists in a particular place.",
    formalDefinition:
      "A reasonable belief, based on articulable facts, that a person has committed a crime or that a specific location contains evidence of a crime, required for arrests, searches, and warrants.",
    category: "Criminal Law",
    example:
      "Officers who see someone matching a robbery suspect's description leaving the scene with a bag of cash may have probable cause to make an arrest.",
    relatedTerms: ["Indictment", "Jurisdiction", "Evidence"],
    jurisdictionNote: "",
    sources: [lii("probable_cause", "Probable Cause")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },
  {
    slug: "statute",
    term: "Statute",
    plainLanguageDefinition: "A written law formally enacted by a legislature.",
    formalDefinition:
      "A law passed by a legislative body, such as Congress or a state legislature, and codified in an official code.",
    category: "Legal Research",
    example:
      "A federal law restricting who may purchase a firearm is a statute, such as one found in Title 18 of the U.S. Code.",
    relatedTerms: ["Citation", "Jurisdiction", "Precedent"],
    jurisdictionNote: "Statutes can be federal, state, or local, and their content varies widely by jurisdiction.",
    sources: [USCOURTS_GLOSSARY, lii("statute", "Statute")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: true,
  },

  // Additional terms available through search but not shown in the
  // introductory grid, keeping the curated page focused while still giving
  // the search tool meaningful coverage out of the box.
  {
    slug: "res-judicata",
    term: "Res Judicata",
    plainLanguageDefinition:
      "A rule that usually prevents the same dispute from being decided again after a court has already entered a final decision.",
    formalDefinition:
      "A common-law doctrine, also called claim preclusion, that bars parties from relitigating a claim that has already been resolved by a final judgment on the merits in a prior case involving the same parties.",
    category: "Civil Procedure",
    example:
      "After a court issues a final judgment resolving a contract dispute between two businesses, res judicata generally prevents either business from filing a new lawsuit over the same claim.",
    relatedTerms: ["Claim Preclusion", "Issue Preclusion", "Final Judgment"],
    jurisdictionNote: "Application may vary by jurisdiction and case type.",
    sources: [lii("res_judicata", "Res Judicata")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "tort",
    term: "Tort",
    plainLanguageDefinition:
      "A civil wrong, other than a broken contract, that causes harm to another person and can lead to legal liability.",
    formalDefinition:
      "A breach of a duty imposed by law, other than a contractual duty, that causes harm and gives the injured party a right to seek compensation.",
    category: "Civil Law",
    example: "A driver who runs a red light and injures a pedestrian may be liable for the tort of negligence.",
    relatedTerms: ["Negligence", "Damages", "Plaintiff"],
    jurisdictionNote: "Tort rules and available damages vary significantly by state.",
    sources: [lii("tort", "Tort")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "negligence",
    term: "Negligence",
    plainLanguageDefinition: "The failure to use reasonable care, resulting in harm to another person.",
    formalDefinition:
      "The failure to exercise the degree of care that a reasonably prudent person would exercise in similar circumstances, causing injury to another.",
    category: "Civil Law",
    example: "A store that fails to clean up a spill and causes a customer to slip may be liable for negligence.",
    relatedTerms: ["Tort", "Burden of Proof", "Damages"],
    jurisdictionNote: "",
    sources: [lii("negligence", "Negligence")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "summary-judgment",
    term: "Summary Judgment",
    plainLanguageDefinition:
      "A court ruling that decides a case, or part of it, without a full trial because there is no genuine factual dispute requiring one.",
    formalDefinition:
      "A judgment entered by a court when the pleadings, evidence, and affidavits show there is no genuine issue of material fact and a party is entitled to judgment as a matter of law.",
    category: "Civil Procedure",
    example:
      "If undisputed documents show a contract was never signed, a court may grant summary judgment without holding a trial.",
    relatedTerms: ["Motion", "Evidence", "Complaint"],
    jurisdictionNote: "",
    sources: [lii("summary_judgment", "Summary Judgment")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "subpoena",
    term: "Subpoena",
    plainLanguageDefinition: "A legal order requiring a person to testify or produce documents.",
    formalDefinition:
      "A writ commanding a person to appear and give testimony, or to produce documents or other evidence, in a legal proceeding.",
    category: "Evidence",
    example: "A witness receives a subpoena ordering them to appear in court to testify about what they saw.",
    relatedTerms: ["Testimony", "Evidence", "Deposition"],
    jurisdictionNote: "",
    sources: [lii("subpoena", "Subpoena")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "injunction",
    term: "Injunction",
    plainLanguageDefinition: "A court order requiring a person or organization to do, or stop doing, a specific act.",
    formalDefinition:
      "An equitable remedy in which a court orders a party to act, or refrain from acting, in a specified way.",
    category: "Civil Law",
    example: "A court issues an injunction ordering a company to stop dumping waste into a nearby river.",
    relatedTerms: ["Motion", "Complaint", "Standing"],
    jurisdictionNote: "",
    sources: [lii("injunction", "Injunction")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "standing",
    term: "Standing",
    plainLanguageDefinition: "The legal right to bring a lawsuit, based on having a real stake in the outcome.",
    formalDefinition:
      "A party's right to bring a legal claim, generally requiring a concrete injury caused by the defendant that a court can remedy.",
    category: "Legal Research",
    example:
      "A person who was directly injured by a defective product generally has standing to sue the manufacturer, while an unrelated bystander typically does not.",
    relatedTerms: ["Jurisdiction", "Exhaustion of Remedies", "Complaint"],
    jurisdictionNote: "",
    sources: [lii("standing", "Standing")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "stare-decisis",
    term: "Stare Decisis",
    plainLanguageDefinition: "The legal principle that courts should follow precedent when deciding similar cases.",
    formalDefinition:
      "The doctrine that courts should adhere to previously decided cases when the same points arise again in litigation, promoting consistency and predictability.",
    category: "Legal Research",
    example:
      "A trial court generally must follow a binding ruling from a higher court in the same jurisdiction under stare decisis.",
    relatedTerms: ["Precedent", "Holding", "Binding Authority"],
    jurisdictionNote: "",
    sources: [lii("stare_decisis", "Stare Decisis")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "voir-dire",
    term: "Voir Dire",
    plainLanguageDefinition: "The process of questioning potential jurors to decide who will serve on a jury.",
    formalDefinition:
      "The jury selection process in which attorneys and the judge question prospective jurors to identify bias and determine who will serve.",
    category: "Court Process",
    example: "During voir dire, attorneys ask potential jurors about their backgrounds and possible biases.",
    relatedTerms: ["Verdict", "Opinion"],
    jurisdictionNote: "",
    sources: [lii("voir_dire", "Voir Dire")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "remand",
    term: "Remand",
    plainLanguageDefinition: "When a higher court sends a case back to a lower court for further action.",
    formalDefinition:
      "An appellate court's act of returning a case to the court from which it came, usually with instructions for further proceedings.",
    category: "Court Process",
    example:
      "An appeals court reverses a ruling and remands the case to the trial court to reconsider it under the correct legal standard.",
    relatedTerms: ["Appeal", "Holding", "Opinion"],
    jurisdictionNote: "",
    sources: [lii("remand", "Remand")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "writ",
    term: "Writ",
    plainLanguageDefinition: "A formal written court order directing a person to do, or stop doing, something.",
    formalDefinition: "A written order issued by a court commanding the recipient to perform, or cease, a specified act.",
    category: "Court Process",
    example: "A court issues a writ of habeas corpus ordering officials to bring a detained person before it.",
    relatedTerms: ["Habeas Corpus", "Motion"],
    jurisdictionNote: "",
    sources: [lii("writ", "Writ")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "pro-se",
    term: "Pro Se",
    plainLanguageDefinition: "Representing yourself in court without a lawyer.",
    formalDefinition: "Appearing in a legal proceeding on one's own behalf, without representation by an attorney.",
    category: "Court Process",
    example: "A tenant who cannot afford a lawyer chooses to represent themselves pro se in small claims court.",
    relatedTerms: ["Plaintiff", "Defendant", "Motion"],
    jurisdictionNote: "Courts may have different rules or forms available for pro se litigants.",
    sources: [lii("pro_se", "Pro Se")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "class-action",
    term: "Class Action",
    plainLanguageDefinition:
      "A lawsuit brought by one or more people on behalf of a larger group of people with similar claims.",
    formalDefinition:
      "A procedural device that permits one or more plaintiffs to sue on behalf of a larger group, or class, whose members share common legal or factual issues.",
    category: "Civil Law",
    example:
      "Consumers who bought a defective product join together in a class action instead of each filing a separate lawsuit.",
    relatedTerms: ["Plaintiff", "Complaint", "Standing"],
    jurisdictionNote: "",
    sources: [lii("class_action", "Class Action")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "deposition",
    term: "Deposition",
    plainLanguageDefinition: "Sworn out-of-court testimony given by a witness as part of the discovery process.",
    formalDefinition:
      "Testimony taken under oath outside of court, usually recorded by a court reporter, as part of pretrial discovery.",
    category: "Evidence",
    example: "Before trial, attorneys question a witness under oath in a deposition to learn what they know.",
    relatedTerms: ["Subpoena", "Evidence", "Testimony"],
    jurisdictionNote: "",
    sources: [lii("deposition", "Deposition")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "verdict",
    term: "Verdict",
    plainLanguageDefinition: "A jury's, or in some cases a judge's, formal decision on the factual issues in a trial.",
    formalDefinition: "The formal decision or finding made by a jury, or by a judge in a bench trial, on the factual questions submitted to it.",
    category: "Court Process",
    example: "After deliberating, the jury returns a verdict finding the defendant not guilty.",
    relatedTerms: ["Conviction", "Voir Dire", "Evidence"],
    jurisdictionNote: "",
    sources: [USCOURTS_GLOSSARY, lii("verdict", "Verdict")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "arraignment",
    term: "Arraignment",
    plainLanguageDefinition:
      "A court hearing where a criminal defendant is formally told the charges against them and enters a plea.",
    formalDefinition:
      "A criminal proceeding at which the defendant is informed of the charges in the indictment or complaint and enters a plea.",
    category: "Criminal Law",
    example: "At the arraignment, the defendant hears the charges and pleads not guilty.",
    relatedTerms: ["Indictment", "Conviction", "Defendant"],
    jurisdictionNote: "",
    sources: [lii("arraignment", "Arraignment")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "certiorari",
    term: "Certiorari",
    plainLanguageDefinition:
      "A request asking a higher court, most often the U.S. Supreme Court, to review a decision from a lower court.",
    formalDefinition:
      "A discretionary writ by which a higher court agrees to review the record of a lower court's proceeding; the U.S. Supreme Court grants certiorari in only a small fraction of the petitions it receives.",
    category: "Court Process",
    example:
      "After losing in a federal court of appeals, a party files a petition for certiorari asking the U.S. Supreme Court to take up the case, but the Court is not required to grant it.",
    relatedTerms: ["Appeal", "Writ", "Precedent"],
    jurisdictionNote:
      "A denial of certiorari is not a ruling on the merits — it does not mean the higher court agrees with the lower court's decision.",
    sources: [lii("certiorari", "Certiorari")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "amicus-curiae",
    term: "Amicus Curiae",
    plainLanguageDefinition:
      "Latin for “friend of the court” — a person or group who is not a party to a case but offers information or arguments to help the court decide it.",
    formalDefinition:
      "A non-party who petitions the court, or is requested by the court, to file a brief because they have a strong interest in or valuable perspective on the subject matter.",
    category: "Court Process",
    example:
      "A civil rights organization files an amicus curiae brief in a case it is not a party to, explaining how the ruling could affect people beyond the two sides in the lawsuit.",
    relatedTerms: ["Brief", "Opinion", "Precedent"],
    jurisdictionNote: "Rules for who may file an amicus brief, and when, vary by court.",
    sources: [lii("amicus_curiae", "Amicus Curiae")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
  {
    slug: "en-banc",
    term: "En Banc",
    plainLanguageDefinition:
      "A case heard by all (or most) of the judges of a court, instead of the usual smaller panel.",
    formalDefinition:
      "A session in which a case is heard before all the judges of a court, rather than a standard panel, typically used for cases of exceptional importance.",
    category: "Court Process",
    example:
      "After a three-judge panel issues a ruling, the full court of appeals agrees to rehear the case en banc.",
    relatedTerms: ["Appeal", "Opinion", "Precedent"],
    jurisdictionNote: "Not all courts use en banc review, and the standards for granting it vary.",
    sources: [lii("en_banc", "En Banc")],
    lastVerified: LAST_VERIFIED,
    disclaimer: DISCLAIMER,
    featured: false,
  },
];

export const featuredGlossaryTerms = curatedGlossary.filter((entry) => entry.featured);

function stripEntryMeta(entry: CuratedGlossaryEntry): LegalTermDefinition {
  const {
    term,
    plainLanguageDefinition,
    formalDefinition,
    category,
    example,
    relatedTerms,
    jurisdictionNote,
    sources,
    lastVerified,
    disclaimer,
  } = entry;
  return {
    term,
    plainLanguageDefinition,
    formalDefinition,
    category,
    example,
    relatedTerms,
    jurisdictionNote,
    sources,
    lastVerified,
    disclaimer,
  };
}

export function findCuratedTerm(normalizedTerm: string): LegalTermDefinition | null {
  const match = curatedGlossary.find(
    (entry) =>
      entry.slug === normalizedTerm ||
      entry.term.toLowerCase() === normalizedTerm.replace(/-/g, " "),
  );
  return match ? stripEntryMeta(match) : null;
}

export const curatedGlossaryProvider: LegalSourceProvider = {
  name: "curated-glossary",
  async lookup(normalizedTerm: string) {
    return findCuratedTerm(normalizedTerm);
  },
};

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[rows - 1][cols - 1];
}

/**
 * "Did you mean" suggestions for a term with no exact match, based purely on
 * how close the input is (by edit distance, or as a prefix) to a real
 * curated entry. Never invents a term — only ever points back at glossary
 * entries that actually exist.
 */
/** Edit-distance tolerance scaled to the shorter of the two strings being compared, so a long garbled input can't loosely match an unrelated short word. */
function allowedDistanceFor(a: string, b: string): number {
  return Math.max(1, Math.ceil(Math.min(a.length, b.length) * 0.34));
}

export function suggestGlossaryTerms(rawInput: string, limit = 3): string[] {
  const normalized = rawInput
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
  if (normalized.length < 2) return [];

  const scored = curatedGlossary
    .map((entry) => {
      const termLower = entry.term.toLowerCase();
      const words = termLower.split(/\s+/).filter((w) => w.length >= 3);

      const isPrefixMatch =
        normalized.length >= 3 && words.some((w) => w.startsWith(normalized) || normalized.startsWith(w));
      if (isPrefixMatch) return { term: entry.term, distance: 0, matched: true };

      const candidates = [termLower, ...words];
      let best = Infinity;
      for (const candidate of candidates) {
        const distance = levenshteinDistance(normalized, candidate);
        if (distance <= allowedDistanceFor(normalized, candidate) && distance < best) {
          best = distance;
        }
      }

      return { term: entry.term, distance: best, matched: best !== Infinity };
    })
    .filter((s) => s.matched);

  return scored
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((s) => s.term);
}
