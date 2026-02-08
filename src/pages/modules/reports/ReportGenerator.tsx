import React, { useState, useEffect } from 'react';
import { FileText, Download, BarChart3, TrendingUp, FileSpreadsheet, Settings, CheckCircle, Zap, ClipboardCheck, Target, Award, Sun } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { generateReport, type ReportData } from '@utils/report-generator';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import { ChangeOrderGenerator } from './ChangeOrderGenerator';
import {
  GetAuditResponseSchema,
  ListCalculationsResponseSchema,
  GetCalculationResponseSchema,
  unwrap,
} from '../../../types/api-responses';

type CalculationSummary = {
  id: string;
  type: string;
  timestamp: string;
  auditId?: string;
};

type StandardReportType = ReportData['type'];
type ReportType =
  | StandardReportType
  | 'change-order'
  | 'pge-regression'
  | 'pge-tsb-pac'
  | 'carbon-footprint'
  | 'nmec-predictability'
  | 'nmec-mv-plan'
  | 'nmec-savings'
  | 'nifs-solar'
  | 'mv-comparison';

interface ReportConfig {
  type: StandardReportType;
  title: string;
  includeCharts: boolean;
  includeFinancials: boolean;
  includeRecommendations: boolean;
  format: 'pdf' | 'excel' | 'word';
}

