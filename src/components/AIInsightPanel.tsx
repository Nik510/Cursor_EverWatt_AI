/**
 * AI Insight Panel Component
 * Displays dual-perspective AI insights for sales and engineering audiences
 */

import React, { useState } from 'react';
import {
  Lightbulb,
  Wrench,
  Users,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Target,
} from 'lucide-react';
import type { SectionInsight } from '../types/ai-insights';

interface AIInsightPanelProps {
  /**
   * The insight data to display
   */
  insight: SectionInsight | null;

  /**
   * Whether the insight is currently loading
   */
  isLoading?: boolean;

  /**
   * Whether to show the panel in expanded mode by default
   */
  defaultExpanded?: boolean;

  /**
   * Custom class name for styling
   */
  className?: string;

  /**
   * Compact mode - shows less detail
   */
  compact?: boolean;

  /**
   * Color theme variant
   */
  variant?: 'default' | 'purple' | 'blue' | 'green';
}

export const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  insight,
  isLoading = false,
  defaultExpanded = true,
  className = '',
  compact = false,
  variant = 'default',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Variant color schemes
  const variantStyles = {
    default: {
      bg: 'bg-gradient-to-r from-purple-50 to-blue-50',
      border: 'border-purple-200',
      headerBg: 'bg-purple-100',
      icon: 'text-purple-600',
      accentBg: 'bg-purple-50',
      accentBorder: 'border-purple-200',
    },
    purple: {
      bg: 'bg-gradient-to-r from-purple-50 to-violet-50',
      border: 'border-purple-200',
      headerBg: 'bg-purple-100',
      icon: 'text-purple-600',
      accentBg: 'bg-purple-50',
      accentBorder: 'border-purple-200',
    },
    blue: {
      bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      border: 'border-blue-200',
      headerBg: 'bg-blue-100',
      icon: 'text-blue-600',
      accentBg: 'bg-blue-50',
      accentBorder: 'border-blue-200',
    },
    green: {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      border: 'border-green-200',
      headerBg: 'bg-green-100',
      icon: 'text-green-600',
      accentBg: 'bg-green-50',
      accentBorder: 'border-green-200',
    },
  };

  const styles = variantStyles[variant];

  // Loading state
  if (isLoading) {
    return (
      <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating AI insights...</span>
        </div>
      </div>
    );
  }

  // No insight available
  if (!insight) {
    return null;
  }

  // Error state
  if (insight.error) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-amber-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">AI insights unavailable. Using standard analysis.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 ${styles.border} ${styles.bg} overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 ${styles.headerBg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white/80 ${styles.icon}`}>
            {insight.isGenerated ? (
              <Sparkles className="w-4 h-4" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
          </div>
          <span className="font-semibold text-gray-800 text-sm">
            AI Analysis
            {insight.isGenerated && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                (Powered by GPT)
              </span>
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* What We're Looking At */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Target className={`w-4 h-4 ${styles.icon}`} />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                What We're Looking At
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {insight.whatWeAreLookingAt}
            </p>
          </div>

          {/* Why It Matters */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 className={`w-4 h-4 ${styles.icon}`} />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Why It Matters
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {insight.whyItMatters}
            </p>
          </div>

          {!compact && (
            <>
              {/* Engineering Focus */}
              {insight.engineeringFocus.length > 0 && (
                <div className={`rounded-lg border ${styles.accentBorder} ${styles.accentBg} p-3`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-gray-600" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Engineering Focus
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {insight.engineeringFocus.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sales Talking Points */}
              {insight.salesTalkingPoints.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      Sales Talking Points
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {insight.salesTalkingPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      Recommendations
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {insight.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-green-800">
                        <span className="font-semibold">{index + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Generated timestamp */}
          {insight.generatedAt && (
            <div className="text-xs text-gray-400 text-right">
              Generated {new Date(insight.generatedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact inline AI insight badge
 */
export const AIInsightBadge: React.FC<{
  text: string;
  type?: 'info' | 'success' | 'warning';
}> = ({ text, type = 'info' }) => {
  const typeStyles = {
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${typeStyles[type]}`}>
      <Sparkles className="w-3 h-3" />
      {text}
    </span>
  );
};

/**
 * Weather insight panel variant
 */
interface WeatherInsightPanelProps {
  summary: string;
  technicalFindings: string[];
  efficiencyOpportunities: string[];
  impactOnBattery: string;
  className?: string;
}

export const WeatherInsightPanel: React.FC<WeatherInsightPanelProps> = ({
  summary,
  technicalFindings,
  efficiencyOpportunities,
  impactOnBattery,
  className = '',
}) => {
  return (
    <div className={`rounded-xl border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 overflow-hidden ${className}`}>
      <div className="p-3 bg-cyan-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/80 text-cyan-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-gray-800 text-sm">
            Weather Correlation Analysis
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700 font-medium">{summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Technical Findings */}
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-semibold text-cyan-700 uppercase">
                Technical Findings
              </span>
            </div>
            <ul className="space-y-1">
              {technicalFindings.map((finding, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-cyan-800">
                  <span className="text-cyan-400">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Efficiency Opportunities */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase">
                Efficiency Opportunities
              </span>
            </div>
            <ul className="space-y-1">
              {efficiencyOpportunities.map((opp, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-green-800">
                  <span className="text-green-400">•</span>
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Battery Impact */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 uppercase">
              Impact on Battery Strategy
            </span>
          </div>
          <p className="text-sm text-purple-800">{impactOnBattery}</p>
        </div>
      </div>
    </div>
  );
};

export default AIInsightPanel;


