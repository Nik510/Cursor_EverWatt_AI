import React, { useState } from 'react';
import { DocumentCard, type DocumentData } from '../components/DocumentCard';
import { logger } from '../services/logger';

export const TechnicalLibrary: React.FC = () => {
  const [documents] = useState<DocumentData[]>([
    {
      id: '1',
      title: 'Optimal Control Architectures for Battery-Based Peak Demand Management',
      tags: ['battery optimization', 'Training Material', 'peak shaving', 'MILP', 'reinforcement learning', 'demand charge'],
      description: 'Comprehensive technical report on fixing AI battery control systems that "shave all day" instead of targeting high-value peak intervals. Covers the physics and economics of peak shaving, advanced data engineering with Peak-Aware state space features, MILP and RL optimization frameworks, and degradation management strategies.',
      pinned: true,
    },
    {
      id: '2',
      title: 'Advanced Mathematical Architectures for Stochastic Energy Storage Optimization',
      tags: ['ai algorithms', 'Research Paper', 'informer', 'differentiable optimization', 'distributional RL', 'CVaR', 'risk-sensitive control'],
      description: 'Advanced mathematical report covering differentiable programming, probabilistic forecasting, and risk-sensitive reinforcement learning for battery peak shaving. Addresses non-convex demand tariffs, sparse gradient problems, and peak hopping phenomena using state-of-the-art ML architectures.',
      pinned: true,
    },
  ]);

  const handleDelete = (doc: DocumentData) => {
    if (confirm(`Are you sure you want to delete ${doc.title}?`)) {
      logger.info('Delete document requested', { id: doc.id });
    }
  };

  const handlePin = (doc: DocumentData) => {
    logger.info('Toggle pin requested', { id: doc.id });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Technical Library</h1>
          <p className="text-gray-600">Battery optimization training materials and research papers</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <span>📄</span>
            <span className="text-sm">{documents.length} documents</span>
          </div>
          <button className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 flex items-center gap-2">
            <span>❓</span>
            <span>Ask Questions</span>
          </button>
          <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center gap-2">
            <span>📤</span>
            <span>Upload Training Document</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search documents, tags, concepts..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>All Categories</option>
          <option>Technical Guide</option>
          <option>Research Paper</option>
          <option>Training Material</option>
        </select>
      </div>

      {/* Pinned Documents */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>⭐</span>
          <span>Pinned Documents</span>
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {documents.filter(doc => doc.pinned).map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>
      </div>

      {/* All Documents */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Documents</h2>
        <div className="grid grid-cols-1 gap-6">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

