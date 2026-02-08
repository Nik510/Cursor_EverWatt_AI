/**
 * EquipmentCard Widget
 * Photo/illustration with specs grid and "Learn More" expansion
 */

import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Thermometer, 
  Gauge, 
  Clock, 
  DollarSign,
  Award,
  Info,
  ExternalLink
} from 'lucide-react';

export interface EquipmentSpec {
  label: string;
  value: string;
  icon?: 'zap' | 'thermometer' | 'gauge' | 'clock' | 'dollar' | 'award';
}

export interface EquipmentCardProps {
  id: string;
  name: string;
  type: string;
  description?: string;
  imageUrl?: string;
  specs?: EquipmentSpec[];
  efficiency?: {
    label: string;
    value: number;
    unit: string;
    benchmark?: number;
  };
  expandedContent?: React.ReactNode;
  tags?: string[];
  featured?: boolean;
  onLearnMore?: () => void;
  className?: string;
}

const iconMap = {
  zap: Zap,
  thermometer: Thermometer,
  gauge: Gauge,
  clock: Clock,
  dollar: DollarSign,
  award: Award,
};

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  id,
  name,
  type,
  description,
  imageUrl,
  specs = [],
  efficiency,
  expandedContent,
  tags = [],
  featured = false,
  onLearnMore,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const efficiencyPercentage = efficiency?.benchmark 
    ? (efficiency.value / efficiency.benchmark) * 100 
    : null;
  
  return (
    <div className={`
      bg-white rounded-2xl border overflow-hidden
      transition-all duration-300 hover:shadow-lg
      ${featured ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}
      ${className}
    `}>
      {/* Featured badge */}
      {featured && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 text-center">
          ⭐ FEATURED EQUIPMENT
        </div>
      )}
      
      {/* Image/Illustration area */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mb-2">
              <Gauge className="w-10 h-10 text-white" />
            </div>
            <span className="text-sm text-gray-500">{type}</span>
          </div>
        )}
        
        {/* Efficiency badge */}
        {efficiency && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
            <div className="text-xs text-gray-500 uppercase">{efficiency.label}</div>
            <div className="text-lg font-bold text-gray-900">
              {efficiency.value} <span className="text-sm font-normal">{efficiency.unit}</span>
            </div>
            {efficiencyPercentage !== null && (
              <div className={`text-xs font-medium ${efficiencyPercentage >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {efficiencyPercentage >= 100 ? '✓ Above benchmark' : '↑ Below benchmark'}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <span className="text-xs font-medium text-blue-600 uppercase tracking-wider">{type}</span>
          <h3 className="text-lg font-bold text-gray-900 mt-1">{name}</h3>
        </div>
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{description}</p>
        )}
        
        {/* Specs grid */}
        {specs.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {specs.slice(0, 4).map((spec, index) => {
              const IconComponent = spec.icon ? iconMap[spec.icon] : Info;
              return (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <IconComponent className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 truncate">{spec.label}</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">{spec.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Expandable content */}
        {expandedContent && (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Learn More</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
            
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                {expandedContent}
              </div>
            )}
          </>
        )}
        
        {/* Learn More button */}
        {onLearnMore && !expandedContent && (
          <button
            onClick={onLearnMore}
            className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            <span>Learn More</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default EquipmentCard;
