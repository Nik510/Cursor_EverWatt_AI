/**
 * EE Training Theme System
 * Category-specific color palettes for consistent visual styling
 */

export type CategoryKey = 
  | 'cooling'
  | 'heating'
  | 'ventilation'
  | 'controls'
  | 'electrification'
  | 'motors'
  | 'datacenter'
  | 'plugload';

export interface CategoryTheme {
  id: CategoryKey;
  name: string;
  icon: string;
  primary: string;
  secondary: string;
  accent: string;
  gradient: string;
  lightBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}

export const categoryThemes: Record<CategoryKey, CategoryTheme> = {
  cooling: {
    id: 'cooling',
    name: 'Cooling Systems',
    icon: '❄️',
    primary: '#3B82F6',     // Blue-500
    secondary: '#06B6D4',   // Cyan-500
    accent: '#6366F1',      // Indigo-500
    gradient: 'from-blue-500 via-cyan-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    border: 'border-blue-200',
    textPrimary: 'text-blue-600',
    textSecondary: 'text-blue-500',
  },
  heating: {
    id: 'heating',
    name: 'Heating Systems',
    icon: '🔥',
    primary: '#F97316',     // Orange-500
    secondary: '#EF4444',   // Red-500
    accent: '#F59E0B',      // Amber-500
    gradient: 'from-orange-500 via-red-500 to-amber-500',
    lightBg: 'bg-orange-50',
    border: 'border-orange-200',
    textPrimary: 'text-orange-600',
    textSecondary: 'text-orange-500',
  },
  ventilation: {
    id: 'ventilation',
    name: 'Air Distribution & Ventilation',
    icon: '💨',
    primary: '#14B8A6',     // Teal-500
    secondary: '#22C55E',   // Green-500
    accent: '#10B981',      // Emerald-500
    gradient: 'from-teal-500 via-green-500 to-emerald-500',
    lightBg: 'bg-teal-50',
    border: 'border-teal-200',
    textPrimary: 'text-teal-600',
    textSecondary: 'text-teal-500',
  },
  controls: {
    id: 'controls',
    name: 'HVAC Controls',
    icon: '🎛️',
    primary: '#A855F7',     // Purple-500
    secondary: '#8B5CF6',   // Violet-500
    accent: '#D946EF',      // Fuchsia-500
    gradient: 'from-purple-500 via-violet-500 to-fuchsia-500',
    lightBg: 'bg-purple-50',
    border: 'border-purple-200',
    textPrimary: 'text-purple-600',
    textSecondary: 'text-purple-500',
  },
  electrification: {
    id: 'electrification',
    name: 'Electrification Measures',
    icon: '⚡',
    primary: '#EAB308',     // Yellow-500
    secondary: '#84CC16',   // Lime-500
    accent: '#22C55E',      // Green-500
    gradient: 'from-yellow-500 via-lime-500 to-green-500',
    lightBg: 'bg-yellow-50',
    border: 'border-yellow-200',
    textPrimary: 'text-yellow-600',
    textSecondary: 'text-yellow-500',
  },
  motors: {
    id: 'motors',
    name: 'Motors & Electrical Systems',
    icon: '⚙️',
    primary: '#64748B',     // Slate-500
    secondary: '#6B7280',   // Gray-500
    accent: '#3B82F6',      // Blue-500
    gradient: 'from-slate-500 via-gray-500 to-blue-500',
    lightBg: 'bg-slate-50',
    border: 'border-slate-200',
    textPrimary: 'text-slate-600',
    textSecondary: 'text-slate-500',
  },
  datacenter: {
    id: 'datacenter',
    name: 'Data Center Measures',
    icon: '🖥️',
    primary: '#6366F1',     // Indigo-500
    secondary: '#3B82F6',   // Blue-500
    accent: '#8B5CF6',      // Violet-500
    gradient: 'from-indigo-500 via-blue-500 to-violet-500',
    lightBg: 'bg-indigo-50',
    border: 'border-indigo-200',
    textPrimary: 'text-indigo-600',
    textSecondary: 'text-indigo-500',
  },
  plugload: {
    id: 'plugload',
    name: 'Plug Load',
    icon: '🔌',
    primary: '#EC4899',     // Pink-500
    secondary: '#F43F5E',   // Rose-500
    accent: '#A855F7',      // Purple-500
    gradient: 'from-pink-500 via-rose-500 to-purple-500',
    lightBg: 'bg-pink-50',
    border: 'border-pink-200',
    textPrimary: 'text-pink-600',
    textSecondary: 'text-pink-500',
  },
};

// Get theme by category key
export const getCategoryTheme = (category: CategoryKey): CategoryTheme => {
  return categoryThemes[category] || categoryThemes.cooling;
};

// Get all category themes as an array
export const getAllCategoryThemes = (): CategoryTheme[] => {
  return Object.values(categoryThemes);
};

// Utility classes for consistent styling
export const themeUtils = {
  // Card styles
  card: 'bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300',
  cardPadding: 'p-6',
  
  // Header styles
  headerGradient: (theme: CategoryTheme) => `bg-gradient-to-r ${theme.gradient}`,
  headerIcon: 'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg',
  
  // Text styles
  title: 'text-xl font-bold text-gray-900',
  subtitle: 'text-sm text-gray-500',
  label: 'text-xs font-medium uppercase tracking-wider text-gray-500',
  
  // Button styles
  buttonPrimary: (theme: CategoryTheme) => 
    `bg-gradient-to-r ${theme.gradient} text-white font-medium px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all`,
  buttonSecondary: (theme: CategoryTheme) => 
    `${theme.lightBg} ${theme.textPrimary} font-medium px-4 py-2 rounded-lg ${theme.border} border hover:shadow-md transition-all`,
  
  // Badge styles
  badge: (theme: CategoryTheme) => 
    `inline-flex items-center gap-1 px-2 py-1 rounded-full ${theme.lightBg} ${theme.textPrimary} text-xs font-medium`,
  
  // Status colors
  statusSuccess: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  statusWarning: 'bg-amber-100 text-amber-700 border-amber-200',
  statusError: 'bg-red-100 text-red-700 border-red-200',
  statusInfo: 'bg-blue-100 text-blue-700 border-blue-200',
};

// Difficulty level colors
export const difficultyColors = {
  easy: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-400 to-green-500',
  },
  medium: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    gradient: 'from-amber-400 to-orange-500',
  },
  hard: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    gradient: 'from-red-400 to-rose-500',
  },
  expert: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
    gradient: 'from-purple-400 to-pink-500',
  },
};

// OBF eligibility colors
export const obfColors = {
  eligible: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    icon: 'text-emerald-500',
    gradient: 'from-emerald-400 to-green-500',
  },
  notEligible: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    icon: 'text-gray-400',
    gradient: 'from-gray-400 to-gray-500',
  },
  conditional: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    icon: 'text-amber-500',
    gradient: 'from-amber-400 to-orange-500',
  },
};

// Animation classes
export const animations = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  shimmer: 'animate-[shimmer_2s_infinite]',
};

export default categoryThemes;
