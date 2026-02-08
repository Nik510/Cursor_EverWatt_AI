/**
 * SavingsCounter Widget
 * Animated counting number with dollar/kWh formatting
 */

import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Zap, Droplets, Leaf, TrendingUp } from 'lucide-react';

export interface SavingsCounterProps {
  value: number;
  type?: 'currency' | 'energy' | 'water' | 'carbon' | 'custom';
  label?: string;
  sublabel?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'green' | 'blue' | 'orange' | 'purple' | 'teal';
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const typeConfig = {
  currency: { prefix: '$', suffix: '', icon: DollarSign, decimals: 0 },
  energy: { prefix: '', suffix: ' kWh', icon: Zap, decimals: 0 },
  water: { prefix: '', suffix: ' gal', icon: Droplets, decimals: 0 },
  carbon: { prefix: '', suffix: ' tons CO₂', icon: Leaf, decimals: 1 },
  custom: { prefix: '', suffix: '', icon: TrendingUp, decimals: 2 },
};

const colorConfig = {
  green: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
  },
};

const sizeConfig = {
  sm: { value: 'text-2xl', label: 'text-xs', icon: 'w-8 h-8', iconSize: 'w-4 h-4' },
  md: { value: 'text-4xl', label: 'text-sm', icon: 'w-10 h-10', iconSize: 'w-5 h-5' },
  lg: { value: 'text-5xl', label: 'text-base', icon: 'w-12 h-12', iconSize: 'w-6 h-6' },
  xl: { value: 'text-6xl', label: 'text-lg', icon: 'w-14 h-14', iconSize: 'w-7 h-7' },
};

// Easing function for smooth animation
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const SavingsCounter: React.FC<SavingsCounterProps> = ({
  value,
  type = 'currency',
  label = 'Annual Savings',
  sublabel,
  prefix: customPrefix,
  suffix: customSuffix,
  decimals: customDecimals,
  duration = 2000,
  size = 'md',
  color = 'green',
  showIcon = true,
  animated = true,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const typeSettings = typeConfig[type];
  const colors = colorConfig[color];
  const sizes = sizeConfig[size];
  
  const finalPrefix = customPrefix ?? typeSettings.prefix;
  const finalSuffix = customSuffix ?? typeSettings.suffix;
  const finalDecimals = customDecimals ?? typeSettings.decimals;
  const IconComponent = typeSettings.icon;
  
  // Animate when component comes into view
  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateValue();
        }
      },
      { threshold: 0.1 }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [value, animated, hasAnimated]);
  
  const animateValue = () => {
    const startTime = performance.now();
    
    const updateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      setDisplayValue(easedProgress * value);
      
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      } else {
        setDisplayValue(value);
      }
    };
    
    requestAnimationFrame(updateValue);
  };
  
  const formatValue = (val: number): string => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    } else if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'K';
    }
    return val.toFixed(finalDecimals);
  };
  
  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl ${colors.bg} ${colors.border} border p-6 ${className}`}
    >
      {/* Background decoration */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br ${colors.gradient} opacity-10 rounded-full blur-2xl`} />
      
      <div className="relative z-10 flex items-center gap-4">
        {/* Icon */}
        {showIcon && (
          <div className={`${sizes.icon} rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg`}>
            <IconComponent className={sizes.iconSize} />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1">
          {label && (
            <p className={`${sizes.label} text-gray-500 uppercase tracking-wider mb-1`}>
              {label}
            </p>
          )}
          
          <div className="flex items-baseline gap-1">
            <span className={`${sizes.value} font-bold ${colors.text}`}>
              {finalPrefix}{formatValue(displayValue)}
            </span>
            {finalSuffix && (
              <span className={`${sizes.label} text-gray-500`}>{finalSuffix}</span>
            )}
          </div>
          
          {sublabel && (
            <p className="text-sm text-gray-500 mt-1">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsCounter;
