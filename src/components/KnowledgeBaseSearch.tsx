import React, { useState } from 'react';
import { MeasureCategory, VerticalMarket } from '../data/knowledge-base/types';

interface KnowledgeBaseSearchProps {
  onSelectMeasure?: (measureId: string) => void;
  onSelectEquipment?: (equipmentId: string) => void;
  onSelectVertical?: (vertical: VerticalMarket) => void;
}

export const KnowledgeBaseSearch: React.FC<KnowledgeBaseSearchProps> = ({
  onSelectMeasure,
  onSelectEquipment,
  onSelectVertical,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MeasureCategory | 'all'>('all');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/knowledge-base/search?q=${encodeURIComponent(searchQuery)}&limit=20`
      );
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search measures, equipment, verticals..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as MeasureCategory | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Categories</option>
          {Object.values(MeasureCategory).map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-8">
          {/* Measures Results */}
          {results.measures && results.measures.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Measures ({results.measures.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.measures.map((measure: any) => (
                  <div
                    key={measure.id}
                    onClick={() => onSelectMeasure?.(measure.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{measure.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {measure.category.replace(/_/g, ' ')}
                    </p>
                    {measure.tags && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {measure.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment Results */}
          {results.equipment && results.equipment.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Equipment ({results.equipment.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.equipment.map((equipment: any) => (
                  <div
                    key={equipment.id}
                    onClick={() => onSelectEquipment?.(equipment.id)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{equipment.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {equipment.type.replace(/_/g, ' ')}
                    </p>
                    {equipment.visualId && (
                      <p className="text-xs text-gray-500 mt-2">
                        Found: {equipment.visualId.whereFound}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verticals Results */}
          {results.verticals && results.verticals.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Verticals ({results.verticals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.verticals.map((vertical: any) => (
                  <div
                    key={vertical.vertical}
                    onClick={() => onSelectVertical?.(vertical.vertical)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">{vertical.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{vertical.description}</p>
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">
                        Peak Demand: {vertical.typicalLoadProfile.peakDemand.min} -{' '}
                        {vertical.typicalLoadProfile.peakDemand.max} kW
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results &&
            (!results.measures || results.measures.length === 0) &&
            (!results.equipment || results.equipment.length === 0) &&
            (!results.verticals || results.verticals.length === 0) && (
              <div className="text-center py-12">
                <p className="text-gray-500">No results found. Try a different search term.</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

