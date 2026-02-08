import React, { useState, useEffect } from 'react';
import { MeasureCategory, type EnergyMeasure } from '../data/knowledge-base/types';

export const MeasuresLibrary: React.FC = () => {
  const [measures, setMeasures] = useState<EnergyMeasure[]>([]);
  const [filteredMeasures, setFilteredMeasures] = useState<EnergyMeasure[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MeasureCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load all measures
    fetch('/api/knowledge-base/measures')
      .then((res) => res.json())
      .then((data) => {
        setMeasures(data.measures || []);
        setFilteredMeasures(data.measures || []);
      });
  }, []);

  useEffect(() => {
    let filtered = measures;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    setFilteredMeasures(filtered);
  }, [measures, selectedCategory, searchQuery]);

  const categories = Object.values(MeasureCategory);
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = measures.filter((m) => m.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Energy Efficiency Measures</h1>
        <p className="text-gray-600">
          Complete catalog of energy conservation measures for commercial buildings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Total Measures</p>
          <p className="text-3xl font-bold text-gray-900">{measures.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Categories</p>
          <p className="text-3xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Showing</p>
          <p className="text-3xl font-bold text-gray-900">{filteredMeasures.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search measures..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as MeasureCategory | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')} ({categoryCounts[cat] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Measures Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMeasures.map((measure) => (
          <div
            key={measure.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 mb-2">{measure.name}</h3>
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                {measure.category.replace(/_/g, ' ')}
              </span>
            </div>

            {measure.tags && measure.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {measure.tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {measure.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    +{measure.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {measure.typicalPayback && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Payback: {measure.typicalPayback.min}-{measure.typicalPayback.max} years
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredMeasures.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No measures found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

