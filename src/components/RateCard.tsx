import React from 'react';

export interface RateCardData {
  id: string;
  name: string;
  provider: string;
  rateCode: string;
  rateType: 'Time Of Use' | 'Tiered' | 'Demand' | 'Blended';
  demandCharge: number; // $/kW
  peakRate: number; // $/kWh
  offPeakRate: number; // $/kWh
  peakHours: string;
  summer: string;
  description: string;
}

interface RateCardProps {
  rate: RateCardData;
  onDelete?: (rate: RateCardData) => void;
}

export const RateCard: React.FC<RateCardProps> = ({ rate, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white">
            ⚡
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{rate.name}</h3>
            <p className="text-sm text-gray-500">{rate.provider} • {rate.rateCode}</p>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(rate)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
            title="Delete rate"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Rate Details */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Rate Type</p>
          <p className="text-sm font-bold text-gray-900">{rate.rateType}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Demand Charge</p>
          <p className="text-sm font-bold text-gray-900">${rate.demandCharge}/kW</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Peak Rate</p>
          <p className="text-sm font-bold text-gray-900">${rate.peakRate.toFixed(2)}/kWh</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Off-Peak Rate</p>
          <p className="text-sm font-bold text-gray-900">${rate.offPeakRate.toFixed(2)}/kWh</p>
        </div>
      </div>

      {/* Additional Details */}
      <div className="border-t border-gray-200 pt-4 space-y-1 text-sm text-gray-600">
        <p><span className="font-medium">Peak Hours:</span> {rate.peakHours}</p>
        <p><span className="font-medium">Summer:</span> {rate.summer}</p>
        <p className="mt-2">{rate.description}</p>
      </div>
    </div>
  );
};

