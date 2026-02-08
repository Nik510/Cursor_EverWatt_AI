/**
 * Unified Data Search Component
 * Provides search interface for all training data and measures
 */

import React, { useState } from 'react';
import { useCategories, useSearch } from '../hooks/useDataService';
import type { SearchResult } from '../types/data-service';

interface DataSearchProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
  initialQuery?: string;
  initialCategory?: string;
  initialType?: 'all' | 'training' | 'measure';
  showCategoryFilter?: boolean;
}

export const DataSearch: React.FC<DataSearchProps> = ({
  onSelect,
  placeholder = 'Search training content, measures, and documentation...',
  className = '',
  initialQuery = '',
  initialCategory = '',
  initialType = 'all',
  showCategoryFilter = true,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedType, setSelectedType] = useState<'all' | 'training' | 'measure'>(initialType);
  const { categories } = useCategories();
  const { results, loading, error } = useSearch(query, {
    categories: selectedCategory ? [selectedCategory] : undefined,
    types: selectedType === 'all' ? ['training', 'measure'] : [selectedType],
    limit: 20,
  });

  const handleResultClick = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
    }
  };

  return (
    <div className={`data-search ${className}`}>
      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-3.5 text-gray-400">
            🔍
          </div>
          {loading && (
            <div className="absolute right-3 top-3.5 text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="training">Training Content</option>
          <option value="measure">Measures</option>
        </select>

        {showCategoryFilter && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          Error: {error.message}
        </div>
      )}

      {/* Results */}
      {query && (
        <div className="search-results">
          {results.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded ${
                          result.type === 'training'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {result.type === 'training' ? '📚 Training' : '⚡ Measure'}
                        </span>
                        {result.category && (
                          <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                            {result.category}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Relevance: {result.relevance.toFixed(1)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {result.snippet}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!query && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <p>Start typing to search training content and measures</p>
          <p className="text-sm mt-2">
            Search across {results.length > 0 ? 'hundreds' : 'all'} of documents, measures, and training materials
          </p>
        </div>
      )}
    </div>
  );
};
