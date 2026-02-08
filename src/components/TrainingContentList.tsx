/**
 * Training Content List Component
 * Displays extracted training content from the knowledge base
 */

import React, { useState, useEffect } from 'react';
import { BookOpen, Search, FileText, ChevronRight, Calendar, Tag } from 'lucide-react';
import { TrainingContentError } from './TrainingContentError';

interface TrainingContent {
  id: string;
  title: string;
  category: 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general';
  source: string;
  sections: Array<{ heading?: string; content: string }>;
  extractedAt: string;
  sourceType?: 'docx' | 'pdf';
  pages?: number;
}

interface TrainingContentListProps {
  onSelect?: (content: TrainingContent) => void;
  category?: string;
  searchQuery?: string;
}

export const TrainingContentList: React.FC<TrainingContentListProps> = ({ 
  onSelect, 
  category,
  searchQuery 
}) => {
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(category || 'all');

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  useEffect(() => {
    if (searchTerm) {
      searchContent();
    } else {
      loadTrainingContent();
    }
  }, [searchTerm, selectedCategory]);

  const loadTrainingContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = selectedCategory && selectedCategory !== 'all'
        ? `/api/training-content/category/${selectedCategory}`
        : '/api/training-content';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setContent(data.content || []);
      } else {
        const errorMsg = data.error || 'Unknown error loading content';
        setError(errorMsg);
        setContent([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load training content. Make sure the API server is running.';
      console.error('Error loading training content:', error);
      setError(errorMsg);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const searchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/training-content/search?q=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setContent(data.content || []);
      } else {
        const errorMsg = data.error || 'Unknown error searching content';
        setError(errorMsg);
        setContent([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to search training content.';
      console.error('Error searching training content:', error);
      setError(errorMsg);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: TrainingContent) => {
    setSelectedContent(item);
    if (onSelect) {
      onSelect(item);
    }
  };

  const categoryColors: Record<string, string> = {
    battery: 'bg-orange-100 text-orange-700 border-orange-300',
    hvac: 'bg-blue-100 text-blue-700 border-blue-300',
    lighting: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    measures: 'bg-green-100 text-green-700 border-green-300',
    'ev-charging': 'bg-purple-100 text-purple-700 border-purple-300',
    'demand-response': 'bg-indigo-100 text-indigo-700 border-indigo-300',
    general: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <div className="text-gray-500">Loading training content...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search & Filter Bar */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search training content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSearchTerm(''); // Clear search when changing category
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Categories</option>
            <option value="battery">Battery</option>
            <option value="hvac">HVAC</option>
            <option value="lighting">Lighting</option>
            <option value="measures">Measures</option>
            <option value="ev-charging">EV Charging</option>
            <option value="demand-response">Demand Response</option>
            <option value="general">General</option>
          </select>
        </div>
        {content.length > 0 && (
          <div className="text-sm text-gray-500">
            Found {content.length} {content.length === 1 ? 'document' : 'documents'}
            {selectedCategory !== 'all' && ` in ${selectedCategory}`}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="p-4">
          <TrainingContentError error={error} onRetry={loadTrainingContent} />
        </div>
      )}

      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        {error && !loading ? null : content.length === 0 && !loading ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium mb-2">No training content found.</p>
            {searchTerm ? (
              <p className="text-sm">Try a different search term or clear the search.</p>
            ) : selectedCategory !== 'all' ? (
              <p className="text-sm">Try selecting a different category or "All Categories".</p>
            ) : (
              <p className="text-sm">Training content may still be loading or unavailable.</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {content.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedContent?.id === item.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap mt-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${categoryColors[item.category] || categoryColors.general}`}>
                        {item.category.replace(/-/g, ' ')}
                      </span>
                      {item.sourceType && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs uppercase rounded">
                          {item.sourceType}
                        </span>
                      )}
                      {item.pages && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {item.pages} pages
                        </span>
                      )}
                      {item.sections.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {item.sections.length} {item.sections.length === 1 ? 'section' : 'sections'}
                        </span>
                      )}
                    </div>

                    {item.source && (
                      <p className="text-xs text-gray-400 mt-2 truncate">
                        Source: {item.source}
                      </p>
                    )}

                    {/* Preview snippet */}
                    {item.sections.length > 0 && item.sections[0].content && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {item.sections[0].content.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

