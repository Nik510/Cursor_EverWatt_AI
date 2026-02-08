/**
 * Chart View Toggle Component
 * Allows switching between different time aggregation views
 */

import React from 'react';
import type { ChartViewMode } from '../../utils/chart-aggregation';

interface ChartViewToggleProps {
  value: ChartViewMode;
  onChange: (mode: ChartViewMode) => void;
  availableModes?: ChartViewMode[];
}

const modeLabels: Record<ChartViewMode, string> = {
  raw: 'Raw Data',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  peaks: 'Peaks',
  lows: 'Lows',
};

export const ChartViewToggle: React.FC<ChartViewToggleProps> = ({
  value,
  onChange,
  availableModes = ['raw', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'peaks', 'lows'],
}) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-600 font-medium">View:</span>
      <div className="flex gap-1 flex-wrap">
        {availableModes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              value === mode
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {modeLabels[mode]}
          </button>
        ))}
      </div>
    </div>
  );
};

