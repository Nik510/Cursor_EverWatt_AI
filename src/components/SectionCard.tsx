import React from 'react';
import type { SectionInsight } from '../services/llm-insights';
import { AIInsightPanel } from './AIInsightPanel';

interface SectionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;

  insight?: SectionInsight | null;
  insightLoading?: boolean;
  insightVariant?: 'default' | 'purple' | 'blue' | 'green';
  insightCompact?: boolean;
  insightDefaultExpanded?: boolean;

  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  right,
  children,
  insight,
  insightLoading,
  insightVariant = 'default',
  insightCompact = false,
  insightDefaultExpanded = true,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-bold text-gray-900 truncate">{title}</h3>
          </div>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>

      <div className="mt-4">{children}</div>

      {(insightLoading || insight) && (
        <AIInsightPanel
          insight={insight || null}
          isLoading={!!insightLoading}
          defaultExpanded={insightDefaultExpanded}
          compact={insightCompact}
          variant={insightVariant}
          className="mt-4"
        />
      )}
    </div>
  );
};

export default SectionCard;
