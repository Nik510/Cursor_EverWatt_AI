/**
 * KPIRing Widget
 * Circular progress indicator with percentage and color-coded thresholds
 */

import React from 'react';

export interface KPIRingProps {
  value: number; // 0-100
  maxValue?: number;
  label: string;
  sublabel?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'auto' | 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink';
  thresholds?: {
    good: number;
    warning: number;
  };
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { ring: 80, stroke: 8, fontSize: 'text-lg', labelSize: 'text-xs' },
  md: { ring: 120, stroke: 10, fontSize: 'text-2xl', labelSize: 'text-sm' },
  lg: { ring: 160, stroke: 12, fontSize: 'text-3xl', labelSize: 'text-base' },
  xl: { ring: 200, stroke: 14, fontSize: 'text-4xl', labelSize: 'text-lg' },
};

const colorConfig = {
  blue: { stroke: '#3b82f6', bg: '#dbeafe' },
  green: { stroke: '#10b981', bg: '#d1fae5' },
  orange: { stroke: '#f97316', bg: '#ffedd5' },
  purple: { stroke: '#a855f7', bg: '#f3e8ff' },
  teal: { stroke: '#14b8a6', bg: '#ccfbf1' },
  pink: { stroke: '#ec4899', bg: '#fce7f3' },
  red: { stroke: '#ef4444', bg: '#fee2e2' },
  amber: { stroke: '#f59e0b', bg: '#fef3c7' },
};

export const KPIRing: React.FC<KPIRingProps> = ({
  value,
  maxValue = 100,
  label,
  sublabel,
  unit = '%',
  size = 'md',
  color = 'auto',
  thresholds = { good: 70, warning: 40 },
  showPercentage = true,
  animated = true,
  className = '',
}) => {
  const config = sizeConfig[size];
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  // Auto-color based on thresholds
  const getAutoColor = () => {
    if (percentage >= thresholds.good) return 'green';
    if (percentage >= thresholds.warning) return 'amber';
    return 'red';
  };
  
  const activeColor = color === 'auto' ? getAutoColor() : color;
  const colors = colorConfig[activeColor as keyof typeof colorConfig] || colorConfig.blue;
  
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const center = config.ring / 2;
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        <svg
          width={config.ring}
          height={config.ring}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.bg}
            strokeWidth={config.stroke}
          />
          
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={animated ? 'transition-all duration-1000 ease-out' : ''}
          />
          
          {/* Gradient overlay */}
          <defs>
            <linearGradient id={`ring-gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.stroke} />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.7" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold text-gray-900`}>
            {showPercentage ? Math.round(percentage) : Math.round(value)}
          </span>
          <span className="text-gray-500 text-sm font-medium">
            {unit}
          </span>
        </div>
      </div>
      
      {/* Labels */}
      <div className="mt-3 text-center">
        <p className={`${config.labelSize} font-semibold text-gray-900`}>{label}</p>
        {sublabel && (
          <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
};

export default KPIRing;
