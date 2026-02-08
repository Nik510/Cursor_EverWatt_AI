/**
 * QuickFactCard Widget
 * Single stat with context, gradient border, and pulse animation
 */

import React from 'react';
import { 
  Zap, 
  DollarSign, 
  Percent, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';

export interface QuickFactCardProps {
  fact: string;
  value?: string;
  context?: string;
  icon?: 'zap' | 'dollar' | 'percent' | 'clock' | 'trending' | 'alert' | 'check' | 'info' | 'lightbulb';
  type?: 'stat' | 'tip' | 'warning' | 'success' | 'info';
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const iconMap = {
  zap: Zap,
  dollar: DollarSign,
  percent: Percent,
  clock: Clock,
  trending: TrendingUp,
  alert: AlertCircle,
  check: CheckCircle,
  info: Info,
  lightbulb: Lightbulb,
};

const typeConfig = {
  stat: { icon: 'trending', color: 'blue' },
  tip: { icon: 'lightbulb', color: 'amber' },
  warning: { icon: 'alert', color: 'orange' },
  success: { icon: 'check', color: 'green' },
  info: { icon: 'info', color: 'blue' },
};

const colorConfig = {
  blue: {
    gradient: 'from-blue-500 via-indigo-500 to-purple-500',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    iconBg: 'bg-blue-500',
  },
  green: {
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-500',
  },
  orange: {
    gradient: 'from-orange-500 via-red-500 to-pink-500',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    iconBg: 'bg-orange-500',
  },
  purple: {
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    iconBg: 'bg-purple-500',
  },
  teal: {
    gradient: 'from-teal-500 via-cyan-500 to-blue-500',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    iconBg: 'bg-teal-500',
  },
  amber: {
    gradient: 'from-amber-500 via-yellow-500 to-orange-500',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    iconBg: 'bg-amber-500',
  },
  red: {
    gradient: 'from-red-500 via-rose-500 to-pink-500',
    bg: 'bg-red-50',
    text: 'text-red-600',
    iconBg: 'bg-red-500',
  },
};

const sizeConfig = {
  sm: { 
    padding: 'p-4', 
    icon: 'w-8 h-8', 
    iconInner: 'w-4 h-4',
    fact: 'text-sm',
    value: 'text-xl',
    context: 'text-xs',
  },
  md: { 
    padding: 'p-5', 
    icon: 'w-10 h-10', 
    iconInner: 'w-5 h-5',
    fact: 'text-base',
    value: 'text-2xl',
    context: 'text-sm',
  },
  lg: { 
    padding: 'p-6', 
    icon: 'w-12 h-12', 
    iconInner: 'w-6 h-6',
    fact: 'text-lg',
    value: 'text-3xl',
    context: 'text-base',
  },
};

export const QuickFactCard: React.FC<QuickFactCardProps> = ({
  fact,
  value,
  context,
  icon,
  type = 'stat',
  color,
  size = 'md',
  pulse = false,
  className = '',
}) => {
  const typeDefaults = typeConfig[type];
  const finalIcon = icon || typeDefaults.icon as keyof typeof iconMap;
  const finalColor = color || typeDefaults.color as keyof typeof colorConfig;
  
  const IconComponent = iconMap[finalIcon];
  const colors = colorConfig[finalColor];
  const sizes = sizeConfig[size];
  
  return (
    <div className={`relative ${className}`}>
      {/* Gradient border effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} rounded-2xl ${pulse ? 'animate-pulse' : ''}`} />
      
      {/* Card content */}
      <div className={`relative m-[2px] bg-white rounded-2xl ${sizes.padding}`}>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`
            ${sizes.icon} rounded-xl flex items-center justify-center flex-shrink-0
            ${colors.iconBg} text-white shadow-lg
          `}>
            <IconComponent className={sizes.iconInner} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {value && (
              <div className={`${sizes.value} font-bold ${colors.text} mb-1`}>
                {value}
              </div>
            )}
            
            <p className={`${sizes.fact} font-medium text-gray-900 leading-snug`}>
              {fact}
            </p>
            
            {context && (
              <p className={`${sizes.context} text-gray-500 mt-2`}>
                {context}
              </p>
            )}
          </div>
        </div>
        
        {/* Decorative corner accent */}
        <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${colors.gradient} opacity-5 rounded-bl-full`} />
      </div>
    </div>
  );
};

export default QuickFactCard;
