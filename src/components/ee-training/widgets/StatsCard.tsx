/**
 * StatsCard Widget
 * Colorful gradient card with large number, trend indicator, and optional sparkline
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
    label?: string;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'pink' | 'indigo' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  sparkline?: number[];
  className?: string;
}

const colorThemes = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    light: 'bg-blue-50 border-blue-200',
    text: 'text-blue-600',
    sparkline: '#3b82f6',
  },
  green: {
    gradient: 'from-emerald-500 to-teal-600',
    light: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-600',
    sparkline: '#10b981',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    light: 'bg-orange-50 border-orange-200',
    text: 'text-orange-600',
    sparkline: '#f97316',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    light: 'bg-purple-50 border-purple-200',
    text: 'text-purple-600',
    sparkline: '#a855f7',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    light: 'bg-teal-50 border-teal-200',
    text: 'text-teal-600',
    sparkline: '#14b8a6',
  },
  pink: {
    gradient: 'from-pink-500 to-rose-600',
    light: 'bg-pink-50 border-pink-200',
    text: 'text-pink-600',
    sparkline: '#ec4899',
  },
  indigo: {
    gradient: 'from-indigo-500 to-violet-600',
    light: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-600',
    sparkline: '#6366f1',
  },
  amber: {
    gradient: 'from-amber-500 to-yellow-600',
    light: 'bg-amber-50 border-amber-200',
    text: 'text-amber-600',
    sparkline: '#f59e0b',
  },
};

const sizeClasses = {
  sm: { card: 'p-4', value: 'text-2xl', title: 'text-xs' },
  md: { card: 'p-5', value: 'text-3xl', title: 'text-sm' },
  lg: { card: 'p-6', value: 'text-4xl', title: 'text-base' },
};

const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ 
  data, 
  color, 
  height = 40 
}) => {
  if (data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const padding = 2;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((value - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparkline-gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  size = 'md',
  sparkline,
  className = '',
}) => {
  const theme = colorThemes[color];
  const sizes = sizeClasses[size];
  
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : 
                    trend?.direction === 'down' ? TrendingDown : Minus;
  
  const trendColor = trend?.direction === 'up' ? 'text-emerald-500' :
                     trend?.direction === 'down' ? 'text-red-500' : 'text-gray-400';
  
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 ${sizes.card} ${className}`}>
      {/* Background gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
      
      {/* Icon */}
      {icon && (
        <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        <p className={`${sizes.title} font-medium text-gray-500 uppercase tracking-wider mb-1`}>
          {title}
        </p>
        
        <div className="flex items-end gap-3">
          <p className={`${sizes.value} font-bold text-gray-900`}>
            {value}
          </p>
          
          {trend && (
            <div className={`flex items-center gap-1 ${trendColor} mb-1`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">{trend.value}</span>
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        
        {trend?.label && (
          <p className="text-xs text-gray-400 mt-1">{trend.label}</p>
        )}
      </div>
      
      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <div className="mt-4 h-10">
          <Sparkline data={sparkline} color={theme.sparkline} />
        </div>
      )}
    </div>
  );
};

export default StatsCard;
