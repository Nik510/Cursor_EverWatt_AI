/**
 * MeasureCard Widget
 * Colorful card for EE measures with OBF badge, savings range, difficulty level
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  Zap, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  Star,
  TrendingUp,
  Wrench
} from 'lucide-react';

export interface MeasureCardProps {
  id: string;
  name: string;
  category: string;
  description?: string;
  savingsRange?: { min: number; max: number };
  paybackRange?: { min: number; max: number };
  difficulty?: 'easy' | 'medium' | 'hard';
  obfEligible?: boolean;
  icon?: React.ReactNode;
  color?: 'cooling' | 'heating' | 'ventilation' | 'controls' | 'electrification' | 'motors' | 'datacenter' | 'plugload';
  tags?: string[];
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

const categoryColors = {
  cooling: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'bg-blue-100 text-blue-600',
  },
  heating: {
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    icon: 'bg-orange-100 text-orange-600',
  },
  ventilation: {
    gradient: 'from-teal-500 to-emerald-500',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-700',
    icon: 'bg-teal-100 text-teal-600',
  },
  controls: {
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    icon: 'bg-purple-100 text-purple-600',
  },
  electrification: {
    gradient: 'from-yellow-500 to-lime-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: 'bg-yellow-100 text-yellow-600',
  },
  motors: {
    gradient: 'from-slate-500 to-gray-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    icon: 'bg-slate-100 text-slate-600',
  },
  datacenter: {
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    icon: 'bg-indigo-100 text-indigo-600',
  },
  plugload: {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    icon: 'bg-pink-100 text-pink-600',
  },
};

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-green-100 text-green-700', dots: 1 },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', dots: 2 },
  hard: { label: 'Complex', color: 'bg-red-100 text-red-700', dots: 3 },
};

export const MeasureCard: React.FC<MeasureCardProps> = ({
  id,
  name,
  category,
  description,
  savingsRange,
  paybackRange,
  difficulty = 'medium',
  obfEligible = false,
  icon,
  color = 'cooling',
  tags = [],
  featured = false,
  onClick,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = categoryColors[color];
  const diffConfig = difficultyConfig[difficulty];
  
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white border ${colors.border} shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-bold">
            <Star className="w-3 h-3" />
            Featured
          </div>
        </div>
      )}
      
      {/* Gradient header */}
      <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
            {icon || <Zap className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
              {name}
            </h3>
            <p className={`text-sm ${colors.text} font-medium mt-0.5`}>
              {category}
            </p>
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {description}
          </p>
        )}
        
        {/* Metrics row */}
        <div className="flex items-center gap-4 mb-4">
          {savingsRange && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-gray-900">
                {savingsRange.min}-{savingsRange.max}%
              </span>
              <span className="text-xs text-gray-500">savings</span>
            </div>
          )}
          
          {paybackRange && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">
                {paybackRange.min}-{paybackRange.max}
              </span>
              <span className="text-xs text-gray-500">yr payback</span>
            </div>
          )}
        </div>
        
        {/* Tags and badges row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* OBF Badge */}
            {obfEligible ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" />
                OBF Eligible
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
                <XCircle className="w-3 h-3" />
                Not OBF
              </div>
            )}
            
            {/* Difficulty */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${diffConfig.color}`}>
              <Wrench className="w-3 h-3" />
              {diffConfig.label}
            </div>
          </div>
          
          {/* Arrow indicator */}
          <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
            <ChevronRight className={`w-4 h-4 ${colors.text}`} />
          </div>
        </div>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-gray-400 text-xs">
                +{tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
    </div>
  );
};

export default MeasureCard;
