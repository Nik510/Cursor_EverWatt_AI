/**
 * Master Equipment Explorer
 * Browse and search ALL equipment types across all categories
 * Similar to LightingMasterCompendium but for all technologies
 */

import React, { useState, useMemo } from 'react';
import { masterEEDatabase } from '../../data/master-ee-database';
import { comprehensiveEquipmentDatabase } from '../../data/equipment/comprehensive-equipment-database';
import type { DetailedEquipment } from '../../data/equipment/comprehensive-equipment-database';

interface MasterEquipmentExplorerProps {
  category?: string;
  subcategory?: string;
}

export const MasterEquipmentExplorer: React.FC<MasterEquipmentExplorerProps> = ({
  category: initialCategory,
  subcategory: initialSubcategory,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(initialSubcategory || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<DetailedEquipment | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Get all categories with safe access
  let categories: any[] = [];
  let allMeasures: any[] = [];
  let metadata: any = { totalMeasures: 0 };
  
  try {
    if (masterEEDatabase) {
      categories = masterEEDatabase.categories || [];
      allMeasures = masterEEDatabase.allMeasures || [];
      metadata = masterEEDatabase.metadata || { totalMeasures: 0 };
    }
  } catch (error) {
    console.error('Error loading masterEEDatabase:', error);
  }

  // Get subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory || categories.length === 0) return [];
    const cat = categories.find(c => c.id === selectedCategory || c.name === selectedCategory);
    return cat?.subcategories || [];
  }, [selectedCategory, categories]);

  // Get measures/equipment based on filters
  const filteredEquipment = useMemo(() => {
    let measures = allMeasures;

    // Filter by category
    if (selectedCategory) {
      measures = measures.filter(m => 
        m.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        m.category?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    // Filter by subcategory
    if (selectedSubcategory) {
      measures = measures.filter(m => 
        m.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase() ||
        m.subcategory?.toLowerCase().includes(selectedSubcategory.toLowerCase())
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      measures = measures.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.category?.toLowerCase().includes(query) ||
        m.subcategory?.toLowerCase().includes(query) ||
        m.keywords.some(k => k.toLowerCase().includes(query))
      );
    }

    return measures;
  }, [selectedCategory, selectedSubcategory, searchQuery]);

  // Try to find detailed equipment info
  const getDetailedEquipment = (measureName: string): DetailedEquipment | null => {
    try {
      if (!comprehensiveEquipmentDatabase || !Array.isArray(comprehensiveEquipmentDatabase)) {
        return null;
      }
      return comprehensiveEquipmentDatabase.find(eq =>
        eq.name.toLowerCase() === measureName.toLowerCase() ||
        measureName.toLowerCase().includes(eq.name.toLowerCase()) ||
        eq.name.toLowerCase().includes(measureName.toLowerCase())
      ) || null;
    } catch (error) {
      console.error('Error in getDetailedEquipment:', error);
      return null;
    }
  };

  const handleEquipmentClick = (measureName: string) => {
    const detailed = getDetailedEquipment(measureName);
    if (detailed) {
      setSelectedEquipment(detailed);
      setViewMode('detail');
    } else {
      // Show basic info
      const measure = filteredEquipment.find(m => m.name === measureName);
      if (measure) {
        // Convert basic measure to detailed format (with defaults)
        setSelectedEquipment({
          id: measure.id,
          name: measure.name,
          category: measure.category || 'Unknown',
          subcategory: measure.subcategory || 'General',
          identification: {
            physicalCharacteristics: [],
            keyComponents: [],
            typicalSizes: 'Varies',
            nameplateInfo: [],
            howToIdentify: [],
            typicalManufacturers: [],
          },
          specifications: {
            capacityRange: 'Varies',
            efficiencyRange: 'Varies',
            efficiencyMetrics: [],
            typicalEfficiency: 'Varies',
            operatingConditions: 'Standard',
          },
          applications: {
            typicalLocations: [],
            buildingTypes: [],
            useCases: [],
            commonConfigurations: [],
          },
          replacement: {
            recommendedUpgrade: 'Evaluate on case-by-case basis',
            upgradeReason: 'Improve efficiency and reduce energy costs',
            whenToUpgrade: {},
            priority: 'Medium',
            typicalPaybackYears: '5-10 years',
            energySavingsPercent: '10-30%',
            notes: [],
          },
          bestPractices: {
            maintenance: [],
            optimization: [],
            commonIssues: [],
            troubleshooting: [],
          },
        });
        setViewMode('detail');
      }
    }
  };

  // Safety check - if no data, show error message
  if (categories.length === 0 && allMeasures.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Equipment Database...</h2>
          <p className="text-gray-600">Please wait while the database loads.</p>
          <p className="text-sm text-gray-500 mt-2">If this message persists, check the browser console for errors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Master Equipment Database</h1>
            <p className="text-gray-600 mt-1">
              Complete catalog of {metadata.totalMeasures || 0} energy efficiency measures
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              List View
            </button>
            {selectedEquipment && (
              <button
                onClick={() => setViewMode('detail')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'detail'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Detail View
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search equipment, categories, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          {/* Category Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.subcategories.reduce((sum, s) => sum + s.measures.length, 0)} measures)
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Subcategories</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.measures.length} measures)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'list' ? (
          <div className="p-6">
            <div className="mb-4 text-gray-600">
              Showing {filteredEquipment.length} of {metadata.totalMeasures} measures
            </div>

            {/* Equipment List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipment.map(measure => {
                let hasDetailedInfo = false;
                try {
                  hasDetailedInfo = comprehensiveEquipmentDatabase && Array.isArray(comprehensiveEquipmentDatabase) 
                    ? comprehensiveEquipmentDatabase.some(eq =>
                        eq.name.toLowerCase() === measure.name.toLowerCase()
                      )
                    : false;
                } catch (error) {
                  console.error('Error checking detailed info:', error);
                }
                
                return (
                  <div
                    key={measure.id}
                    onClick={() => handleEquipmentClick(measure.name)}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{measure.name}</h3>
                      {hasDetailedInfo && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Detailed
                        </span>
                      )}
                    </div>
                    {measure.category && (
                      <div className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">{measure.category}</span>
                        {measure.subcategory && (
                          <span> → {measure.subcategory}</span>
                        )}
                      </div>
                    )}
                    {measure.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {measure.keywords.slice(0, 3).map(keyword => (
                          <span
                            key={keyword}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredEquipment.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No equipment found matching your filters. Try adjusting your search or filters.
              </div>
            )}
          </div>
        ) : selectedEquipment ? (
          <EquipmentDetailView equipment={selectedEquipment} onBack={() => setViewMode('list')} />
        ) : null}
      </div>
    </div>
  );
};

interface EquipmentDetailViewProps {
  equipment: DetailedEquipment;
  onBack: () => void;
}

const EquipmentDetailView: React.FC<EquipmentDetailViewProps> = ({ equipment, onBack }) => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
      >
        ← Back to List
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{equipment.name}</h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="font-medium">{equipment.category}</span>
            <span>→</span>
            <span>{equipment.subcategory}</span>
          </div>
        </div>

        {/* Identification */}
        {equipment.identification.howToIdentify.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Identification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {equipment.identification.howToIdentify.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">How to Identify</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {equipment.identification.howToIdentify.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {equipment.identification.typicalSizes !== 'Varies' && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Typical Sizes</h3>
                  <p className="text-gray-600">{equipment.identification.typicalSizes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Specifications */}
        {equipment.specifications.typicalEfficiency !== 'Varies' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Capacity Range</div>
                <div className="font-medium">{equipment.specifications.capacityRange}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Efficiency</div>
                <div className="font-medium">{equipment.specifications.typicalEfficiency}</div>
              </div>
              {equipment.specifications.powerRange && (
                <div>
                  <div className="text-sm text-gray-600">Power Range</div>
                  <div className="font-medium">{equipment.specifications.powerRange}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Replacement Logic */}
        {equipment.replacement.recommendedUpgrade !== 'Evaluate on case-by-case basis' && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Replacement & Upgrade</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-1">Recommended Upgrade</div>
                <div className="font-semibold text-gray-900">{equipment.replacement.recommendedUpgrade}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Priority</div>
                  <div className="font-medium">{equipment.replacement.priority}</div>
                </div>
                <div>
                  <div className="text-gray-600">Payback Period</div>
                  <div className="font-medium">{equipment.replacement.typicalPaybackYears}</div>
                </div>
                <div>
                  <div className="text-gray-600">Energy Savings</div>
                  <div className="font-medium">{equipment.replacement.energySavingsPercent}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-700">{equipment.replacement.upgradeReason}</div>
            </div>
          </section>
        )}

        {/* Best Practices */}
        {(equipment.bestPractices.maintenance.length > 0 || 
          equipment.bestPractices.optimization.length > 0) && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Best Practices</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {equipment.bestPractices.maintenance.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Maintenance</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {equipment.bestPractices.maintenance.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {equipment.bestPractices.optimization.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Optimization</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    {equipment.bestPractices.optimization.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

