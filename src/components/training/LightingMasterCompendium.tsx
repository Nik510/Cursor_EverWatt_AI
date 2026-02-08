/**
 * Lighting Master Compendium Browser
 * Complete interface for browsing all bulb types, replacement logic, and best practices
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, Lightbulb, TrendingUp, AlertCircle, CheckCircle, Image as ImageIcon, Download } from 'lucide-react';
import { LightingDatabase, type BulbType } from '../../data/lighting';
import type { BestPracticeCategory } from '../../data/lighting/best-practices';

export const LightingMasterCompendium: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBulb, setSelectedBulb] = useState<BulbType | null>(null);
  const [selectedPractice, setSelectedPractice] = useState<BestPracticeCategory | null>(null);
  const [viewMode, setViewMode] = useState<'browse' | 'best-practices' | 'replacement-logic'>('browse');

  const categories = LightingDatabase.stats.categories;
  const allBulbs = LightingDatabase.allBulbTypes;

  // Filter bulbs based on search and category
  const filteredBulbs = useMemo(() => {
    let filtered = allBulbs;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(b => b.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(search) ||
        b.commonNames.some(name => name.toLowerCase().includes(search)) ||
        b.subcategory.toLowerCase().includes(search) ||
        b.identification.physicalCharacteristics.some(char => char.toLowerCase().includes(search))
      );
    }

    return filtered;
  }, [searchTerm, selectedCategory, allBulbs]);

  // Get replacement recommendation
  const getReplacementInfo = (bulb: BulbType) => {
    const recommendation = LightingDatabase.getReplacementRecommendation(bulb.id);
    return recommendation || {
      currentBulbType: bulb,
      recommendedReplacement: bulb,
      priority: bulb.replacement.replacementPriority,
      reasoning: bulb.replacement.replacementReason,
      paybackYears: bulb.replacement.typicalPaybackYears,
      energySavingsPercent: bulb.replacement.energySavingsPercent,
      whenToReplace: [],
      notes: bulb.replacement.notes,
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Keep': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'incandescent': return 'bg-red-50 border-red-200';
      case 'halogen': return 'bg-orange-50 border-orange-200';
      case 'fluorescent': return 'bg-yellow-50 border-yellow-200';
      case 'led': return 'bg-green-50 border-green-200';
      case 'hid': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Lightbulb className="w-10 h-10 text-yellow-500" />
          Lighting Master Compendium
        </h1>
        <p className="text-lg text-gray-600">
          Complete reference for lighting auditors, sales professionals, and engineers.
          {LightingDatabase.stats.totalBulbTypes} bulb types documented with identification guides, replacement logic, and best practices.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setViewMode('browse')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'browse'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Browse Bulb Types ({filteredBulbs.length})
        </button>
        <button
          onClick={() => setViewMode('best-practices')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'best-practices'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Best Practices
        </button>
        <button
          onClick={() => setViewMode('replacement-logic')}
          className={`px-4 py-2 font-medium transition-colors ${
            viewMode === 'replacement-logic'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Replacement Logic
        </button>
      </div>

      {/* Browse View */}
      {viewMode === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search bulb types..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)} ({allBulbs.filter(b => b.category === cat).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stats */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Showing {filteredBulbs.length} of {allBulbs.length} bulb types
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedBulb ? (
              /* Bulb Detail View */
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <button
                  onClick={() => setSelectedBulb(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
                >
                  ← Back to list
                </button>

                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedBulb.name}</h2>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(selectedBulb.category)}`}>
                          {selectedBulb.category.charAt(0).toUpperCase() + selectedBulb.category.slice(1)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(selectedBulb.replacement.replacementPriority)}`}>
                          {selectedBulb.replacement.replacementPriority} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">
                    <strong>Also known as:</strong> {selectedBulb.commonNames.join(', ')}
                  </p>
                </div>

                {/* Images */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {selectedBulb.images.bulbImage && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="aspect-square bg-white rounded flex items-center justify-center mb-2">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 text-center">Bulb Image</p>
                      <p className="text-xs text-gray-500 text-center">{selectedBulb.images.bulbImage}</p>
                    </div>
                  )}
                  {selectedBulb.images.fixtureImage && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="aspect-square bg-white rounded flex items-center justify-center mb-2">
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 text-center">Fixture Image</p>
                    </div>
                  )}
                </div>

                {/* Identification Guide */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Identification Guide</h3>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Physical Characteristics</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                      {selectedBulb.identification.physicalCharacteristics.map((char, i) => (
                        <li key={i}>{char}</li>
                      ))}
                    </ul>

                    <h4 className="font-semibold text-gray-900 mb-2">How to Identify</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
                      {selectedBulb.identification.howToIdentify.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Base Types</p>
                        <p className="text-sm text-gray-600">{selectedBulb.identification.baseTypes.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Size/Dimensions</p>
                        <p className="text-sm text-gray-600">{selectedBulb.identification.sizeDimensions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specifications */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Technical Specifications</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Wattage Range</p>
                      <p className="font-semibold text-gray-900">{selectedBulb.specifications.wattageRange}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Efficiency</p>
                      <p className="font-semibold text-gray-900">{selectedBulb.specifications.lumensPerWatt}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Lifespan</p>
                      <p className="font-semibold text-gray-900">{selectedBulb.specifications.lifespanHours}</p>
                    </div>
                    {selectedBulb.specifications.colorTemperatureRange && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Color Temp</p>
                        <p className="font-semibold text-gray-900">{selectedBulb.specifications.colorTemperatureRange}</p>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Dimmable</p>
                      <p className="font-semibold text-gray-900">{selectedBulb.specifications.dimmability}</p>
                    </div>
                  </div>
                </div>

                {/* Applications */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Typical Applications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Locations</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {selectedBulb.applications.typicalLocations.map((loc, i) => (
                          <li key={i}>{loc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Use Cases</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {selectedBulb.applications.typicalUseCases.map((use, i) => (
                          <li key={i}>{use}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Replacement Recommendation */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Replacement Recommendation
                  </h3>
                  <div className={`rounded-lg p-6 border-2 ${getPriorityColor(selectedBulb.replacement.replacementPriority)}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-lg mb-2">Replace with: {selectedBulb.replacement.recommendedReplacement}</h4>
                        <p className="text-sm mb-4">{selectedBulb.replacement.replacementReason}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Energy Savings</p>
                        <p className="text-2xl font-bold text-green-600">{selectedBulb.replacement.energySavingsPercent}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Payback Period</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedBulb.replacement.typicalPaybackYears}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Priority</p>
                        <p className="text-2xl font-bold">{selectedBulb.replacement.replacementPriority}</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">When to Replace</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {Object.values(selectedBulb.replacement.whenToReplace).filter(v => v).map((condition, i) => (
                          <li key={i}>{condition}</li>
                        ))}
                      </ul>
                    </div>

                    {selectedBulb.replacement.notes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <h5 className="font-semibold text-gray-900 mb-2">Additional Notes</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {selectedBulb.replacement.notes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Best Practices */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Best Practices</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Maintenance</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {selectedBulb.bestPractices.maintenance.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Optimization</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {selectedBulb.bestPractices.optimization.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {selectedBulb.bestPractices.commonIssues.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          Common Issues
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {selectedBulb.bestPractices.commonIssues.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedBulb.bestPractices.troubleshooting.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Troubleshooting</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {selectedBulb.bestPractices.troubleshooting.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Bulb List View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBulbs.map((bulb) => {
                  const replacement = getReplacementInfo(bulb);
                  return (
                    <div
                      key={bulb.id}
                      onClick={() => setSelectedBulb(bulb)}
                      className={`bg-white rounded-xl border-2 cursor-pointer hover:border-blue-400 transition-all p-4 ${getCategoryColor(bulb.category)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{bulb.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{bulb.subcategory}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(bulb.replacement.replacementPriority)}`}>
                              {bulb.replacement.replacementPriority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Wattage:</span>
                          <span className="font-semibold text-gray-900">{bulb.specifications.wattageRange}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Efficiency:</span>
                          <span className="font-semibold text-gray-900">{bulb.specifications.lumensPerWatt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Savings:</span>
                          <span className="font-semibold text-green-600">{bulb.replacement.energySavingsPercent}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <strong>Replace with:</strong> {bulb.replacement.recommendedReplacement}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredBulbs.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No bulb types found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Best Practices View */}
      {viewMode === 'best-practices' && (
        <div className="space-y-6">
          {selectedPractice ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <button
                onClick={() => setSelectedPractice(null)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
              >
                ← Back to list
              </button>

              <h2 className="text-3xl font-bold text-gray-900 mb-6">{selectedPractice.title}</h2>

              {selectedPractice.sections.map((section, idx) => (
                <div key={idx} className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">{section.heading}</h3>
                  <p className="text-gray-700 mb-4">{section.content}</p>

                  {section.items && (
                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                      {section.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {section.engineerNotes && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2">Engineer Notes</h4>
                        <p className="text-sm text-blue-800">{section.engineerNotes}</p>
                      </div>
                    )}
                    {section.salesNotes && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-2">Sales Notes</h4>
                        <p className="text-sm text-green-800">{section.salesNotes}</p>
                      </div>
                    )}
                    {section.auditorNotes && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">Auditor Notes</h4>
                        <p className="text-sm text-purple-800">{section.auditorNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LightingDatabase.bestPractices.map((practice) => (
                <div
                  key={practice.category}
                  onClick={() => setSelectedPractice(practice)}
                  className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 cursor-pointer transition-all p-6"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{practice.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{practice.sections.length} sections</p>
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    View details →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Replacement Logic View */}
      {viewMode === 'replacement-logic' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Replacement Logic & Company Rules</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Company-Specific Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Minimum Efficiency Thresholds</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>LED: {LightingDatabase.companyRules.minimumEfficiency.led} lm/W minimum</li>
                    <li>Fluorescent: {LightingDatabase.companyRules.minimumEfficiency.fluorescent} lm/W minimum</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Payback Thresholds</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>Critical: &lt; {LightingDatabase.companyRules.paybackThresholds.critical} years</li>
                    <li>High: &lt; {LightingDatabase.companyRules.paybackThresholds.high} years</li>
                    <li>Medium: &lt; {LightingDatabase.companyRules.paybackThresholds.medium} years</li>
                    <li>Low: &lt; {LightingDatabase.companyRules.paybackThresholds.low} years</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Preferred Vendors</h4>
                  <div className="text-sm text-gray-700">
                    <p className="mb-1">LED: {LightingDatabase.companyRules.preferredVendors.led.join(', ')}</p>
                    <p>Fixtures: {LightingDatabase.companyRules.preferredVendors.fixtures.join(', ')}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Company Notes</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>{LightingDatabase.companyRules.companyNotes.general}</li>
                    <li>{LightingDatabase.companyRules.companyNotes.warranty}</li>
                    <li>{LightingDatabase.companyRules.companyNotes.controls}</li>
                    <li>{LightingDatabase.companyRules.companyNotes.rebates}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How Replacement Logic Works</h3>
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <p className="text-gray-700 mb-4">
                  The replacement logic engine evaluates multiple factors to determine replacement priority:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li><strong>Bulb Type:</strong> Old inefficient technologies (incandescent, T12) get Critical priority</li>
                  <li><strong>Operating Hours:</strong> High-hours applications (&gt;4000 hrs/year) increase priority</li>
                  <li><strong>Energy Cost:</strong> Higher energy costs reduce payback period</li>
                  <li><strong>Fixture Condition:</strong> Poor condition may warrant fixture replacement vs retrofit</li>
                  <li><strong>Application Type:</strong> Warehouse/high-bay gets higher priority than decorative</li>
                </ul>
                <p className="text-gray-700 mt-4">
                  <strong>Note:</strong> These rules can be customized in <code className="bg-white px-2 py-1 rounded text-sm">src/data/lighting/replacement-logic.ts</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

