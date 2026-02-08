import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Brain,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Battery,
  Thermometer,
  BarChart3,
  Calendar,
  Download,
  FileText,
  Share2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Info,
  Target,
  DollarSign,
  Activity,
  Clock,
  Sun,
  Flame,
  CloudSun,
  ClipboardList,
  MapPin,
  Building2,
  Settings2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import {
  parseIntervalData,
  performRegressionAnalysis,
  generateRegressionChartData,
  type Granularity,
  type RegressionAnalysisResult,
  type IntervalDataPoint,
  type AggregatedDataPoint,
} from '@utils/regression-analysis';
import {
  calculateUsageMetrics,
  generateInsights,
  generateRecommendations,
  generateExecutiveSummary,
  type AIInsight,
  type TechnologyRecommendation,
  type UsageMetrics,
} from '@utils/ai-insights';
import {
  assessEquipmentFit,
  manualInputsToAssessmentInput,
  generateFitSummary,
  getFitScoreColor,
  getFitScoreBgColor,
  type AssessmentInput,
} from '@utils/equipment-fit-assessment';
import {
  type SolarDataPoint,
  type ThermsDataPoint,
  type WeatherDataPoint,
  type ManualFacilityData,
  type FacilityCoordinates,
  type FitAssessment,
  type HVACSystemType,
  type OccupancyType,
  type OperatingSchedule,
  type FacilityProfile,
  type FacilityType,
  type ClimateZone,
  type KnownEquipmentType,
  type PrimaryEnergyConcern,
  createEmptyManualInputs,
  createEmptyFacilityProfile,
  hasMinimumDataForAnalysis,
  createEmptyAllDataSources,
  FACILITY_TYPE_LABELS,
  type AllDataSources,
} from '../types/energy-intelligence';
import {
  analyzeFacility,
  generateBuildingProfileSummary,
  type FacilityAnalysis,
} from '@utils/facility-analyzer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type AnalysisPhase = 'upload' | 'processing' | 'analysis' | 'insights';

interface UsageDataRow {
  billEndDate: Date;
  totalUsageKwh: number;
  peakDemandKw: number;
  totalCost: number;
  onPeakKwh?: number;
  partialPeakKwh?: number;
  offPeakKwh?: number;
  rateCode?: string;
}

