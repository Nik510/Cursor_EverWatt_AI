/**
 * Industry Sidebar Component
 * Displays industry types as a standalone sidebar, similar to the module sidebar
 */

import React from 'react';
import { Building2, Search } from 'lucide-react';

export interface Industry {
  id: string;
  title: string;
  description: string;
  icon: string;
  sectionId: string; // ID of the section in industry-specific module
}

const INDUSTRIES: Industry[] = [
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    description: 'Compressed air, process heating, motors, steam systems',
    icon: '⚙️',
    sectionId: 'manufacturing',
  },
  {
    id: 'healthcare',
    title: 'Healthcare',
    description: 'HVAC load, 24/7 operations, strict environmental controls',
    icon: '🏥',
    sectionId: 'healthcare',
  },
  {
    id: 'retail',
    title: 'Retail',
    description: 'Lighting, HVAC, refrigeration, plug loads, long hours',
    icon: '🛍️',
    sectionId: 'retail',
  },
  {
    id: 'office',
    title: 'Office Buildings',
    description: 'HVAC, lighting, plug loads, building envelope',
    icon: '🏢',
    sectionId: 'office',
  },
  {
    id: 'warehouse',
    title: 'Warehouses',
    description: 'High-bay lighting, minimal HVAC, dock doors',
    icon: '📦',
    sectionId: 'warehouse',
  },
  {
    id: 'data-center',
    title: 'Data Centers',
    description: 'CRAC units, UPS systems, IT load, cooling efficiency',
    icon: '💻',
    sectionId: 'data-center',
  },
  {
    id: 'hospitality',
    title: 'Hospitality',
    description: 'Guest room HVAC, kitchens, laundry, pools/spas',
    icon: '🏨',
    sectionId: 'hospitality',
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Classroom HVAC, gymnasium lighting, cafeterias',
    icon: '🎓',
    sectionId: 'education',
  },
  {
    id: 'food-service',
    title: 'Food Service',
    description: 'Commercial kitchens, refrigeration, HVAC, hot water',
    icon: '🍽️',
    sectionId: 'food-service',
  },
];

export interface IndustrySidebarProps {
  selectedIndustryId: string | null;
  onIndustrySelect: (industryId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const IndustrySidebar: React.FC<IndustrySidebarProps> = ({
  selectedIndustryId,
  onIndustrySelect,
  searchQuery = '',
  onSearchChange,
}) => {
  const filteredIndustries = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return INDUSTRIES;
    return INDUSTRIES.filter((industry) => {
      const hay = `${industry.title} ${industry.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [searchQuery]);

  return (
    <div className="w-80 bg-white border-r border-slate-200 overflow-y-auto">
      <div className="p-5 border-b border-slate-200">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Industry Types
        </div>
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search industries..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        {filteredIndustries.map((industry) => {
          const isActive = industry.id === selectedIndustryId;
          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => onIndustrySelect(industry.id)}
              className={[
                'w-full text-left px-4 py-3 rounded-2xl border transition-all',
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-transparent shadow-md'
                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${
                  isActive ? 'bg-white/15' : 'bg-gradient-to-br from-indigo-600 to-pink-600 text-white'
                }`}>
                  {industry.icon}
                </div>
                <div className="min-w-0">
                  <div
                    title={industry.title}
                    className={`font-extrabold tracking-tight leading-snug ${isActive ? 'text-white' : 'text-slate-900'} line-clamp-1`}
                  >
                    {industry.title}
                  </div>
                  <div
                    title={industry.description}
                    className={`text-xs leading-snug ${isActive ? 'text-white/85' : 'text-slate-600'} line-clamp-2 mt-1`}
                  >
                    {industry.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {filteredIndustries.length === 0 && (
          <div className="text-sm text-slate-500 p-4">
            No industries match your search.
          </div>
        )}
      </div>
    </div>
  );
};

