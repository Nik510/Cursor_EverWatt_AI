/**
 * Category Filter Component
 * Reusable category filter for training content
 */

import React from 'react';
import { Filter } from 'lucide-react';

export type TrainingCategory = 'all' | 'battery' | 'hvac' | 'lighting' | 'measures' | 'ev-charging' | 'demand-response' | 'general';

interface CategoryFilterProps {
  value: TrainingCategory;
  onChange: (category: TrainingCategory) => void;
}

const categoryLabels: Record<TrainingCategory, string> = {
  all: 'All Categories',
  battery: 'Battery Storage',
  hvac: 'HVAC',
  lighting: 'Lighting',
  measures: 'Energy Measures',
  'ev-charging': 'EV Charging',
  'demand-response': 'Demand Response',
  general: 'General',
};

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ value, onChange }) => {
  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TrainingCategory)}
        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
      >
        {Object.entries(categoryLabels).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
};

