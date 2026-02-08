/**
 * AI Best Recommendation Component
 * Displays the AI's single best battery recommendation with comprehensive metrics
 */

import React from 'react';
import { Sparkles, DollarSign, TrendingUp, Zap, Award, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RecommendationData {
  tier: 'conservative' | 'aggressive' | 'extreme';
  batteryInfo: {
    modelName: string;
    manufacturer: string;
    quantity: number;
    totalCapacityKwh: number;
    totalPowerKw: number;
    systemCost: number;
  };
  financials: {
    peakReductionKw: number;
    peakReductionPercent: number;
    annualSavings: number;
    paybackYears: number;
    roi: number;
    npv10yr: number;
    costPerKwReduced: number;
  };
  accuracy: {
    confidenceLevel: 'high' | 'medium' | 'low';
    expectedAccuracyPercent: number;
    limitingFactors: string[];
  };
  rationale: string;
  chartData: {
    intervals: Array<{ timestamp: string; kw: number }>;
    afterKw: number[];
    socHistory: number[];
  };
}

interface BestRecommendationProps {
  originalPeakKw: number;
  recommendation: RecommendationData & {
    aiScore: number;
    selectionReason: string;
    alternativesConsidered: number;
  };
  onSelect?: () => void;
}

export const BestRecommendation: React.FC<BestRecommendationProps> = ({
  originalPeakKw,
  recommendation,
  onSelect,
}) => {
  return (
    <div className="space-y-6">
      {/* AI Best Recommendation Header */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="bg-purple-600 rounded-full p-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-purple-900 mb-2 flex items-center gap-2">
              AI's Best Recommendation
              <span className="text-sm font-normal text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                Score: {(recommendation.aiScore * 100).toFixed(1)}%
              </span>
            </h3>
            <p className="text-sm text-purple-800 mb-3">
              {recommendation.selectionReason}
            </p>
            <div className="flex items-center gap-4 text-xs text-purple-700">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {recommendation.alternativesConsidered} alternatives evaluated
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                Based on physics & hard math
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Recommendation Card */}
      <div
        onClick={onSelect}
        className="border-2 border-purple-500 bg-white rounded-xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-all"
      >
        {/* Battery Configuration */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">Battery Configuration</p>
              <p className="text-lg font-bold text-gray-900">
                {recommendation.batteryInfo.manufacturer} {recommendation.batteryInfo.modelName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-600">AI Score</p>
              <p className="text-2xl font-bold text-purple-700">{(recommendation.aiScore * 100).toFixed(0)}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white rounded-lg p-2 border border-purple-100">
              <p className="text-xs text-gray-500">Quantity</p>
              <p className="font-bold text-gray-900">{recommendation.batteryInfo.quantity}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-purple-100">
              <p className="text-xs text-gray-500">Capacity</p>
              <p className="font-bold text-gray-900">{recommendation.batteryInfo.totalCapacityKwh.toFixed(0)} kWh</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-purple-100">
              <p className="text-xs text-gray-500">Power</p>
              <p className="font-bold text-gray-900">{recommendation.batteryInfo.totalPowerKw.toFixed(0)} kW</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-purple-100">
              <p className="text-xs text-gray-500">System Cost</p>
              <p className="font-bold text-gray-900">${recommendation.batteryInfo.systemCost.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-600 font-semibold">Peak Reduction</p>
            </div>
            <p className="text-lg font-bold text-green-900">
              {recommendation.financials.peakReductionKw.toFixed(1)} kW
            </p>
            <p className="text-xs text-green-700">
              {recommendation.financials.peakReductionPercent.toFixed(1)}% reduction
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-blue-600 font-semibold">Annual Savings</p>
            </div>
            <p className="text-lg font-bold text-blue-900">
              ${recommendation.financials.annualSavings.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700">
              {Number.isFinite(recommendation.financials.paybackYears) 
                ? `${recommendation.financials.paybackYears.toFixed(1)} yr payback`
                : 'No payback'}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-purple-600 font-semibold">ROI</p>
            </div>
            <p className="text-lg font-bold text-purple-900">
              {recommendation.financials.roi.toFixed(1)}%
            </p>
            <p className="text-xs text-purple-700">
              {recommendation.financials.npv10yr >= 0 
                ? `$${recommendation.financials.npv10yr.toLocaleString()} NPV`
                : 'Negative NPV'}
            </p>
          </div>
        </div>

        {/* Detailed Financial Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">10-Year NPV</p>
            <p className={`text-sm font-bold ${recommendation.financials.npv10yr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${recommendation.financials.npv10yr.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Cost per kW Reduced</p>
            <p className="text-sm font-semibold text-gray-900">
              ${Number.isFinite(recommendation.financials.costPerKwReduced) 
                ? recommendation.financials.costPerKwReduced.toLocaleString() 
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Accuracy & Confidence */}
        <div className={`border-2 rounded-lg p-4 mb-4 ${
          recommendation.accuracy.confidenceLevel === 'high' ? 'border-green-300 bg-green-50' :
          recommendation.accuracy.confidenceLevel === 'medium' ? 'border-yellow-300 bg-yellow-50' :
          'border-red-300 bg-red-50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className={`w-5 h-5 ${
                recommendation.accuracy.confidenceLevel === 'high' ? 'text-green-600' :
                recommendation.accuracy.confidenceLevel === 'medium' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
              <span className="text-sm font-semibold text-gray-900">Expected Accuracy</span>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${
              recommendation.accuracy.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
              recommendation.accuracy.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {recommendation.accuracy.expectedAccuracyPercent}% ({recommendation.accuracy.confidenceLevel})
            </span>
          </div>
          {recommendation.accuracy.limitingFactors.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Considerations:</p>
              {recommendation.accuracy.limitingFactors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-white rounded p-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rationale */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-indigo-900 mb-2">AI Analysis</p>
          <p className="text-sm text-indigo-800 italic">{recommendation.rationale}</p>
        </div>
      </div>
    </div>
  );
};

// Export with old name for backward compatibility
export const MultiTierComparison = BestRecommendation;
