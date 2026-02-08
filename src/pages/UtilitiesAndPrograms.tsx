/**
 * Utilities and Programs Library
 * Comprehensive library for utility rates, programs, and incentives
 * Data is pulled from the rate storage system (not hard-coded)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  getAllRates, 
  getRatesByUtility, 
  searchRates,
  type UtilityRate 
} from '../utils/rates';
import { 
  getAverageEnergyRate, 
  getPeakEnergyRate, 
  getOffPeakEnergyRate,
  getTierBreakdown,
  getTOUBreakdown,
  getEffectiveDemandRate
} from '../utils/rates/helpers';
import { formatCurrency, formatNumber } from '../utils';
import { Building2, Zap, Search, Filter, Download, Plus, ArrowLeft } from 'lucide-react';
import { RateDetailModal } from '../components/RateDetailModal';

export const UtilitiesAndPrograms: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rates, setRates] = useState<UtilityRate[]>([]);
  const [filteredRates, setFilteredRates] = useState<UtilityRate[]>([]);
  const [selectedUtility, setSelectedUtility] = useState<string>(
    searchParams.get('utility') || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRateType, setSelectedRateType] = useState<string>('all');
  const [selectedServiceType, setSelectedServiceType] = useState<string>('all');
  const [selectedRate, setSelectedRate] = useState<UtilityRate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load rates from storage system (not hard-coded)
    const allRates = getAllRates();
    setRates(allRates);
    setFilteredRates(allRates);
  }, []);

  useEffect(() => {
    // Filter rates based on selections
    let filtered = rates;

    // Filter by utility
    if (selectedUtility !== 'all') {
      filtered = getRatesByUtility(selectedUtility as 'PG&E' | 'SCE' | 'SDG&E');
    } else {
      filtered = rates;
    }

    // Filter by rate type
    if (selectedRateType !== 'all') {
      filtered = filtered.filter(r => r.rateType === selectedRateType);
    }

    // Filter by service type
    if (selectedServiceType !== 'all') {
      filtered = filtered.filter(r => r.serviceType === selectedServiceType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.rateName.toLowerCase().includes(term) ||
        r.rateCode.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
      );
    }

    setFilteredRates(filtered);
  }, [rates, selectedUtility, selectedRateType, selectedServiceType, searchTerm]);

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
    return 0;
  };

  const utilities = ['All', 'PG&E', 'SCE', 'SDG&E'];
  const rateTypes = ['all', 'TOU', 'Tiered', 'Demand', 'Blended'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/utilities')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Utilities & Programs</span>
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Utility Rate Schedules</h1>
              <p className="text-slate-500">Comprehensive library of utility rate schedules</p>
            </div>
          </div>
          <p className="text-slate-600 max-w-3xl">
            Access up-to-date utility rate schedules, demand charges, energy rates, and incentive programs. 
            All data is dynamically loaded from the rate management system.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search rates by name, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Utility Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Filter className="w-4 h-4 inline mr-1" />
                Utility
              </label>
              <select
                value={selectedUtility}
                onChange={(e) => setSelectedUtility(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {utilities.map(util => (
                  <option key={util} value={util === 'All' ? 'all' : util}>{util}</option>
                ))}
              </select>
            </div>

            {/* Service Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Service Type</label>
              <select
                value={selectedServiceType}
                onChange={(e) => setSelectedServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Services</option>
                <option value="Electric">Electric</option>
                <option value="Gas">Gas</option>
              </select>
            </div>

            {/* Rate Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Rate Type</label>
              <select
                value={selectedRateType}
                onChange={(e) => setSelectedRateType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="TOU">Time-of-Use</option>
                <option value="Tiered">Tiered</option>
                <option value="Demand">Demand</option>
                <option value="Blended">Blended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Total Rates</p>
            <p className="text-2xl font-bold text-slate-900">{rates.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Filtered Results</p>
            <p className="text-2xl font-bold text-blue-600">{filteredRates.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">PG&E Rates</p>
            <p className="text-2xl font-bold text-slate-900">
              {getRatesByUtility('PG&E').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-600 mb-1">Electric Rates</p>
            <p className="text-2xl font-bold text-yellow-600">
              {rates.filter(r => r.serviceType === 'Electric').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Gas Rates</p>
                <p className="text-2xl font-bold text-orange-600">
                  {rates.filter(r => r.serviceType === 'Gas').length}
                </p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Rate
              </button>
            </div>
          </div>
        </div>

        {/* Rate Cards */}
        <div className="space-y-4">
          {filteredRates.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Zap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">No rates found matching your criteria</p>
              <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            filteredRates.map((rate) => (
              <div
                key={rate.id}
                onClick={() => {
                  setSelectedRate(rate);
                  setIsModalOpen(true);
                }}
                className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
                      rate.serviceType === 'Gas' 
                        ? 'bg-gradient-to-br from-orange-600 to-red-600' 
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    }`}>
                      {rate.serviceType === 'Gas' ? (
                        <span className="text-2xl">🔥</span>
                      ) : (
                        <Zap className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{rate.rateName}</h3>
                      <p className="text-sm text-slate-500">
                        {rate.utility} • {rate.rateCode} • {rate.serviceType} • {rate.rateType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rate.isActive && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Active
                      </span>
                    )}
                    {rate.sRateEligible && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        S-Rate Eligible
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {rate.description && (
                  <p className="text-slate-600 mb-4">{rate.description}</p>
                )}

                {/* Rate Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Average Energy Rate - Always show for electric rates */}
                  {rate.serviceType === 'Electric' && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Avg Energy Rate</p>
                      <p className="text-lg font-bold text-blue-700">
                        {formatCurrency(getAverageEnergyRate(rate), 'USD', 4)}/kWh
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {rate.rateType === 'TOU' ? 'Weighted average' : 
                         rate.rateType === 'Tiered' ? 'Based on typical usage' : 'Flat rate'}
                      </p>
                    </div>
                  )}
                  
                  {/* Peak Rate - Show for TOU rates */}
                  {rate.serviceType === 'Electric' && rate.rateType === 'TOU' && getPeakEnergyRate(rate) !== null && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Peak Rate</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(getPeakEnergyRate(rate)!, 'USD', 4)}/kWh
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Highest peak period</p>
                    </div>
                  )}
                  
                  {/* Off-Peak Rate - Show for TOU rates */}
                  {rate.serviceType === 'Electric' && rate.rateType === 'TOU' && getOffPeakEnergyRate(rate) !== null && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Off-Peak Rate</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(getOffPeakEnergyRate(rate)!, 'USD', 4)}/kWh
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Lowest off-peak period</p>
                    </div>
                  )}
                  
                  {/* Tiered Rate Info */}
                  {rate.serviceType === 'Electric' && rate.rateType === 'Tiered' && getTierBreakdown(rate) && (
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Tier Structure</p>
                      <p className="text-sm font-bold text-indigo-700">
                        {getTierBreakdown(rate)!.length} Tiers
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {getTierBreakdown(rate)![0]?.rate && 
                          `${formatCurrency(getTierBreakdown(rate)![0].rate, 'USD', 3)} - ${formatCurrency(getTierBreakdown(rate)![getTierBreakdown(rate)!.length - 1].rate, 'USD', 3)}/kWh`}
                      </p>
                    </div>
                  )}
                  
                  {/* Blended Rate */}
                  {rate.serviceType === 'Electric' && rate.rateType === 'Blended' && 'energyRate' in rate && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Energy Rate</p>
                      <p className="text-lg font-bold text-blue-700">
                        {formatCurrency(rate.energyRate, 'USD', 4)}/kWh
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Flat rate</p>
                    </div>
                  )}
                  
                  {/* Gas Rates */}
                  {rate.serviceType === 'Gas' && 'gasRate' in rate && rate.gasRate && (
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Gas Rate</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(rate.gasRate, 'USD', 4)}/therm
                      </p>
                    </div>
                  )}
                  
                  {/* Demand Charge */}
                  {('demandCharges' in rate && rate.demandCharges && rate.demandCharges.length > 0) && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Avg Demand Charge</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(getEffectiveDemandRate(rate), 'USD', 2)}/kW
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Per month</p>
                    </div>
                  )}
                  
                  {/* Fixed Charges */}
                  {('fixedCharges' in rate && rate.fixedCharges && rate.fixedCharges.length > 0) && (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Fixed Charges</p>
                      <p className="text-lg font-bold text-yellow-700">
                        {formatCurrency(
                          rate.fixedCharges.reduce((sum, fc) => sum + fc.amount, 0),
                          'USD',
                          2
                        )}/mo
                      </p>
                    </div>
                  )}
                  
                  {/* Customer Class */}
                  {rate.customerClass && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-slate-600 mb-1">Customer Class</p>
                      <p className="text-sm font-bold text-purple-700">{rate.customerClass}</p>
                    </div>
                  )}
                </div>
                
                {/* Rate Structure Details */}
                {(rate.rateType === 'TOU' || rate.rateType === 'Tiered') && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      {rate.rateType === 'TOU' ? 'Time-of-Use Periods:' : 'Tier Structure:'}
                    </p>
                    {rate.rateType === 'TOU' && getTOUBreakdown(rate) && (
                      <div className="space-y-2">
                        {getTOUBreakdown(rate)!.map((period, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                period.isPeak ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {period.isPeak ? 'Peak' : 'Off-Peak'}
                              </span>
                              <span className="text-slate-700">{period.name}</span>
                              <span className="text-slate-500">({period.time})</span>
                            </div>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(period.rate, 'USD', 4)}/kWh
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {rate.rateType === 'Tiered' && getTierBreakdown(rate) && (
                      <div className="space-y-2">
                        {getTierBreakdown(rate)!.map((tier, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                {tier.name}
                              </span>
                              {tier.threshold && (
                                <span className="text-slate-500">Up to {tier.threshold} kWh</span>
                              )}
                            </div>
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(tier.rate, 'USD', 4)}/kWh
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Info */}
                <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {rate.minimumDemand && (
                      <span className="mr-4">
                        <span className="font-medium">Min Demand:</span> {rate.minimumDemand} kW
                      </span>
                    )}
                    {rate.maximumDemand && (
                      <span>
                        <span className="font-medium">Max Demand:</span> {rate.maximumDemand} kW
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedRate(rate);
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1 transition-colors"
                  >
                    View Details
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Rate Detail Modal */}
      {selectedRate && (
        <RateDetailModal
          rate={selectedRate}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRate(null);
          }}
        />
      )}
    </div>
  );
};
