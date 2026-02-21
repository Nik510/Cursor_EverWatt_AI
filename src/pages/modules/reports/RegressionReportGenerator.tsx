import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Upload,
  TrendingUp,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  Table as TableIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  performRegressionAnalysis,
  generateRegressionChartData,
  computeUncertaintyMetrics,
  type Granularity,
  type RegressionAnalysisResult,
  type RegressionResult,
} from '@utils/regression-analysis';
import { loadIntervalCsv, loadWeatherTemperatureMap, mergeWeatherIntoIntervalData } from '@utils/regression-data-loader';
import { type DetectedSchema } from '@utils/data-column-detector';
import { exportRegressionToExcel, exportRegressionToPDF } from '@utils/regression-report-exporter';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  ReferenceLine,
  Bar,
} from 'recharts';

type ModelChoice = 'auto' | 'linear' | 'hddcdd' | 'change-point' | 'towt';

type GranularityKey = Extract<Granularity, 'hourly' | 'daily' | 'weekly' | 'monthly'>;

const GRANULARITIES: GranularityKey[] = ['hourly', 'daily', 'weekly', 'monthly'];

function pickModel(result: RegressionAnalysisResult, choice: ModelChoice): RegressionResult {
  const fallback = result.temperatureRegression;
  if (choice === 'linear') return result.temperatureRegression ?? fallback;
  if (choice === 'hddcdd') return result.multivariateRegression ?? fallback;
  if (choice === 'change-point') return result.changePointRegression ?? fallback;
  if (choice === 'towt') return result.towtRegression ?? fallback;

  // auto
  const candidates: Array<{ name: ModelChoice; reg: RegressionResult | null | undefined }> = [
    { name: 'towt', reg: result.towtRegression },
    { name: 'change-point', reg: result.changePointRegression },
    { name: 'hddcdd', reg: result.multivariateRegression },
    { name: 'linear', reg: result.temperatureRegression },
  ];
  const ranked = candidates
    .filter((c) => c.reg)
    .map((c) => c.reg!)
    .sort((a, b) => (b.rSquared ?? 0) - (a.rSquared ?? 0));
  return ranked[0] ?? fallback;
}

function formatPct(v: number | undefined, digits: number = 1): string {
  if (!Number.isFinite(v)) return '—';
  return `${(v as number).toFixed(digits)}%`;
}

function formatNum(v: number | undefined, digits: number = 2): string {
  if (!Number.isFinite(v)) return '—';
  return (v as number).toFixed(digits);
}

