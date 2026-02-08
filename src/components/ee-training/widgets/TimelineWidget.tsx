/**
 * TimelineWidget
 * Horizontal timeline with milestones for project phases, history, etc.
 */

import React, { useState } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  Circle, 
  Clock, 
  ArrowRight,
  Flag,
  Star
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  status?: 'completed' | 'current' | 'upcoming' | 'milestone';
  icon?: React.ReactNode;
  details?: string[];
}

export interface TimelineWidgetProps {
  events: TimelineEvent[];
  title?: string;
  subtitle?: string;
  orientation?: 'horizontal' | 'vertical';
  showDetails?: boolean;
  animated?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'teal';
  className?: string;
}

const colorConfig = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    line: 'bg-blue-200',
    active: 'bg-blue-500',
  },
  green: {
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    line: 'bg-emerald-200',
    active: 'bg-emerald-500',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    line: 'bg-purple-200',
    active: 'bg-purple-500',
  },
  orange: {
    gradient: 'from-orange-500 to-red-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-600',
    line: 'bg-orange-200',
    active: 'bg-orange-500',
  },
  teal: {
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-600',
    line: 'bg-teal-200',
    active: 'bg-teal-500',
  },
};

const statusConfig = {
  completed: { icon: CheckCircle, className: 'text-emerald-500 bg-emerald-100' },
  current: { icon: Clock, className: 'text-blue-500 bg-blue-100 ring-4 ring-blue-100' },
  upcoming: { icon: Circle, className: 'text-gray-400 bg-gray-100' },
  milestone: { icon: Flag, className: 'text-amber-500 bg-amber-100' },
};

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  events,
  title,
  subtitle,
  orientation = 'horizontal',
  showDetails = true,
  animated = true,
  color = 'blue',
  className = '',
}) => {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const colors = colorConfig[color];
  
  const getEventStatus = (event: TimelineEvent, index: number): 'completed' | 'current' | 'upcoming' | 'milestone' => {
    if (event.status) return event.status;
    const currentIndex = events.findIndex(e => e.status === 'current');
    if (currentIndex === -1) return 'upcoming';
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };
  
  if (orientation === 'vertical') {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}
        
        {/* Vertical timeline */}
        <div className="relative">
          {events.map((event, index) => {
            const status = getEventStatus(event, index);
            const statusStyle = statusConfig[status];
            const StatusIcon = event.icon ? () => event.icon : statusStyle.icon;
            const isSelected = selectedEvent === event.id;
            const isHovered = hoveredEvent === event.id;
            
            return (
              <div 
                key={event.id}
                className="relative pl-10 pb-8 last:pb-0"
                onMouseEnter={() => setHoveredEvent(event.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => setSelectedEvent(isSelected ? null : event.id)}
              >
                {/* Connecting line */}
                {index < events.length - 1 && (
                  <div className={`absolute left-[18px] top-10 w-0.5 h-full ${
                    status === 'completed' ? colors.active : 'bg-gray-200'
                  } transition-colors duration-300`} />
                )}
                
                {/* Icon */}
                <div className={`
                  absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center
                  ${statusStyle.className}
                  ${animated && (isSelected || isHovered) ? 'scale-110' : ''}
                  transition-all duration-300 cursor-pointer
                `}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                
                {/* Content */}
                <div className={`${showDetails ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {event.date}
                    </span>
                    {status === 'milestone' && (
                      <Star className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                  
                  <h4 className={`font-semibold ${status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'}`}>
                    {event.title}
                  </h4>
                  
                  {event.description && (
                    <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  )}
                  
                  {/* Expanded details */}
                  {showDetails && isSelected && event.details && (
                    <div className={`mt-3 ${colors.bg} ${colors.border} border rounded-lg p-3 animate-fadeIn`}>
                      <ul className="space-y-1">
                        {event.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <ArrowRight className={`w-3 h-3 mt-1 flex-shrink-0 ${colors.text}`} />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Horizontal timeline
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-lg`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      )}
      
      {/* Horizontal timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className={`absolute top-5 left-0 right-0 h-1 ${colors.line} rounded-full`} />
        
        {/* Progress line */}
        <div 
          className={`absolute top-5 left-0 h-1 ${colors.active} rounded-full transition-all duration-500`}
          style={{ 
            width: `${((events.findIndex(e => e.status === 'current') + 1) / events.length) * 100}%` 
          }}
        />
        
        {/* Events */}
        <div className="relative flex justify-between">
          {events.map((event, index) => {
            const status = getEventStatus(event, index);
            const statusStyle = statusConfig[status];
            const StatusIcon = event.icon ? () => event.icon : statusStyle.icon;
            const isSelected = selectedEvent === event.id;
            const isHovered = hoveredEvent === event.id;
            
            return (
              <div 
                key={event.id}
                className="flex flex-col items-center text-center px-2 cursor-pointer"
                style={{ width: `${100 / events.length}%` }}
                onMouseEnter={() => setHoveredEvent(event.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => setSelectedEvent(isSelected ? null : event.id)}
              >
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-3 z-10
                  ${statusStyle.className}
                  ${animated && (isSelected || isHovered) ? 'scale-125' : ''}
                  transition-all duration-300
                `}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                
                {/* Date */}
                <span className="text-xs text-gray-500 mb-1">{event.date}</span>
                
                {/* Title */}
                <h4 className={`text-sm font-semibold ${
                  status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
                } line-clamp-2`}>
                  {event.title}
                </h4>
                
                {/* Hover/Selected details */}
                {(isSelected || isHovered) && event.description && (
                  <p className="text-xs text-gray-500 mt-1 animate-fadeIn">
                    {event.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Selected event details */}
      {showDetails && selectedEvent && (
        <div className={`mt-6 ${colors.bg} ${colors.border} border rounded-xl p-4 animate-fadeIn`}>
          {(() => {
            const event = events.find(e => e.id === selectedEvent);
            if (!event) return null;
            
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-bold ${colors.text}`}>{event.title}</span>
                  <span className="text-xs text-gray-500">• {event.date}</span>
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                )}
                
                {event.details && (
                  <ul className="space-y-1">
                    {event.details.map((detail, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <ArrowRight className={`w-3 h-3 mt-1 flex-shrink-0 ${colors.text}`} />
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TimelineWidget;
