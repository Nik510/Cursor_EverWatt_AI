/**
 * ComparisonMeter Widget
 * Before/after slider with animated transition for comparing scenarios
 */

import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingDown, Zap } from 'lucide-react';

export interface ComparisonMeterProps {
  beforeValue: number;
  afterValue: number;
  label: string;
  unit?: string;
  prefix?: string;
  maxValue?: number;
  showPercentChange?: boolean;
  animated?: boolean;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorConfig = {
  blue: {
    before: 'bg-gray-300',
    after: 'bg-gradient-to-r from-blue-500 to-indigo-600',
    accent: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  green: {
    before: 'bg-gray-300',
    after: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    accent: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  orange: {
    before: 'bg-gray-300',
    after: 'bg-gradient-to-r from-orange-500 to-red-600',
    accent: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  purple: {
    before: 'bg-gray-300',
    after: 'bg-gradient-to-r from-purple-500 to-pink-600',
    accent: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  teal: {
    before: 'bg-gray-300',
    after: 'bg-gradient-to-r from-teal-500 to-cyan-600',
    accent: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-700',
  },
};

const sizeConfig = {
  sm: { height: 'h-3', text: 'text-sm', value: 'text-lg' },
  md: { height: 'h-4', text: 'text-base', value: 'text-xl' },
  lg: { height: 'h-6', text: 'text-lg', value: 'text-2xl' },
};

export const ComparisonMeter: React.FC<ComparisonMeterProps> = ({
  beforeValue,
  afterValue,
  label,
  unit = '',
  prefix = '',
  maxValue,
  showPercentChange = true,
  animated = true,
  color = 'green',
  size = 'md',
  className = '',
}) => {
  const [animatedBefore, setAnimatedBefore] = useState(0);
  const [animatedAfter, setAnimatedAfter] = useState(0);
  const colors = colorConfig[color];
  const sizes = sizeConfig[size];
  
  const max = maxValue || Math.max(beforeValue, afterValue) * 1.2;
  const percentChange = beforeValue > 0 
    ? Math.round(((beforeValue - afterValue) / beforeValue) * 100) 
    : 0;
  const savings = beforeValue - afterValue;
  
  useEffect(() => {
    if (animated) {
      const duration = 1000;
      const steps = 60;
      const beforeStep = beforeValue / steps;
      const afterStep = afterValue / steps;
      let step = 0;
      
      const timer = setInterval(() => {
        step++;
        setAnimatedBefore(Math.min(beforeStep * step, beforeValue));
        setAnimatedAfter(Math.min(afterStep * step, afterValue));
        
        if (step >= steps) {
          clearInterval(timer);
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    } else {
      setAnimatedBefore(beforeValue);
      setAnimatedAfter(afterValue);
    }
  }, [beforeValue, afterValue, animated]);
  
  const formatValue = (value: number) => {
    return `${prefix}${value.toLocaleString()}${unit}`;
  };
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className={`font-semibold text-gray-900 ${sizes.text}`}>{label}</h4>
        {showPercentChange && percentChange > 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${colors.badge}`}>
            <TrendingDown className="w-3 h-3" />
            <span className="text-xs font-bold">{percentChange}% reduction</span>
          </div>
        )}
      </div>
      
      {/* Before bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Before</span>
          <span className="text-sm font-medium text-gray-600">
            {formatValue(Math.round(animatedBefore))}
          </span>
        </div>
        <div className={`w-full ${sizes.height} bg-gray-100 rounded-full overflow-hidden`}>
          <div 
            className={`h-full ${colors.before} rounded-full transition-all duration-1000`}
            style={{ width: `${(animatedBefore / max) * 100}%` }}
          />
        </div>
      </div>
      
      {/* After bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 uppercase tracking-wider">After</span>
          <span className={`text-sm font-bold ${colors.accent}`}>
            {formatValue(Math.round(animatedAfter))}
          </span>
        </div>
        <div className={`w-full ${sizes.height} bg-gray-100 rounded-full overflow-hidden`}>
          <div 
            className={`h-full ${colors.after} rounded-full transition-all duration-1000 shadow-lg`}
            style={{ width: `${(animatedAfter / max) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Savings callout */}
      {savings > 0 && (
        <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r ${colors.after} text-white`}>
          <Zap className="w-4 h-4" />
          <span className="font-bold">Save {formatValue(savings)}</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default ComparisonMeter;
