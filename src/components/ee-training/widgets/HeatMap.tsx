/**
 * HeatMap Widget
 * Color-coded grid for decision matrices, schedules, or data visualization
 */

import React, { useState } from 'react';
import { Grid, Info } from 'lucide-react';

export interface HeatMapCell {
  row: string;
  col: string;
  value: number;
  label?: string;
  tooltip?: string;
}

export interface HeatMapProps {
  data: HeatMapCell[];
  rows: { key: string; label: string }[];
  cols: { key: string; label: string }[];
  title?: string;
  subtitle?: string;
  minValue?: number;
  maxValue?: number;
  colorScale?: 'green-red' | 'blue-red' | 'cool-warm' | 'single';
  showValues?: boolean;
  showLegend?: boolean;
  cellSize?: 'sm' | 'md' | 'lg';
  className?: string;
  onCellClick?: (cell: HeatMapCell) => void;
}

const colorScales = {
  'green-red': [
    { threshold: 0, color: '#22c55e' },     // Green
    { threshold: 0.25, color: '#84cc16' },  // Lime
    { threshold: 0.5, color: '#eab308' },   // Yellow
    { threshold: 0.75, color: '#f97316' },  // Orange
    { threshold: 1, color: '#ef4444' },     // Red
  ],
  'blue-red': [
    { threshold: 0, color: '#3b82f6' },     // Blue
    { threshold: 0.25, color: '#8b5cf6' },  // Purple
    { threshold: 0.5, color: '#a855f7' },   // Violet
    { threshold: 0.75, color: '#ec4899' },  // Pink
    { threshold: 1, color: '#ef4444' },     // Red
  ],
  'cool-warm': [
    { threshold: 0, color: '#06b6d4' },     // Cyan
    { threshold: 0.25, color: '#0ea5e9' },  // Sky
    { threshold: 0.5, color: '#6366f1' },   // Indigo
    { threshold: 0.75, color: '#f97316' },  // Orange
    { threshold: 1, color: '#ef4444' },     // Red
  ],
  'single': [
    { threshold: 0, color: '#e0f2fe' },     // Light blue
    { threshold: 0.25, color: '#7dd3fc' },
    { threshold: 0.5, color: '#38bdf8' },
    { threshold: 0.75, color: '#0284c7' },
    { threshold: 1, color: '#0369a1' },     // Dark blue
  ],
};

const sizeConfig = {
  sm: { cell: 'w-10 h-10', text: 'text-xs', header: 'text-xs' },
  md: { cell: 'w-14 h-14', text: 'text-sm', header: 'text-sm' },
  lg: { cell: 'w-20 h-20', text: 'text-base', header: 'text-base' },
};

const interpolateColor = (
  scale: { threshold: number; color: string }[],
  value: number
): string => {
  const normalizedValue = Math.max(0, Math.min(1, value));
  
  for (let i = 0; i < scale.length - 1; i++) {
    if (normalizedValue >= scale[i].threshold && normalizedValue <= scale[i + 1].threshold) {
      const t = (normalizedValue - scale[i].threshold) / (scale[i + 1].threshold - scale[i].threshold);
      
      // Parse colors
      const c1 = scale[i].color;
      const c2 = scale[i + 1].color;
      
      const r1 = parseInt(c1.slice(1, 3), 16);
      const g1 = parseInt(c1.slice(3, 5), 16);
      const b1 = parseInt(c1.slice(5, 7), 16);
      
      const r2 = parseInt(c2.slice(1, 3), 16);
      const g2 = parseInt(c2.slice(3, 5), 16);
      const b2 = parseInt(c2.slice(5, 7), 16);
      
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  
  return scale[scale.length - 1].color;
};

const getContrastColor = (bgColor: string): string => {
  // Extract RGB from hex or rgb string
  let r: number, g: number, b: number;
  
  if (bgColor.startsWith('#')) {
    r = parseInt(bgColor.slice(1, 3), 16);
    g = parseInt(bgColor.slice(3, 5), 16);
    b = parseInt(bgColor.slice(5, 7), 16);
  } else if (bgColor.startsWith('rgb')) {
    const match = bgColor.match(/\d+/g);
    if (match) {
      [r, g, b] = match.map(Number);
    } else {
      return '#000000';
    }
  } else {
    return '#000000';
  }
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  rows,
  cols,
  title,
  subtitle,
  minValue,
  maxValue,
  colorScale = 'green-red',
  showValues = true,
  showLegend = true,
  cellSize = 'md',
  className = '',
  onCellClick,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string | null>(null);
  
  const sizes = sizeConfig[cellSize];
  const scale = colorScales[colorScale];
  
  // Calculate min/max from data if not provided
  const values = data.map(d => d.value);
  const min = minValue ?? Math.min(...values);
  const max = maxValue ?? Math.max(...values);
  const range = max - min || 1;
  
  const getCellData = (rowKey: string, colKey: string): HeatMapCell | undefined => {
    return data.find(d => d.row === rowKey && d.col === colKey);
  };
  
  const normalizeValue = (value: number): number => {
    return (value - min) / range;
  };
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
      )}
      
      {/* HeatMap Grid */}
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-20"></th>
              {cols.map(col => (
                <th 
                  key={col.key}
                  className={`${sizes.header} font-medium text-gray-600 text-center px-2`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td className={`${sizes.header} font-medium text-gray-600 text-right pr-3`}>
                  {row.label}
                </td>
                {cols.map(col => {
                  const cellData = getCellData(row.key, col.key);
                  const value = cellData?.value ?? 0;
                  const normalizedValue = normalizeValue(value);
                  const bgColor = interpolateColor(scale, normalizedValue);
                  const textColor = getContrastColor(bgColor);
                  const isHovered = hoveredCell?.row === row.key && hoveredCell?.col === col.key;
                  
                  return (
                    <td 
                      key={col.key}
                      className="relative"
                      onMouseEnter={() => {
                        setHoveredCell({ row: row.key, col: col.key });
                        if (cellData?.tooltip) setTooltipContent(cellData.tooltip);
                      }}
                      onMouseLeave={() => {
                        setHoveredCell(null);
                        setTooltipContent(null);
                      }}
                      onClick={() => cellData && onCellClick?.(cellData)}
                    >
                      <div 
                        className={`
                          ${sizes.cell} 
                          rounded-lg flex items-center justify-center
                          transition-all duration-200
                          ${onCellClick ? 'cursor-pointer' : ''}
                          ${isHovered ? 'scale-110 shadow-lg z-10 ring-2 ring-white' : ''}
                        `}
                        style={{ backgroundColor: bgColor }}
                      >
                        {showValues && (
                          <span 
                            className={`${sizes.text} font-semibold`}
                            style={{ color: textColor }}
                          >
                            {cellData?.label ?? value}
                          </span>
                        )}
                      </div>
                      
                      {/* Tooltip */}
                      {isHovered && tooltipContent && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 animate-fadeIn">
                          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                            {tooltipContent}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs text-gray-500">{min}</span>
            <div 
              className="w-48 h-4 rounded-full"
              style={{
                background: `linear-gradient(to right, ${scale.map(s => s.color).join(', ')})`
              }}
            />
            <span className="text-xs text-gray-500">{max}</span>
          </div>
          
          {/* Optional info */}
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
            <Info className="w-3 h-3" />
            <span>Hover over cells for details</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatMap;
