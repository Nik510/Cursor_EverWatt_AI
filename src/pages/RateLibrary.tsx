import React, { useState } from 'react';
import { RateCard, type RateCardData } from '../components/RateCard';
import { logger } from '../services/logger';

export const RateLibrary: React.FC = () => {
  // Mock data for now - will connect to API later
  const [rates] = useState<RateCardData[]>([
    {
      id: '1',
      name: 'B-19 Medium General Demand-Metered TOU',
      provider: 'PG&E',
      rateCode: 'B-19',
      rateType: 'Time Of Use',
      demandCharge: 16,
      peakRate: 0.28,
      offPeakRate: 0.15,
      peakHours: '4pm-9pm weekdays',
      summer: 'June-September',
      description: 'Medium C&I customers. Multi-part demand charges: Maximum Demand ($/kW) and Maximum-Peak-Period Demand ($/kW). 15-minute interval averaging.',
    },
    {
      id: '2',
      name: 'B-20 Large General Demand-Metered TOU',
      provider: 'PG&E',
      rateCode: 'B-20',
      rateType: 'Time Of Use',
      demandCharge: 17.5,
      peakRate: 0.28,
      offPeakRate: 0.15,
      peakHours: '4pm-9pm weekdays',
      summer: 'June-September',
      description: 'Legacy rate for large C&I customers with solar. Grandfathered for qualifying systems installed before B-20 mandate.',
    },
  ]);

  const handleDelete = (rate: RateCardData) => {
    if (confirm(`Are you sure you want to delete ${rate.name}?`)) {
      // Will implement delete functionality
      logger.info('Delete rate requested', { id: rate.id });
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Utility Rate Library</h1>
          <p className="text-gray-600">California electric and gas utility rate schedules</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2">
            <span>✨</span>
            <span>AI Import</span>
          </button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>➕</span>
            <span>Manual Add</span>
          </button>
        </div>
      </div>

      {/* Electric Rates Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⚡</span>
          <h2 className="text-xl font-semibold text-gray-900">Electric Rates</h2>
          <span className="text-gray-500">({rates.length})</span>
        </div>

        {/* Rate Cards */}
        <div className="grid grid-cols-1 gap-6">
          {rates.map((rate) => (
            <RateCard key={rate.id} rate={rate} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
};

