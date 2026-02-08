import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calculator as CalculatorIcon, HandCoins, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../utils/format';

type LoadedAnalysis = {
  id: string;
  customerInfo?: { companyName?: string };
  cefoProject?: boolean;
  cefoLoanAmount?: number | null;
  calculationResult?: {
    annualSavings?: number;
    systemCost?: number;
    demandRate?: number;
    threshold?: number;
    paybackYears?: number;
  };
  analysisReportData?: {
    calculationResult?: {
      annualSavings?: number;
      systemCost?: number;
      demandRate?: number;
      threshold?: number;
      paybackYears?: number;
    };
  };
};

export const BatteryFinancialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const analysisId = params.get('analysisId') || '';

  const [analysis, setAnalysis] = useState<LoadedAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cost & financing inputs (financial stage only)
  const [hardwareCost, setHardwareCost] = useState<number>(0);
  const [laborCost, setLaborCost] = useState<number>(15000);
  const [materialsCost, setMaterialsCost] = useState<number>(8000);
  const [permitCost, setPermitCost] = useState<number>(5000);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [contingencyPercent, setContingencyPercent] = useState<number>(10);
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [financeApr, setFinanceApr] = useState<number>(7.5);
  const [financeTermMonths, setFinanceTermMonths] = useState<number>(120);
  const [downPayment, setDownPayment] = useState<number>(0);

  // CEFO eligibility + terms
  const [cefoProject, setCefoProject] = useState(false);
  const [cefoLastObfApprovalDate, setCefoLastObfApprovalDate] = useState<string>('');
  const [cefoPreviousObfAmount, setCefoPreviousObfAmount] = useState<number>(0);
  const [cefoPreviousObfTermMonths, setCefoPreviousObfTermMonths] = useState<number>(120);
  const [cefoDesiredAmount, setCefoDesiredAmount] = useState<number>(0);

  useEffect(() => {
    if (!analysisId) {
      setError('Missing analysisId. Return to Battery Analysis and continue again.');
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analyses/${analysisId}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.analysis) {
          throw new Error(json?.error || 'Failed to load analysis');
        }
        if (cancelled) return;
        const a = json.analysis as LoadedAnalysis;
        setAnalysis(a);

        const calc = a.calculationResult || a.analysisReportData?.calculationResult;
        const baseHardware = calc?.systemCost ?? 0;
        setHardwareCost(baseHardware);
        setCefoProject(Boolean(a.cefoProject));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load analysis');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const cefoEligibility = useMemo(() => {
    if (!cefoLastObfApprovalDate) {
      return { eligible: null as boolean | null, monthsSinceApproval: null as number | null, reason: 'Enter approval date' };
    }
    const parsed = new Date(cefoLastObfApprovalDate);
    if (Number.isNaN(parsed.getTime())) {
      return { eligible: null as boolean | null, monthsSinceApproval: null as number | null, reason: 'Invalid date' };
    }
    const now = new Date();
    const monthsSinceApproval = (now.getFullYear() - parsed.getFullYear()) * 12 + (now.getMonth() - parsed.getMonth());
    const eligible = monthsSinceApproval <= 24;
    return {
      eligible,
      monthsSinceApproval,
      reason: eligible ? null : 'Approval date older than 24 months',
    };
  }, [cefoLastObfApprovalDate]);

  const calc = analysis?.calculationResult || analysis?.analysisReportData?.calculationResult;
  const annualSavings = calc?.annualSavings ?? 0;

  const financials = useMemo(() => {
    const subtotal = hardwareCost + laborCost + materialsCost + permitCost + otherCost;
    const contingency = subtotal * (contingencyPercent / 100);
    const markup = subtotal * (markupPercent / 100);
    const projectTotal = subtotal + contingency + markup;

    const cefoCeiling = cefoPreviousObfAmount || 0;
    const cefoEligible = cefoProject && cefoEligibility.eligible === true;
    const cefoAmount = cefoEligible ? Math.min(Math.max(0, cefoDesiredAmount || cefoCeiling), cefoCeiling) : 0;
    const cefoTerm = cefoPreviousObfTermMonths > 0 ? cefoPreviousObfTermMonths : 1;
    const cefoMonthly = cefoAmount > 0 ? cefoAmount / cefoTerm : 0;

    const principalForLoan = Math.max(0, projectTotal - cefoAmount - downPayment);
    const monthlyRate = financeApr > 0 ? financeApr / 100 / 12 : 0;
    const term = financeTermMonths > 0 ? financeTermMonths : 1;
    const standardMonthly =
      principalForLoan === 0
        ? 0
        : monthlyRate === 0
          ? principalForLoan / term
          : principalForLoan *
            ((monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1));

    const blendedMonthly = cefoMonthly + standardMonthly;
    const outOfPocket = Math.max(0, projectTotal - cefoAmount - principalForLoan);
    const effectiveProjectCost = projectTotal - cefoAmount;
    const simplePaybackYears = annualSavings > 0 ? effectiveProjectCost / annualSavings : Infinity;

    return {
      subtotal,
      contingency,
      markup,
      projectTotal,
      cefoCeiling,
      cefoEligible,
      cefoAmount,
      cefoTerm,
      cefoMonthly,
      principalForLoan,
      standardMonthly,
      blendedMonthly,
      outOfPocket,
      effectiveProjectCost,
      simplePaybackYears,
    };
  }, [
    hardwareCost,
    laborCost,
    materialsCost,
    permitCost,
    otherCost,
    contingencyPercent,
    markupPercent,
    cefoPreviousObfAmount,
    cefoDesiredAmount,
    cefoProject,
    cefoEligibility,
    cefoPreviousObfTermMonths,
    financeApr,
    financeTermMonths,
    downPayment,
    annualSavings,
  ]);

  if (loading) {
    return <div className="p-6 lg:p-10">Loading financials…</div>;
  }

  if (error) {
    return (
      <div className="p-6 lg:p-10 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/calculator/battery')}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Battery Financials</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/calculator/battery?analysisId=${encodeURIComponent(analysisId)}`)}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs uppercase font-semibold text-emerald-700 flex items-center gap-2">
              <HandCoins className="w-4 h-4" />
              Financials (separate step)
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Interactive ROI & Payments</h1>
            <p className="text-sm text-gray-600">
              Energy savings stay fixed from the selected battery. Add-ons and financing update ROI/payments only.
            </p>
          </div>
        </div>
      </div>

      {/* Savings stays fixed */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Annual Savings (from analysis)</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(annualSavings, 'USD', 0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Demand Rate</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(calc?.demandRate ?? 0, 'USD', 2)}/kW-month</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Analysis ID</p>
          <p className="text-sm font-mono text-gray-700">{analysis?.id}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Cost stack</h2>
          </div>
          <p className="text-xs text-gray-500">Live totals update below</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Battery hardware ($)</label>
                <input
                  type="number"
                  value={hardwareCost}
                  onChange={(e) => setHardwareCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Labor ($)</label>
                <input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Other materials / BOS ($)</label>
                <input
                  type="number"
                  value={materialsCost}
                  onChange={(e) => setMaterialsCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Permits & fees ($)</label>
                <input
                  type="number"
                  value={permitCost}
                  onChange={(e) => setPermitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Other soft costs ($)</label>
                <input
                  type="number"
                  value={otherCost}
                  onChange={(e) => setOtherCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600 flex items-center justify-between">
                    <span>Contingency (%)</span>
                    <span className="text-[10px] text-gray-500">{contingencyPercent}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={contingencyPercent}
                    onChange={(e) => setContingencyPercent(parseFloat(e.target.value) || 0)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 flex items-center justify-between">
                    <span>Markup (%)</span>
                    <span className="text-[10px] text-gray-500">{markupPercent}%</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={1}
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Financing */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Financing</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-600">APR (%)</label>
                  <input
                    type="number"
                    value={financeApr}
                    onChange={(e) => setFinanceApr(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Term (months)</label>
                  <input
                    type="number"
                    value={financeTermMonths}
                    onChange={(e) => setFinanceTermMonths(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Down payment ($)</label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CEFO */}
            <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <p className="text-sm font-semibold text-emerald-900">CEFO Loan</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700">Enable CEFO</span>
                  <button
                    onClick={() => setCefoProject((prev) => !prev)}
                    className={`w-12 h-6 rounded-full transition-colors ${cefoProject ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${cefoProject ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {cefoProject ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-emerald-800">Last OBF approval date (PHS)</label>
                    <input
                      type="date"
                      value={cefoLastObfApprovalDate}
                      onChange={(e) => setCefoLastObfApprovalDate(e.target.value)}
                      className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-emerald-700 mt-1">Must be within 24 months to qualify.</p>
                  </div>
                  <div>
                    <label className="text-xs text-emerald-800">Previous total OBF amount ($)</label>
                    <input
                      type="number"
                      value={cefoPreviousObfAmount}
                      onChange={(e) => setCefoPreviousObfAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-emerald-800">Previous OBF term (months)</label>
                    <input
                      type="number"
                      value={cefoPreviousObfTermMonths}
                      onChange={(e) => setCefoPreviousObfTermMonths(Math.max(1, parseFloat(e.target.value) || 1))}
                      className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-emerald-800">Desired CEFO amount ($)</label>
                    <input
                      type="number"
                      value={cefoDesiredAmount}
                      disabled={!cefoEligibility.eligible}
                      onChange={(e) => setCefoDesiredAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="mt-1 w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                    />
                    <p className="text-[11px] text-emerald-700 mt-1">Capped at prior OBF amount ({formatCurrency(financials.cefoCeiling, 'USD', 0)}).</p>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 text-sm">
                    {cefoEligibility.eligible === true && (
                      <span className="inline-flex items-center gap-2 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" /> Eligible (within 24 months)
                      </span>
                    )}
                    {cefoEligibility.eligible === false && (
                      <span className="inline-flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4" /> Not eligible: {cefoEligibility.reason}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Project total (with markup & contingency)</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(financials.projectTotal, 'USD', 0)}</p>
              <p className="text-xs text-gray-600 mt-1">Hardware: {formatCurrency(hardwareCost, 'USD', 0)}</p>
            </div>
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-700 mb-1">CEFO monthly (if eligible)</p>
              <p className="text-2xl font-bold text-emerald-900">{formatCurrency(financials.cefoMonthly, 'USD', 0)}</p>
              <p className="text-xs text-emerald-700 mt-1">Amount: {formatCurrency(financials.cefoAmount, 'USD', 0)} · Term: {financials.cefoTerm} mo</p>
            </div>
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-700 mb-1">Standard loan monthly (non-CEFO portion)</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(financials.standardMonthly, 'USD', 0)}</p>
              <p className="text-xs text-blue-700 mt-1">Financed: {formatCurrency(financials.principalForLoan, 'USD', 0)} · APR {formatNumber(financeApr, 2)}% · {financeTermMonths} mo</p>
            </div>
            <div className="border border-purple-200 bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-purple-700 mb-1">Blended monthly payment</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(financials.blendedMonthly, 'USD', 0)}</p>
              <p className="text-xs text-purple-700 mt-1">Includes CEFO + standard loan</p>
            </div>
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-amber-700 mb-1">Simple payback (annualized savings)</p>
              <p className="text-xl font-bold text-amber-900">
                {Number.isFinite(financials.simplePaybackYears) ? `${formatNumber(financials.simplePaybackYears, 1)} years` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

