import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Leaf,
  Download,
  Sparkles,
  BadgeCheck,
  Building2,
  Calendar,
  User,
  MapPin,
  Zap,
  Flame,
  Trees,
  Car,
  Fuel,
  Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  calculateCarbonTotals,
  calculateEpaEquivalencies,
  getElectricityFactorTonsPerKwh,
  type ElectricityFactorMode,
} from '../../../utils/carbon/epa-equivalencies';
import {
  generateCarbonFootprintCertificatePdf,
  generateCarbonFootprintReportPdf,
} from '../../../utils/carbon/carbon-report-pdf';

function fmtNum(n: number, digits: number = 0): string {
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtDateLabel(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const CarbonFootprintReport: React.FC = () => {
  const navigate = useNavigate();

  // Customer + project
  const [customerName, setCustomerName] = useState('Acme Facilities');
  const [projectName, setProjectName] = useState('Energy Efficiency Upgrade');
  const [siteAddress, setSiteAddress] = useState('123 Market St, San Francisco, CA');
  const [periodStart, setPeriodStart] = useState<string>('2025-01-01');
  const [periodEnd, setPeriodEnd] = useState<string>('2025-12-31');

  // Savings inputs
  const [avoidedKwh, setAvoidedKwh] = useState<number>(250000);
  const [avoidedTherms, setAvoidedTherms] = useState<number>(12000);
  const [electricityFactorMode, setElectricityFactorMode] = useState<ElectricityFactorMode>('avoided');
  const [customElectricityTonsPerKwh, setCustomElectricityTonsPerKwh] = useState<number>(0.0003);

  // Recognition / certificate
  const [leadName, setLeadName] = useState('Jordan Lee');
  const [leadTitle, setLeadTitle] = useState('Project Lead');
  const [leadOrg, setLeadOrg] = useState(customerName);
  const [completionDate, setCompletionDate] = useState<string>(fmtDateLabel(new Date()));
  const [recognitionLine, setRecognitionLine] = useState<string>(
    'For leadership and craftsmanship turning energy savings into measurable climate impact.'
  );

  const reportPeriodLabel = useMemo(() => {
    const s = (periodStart || '').trim();
    const e = (periodEnd || '').trim();
    if (s && e) return `${s} – ${e}`;
    if (s) return `From ${s}`;
    if (e) return `Through ${e}`;
    return 'Reporting period';
  }, [periodStart, periodEnd]);

  const totals = useMemo(() => {
    return calculateCarbonTotals({
      avoidedKwh,
      avoidedTherms,
      electricityFactorMode,
      customElectricityTonsPerKwh: electricityFactorMode === 'custom' ? customElectricityTonsPerKwh : undefined,
    });
  }, [avoidedKwh, avoidedTherms, electricityFactorMode, customElectricityTonsPerKwh]);

  const electricityFactorTonsPerKwh = useMemo(() => {
    return getElectricityFactorTonsPerKwh({
      avoidedKwh,
      avoidedTherms,
      electricityFactorMode,
      customElectricityTonsPerKwh: electricityFactorMode === 'custom' ? customElectricityTonsPerKwh : undefined,
    });
  }, [avoidedKwh, avoidedTherms, electricityFactorMode, customElectricityTonsPerKwh]);

  const equiv = useMemo(() => calculateEpaEquivalencies(totals.totalMtCo2e), [totals.totalMtCo2e]);

  const headline = useMemo(() => {
    const mt = totals.totalMtCo2e;
    if (mt <= 0) return 'Enter savings to see impact';
    if (mt < 1) return `${fmtNum(mt, 2)} metric tons CO₂e avoided`;
    return `${fmtNum(mt, 1)} metric tons CO₂e avoided`;
  }, [totals.totalMtCo2e]);

  const handleDownloadReport = () => {
    const blob = generateCarbonFootprintReportPdf({
      meta: {
        customerName: customerName.trim() || 'Customer',
        projectName: projectName.trim() || 'Project',
        siteAddress: siteAddress.trim() || 'Site',
        reportPeriodLabel,
        generatedAt: new Date().toLocaleString(),
      },
      inputs: {
        avoidedKwh: Number(avoidedKwh || 0),
        avoidedTherms: Number(avoidedTherms || 0),
        electricityFactorMode,
        electricityFactorTonsPerKwh,
      },
      totals,
      equiv,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Carbon_Footprint_${(customerName || 'Customer').replace(/[^a-z0-9]/gi, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCertificate = () => {
    const blob = generateCarbonFootprintCertificatePdf({
      customerName: customerName.trim() || 'Customer',
      projectName: projectName.trim() || 'Project',
      siteAddress: siteAddress.trim() || 'Site',
      completionDateLabel: completionDate.trim() || fmtDateLabel(new Date()),
      leadName: leadName.trim() || 'Project Lead',
      leadTitle: leadTitle.trim() || 'Project Lead',
      leadOrg: (leadOrg || customerName).trim() || 'Organization',
      recognitionLine: recognitionLine.trim() || undefined,
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_${(leadName || 'Project_Lead').replace(/[^a-z0-9]/gi, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-colors"
              aria-label="Back to module hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Leaf className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <div className="text-white text-xl font-bold">Carbon Footprint</div>
                <div className="text-white/70 text-sm">EPA-based avoided emissions + certificate</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCertificate}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold flex items-center gap-2"
            >
              <BadgeCheck className="w-5 h-5" />
              Download Certificate
            </button>
            <button
              onClick={handleDownloadReport}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-sky-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-white font-bold mb-4">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              Report info
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Customer name</label>
            <div className="relative mb-4">
              <Building2 className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                placeholder="Customer / organization"
              />
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Project name</label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 mb-4"
              placeholder="Project"
            />

            <label className="block text-xs font-semibold text-white/70 mb-1">Site address</label>
            <div className="relative mb-4">
              <MapPin className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
              <input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                placeholder="Address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Period start</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Period end</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur">
            <div className="text-white font-bold mb-4">Savings inputs</div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Avoided electricity (kWh)</label>
            <div className="relative mb-4">
              <Zap className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
              <input
                type="number"
                value={Number.isFinite(avoidedKwh) ? avoidedKwh : 0}
                onChange={(e) => setAvoidedKwh(Number(e.target.value))}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Avoided natural gas (therms)</label>
            <div className="relative mb-4">
              <Flame className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
              <input
                type="number"
                value={Number.isFinite(avoidedTherms) ? avoidedTherms : 0}
                onChange={(e) => setAvoidedTherms(Number(e.target.value))}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Electricity emissions factor</label>
            <select
              value={electricityFactorMode}
              onChange={(e) => setElectricityFactorMode(e.target.value as ElectricityFactorMode)}
              className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            >
              <option value="avoided" className="text-slate-900">EPA: Electricity Avoided (national avg)</option>
              <option value="used" className="text-slate-900">EPA: Electricity Used (national avg)</option>
              <option value="custom" className="text-slate-900">Custom factor (mt CO₂e / kWh)</option>
            </select>

            {electricityFactorMode === 'custom' && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-white/70 mb-1">Custom factor (metric tons CO₂e per kWh)</label>
                <input
                  type="number"
                  step="0.000001"
                  value={Number.isFinite(customElectricityTonsPerKwh) ? customElectricityTonsPerKwh : 0}
                  onChange={(e) => setCustomElectricityTonsPerKwh(Number(e.target.value))}
                  className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
              </div>
            )}

            <div className="mt-3 text-xs text-white/60">
              Uses EPA Greenhouse Gas Equivalencies Calculator factors (national averages) unless custom is selected.
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur">
            <div className="text-white font-bold mb-4">Certificate</div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Project lead name</label>
            <div className="relative mb-3">
              <User className="w-4 h-4 text-white/50 absolute left-3 top-3.5" />
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Title</label>
                <input
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1">Organization</label>
                <input
                  value={leadOrg}
                  onChange={(e) => setLeadOrg(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                />
              </div>
            </div>

            <label className="block text-xs font-semibold text-white/70 mb-1">Completion date</label>
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 mb-3"
            />

            <label className="block text-xs font-semibold text-white/70 mb-1">Recognition line</label>
            <textarea
              value={recognitionLine}
              onChange={(e) => setRecognitionLine(e.target.value)}
              rows={3}
              className="w-full px-3 py-3 rounded-xl bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
            />
          </div>
        </div>

        {/* Visual summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl p-7 bg-gradient-to-br from-emerald-400/15 via-sky-400/10 to-white/5 border border-white/10 backdrop-blur">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-white/70 text-sm font-semibold">Headline impact</div>
                <div className="text-white text-4xl font-black tracking-tight mt-1">{headline}</div>
                <div className="text-white/70 mt-3 text-sm">
                  Period: <span className="text-white/90 font-semibold">{reportPeriodLabel}</span>
                </div>
              </div>
              <div className="hidden md:flex flex-col items-end">
                <div className="text-white/60 text-xs">Total (kg CO₂e)</div>
                <div className="text-white text-2xl font-extrabold">{fmtNum(totals.totalKgCo2e, 0)}</div>
                <div className="text-white/60 text-xs mt-2">Total (lb CO₂e)</div>
                <div className="text-white text-xl font-bold">{fmtNum(totals.totalLbCo2e, 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/7 border border-white/10 rounded-2xl p-5">
                <div className="text-white/70 text-xs font-semibold">Electricity (mt CO₂e)</div>
                <div className="text-white text-2xl font-extrabold mt-1">{fmtNum(totals.electricityMtCo2e, 2)}</div>
                <div className="text-white/60 text-xs mt-2">{fmtNum(avoidedKwh, 0)} kWh avoided</div>
              </div>
              <div className="bg-white/7 border border-white/10 rounded-2xl p-5">
                <div className="text-white/70 text-xs font-semibold">Natural gas (mt CO₂e)</div>
                <div className="text-white text-2xl font-extrabold mt-1">{fmtNum(totals.gasMtCo2e, 2)}</div>
                <div className="text-white/60 text-xs mt-2">{fmtNum(avoidedTherms, 0)} therms avoided</div>
              </div>
              <div className="bg-white/7 border border-white/10 rounded-2xl p-5">
                <div className="text-white/70 text-xs font-semibold">Electricity factor</div>
                <div className="text-white text-2xl font-extrabold mt-1">{fmtNum(electricityFactorTonsPerKwh, 6)}</div>
                <div className="text-white/60 text-xs mt-2">mt CO₂e per kWh</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-7 bg-white/5 border border-white/10 backdrop-blur">
            <div className="text-white font-bold text-lg mb-4">EPA equivalencies (fun + shareable)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/7 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 flex items-center justify-center">
                  <Trees className="w-6 h-6 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-extrabold text-xl">{fmtNum(equiv.urbanTreeSeedlings10yr, 0)}</div>
                  <div className="text-white/70 text-sm">tree seedlings grown for 10 years</div>
                </div>
              </div>

              <div className="bg-white/7 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-400/20 flex items-center justify-center">
                  <Car className="w-6 h-6 text-sky-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-extrabold text-xl">{fmtNum(equiv.passengerVehiclesDrivenForOneYear, 1)}</div>
                  <div className="text-white/70 text-sm">passenger vehicles driven for one year</div>
                </div>
              </div>

              <div className="bg-white/7 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                  <Fuel className="w-6 h-6 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-extrabold text-xl">{fmtNum(equiv.gallonsOfGasolineBurned, 0)}</div>
                  <div className="text-white/70 text-sm">gallons of gasoline burned</div>
                </div>
              </div>

              <div className="bg-white/7 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-400/20 flex items-center justify-center">
                  <Home className="w-6 h-6 text-purple-200" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-extrabold text-xl">{fmtNum(equiv.householdsElectricityUseForOneYear, 1)}</div>
                  <div className="text-white/70 text-sm">homes’ annual electricity use</div>
                </div>
              </div>
            </div>

            <div className="text-white/60 text-xs mt-4">
              These equivalencies are illustrative and based on EPA national-average references.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

