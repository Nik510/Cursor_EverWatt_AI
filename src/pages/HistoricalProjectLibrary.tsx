import React, { useState } from 'react';

export const HistoricalProjectLibrary: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All', icon: '🔍', count: 0 },
    { id: 'battery', label: 'Battery', icon: '🔋', count: 0 },
    { id: 'hvac', label: 'HVAC', icon: '❄️', count: 0 },
    { id: 'lighting', label: 'Lighting', icon: '💡', count: 0 },
    { id: 'ev', label: 'EV', icon: '🚗', count: 0 },
    { id: 'multi-tech', label: 'Multi-Tech', icon: '🔧', count: 0 },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Historical Project Library</h1>
        <p className="text-gray-600">Import completed projects with full energy data to train the AI calculator</p>
      </div>

      {/* Enhanced CSV Template Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📄</span>
          <h2 className="text-xl font-bold text-gray-900">Enhanced CSV Template - Now with Full Energy Data!</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* New Enhanced Features */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">New Enhanced Features</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Smart Address Processing: Enter full address, AI determines climate zone automatically!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Complete Energy Data: Baseline & post-project kWh and Therms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Annual Savings: Track kWh, Therms, and kW reduction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Building Details: Square footage and facility characteristics</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Multi-Tech Support: Up to 3 technologies per project</span>
              </li>
            </ul>
          </div>

          {/* Address Format & Examples */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Address Format</h3>
            <p className="text-sm text-gray-700 mb-4">
              Enter full California addresses like: <code className="bg-white px-2 py-1 rounded">"1234 Market St, San Jose, CA 95113"</code>
            </p>
            <p className="text-sm text-gray-700 mb-4">
              Leave climate zone column empty - AI will determine it from the address!
            </p>

            <h3 className="font-semibold text-gray-900 mb-3">Example Projects Included</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Multi-tech HVAC + Lighting with full address and energy data</li>
              <li>• Single-tech Battery Storage with location details</li>
            </ul>
          </div>
        </div>

        {/* Technology Types Supported */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Technology Types Supported</h3>
          <div className="flex flex-wrap gap-2">
            {['battery storage', 'lighting', 'solar', 'building envelope', 'hvac', 'ev_charging', 'water heating', 'multi tech'].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-white rounded text-sm text-gray-700 border border-yellow-200">
                {tech}
              </span>
            ))}
          </div>
        </div>

        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <span>📥</span>
          <span>Download Enhanced CSV Template</span>
        </button>
      </div>

      {/* Project Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Search and Actions */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search historical projects..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
          <button className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
            <span>➕</span>
            <span>Add Single Project</span>
          </button>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span>📤</span>
            <span>Bulk Import File</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 border-b-2 transition-colors flex items-center gap-2 ${
                activeFilter === filter.id
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                ({filter.count})
              </span>
            </button>
          ))}
        </div>

        {/* Empty State */}
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No projects found</p>
          <p className="text-sm">Import your first project to get started</p>
        </div>
      </div>
    </div>
  );
};

