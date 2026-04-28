import { MarketingNav } from "../../components/marketing/MarketingNav";
import { Hero } from "../../components/marketing/Hero";
import { Ticker } from "../../components/marketing/Ticker";
import { NetworkStatsBar } from "../../components/marketing/NetworkStatsBar";
import { NetworkCoverageMap } from "../../components/marketing/NetworkCoverageMap";
import { Problems } from "../../components/marketing/Problems";
import { ComplianceBand } from "../../components/marketing/ComplianceBand";
import { PlatformFeatures } from "../../components/marketing/PlatformFeatures";
import { LoadboardPreview } from "../../components/marketing/LoadboardPreview";
import { HowItWorks } from "../../components/marketing/HowItWorks";
import { ShipperAcquisition } from "../../components/marketing/ShipperAcquisition";
import { AgentProgram } from "../../components/marketing/AgentProgram";
import { Integrations } from "../../components/marketing/Integrations";
import { Pricing } from "../../components/marketing/Pricing";
import { CTASection } from "../../components/marketing/CTASection";
import { Footer } from "../../components/marketing/Footer";

export function Landing() {
  return (
    <div className="min-h-screen bg-black text-white">
      <MarketingNav />
      <main>
        <Hero />
        <Ticker />
        <NetworkStatsBar />
        <NetworkCoverageMap />
        <Problems />
        <ComplianceBand />
        <PlatformFeatures />
        <LoadboardPreview />
        <HowItWorks />
        <ShipperAcquisition />
        <AgentProgram />
        <Integrations />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
