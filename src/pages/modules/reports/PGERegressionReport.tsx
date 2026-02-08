import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, TrendingUp, Calendar, Download, FileText, BarChart3, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import {
  parseIntervalData,
  performRegressionAnalysis,
  generateRegressionChartData,
  formatRegressionSummary,
  type Granularity,
  type RegressionAnalysisResult,
  type IntervalDataPoint,
} from '@utils/regression-analysis';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ChartDataPoint {
  period: string;
  date?: Date;
  actualUsage: number;
  predictedUsage: number;
  temperature: number;
  residual?: number;
  hdd?: number;
  cdd?: number;
  maxDemand?: number;
}

export const PGERegressionReport: React.FC = () => {
  const navigate = useNavigate();
  const [intervalData, setIntervalData] = useState<IntervalDataPoint[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [analysisResult, setAnalysisResult] = useState<RegressionAnalysisResult | null>(null);
  const [chartData, setChartData] = useState<{
    scatterData: ChartDataPoint[];
    timeSeriesData: ChartDataPoint[];
    regressionLine: { temperature: number; usage: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Load sample data on mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try multiple paths to find the sample data
      const paths = ['/data/INTERVAL.csv', '/INTERVAL.csv', './data/INTERVAL.csv'];
      let csvContent = '';
      
      for (const path of paths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            csvContent = await response.text();
            break;
          }
        } catch {
          // Try next path
        }
      }
      
      if (csvContent) {
        const data = parseIntervalData(csvContent);
        if (data.length > 0) {
          setIntervalData(data);
          setFileName('INTERVAL.csv (Sample Data)');
        }
      }
    } catch (err) {
      console.error('Error loading sample data:', err);
      // Don't show error for sample data, just leave empty
    } finally {
      setIsLoading(false);
    }
  };

  // Run analysis when data or granularity changes
  useEffect(() => {
    if (intervalData.length > 0) {
      runAnalysis();
    }
  }, [intervalData, granularity]);

  const runAnalysis = useCallback(() => {
    if (intervalData.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = performRegressionAnalysis(intervalData, granularity);
      setAnalysisResult(result);
      setChartData(generateRegressionChartData(result));
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to perform regression analysis. Please check data format.');
    } finally {
      setIsLoading(false);
    }
  }, [intervalData, granularity]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const data = parseIntervalData(text);
      
      if (data.length === 0) {
        throw new Error('No valid data found in file. Please check the CSV format.');
      }
      
      setIntervalData(data);
    } catch (err) {
      console.error('File upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!analysisResult) return;

    const doc = new jsPDF();
    const { temperatureRegression, statistics, aggregatedData } = analysisResult;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('PG&E Regression Analysis Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Granularity: ${granularity.charAt(0).toUpperCase() + granularity.slice(1)}`, 14, 34);
    doc.text(`Data Points: ${aggregatedData.length}`, 14, 40);

    let yPos = 50;

    // Model Equation
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Regression Model', 14, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(temperatureRegression.equation, 14, yPos);
    yPos += 15;

    // Model Statistics Table
    doc.setFontSize(14);
    doc.text('Model Fit Statistics', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value', 'Status']],
      body: [
        ['R² (Coefficient of Determination)', `${(temperatureRegression.rSquared * 100).toFixed(2)}%`, temperatureRegression.rSquared > 0.7 ? '✓ Good' : '⚠ Low'],
        ['Adjusted R²', `${(temperatureRegression.adjustedRSquared * 100).toFixed(2)}%`, ''],
        ['Standard Error', temperatureRegression.standardError.toFixed(2), ''],
        ['CV(RMSE)', `${statistics.cvrmse.toFixed(2)}%`, statistics.cvrmse < 25 ? '✓ PASS' : '✗ FAIL'],
        ['NMBE', `${statistics.nmbe.toFixed(2)}%`, Math.abs(statistics.nmbe) < 10 ? '✓ PASS' : '✗ FAIL'],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Energy Statistics
    doc.setFontSize(14);
    doc.text('Energy Statistics', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Metric', 'Value']],
      body: [
        ['Total Usage', `${statistics.totalUsage.toLocaleString()} kWh`],
        ['Average Usage', `${statistics.avgUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`],
        ['Max Usage', `${statistics.maxUsage.toLocaleString()} kWh`],
        ['Min Usage', `${statistics.minUsage.toLocaleString()} kWh`],
        ['Std. Deviation', `${statistics.stdDevUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh`],
        ['Baseload Estimate', `${analysisResult.baseload.toFixed(2)} kWh`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 10 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Add new page for data table if needed
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    // Data Table
    doc.setFontSize(14);
    doc.text('Aggregated Data', 14, yPos);
    yPos += 5;

    const dataRows = aggregatedData.slice(0, 24).map(d => [
      d.period,
      d.totalUsage.toLocaleString(undefined, { maximumFractionDigits: 0 }),
      d.avgTemperature.toFixed(1),
      d.maxDemand.toFixed(1),
      d.heatingDegreeDays.toFixed(1),
      d.coolingDegreeDays.toFixed(1),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Period', 'Usage (kWh)', 'Avg Temp (°F)', 'Max Demand (kW)', 'HDD', 'CDD']],
      body: dataRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | PG&E Regression Analysis | EverWatt Engine`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`PGE_Regression_${granularity}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    if (!analysisResult || !chartData) return;

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['PG&E Regression Analysis Report'],
      ['Generated', new Date().toLocaleString()],
      ['Granularity', granularity],
      [''],
      ['MODEL STATISTICS'],
      ['R²', analysisResult.temperatureRegression.rSquared],
      ['Adjusted R²', analysisResult.temperatureRegression.adjustedRSquared],
      ['Slope', analysisResult.temperatureRegression.slope],
      ['Intercept', analysisResult.temperatureRegression.intercept],
      ['Standard Error', analysisResult.temperatureRegression.standardError],
      [''],
      ['ASHRAE GUIDELINE 14 METRICS'],
      ['CV(RMSE) %', analysisResult.statistics.cvrmse],
      ['CV(RMSE) Status', analysisResult.statistics.cvrmse < 25 ? 'PASS' : 'FAIL'],
      ['NMBE %', analysisResult.statistics.nmbe],
      ['NMBE Status', Math.abs(analysisResult.statistics.nmbe) < 10 ? 'PASS' : 'FAIL'],
      [''],
      ['ENERGY STATISTICS'],
      ['Total Usage (kWh)', analysisResult.statistics.totalUsage],
      ['Average Usage (kWh)', analysisResult.statistics.avgUsage],
      ['Max Usage (kWh)', analysisResult.statistics.maxUsage],
      ['Min Usage (kWh)', analysisResult.statistics.minUsage],
      ['Std Deviation (kWh)', analysisResult.statistics.stdDevUsage],
      ['Baseload (kWh)', analysisResult.baseload],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Data Sheet
    const dataHeaders = ['Period', 'Start Date', 'End Date', 'Total Usage (kWh)', 'Predicted Usage (kWh)', 
                         'Residual', 'Avg Temperature (°F)', 'Max Demand (kW)', 'HDD', 'CDD', 'Data Points'];
    const dataRows = analysisResult.aggregatedData.map((d, i) => [
      d.period,
      d.startDate.toISOString().split('T')[0],
      d.endDate.toISOString().split('T')[0],
      d.totalUsage,
      chartData.scatterData[i]?.predictedUsage || 0,
      chartData.scatterData[i]?.residual || 0,
      d.avgTemperature,
      d.maxDemand,
      d.heatingDegreeDays,
      d.coolingDegreeDays,
      d.dataPoints,
    ]);

    const dataSheet = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows]);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    // Regression Details Sheet
    const regressionData = [
      ['REGRESSION DETAILS'],
      [''],
      ['Model Equation', analysisResult.temperatureRegression.equation],
      [''],
      ['Slope Analysis'],
      ['Temperature Coefficient', analysisResult.temperatureRegression.slope],
      ['Interpretation', `For each 1°F increase in temperature, usage ${analysisResult.temperatureRegression.slope > 0 ? 'increases' : 'decreases'} by ${Math.abs(analysisResult.temperatureRegression.slope).toFixed(2)} kWh`],
      [''],
      ['Confidence Interval (95%)'],
      ['Lower Bound', analysisResult.temperatureRegression.confidence95.lower],
      ['Upper Bound', analysisResult.temperatureRegression.confidence95.upper],
    ];

    const regressionSheet = XLSX.utils.aoa_to_sheet(regressionData);
    XLSX.utils.book_append_sheet(workbook, regressionSheet, 'Regression Details');

    XLSX.writeFile(workbook, `PGE_Regression_${granularity}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const granularityOptions: { value: Granularity; label: string; description: string }[] = [
    { value: 'hourly', label: 'Hourly', description: 'Aggregate by hour' },
    { value: 'daily', label: 'Daily', description: 'Aggregate by day' },
    { value: 'weekly', label: 'Weekly', description: 'Aggregate by week' },
    { value: 'monthly', label: 'Monthly', description: 'Aggregate by month' },
    { value: 'yearly', label: 'Yearly', description: 'Aggregate by year' },
  ];

  const getModelQuality = (rSquared: number): { label: string; color: string } => {
    if (rSquared >= 0.9) return { label: 'Excellent', color: 'text-green-600' };
    if (rSquared >= 0.7) return { label: 'Good', color: 'text-blue-600' };
    if (rSquared >= 0.5) return { label: 'Moderate', color: 'text-yellow-600' };
    return { label: 'Weak', color: 'text-red-600' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">PG&E Regression Analysis</h1>
                <p className="text-sm text-gray-500">Energy consumption pattern analysis</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {analysisResult && (
              <>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval Data (CSV)
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center gap-3">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {fileName || 'Upload PG&E interval data CSV...'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {intervalData.length > 0 && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {intervalData.length.toLocaleString()} data points loaded
                </p>
              )}
            </div>

            {/* Granularity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Granularity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {granularityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGranularity(option.value)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${
                      granularity === option.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Analysis Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Analyzing data...</p>
          </div>
        )}

        {/* Results */}
        {analysisResult && chartData && !isLoading && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">R² Score</span>
                  <span className={`text-xs font-medium ${getModelQuality(analysisResult.temperatureRegression.rSquared).color}`}>
                    {getModelQuality(analysisResult.temperatureRegression.rSquared).label}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(analysisResult.temperatureRegression.rSquared * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Coefficient of Determination</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">CV(RMSE)</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    analysisResult.statistics.cvrmse < 25 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {analysisResult.statistics.cvrmse < 25 ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analysisResult.statistics.cvrmse.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">ASHRAE limit: 25%</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">NMBE</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    Math.abs(analysisResult.statistics.nmbe) < 10 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {Math.abs(analysisResult.statistics.nmbe) < 10 ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analysisResult.statistics.nmbe.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">ASHRAE limit: ±10%</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Baseload</span>
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {analysisResult.baseload.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">kWh (weather-independent)</p>
              </div>
            </div>

            {/* Model Equation */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 mb-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-5 h-5" />
                <span className="font-medium">Regression Model Equation</span>
              </div>
              <p className="text-2xl font-mono">
                {analysisResult.temperatureRegression.equation}
              </p>
              <p className="text-sm text-purple-100 mt-2">
                For each 1°F increase in temperature, energy usage {analysisResult.temperatureRegression.slope > 0 ? 'increases' : 'decreases'} by {Math.abs(analysisResult.temperatureRegression.slope).toFixed(2)} kWh
              </p>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Scatter Plot with Regression Line */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage vs Temperature</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData.scatterData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="temperature" 
                      name="Temperature"
                      label={{ value: 'Temperature (°F)', position: 'bottom', offset: -5 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      label={{ value: 'Usage (kWh)', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-medium text-gray-900">{data.period}</p>
                            <p className="text-sm text-gray-600">Temperature: {data.temperature.toFixed(1)}°F</p>
                            <p className="text-sm text-blue-600">Actual: {data.actualUsage.toLocaleString()} kWh</p>
                            <p className="text-sm text-purple-600">Predicted: {data.predictedUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter 
                      dataKey="actualUsage" 
                      fill="#3b82f6"
                      name="Actual Usage"
                    />
                    <Line
                      type="linear"
                      dataKey="predictedUsage"
                      stroke="#9333ea"
                      strokeWidth={2}
                      dot={false}
                      name="Regression Line"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Time Series */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Predicted (Time Series)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="period" 
                      stroke="#6b7280"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      label={{ value: 'Usage (kWh)', angle: -90, position: 'insideLeft' }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                            <p className="font-medium text-gray-900">{data.period}</p>
                            <p className="text-sm text-blue-600">Actual: {data.actualUsage.toLocaleString()} kWh</p>
                            <p className="text-sm text-purple-600">Predicted: {data.predictedUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh</p>
                            <p className="text-sm text-orange-600">Temp: {data.temperature.toFixed(1)}°F</p>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="actualUsage" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Actual"
                      dot={{ r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predictedUsage" 
                      stroke="#9333ea" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Predicted"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Residuals Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Residual Analysis</h3>
              <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={chartData.scatterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="period" 
                    stroke="#6b7280"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    label={{ value: 'Residual (kWh)', angle: -90, position: 'insideLeft' }}
                    stroke="#6b7280"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="font-medium text-gray-900">{data.period}</p>
                          <p className={`text-sm ${(data.residual ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Residual: {(data.residual ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                  <Bar 
                    dataKey="residual" 
                    fill="#8b5cf6"
                    name="Residual"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-500 mt-2">
                Residuals show the difference between actual and predicted values. Random distribution around zero indicates a good model fit.
              </p>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Aggregated Data ({granularity})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Usage (kWh)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Predicted</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Residual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Temp (°F)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Max Demand (kW)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HDD</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CDD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analysisResult.aggregatedData.slice(0, 24).map((row, i) => (
                      <tr key={row.period} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.period}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {row.totalUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-purple-600">
                          {chartData.scatterData[i]?.predictedUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${
                          (chartData.scatterData[i]?.residual ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {(chartData.scatterData[i]?.residual ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.avgTemperature.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.maxDemand.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.heatingDegreeDays.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.coolingDegreeDays.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {analysisResult.aggregatedData.length > 24 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                  Showing 24 of {analysisResult.aggregatedData.length} rows. Export to Excel for full data.
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!analysisResult && !isLoading && !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Loaded</h3>
            <p className="text-gray-500 mb-4">
              Upload a PG&E interval data CSV file to begin regression analysis
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};
