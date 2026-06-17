import ResearchShell from "@/components/layout/ResearchShell";
import ResearchAbstract from "@/components/hero/ResearchAbstract";
import MarketContextSection from "@/components/context/MarketContextSection";
import AssetUniverseSection from "@/components/universe/AssetUniverseSection";
import StrategyFrameworkSection from "@/components/strategies/StrategyFrameworkSection";
import BacktestMethodologySection from "@/components/methodology/BacktestMethodologySection";
import ResultsSection from "@/components/results/ResultsSection";
import RiskDashboardSection from "@/components/risk/RiskDashboardSection";
import RegimeAnalysisSection from "@/components/regimes/RegimeAnalysisSection";
import CrisisSection from "@/components/crises/CrisisSection";
import CorrelationBreakdownSection from "@/components/correlation/CorrelationBreakdownSection";
import FactorExposureSection from "@/components/factors/FactorExposureSection";
import StabilityDiagnosticsSection from "@/components/stability/StabilityDiagnosticsSection";
import InvestorInterpretationSection from "@/components/interpretation/InvestorInterpretationSection";
import AssumptionsLimitationsSection from "@/components/assumptions/AssumptionsLimitationsSection";
import ProjectFooter from "@/components/footer/ProjectFooter";

export default function Page() {
  return (
    <ResearchShell>
      <ResearchAbstract />
      <MarketContextSection />
      <AssetUniverseSection />
      <StrategyFrameworkSection />
      <BacktestMethodologySection />
      <ResultsSection />
      <RiskDashboardSection />
      <RegimeAnalysisSection />
      <CrisisSection />
      <CorrelationBreakdownSection />
      <FactorExposureSection />
      <StabilityDiagnosticsSection />
      <InvestorInterpretationSection />
      <AssumptionsLimitationsSection />
      <ProjectFooter />
    </ResearchShell>
  );
}
