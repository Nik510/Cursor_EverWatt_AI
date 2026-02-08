/**
 * ComparisonChart Widget
 * Side-by-side bar/radar charts for comparing options
 */

import React, { useState } from 'react';
import { BarChart2, Activity, ArrowRight } from 'lucide-react';

export interface ComparisonItem {
  id: string;
  name: string;
  values: { [key: string]: number };
  color?: string;
  highlight?: boolean;
}

export interface ComparisonChartProps {
  items: ComparisonItem[];
  metrics: { key: string; label: string; unit?: string; maxValue?: number }[];
  title?: string;
  subtitle?: string;
  chartType?: 'bar' | 'radar' | 'horizontal';
  showLegend?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

const defaultColors = [
  { gradient: 'from-blue-500 to-indigo-600', solid: '#3b82f6' },
  { gradient: 'from-emerald-500 to-teal-600', solid: '#10b981' },
  { gradient: 'from-orange-500 to-red-600', solid: '#f97316' },
  { gradient: 'from-purple-500 to-pink-600', solid: '#a855f7' },
  { gradient: 'from-teal-500 to-cyan-600', solid: '#14b8a6' },
];

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  items,
  metrics,
  title,
  subtitle,
  chartType = 'bar',
  showLegend = true,
  showValues = true,
  animated = true,
  className = '',
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  const getMaxValue = (metricKey: string): number => {
    const metric = metrics.find(m => m.key === metricKey);
    if (metric?.maxValue) return metric.maxValue;
    return Math.max(...items.map(item => item.values[metricKey] || 0)) * 1.2;
  };
  
  const getItemColor = (index: number) => defaultColors[index % defaultColors.length];
  
  // Horizontal bar chart
  const renderHorizontalBars = () => (
    <div className="space-y-6">
      {metrics.map(metric => (
        <div key={metric.key}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{metric.label}</span>
            {metric.unit && <span className="text-xs text-gray-500">{metric.unit}</span>}
          </div>
          
          <div className="space-y-2">
            {items.map((item, index) => {
              const maxVal = getMaxValue(metric.key);
              const value = item.values[metric.key] || 0;
              const percentage = (value / maxVal) * 100;
              const colors = getItemColor(index);
              const isHovered = hoveredItem === item.id;
              
              return (
                <div 
                  key={item.id}
                  className="flex items-center gap-3"
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className={`text-xs w-20 truncate ${item.highlight ? 'font-bold' : ''}`}>
                    {item.name}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${colors.gradient} rounded-lg flex items-center justify-end pr-2 ${
                        animated ? 'transition-all duration-700 ease-out' : ''
                      } ${isHovered ? 'shadow-lg' : ''}`}
                      style={{ width: `${percentage}%` }}
                    >
                      {showValues && percentage > 20 && (
                        <span className="text-xs font-bold text-white">
                          {value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {showValues && percentage <= 20 && (
                    <span className="text-xs text-gray-600 w-12 text-right">
                      {value.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
  
  // Grouped vertical bar chart
  const renderVerticalBars = () => {
    const barWidth = 100 / (metrics.length * items.length + metrics.length);
    
    return (
      <div className="relative h-64">
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="border-b border-gray-100 relative">
              <span className="absolute -left-8 text-xs text-gray-400 -translate-y-1/2">
                {pct}%
              </span>
            </div>
          ))}
        </div>
        
        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-around px-4">
          {metrics.map((metric, mi) => (
            <div key={metric.key} className="flex items-end gap-1">
              {items.map((item, ii) => {
                const maxVal = getMaxValue(metric.key);
                const value = item.values[metric.key] || 0;
                const height = (value / maxVal) * 100;
                const colors = getItemColor(ii);
                const isHovered = hoveredItem === item.id;
                
                return (
                  <div
                    key={item.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div 
                      className={`w-8 bg-gradient-to-t ${colors.gradient} rounded-t-lg ${
                        animated ? 'transition-all duration-700 ease-out' : ''
                      } ${isHovered ? 'shadow-lg scale-105' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                    
                    {/* Tooltip */}
                    <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity`}>
                      {item.name}: {value.toLocaleString()}{metric.unit || ''}
                    </div>
                  </div>
                );
              })}
              
              {/* Metric label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-600">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Radar chart
  const renderRadar = () => {
    const size = 280;
    const center = size / 2;
    const maxRadius = 100;
    const angleStep = (2 * Math.PI) / metrics.length;
    
    return (
      <div className="flex justify-center">
        <svg width={size} height={size} className="overflow-visible">
          {/* Background circles */}
          {[0.25, 0.5, 0.75, 1].map((scale, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={maxRadius * scale}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines and labels */}
          {metrics.map((metric, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x2 = center + maxRadius * Math.cos(angle);
            const y2 = center + maxRadius * Math.sin(angle);
            const labelX = center + (maxRadius + 25) * Math.cos(angle);
            const labelY = center + (maxRadius + 25) * Math.sin(angle);
            
            return (
              <g key={metric.key}>
                <line
                  x1={center}
                  y1={center}
                  x2={x2}
                  y2={y2}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-medium fill-gray-600"
                >
                  {metric.label}
                </text>
              </g>
            );
          })}
          
          {/* Data polygons */}
          {items.map((item, itemIndex) => {
            const colors = getItemColor(itemIndex);
            const isHovered = hoveredItem === item.id;
            
            const points = metrics.map((metric, i) => {
              const maxVal = getMaxValue(metric.key);
              const value = item.values[metric.key] || 0;
              const radius = (value / maxVal) * maxRadius;
              const angle = i * angleStep - Math.PI / 2;
              return {
                x: center + radius * Math.cos(angle),
                y: center + radius * Math.sin(angle),
              };
            });
            
            const pathData = points.map((p, i) => 
              `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
            ).join(' ') + ' Z';
            
            return (
              <g 
                key={item.id}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <path
                  d={pathData}
                  fill={colors.solid}
                  fillOpacity={isHovered ? 0.4 : 0.2}
                  stroke={colors.solid}
                  strokeWidth={isHovered ? 3 : 2}
                  className={animated ? 'transition-all duration-300' : ''}
                />
                
                {/* Data points */}
                {points.map((point, i) => (
                  <circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r={isHovered ? 5 : 4}
                    fill={colors.solid}
                    stroke="white"
                    strokeWidth="2"
                    className={animated ? 'transition-all duration-300' : ''}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    );
  };
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-2 text-gray-400">
          {chartType === 'radar' ? <Activity className="w-5 h-5" /> : <BarChart2 className="w-5 h-5" />}
        </div>
      </div>
      
      {/* Chart */}
      <div className="mb-6">
        {chartType === 'horizontal' && renderHorizontalBars()}
        {chartType === 'bar' && renderVerticalBars()}
        {chartType === 'radar' && renderRadar()}
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 justify-center pt-4 border-t border-gray-100">
          {items.map((item, index) => {
            const colors = getItemColor(index);
            const isHovered = hoveredItem === item.id;
            
            return (
              <div 
                key={item.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                  isHovered ? 'bg-gray-100 scale-105' : ''
                } ${item.highlight ? 'ring-2 ring-blue-200' : ''}`}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${colors.gradient}`} />
                <span className={`text-sm ${item.highlight ? 'font-bold' : ''}`}>{item.name}</span>
                {item.highlight && <ArrowRight className="w-3 h-3 text-blue-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ComparisonChart;
