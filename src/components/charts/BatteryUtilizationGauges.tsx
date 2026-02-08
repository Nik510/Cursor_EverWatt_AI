import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { BatteryEfficiencyDiagnostic } from '../../modules/battery/types';
import { KPIRing } from '../ee-training/widgets/KPIRing';
import { InfoModal } from '../ui/InfoModal';

type Props = {
  diagnostic: BatteryEfficiencyDiagnostic;
};

interface MetricInfo {
  title: string;
  explanation: string;
  calculation: string;
  interpretation: string;
  example?: string;
}

const metricExplanations: Record<string, MetricInfo> = {
  capture: {
    title: 'Capture Rate',
    explanation:
      'Capture rate measures how much of the excess energy above your threshold was successfully shaved by the battery.',
    calculation:
      'Capture Rate = (Energy Actually Shaved) / (Total Excess Energy Above Threshold) × 100%',
    interpretation:
      'A high capture rate (90%+) means the battery effectively caught most peak events. Lower rates may indicate the battery was undersized, ran out of energy, or hit power limits.',
    example:
      'If you had 1,000 kWh of excess energy above threshold and the battery shaved 950 kWh, your capture rate would be 95%.',
  },
  utilization: {
    title: 'Energy Utilization',
    explanation:
      'Energy utilization shows what percentage of the battery\'s usable capacity was actually discharged during the analysis period.',
    calculation: 'Energy Utilization = (Total Energy Discharged) / (Usable Battery Capacity) × 100%',
    interpretation:
      'A high utilization (80%+) means the battery was used efficiently. Very low utilization may indicate the battery is oversized for the application, or peaks were infrequent.',
    example:
      'If your battery has 100 kWh usable capacity and discharged 85 kWh total, your energy utilization would be 85%.',
  },
  activity: {
    title: 'Activity',
    explanation:
      'Activity measures what percentage of the total time period the battery was actively charging or discharging.',
    calculation:
      'Activity = (Total Hours Charging + Total Hours Discharging) / (Total Hours in Analysis Period) × 100%',
    interpretation:
      'A low activity percentage (2-10%) is actually GOOD for peak shaving - it means the battery only operates when needed, preserving its lifespan. High activity might indicate the battery is working too hard or the threshold is set too low.',
    example:
      'If you analyzed a full year (8,760 hours) and the battery was charging or discharging for 175 hours total, your activity would be 2%. This is efficient - the battery sits idle most of the time and only activates during peaks.',
  },
  rte: {
    title: 'Observed Round-Trip Efficiency (RTE)',
    explanation:
      'Round-trip efficiency measures how much energy you get back when discharging compared to how much you put in when charging.',
    calculation: 'Observed RTE = (Total Energy Discharged) / (Total Energy Charged) × 100%',
    interpretation:
      'RTE accounts for energy losses during charging and discharging. A typical lithium-ion battery has 85-95% RTE. Lower observed RTE may indicate battery degradation, high discharge rates, or operational inefficiencies.',
    example:
      'If you charged 100 kWh into the battery and discharged 90 kWh out, your observed RTE would be 90%. The 10 kWh difference represents energy losses.',
  },
};

export const BatteryUtilizationGauges: React.FC<Props> = ({ diagnostic }) => {
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const capturePct = diagnostic.captureRate * 100;
  const utilPct = diagnostic.utilizationRate * 100;
  const timePct = diagnostic.kpis.timeUtilization * 100;
  const rtePct =
    diagnostic.kpis.achievedRoundTripEfficiency != null ? diagnostic.kpis.achievedRoundTripEfficiency * 100 : null;

  const handleGaugeClick = (metric: string) => {
    setOpenMetric(metric);
  };

  const currentInfo = openMetric ? metricExplanations[openMetric] : null;

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-900">Battery Utilization</div>
        <div className="text-xs text-gray-600 mb-4">
          Quick view of how well the battery matched the customer's peak profile (capture, utilization, time, and observed efficiency).
          <span className="text-blue-600 ml-1">Click any metric for detailed explanation.</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="cursor-pointer group relative transition-transform hover:scale-105"
            onClick={() => handleGaugeClick('capture')}
            title="Click for explanation"
          >
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <KPIRing value={capturePct} label="Capture rate" sublabel="Excess energy shaved" unit="%" size="sm" color="auto" />
          </div>
          <div
            className="cursor-pointer group relative transition-transform hover:scale-105"
            onClick={() => handleGaugeClick('utilization')}
            title="Click for explanation"
          >
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <KPIRing value={utilPct} label="Energy utilization" sublabel="Used vs usable kWh" unit="%" size="sm" color="auto" />
          </div>
          <div
            className="cursor-pointer group relative transition-transform hover:scale-105"
            onClick={() => handleGaugeClick('activity')}
            title="Click for explanation"
          >
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <KPIRing value={timePct} label="Activity" sublabel="Charge+discharge time" unit="%" size="sm" color="auto" />
          </div>
          <div
            className="cursor-pointer group relative transition-transform hover:scale-105"
            onClick={() => handleGaugeClick('rte')}
            title="Click for explanation"
          >
            <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1 shadow-sm">
              <Info className="w-4 h-4 text-blue-500" />
            </div>
            <KPIRing
              value={rtePct ?? 0}
              label="Observed RTE"
              sublabel={rtePct == null ? 'No charge observed' : 'Discharge / charge'}
              unit="%"
              size="sm"
              color={rtePct == null ? 'blue' : 'auto'}
            />
          </div>
        </div>
      </div>

      {currentInfo && (
        <InfoModal isOpen={true} onClose={() => setOpenMetric(null)} title={currentInfo.title}>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What it means:</h3>
              <p className="text-gray-700">{currentInfo.explanation}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How it's calculated:</h3>
              <p className="text-gray-700 font-mono text-sm bg-gray-50 p-2 rounded">{currentInfo.calculation}</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How to interpret:</h3>
              <p className="text-gray-700">{currentInfo.interpretation}</p>
            </div>
            {currentInfo.example && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Example:</h3>
                <p className="text-gray-700 italic">{currentInfo.example}</p>
              </div>
            )}
          </div>
        </InfoModal>
      )}
    </>
  );
};


