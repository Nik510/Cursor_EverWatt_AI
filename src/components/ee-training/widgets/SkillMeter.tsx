/**
 * SkillMeter Widget
 * Engineering/Sales/Field skill proficiency indicators
 */

import React from 'react';
import { 
  Wrench, 
  MessageSquare, 
  Clipboard, 
  Zap, 
  TrendingUp,
  Star
} from 'lucide-react';

export interface SkillLevel {
  id: string;
  name: string;
  level: number; // 0-100
  icon?: 'engineering' | 'sales' | 'field' | 'technical' | 'business' | 'default';
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal';
}

export interface SkillMeterProps {
  skills: SkillLevel[];
  title?: string;
  subtitle?: string;
  showLabels?: boolean;
  showPercentage?: boolean;
  animated?: boolean;
  layout?: 'horizontal' | 'vertical' | 'grid';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap = {
  engineering: Wrench,
  sales: MessageSquare,
  field: Clipboard,
  technical: Zap,
  business: TrendingUp,
  default: Star,
};

const colorConfig = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    bar: 'bg-blue-500',
  },
  green: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    bar: 'bg-orange-500',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    bar: 'bg-purple-500',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-100',
    text: 'text-teal-600',
    bar: 'bg-teal-500',
  },
};

const defaultColors = ['blue', 'green', 'orange', 'purple', 'teal'] as const;

const sizeConfig = {
  sm: { bar: 'h-2', icon: 'w-6 h-6', iconInner: 'w-3 h-3', text: 'text-xs', gap: 'gap-2' },
  md: { bar: 'h-3', icon: 'w-8 h-8', iconInner: 'w-4 h-4', text: 'text-sm', gap: 'gap-3' },
  lg: { bar: 'h-4', icon: 'w-10 h-10', iconInner: 'w-5 h-5', text: 'text-base', gap: 'gap-4' },
};

const getLevelLabel = (level: number): string => {
  if (level >= 90) return 'Expert';
  if (level >= 70) return 'Advanced';
  if (level >= 50) return 'Intermediate';
  if (level >= 25) return 'Beginner';
  return 'Novice';
};

export const SkillMeter: React.FC<SkillMeterProps> = ({
  skills,
  title,
  subtitle,
  showLabels = true,
  showPercentage = true,
  animated = true,
  layout = 'vertical',
  size = 'md',
  className = '',
}) => {
  const sizes = sizeConfig[size];
  
  const renderSkillBar = (skill: SkillLevel, index: number) => {
    const color = skill.color || defaultColors[index % defaultColors.length];
    const colors = colorConfig[color];
    const IconComponent = iconMap[skill.icon || 'default'];
    
    return (
      <div key={skill.id} className={`flex items-center ${sizes.gap}`}>
        {/* Icon */}
        <div className={`${sizes.icon} rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
          <IconComponent className={sizes.iconInner} />
        </div>
        
        {/* Bar section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`${sizes.text} font-medium text-gray-900 truncate`}>
              {skill.name}
            </span>
            <div className="flex items-center gap-2">
              {showLabels && (
                <span className={`${sizes.text} ${colors.text} font-medium`}>
                  {getLevelLabel(skill.level)}
                </span>
              )}
              {showPercentage && (
                <span className={`${sizes.text} text-gray-500`}>
                  {skill.level}%
                </span>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className={`w-full ${sizes.bar} bg-gray-100 rounded-full overflow-hidden`}>
            <div 
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full ${animated ? 'transition-all duration-1000 ease-out' : ''}`}
              style={{ width: `${skill.level}%` }}
            />
          </div>
        </div>
      </div>
    );
  };
  
  // Radar chart for grid layout
  const renderRadarChart = () => {
    const size = 200;
    const center = size / 2;
    const maxRadius = 80;
    const angleStep = (2 * Math.PI) / skills.length;
    
    const points = skills.map((skill, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = (skill.level / 100) * maxRadius;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        labelX: center + (maxRadius + 20) * Math.cos(angle),
        labelY: center + (maxRadius + 20) * Math.sin(angle),
        skill,
      };
    });
    
    const pathData = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';
    
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="overflow-visible">
          {/* Background circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={maxRadius * scale}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines */}
          {skills.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x2 = center + maxRadius * Math.cos(angle);
            const y2 = center + maxRadius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Data polygon */}
          <path
            d={pathData}
            fill="url(#radarGradient)"
            fillOpacity="0.3"
            stroke="url(#radarGradient)"
            strokeWidth="2"
            className={animated ? 'animate-fadeIn' : ''}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          
          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
            />
          ))}
          
          {/* Labels */}
          {points.map((point, i) => (
            <text
              key={i}
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-600"
            >
              {point.skill.name}
            </text>
          ))}
        </svg>
      </div>
    );
  };
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      
      {/* Skills display */}
      {layout === 'grid' && skills.length >= 3 ? (
        renderRadarChart()
      ) : layout === 'horizontal' ? (
        <div className="flex gap-6 overflow-x-auto pb-2">
          {skills.map((skill, index) => (
            <div key={skill.id} className="flex-shrink-0 w-40">
              {renderSkillBar(skill, index)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map((skill, index) => renderSkillBar(skill, index))}
        </div>
      )}
    </div>
  );
};

export default SkillMeter;
