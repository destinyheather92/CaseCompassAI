import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { ImpactStats } from "@/components/site/impact-stats";
import { RoadmapSteps } from "@/components/site/roadmap-steps";
import { Features } from "@/components/site/features";
import { ForFacilities } from "@/components/site/for-facilities";
import { About } from "@/components/site/about";
import { Resources } from "@/components/site/resources";
import { LegalDisclaimer } from "@/components/site/legal-disclaimer";
import { TrustFooter } from "@/components/site/trust-footer";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-cc-bg">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ImpactStats />
        <RoadmapSteps />
        <Features />
        <ForFacilities />
        <About />
        <Resources />
        <LegalDisclaimer />
      </main>
      <TrustFooter />
    </div>
  );
}
