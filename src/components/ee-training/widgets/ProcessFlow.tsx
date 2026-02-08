/**
 * ProcessFlow Widget
 * Animated step-by-step process visualization
 */

import React, { useState } from 'react';
import { ChevronRight, ArrowRight, Check, Zap } from 'lucide-react';

export interface ProcessStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  details?: string[];
  duration?: string;
}

export interface ProcessFlowProps {
  steps: ProcessStep[];
  title?: string;
  subtitle?: string;
  currentStep?: number;
  direction?: 'horizontal' | 'vertical';
  animated?: boolean;
  interactive?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'teal';
  className?: string;
}

const colorConfig = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    line: 'bg-blue-300',
    active: 'bg-blue-500',
  },
  green: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    line: 'bg-emerald-300',
    active: 'bg-emerald-500',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    line: 'bg-purple-300',
    active: 'bg-purple-500',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    line: 'bg-orange-300',
    active: 'bg-orange-500',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-600',
    line: 'bg-teal-300',
    active: 'bg-teal-500',
  },
};

export const ProcessFlow: React.FC<ProcessFlowProps> = ({
  steps,
  title,
  subtitle,
  currentStep = 0,
  direction = 'horizontal',
  animated = true,
  interactive = true,
  color = 'blue',
  className = '',
}) => {
  const [activeStep, setActiveStep] = useState(currentStep);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const colors = colorConfig[color];
  
  const handleStepClick = (index: number) => {
    if (interactive) {
      setActiveStep(index);
    }
  };
  
  if (direction === 'vertical') {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
        {title && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}
        
        <div className="space-y-0">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isPast = index < activeStep;
            const isHovered = index === hoveredStep;
            
            return (
              <div 
                key={step.id}
                className={`relative ${interactive ? 'cursor-pointer' : ''}`}
                onClick={() => handleStepClick(index)}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div className="flex gap-4">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300 z-10
                      ${isPast || isActive
                        ? `bg-gradient-to-br ${colors.gradient} text-white shadow-lg`
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                      }
                      ${isHovered && !isActive && !isPast ? 'scale-110' : ''}
                    `}>
                      {isPast ? (
                        <Check className="w-5 h-5" />
                      ) : step.icon ? (
                        step.icon
                      ) : (
                        <span className="font-bold">{index + 1}</span>
                      )}
                    </div>
                    
                    {/* Connecting line */}
                    {index < steps.length - 1 && (
                      <div className={`w-0.5 h-16 ${isPast ? colors.active : 'bg-gray-200'} transition-colors duration-300`} />
                    )}
                  </div>
                  
                  {/* Step content */}
                  <div className={`flex-1 pb-8 ${index < steps.length - 1 ? '' : 'pb-0'}`}>
                    <h4 className={`font-semibold transition-colors duration-300 ${
                      isActive ? 'text-gray-900' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </h4>
                    
                    {step.duration && (
                      <span className="text-xs text-gray-400 mt-0.5 block">{step.duration}</span>
                    )}
                    
                    {step.description && (
                      <p className="text-sm text-gray-500 mt-2">{step.description}</p>
                    )}
                    
                    {/* Expanded details */}
                    {isActive && step.details && step.details.length > 0 && (
                      <ul className={`mt-3 space-y-1 ${colors.bg} ${colors.border} border rounded-lg p-3`}>
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <ArrowRight className={`w-3 h-3 mt-1 flex-shrink-0 ${colors.text}`} />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Horizontal layout
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {title && (
        <div className="mb-6 text-center">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
      )}
      
      {/* Steps container */}
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isPast = index < activeStep;
          const isHovered = index === hoveredStep;
          
          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div 
                className={`flex-1 flex flex-col items-center text-center ${interactive ? 'cursor-pointer' : ''}`}
                onClick={() => handleStepClick(index)}
                onMouseEnter={() => setHoveredStep(index)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {/* Circle */}
                <div className={`
                  w-14 h-14 rounded-full flex items-center justify-center
                  transition-all duration-300 mb-3
                  ${isPast || isActive
                    ? `bg-gradient-to-br ${colors.gradient} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                  }
                  ${isHovered && !isActive && !isPast ? 'scale-110' : ''}
                  ${isActive && animated ? 'ring-4 ring-blue-100' : ''}
                `}>
                  {isPast ? (
                    <Check className="w-6 h-6" />
                  ) : step.icon ? (
                    step.icon
                  ) : (
                    <span className="text-lg font-bold">{index + 1}</span>
                  )}
                </div>
                
                {/* Title */}
                <h4 className={`font-semibold text-sm transition-colors duration-300 ${
                  isActive ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {step.title}
                </h4>
                
                {step.duration && (
                  <span className="text-xs text-gray-400 mt-0.5">{step.duration}</span>
                )}
                
                {/* Description on hover/active */}
                {(isActive || isHovered) && step.description && (
                  <p className="text-xs text-gray-500 mt-2 max-w-[150px] animate-fadeIn">
                    {step.description}
                  </p>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 flex items-center pt-6 px-2">
                  <div className={`h-1 w-full rounded-full transition-colors duration-300 ${
                    isPast ? colors.active : 'bg-gray-200'
                  }`}>
                    {animated && isPast && (
                      <div className={`h-full w-full ${colors.active} rounded-full animate-pulse`} />
                    )}
                  </div>
                  <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                    isPast ? colors.text : 'text-gray-300'
                  }`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Active step details */}
      {steps[activeStep]?.details && steps[activeStep].details!.length > 0 && (
        <div className={`mt-6 ${colors.bg} ${colors.border} border rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className={`w-4 h-4 ${colors.text}`} />
            <span className="font-semibold text-gray-900">{steps[activeStep].title} Details</span>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {steps[activeStep].details!.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <ArrowRight className={`w-3 h-3 mt-1 flex-shrink-0 ${colors.text}`} />
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProcessFlow;
