import React from 'react';
import type { CatalogBatteryRow } from '../utils/battery-catalog-loader';

interface BatteryCardProps {
  battery: CatalogBatteryRow;
  onDelete?: (battery: CatalogBatteryRow) => void;
}

export const BatteryCard: React.FC<BatteryCardProps> = ({ battery, onDelete }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-semibold">
            🔋
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{battery.modelName}</h3>
            <p className="text-sm text-gray-500">{battery.manufacturer}</p>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(battery)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
            title="Delete battery"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Specifications */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">⚡</span>
            <span className="text-xs font-medium text-gray-600">Capacity</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{battery.capacityKwh} kWh</p>
        </div>

        <div className="bg-blue-100 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">⚡</span>
            <span className="text-xs font-medium text-gray-600">Power</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{battery.powerKw} kW</p>
        </div>

        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-600">⚡</span>
            <span className="text-xs font-medium text-gray-600">Efficiency</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{(battery.efficiency * 100).toFixed(0)}%</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-600">⚡</span>
            <span className="text-xs font-medium text-gray-600">Warranty</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{battery.warrantyYears} yrs</p>
        </div>
      </div>

      {/* Volume Pricing */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💰</span>
          <h4 className="font-semibold text-gray-900">Volume Pricing</h4>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">1-10 Units</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(battery.price1_10)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">11-20 Units</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(battery.price11_20)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">21-50 Units</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(battery.price21_50)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">50+ Units</p>
            <p className="text-sm font-bold text-gray-900">{formatPrice(battery.price50Plus)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

