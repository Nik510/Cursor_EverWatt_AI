/**
 * AchievementBadge Widget
 * Unlockable badges for completed sections with animations
 */

import React from 'react';
import { 
  Award, 
  Star, 
  Trophy, 
  Zap, 
  Target, 
  BookOpen,
  Flame,
  Shield,
  Lock,
  Check
} from 'lucide-react';

export interface AchievementBadgeProps {
  id: string;
  name: string;
  description: string;
  icon?: 'award' | 'star' | 'trophy' | 'zap' | 'target' | 'book' | 'flame' | 'shield';
  unlocked?: boolean;
  progress?: number; // 0-100
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedDate?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

const iconMap = {
  award: Award,
  star: Star,
  trophy: Trophy,
  zap: Zap,
  target: Target,
  book: BookOpen,
  flame: Flame,
  shield: Shield,
};

const tierConfig = {
  bronze: {
    gradient: 'from-amber-600 to-orange-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    glow: 'shadow-amber-500/30',
    text: 'text-amber-700',
  },
  silver: {
    gradient: 'from-gray-400 to-slate-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    glow: 'shadow-gray-400/30',
    text: 'text-gray-600',
  },
  gold: {
    gradient: 'from-yellow-400 to-amber-500',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    glow: 'shadow-yellow-500/40',
    text: 'text-yellow-700',
  },
  platinum: {
    gradient: 'from-cyan-400 to-blue-500',
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    glow: 'shadow-cyan-500/40',
    text: 'text-cyan-700',
  },
};

const sizeConfig = {
  sm: {
    container: 'w-16 h-16',
    icon: 'w-6 h-6',
    ring: 'w-20 h-20',
    text: 'text-xs',
  },
  md: {
    container: 'w-20 h-20',
    icon: 'w-8 h-8',
    ring: 'w-24 h-24',
    text: 'text-sm',
  },
  lg: {
    container: 'w-24 h-24',
    icon: 'w-10 h-10',
    ring: 'w-28 h-28',
    text: 'text-base',
  },
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  id,
  name,
  description,
  icon = 'award',
  unlocked = false,
  progress = 0,
  tier = 'bronze',
  earnedDate,
  size = 'md',
  animated = true,
  onClick,
  className = '',
}) => {
  const IconComponent = iconMap[icon];
  const tierStyle = tierConfig[tier];
  const sizeStyle = sizeConfig[size];
  
  // Calculate progress ring
  const radius = size === 'sm' ? 36 : size === 'md' ? 44 : 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div 
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Badge container */}
      <div className="relative">
        {/* Progress ring (when not unlocked) */}
        {!unlocked && progress > 0 && (
          <svg 
            className={`absolute inset-0 ${sizeStyle.ring} -m-2 transform -rotate-90`}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
        )}
        
        {/* Badge circle */}
        <div 
          className={`
            ${sizeStyle.container} 
            rounded-full 
            flex items-center justify-center 
            relative
            transition-all duration-300
            ${unlocked 
              ? `bg-gradient-to-br ${tierStyle.gradient} shadow-lg ${tierStyle.glow} ${animated ? 'hover:scale-110' : ''}`
              : 'bg-gray-200'
            }
          `}
        >
          {unlocked ? (
            <>
              <IconComponent className={`${sizeStyle.icon} text-white`} />
              {/* Shine effect */}
              {animated && (
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 transform -translate-x-full animate-[shimmer_3s_infinite]" />
                </div>
              )}
            </>
          ) : (
            <Lock className={`${sizeStyle.icon} text-gray-400`} />
          )}
          
          {/* Unlocked checkmark */}
          {unlocked && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-md">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        {/* Tier indicator */}
        {unlocked && (
          <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full bg-gradient-to-br ${tierStyle.gradient} flex items-center justify-center border-2 border-white shadow-md`}>
            <Star className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Badge info */}
      <div className="mt-3 text-center max-w-[120px]">
        <p className={`font-semibold ${unlocked ? 'text-gray-900' : 'text-gray-400'} ${sizeStyle.text} line-clamp-2`}>
          {name}
        </p>
        {unlocked && earnedDate && (
          <p className="text-xs text-gray-500 mt-0.5">{earnedDate}</p>
        )}
        {!unlocked && progress > 0 && (
          <p className="text-xs text-blue-600 mt-0.5 font-medium">{Math.round(progress)}% complete</p>
        )}
      </div>
    </div>
  );
};

// Badge showcase component
export const BadgeShowcase: React.FC<{
  badges: AchievementBadgeProps[];
  title?: string;
  showLocked?: boolean;
  className?: string;
}> = ({ badges, title = 'Achievements', showLocked = true, className = '' }) => {
  const unlockedCount = badges.filter(b => b.unlocked).length;
  
  const displayBadges = showLocked ? badges : badges.filter(b => b.unlocked);
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{unlockedCount} of {badges.length} unlocked</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full">
          <Star className="w-4 h-4" />
          <span className="text-sm font-bold">{unlockedCount}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-6 justify-center">
        {displayBadges.map(badge => (
          <AchievementBadge key={badge.id} {...badge} size="md" />
        ))}
      </div>
    </div>
  );
};

export default AchievementBadge;
