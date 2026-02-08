/**
 * OBFBadge Component
 * Visual badge indicating OBF eligibility status
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  OBFEligibility, 
  UtilityProvider, 
  defaultUtilityPrograms,
  getOBFEligibility 
} from '../../../data/obf/obf-eligibility';

export interface OBFBadgeProps {
  eligible: boolean;
  conditional?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  tooltipContent?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface OBFBadgeWithDetailsProps {
  measureId?: string;
  eligibility?: OBFEligibility;
  showUtilityBreakdown?: boolean;
  expandable?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { badge: 'px-2 py-0.5 text-xs', icon: 'w-3 h-3' },
  md: { badge: 'px-3 py-1 text-sm', icon: 'w-4 h-4' },
  lg: { badge: 'px-4 py-1.5 text-base', icon: 'w-5 h-5' },
};

const statusConfig = {
  eligible: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    icon: CheckCircle,
    label: 'OBF Eligible',
  },
  notEligible: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    icon: XCircle,
    label: 'Not OBF Eligible',
  },
  conditional: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: AlertCircle,
    label: 'Conditionally Eligible',
  },
};

export const OBFBadge: React.FC<OBFBadgeProps> = ({
  eligible,
  conditional = false,
  size = 'md',
  showLabel = true,
  showTooltip = false,
  tooltipContent,
  onClick,
  className = '',
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const status = conditional ? 'conditional' : eligible ? 'eligible' : 'notEligible';
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const IconComponent = config.icon;
  
  return (
    <div className="relative inline-block">
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-full border font-medium
          ${config.bg} ${config.text} ${config.border} ${sizes.badge}
          ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          ${className}
        `}
        onClick={onClick}
        onMouseEnter={() => showTooltip && setIsTooltipVisible(true)}
        onMouseLeave={() => showTooltip && setIsTooltipVisible(false)}
      >
        <IconComponent className={sizes.icon} />
        {showLabel && <span>{config.label}</span>}
      </div>
      
      {/* Tooltip */}
      {showTooltip && isTooltipVisible && tooltipContent && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fadeIn">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs">
            {tooltipContent}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};

// Extended badge with utility breakdown
export const OBFBadgeWithDetails: React.FC<OBFBadgeWithDetailsProps> = ({
  measureId,
  eligibility: propEligibility,
  showUtilityBreakdown = false,
  expandable = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get eligibility from database if not provided
  const eligibility = propEligibility || (measureId ? getOBFEligibility(measureId) : undefined);
  
  if (!eligibility) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-sm ${className}`}>
        <Info className="w-4 h-4" />
        <span>OBF status unknown</span>
      </div>
    );
  }
  
  const hasConditional = eligibility.exceptions && eligibility.exceptions.length > 0;
  
  return (
    <div className={`${className}`}>
      {/* Main badge */}
      <div 
        className={`inline-flex items-center gap-2 ${expandable ? 'cursor-pointer' : ''}`}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
      >
        <OBFBadge 
          eligible={eligibility.eligible} 
          conditional={hasConditional && !eligibility.eligible}
          size="md"
        />
        
        {expandable && (
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 bg-gray-50 rounded-xl p-4 border border-gray-200 animate-fadeIn">
          {/* Reason */}
          {eligibility.eligibilityReason && (
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Reason:</span> {eligibility.eligibilityReason}
            </p>
          )}
          
          {/* Requirements */}
          {eligibility.requirements && eligibility.requirements.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Requirements</p>
              <ul className="space-y-1">
                {eligibility.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-3 h-3 mt-1 text-emerald-500 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Exceptions */}
          {eligibility.exceptions && eligibility.exceptions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Exceptions</p>
              <ul className="space-y-1">
                {eligibility.exceptions.map((exc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <AlertCircle className="w-3 h-3 mt-1 text-amber-500 flex-shrink-0" />
                    {exc}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Utility breakdown */}
          {showUtilityBreakdown && eligibility.utilityPrograms && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Utility Programs</p>
              <div className="grid grid-cols-2 gap-2">
                {eligibility.utilityPrograms.map(program => {
                  const utilityInfo = defaultUtilityPrograms[program.utility];
                  
                  return (
                    <div 
                      key={program.utility}
                      className={`p-2 rounded-lg border ${
                        program.eligible 
                          ? 'bg-emerald-50 border-emerald-200' 
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {program.eligible ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-xs font-bold">{program.utility}</span>
                      </div>
                      
                      {program.eligible && (
                        <div className="text-xs text-gray-600">
                          {program.maxFinancing && (
                            <div>Max: ${program.maxFinancing.toLocaleString()}</div>
                          )}
                          {program.interestRate && (
                            <div>Rate: {program.interestRate}</div>
                          )}
                          {program.maxTerm && (
                            <div>Term: {program.maxTerm} mo</div>
                          )}
                        </div>
                      )}
                      
                      {!program.eligible && program.notes && (
                        <p className="text-xs text-gray-500 italic">{program.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OBFBadge;
