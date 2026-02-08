/**
 * ModuleDashboard Component
 * Visual grid of all EE training modules with progress tracking and quick stats
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Zap,
  BarChart3,
  Award,
  TrendingUp
} from 'lucide-react';
import { categoryThemes, type CategoryKey } from './theme';
import { KPIRing } from './widgets/KPIRing';

export interface ModuleProgress {
  moduleId: string;
  sectionsCompleted: number;
  totalSections: number;
  quizScore?: number;
  lastAccessed?: string;
}

export interface ModuleInfo {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  category: CategoryKey;
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  sectionsCount: number;
  measuresCount?: number;
  obfEligibleCount?: number;
}

export interface ModuleDashboardProps {
  modules: ModuleInfo[];
  progress?: ModuleProgress[];
  onModuleClick?: (moduleId: string) => void;
  showSearch?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
  className?: string;
}

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-emerald-100 text-emerald-700' },
  intermediate: { label: 'Intermediate', color: 'bg-amber-100 text-amber-700' },
  advanced: { label: 'Advanced', color: 'bg-red-100 text-red-700' },
};

const ModuleCard: React.FC<{
  module: ModuleInfo;
  progress?: ModuleProgress;
  onClick?: () => void;
}> = ({ module, progress, onClick }) => {
  const theme = categoryThemes[module.category] || categoryThemes.cooling;
  const difficulty = difficultyConfig[module.difficulty];
  
  const completionPercent = progress 
    ? Math.round((progress.sectionsCompleted / progress.totalSections) * 100)
    : 0;
  
  const isCompleted = completionPercent === 100;
  
  return (
    <div 
      onClick={onClick}
      className={`
        group relative bg-white rounded-2xl border overflow-hidden cursor-pointer
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        ${isCompleted ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'}
      `}
    >
      {/* Gradient header */}
      <div className={`h-2 bg-gradient-to-r ${theme.gradient}`} />
      
      {/* Completion badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className="p-5">
        {/* Icon and category */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
            {module.icon}
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-medium uppercase tracking-wider ${theme.textPrimary}`}>
              {theme.name}
            </span>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mt-0.5">
              {module.title}
            </h3>
          </div>
        </div>
        
        {/* Description */}
        {module.subtitle && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {module.subtitle}
          </p>
        )}
        
        {/* Metadata */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
            {difficulty.label}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {module.estimatedTime} min
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {module.sectionsCount} sections
          </span>
        </div>
        
        {/* Progress bar */}
        {progress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className={`font-semibold ${isCompleted ? 'text-emerald-600' : 'text-gray-700'}`}>
                {completionPercent}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted 
                    ? 'bg-emerald-500' 
                    : `bg-gradient-to-r ${theme.gradient}`
                }`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        )}
        
        {/* OBF indicator */}
        {module.obfEligibleCount !== undefined && module.obfEligibleCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle className="w-3 h-3" />
            <span>{module.obfEligibleCount} OBF-eligible measures</span>
          </div>
        )}
        
        {/* Start/Continue button */}
        <button className={`
          mt-4 w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2
          transition-all duration-200
          ${isCompleted 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
            : `bg-gradient-to-r ${theme.gradient} text-white shadow-md hover:shadow-lg`
          }
        `}>
          {isCompleted ? 'Review' : progress && progress.sectionsCompleted > 0 ? 'Continue' : 'Start Learning'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({
  modules,
  progress = [],
  onModuleClick,
  showSearch = true,
  showFilters = true,
  showStats = true,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  
  // Calculate overall stats
  const stats = useMemo(() => {
    const totalSections = modules.reduce((sum, m) => sum + m.sectionsCount, 0);
    const completedSections = progress.reduce((sum, p) => sum + p.sectionsCompleted, 0);
    const totalModules = modules.length;
    const completedModules = progress.filter(p => 
      p.sectionsCompleted === p.totalSections
    ).length;
    const totalTime = modules.reduce((sum, m) => sum + m.estimatedTime, 0);
    const avgQuizScore = progress.filter(p => p.quizScore !== undefined).length > 0
      ? Math.round(progress.filter(p => p.quizScore !== undefined).reduce((sum, p) => sum + (p.quizScore || 0), 0) / progress.filter(p => p.quizScore !== undefined).length)
      : 0;
    
    return {
      totalSections,
      completedSections,
      totalModules,
      completedModules,
      totalTime,
      avgQuizScore,
      overallProgress: totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0,
    };
  }, [modules, progress]);
  
  // Filter modules
  const filteredModules = useMemo(() => {
    return modules.filter(module => {
      const matchesSearch = searchTerm === '' || 
        module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.subtitle?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || module.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === 'all' || module.difficulty === difficultyFilter;
      
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [modules, searchTerm, categoryFilter, difficultyFilter]);
  
  const getModuleProgress = (moduleId: string) => {
    return progress.find(p => p.moduleId === moduleId);
  };
  
  return (
    <div className={`${className}`}>
      {/* Header with stats */}
      {showStats && (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">EE Training Modules</h1>
              <p className="text-white/80">
                Master energy efficiency across {stats.totalModules} categories and {stats.totalSections} lessons
              </p>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <KPIRing 
                  value={stats.overallProgress} 
                  label="Overall" 
                  size="sm" 
                  color="green"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <BookOpen className="w-3 h-3" />
                    Modules
                  </div>
                  <div className="text-xl font-bold">{stats.completedModules}/{stats.totalModules}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                    <Clock className="w-3 h-3" />
                    Total Time
                  </div>
                  <div className="text-xl font-bold">{Math.round(stats.totalTime / 60)}h {stats.totalTime % 60}m</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick stats row */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSections}</div>
              <div className="text-sm text-gray-500">Total Lessons</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completedSections}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.avgQuizScore || '-'}%</div>
              <div className="text-sm text-gray-500">Avg Quiz Score</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.overallProgress}%</div>
              <div className="text-sm text-gray-500">Progress</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Search and filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {showFilters && (
            <div className="flex gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryKey | 'all')}
                className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {Object.values(categoryThemes).map(theme => (
                  <option key={theme.id} value={theme.id}>{theme.icon} {theme.name}</option>
                ))}
              </select>
              
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          )}
        </div>
      )}
      
      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredModules.map(module => (
          <ModuleCard
            key={module.id}
            module={module}
            progress={getModuleProgress(module.id)}
            onClick={() => onModuleClick?.(module.id)}
          />
        ))}
      </div>
      
      {filteredModules.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No modules found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default ModuleDashboard;