export const ReportGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [config, setConfig] = useState<ReportConfig | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableData, setAvailableData] = useState<{
    audit?: unknown;
    hvac?: unknown;
    lighting?: unknown;
  }>({});

  const reportTypes = [
    // Featured: Energy Intelligence
    {
      id: 'pge-regression' as ReportType,
      name: 'PG&E Energy Intelligence',
      description: 'Comprehensive regression analysis with AI insights, technology recommendations, and ASHRAE Guideline 14 compliance.',
      icon: Zap,
      color: 'purple',
      featured: true,
      category: 'intelligence',
    },
    // PG&E NMEC Reports (IPMVP Option C)
    {
      id: 'nmec-predictability' as ReportType,
      name: 'NMEC Predictability Report',
      description: 'Baseline period analysis proving building can be modeled. Includes GOF metrics (CVRMSE < 25%, NMBE ± 0.5%).',
      icon: Target,
      color: 'blue',
      category: 'nmec',
    },
    {
      id: 'nmec-mv-plan' as ReportType,
      name: 'NMEC M&V Plan',
      description: 'Measurement & Verification plan with EEMs, Expected Useful Life, measurement boundary, and uncertainty statement.',
      icon: ClipboardCheck,
      color: 'cyan',
      category: 'nmec',
    },
    {
      id: 'nmec-savings' as ReportType,
      name: 'NMEC Savings Report',
      description: 'Final normalized savings report with CALEE2018 weather normalization, demand savings (kW), and NRE adjustments.',
      icon: Award,
      color: 'green',
      category: 'nmec',
    },
    // PG&E Cost-Effectiveness (placeholder)
    {
      id: 'pge-tsb-pac' as ReportType,
      name: 'PG&E TSB & PAC Ratio',
      description: 'Placeholder module for Total System Benefit (TSB) and PAC ratio calculations. Formulas and inputs will be added later.',
      icon: FileSpreadsheet,
      color: 'emerald',
      category: 'nmec',
    },
    // Sustainability / ESG
    {
      id: 'carbon-footprint' as ReportType,
      name: 'Carbon Footprint Report',
      description: 'EPA-based avoided emissions report (kWh/therms) with equivalencies + a recognition certificate.',
      icon: FileText,
      color: 'green',
      category: 'standard',
    },
    // Standard Reports
    {
      id: 'change-order' as ReportType,
      name: 'Change Order',
      description: 'Generate professional change orders with automatic numbering, project details, and AI-written scope & terms.',
      icon: ClipboardCheck,
      color: 'slate',
      category: 'standard',
    },
    {
      id: 'energy-model' as ReportType,
      name: 'Energy Model',
      description: 'Comprehensive building energy model with baseline and proposed scenarios',
      icon: BarChart3,
      color: 'blue',
      category: 'standard',
    },
    {
      id: 'regression' as ReportType,
      name: 'Regression Analysis',
      description: 'Statistical analysis of energy consumption patterns and savings verification',
      icon: TrendingUp,
      color: 'indigo',
      category: 'standard',
    },
    {
      id: 'savings' as ReportType,
      name: 'Savings Calculation',
      description: 'Detailed financial analysis with payback, NPV, and IRR',
      icon: FileSpreadsheet,
      color: 'green',
      category: 'standard',
    },
    {
      id: 'proposal' as ReportType,
      name: 'Proposal',
      description: 'Professional proposal document with recommendations and pricing',
      icon: FileText,
      color: 'orange',
      category: 'standard',
    },
    {
      id: 'nifs-solar' as ReportType,
      name: 'NIFS Solar Analysis',
      description: 'OBF qualification analysis for solar projects. Calculate eligible savings using NIFS rules with automated Excel generation.',
      icon: Sun,
      color: 'yellow',
      category: 'standard',
    },
    {
      id: 'mv-comparison' as ReportType,
      name: 'Measurement & Verification Report',
      description: 'Compare project performance before and after upgrades. Generate monthly, quarterly, bi-annual, and yearly comparisons with energy, demand, and cost savings.',
      icon: TrendingUp,
      color: 'emerald',
      category: 'standard',
    },
  ];

  const handleSelectType = (type: ReportType) => {
    // Route report generators to their own module pages (no redirects to Energy Intelligence)
    if (type === 'pge-regression') {
      navigate('/reports/pge-energy-intelligence');
      return;
    }

    if (type === 'nmec-predictability') {
      navigate('/reports/nmec-predictability');
      return;
    }

    if (type === 'nmec-mv-plan') {
      navigate('/reports/nmec-mv-plan');
      return;
    }

    if (type === 'nmec-savings') {
      navigate('/reports/nmec-savings');
      return;
    }

    if (type === 'pge-tsb-pac') {
      navigate('/reports/pge-tsb-pac');
      return;
    }

    if (type === 'carbon-footprint') {
      navigate('/reports/carbon-footprint');
      return;
    }

    // Navigate to the regression analysis report builder
    if (type === 'regression') {
      navigate('/reports/regression-analysis');
      return;
    }

    // Navigate to NIFS Solar Analysis
    if (type === 'nifs-solar') {
      navigate('/reports/nifs-solar');
      return;
    }

    // Navigate to M&V Comparison Report
    if (type === 'mv-comparison') {
      navigate('/reports/mv-comparison');
      return;
    }
    
    setSelectedType(type);

    if (type === 'change-order') {
      setConfig(null);
      return;
    }

    const cfgType = type as StandardReportType;
    setConfig({
      type: cfgType,
      title: `${reportTypes.find(r => r.id === type)?.name} Report`,
      includeCharts: true,
      includeFinancials: cfgType !== 'regression',
      includeRecommendations: type === 'proposal' || type === 'energy-model',
      format: 'pdf',
    });
  };

  // Auto-select report type (e.g. /reports?type=change-order)
  useEffect(() => {
    if (selectedType) return;
    const typeParam = searchParams.get('type');
    if (!typeParam) return;

    const exists = reportTypes.some((r) => r.id === (typeParam as any));
    if (!exists) return;

    handleSelectType(typeParam as ReportType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedType]);

  // Load available data on mount
  useEffect(() => {
    const loadAvailableData = async () => {
      const auditId = searchParams.get('auditId');
      if (auditId) {
        try {
          const response = await fetch(`/api/audits/${encodeURIComponent(auditId)}`);
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(`Failed to load audit (${response.status})`);
          const auditResp = unwrap(GetAuditResponseSchema, data);
          setAvailableData((prev) => ({ ...prev, audit: auditResp.audit }));

          // Load latest HVAC + Lighting calculations for this audit (API-backed)
          const calcsRes = await fetch(`/api/calculations?auditId=${encodeURIComponent(auditId)}`);
          const calcsData = await calcsRes.json().catch(() => ({}));
          if (calcsRes.ok) {
            const calcs = (unwrap(ListCalculationsResponseSchema, calcsData).calculations || []) as CalculationSummary[];
            const hvac = calcs.find((c) => c.type === 'hvac');
            const lighting = calcs.find((c) => c.type === 'lighting');

            if (hvac?.id) {
              const hvacDetailRes = await fetch(`/api/calculations/${encodeURIComponent(hvac.id)}`);
              const hvacDetail = await hvacDetailRes.json().catch(() => ({}));
              if (hvacDetailRes.ok) {
                const hvacResp = unwrap(GetCalculationResponseSchema, hvacDetail) as any;
                setAvailableData((prev) => ({ ...prev, hvac: hvacResp.calculation?.data || hvacResp.calculation }));
              }
            }
            if (lighting?.id) {
              const lightingDetailRes = await fetch(`/api/calculations/${encodeURIComponent(lighting.id)}`);
              const lightingDetail = await lightingDetailRes.json().catch(() => ({}));
              if (lightingDetailRes.ok) {
                const lightingResp = unwrap(GetCalculationResponseSchema, lightingDetail) as any;
                setAvailableData((prev) => ({ ...prev, lighting: lightingResp.calculation?.data || lightingResp.calculation }));
              }
            }
          }
        } catch (error) {
          console.error('Error loading audit/calculations:', error);
        }
      }
    };

    loadAvailableData();
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!config) return;
    
    setIsGenerating(true);
    
    try {
      const audit: any = availableData.audit as any;
      const hvac: any = availableData.hvac as any;
      const lighting: any = availableData.lighting as any;

      // Prepare report data
      const reportData: ReportData = {
        title: config.title,
        type: config.type,
        building: audit?.building,
        audit: config.includeCharts ? audit : undefined,
        calculations: {
          hvac: config.includeFinancials && hvac ? hvac : undefined,
          lighting: config.includeFinancials && lighting ? lighting : undefined,
        },
        financials: hvac?.aggregate || lighting?.aggregate ? {
          annualSavings: (hvac?.aggregate?.annualSavings || 0) + (lighting?.aggregate?.annualSavings || 0),
          projectCost: (hvac?.aggregate?.projectCost || 0) + (lighting?.aggregate?.projectCost || 0),
          paybackYears: hvac?.aggregate?.paybackYears || lighting?.aggregate?.paybackYears || 0,
          npv10: (hvac?.aggregate?.npv10 || 0) + (lighting?.aggregate?.npv10 || 0),
          co2Reduction: (hvac?.aggregate?.co2Reduction || 0) + (lighting?.aggregate?.co2Reduction || 0),
        } : undefined,
        recommendations: config.includeRecommendations ? [
          'Implement recommended HVAC efficiency upgrades to reduce energy consumption',
          'Consider LED lighting retrofits for improved efficiency and reduced maintenance costs',
          'Explore opportunities for demand response and peak shaving with battery storage',
          'Schedule regular maintenance to maintain optimal system performance',
        ] : undefined,
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
      };

      await generateReport(reportData, config.format);
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      logger.error('Report generation error:', error);
      toast({ type: 'error', title: 'Report generation failed', message: 'Failed to generate report. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Report and Document Generator</h1>
        <p className="text-gray-600">
          Generate professional reports and documents from your audit and calculator data
        </p>
      </div>

      {!selectedType ? (
        /* Report Type Selection */
        <div className="space-y-8">
          {/* Featured Report */}
          <div>
            {reportTypes.filter(r => 'featured' in r && r.featured).map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => handleSelectType(report.id)}
                  className="w-full rounded-xl border-2 p-8 hover:shadow-xl transition-all text-left relative bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 border-purple-300 hover:border-purple-500"
                >
                  <span className="absolute top-4 right-4 px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
                    ⚡ Featured
                  </span>
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{report.name}</h3>
                      <p className="text-gray-600 mb-3">{report.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">AI Insights</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Daily/Weekly/Monthly/Yearly</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">ASHRAE Compliant</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Tech Recommendations</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* NMEC Reports Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-900">PG&E Site-Level NMEC Reports</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">IPMVP Option C</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Normalized Metered Energy Consumption reports for utility incentive programs. CPUC Rulebook 2.0 compliant.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportTypes.filter(r => 'category' in r && r.category === 'nmec').map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => handleSelectType(report.id)}
                    className="rounded-xl border-2 p-5 hover:shadow-lg transition-all text-left bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-500"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      report.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      report.color === 'cyan' ? 'bg-cyan-100 text-cyan-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-xs text-gray-600">{report.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Reports */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Standard Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportTypes.filter(r => 'category' in r && r.category === 'standard').map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.id}
                    onClick={() => handleSelectType(report.id)}
                    className="rounded-xl border-2 p-5 hover:shadow-lg transition-all text-left bg-white border-gray-200 hover:border-blue-500"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      report.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                      report.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
                      report.color === 'green' ? 'bg-green-100 text-green-600' :
                      report.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{report.name}</h3>
                    <p className="text-xs text-gray-600">{report.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Report Configuration */
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Configure {reportTypes.find(r => r.id === selectedType)?.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelectedType(null);
                setConfig(null);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Change Type
            </button>
          </div>

          {selectedType === 'change-order' ? (
            <ChangeOrderGenerator />
          ) : config ? (
            <div className="space-y-6">
              {/* Report Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter report title"
                />
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Report Options</h3>
                
                <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Include Charts & Graphs</p>
                    <p className="text-sm text-gray-600">Add visual representations of data and trends</p>
                  </div>
                </label>

                {config.includeFinancials !== undefined && (
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.includeFinancials}
                      onChange={(e) => setConfig({ ...config, includeFinancials: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Include Financial Analysis</p>
                      <p className="text-sm text-gray-600">Add NPV, IRR, payback period, and ROI calculations</p>
                    </div>
                  </label>
                )}

                {config.includeRecommendations !== undefined && (
                  <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.includeRecommendations}
                      onChange={(e) => setConfig({ ...config, includeRecommendations: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Include Recommendations</p>
                      <p className="text-sm text-gray-600">Add energy efficiency recommendations and next steps</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['pdf', 'excel', 'word'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => {
                        setConfig({ ...config, format });
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        config.format === format
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900 capitalize">{format}</p>
                      {config.format === format && (
                        <CheckCircle className="w-5 h-5 text-blue-600 mt-2 mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Data Indicator */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">Available Data</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Audit Data:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      availableData.audit ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {availableData.audit ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">HVAC Calculations:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      availableData.hvac ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {availableData.hvac ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Lighting Calculations:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      availableData.lighting ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {availableData.lighting ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                  {!availableData.audit && !availableData.hvac && !availableData.lighting && (
                    <p className="text-xs text-blue-700 mt-2">
                      💡 Tip: Complete an audit or run calculations to include data in your report.
                    </p>
                  )}
                </div>
              </div>

              {/* Data Sources */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-4">Data Sources</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Audit Data</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Calculator Results</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Utility Bills</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      Optional
                    </span>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
                    isGenerating
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Report Types Explained
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div>
            <p className="font-semibold mb-1">Energy Model</p>
            <p>ASHRAE-compliant energy models comparing baseline vs proposed scenarios. Includes load calculations, equipment sizing, and energy consumption projections.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Regression Analysis</p>
            <p>Statistical analysis of historical energy consumption. Identifies patterns, weather correlation, and verifies savings through regression modeling.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Savings Calculation</p>
            <p>Detailed financial analysis with NPV, IRR, payback period, and lifecycle cost. Includes year-by-year savings projections.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Proposal</p>
            <p>Professional proposal document combining audit findings, recommended measures, pricing, and financial analysis. Ready for client presentation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