export const EnergyIntelligence: React.FC = () => {
  const navigate = useNavigate();
  
  // Phase tracking
  const [phase, setPhase] = useState<AnalysisPhase>('upload');
  
  // Data state
  const [intervalData, setIntervalData] = useState<IntervalDataPoint[]>([]);
  const [usageData, setUsageData] = useState<UsageDataRow[]>([]);
  const [intervalFileName, setIntervalFileName] = useState('');
  const [usageFileName, setUsageFileName] = useState('');
  
  // Analysis settings
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'regression' | 'insights' | 'recommendations'>('overview');
  
  // Results
  const [regressionResult, setRegressionResult] = useState<RegressionAnalysisResult | null>(null);
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<TechnologyRecommendation[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  
  // NEW: Additional data sources
  const [solarData, setSolarData] = useState<SolarDataPoint[]>([]);
  const [thermsData, setThermsData] = useState<ThermsDataPoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherDataPoint[]>([]);
  const [solarFileName, setSolarFileName] = useState('');
  const [thermsFileName, setThermsFileName] = useState('');
  const [weatherFileName, setWeatherFileName] = useState('');
  
  // NEW: Manual input form
  const [manualInputs, setManualInputs] = useState<ManualFacilityData>(createEmptyManualInputs());
  const [showManualForm, setShowManualForm] = useState(false);
  
  // Track which tiles have manual entry expanded
  const [manualEntryTiles, setManualEntryTiles] = useState<{
    interval: boolean;
    billing: boolean;
    solar: boolean;
    therms: boolean;
    weather: boolean;
  }>({
    interval: false,
    billing: false,
    solar: false,
    therms: false,
    weather: false,
  });
  
  const toggleManualEntry = (tile: keyof typeof manualEntryTiles) => {
    setManualEntryTiles(prev => ({ ...prev, [tile]: !prev[tile] }));
  };
  
  // NEW: Facility verification
  const [facilityCoordinates, setFacilityCoordinates] = useState<FacilityCoordinates | null>(null);
  
  // NEW: Equipment fit assessment
  const [fitAssessment, setFitAssessment] = useState<FitAssessment | null>(null);
  
  // NEW: Facility profile for AI analysis
  const [facilityProfile, setFacilityProfile] = useState<FacilityProfile>(createEmptyFacilityProfile());
  const [facilityAnalysis, setFacilityAnalysis] = useState<FacilityAnalysis | null>(null);
  
  // Check if we have minimum data for analysis
  const dataSources: AllDataSources = {
    interval: {
      isUploaded: intervalData.length > 0,
      fileName: intervalFileName || null,
      recordCount: intervalData.length,
      dateRange: intervalData.length > 0 ? {
        start: intervalData[0]?.timestamp,
        end: intervalData[intervalData.length - 1]?.timestamp
      } : null,
      error: null,
    },
    usage: {
      isUploaded: !!usageFileName,
      fileName: usageFileName || null,
      recordCount: usageData.length,
      dateRange: null,
      error: null,
    },
    solar: {
      isUploaded: solarData.length > 0,
      fileName: solarFileName || null,
      recordCount: solarData.length,
      dateRange: null,
      error: null,
    },
    therms: {
      isUploaded: thermsData.length > 0,
      fileName: thermsFileName || null,
      recordCount: thermsData.length,
      dateRange: null,
      error: null,
    },
    weather: {
      isUploaded: weatherData.length > 0,
      fileName: weatherFileName || null,
      recordCount: weatherData.length,
      dateRange: null,
      error: null,
    },
    manual: showManualForm && (!!manualInputs.avgMonthlyKwh || !!manualInputs.peakDemandKw),
  };
  
  const hasMinimumData = hasMinimumDataForAnalysis(dataSources, manualInputs);
  
  // Count uploaded data sources (file uploads or manual entry)
  const uploadedSourcesCount = [
    dataSources.interval.isUploaded || manualEntryTiles.interval,
    dataSources.usage.isUploaded || manualEntryTiles.billing,
    dataSources.solar.isUploaded || manualEntryTiles.solar,
    dataSources.therms.isUploaded || manualEntryTiles.therms,
    dataSources.weather.isUploaded || manualEntryTiles.weather,
    showManualForm,
  ].filter(Boolean).length;

  // NOTE: Auto-analysis removed - user must click "Run Analysis" button

  const runAnalysis = useCallback(() => {
    // Check minimum data requirements
    if (!hasMinimumData) {
      setError('Please upload interval data or provide manual energy inputs before running analysis.');
      return;
    }

    setIsProcessing(true);
    setPhase('processing');
    setError(null);

    try {
      // Handle analysis with interval data
      if (intervalData.length > 0) {
        // Perform regression analysis
        const result = performRegressionAnalysis(intervalData, granularity);
        setRegressionResult(result);
        
        // Generate chart data
        const charts = generateRegressionChartData(result);
        setChartData(charts);
        
        // Calculate metrics
        const usageMetrics = calculateUsageMetrics(result.aggregatedData, result);
        setMetrics(usageMetrics);
        
        // Generate AI insights
        const aiInsights = generateInsights(usageMetrics, result, result.aggregatedData);
        setInsights(aiInsights);
        
        // Generate recommendations
        const techRecommendations = generateRecommendations(usageMetrics, result, aiInsights);
        setRecommendations(techRecommendations);
        
        // Perform equipment fit assessment
        const assessmentInput: AssessmentInput = manualInputsToAssessmentInput(
          manualInputs,
          usageMetrics.peakDemand
        );
        const fit = assessEquipmentFit(assessmentInput);
        setFitAssessment(fit);

        // Facility AI analysis (uses training data + facility profile + usage metrics)
        const fa = analyzeFacility(facilityProfile, usageMetrics);
        setFacilityAnalysis(fa);
        
      } else if (manualInputs.avgMonthlyKwh && manualInputs.peakDemandKw) {
        // Handle manual-only analysis (no interval data)
        // Create basic metrics from manual inputs
        const basicMetrics: UsageMetrics = {
          avgDailyUsage: manualInputs.avgMonthlyKwh / 30,
          avgMonthlyUsage: manualInputs.avgMonthlyKwh,
          peakDemand: manualInputs.peakDemandKw,
          avgDemand: manualInputs.avgMonthlyKwh / 730, // hours in month
          loadFactor: (manualInputs.avgMonthlyKwh / 730) / manualInputs.peakDemandKw,
          peakToAverageRatio: manualInputs.peakDemandKw / (manualInputs.avgMonthlyKwh / 730),
          seasonalVariation: 0.2, // Estimated
          baseload: manualInputs.avgMonthlyKwh * 0.4, // Estimated 40% baseload
          coolingLoad: 0,
          heatingLoad: 0,
          weatherSensitivity: 0.5, // Unknown
        };
        setMetrics(basicMetrics);

        // Facility AI analysis (manual-only metrics)
        const fa = analyzeFacility(facilityProfile, basicMetrics);
        setFacilityAnalysis(fa);
        
        // Perform equipment fit assessment with manual data
        const assessmentInput: AssessmentInput = manualInputsToAssessmentInput(manualInputs);
        const fit = assessEquipmentFit(assessmentInput);
        setFitAssessment(fit);
        
        // Generate basic insights for manual-only
        setInsights([{
          id: 'manual-data-notice',
          category: 'info' as any,
          severity: 'info',
          title: 'Analysis Based on Manual Inputs',
          description: 'This analysis is based on manually entered data. For more detailed insights, upload interval data.',
          impact: 'Limited analysis depth available without interval data',
          action: 'Consider uploading utility interval data for comprehensive analysis',
        }]);
      }
      
      setPhase('analysis');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to perform analysis. Please check data format.');
      setPhase('upload');
    } finally {
      setIsProcessing(false);
    }
  }, [facilityProfile, granularity, hasMinimumData, intervalData, manualInputs]);

  // Re-run analysis when granularity changes (only if already in analysis phase)
  useEffect(() => {
    if (phase === 'analysis' && intervalData.length > 0) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granularity]);

  const handleIntervalUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setIntervalFileName(file.name);

    try {
      const text = await file.text();
      const data = parseIntervalData(text);
      
      if (data.length === 0) {
        throw new Error('No valid interval data found. Please check CSV format.');
      }
      
      setIntervalData(data);
    } catch (err) {
      console.error('File upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse interval data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setUsageFileName(file.name);

    try {
      // For now, just store that usage file was uploaded
      // In production, this would parse the usage CSV
      setUsageFileName(file.name);
    } catch (err) {
      console.error('File upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse usage data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSolarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setSolarFileName(file.name);

    try {
      // Parse solar generation CSV
      const text = await file.text();
      const lines = text.trim().split('\n');
      const data: SolarDataPoint[] = [];
      
      // Skip header row and parse data
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 2) {
          const timestamp = new Date(cols[0]);
          const generationKwh = parseFloat(cols[1]);
          if (!isNaN(timestamp.getTime()) && !isNaN(generationKwh)) {
            data.push({ timestamp, generationKwh });
          }
        }
      }
      
      if (data.length === 0) {
        throw new Error('No valid solar data found. Expected CSV with timestamp and generation columns.');
      }
      
      setSolarData(data);
    } catch (err) {
      console.error('Solar file upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse solar data');
      setSolarFileName('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleThermsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setThermsFileName(file.name);

    try {
      // Parse therms/gas CSV
      const text = await file.text();
      const lines = text.trim().split('\n');
      const data: ThermsDataPoint[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 2) {
          const date = new Date(cols[0]);
          const therms = parseFloat(cols[1]);
          const cost = cols.length > 2 ? parseFloat(cols[2]) : undefined;
          if (!isNaN(date.getTime()) && !isNaN(therms)) {
            data.push({ date, therms, cost });
          }
        }
      }
      
      if (data.length === 0) {
        throw new Error('No valid therms data found. Expected CSV with date and therms columns.');
      }
      
      setThermsData(data);
    } catch (err) {
      console.error('Therms file upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse therms data');
      setThermsFileName('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWeatherUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setWeatherFileName(file.name);

    try {
      // Parse weather CSV
      const text = await file.text();
      const lines = text.trim().split('\n');
      const data: WeatherDataPoint[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length >= 4) {
          const date = new Date(cols[0]);
          const avgTemperature = parseFloat(cols[1]);
          const minTemperature = parseFloat(cols[2]);
          const maxTemperature = parseFloat(cols[3]);
          if (!isNaN(date.getTime()) && !isNaN(avgTemperature)) {
            data.push({ date, avgTemperature, minTemperature, maxTemperature });
          }
        }
      }
      
      if (data.length === 0) {
        throw new Error('No valid weather data found. Expected CSV with date, avg, min, max temperature columns.');
      }
      
      setWeatherData(data);
    } catch (err) {
      console.error('Weather file upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse weather data');
      setWeatherFileName('');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateManualInput = <K extends keyof ManualFacilityData>(
    field: K,
    value: ManualFacilityData[K]
  ) => {
    setManualInputs(prev => ({ ...prev, [field]: value }));
  };

  const updateFacilityProfile = <K extends keyof FacilityProfile>(
    field: K,
    value: FacilityProfile[K]
  ) => {
    setFacilityProfile(prev => ({ ...prev, [field]: value }));
  };

  const toggleKnownEquipment = (equipment: KnownEquipmentType) => {
    setFacilityProfile(prev => ({
      ...prev,
      knownEquipment: prev.knownEquipment.includes(equipment)
        ? prev.knownEquipment.filter(e => e !== equipment)
        : [...prev.knownEquipment, equipment],
    }));
  };

  const loadSampleData = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/data/INTERVAL.csv');
      if (response.ok) {
        const text = await response.text();
        const data = parseIntervalData(text);
        if (data.length > 0) {
          setIntervalData(data);
          setIntervalFileName('Sample Data (INTERVAL.csv)');
          setCustomerName('American Baptist Homes');
          setSiteAddress('800 Blossom Hill Rd, Los Gatos, CA');
        }
      }
    } catch (err) {
      console.error('Error loading sample data:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportToPDF = () => {
    if (!regressionResult || !metrics) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('Energy Intelligence Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    if (customerName) doc.text(`Customer: ${customerName}`, 14, 34);
    if (siteAddress) doc.text(`Location: ${siteAddress}`, 14, 40);

    let yPos = 50;

    // Key Metrics
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Energy Metrics', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Average Monthly Usage', `${metrics.avgMonthlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`],
        ['Peak Demand', `${metrics.peakDemand.toFixed(0)} kW`],
        ['Load Factor', `${(metrics.loadFactor * 100).toFixed(1)}%`],
        ['Weather Sensitivity', `${(metrics.weatherSensitivity * 100).toFixed(0)}%`],
        ['Baseload', `${metrics.baseload.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Insights
    if (insights.length > 0) {
      doc.setFontSize(14);
      doc.text('AI Insights', 14, yPos);
      yPos += 5;

      const insightRows = insights.slice(0, 5).map(i => [
        i.title,
        i.description.substring(0, 80) + '...',
        i.severity.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Finding', 'Description', 'Severity']],
        body: insightRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 8 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Recommendations
    if (recommendations.length > 0 && yPos < 220) {
      doc.setFontSize(14);
      doc.text('Technology Recommendations', 14, yPos);
      yPos += 5;

      const recRows = recommendations.slice(0, 4).map(r => [
        r.technology,
        `$${r.estimatedSavings.min.toLocaleString()}-${r.estimatedSavings.max.toLocaleString()}/yr`,
        `${r.paybackYears.min}-${r.paybackYears.max} years`,
        r.priority.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Technology', 'Est. Savings', 'Payback', 'Priority']],
        body: recRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Energy Intelligence Report | EverWatt Engine`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`Energy_Intelligence_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!regressionResult || !metrics) return;

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Energy Intelligence Report'],
      ['Generated', new Date().toLocaleString()],
      ['Customer', customerName || 'N/A'],
      ['Location', siteAddress || 'N/A'],
      [''],
      ['KEY METRICS'],
      ['Average Monthly Usage (kWh)', metrics.avgMonthlyUsage],
      ['Peak Demand (kW)', metrics.peakDemand],
      ['Average Demand (kW)', metrics.avgDemand],
      ['Load Factor (%)', metrics.loadFactor * 100],
      ['Weather Sensitivity (%)', metrics.weatherSensitivity * 100],
      ['Baseload (kWh)', metrics.baseload],
      [''],
      ['MODEL STATISTICS'],
      ['R²', regressionResult.temperatureRegression.rSquared],
      ['CV(RMSE) %', regressionResult.statistics.cvrmse],
      ['NMBE %', regressionResult.statistics.nmbe],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Insights Sheet
    const insightRows = insights.map(i => [i.category, i.severity, i.title, i.description, i.impact || '', i.action || '']);
    const insightSheet = XLSX.utils.aoa_to_sheet([
      ['Category', 'Severity', 'Title', 'Description', 'Impact', 'Action'],
      ...insightRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, insightSheet, 'Insights');

    // Recommendations Sheet
    const recRows = recommendations.map(r => [
      r.technology,
      r.priority,
      r.estimatedSavings.min,
      r.estimatedSavings.max,
      r.paybackYears.min,
      r.paybackYears.max,
      r.description,
      r.reasons.join('; '),
    ]);
    const recSheet = XLSX.utils.aoa_to_sheet([
      ['Technology', 'Priority', 'Min Savings', 'Max Savings', 'Min Payback', 'Max Payback', 'Description', 'Reasons'],
      ...recRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, recSheet, 'Recommendations');

    // Data Sheet
    const dataRows = regressionResult.aggregatedData.map((d, i) => [
      d.period,
      d.totalUsage,
      chartData?.scatterData[i]?.predictedUsage || 0,
      d.avgTemperature,
      d.maxDemand,
      d.heatingDegreeDays,
      d.coolingDegreeDays,
    ]);
    const dataSheet = XLSX.utils.aoa_to_sheet([
      ['Period', 'Usage (kWh)', 'Predicted', 'Avg Temp (°F)', 'Max Demand (kW)', 'HDD', 'CDD'],
      ...dataRows,
    ]);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    XLSX.writeFile(workbook, `Energy_Intelligence_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const shareWithBatteryCalculator = () => {
    // Store data in sessionStorage for battery calculator to access
    sessionStorage.setItem('energyIntelligenceData', JSON.stringify({
      intervalData: intervalData.slice(0, 10000), // Limit for storage
      metrics,
      regressionResult: {
        baseload: regressionResult?.baseload,
        statistics: regressionResult?.statistics,
      },
      customerName,
      siteAddress,
    }));
    navigate('/calculator');
  };

  const granularityOptions: { value: Granularity; label: string; icon: React.ReactNode }[] = [
    { value: 'daily', label: 'Daily', icon: <Clock className="w-4 h-4" /> },
    { value: 'weekly', label: 'Weekly', icon: <Calendar className="w-4 h-4" /> },
    { value: 'monthly', label: 'Monthly', icon: <BarChart3 className="w-4 h-4" /> },
    { value: 'yearly', label: 'Yearly', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pattern': return <Activity className="w-5 h-5" />;
      case 'anomaly': return <AlertTriangle className="w-5 h-5" />;
      case 'opportunity': return <Target className="w-5 h-5" />;
      case 'risk': return <AlertTriangle className="w-5 h-5" />;
      case 'recommendation': return <Lightbulb className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Energy Intelligence</h1>
                <p className="text-sm text-gray-500">AI-Powered Usage Analysis & Recommendations</p>
              </div>
            </div>
          </div>

          {phase === 'analysis' && (
            <div className="flex items-center gap-3">
              <button
                onClick={shareWithBatteryCalculator}
                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-medium hover:bg-orange-100 transition-colors flex items-center gap-2"
              >
                <Battery className="w-4 h-4" />
                Open in Battery Calculator
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Phase Indicator */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-4">
            {['upload', 'processing', 'analysis'].map((p, idx) => (
              <React.Fragment key={p}>
                <div className={`flex items-center gap-2 ${
                  phase === p ? 'text-purple-600' : 
                  ['upload', 'processing', 'analysis'].indexOf(phase) > idx ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    phase === p ? 'bg-purple-100 text-purple-600' :
                    ['upload', 'processing', 'analysis'].indexOf(phase) > idx ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {['upload', 'processing', 'analysis'].indexOf(phase) > idx ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <span className="font-medium capitalize">{p === 'upload' ? 'Data Upload' : p === 'processing' ? 'Processing' : 'Analysis'}</span>
                </div>
                {idx < 2 && <ChevronRight className="w-5 h-5 text-gray-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Upload Phase */}
        {phase === 'upload' && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Address</label>
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter site address"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Facility Profile (for AI-guided recommendations)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Facility Type</label>
                    <select
                      value={facilityProfile.facilityType || ''}
                      onChange={(e) => updateFacilityProfile('facilityType', (e.target.value || null) as FacilityType | null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      {Object.entries(FACILITY_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">California Climate Zone (1–16)</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={facilityProfile.climateZone ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (!raw) {
                          updateFacilityProfile('climateZone', null);
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n < 1 || n > 16) return;
                        updateFacilityProfile('climateZone', n as ClimateZone);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., 4"
                    />
                    <p className="text-xs text-gray-400 mt-1">Leave blank if unknown</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Building Vintage</label>
                    <select
                      value={facilityProfile.buildingAge || ''}
                      onChange={(e) => updateFacilityProfile('buildingAge', (e.target.value || null) as FacilityProfile['buildingAge'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      <option value="pre_1980">Pre-1980</option>
                      <option value="1980_2000">1980–2000</option>
                      <option value="2000_2010">2000–2010</option>
                      <option value="post_2010">Post-2010</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Operating Schedule</label>
                    <select
                      value={facilityProfile.operatingSchedule || ''}
                      onChange={(e) => updateFacilityProfile('operatingSchedule', (e.target.value || null) as FacilityProfile['operatingSchedule'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      <option value="24_7">24/7</option>
                      <option value="business_hours">Business hours</option>
                      <option value="extended_hours">Extended hours</option>
                      <option value="seasonal">Seasonal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Primary Energy Concern</label>
                    <select
                      value={facilityProfile.primaryEnergyConcern || ''}
                      onChange={(e) => updateFacilityProfile('primaryEnergyConcern', (e.target.value || null) as PrimaryEnergyConcern | null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select...</option>
                      <option value="demand_charges">Demand charges</option>
                      <option value="usage_reduction">Usage reduction</option>
                      <option value="decarbonization">Decarbonization</option>
                      <option value="backup_power">Backup power / resiliency</option>
                      <option value="rate_optimization">Rate / TOU optimization</option>
                      <option value="sustainability_goals">Sustainability goals</option>
                      <option value="regulatory_compliance">Regulatory compliance</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm text-gray-600 mb-2">Known Equipment</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ['chillers', 'Chillers'],
                      ['rtus', 'RTUs'],
                      ['boilers', 'Boilers'],
                      ['vrf', 'VRF'],
                      ['lighting_fluorescent', 'Fluorescent lighting'],
                      ['lighting_led', 'LED lighting'],
                      ['compressed_air', 'Compressed air'],
                      ['refrigeration', 'Refrigeration'],
                      ['data_center_cooling', 'Data center cooling'],
                      ['process_heating', 'Process heating'],
                      ['solar_pv', 'Solar PV'],
                      ['battery_storage', 'Battery storage'],
                      ['ev_chargers', 'EV chargers'],
                    ] as Array<[KnownEquipmentType, string]>).map(([value, label]) => (
                      <label
                        key={value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                          facilityProfile.knownEquipment.includes(value)
                            ? 'bg-purple-50 border-purple-200 text-purple-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={facilityProfile.knownEquipment.includes(value)}
                          onChange={() => toggleKnownEquipment(value)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Upload Grid */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Data Sources</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Uploaded:</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {uploadedSourcesCount} / 6
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Interval Data - Required */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  intervalFileName || manualEntryTiles.interval ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-purple-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      intervalFileName || manualEntryTiles.interval ? 'bg-green-200' : 'bg-purple-100'
                    }`}>
                      {intervalFileName || manualEntryTiles.interval ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Zap className="w-5 h-5 text-purple-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Interval Data</h3>
                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mb-2">Required</span>
                    <p className="text-xs text-gray-500 mb-2">15-min or hourly kW/kWh</p>
                    <div className="flex gap-2 justify-center mb-2">
                      <label className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        intervalFileName 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}>
                        <Upload className="w-3 h-3" />
                        {intervalFileName ? 'Replace' : 'Upload'}
                        <input type="file" accept=".csv" onChange={handleIntervalUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => toggleManualEntry('interval')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          manualEntryTiles.interval
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Manual
                      </button>
                    </div>
                    {intervalFileName && (
                      <p className="text-xs text-green-600 truncate" title={intervalFileName}>
                        {intervalFileName}
                      </p>
                    )}
                    {manualEntryTiles.interval && !intervalFileName && (
                      <p className="text-xs text-green-600">Manual entry enabled</p>
                    )}
                  </div>
                </div>

                {/* Usage/Billing Data */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  usageFileName || manualEntryTiles.billing ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      usageFileName || manualEntryTiles.billing ? 'bg-green-200' : 'bg-blue-100'
                    }`}>
                      {usageFileName || manualEntryTiles.billing ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <DollarSign className="w-5 h-5 text-blue-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Billing Data</h3>
                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full mb-2">Required</span>
                    <p className="text-xs text-gray-500 mb-2">Monthly usage & costs</p>
                    <div className="flex gap-2 justify-center mb-2">
                      <label className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        usageFileName 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}>
                        <Upload className="w-3 h-3" />
                        {usageFileName ? 'Replace' : 'Upload'}
                        <input type="file" accept=".csv" onChange={handleUsageUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => toggleManualEntry('billing')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          manualEntryTiles.billing
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Manual
                      </button>
                    </div>
                    {usageFileName && (
                      <p className="text-xs text-green-600 truncate" title={usageFileName}>
                        {usageFileName}
                      </p>
                    )}
                    {manualEntryTiles.billing && !usageFileName && (
                      <p className="text-xs text-green-600">Manual entry enabled</p>
                    )}
                  </div>
                </div>

                {/* Solar Generation */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  solarFileName || manualEntryTiles.solar ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-yellow-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      solarFileName || manualEntryTiles.solar ? 'bg-green-200' : 'bg-yellow-100'
                    }`}>
                      {solarFileName || manualEntryTiles.solar ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Sun className="w-5 h-5 text-yellow-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Solar Generation</h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">Optional</span>
                    <p className="text-xs text-gray-500 mb-2">PV production data</p>
                    <div className="flex gap-2 justify-center mb-2">
                      <label className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        solarFileName 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      }`}>
                        <Upload className="w-3 h-3" />
                        {solarFileName ? 'Replace' : 'Upload'}
                        <input type="file" accept=".csv" onChange={handleSolarUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => toggleManualEntry('solar')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          manualEntryTiles.solar
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Manual
                      </button>
                    </div>
                    {solarFileName && (
                      <p className="text-xs text-green-600 truncate" title={solarFileName}>
                        {solarFileName}
                      </p>
                    )}
                    {manualEntryTiles.solar && !solarFileName && (
                      <p className="text-xs text-green-600">Manual entry enabled</p>
                    )}
                  </div>
                </div>

                {/* Gas/Therms Data */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  thermsFileName || manualEntryTiles.therms ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-orange-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      thermsFileName || manualEntryTiles.therms ? 'bg-green-200' : 'bg-orange-100'
                    }`}>
                      {thermsFileName || manualEntryTiles.therms ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Flame className="w-5 h-5 text-orange-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Gas/Therms</h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">Optional</span>
                    <p className="text-xs text-gray-500 mb-2">Natural gas usage</p>
                    <div className="flex gap-2 justify-center mb-2">
                      <label className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        thermsFileName 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}>
                        <Upload className="w-3 h-3" />
                        {thermsFileName ? 'Replace' : 'Upload'}
                        <input type="file" accept=".csv" onChange={handleThermsUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => toggleManualEntry('therms')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          manualEntryTiles.therms
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Manual
                      </button>
                    </div>
                    {thermsFileName && (
                      <p className="text-xs text-green-600 truncate" title={thermsFileName}>
                        {thermsFileName}
                      </p>
                    )}
                    {manualEntryTiles.therms && !thermsFileName && (
                      <p className="text-xs text-green-600">Manual entry enabled</p>
                    )}
                  </div>
                </div>

                {/* Weather Data */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  weatherFileName || manualEntryTiles.weather ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-cyan-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      weatherFileName || manualEntryTiles.weather ? 'bg-green-200' : 'bg-cyan-100'
                    }`}>
                      {weatherFileName || manualEntryTiles.weather ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <CloudSun className="w-5 h-5 text-cyan-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Weather Data</h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">Optional</span>
                    <p className="text-xs text-gray-500 mb-2">Temperature history</p>
                    <div className="flex gap-2 justify-center mb-2">
                      <label className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        weatherFileName 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-cyan-500 text-white hover:bg-cyan-600'
                      }`}>
                        <Upload className="w-3 h-3" />
                        {weatherFileName ? 'Replace' : 'Upload'}
                        <input type="file" accept=".csv" onChange={handleWeatherUpload} className="hidden" />
                      </label>
                      <button
                        onClick={() => toggleManualEntry('weather')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          manualEntryTiles.weather
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" />
                        Manual
                      </button>
                    </div>
                    {weatherFileName && (
                      <p className="text-xs text-green-600 truncate" title={weatherFileName}>
                        {weatherFileName}
                      </p>
                    )}
                    {manualEntryTiles.weather && !weatherFileName && (
                      <p className="text-xs text-green-600">Manual entry enabled</p>
                    )}
                  </div>
                </div>

                {/* Facility Info - Manual Entry */}
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  showManualForm ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-indigo-400'
                }`}>
                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                      showManualForm ? 'bg-green-200' : 'bg-indigo-100'
                    }`}>
                      {showManualForm ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Building2 className="w-5 h-5 text-indigo-600" />}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1 text-sm">Facility Info</h3>
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mb-2">Optional</span>
                    <p className="text-xs text-gray-500 mb-2">Building & HVAC details</p>
                    <button
                      onClick={() => setShowManualForm(!showManualForm)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        showManualForm 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <Settings2 className="w-3 h-3" />
                      {showManualForm ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Input Form */}
            {showManualForm && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    Facility & Energy Information
                  </h2>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showManualForm ? 'rotate-180' : ''}`} />
                </button>
                
                <div className="space-y-6">
                  {/* Building Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Building Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Square Footage</label>
                        <input
                          type="number"
                          value={manualInputs.squareFootage || ''}
                          onChange={(e) => updateManualInput('squareFootage', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 50000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Year Built</label>
                        <input
                          type="number"
                          value={manualInputs.yearBuilt || ''}
                          onChange={(e) => {
                            const year = e.target.value ? Number(e.target.value) : null;
                            updateManualInput('yearBuilt', year);
                            if (year) updateManualInput('buildingAge', new Date().getFullYear() - year);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 1995"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Occupancy Type</label>
                        <select
                          value={manualInputs.occupancyType || ''}
                          onChange={(e) => updateManualInput('occupancyType', e.target.value as OccupancyType || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Select...</option>
                          <option value="office">Office</option>
                          <option value="retail">Retail</option>
                          <option value="industrial">Industrial</option>
                          <option value="warehouse">Warehouse</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="hospitality">Hospitality</option>
                          <option value="multifamily">Multifamily</option>
                          <option value="restaurant">Restaurant</option>
                          <option value="grocery">Grocery</option>
                          <option value="data_center">Data Center</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* HVAC System */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      HVAC System
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">System Type</label>
                        <select
                          value={manualInputs.hvacType || ''}
                          onChange={(e) => updateManualInput('hvacType', e.target.value as HVACSystemType || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Select...</option>
                          <option value="packaged_rtu">Packaged RTU</option>
                          <option value="split_system">Split System</option>
                          <option value="mini_split">Mini Split / Ductless</option>
                          <option value="chiller">Chiller</option>
                          <option value="vrf">VRF / VRV</option>
                          <option value="boiler_heating">Boiler (Heating)</option>
                          <option value="heat_pump">Heat Pump</option>
                          <option value="ptac">PTAC</option>
                          <option value="evaporative">Evaporative Cooling</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Approx. Tonnage</label>
                        <input
                          type="number"
                          value={manualInputs.hvacSizeTons || ''}
                          onChange={(e) => updateManualInput('hvacSizeTons', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">System Age (years)</label>
                        <input
                          type="number"
                          value={manualInputs.hvacAge || ''}
                          onChange={(e) => updateManualInput('hvacAge', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 15"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Roof Equipment Visible?</label>
                        <select
                          value={manualInputs.hasRoofEquipment === null ? '' : manualInputs.hasRoofEquipment ? 'yes' : 'no'}
                          onChange={(e) => updateManualInput('hasRoofEquipment', e.target.value === '' ? null : e.target.value === 'yes')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Unsure</option>
                          <option value="yes">Yes - Large units on roof</option>
                          <option value="no">No - No visible equipment</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Energy Profile (if no interval data) */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Energy Profile {intervalFileName && <span className="text-xs font-normal text-gray-400">(optional if interval data uploaded)</span>}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Avg Monthly kWh</label>
                        <input
                          type="number"
                          value={manualInputs.avgMonthlyKwh || ''}
                          onChange={(e) => updateManualInput('avgMonthlyKwh', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 150000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Peak Demand kW</label>
                        <input
                          type="number"
                          value={manualInputs.peakDemandKw || ''}
                          onChange={(e) => updateManualInput('peakDemandKw', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Avg Monthly Bill $</label>
                        <input
                          type="number"
                          value={manualInputs.avgMonthlyBill || ''}
                          onChange={(e) => updateManualInput('avgMonthlyBill', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="e.g., 25000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Has Gas Service?</label>
                        <select
                          value={manualInputs.hasGasService === null ? '' : manualInputs.hasGasService ? 'yes' : 'no'}
                          onChange={(e) => updateManualInput('hasGasService', e.target.value === '' ? null : e.target.value === 'yes')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No - All Electric</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Solar */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Existing Solar
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Has Existing Solar?</label>
                        <select
                          value={manualInputs.hasExistingSolar === null ? '' : manualInputs.hasExistingSolar ? 'yes' : 'no'}
                          onChange={(e) => updateManualInput('hasExistingSolar', e.target.value === '' ? null : e.target.value === 'yes')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                      {manualInputs.hasExistingSolar && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">System Size (kW DC)</label>
                          <input
                            type="number"
                            value={manualInputs.solarSystemSizeKw || ''}
                            onChange={(e) => updateManualInput('solarSystemSizeKw', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            placeholder="e.g., 200"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Additional Notes</label>
                    <textarea
                      value={manualInputs.notes || ''}
                      onChange={(e) => updateManualInput('notes', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      rows={2}
                      placeholder="Any additional information about the facility..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Google Maps Facility Verification */}
            {siteAddress && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  Facility Verification
                </h2>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Tip:</strong> Use satellite view to verify roof equipment. Look for car-sized HVAC units on the roof - these indicate packaged systems suitable for optimization.
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteAddress)}&maptype=satellite`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Open in Google Maps (Satellite)
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Visible Roof Equipment?</label>
                    <select
                      value={manualInputs.hasRoofEquipment === null ? '' : manualInputs.hasRoofEquipment ? 'yes' : 'no'}
                      onChange={(e) => updateManualInput('hasRoofEquipment', e.target.value === '' ? null : e.target.value === 'yes')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Not verified</option>
                      <option value="yes">Yes - Large units visible</option>
                      <option value="no">No visible equipment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes from satellite view</label>
                    <input
                      type="text"
                      value={manualInputs.roofEquipmentNotes || ''}
                      onChange={(e) => updateManualInput('roofEquipmentNotes', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., 4 large RTUs on roof"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sample Data */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-purple-900">Try with Sample Data</h3>
                  <p className="text-sm text-purple-700">Load sample PG&E interval data to explore the analysis features</p>
                </div>
                <button
                  onClick={loadSampleData}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Load Sample
                </button>
              </div>
            </div>

            {/* Run Analysis Button */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <button
                onClick={runAnalysis}
                disabled={!hasMinimumData || isProcessing}
                className={`w-full py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-3 transition-all ${
                  hasMinimumData && !isProcessing
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Brain className="w-6 h-6" />
                    Run Energy Intelligence Analysis
                  </>
                )}
              </button>
              {!hasMinimumData && (
                <p className="text-center text-sm text-gray-500 mt-3">
                  Upload interval data or provide manual energy inputs (avg kWh and peak kW) to enable analysis
                </p>
              )}
              {hasMinimumData && uploadedSourcesCount > 1 && (
                <p className="text-center text-sm text-green-600 mt-3">
                  ✓ {uploadedSourcesCount} data sources ready for comprehensive analysis
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Phase */}
        {phase === 'processing' && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Your Energy Data</h3>
            <p className="text-gray-600">Running regression models and generating AI insights...</p>
          </div>
        )}

        {/* Analysis Phase */}
        {phase === 'analysis' && regressionResult && metrics && (
          <>
            {/* Granularity Selector */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Analysis Granularity:</span>
                  <div className="flex gap-2">
                    {granularityOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setGranularity(option.value)}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                          granularity === option.value
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {regressionResult.aggregatedData.length} data points
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-xl mb-6 overflow-hidden">
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
                  { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
                  { id: 'regression', label: 'Regression', icon: <Activity className="w-4 h-4" /> },
                  { id: 'insights', label: 'AI Insights', icon: <Brain className="w-4 h-4" /> },
                  { id: 'recommendations', label: 'Recommendations', icon: <Lightbulb className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 px-4 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-purple-600 bg-purple-50 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.id === 'insights' && insights.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                        {insights.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* AI Building Profile */}
                    {facilityAnalysis && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                              <Brain className="w-5 h-5 text-purple-600" />
                              Building Profile & AI Guidance
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {generateBuildingProfileSummary(facilityProfile, facilityAnalysis, metrics)}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400 text-right">
                            {facilityProfile.facilityType
                              ? `Profile: ${FACILITY_TYPE_LABELS[facilityProfile.facilityType]}`
                              : 'Add facility details for better guidance'}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <p className="text-sm font-semibold text-purple-900 mb-2">Priority Measures</p>
                            {facilityAnalysis.priorityRecommendations.length === 0 ? (
                              <p className="text-sm text-purple-800">Add facility details to generate prioritized measures.</p>
                            ) : (
                              <ul className="space-y-2">
                                {facilityAnalysis.priorityRecommendations.slice(0, 4).map((rec) => (
                                  <li key={rec.measureId} className="text-sm text-purple-900">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{rec.measureName}</span>
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border border-purple-200 capitalize">
                                        {rec.priority}
                                      </span>
                                    </div>
                                    <p className="text-xs text-purple-800 mt-0.5">{rec.rationale}</p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                            <p className="text-sm font-semibold text-yellow-900 mb-2">Watch Items / Red Flags</p>
                            {facilityAnalysis.redFlags.length === 0 ? (
                              <p className="text-sm text-yellow-800">No red flags detected from the provided profile.</p>
                            ) : (
                              <ul className="space-y-1">
                                {facilityAnalysis.redFlags.slice(0, 5).map((rf, idx) => (
                                  <li key={idx} className="text-sm text-yellow-900 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                                    <span>{rf}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {(facilityAnalysis.decarbonizationPath.length > 0 || facilityAnalysis.operationalNotes.length > 0) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                              <p className="text-sm font-semibold text-green-900 mb-2">Decarbonization Path</p>
                              <ul className="space-y-1">
                                {facilityAnalysis.decarbonizationPath.slice(0, 4).map((item, idx) => (
                                  <li key={idx} className="text-sm text-green-900 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                              <p className="text-sm font-semibold text-blue-900 mb-2">Key Opportunities</p>
                              <ul className="space-y-1">
                                {facilityAnalysis.operationalNotes.slice(0, 5).map((item, idx) => (
                                  <li key={idx} className="text-sm text-blue-900 flex items-start gap-2">
                                    <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                        <p className="text-sm text-purple-600 mb-1">Avg Monthly Usage</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {metrics.avgMonthlyUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-purple-600">kWh</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-sm text-blue-600 mb-1">Peak Demand</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {metrics.peakDemand.toFixed(0)}
                        </p>
                        <p className="text-xs text-blue-600">kW</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <p className="text-sm text-green-600 mb-1">Load Factor</p>
                        <p className="text-2xl font-bold text-green-900">
                          {(metrics.loadFactor * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-600">{metrics.loadFactor > 0.5 ? 'Good' : 'Low'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-100">
                        <p className="text-sm text-orange-600 mb-1">Weather Sensitivity</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {(metrics.weatherSensitivity * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-orange-600">R² Score</p>
                      </div>
                    </div>

                    {/* Model Quality */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
                      <div className="flex items-center gap-3 mb-4">
                        <Brain className="w-6 h-6" />
                        <h3 className="text-lg font-semibold">Regression Model</h3>
                      </div>
                      <p className="text-xl font-mono mb-4">{regressionResult.temperatureRegression.equation}</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-purple-200 text-sm">R² Score</p>
                          <p className="text-2xl font-bold">{(regressionResult.temperatureRegression.rSquared * 100).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-purple-200 text-sm">CV(RMSE)</p>
                          <p className="text-2xl font-bold">{regressionResult.statistics.cvrmse.toFixed(1)}%</p>
                          <p className="text-xs text-purple-200">{regressionResult.statistics.cvrmse < 25 ? '✓ PASS' : '✗ FAIL'}</p>
                        </div>
                        <div>
                          <p className="text-purple-200 text-sm">NMBE</p>
                          <p className="text-2xl font-bold">{regressionResult.statistics.nmbe.toFixed(1)}%</p>
                          <p className="text-xs text-purple-200">{Math.abs(regressionResult.statistics.nmbe) < 10 ? '✓ PASS' : '✗ FAIL'}</p>
                        </div>
                      </div>
                    </div>

                    {/* NMEC Compliance Panel */}
                    {regressionResult.nmecCompliance && (
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">PG&E Site-Level NMEC Compliance</h3>
                              <p className="text-sm text-gray-600">IPMVP Option C • CPUC Rulebook 2.0</p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full font-semibold ${
                            regressionResult.nmecCompliance.overallPass 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {regressionResult.nmecCompliance.overallPass ? '✓ COMPLIANT' : '✗ NOT COMPLIANT'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-gray-500">CV(RMSE)</p>
                            <p className="text-lg font-bold text-gray-900">{regressionResult.statistics.cvrmse.toFixed(1)}%</p>
                            <p className={`text-xs ${regressionResult.nmecCompliance.cvrmsePass ? 'text-green-600' : 'text-red-600'}`}>
                              {regressionResult.nmecCompliance.cvrmsePass ? '✓ < 25%' : '✗ ≥ 25%'}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-gray-500">NMBE</p>
                            <p className="text-lg font-bold text-gray-900">{regressionResult.statistics.nmbe.toFixed(2)}%</p>
                            <p className={`text-xs ${regressionResult.nmecCompliance.nmbePass ? 'text-green-600' : 'text-yellow-600'}`}>
                              {regressionResult.nmecCompliance.nmbePass ? '✓ ± 0.5%' : '~ ± 10%'}
                            </p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-gray-500">Model Type</p>
                            <p className="text-lg font-bold text-gray-900">{regressionResult.nmecCompliance.modelType}</p>
                            <p className="text-xs text-gray-500">Regression</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-gray-500">Uncertainty</p>
                            <p className="text-lg font-bold text-gray-900">{(regressionResult.nmecCompliance.uncertainty * 100).toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">@ 90% CI</p>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-100">
                            <p className="text-xs text-gray-500">10% Savings</p>
                            <p className="text-lg font-bold text-gray-900">
                              {regressionResult.nmecCompliance.savingsDetectable ? 'Detectable' : 'Uncertain'}
                            </p>
                            <p className={`text-xs ${regressionResult.nmecCompliance.savingsDetectable ? 'text-green-600' : 'text-yellow-600'}`}>
                              {regressionResult.nmecCompliance.savingsDetectable ? '✓ Good' : '⚠ Review'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Equipment Fit Assessment */}
                    {fitAssessment && (
                      <div className={`rounded-xl p-6 border-2 ${getFitScoreBgColor(fitAssessment.fitScore)} ${
                        fitAssessment.isGoodFit ? 'border-green-300' : 'border-yellow-300'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Target className="w-6 h-6" />
                            <h3 className="text-lg font-semibold text-gray-900">Equipment Fit Assessment</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-3xl font-bold ${getFitScoreColor(fitAssessment.fitScore)}`}>
                              {fitAssessment.fitScore}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              fitAssessment.isGoodFit 
                                ? 'bg-green-200 text-green-800' 
                                : 'bg-yellow-200 text-yellow-800'
                            }`}>
                              {fitAssessment.isGoodFit ? 'Good Fit' : 'Review Needed'}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4">{generateFitSummary(fitAssessment)}</p>
                        
                        {fitAssessment.reasons.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Key Findings:</p>
                            <ul className="space-y-1">
                              {fitAssessment.reasons.map((reason, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="text-purple-500 mt-1">•</span>
                                  {reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {fitAssessment.excludedTechnologies.length > 0 && (
                          <div className="mb-4 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm font-medium text-red-800 mb-1">Not Recommended:</p>
                            <div className="flex flex-wrap gap-2">
                              {fitAssessment.excludedTechnologies.map((tech, idx) => (
                                <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {fitAssessment.recommendations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                            <ul className="space-y-1">
                              {fitAssessment.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {fitAssessment.warnings.length > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Warnings:</p>
                            <ul className="space-y-1">
                              {fitAssessment.warnings.map((warning, idx) => (
                                <li key={idx} className="text-sm text-yellow-700">{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Chart */}
                    {chartData && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={chartData.timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis yAxisId="left" label={{ value: 'Usage (kWh)', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Temp (°F)', angle: 90, position: 'insideRight' }} stroke="#f97316" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="actualUsage" fill="#8b5cf6" name="Usage" />
                            <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#f97316" name="Temperature" dot={false} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* Trends Tab */}
                {activeTab === 'trends' && chartData && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Predicted Usage</h3>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                          <YAxis label={{ value: 'Usage (kWh)', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="actualUsage" stroke="#8b5cf6" strokeWidth={2} name="Actual" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="predictedUsage" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" name="Predicted" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Profile</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData.timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 10 }} />
                            <YAxis label={{ value: 'kW', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
                            <Tooltip />
                            <Line type="monotone" dataKey="maxDemand" stroke="#3b82f6" strokeWidth={2} name="Max Demand" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Degree Days</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <ComposedChart data={chartData.timeSeriesData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 10 }} />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="hdd" fill="#3b82f6" name="HDD" />
                            <Bar dataKey="cdd" fill="#f97316" name="CDD" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regression Tab */}
                {activeTab === 'regression' && chartData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage vs Temperature</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <ComposedChart data={chartData.scatterData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="temperature" label={{ value: 'Temperature (°F)', position: 'bottom' }} stroke="#6b7280" />
                            <YAxis label={{ value: 'Usage (kWh)', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
                            <Tooltip />
                            <Scatter dataKey="actualUsage" fill="#8b5cf6" name="Actual" />
                            <Line type="linear" dataKey="predictedUsage" stroke="#ec4899" strokeWidth={2} dot={false} name="Regression" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Residual Analysis</h3>
                        <ResponsiveContainer width="100%" height={350}>
                          <ComposedChart data={chartData.scatterData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis label={{ value: 'Residual (kWh)', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
                            <Tooltip />
                            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                            <Bar dataKey="residual" fill="#8b5cf6" name="Residual" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Statistics Table */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-500">Total Usage</p>
                          <p className="text-xl font-bold text-gray-900">{regressionResult.statistics.totalUsage.toLocaleString()} kWh</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-500">Baseload</p>
                          <p className="text-xl font-bold text-gray-900">{regressionResult.baseload.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-500">Std Deviation</p>
                          <p className="text-xl font-bold text-gray-900">{regressionResult.statistics.stdDevUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-500">Slope</p>
                          <p className="text-xl font-bold text-gray-900">{regressionResult.temperatureRegression.slope.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insights Tab */}
                {activeTab === 'insights' && (
                  <div className="space-y-4">
                    {insights.length === 0 ? (
                      <div className="text-center py-12">
                        <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No insights generated yet</p>
                      </div>
                    ) : (
                      insights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`rounded-xl p-5 border ${getSeverityColor(insight.severity)}`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              insight.severity === 'critical' ? 'bg-red-200' :
                              insight.severity === 'warning' ? 'bg-yellow-200' :
                              insight.severity === 'success' ? 'bg-green-200' : 'bg-blue-200'
                            }`}>
                              {getCategoryIcon(insight.category)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{insight.title}</h4>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-white/50 capitalize">
                                  {insight.category}
                                </span>
                              </div>
                              <p className="text-sm mb-2">{insight.description}</p>
                              {insight.impact && (
                                <p className="text-sm opacity-80">
                                  <strong>Impact:</strong> {insight.impact}
                                </p>
                              )}
                              {insight.action && (
                                <p className="text-sm mt-2 font-medium">
                                  → {insight.action}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-4">
                    {recommendations.length === 0 ? (
                      <div className="text-center py-12">
                        <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No recommendations generated yet</p>
                      </div>
                    ) : (
                      recommendations.map((rec) => (
                        <div
                          key={rec.id}
                          className={`bg-white rounded-xl border-2 p-6 ${
                            rec.priority === 'high' ? 'border-purple-300' :
                            rec.priority === 'medium' ? 'border-blue-200' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-4xl">{rec.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">{rec.technology}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                  rec.priority === 'high' ? 'bg-purple-100 text-purple-700' :
                                  rec.priority === 'medium' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {rec.priority.toUpperCase()} PRIORITY
                                </span>
                              </div>
                              <p className="text-gray-600 mb-4">{rec.description}</p>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-green-50 rounded-lg p-3">
                                  <p className="text-sm text-green-600">Estimated Savings</p>
                                  <p className="text-lg font-bold text-green-800">
                                    ${rec.estimatedSavings.min.toLocaleString()} - ${rec.estimatedSavings.max.toLocaleString()}/yr
                                  </p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <p className="text-sm text-blue-600">Payback Period</p>
                                  <p className="text-lg font-bold text-blue-800">
                                    {rec.paybackYears.min === 0 ? 'Immediate' : `${rec.paybackYears.min}-${rec.paybackYears.max} years`}
                                  </p>
                                </div>
                              </div>

                              <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Why this recommendation:</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {rec.reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Next Steps:</p>
                                <div className="flex flex-wrap gap-2">
                                  {rec.nextSteps.map((step, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                      {idx + 1}. {step}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {rec.id === 'battery-storage' && (
                                <button
                                  onClick={shareWithBatteryCalculator}
                                  className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
                                >
                                  <Battery className="w-4 h-4" />
                                  Run Battery Calculator
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