export const RegressionReportGenerator: React.FC = () => {
  const navigate = useNavigate();

  const [intervalFileName, setIntervalFileName] = useState<string>('');
  const [weatherFileName, setWeatherFileName] = useState<string>('');
  const [intervalSchema, setIntervalSchema] = useState<DetectedSchema | null>(null);
  const [weatherSchema, setWeatherSchema] = useState<DetectedSchema | null>(null);
  const [intervalCsv, setIntervalCsv] = useState<string>('');
  const [weatherCsv, setWeatherCsv] = useState<string>('');
  const [mappingOverride, setMappingOverride] = useState<Record<string, number | undefined>>({});
  const [modelChoice, setModelChoice] = useState<ModelChoice>('auto');
  const [results, setResults] = useState<Record<GranularityKey, RegressionAnalysisResult> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedGranularity, setExpandedGranularity] = useState<GranularityKey>('monthly');
  const [intervalSheetUrl, setIntervalSheetUrl] = useState<string>('');
  const [weatherSheetUrl, setWeatherSheetUrl] = useState<string>('');

  const hasIntervalData = Boolean(intervalCsv);

  const recompute = async () => {
    if (!intervalCsv) return;
    setIsLoading(true);
    setError(null);
    try {
      const interval = loadIntervalCsv(intervalCsv, {
        datetimeIndex: mappingOverride.interval_datetimeIndex,
        dateIndex: mappingOverride.interval_dateIndex,
        timeIndex: mappingOverride.interval_timeIndex,
        usageIndex: mappingOverride.interval_usageIndex,
        demandIndex: mappingOverride.interval_demandIndex,
        temperatureIndex: mappingOverride.interval_temperatureIndex,
        hddIndex: mappingOverride.interval_hddIndex,
        cddIndex: mappingOverride.interval_cddIndex,
      });
      setIntervalSchema(interval.detected);

      let data = interval.data;
      if (weatherCsv) {
        const weather = loadWeatherTemperatureMap(weatherCsv, {
          datetimeIndex: mappingOverride.weather_datetimeIndex,
          dateIndex: mappingOverride.weather_dateIndex,
          timeIndex: mappingOverride.weather_timeIndex,
          temperatureIndex: mappingOverride.weather_temperatureIndex,
          hddIndex: mappingOverride.weather_hddIndex,
          cddIndex: mappingOverride.weather_cddIndex,
        });
        setWeatherSchema(weather.detected);
        data = mergeWeatherIntoIntervalData(data, weather);
      }

      const next: Record<GranularityKey, RegressionAnalysisResult> = {
        hourly: performRegressionAnalysis(data, 'hourly'),
        daily: performRegressionAnalysis(data, 'daily'),
        weekly: performRegressionAnalysis(data, 'weekly'),
        monthly: performRegressionAnalysis(data, 'monthly'),
      };
      setResults(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!intervalCsv) return;
    void recompute();
    // Only re-run when raw data or mapping override changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalCsv, weatherCsv, JSON.stringify(mappingOverride)]);

  const summaryCards = useMemo(() => {
    if (!results) return null;
    return GRANULARITIES.map((g) => {
      const res = results[g];
      const reg = pickModel(res, modelChoice);
      const diag = reg.diagnostics;
      return {
        granularity: g,
        points: res.aggregatedData.length,
        r2: reg.rSquared,
        adjR2: reg.adjustedRSquared,
        rmse: diag?.rmse,
        cvrmse: diag?.cvrmse,
        nmbe: diag?.nmbe,
        modelType: res.nmecCompliance.modelType,
      };
    });
  }, [results, modelChoice]);

  const expanded = results ? results[expandedGranularity] : null;
  const expandedRegression = expanded ? pickModel(expanded, modelChoice) : null;
  const expandedUncertainty = useMemo(() => {
    if (!expanded || !expandedRegression) return null;
    return computeUncertaintyMetrics({
      aggregatedData: expanded.aggregatedData,
      regression: expandedRegression,
      confidence: 0.9,
      assumedSavingsFraction: 0.1,
    });
  }, [expanded, expandedRegression]);

  const expandedChartData = useMemo(() => {
    if (!expanded || !expandedRegression) return null;
    return generateRegressionChartData(expanded, expandedRegression);
  }, [expanded, expandedRegression]);

  const readFileAsCsvText = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!isExcel) return await file.text();

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error('Excel file has no sheets');
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error('Excel sheet not found');
    const csv = XLSX.utils.sheet_to_csv(ws);
    if (!csv.trim()) throw new Error('Excel sheet is empty');
    return csv;
  };

  const importGoogleSheet = async (url: string, kind: 'interval' | 'weather') => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/import/google-sheets?url=${encodeURIComponent(trimmed)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to import Google Sheet (${res.status})`);
      }
      const csv = String(json?.csv || '');
      if (!csv.trim()) throw new Error('Google Sheet returned empty data');

      if (kind === 'interval') {
        setIntervalFileName('GoogleSheet');
        setIntervalCsv(csv);
      } else {
        setWeatherFileName('GoogleSheet');
        setWeatherCsv(csv);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to import Google Sheet. If this is a private sheet, download as CSV/XLSX and upload instead.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntervalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIntervalFileName(file.name);
    setIsLoading(true);
    setError(null);
    try {
      const text = await readFileAsCsvText(file);
      setIntervalCsv(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read interval file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeatherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWeatherFileName(file.name);
    setIsLoading(true);
    setError(null);
    try {
      const text = await readFileAsCsvText(file);
      setWeatherCsv(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read weather file');
    } finally {
      setIsLoading(false);
    }
  };

  const renderColumnMapping = (schema: DetectedSchema | null, prefix: 'interval' | 'weather') => {
    if (!schema) return null;
    const cols = schema.columns;
    const options = [{ value: '', label: '—' }].concat(
      cols.map((c) => ({
        value: String(c.index),
        label: `${c.header}  (role=${c.role}, conf=${c.confidence})`,
      }))
    );

    const setIdx = (key: string, v: string) => {
      setMappingOverride((prev) => ({ ...prev, [key]: v ? Number(v) : undefined }));
    };

    const best = schema.bestGuess;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TableIcon className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">
            {prefix === 'interval' ? 'Interval' : 'Weather'} column mapping
          </h3>
          <span className="text-xs text-gray-500">(auto-detected; override if needed)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { key: 'datetimeIndex', label: 'Datetime' },
            { key: 'dateIndex', label: 'Date' },
            { key: 'timeIndex', label: 'Time' },
            { key: 'usageIndex', label: 'Usage (kWh)' },
            { key: 'demandIndex', label: 'Demand (kW)' },
            { key: 'temperatureIndex', label: 'Temperature (°F)' },
            { key: 'hddIndex', label: 'HDD' },
            { key: 'cddIndex', label: 'CDD' },
          ].map((f) => {
            const overrideKey = `${prefix}_${f.key}`;
            const current =
              mappingOverride[overrideKey] !== undefined
                ? String(mappingOverride[overrideKey])
                : best[f.key as keyof typeof best] !== undefined
                  ? String(best[f.key as keyof typeof best] as number)
                  : '';
            return (
              <label key={overrideKey} className="block">
                <div className="text-xs font-medium text-gray-700 mb-1">{f.label}</div>
                <select
                  value={current}
                  onChange={(ev) => setIdx(overrideKey, ev.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Regression Analysis (Report Generator)</h1>
                <p className="text-sm text-gray-500">Interval + Weather modeling (Hourly / Daily / Weekly / Monthly)</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (!results) return;
                exportRegressionToPDF({
                  title: 'Regression Analysis Report',
                  modelChoice,
                  results,
                });
              }}
              disabled={!results}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                results ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={() => {
                if (!results) return;
                exportRegressionToExcel({
                  title: 'Regression Analysis Report',
                  modelChoice,
                  results,
                });
              }}
              disabled={!results}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                results ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Uploads */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interval data (CSV)</label>
              <label className="flex cursor-pointer">
                <div className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center gap-3">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{intervalFileName || 'Upload interval CSV...'}</span>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleIntervalUpload} className="hidden" />
              </label>
              {hasIntervalData && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Interval file loaded
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={intervalSheetUrl}
                  onChange={(e) => setIntervalSheetUrl(e.target.value)}
                  placeholder="Or paste Google Sheets URL…"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => importGoogleSheet(intervalSheetUrl, 'interval')}
                  className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                >
                  Import
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weather data (optional CSV/Excel)</label>
              <label className="flex cursor-pointer">
                <div className="flex-1 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors flex items-center gap-3">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">{weatherFileName || 'Upload weather CSV (optional)...'}</span>
                </div>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleWeatherUpload} className="hidden" />
              </label>
              {weatherCsv && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Weather file loaded
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  value={weatherSheetUrl}
                  onChange={(e) => setWeatherSheetUrl(e.target.value)}
                  placeholder="Or paste Google Sheets URL…"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => importGoogleSheet(weatherSheetUrl, 'weather')}
                  className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                >
                  Import
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { id: 'auto', label: 'Auto (best R²)' },
                { id: 'linear', label: 'Linear (Temp)' },
                { id: 'hddcdd', label: 'HDD/CDD' },
                { id: 'change-point', label: 'Change-Point' },
                { id: 'towt', label: 'TOWT' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModelChoice(m.id as ModelChoice)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    modelChoice === (m.id as ModelChoice)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Analysis Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Analyzing data…</p>
          </div>
        )}

        {/* Column mapping */}
        {!isLoading && hasIntervalData && (
          <div className="grid grid-cols-1 gap-6">
            {renderColumnMapping(intervalSchema, 'interval')}
            {weatherCsv && renderColumnMapping(weatherSchema, 'weather')}
          </div>
        )}

        {/* Summary */}
        {!isLoading && results && summaryCards && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c) => (
              <button
                key={c.granularity}
                onClick={() => setExpandedGranularity(c.granularity)}
                className={`bg-white rounded-xl border p-5 text-left hover:shadow transition-all ${
                  expandedGranularity === c.granularity ? 'border-purple-400' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {c.granularity.charAt(0).toUpperCase() + c.granularity.slice(1)}
                  </span>
                  <span className="text-xs text-gray-500">{c.points} pts</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">R²</span>
                    <span className="font-medium text-gray-900">{formatNum((c.r2 ?? 0) * 100, 1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">CVRMSE</span>
                    <span className="font-medium text-gray-900">{formatPct(c.cvrmse, 1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">NMBE</span>
                    <span className="font-medium text-gray-900">{formatPct(c.nmbe, 1)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Details */}
        {!isLoading && expanded && expandedRegression && expandedChartData && (
          <>
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-5 h-5" />
                <span className="font-medium">
                  {expandedGranularity.toUpperCase()} • Model equation
                </span>
              </div>
              <p className="text-lg font-mono break-words">{expandedRegression.equation}</p>
              <p className="text-sm text-purple-100 mt-2">
                Model choice: <span className="font-semibold">{modelChoice.toUpperCase()}</span> • Auto model-type hint:{' '}
                <span className="font-semibold">{expanded.nmecCompliance.modelType}</span>
              </p>
            </div>

            {/* Key metrics + Uncertainty */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Fit</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Multiple R</span>
                    <span className="font-medium text-gray-900">{formatNum(expandedRegression.diagnostics?.multipleR, 4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">R²</span>
                    <span className="font-medium text-gray-900">{formatNum(expandedRegression.rSquared, 4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Adj R²</span>
                    <span className="font-medium text-gray-900">{formatNum(expandedRegression.adjustedRSquared, 4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">RMSE</span>
                    <span className="font-medium text-gray-900">{formatNum(expandedRegression.diagnostics?.rmse, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">CVRMSE</span>
                    <span className="font-medium text-gray-900">{formatPct(expandedRegression.diagnostics?.cvrmse, 2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">NMBE</span>
                    <span className="font-medium text-gray-900">{formatPct(expandedRegression.diagnostics?.nmbe, 2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">ANOVA</h3>
                {expandedRegression.anova ? (
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">F</span>
                      <span className="font-medium text-gray-900">{formatNum(expandedRegression.anova.fStatistic, 4)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Significance F</span>
                      <span className="font-medium text-gray-900">{formatNum(expandedRegression.anova.significanceF, 6)}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">Source</th>
                            <th className="text-right py-1">df</th>
                            <th className="text-right py-1">SS</th>
                            <th className="text-right py-1">MS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1 text-gray-700">Regression</td>
                            <td className="py-1 text-right">{expandedRegression.anova.regression.df}</td>
                            <td className="py-1 text-right">{formatNum(expandedRegression.anova.regression.ss, 0)}</td>
                            <td className="py-1 text-right">{formatNum(expandedRegression.anova.regression.ms, 0)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-gray-700">Residual</td>
                            <td className="py-1 text-right">{expandedRegression.anova.residual.df}</td>
                            <td className="py-1 text-right">{formatNum(expandedRegression.anova.residual.ss, 0)}</td>
                            <td className="py-1 text-right">{formatNum(expandedRegression.anova.residual.ms, 0)}</td>
                          </tr>
                          <tr>
                            <td className="py-1 text-gray-700">Total</td>
                            <td className="py-1 text-right">{expandedRegression.anova.total.df}</td>
                            <td className="py-1 text-right">{formatNum(expandedRegression.anova.total.ss, 0)}</td>
                            <td className="py-1 text-right">—</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">ANOVA is not available for this model.</p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Uncertainty (90% CI, 10% savings)</h3>
                {expandedUncertainty ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">M</span>
                      <span className="font-medium text-gray-900">{expandedUncertainty.M}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">m</span>
                      <span className="font-medium text-gray-900">{expandedUncertainty.m.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">df</span>
                      <span className="font-medium text-gray-900">{expandedUncertainty.df}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">CI</span>
                      <span className="font-medium text-gray-900">{formatPct(expandedUncertainty.CI * 100, 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">t</span>
                      <span className="font-medium text-gray-900">{formatNum(expandedUncertainty.t, 6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">U</span>
                      <span className="font-medium text-gray-900">{formatPct(expandedUncertainty.U * 100, 2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Uncertainty is not available.</p>
                )}
              </div>
            </div>

            {/* Coefficients */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Coefficients</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Term</th>
                      <th className="px-4 py-3 text-right">Coef</th>
                      <th className="px-4 py-3 text-right">Std Err</th>
                      <th className="px-4 py-3 text-right">t</th>
                      <th className="px-4 py-3 text-right">p</th>
                      <th className="px-4 py-3 text-right">90% CI</th>
                      <th className="px-4 py-3 text-right">95% CI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(expandedRegression.coefficients ?? []).map((c) => (
                      <tr key={c.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.value, 6)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.standardError, 6)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.tStat, 4)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{formatNum(c.pValue, 6)}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNum(c.ci90.lower, 4)} / {formatNum(c.ci90.upper, 4)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatNum(c.ci95.lower, 4)} / {formatNum(c.ci95.upper, 4)}
                        </td>
                      </tr>
                    ))}
                    {(!expandedRegression.coefficients || expandedRegression.coefficients.length === 0) && (
                      <tr>
                        <td className="px-4 py-6 text-gray-500" colSpan={7}>
                          Coefficients table is not available for this model.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage vs Temperature</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={expandedChartData.scatterData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="temperature" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Scatter dataKey="actualUsage" fill="#3b82f6" name="Actual" />
                    <Line type="linear" dataKey="predictedUsage" stroke="#9333ea" strokeWidth={2} dot={false} name="Predicted" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actual vs Predicted (Time Series)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={expandedChartData.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" stroke="#6b7280" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#6b7280" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="actualUsage" stroke="#3b82f6" strokeWidth={2} name="Actual" dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="predictedUsage" stroke="#9333ea" strokeWidth={2} name="Predicted" dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Residuals</h3>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={expandedChartData.scatterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" stroke="#6b7280" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={2} />
                  <Bar dataKey="residual" fill="#8b5cf6" name="Residual" />
                </ComposedChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-500 mt-2">
                Residuals show (Actual − Predicted). Random scatter around zero usually indicates a better fit.
              </p>
            </div>

            {/* Data table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Aggregated data ({expandedGranularity})
                </h3>
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
                    {expanded.aggregatedData.slice(0, 48).map((row, i) => (
                      <tr key={row.period} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.period}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">
                          {row.totalUsage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-purple-600">
                          {expandedRegression.predictedValues[i]?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right ${
                            (expandedRegression.residuals[i] ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {(expandedRegression.residuals[i] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.avgTemperature.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.maxDemand.toFixed(1)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.heatingDegreeDays.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{row.coolingDegreeDays.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {expanded.aggregatedData.length > 48 && (
                <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                  Showing 48 of {expanded.aggregatedData.length} rows. Export to Excel for the full table.
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {!isLoading && !results && !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload data to build the model</h3>
            <p className="text-gray-500 mb-4">
              Provide interval data (and optional weather) and the system will auto-detect columns and run all granularities.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              Upload Interval CSV
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleIntervalUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
};


