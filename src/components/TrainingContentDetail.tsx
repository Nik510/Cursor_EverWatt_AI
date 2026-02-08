/**
 * Training Content Detail Component
 * Displays detailed view of a training document with sections
 */

import React from 'react';
import { X, FileText, BookOpen, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

interface TrainingContent {
  id: string;
  title: string;
  category: string;
  source: string;
  sections: Array<{ heading?: string; content: string }>;
  extractedAt: string;
  sourceType?: 'docx' | 'pdf';
  pages?: number;
}

interface TrainingContentDetailProps {
  content: TrainingContent;
  onClose?: () => void;
}

export const TrainingContentDetail: React.FC<TrainingContentDetailProps> = ({ 
  content, 
  onClose 
}) => {
  const [expandedSections, setExpandedSections] = React.useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = React.useState(false);

  React.useEffect(() => {
    if (expandAll) {
      setExpandedSections(new Set(content.sections.map((_, i) => i)));
    } else {
      setExpandedSections(new Set());
    }
  }, [expandAll, content.sections.length]);

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const categoryColors: Record<string, string> = {
    battery: 'bg-orange-100 text-orange-700',
    hvac: 'bg-blue-100 text-blue-700',
    lighting: 'bg-yellow-100 text-yellow-700',
    measures: 'bg-green-100 text-green-700',
    'ev-charging': 'bg-purple-100 text-purple-700',
    'demand-response': 'bg-indigo-100 text-indigo-700',
    general: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{content.title}</h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-sm font-medium ${categoryColors[content.category] || categoryColors.general}`}>
                {content.category}
              </span>
              {content.sourceType && (
                <span className="text-sm text-gray-600">
                  {content.sourceType.toUpperCase()}
                </span>
              )}
              {content.pages && (
                <span className="text-sm text-gray-600">
                  {content.pages} pages
                </span>
              )}
              <span className="text-sm text-gray-600">
                {content.sections.length} sections
              </span>
            </div>
            {content.source && (
              <p className="text-sm text-gray-500 mt-2">
                Source: {content.source}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="px-3 py-1.5 text-sm bg-white/50 hover:bg-white rounded-lg transition-colors flex items-center gap-2"
            >
              {expandAll ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Expand All
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto p-6">
        {content.sections.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium mb-2">No sections available.</p>
            {content.sourceType && (
              <p className="text-sm">Full content may be available in the original {content.sourceType.toUpperCase()} file.</p>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Summary Stats */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  <strong>{content.sections.length}</strong> sections available
                </span>
                <span className="text-blue-600">
                  {expandedSections.size} of {content.sections.length} expanded
                </span>
              </div>
            </div>

            {content.sections.map((section, index) => {
              const isExpanded = expandedSections.has(index);
              const hasHeading = section.heading && section.heading.trim().length > 0;
              
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {hasHeading ? (
                    <button
                      onClick={() => toggleSection(index)}
                      className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 text-lg pr-4">
                        {section.heading}
                      </h3>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </button>
                  ) : (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <span className="text-sm text-gray-500 italic">Section {index + 1}</span>
                      <button
                        onClick={() => toggleSection(index)}
                        className="ml-auto float-right text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  )}
                  
                  {isExpanded && (
                    <div className="px-6 py-4 bg-white">
                      <div className="prose prose-sm max-w-none">
                        <div className="text-gray-700 leading-relaxed text-sm">
                          {section.content.split('\n\n').filter(p => p.trim().length > 0).map((paragraph, pIndex) => (
                            <p key={pIndex} className="mb-4 last:mb-0">
                              {paragraph.trim()}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

