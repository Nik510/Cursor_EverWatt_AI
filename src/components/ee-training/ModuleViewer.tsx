/**
 * Module Viewer Component
 * Displays a training module with all its sections and content
 */

import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Clock, ChevronRight } from 'lucide-react';
import type { TrainingModule, TrainingSection } from '../../backend/ee-training/types';
import { ContentBlockRenderer } from './ContentBlockRenderer';

interface ModuleViewerProps {
  module: TrainingModule;
  onBack: () => void;
}

export const ModuleViewer: React.FC<ModuleViewerProps> = ({ module, onBack }) => {
  const [selectedSection, setSelectedSection] = useState<TrainingSection | null>(
    module.sections.length > 0 ? module.sections[0] : null
  );

  return (
    <div className="h-full flex">
      {/* Sidebar - Section Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </button>
          <h2 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h2>
          {module.subtitle && (
            <p className="text-sm text-gray-600 mb-4">{module.subtitle}</p>
          )}
          {module.metadata?.estimatedTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{module.metadata.estimatedTime} minutes</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Sections</h3>
          <div className="space-y-1">
            {module.sections.map(section => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  selectedSection?.id === section.id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{section.icon || '📄'}</span>
                <div className="flex-1">
                  <div className="font-medium">{section.title}</div>
                  {section.subtitle && (
                    <div className="text-xs text-gray-500">{section.subtitle}</div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selectedSection ? (
          <div className="max-w-4xl mx-auto p-8">
            {/* Section Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{selectedSection.icon || '📄'}</span>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{selectedSection.title}</h1>
                  {selectedSection.subtitle && (
                    <p className="text-lg text-gray-600 mt-1">{selectedSection.subtitle}</p>
                  )}
                </div>
              </div>
              {selectedSection.metadata?.estimatedTime && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{selectedSection.metadata.estimatedTime} minutes</span>
                </div>
              )}
            </div>

            {/* Section Content */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              {selectedSection.content.length === 0 ? (
                <p className="text-gray-500">No content available for this section.</p>
              ) : (
                selectedSection.content
                  .sort((a, b) => a.order - b.order)
                  .map(block => (
                    <ContentBlockRenderer key={block.id} block={block} />
                  ))
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a section to view content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
