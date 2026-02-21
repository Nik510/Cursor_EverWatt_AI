/**
 * EverWatt.AI Main Application
 * 
 * @see EVERWATT_AI_CORE_VISION.md - Core Vision & Guiding Compass
 * This application is a vendor-agnostic optimization ecosystem that learns from building data
 * to continuously reduce energy and demand at scale with provable results.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ModuleHub } from './pages/ModuleHub';
import { EETraining } from './modules/ee_training/pages/EETraining';
import { CertificationPage } from './modules/ee_training/pages/CertificationPage';
import { TrainingDashboard } from './modules/ee_training/pages/TrainingDashboard';
import { Audit } from './modules/audit/pages/Audit';
import { Monitoring } from './modules/monitoring/pages/Monitoring';
import { Calculator } from './modules/calculator/pages/Calculator';
import { Reports } from './modules/reports/pages/Reports';
import { PGERegressionReport } from './modules/reports/pages/reports/PGERegressionReport';
import { RegressionReportGenerator } from './modules/reports/pages/reports/RegressionReportGenerator';
import { EnergyIntelligence } from './pages/EnergyIntelligence';
import { NMECPredictabilityReport } from './modules/reports/pages/reports/NMECPredictabilityReport';
import { NMECMVPlanReport } from './modules/reports/pages/reports/NMECMVPlanReport';
import { NMECSavingsReport } from './modules/reports/pages/reports/NMECSavingsReport';
import { PGETsbPacReport } from './modules/reports/pages/reports/PGETsbPacReport';
import { CarbonFootprintReport } from './modules/reports/pages/reports/CarbonFootprintReport';
import { ReportRevisionLandingPage } from './pages/modules/reports/ReportRevisionLandingPage';
import { SharedRevisionLandingPage } from './pages/modules/reports/SharedRevisionLandingPage';
import { HVACOptimizer } from './modules/hvac_optimizer/pages/HVACOptimizer';
import { UtilitiesAndProgramsLanding } from './modules/utilities/pages/UtilitiesAndProgramsLanding';
import { UtilitiesAndPrograms } from './modules/utilities/pages/UtilitiesAndPrograms';
import { UtilityPrograms } from './modules/utilities/pages/UtilityPrograms';
import { ThreePPrograms } from './modules/utilities/pages/ThreePPrograms';
import { TariffBrowserCA } from './modules/utilities/pages/TariffBrowserCA';
import { OBFPathwaySelector } from './modules/utilities/pages/OBFPathwaySelector';
import { OBFMeasureChecker } from './modules/utilities/pages/OBFMeasureChecker';
import { PGEOBFPathwayDetail } from './modules/utilities/pages/PGEOBFPathwayDetail';
import { OBFSubmissionWorkflow } from './modules/utilities/pages/OBFSubmissionWorkflow';
import { AdminDashboard } from './modules/admin/pages/AdminDashboard';
import { Academy } from './modules/academy/pages/Academy';
import { AcademyStandards } from './modules/academy/pages/AcademyStandards';
import { AcademyTroubleshooting } from './modules/academy/pages/AcademyTroubleshooting';

// Phase 2 Analysis Results Page
import { Phase2ResultsPage } from './pages/Phase2ResultsPage';

// Utility Intelligence + Battery Screening (read-only)
import { AnalysisResultsV1Page } from './pages/AnalysisResultsV1Page';

// Analysis Report Page
import { AnalysisReportPage } from './pages/AnalysisReportPage';

// Legacy pages (can be integrated into modules later)
import { Dashboard } from './pages/Dashboard';
import { NewAnalysis } from './pages/NewAnalysis';
import { BatteryLibrary } from './pages/BatteryLibrary';
import { EquipmentLibrary } from './pages/EquipmentLibrary';
import { MeasuresLibrary } from './pages/MeasuresLibrary';
import { RateLibrary } from './pages/RateLibrary';
import { UnifiedLibrary } from './pages/UnifiedLibrary';
import { TechnicalLibrary } from './pages/TechnicalLibrary';
import { HistoricalProjectLibrary } from './pages/HistoricalProjectLibrary';
import { Projects } from './pages/Projects';
import { ProjectBuilderHome } from './modules/project_builder/pages/ProjectBuilderHome';
import { ProjectBuilderProject } from './modules/project_builder/pages/ProjectBuilderProject';
import { IntervalIntakeV1Page } from './modules/project_builder/pages/IntervalIntakeV1Page';
import { BillingIntakePlaceholder } from './modules/project_builder/pages/BillingIntakePlaceholder';
import { InternalEngineeringReportV1Page } from './modules/project_builder/pages/InternalEngineeringReportV1Page';
import { AnalysisRunsV1Page } from './modules/project_builder/pages/AnalysisRunsV1Page';
import { Phase1Tariff } from './pages/Phase1Tariff';
import { logger } from './services/logger';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  logger.debug('[App] Rendering App component');
  const withBoundary = (el: React.ReactNode) => <ErrorBoundary>{el}</ErrorBoundary>;
  return (
    <Router>
      <Routes>
        {/* Main Module Hub - Landing Page */}
        <Route path="/" element={withBoundary(<ModuleHub />)} />
        
        {/* Core Modules */}
        <Route path="/ee-training" element={withBoundary(<EETraining />)} />
        <Route path="/ee-training/dashboard" element={withBoundary(<TrainingDashboard />)} />
        <Route path="/ee-training/certification" element={withBoundary(<CertificationPage />)} />
        <Route path="/academy" element={withBoundary(<Academy />)} />
        <Route path="/academy/standards" element={withBoundary(<AcademyStandards />)} />
        <Route path="/academy/troubleshooting" element={withBoundary(<AcademyTroubleshooting />)} />
        <Route path="/ai-engineer" element={withBoundary(<EETraining />)} /> {/* Legacy route - redirects to EE Training */}
        <Route path="/audit" element={withBoundary(<Audit />)} />
        <Route path="/monitoring" element={withBoundary(<Monitoring />)} />
        <Route path="/calculator/*" element={withBoundary(<Calculator />)} />
        {/* Reports (each generator is addressable as its own module route) */}
        <Route path="/reports/pge-energy-intelligence" element={withBoundary(<EnergyIntelligence />)} />
        <Route path="/reports/nmec-predictability" element={withBoundary(<NMECPredictabilityReport />)} />
        <Route path="/reports/nmec-mv-plan" element={withBoundary(<NMECMVPlanReport />)} />
        <Route path="/reports/nmec-savings" element={withBoundary(<NMECSavingsReport />)} />
        <Route path="/reports/pge-tsb-pac" element={withBoundary(<PGETsbPacReport />)} />
        <Route path="/reports/carbon-footprint" element={withBoundary(<CarbonFootprintReport />)} />
        <Route path="/reports/revisions/:revisionId" element={withBoundary(<ReportRevisionLandingPage />)} />
        <Route path="/share/:token" element={withBoundary(<SharedRevisionLandingPage />)} />
        <Route path="/reports/*" element={withBoundary(<Reports />)} />
        <Route path="/reports/pge-regression" element={withBoundary(<PGERegressionReport />)} />
        <Route path="/reports/regression-analysis" element={withBoundary(<RegressionReportGenerator />)} />
        <Route path="/energy-intelligence" element={withBoundary(<EnergyIntelligence />)} />
        <Route path="/hvac-optimizer/*" element={withBoundary(<HVACOptimizer />)} />
        <Route path="/utilities" element={withBoundary(<UtilitiesAndProgramsLanding />)} />
        <Route path="/utilities/rates" element={withBoundary(<UtilitiesAndPrograms />)} />
        <Route path="/utilities/programs" element={withBoundary(<UtilityPrograms />)} />
        <Route path="/utilities/3p-programs" element={withBoundary(<ThreePPrograms />)} />
        <Route path="/utilities/tariffs-ca" element={withBoundary(<TariffBrowserCA />)} />
        <Route path="/utilities/obf/selector" element={withBoundary(<OBFPathwaySelector />)} />
        <Route path="/utilities/obf/checker" element={withBoundary(<OBFMeasureChecker />)} />
        <Route path="/utilities/obf/pathway/:pathwayId" element={withBoundary(<PGEOBFPathwayDetail />)} />
        <Route path="/utilities/obf/workflow" element={withBoundary(<OBFSubmissionWorkflow />)} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={withBoundary(<AdminDashboard />)} />
        
        {/* Analysis Report Page - loads data via API (analysisId query param) */}
        <Route path="/analysis/report" element={withBoundary(<AnalysisReportPage />)} />
        
        {/* Phase 2 Analysis Results - loads data from API/state */}
        <Route path="/analysis/results" element={withBoundary(<Phase2ResultsPage />)} />

        {/* Read-only Utility Intelligence + Battery Screening results */}
        <Route path="/analysis/v1/:projectId" element={withBoundary(<AnalysisResultsV1Page />)} />
        
        {/* Legacy routes (integrated into modules or kept for backward compatibility) */}
        <Route path="/dashboard" element={withBoundary(<Dashboard />)} />
        <Route path="/new-analysis" element={withBoundary(<NewAnalysis />)} />
        <Route path="/battery-library" element={withBoundary(<BatteryLibrary />)} />
        <Route path="/equipment-library" element={withBoundary(<EquipmentLibrary />)} />
        <Route path="/measures-library" element={withBoundary(<MeasuresLibrary />)} />
        <Route path="/technology-explorer" element={<Navigate to="/ee-training" replace />} />
        <Route path="/rate-library" element={withBoundary(<RateLibrary />)} />
        <Route path="/library" element={withBoundary(<UnifiedLibrary />)} />
        <Route path="/technical-library" element={withBoundary(<TechnicalLibrary />)} />
        <Route path="/historical-library" element={withBoundary(<HistoricalProjectLibrary />)} />
        <Route path="/projects" element={withBoundary(<Projects />)} />
        <Route path="/project-builder" element={withBoundary(<ProjectBuilderHome />)} />
        <Route path="/project-builder/analysis-runs" element={withBoundary(<AnalysisRunsV1Page />)} />
        <Route path="/project-builder/:projectId" element={withBoundary(<ProjectBuilderProject />)} />
        <Route path="/project-builder/:projectId/intake/intervals" element={withBoundary(<IntervalIntakeV1Page />)} />
        <Route path="/project-builder/:projectId/intake/billing" element={withBoundary(<BillingIntakePlaceholder />)} />
        <Route path="/project-builder/:projectId/reports/internal-engineering" element={withBoundary(<InternalEngineeringReportV1Page />)} />

        {/* Phase 1 (Battery + Tariff Intelligence) */}
        <Route path="/phase1-tariff" element={withBoundary(<Phase1Tariff />)} />
        
        {/* Catch all - redirect to hub */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
