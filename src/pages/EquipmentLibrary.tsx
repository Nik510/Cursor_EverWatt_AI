import React, { useEffect, useMemo, useState } from 'react';
import type { DetailedEquipment } from '../data/equipment/comprehensive-equipment-database';

export const EquipmentLibrary: React.FC = () => {
  const [equipment, setEquipment] = useState<DetailedEquipment[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<DetailedEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/library/equipment?limit=500');
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || `Failed to load equipment (${res.status})`);
        }
        if (!cancelled) setEquipment((data.equipment || []) as DetailedEquipment[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load equipment');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    equipment.forEach((e) => set.add(e.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [equipment]);

  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    if (selectedCategory !== 'all') {
      const cLower = selectedCategory.toLowerCase();
      filtered = filtered.filter((eq) => String(eq.category || '').toLowerCase() === cLower);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((eq) => {
        const name = String(eq.name || '').toLowerCase();
        const cat = String(eq.category || '').toLowerCase();
        const sub = String(eq.subcategory || '').toLowerCase();
        const manufacturers = Array.isArray(eq.identification?.typicalManufacturers)
          ? eq.identification.typicalManufacturers.join(' ').toLowerCase()
          : '';
        return name.includes(q) || cat.includes(q) || sub.includes(q) || manufacturers.includes(q);
      });
    }

    return filtered;
  }, [equipment, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-gray-600">Loading equipment library…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipment Library</h1>
        <p className="text-gray-600">Comprehensive database of HVAC, lighting, and energy equipment</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search equipment (name/category/manufacturer)…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((eq) => (
          <div
            key={eq.id}
            onClick={() => setSelectedEquipment(eq)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg cursor-pointer transition-shadow"
          >
            <div className="mb-3">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{eq.name}</h3>
              <p className="text-sm text-gray-500">
                {eq.category} • {eq.subcategory}
              </p>
            </div>

            {eq.specifications?.capacityRange && (
              <div className="mb-2">
                <span className="text-sm font-medium text-gray-700">Capacity: {eq.specifications.capacityRange}</span>
              </div>
            )}

            {eq.replacement?.energySavingsPercent && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Upgrade Potential</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-600">{eq.replacement.energySavingsPercent}</span>
                  <span className="text-xs text-gray-500">estimated savings</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No equipment found matching your criteria.</p>
        </div>
      )}

      {/* Equipment Detail Modal */}
      {selectedEquipment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEquipment(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEquipment.name}</h2>
                  <p className="text-gray-600">
                    {selectedEquipment.category} • {selectedEquipment.subcategory}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Identification */}
              {selectedEquipment.identification && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Identification</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedEquipment.identification.typicalSizes && (
                      <p className="text-sm text-gray-700">
                        <strong>Typical sizes:</strong> {selectedEquipment.identification.typicalSizes}
                      </p>
                    )}
                    {selectedEquipment.identification.typicalManufacturers?.length > 0 && (
                      <p className="text-sm text-gray-700">
                        <strong>Manufacturers:</strong> {selectedEquipment.identification.typicalManufacturers.join(', ')}
                      </p>
                    )}
                    {selectedEquipment.identification.howToIdentify?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">How to identify:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {selectedEquipment.identification.howToIdentify.slice(0, 12).map((cue, idx) => (
                            <li key={idx}>{cue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Specifications */}
              {selectedEquipment.specifications && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedEquipment.specifications.capacityRange && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Capacity Range</p>
                        <p className="text-sm font-bold text-blue-700">{selectedEquipment.specifications.capacityRange}</p>
                      </div>
                    )}
                    {selectedEquipment.specifications.typicalEfficiency && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Typical Efficiency</p>
                        <p className="text-sm font-bold text-green-700">{selectedEquipment.specifications.typicalEfficiency}</p>
                      </div>
                    )}
                    {selectedEquipment.specifications.operatingConditions && (
                      <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
                        <p className="text-xs text-gray-600 mb-1">Operating Conditions</p>
                        <p className="text-sm text-gray-700">{selectedEquipment.specifications.operatingConditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upgrade Recommendation */}
              {selectedEquipment.replacement && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Upgrade Recommendation</h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-gray-800">
                      <strong>Recommended:</strong> {selectedEquipment.replacement.recommendedUpgrade}
                    </p>
                    <p className="text-sm text-gray-800">
                      <strong>Why:</strong> {selectedEquipment.replacement.upgradeReason}
                    </p>
                    <p className="text-sm text-gray-800">
                      <strong>Priority:</strong> {selectedEquipment.replacement.priority}
                    </p>
                    <p className="text-sm text-gray-800">
                      <strong>Typical Payback:</strong> {selectedEquipment.replacement.typicalPaybackYears}
                    </p>
                    <p className="text-sm text-gray-800">
                      <strong>Estimated Savings:</strong> {selectedEquipment.replacement.energySavingsPercent}
                    </p>
                  </div>
                </div>
              )}

              {/* Best Practices */}
              {selectedEquipment.bestPractices && (
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Best Practices</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Maintenance</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {selectedEquipment.bestPractices.maintenance.slice(0, 8).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Optimization</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {selectedEquipment.bestPractices.optimization.slice(0, 8).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
