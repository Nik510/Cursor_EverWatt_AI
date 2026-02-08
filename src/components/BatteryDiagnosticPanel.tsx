import React from 'react';
import type { BatteryEfficiencyDiagnostic } from '../modules/battery/types';
import { BatteryUtilizationGauges } from './charts/BatteryUtilizationGauges';
import { ConstraintWaterfallChart } from './charts/ConstraintWaterfallChart';

type Props = {
  diagnostic: BatteryEfficiencyDiagnostic;
  compact?: boolean;
  showCharts?: boolean;
};

export const BatteryDiagnosticPanel: React.FC<Props> = ({ diagnostic, compact = false, showCharts = true }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Battery Diagnostics</div>
          <div className="text-xs text-gray-600">
            Capture rate, utilization, and primary constraints driving missed peak shaving.
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Peak after: <span className="font-semibold text-gray-800">{diagnostic.kpis.peakAfterKw.toFixed(1)} kW</span>
        </div>
      </div>

      {!compact && <BatteryUtilizationGauges diagnostic={diagnostic} />}
      {showCharts && <ConstraintWaterfallChart diagnostic={diagnostic} />}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-gray-700 mb-2">Top limiting factors</div>
        {diagnostic.limitingFactors.length ? (
          <ul className="text-xs text-gray-700 space-y-2">
            {diagnostic.limitingFactors.slice(0, compact ? 2 : 4).map((f, idx) => (
              <li key={idx} className="bg-white border border-gray-200 rounded-md p-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{f.factor.replace(/_/g, ' ')}</span>
                  <span className="text-gray-500">{f.severity}</span>
                </div>
                <div className="text-gray-600 mt-1">{f.description}</div>
                <div className="text-indigo-700 mt-1">{f.recommendation}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-600">No dominant constraints detected for this run.</div>
        )}
      </div>
    </div>
  );
};


