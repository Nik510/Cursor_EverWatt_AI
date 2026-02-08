/**
 * MeasureExplorer Component
 * Filterable, searchable list of all EE measures with OBF filter
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Download, 
  SortAsc, 
  SortDesc,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { categoryThemes, type CategoryKey } from './theme';
import { OBFBadge } from './obf/OBFBadge';
import { OBFFilter, OBFFilterValue } from './obf/OBFFilter';

export interface EEMeasure {
  id: string;
  name: string;
  category: CategoryKey;
  subcategory?: string;
  description?: string;
  savingsRange?: {
    min: number;
    max: number;
    unit: 'percent' | 'kWh' | 'therms' | 'dollars';
  };
  paybackRange?: {
    min: number;
    max: number;
    unit: 'years' | 'months';
  };
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  obfEligible: boolean;
  obfConditional?: boolean;
  obfNotes?: string;
  tags?: string[];
  popularity?: number; // 1-100
}

export interface MeasureExplorerProps {
  measures: EEMeasure[];
  onMeasureClick?: (measure: EEMeasure) => void;
  onExport?: (measures: EEMeasure[]) => void;
  showExport?: boolean;
  className?: string;
}

type SortField = 'name' | 'savings' | 'payback' | 'popularity';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-emerald-100 text-emerald-700', order: 1 },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', order: 2 },
  hard: { label: 'Hard', color: 'bg-orange-100 text-orange-700', order: 3 },
  expert: { label: 'Expert', color: 'bg-red-100 text-red-700', order: 4 },
};

const formatSavings = (range?: EEMeasure['savingsRange']): string => {
  if (!range) return '-';
  const unit = range.unit === 'percent' ? '%' : 
               range.unit === 'dollars' ? '' : ` ${range.unit}`;
  const prefix = range.unit === 'dollars' ? '$' : '';
  if (range.min === range.max) return `${prefix}${range.min}${unit}`;
  return `${prefix}${range.min}-${range.max}${unit}`;
};

const formatPayback = (range?: EEMeasure['paybackRange']): string => {
  if (!range) return '-';
  const unit = range.unit === 'years' ? ' yr' : ' mo';
  if (range.min === range.max) return `${range.min}${unit}`;
  return `${range.min}-${range.max}${unit}`;
};

const MeasureCard: React.FC<{
  measure: EEMeasure;
  onClick?: () => void;
}> = ({ measure, onClick }) => {
  const theme = categoryThemes[measure.category] || categoryThemes.cooling;
  const difficulty = measure.difficulty ? difficultyConfig[measure.difficulty] : null;
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg`}>
            {theme.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 line-clamp-1">{measure.name}</h4>
            <span className={`text-xs ${theme.textSecondary}`}>{theme.name}</span>
          </div>
        </div>
        <OBFBadge 
          eligible={measure.obfEligible} 
          conditional={measure.obfConditional}
          size="sm"
          showLabel={false}
        />
      </div>
      
      {/* Description */}
      {measure.description && (
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{measure.description}</p>
      )}
      
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Zap className="w-3 h-3" />
            Savings
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {formatSavings(measure.savingsRange)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Clock className="w-3 h-3" />
            Payback
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {formatPayback(measure.paybackRange)}
          </div>
        </div>
      </div>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {difficulty && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficulty.color}`}>
            {difficulty.label}
          </span>
        )}
        {measure.tags?.slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

const MeasureRow: React.FC<{
  measure: EEMeasure;
  onClick?: () => void;
}> = ({ measure, onClick }) => {
  const theme = categoryThemes[measure.category] || categoryThemes.cooling;
  const difficulty = measure.difficulty ? difficultyConfig[measure.difficulty] : null;
  
  return (
    <tr 
      onClick={onClick}
      className="hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-0"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-sm`}>
            {theme.icon}
          </div>
          <div>
            <div className="font-medium text-gray-900">{measure.name}</div>
            <div className={`text-xs ${theme.textSecondary}`}>{theme.name}</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-gray-600">{formatSavings(measure.savingsRange)}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-gray-600">{formatPayback(measure.paybackRange)}</span>
      </td>
      <td className="py-3 px-4">
        {difficulty && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${difficulty.color}`}>
            {difficulty.label}
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <OBFBadge 
          eligible={measure.obfEligible} 
          conditional={measure.obfConditional}
          size="sm"
        />
      </td>
      <td className="py-3 px-4">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </td>
    </tr>
  );
};

export const MeasureExplorer: React.FC<MeasureExplorerProps> = ({
  measures,
  onMeasureClick,
  onExport,
  showExport = true,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'all'>('all');
  const [obfFilter, setObfFilter] = useState<OBFFilterValue>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Count measures by OBF status
  const obfCounts = useMemo(() => {
    return {
      all: measures.length,
      eligible: measures.filter(m => m.obfEligible && !m.obfConditional).length,
      notEligible: measures.filter(m => !m.obfEligible && !m.obfConditional).length,
      conditional: measures.filter(m => m.obfConditional).length,
    };
  }, [measures]);
  
  // Filter and sort measures
  const filteredMeasures = useMemo(() => {
    let result = measures.filter(measure => {
      // Search
      const matchesSearch = searchTerm === '' || 
        measure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        measure.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        measure.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category
      const matchesCategory = categoryFilter === 'all' || measure.category === categoryFilter;
      
      // OBF
      let matchesOBF = true;
      if (obfFilter === 'eligible') matchesOBF = measure.obfEligible && !measure.obfConditional;
      if (obfFilter === 'not-eligible') matchesOBF = !measure.obfEligible && !measure.obfConditional;
      if (obfFilter === 'conditional') matchesOBF = !!measure.obfConditional;
      
      // Difficulty
      const matchesDifficulty = difficultyFilter === 'all' || measure.difficulty === difficultyFilter;
      
      return matchesSearch && matchesCategory && matchesOBF && matchesDifficulty;
    });
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'savings':
          comparison = (a.savingsRange?.max || 0) - (b.savingsRange?.max || 0);
          break;
        case 'payback':
          comparison = (a.paybackRange?.min || 999) - (b.paybackRange?.min || 999);
          break;
        case 'popularity':
          comparison = (b.popularity || 0) - (a.popularity || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [measures, searchTerm, categoryFilter, obfFilter, difficultyFilter, sortField, sortDirection]);
  
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const SortIcon = sortDirection === 'asc' ? SortAsc : SortDesc;
  
  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Measure Explorer</h2>
          <p className="text-gray-500">
            Browse {measures.length} energy efficiency measures across all categories
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* Export */}
          {showExport && onExport && (
            <button 
              onClick={() => onExport(filteredMeasures)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>
      
      {/* Search and quick filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search measures..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Quick filters */}
          <div className="flex gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryKey | 'all')}
              className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.values(categoryThemes).map(theme => (
                <option key={theme.id} value={theme.id}>{theme.icon} {theme.name}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <OBFFilter
              value={obfFilter}
              onChange={setObfFilter}
              showCounts
              counts={obfCounts}
            />
            
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                Difficulty
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setDifficultyFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    difficultyFilter === 'all' 
                      ? 'bg-blue-100 text-blue-700 ring-2 ring-offset-1 ring-blue-500'
                      : 'bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                {Object.entries(difficultyConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setDifficultyFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      difficultyFilter === key 
                        ? `${config.color} ring-2 ring-offset-1 ring-blue-500`
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Results count and sort */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          Showing <strong>{filteredMeasures.length}</strong> of {measures.length} measures
        </span>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <div className="flex gap-1">
            {(['name', 'savings', 'payback', 'popularity'] as SortField[]).map(field => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                  sortField === field 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && <SortIcon className="w-3 h-3" />}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Results */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMeasures.map(measure => (
            <MeasureCard
              key={measure.id}
              measure={measure}
              onClick={() => onMeasureClick?.(measure)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Measure</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Savings</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Payback</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">OBF</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMeasures.map(measure => (
                <MeasureRow
                  key={measure.id}
                  measure={measure}
                  onClick={() => onMeasureClick?.(measure)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {filteredMeasures.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No measures found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default MeasureExplorer;
