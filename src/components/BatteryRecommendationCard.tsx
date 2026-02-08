import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils';

export interface BatteryRecommendation {
  modelName: string;
  manufacturer?: string;
  capacityKwh: number;
  maxPowerKw: number;
  peakReductionKw: number;
  annualSavings: number;
  systemCost: number;
  paybackYears: number;
  roundTripEfficiency?: number;
  warranty?: string;
}

interface BatteryRecommendationCardProps {
  recommendation: BatteryRecommendation;
  rank: number;
  onSelect?: (recommendation: BatteryRecommendation) => void;
  isSelected?: boolean;
}

export const BatteryRecommendationCard: React.FC<BatteryRecommendationCardProps> = ({
  recommendation,
  rank,
  onSelect,
  isSelected = false,
}) => {

  const getRankBadge = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div
      onClick={() => onSelect?.(recommendation)}
      className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getRankBadge()}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{recommendation.modelName}</h3>
              {recommendation.manufacturer && (
                <p className="text-sm text-gray-500">{recommendation.manufacturer}</p>
              )}
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Peak Reduction</p>
          <p className="text-xl font-bold text-blue-700">
            {recommendation.peakReductionKw.toFixed(1)} kW
          </p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-gray-600 mb-1">Annual Savings</p>
          <p className="text-xl font-bold text-green-700">
            {formatCurrency(recommendation.annualSavings, 'USD', 0)}
          </p>
        </div>
      </div>

      {/* Battery Specs */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs text-gray-500">Capacity</p>
          <p className="text-sm font-medium text-gray-900">{recommendation.capacityKwh} kWh</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Max Power</p>
          <p className="text-sm font-medium text-gray-900">{recommendation.maxPowerKw} kW</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">System Cost</span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(recommendation.systemCost)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Payback Period</span>
          <span className="text-sm font-bold text-gray-900">
            {recommendation.paybackYears.toFixed(1)} years
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">ROI</span>
          <span className={`text-sm font-bold ${
            recommendation.paybackYears < 10 ? 'text-green-600' : 'text-orange-600'
          }`}>
            {formatPercent(recommendation.annualSavings / recommendation.systemCost, 1)}
          </span>
        </div>
      </div>
    </div>
  );
};

