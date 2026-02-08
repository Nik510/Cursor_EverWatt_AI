import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Battery, Droplet, Lightbulb, Loader2, Save } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

type FacilityType =
  | 'Commercial'
  | 'Industrial'
  | 'Retail'
  | 'Healthcare'
  | 'Education'
  | 'Municipal'
  | 'Agricultural'
  | 'Multifamily Residential'
  | 'Office'
  | 'Restaurant'
  | 'Warehouse'
  | '';

type CustomerBasics = {
  companyName: string;
  siteLocation: string;
  serviceAgreementId: string;
  facilityType: FacilityType;
  climateZone: string;
  rateSchedule: string;
};

export const CalculatorStart: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const analysisId = useMemo(() => searchParams.get('analysisId'), [searchParams]);

  const [customer, setCustomer] = useState<CustomerBasics>({
    companyName: '',
    siteLocation: '',
    serviceAgreementId: '',
    facilityType: '',
    climateZone: '',
    rateSchedule: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const facilityTypes: FacilityType[] = [
    'Commercial',
    'Industrial',
    'Retail',
    'Healthcare',
    'Education',
    'Municipal',
    'Agricultural',
    'Multifamily Residential',
    'Office',
    'Restaurant',
    'Warehouse',
  ];

  const climateZones = [
    'Zone 1',
    'Zone 2',
    'Zone 3',
    'Zone 4',
    'Zone 5',
    'Zone 6',
    'Zone 7',
    'Zone 8',
    'Zone 9',
    'Zone 10',
    'Zone 11',
    'Zone 12',
    'Zone 13',
    'Zone 14',
    'Zone 15',
    'Zone 16',
  ];

  const rateSchedules = [
    'B-19 Medium General Demand-Metered TOU (B-19)',
    'B-20 Large General Demand-Metered TOU (B-20)',
    'E-19 Medium General Demand-Metered TOU (Legacy) (E-19)',
    'E-20 Large General Demand-Metered TOU (Legacy) (E-20)',
    'E-20 TOU (E-20)',
    'E-19 TOU (E-19)',
    'Core Commercial (G-NR1)',
    'B-19 Secondary (B19S)',
    'B-19S with Option S (B19S-S)',
    'A-10 Secondary TOU (A10S)',
  ];

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.analysis) return;
        if (cancelled) return;

        const info = json.analysis.customerInfo ?? {};
        setCustomer((prev) => ({
          ...prev,
          companyName: typeof info.companyName === 'string' ? info.companyName : prev.companyName,
          siteLocation: typeof info.siteLocation === 'string' ? info.siteLocation : prev.siteLocation,
          serviceAgreementId: typeof info.serviceAgreementId === 'string' ? info.serviceAgreementId : prev.serviceAgreementId,
          facilityType: (info.facilityType as FacilityType) ?? prev.facilityType,
          climateZone: typeof info.climateZone === 'string' ? info.climateZone : prev.climateZone,
          rateSchedule: typeof info.rateSchedule === 'string' ? info.rateSchedule : prev.rateSchedule,
        }));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  const buildProjectData = (overrides?: Record<string, unknown>) => ({
    customerInfo: {
      companyName: customer.companyName || 'Untitled Project',
      siteLocation: customer.siteLocation,
      serviceAgreementId: customer.serviceAgreementId,
      facilityType: customer.facilityType,
      climateZone: customer.climateZone,
      rateSchedule: customer.rateSchedule,
    },
    status: 'draft',
    ...(overrides ?? {}),
  });

  const saveCustomerInfo = async (): Promise<string | null> => {
    setIsSaving(true);
    try {
      const payload = buildProjectData();

      if (analysisId) {
        const res = await fetch(`/api/analyses/${encodeURIComponent(analysisId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save customer info');
        toast({ type: 'success', message: 'Saved' });
        return analysisId;
      }

      const res = await fetch('/api/analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.analysis?.id) throw new Error('Failed to create analysis');

      const newId = String(json.analysis.id);
      setSearchParams({ analysisId: newId }, { replace: true });
      toast({ type: 'success', message: 'Saved' });
      return newId;
    } catch (e) {
      toast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to save' });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const ensureSaved = async (): Promise<string | null> => {
    if (analysisId) return analysisId;
    return saveCustomerInfo();
  };

  const goToMeasure = async (measure: 'battery' | 'hvac' | 'lighting') => {
    const id = await ensureSaved();
    const qp = id ? `?analysisId=${encodeURIComponent(id)}` : '';
    navigate(`/calculator/${measure}${qp}`);
  };

  return (
    <div className="p-6 lg:p-10 bg-gray-50 min-h-full space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Start a New Analysis</h1>
        <p className="text-sm text-gray-600 mt-1">
          Save customer info first, then choose which measure to analyze.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            <p className="text-sm text-gray-600">This gets saved immediately and follows the analysis.</p>
          </div>
          <button
            onClick={saveCustomerInfo}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-500 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading saved analysis…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
              <input
                value={customer.companyName}
                onChange={(e) => setCustomer((c) => ({ ...c, companyName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Terraces of Los Gatos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
              <input
                value={customer.siteLocation}
                onChange={(e) => setCustomer((c) => ({ ...c, siteLocation: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="800 Blossom Hill Rd, Los Gatos, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Electric SAID (Service Agreement ID)</label>
              <input
                value={customer.serviceAgreementId}
                onChange={(e) => setCustomer((c) => ({ ...c, serviceAgreementId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facility Type</label>
              <select
                value={customer.facilityType}
                onChange={(e) => setCustomer((c) => ({ ...c, facilityType: e.target.value as FacilityType }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select facility type</option>
                {facilityTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">California Climate Zone</label>
              <select
                value={customer.climateZone}
                onChange={(e) => setCustomer((c) => ({ ...c, climateZone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select CEC zone</option>
                {climateZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PG&E Rate Schedule</label>
              <select
                value={customer.rateSchedule}
                onChange={(e) => setCustomer((c) => ({ ...c, rateSchedule: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select rate schedule</option>
                {rateSchedules.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Choose a Measure</h2>
        <p className="text-sm text-gray-600 mb-5">Pick what you want to analyze next.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => goToMeasure('battery')}
            className="text-left border-2 border-gray-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-orange-400 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                <Battery className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Battery Storage</p>
                <p className="text-sm text-gray-600">Peak shaving + demand charge reduction</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => goToMeasure('hvac')}
            className="text-left border-2 border-gray-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-blue-400 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <Droplet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">HVAC Optimization</p>
                <p className="text-sm text-gray-600">Chiller, boiler, VRF savings</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => goToMeasure('lighting')}
            className="text-left border-2 border-gray-200 rounded-xl p-5 bg-white hover:shadow-md hover:border-yellow-400 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Lighting Retrofit</p>
                <p className="text-sm text-gray-600">LED + controls savings potential</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

