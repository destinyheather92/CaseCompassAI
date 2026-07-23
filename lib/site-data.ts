import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CircleCheckBig,
  ClipboardList,
  Compass,
  FileSearch,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake as HeartHandshakeIcon,
  KeyRound,
  Landmark,
  Languages,
  Library,
  Link2,
  ListChecks,
  Lock,
  MapIcon,
  MessageCircleQuestion,
  Scale,
  ScaleIcon,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
};

export const navLinks: NavLink[] = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "For Facilities", href: "/#facilities" },
  { label: "About", href: "/#about" },
  { label: "Resources", href: "/#resources" },
];

export type RoadmapMarker = {
  icon: LucideIcon;
  label: string;
  glow: "purple" | "teal";
};

/** Ordered bottom (book) to top (window): the hero orb travels through these in sequence. */
export const roadmapMarkers: RoadmapMarker[] = [
  { icon: BookOpen, label: "Create Your Roadmap", glow: "purple" },
  { icon: Scale, label: "Relevant Laws & Cases", glow: "purple" },
  { icon: FileText, label: "Build Understanding", glow: "purple" },
  { icon: Compass, label: "Find Direction", glow: "purple" },
  { icon: CircleCheckBig, label: "Take the Next Step With Confidence", glow: "teal" },
];

export type ImpactStat = {
  icon: LucideIcon;
  countTo?: number;
  decimals?: number;
  suffix: string;
  staticValue?: string;
  label: string;
  accent: "purple" | "teal";
};

export const impactStats: ImpactStat[] = [
  {
    icon: Users,
    countTo: 1.8,
    decimals: 1,
    suffix: "M+",
    label: "People incarcerated in the U.S.",
    accent: "purple",
  },
  {
    icon: BookOpen,
    countTo: 70,
    decimals: 0,
    suffix: "%+",
    label: "Read below a high-school level",
    accent: "teal",
  },
  {
    icon: ScaleIcon,
    staticValue: "Thousands",
    suffix: "",
    label: "Navigate legal research without an attorney.",
    accent: "purple",
  },
];

export type RoadmapCard = {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
};

export const howItWorksContent = {
  heading: "From confusion to a clear research path",
  intro:
    "CaseCompass transforms a user's experience into a personalized legal research roadmap without requiring them to already understand legal terminology.",
  disclaimer:
    "CaseCompass provides educational legal research guidance only. It does not provide legal advice or replace a licensed attorney.",
};

export const roadmapCards: RoadmapCard[] = [
  {
    icon: MessageCircleQuestion,
    step: "01",
    title: "Tell Us What Happened",
    description:
      "Users describe their situation in their own words. They don't need to know statutes, cases, or legal terms.",
  },
  {
    icon: ListChecks,
    step: "02",
    title: "Answer Guided Questions",
    description:
      "CaseCompass asks adaptive follow-up questions to organize important facts and identify missing information.",
  },
  {
    icon: Search,
    step: "03",
    title: "Identify Research Topics",
    description:
      "AI connects the user's facts to possible legal concepts, statutes, procedures, and constitutional issues that may be relevant.",
  },
  {
    icon: MapIcon,
    step: "04",
    title: "Build Your Roadmap",
    description:
      "Users receive an organized research plan showing what to research, why it matters, and what order to follow.",
  },
  {
    icon: BookOpen,
    step: "05",
    title: "Learn in Plain Language",
    description:
      "Complex legal information is translated into understandable explanations written for approximately a sixth-grade reading level.",
  },
];

export type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const featuresContent = {
  heading: "Everything you need to research with confidence",
  intro:
    "A complete toolkit for turning a confusing legal situation into structured, understandable research.",
};

export const featureItems: FeatureItem[] = [
  {
    icon: MapIcon,
    title: "Personalized Research Roadmaps",
    description: "Transforms user experiences into structured legal research plans.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Guided Legal Intake",
    description:
      "Conversational intake that identifies relevant research topics without requiring legal knowledge.",
  },
  {
    icon: Languages,
    title: "Plain-Language Translator",
    description: "Converts difficult legal writing into understandable language.",
  },
  {
    icon: BookMarked,
    title: "Legal Term Explainer",
    description: "Explains legal terminology using simple definitions and examples.",
  },
  {
    icon: FileSearch,
    title: "Case Breakdown",
    description:
      "Organizes opinions into Facts, Issue, Rule, Holding, Reasoning, and Why It Matters.",
  },
  {
    icon: Link2,
    title: "Citation-Backed Research",
    description: "Uses trusted legal sources whenever possible.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "Allows users to save research and continue learning.",
  },
  {
    icon: Lock,
    title: "Prison-Safe Experience",
    description: "Designed for secure institutional environments and correctional education.",
  },
];

export const facilitiesContent = {
  heading: "A scalable legal education platform for institutions",
  cta: "Register a Facility",
};

export type FacilityAudience = {
  icon: LucideIcon;
  label: string;
};

export const facilityAudiences: FacilityAudience[] = [
  { icon: Landmark, label: "Departments of Corrections" },
  { icon: GraduationCap, label: "Prison Education Programs" },
  { icon: Scale, label: "Law School Clinics" },
  { icon: HeartHandshakeIcon, label: "Legal Aid Organizations" },
  { icon: Library, label: "Correctional Libraries" },
  { icon: Building2, label: "Reentry Programs" },
];

export type FacilityBenefit = {
  icon: LucideIcon;
  label: string;
};

export const facilityBenefits: FacilityBenefit[] = [
  { icon: UsersRound, label: "Centralized User Management" },
  { icon: KeyRound, label: "Role-Based Access" },
  { icon: BarChart3, label: "Educational Progress Tracking" },
  { icon: ShieldCheck, label: "Secure Deployment" },
  { icon: ClipboardList, label: "Institution-Level Reporting" },
  { icon: UserPlus, label: "Flexible User Provisioning" },
];

export const aboutContent = {
  heading: "Access to legal information should include the ability to understand it.",
  paragraphs: [
    "CaseCompass AI exists because access to legal materials alone does not guarantee meaningful understanding.",
    "Many incarcerated individuals have access to legal libraries but lack the legal literacy needed to navigate complex legal information.",
    "CaseCompass does not practice law.",
  ],
  helpsPoints: [
    "organize facts",
    "identify research topics",
    "understand legal terminology",
    "build personalized research plans",
  ],
  mission:
    "Our mission is to make legal research more understandable, structured, and accessible for people who do not know where to begin.",
};

export const resourcesContent = {
  heading: "Educational resources to guide your research",
  intro: "Plain-language guides to help you get the most out of CaseCompass.",
};

export type TrustItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const trustItems: TrustItem[] = [
  {
    icon: ShieldCheck,
    title: "Private & Secure",
    description: "Your information is private and never shared.",
  },
  {
    icon: BookOpen,
    title: "Built for Access to Justice",
    description: "Empowering individuals with the tools to understand their rights.",
  },
  {
    icon: Heart,
    title: "Made for You",
    description: "Designed for incarcerated individuals navigating the legal system.",
  },
];
