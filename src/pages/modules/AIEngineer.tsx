import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, BookOpen, MessageSquare } from 'lucide-react';
import { TechnologyExplorer } from '../TechnologyExplorer';
import { TrainingContentList } from '../../components/TrainingContentList';
import { TrainingContentDetail } from '../../components/TrainingContentDetail';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { AiChat } from '../../components/ai/AiChat';

type TrainingContent = {
  id: string;
  title: string;
  category: string;
  source: string;
  sections: Array<{ heading?: string; content: string }>;
  extractedAt: string;
  sourceType?: 'docx' | 'pdf';
  pages?: number;
};

export const AIEngineer: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = React.useState<'training' | 'chat'>('training');
  const [trainingMode, setTrainingMode] = React.useState<'explorer' | 'library'>('explorer');
  const [selectedTrainingContent, setSelectedTrainingContent] = React.useState<TrainingContent | null>(null);

  React.useEffect(() => {
    // debug-only
  }, []);

  // Simple test - if this doesn't render, there's a more fundamental issue
  // debug-only

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Engineer Assistant</h1>
                <p className="text-sm text-gray-500">Bridge the Training Gap</p>
              </div>
            </div>
          </div>

                      {/* View Toggle */}
                      <div className="flex items-center gap-2">
                        {activeView === 'training' && (
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 mr-2">
                            <button
                              onClick={() => setTrainingMode('explorer')}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                trainingMode === 'explorer'
                                  ? 'bg-white text-purple-600 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Explorer
                            </button>
                            <button
                              onClick={() => setTrainingMode('library')}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                trainingMode === 'library'
                                  ? 'bg-white text-purple-600 shadow-sm'
                                  : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Library
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => setActiveView('training')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                              activeView === 'training'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <BookOpen className="w-4 h-4" />
                            Training Library
                          </button>
                          <button
                            onClick={() => setActiveView('chat')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                              activeView === 'chat'
                                ? 'bg-white text-purple-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4" />
                            AI Chat
                          </button>
                        </div>
                      </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'training' ? (
          trainingMode === 'explorer' ? (
            <ErrorBoundary fallback={
              <div className="h-full flex items-center justify-center bg-red-50">
                <div className="text-center p-8">
                  <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Technology Explorer</h2>
                  <p className="text-gray-700">Please check the browser console for details.</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            }>
              <div className="h-full">
                <TechnologyExplorer embedded={true} />
              </div>
            </ErrorBoundary>
          ) : selectedTrainingContent ? (
            <TrainingContentDetail
              content={selectedTrainingContent}
              onClose={() => setSelectedTrainingContent(null)}
            />
          ) : (
            <div className="h-full flex">
              <div className="w-1/3 border-r border-gray-200">
                <TrainingContentList
                  onSelect={setSelectedTrainingContent}
                />
              </div>
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a document to view details</p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="h-full bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto h-full">
              <AiChat
                title="AI Engineering Assistant"
                systemPrompt="You are a senior energy engineer assistant. Answer with actionable guidance. If uncertain, state assumptions and suggest what data to collect next."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
