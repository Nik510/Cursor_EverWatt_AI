import React from 'react';
import { GraduationCap, Briefcase } from 'lucide-react';

interface PerspectiveBadgeProps {
  type: 'engineer' | 'sales';
  className?: string;
}

export const PerspectiveBadge: React.FC<PerspectiveBadgeProps> = ({ type, className = '' }) => {
  if (type === 'engineer') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300 ${className}`}>
        <GraduationCap className="w-3.5 h-3.5" />
        Engineer-Grade
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-300 ${className}`}>
      <Briefcase className="w-3.5 h-3.5" />
      Sales/Auditor Intel
    </span>
  );
};

