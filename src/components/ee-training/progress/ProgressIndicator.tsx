import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

export interface ProgressIndicatorProps {
  percent: number; // 0..100
  label?: string;
  showPercent?: boolean;
  compact?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percent,
  label,
  showPercent = true,
  compact = false,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const completed = clamped >= 100;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {completed ? (
          <CheckCircle className="w-4 h-4 text-emerald-600" />
        ) : (
          <Circle className="w-4 h-4 text-slate-300" />
        )}
        <span className="text-xs font-semibold text-slate-600">
          {label ? `${label} · ` : ''}
          {showPercent ? `${clamped}%` : completed ? 'Completed' : 'In progress'}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          {label ?? 'Progress'}
        </div>
        <div className="text-xs font-semibold text-slate-600">
          {completed ? 'Completed' : showPercent ? `${clamped}%` : 'In progress'}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            completed ? 'bg-emerald-600' : 'bg-gradient-to-r from-indigo-600 to-pink-600'
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};


