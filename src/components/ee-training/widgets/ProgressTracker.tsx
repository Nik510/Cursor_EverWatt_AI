/**
 * ProgressTracker Widget
 * Multi-step progress bar showing module completion with gamification
 */

import React from 'react';
import { Check, Lock, Circle, Star, Trophy, Zap } from 'lucide-react';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'completed' | 'current' | 'locked' | 'available';
  icon?: React.ReactNode;
}

export interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep?: number;
  showLabels?: boolean;
  orientation?: 'horizontal' | 'vertical';
  color?: 'blue' | 'green' | 'purple' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  onStepClick?: (step: ProgressStep, index: number) => void;
  className?: string;
}

const colorConfig = {
  blue: {
    completed: 'bg-blue-500 text-white',
    current: 'bg-blue-100 border-blue-500 text-blue-600',
    available: 'bg-gray-100 border-gray-300 text-gray-400',
    locked: 'bg-gray-50 border-gray-200 text-gray-300',
    line: 'bg-blue-500',
    lineInactive: 'bg-gray-200',
  },
  green: {
    completed: 'bg-emerald-500 text-white',
    current: 'bg-emerald-100 border-emerald-500 text-emerald-600',
    available: 'bg-gray-100 border-gray-300 text-gray-400',
    locked: 'bg-gray-50 border-gray-200 text-gray-300',
    line: 'bg-emerald-500',
    lineInactive: 'bg-gray-200',
  },
  purple: {
    completed: 'bg-purple-500 text-white',
    current: 'bg-purple-100 border-purple-500 text-purple-600',
    available: 'bg-gray-100 border-gray-300 text-gray-400',
    locked: 'bg-gray-50 border-gray-200 text-gray-300',
    line: 'bg-purple-500',
    lineInactive: 'bg-gray-200',
  },
  orange: {
    completed: 'bg-orange-500 text-white',
    current: 'bg-orange-100 border-orange-500 text-orange-600',
    available: 'bg-gray-100 border-gray-300 text-gray-400',
    locked: 'bg-gray-50 border-gray-200 text-gray-300',
    line: 'bg-orange-500',
    lineInactive: 'bg-gray-200',
  },
};

const sizeConfig = {
  sm: { step: 'w-8 h-8', icon: 'w-4 h-4', line: 'h-0.5', text: 'text-xs' },
  md: { step: 'w-10 h-10', icon: 'w-5 h-5', line: 'h-1', text: 'text-sm' },
  lg: { step: 'w-12 h-12', icon: 'w-6 h-6', line: 'h-1.5', text: 'text-base' },
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  currentStep,
  showLabels = true,
  orientation = 'horizontal',
  color = 'blue',
  size = 'md',
  onStepClick,
  className = '',
}) => {
  const colors = colorConfig[color];
  const sizes = sizeConfig[size];
  
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = (completedCount / steps.length) * 100;
  
  const getStepIcon = (step: ProgressStep, index: number) => {
    if (step.icon) return step.icon;
    
    switch (step.status) {
      case 'completed':
        return <Check className={sizes.icon} />;
      case 'current':
        return <Zap className={sizes.icon} />;
      case 'locked':
        return <Lock className={sizes.icon} />;
      default:
        return <Circle className={sizes.icon} />;
    }
  };
  
  const getStepClasses = (step: ProgressStep) => {
    const base = `${sizes.step} rounded-full border-2 flex items-center justify-center transition-all duration-300`;
    return `${base} ${colors[step.status]}`;
  };
  
  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col ${className}`}>
        {/* Progress header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-gray-900">{completedCount}</span>
            <span className="text-gray-500 text-sm">/{steps.length} completed</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold text-gray-700">{Math.round(progress)}%</span>
          </div>
        </div>
        
        {/* Vertical steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`flex items-start gap-4 ${step.status !== 'locked' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={() => step.status !== 'locked' && onStepClick?.(step, index)}
            >
              {/* Step indicator */}
              <div className="relative">
                <div className={getStepClasses(step)}>
                  {getStepIcon(step, index)}
                </div>
                {index < steps.length - 1 && (
                  <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-8 ${
                    step.status === 'completed' ? colors.line : colors.lineInactive
                  }`} />
                )}
              </div>
              
              {/* Step content */}
              {showLabels && (
                <div className="flex-1 pt-1">
                  <p className={`font-semibold ${
                    step.status === 'locked' ? 'text-gray-400' : 'text-gray-900'
                  } ${sizes.text}`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Horizontal orientation
  return (
    <div className={`${className}`}>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full">
            <Star className="w-4 h-4" />
            <span className="text-sm font-bold">{completedCount}/{steps.length}</span>
          </div>
          <span className="text-sm text-gray-500">sections complete</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full ${colors.line} rounded-full transition-all duration-500`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Horizontal steps */}
      <div className="flex items-start justify-between">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex flex-col items-center flex-1 ${
              step.status !== 'locked' ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
            onClick={() => step.status !== 'locked' && onStepClick?.(step, index)}
          >
            {/* Step indicator with connecting line */}
            <div className="relative flex items-center w-full">
              {/* Left line */}
              {index > 0 && (
                <div className={`flex-1 ${sizes.line} ${
                  steps[index - 1].status === 'completed' ? colors.line : colors.lineInactive
                }`} />
              )}
              
              {/* Step circle */}
              <div className={`${getStepClasses(step)} relative z-10 shadow-md`}>
                {getStepIcon(step, index)}
              </div>
              
              {/* Right line */}
              {index < steps.length - 1 && (
                <div className={`flex-1 ${sizes.line} ${
                  step.status === 'completed' ? colors.line : colors.lineInactive
                }`} />
              )}
            </div>
            
            {/* Step label */}
            {showLabels && (
              <div className="mt-3 text-center px-1">
                <p className={`font-medium ${
                  step.status === 'locked' ? 'text-gray-400' : 'text-gray-700'
                } ${sizes.text} leading-tight`}>
                  {step.label}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressTracker;
