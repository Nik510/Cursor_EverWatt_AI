import React from 'react';
import type { CalculatorBlock } from '../../../backend/ee-training/types';
import {
  CompressedAirCalculator,
  EnergySavingsCalculator,
  HVACOptimizationCalculator,
  LightingRetrofitCalculator,
  ROICalculator,
} from '../calculators';

export interface CalculatorWidgetProps {
  calculatorType: CalculatorBlock['calculatorType'];
  title?: string;
  subtitle?: string;
  config?: Record<string, unknown>;
}

export const CalculatorWidget: React.FC<CalculatorWidgetProps> = ({
  calculatorType,
  title,
  subtitle,
  config,
}) => {
  return (
    <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-slate-50 via-indigo-50 to-pink-50 border-b border-slate-200">
        <div className="font-extrabold text-slate-900">{title ?? 'Calculator'}</div>
        {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
      </div>

      <div className="p-6">
        {calculatorType === 'energy-savings' ? (
          <EnergySavingsCalculator initial={config as any} />
        ) : calculatorType === 'roi' ? (
          <ROICalculator initial={config as any} />
        ) : calculatorType === 'compressed-air' ? (
          <CompressedAirCalculator initial={config as any} />
        ) : calculatorType === 'lighting-retrofit' ? (
          <LightingRetrofitCalculator initial={config as any} />
        ) : calculatorType === 'hvac-optimization' ? (
          <HVACOptimizationCalculator initial={config as any} />
        ) : (
          <div className="text-sm text-slate-600">
            Unknown calculator type: <span className="font-mono">{calculatorType}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalculatorWidget;


