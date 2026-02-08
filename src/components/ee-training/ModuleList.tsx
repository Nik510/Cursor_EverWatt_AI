/**
 * Module List Component
 * Displays all available training modules with filtering and search
 */

import React from 'react';
import { Search, Filter, Clock, BookOpen } from 'lucide-react';
import type { TrainingModule, ModuleCategory } from '../../backend/ee-training/types';

interface ModuleListProps {
  modules: TrainingModule[];
  categories: ModuleCategory[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onModuleSelect: (moduleId: string) => void;
}

export const ModuleList: React.FC<ModuleListProps> = ({
  modules,
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  onModuleSelect,
}) => {
  return (
    <div className="h-full flex">
      {/* Sidebar - Categories & Filters */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Categories
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => onCategoryChange(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Modules ({modules.length})
            </button>
            {categories.map(category => {
              const categoryModules = modules.filter(m => m.category === category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => onCategoryChange(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name} ({categoryModules.length})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Module Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Module Grid */}
        {modules.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No modules found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map(module => (
              <ModuleCard
                key={module.id}
                module={module}
                onClick={() => onModuleSelect(module.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ModuleCardProps {
  module: TrainingModule;
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick }) => {
  const statusColors = {
    published: 'bg-green-100 text-green-700',
    draft: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-700',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{module.icon || '📚'}</div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[module.status]}`}>
          {module.status}
        </span>
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">{module.title}</h3>
      {module.subtitle && (
        <p className="text-sm text-gray-600 mb-3">{module.subtitle}</p>
      )}
      
      {module.description && (
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">{module.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {module.metadata?.estimatedTime && (
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{module.metadata.estimatedTime} min</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span>{module.sections.length} sections</span>
        </div>
      </div>

      {module.metadata?.tags && module.metadata.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {module.metadata.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
