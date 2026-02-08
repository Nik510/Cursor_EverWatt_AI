/**
 * Rate Detail Modal
 * Shows detailed explanation of how a rate schedule works
 */

import React from 'react';
import { X, Zap, Clock, DollarSign, Info, CheckCircle, AlertCircle } from 'lucide-react';
import type { UtilityRate } from '../utils/rates';
import { getRateExplanation } from '../utils/rates/rate-explanations';
import { findTablesByRateCode } from '../utils/rates/tariff-tables';
import { formatCurrency } from '../utils';

interface RateDetailModalProps {
  rate: UtilityRate;
  isOpen: boolean;
  onClose: () => void;
}

export const RateDetailModal: React.FC<RateDetailModalProps> = ({ rate, isOpen, onClose }) => {
  if (!isOpen) return null;

  const explanation = getRateExplanation(rate.id);
  const tableMatches = findTablesByRateCode(rate.rateCode);

  const getEffectiveDemandRate = (rate: UtilityRate): number => {
    if (rate.rateType === 'TOU' && 'demandCharges' in rate && rate.demandCharges) {
      const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
      return totalRate / rate.demandCharges.length;
    }
    if (rate.rateType === 'Demand' && 'demandCharges' in rate && rate.demandCharges) {
      const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
      return totalRate / rate.demandCharges.length;
    }
    if (rate.rateType === 'Blended' && 'demandCharges' in rate && rate.demandCharges) {
      const totalRate = rate.demandCharges.reduce((sum, dc) => sum + dc.rate, 0);
      return totalRate / rate.demandCharges.length;
    }
    return 0;
  };

  const getAverageEnergyRate = (rate: UtilityRate): number => {
    if (rate.serviceType === 'Gas' && 'gasRate' in rate && rate.gasRate) {
      return rate.gasRate;
    }
    if (rate.serviceType === 'Gas' && 'gasTiers' in rate && rate.gasTiers) {
      const totalRate = rate.gasTiers.reduce((sum, tier) => sum + tier.rate, 0);
      return totalRate / rate.gasTiers.length;
    }
    if (rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods) {
      const totalRate = rate.touPeriods.reduce((sum, period) => sum + period.energyRate, 0);
      return totalRate / rate.touPeriods.length;
    }
    if (rate.rateType === 'Blended' && 'energyRate' in rate) {
      return rate.energyRate;
    }
    if (rate.rateType === 'Demand' && 'energyRate' in rate) {
      return rate.energyRate;
    }
    if (rate.rateType === 'Tiered' && 'tiers' in rate && rate.tiers) {
      const totalRate = rate.tiers.reduce((sum, tier) => sum + tier.rate, 0);
      return totalRate / rate.tiers.length;
    }
    return 0;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{rate.rateName}</h2>
                    <p className="text-blue-100">{rate.utility} • {rate.rateCode}</p>
                  </div>
                </div>
                {rate.description && (
                  <p className="text-white/90 text-sm mt-2">{rate.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Overview */}
            {explanation && (
              <>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Overview
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{explanation.overview}</p>
                </div>

                {/* How It Works */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    How It Works
                  </h3>
                  <ul className="space-y-2">
                    {explanation.howItWorks.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Key Features</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {explanation.keyFeatures.map((feature, idx) => (
                      <div key={idx} className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm text-slate-700">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Best For */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Best For</h3>
                  <ul className="space-y-2">
                    {explanation.bestFor.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600">
                        <span className="text-blue-600 font-semibold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Billing Details */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Billing Details
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-semibold text-slate-900 mb-1">Demand Charges</p>
                      <p className="text-sm text-slate-600">{explanation.billingDetails.demandCharges}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-semibold text-slate-900 mb-1">Energy Charges</p>
                      <p className="text-sm text-slate-600">{explanation.billingDetails.energyCharges}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-semibold text-slate-900 mb-1">Fixed Charges</p>
                      <p className="text-sm text-slate-600">{explanation.billingDetails.fixedCharges}</p>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                {explanation.importantNotes && explanation.importantNotes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Important Notes
                    </h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                      {explanation.importantNotes.map((note, idx) => (
                        <p key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-orange-600 font-semibold">⚠</span>
                          <span>{note}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {explanation.examples && explanation.examples.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Examples</h3>
                    <div className="space-y-2">
                      {explanation.examples.map((example, idx) => (
                        <div key={idx} className="bg-blue-50 rounded-lg p-4">
                          <p className="text-sm text-slate-700">{example}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Rate Summary (if no explanation) */}
            {!explanation && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Rate Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-1">Average Energy Rate</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(getAverageEnergyRate(rate), 'USD', 4)}/kWh
                      </p>
                    </div>
                    {getEffectiveDemandRate(rate) > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-1">Average Demand Charge</p>
                        <p className="text-xl font-bold text-green-700">
                          {formatCurrency(getEffectiveDemandRate(rate), 'USD', 2)}/kW
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {rate.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-slate-700">{rate.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Rate Details Table */}
            {rate.rateType === 'TOU' && 'touPeriods' in rate && rate.touPeriods && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Time-of-Use Periods</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Period</th>
                        <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Time</th>
                        <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Season</th>
                        <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold">Day Type</th>
                        <th className="border border-slate-300 px-4 py-2 text-right text-sm font-semibold">Rate ($/kWh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rate.touPeriods.map((period, idx) => (
                        <tr key={idx} className={period.isPeak ? 'bg-red-50' : ''}>
                          <td className="border border-slate-300 px-4 py-2 text-sm">
                            {period.name}
                            {period.isPeak && <span className="ml-2 text-red-600 font-semibold">(Peak)</span>}
                          </td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{period.start} - {period.end}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{period.season || 'All'}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm">{period.dayType || 'All'}</td>
                          <td className="border border-slate-300 px-4 py-2 text-sm text-right font-semibold">
                            {formatCurrency(period.energyRate, 'USD', 5)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Demand Charges */}
            {'demandCharges' in rate && rate.demandCharges && rate.demandCharges.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">Demand Charges</h3>
                <div className="space-y-2">
                  {rate.demandCharges.map((charge, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{charge.name}</p>
                          <p className="text-sm text-slate-600">
                            {charge.period || 'All Hours'} 
                            {charge.season && ` • ${charge.season}`}
                            {charge.billingMethod && ` • ${charge.billingMethod}`}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(charge.rate, 'USD', 2)}/kW
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source Tariff Tables */}
            {tableMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">Source Tariff Tables</h3>
                <p className="text-sm text-slate-600">
                  Pulled directly from the official PG&E 2025 XLSX files. Preview shows the first few rows; backend has the full table for calculations and audits.
                </p>
                <div className="space-y-4">
                  {tableMatches.map((match) => (
                    <div key={`${match.file}-${match.sheet}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span className="font-semibold">{match.sheet}</span>
                        <span className="truncate max-w-[60%]">{match.file}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-200">
                              {match.columns.slice(0, 6).map((col) => (
                                <th key={col} className="border border-slate-300 px-2 py-1 text-left font-semibold">
                                  {col || 'Column'}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {match.preview.map((row, idx) => (
                              <tr key={idx} className="bg-white">
                                {match.columns.slice(0, 6).map((col) => (
                                  <td key={col} className="border border-slate-200 px-2 py-1">
                                    {row[col] ?? ''}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                {rate.effectiveDate && (
                  <span>Effective: {typeof rate.effectiveDate === 'string' ? rate.effectiveDate : rate.effectiveDate.toLocaleDateString()}</span>
                )}
              </div>
              <button
                onClick={onClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
