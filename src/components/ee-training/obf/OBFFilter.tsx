/**
 * OBFFilter Component
 * Filter controls for OBF eligibility in measure lists
 */

import React from 'react';
import { Filter, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { UtilityProvider } from '../../../data/obf/obf-eligibility';

export type OBFFilterValue = 'all' | 'eligible' | 'not-eligible' | 'conditional';

export interface OBFFilterProps {
  value: OBFFilterValue;
  onChange: (value: OBFFilterValue) => void;
  utilityFilter?: UtilityProvider | 'all';
  onUtilityChange?: (utility: UtilityProvider | 'all') => void;
  showUtilityFilter?: boolean;
  showCounts?: boolean;
  counts?: {
    all: number;
    eligible: number;
    notEligible: number;
    conditional: number;
  };
  compact?: boolean;
  className?: string;
}

const filterOptions: { value: OBFFilterValue; label: string; icon: typeof CheckCircle; color: string }[] = [
  { value: 'all', label: 'All', icon: Filter, color: 'text-gray-600 bg-gray-100 border-gray-300 hover:bg-gray-200' },
  { value: 'eligible', label: 'OBF Eligible', icon: CheckCircle, color: 'text-emerald-700 bg-emerald-100 border-emerald-300 hover:bg-emerald-200' },
  { value: 'not-eligible', label: 'Not Eligible', icon: XCircle, color: 'text-gray-600 bg-gray-100 border-gray-300 hover:bg-gray-200' },
  { value: 'conditional', label: 'Conditional', icon: AlertCircle, color: 'text-amber-700 bg-amber-100 border-amber-300 hover:bg-amber-200' },
];

const utilities: { value: UtilityProvider | 'all'; label: string }[] = [
  { value: 'all', label: 'All Utilities' },
  { value: 'PGE', label: 'PG&E' },
  { value: 'SCE', label: 'SCE' },
  { value: 'SDGE', label: 'SDG&E' },
  { value: 'LADWP', label: 'LADWP' },
];

export const OBFFilter: React.FC<OBFFilterProps> = ({
  value,
  onChange,
  utilityFilter = 'all',
  onUtilityChange,
  showUtilityFilter = false,
  showCounts = false,
  counts,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Simple dropdown for compact mode */}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as OBFFilterValue)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {filterOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label} {showCounts && counts ? `(${counts[option.value === 'not-eligible' ? 'notEligible' : option.value]})` : ''}
            </option>
          ))}
        </select>
        
        {showUtilityFilter && onUtilityChange && (
          <select
            value={utilityFilter}
            onChange={(e) => onUtilityChange(e.target.value as UtilityProvider | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {utilities.map(utility => (
              <option key={utility.value} value={utility.value}>
                {utility.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* OBF Status Filter */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
          OBF Eligibility
        </label>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => {
            const IconComponent = option.icon;
            const isActive = value === option.value;
            const count = showCounts && counts 
              ? counts[option.value === 'not-eligible' ? 'notEligible' : option.value as keyof typeof counts] 
              : undefined;
            
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
                  transition-all duration-200
                  ${isActive 
                    ? `${option.color} ring-2 ring-offset-1 ring-blue-500` 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <IconComponent className="w-4 h-4" />
                <span>{option.label}</span>
                {count !== undefined && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/30' : 'bg-gray-100'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Utility Filter */}
      {showUtilityFilter && onUtilityChange && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
            Utility Provider
          </label>
          <div className="flex flex-wrap gap-2">
            {utilities.map(utility => {
              const isActive = utilityFilter === utility.value;
              
              return (
                <button
                  key={utility.value}
                  onClick={() => onUtilityChange(utility.value)}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-offset-1 ring-blue-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{utility.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Quick filter pill for inline use
export const OBFQuickFilter: React.FC<{
  value: OBFFilterValue;
  onChange: (value: OBFFilterValue) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const cycleFilter = () => {
    const order: OBFFilterValue[] = ['all', 'eligible', 'not-eligible'];
    const currentIndex = order.indexOf(value);
    const nextIndex = (currentIndex + 1) % order.length;
    onChange(order[nextIndex]);
  };
  
  const getIcon = () => {
    switch (value) {
      case 'eligible': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'not-eligible': return <XCircle className="w-4 h-4 text-gray-400" />;
      default: return <Filter className="w-4 h-4 text-gray-500" />;
    }
  };
  
  const getLabel = () => {
    switch (value) {
      case 'eligible': return 'OBF Only';
      case 'not-eligible': return 'Non-OBF';
      default: return 'All';
    }
  };
  
  return (
    <button
      onClick={cycleFilter}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium
        bg-white hover:bg-gray-50 transition-colors
        ${className}
      `}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  );
};

export default OBFFilter;
