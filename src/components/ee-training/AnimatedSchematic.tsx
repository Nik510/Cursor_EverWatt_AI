/**
 * AnimatedSchematic Component
 * Base component for animated SVG diagrams with flowing elements
 * Used for refrigeration cycles, chiller systems, cooling towers, etc.
 */

import React, { useState, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface FlowPath {
  id: string;
  d: string; // SVG path data
  color: 'hot' | 'cold' | 'neutral' | 'highlight';
  flowDirection: 'forward' | 'reverse';
  label?: string;
  strokeWidth?: number;
}

export interface Component {
  id: string;
  type: 'compressor' | 'condenser' | 'evaporator' | 'expansion-valve' | 'pump' | 'tower' | 'coil' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  description?: string;
  stats?: string;
  onClick?: () => void;
}

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  description: string;
  stats?: string;
}

export interface AnimatedSchematicProps {
  width?: number;
  height?: number;
  viewBox?: string;
  title?: string;
  subtitle?: string;
  flowPaths?: FlowPath[];
  components?: Component[];
  hotspots?: Hotspot[];
  showLabels?: boolean;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  children?: React.ReactNode;
  className?: string;
}

// ============================================
// COLOR DEFINITIONS
// ============================================

const COLORS = {
  hot: {
    stroke: '#ef4444',
    fill: '#fca5a5',
    glow: '#fecaca',
  },
  cold: {
    stroke: '#3b82f6',
    fill: '#93c5fd',
    glow: '#bfdbfe',
  },
  neutral: {
    stroke: '#6b7280',
    fill: '#d1d5db',
    glow: '#e5e7eb',
  },
  highlight: {
    stroke: '#f59e0b',
    fill: '#fcd34d',
    glow: '#fef3c7',
  },
};

const ANIMATION_SPEEDS = {
  slow: 4,
  normal: 2,
  fast: 1,
};

// ============================================
// ANIMATED FLOW PATH
// ============================================

const AnimatedFlowPath: React.FC<{
  path: FlowPath;
  speed: number;
}> = ({ path, speed }) => {
  const color = COLORS[path.color];
  const strokeWidth = path.strokeWidth || 4;
  
  return (
    <g>
      {/* Background path */}
      <path
        d={path.d}
        fill="none"
        stroke={color.glow}
        strokeWidth={strokeWidth + 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      
      {/* Main path */}
      <path
        d={path.d}
        fill="none"
        stroke={color.stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Animated flow dots */}
      <g className="flow-animation">
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            key={i}
            r={strokeWidth / 2 + 1}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth={1}
          >
            <animateMotion
              dur={`${speed}s`}
              repeatCount="indefinite"
              begin={`${i * (speed / 5)}s`}
              keyPoints={path.flowDirection === 'reverse' ? '1;0' : '0;1'}
              keyTimes="0;1"
            >
              <mpath href={`#${path.id}`} />
            </animateMotion>
          </circle>
        ))}
      </g>
      
      {/* Hidden path for motion reference */}
      <path
        id={path.id}
        d={path.d}
        fill="none"
        stroke="none"
      />
    </g>
  );
};

// ============================================
// COMPONENT ICONS
// ============================================

const CompressorIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Compressor body */}
    <rect
      x={0}
      y={height * 0.2}
      width={width}
      height={height * 0.6}
      rx={4}
      fill="#1f2937"
      stroke="#374151"
      strokeWidth={2}
    />
    {/* Motor housing */}
    <ellipse
      cx={width / 2}
      cy={height * 0.5}
      rx={width * 0.35}
      ry={height * 0.25}
      fill="#374151"
      stroke="#4b5563"
      strokeWidth={2}
    />
    {/* Pulsing animation */}
    <ellipse
      cx={width / 2}
      cy={height * 0.5}
      rx={width * 0.25}
      ry={height * 0.15}
      fill="#60a5fa"
    >
      <animate
        attributeName="opacity"
        values="0.3;1;0.3"
        dur="1s"
        repeatCount="indefinite"
      />
    </ellipse>
    {/* Suction/Discharge ports */}
    <rect x={-8} y={height * 0.35} width={8} height={12} fill="#3b82f6" rx={2} />
    <rect x={width} y={height * 0.35} width={8} height={12} fill="#ef4444" rx={2} />
  </g>
);

const CondenserIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Shell */}
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      rx={8}
      fill="#fee2e2"
      stroke="#ef4444"
      strokeWidth={2}
    />
    {/* Tube bundle */}
    {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
      <line
        key={i}
        x1={width * 0.1}
        y1={height * ratio}
        x2={width * 0.9}
        y2={height * ratio}
        stroke="#ef4444"
        strokeWidth={3}
        opacity={0.6}
      />
    ))}
    {/* Heat arrows */}
    <g className="heat-arrows">
      {[0.3, 0.5, 0.7].map((ratio, i) => (
        <g key={i} transform={`translate(${width * ratio}, ${-10})`}>
          <path d="M0,0 L5,-8 L-5,-8 Z" fill="#ef4444">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.5s"
              begin={`${i * 0.3}s`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}
    </g>
  </g>
);

const EvaporatorIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Shell */}
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      rx={8}
      fill="#dbeafe"
      stroke="#3b82f6"
      strokeWidth={2}
    />
    {/* Tube bundle */}
    {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => (
      <line
        key={i}
        x1={width * 0.1}
        y1={height * ratio}
        x2={width * 0.9}
        y2={height * ratio}
        stroke="#3b82f6"
        strokeWidth={3}
        opacity={0.6}
      />
    ))}
    {/* Cold arrows (pointing in) */}
    <g className="cold-arrows">
      {[0.3, 0.5, 0.7].map((ratio, i) => (
        <g key={i} transform={`translate(${width * ratio}, ${height + 10})`}>
          <path d="M0,0 L5,8 L-5,8 Z" fill="#3b82f6">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.5s"
              begin={`${i * 0.3}s`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}
    </g>
  </g>
);

const ExpansionValveIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Valve body - hourglass shape */}
    <path
      d={`M0,0 L${width},${height * 0.4} L${width},${height * 0.6} L0,${height} L0,0`}
      fill="#fef3c7"
      stroke="#f59e0b"
      strokeWidth={2}
    />
    {/* Restriction point */}
    <line
      x1={width * 0.4}
      y1={height * 0.45}
      x2={width * 0.4}
      y2={height * 0.55}
      stroke="#f59e0b"
      strokeWidth={3}
    />
    {/* Flow indicator */}
    <circle cx={width * 0.7} cy={height * 0.5} r={4} fill="#f59e0b">
      <animate
        attributeName="r"
        values="2;5;2"
        dur="0.5s"
        repeatCount="indefinite"
      />
    </circle>
  </g>
);

const PumpIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Pump casing */}
    <circle
      cx={width / 2}
      cy={height / 2}
      r={Math.min(width, height) * 0.45}
      fill="#e0e7ff"
      stroke="#6366f1"
      strokeWidth={2}
    />
    {/* Impeller */}
    <g transform={`translate(${width / 2}, ${height / 2})`}>
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <rect
          key={i}
          x={-2}
          y={-Math.min(width, height) * 0.35}
          width={4}
          height={Math.min(width, height) * 0.2}
          fill="#6366f1"
          transform={`rotate(${angle})`}
        />
      ))}
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="2s"
        repeatCount="indefinite"
      />
    </g>
    {/* Suction/Discharge */}
    <rect x={-8} y={height * 0.4} width={8} height={height * 0.2} fill="#6366f1" />
    <rect x={width * 0.4} y={-8} width={width * 0.2} height={8} fill="#6366f1" />
  </g>
);

const CoolingTowerIcon: React.FC<{ x: number; y: number; width: number; height: number }> = ({
  x, y, width, height
}) => (
  <g transform={`translate(${x}, ${y})`}>
    {/* Tower structure - trapezoid */}
    <path
      d={`M${width * 0.1},${height} L${width * 0.25},0 L${width * 0.75},0 L${width * 0.9},${height} Z`}
      fill="#f3f4f6"
      stroke="#6b7280"
      strokeWidth={2}
    />
    {/* Fill media lines */}
    {[0.3, 0.5, 0.7].map((ratio, i) => (
      <line
        key={i}
        x1={width * 0.2}
        y1={height * ratio}
        x2={width * 0.8}
        y2={height * ratio}
        stroke="#9ca3af"
        strokeWidth={2}
        strokeDasharray="4,4"
      />
    ))}
    {/* Fan at top */}
    <circle
      cx={width / 2}
      cy={height * 0.1}
      r={width * 0.15}
      fill="#e5e7eb"
      stroke="#6b7280"
      strokeWidth={2}
    />
    {/* Spinning fan blades */}
    <g transform={`translate(${width / 2}, ${height * 0.1})`}>
      {[0, 90, 180, 270].map((angle, i) => (
        <rect
          key={i}
          x={-2}
          y={-width * 0.12}
          width={4}
          height={width * 0.1}
          fill="#374151"
          transform={`rotate(${angle})`}
        />
      ))}
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="1.5s"
        repeatCount="indefinite"
      />
    </g>
    {/* Water droplets falling */}
    {[0.3, 0.5, 0.7].map((xRatio, i) => (
      <circle key={i} cx={width * xRatio} cy={height * 0.4} r={3} fill="#60a5fa">
        <animate
          attributeName="cy"
          values={`${height * 0.3};${height * 0.85};${height * 0.3}`}
          dur="2s"
          begin={`${i * 0.4}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.3;1"
          dur="2s"
          begin={`${i * 0.4}s`}
          repeatCount="indefinite"
        />
      </circle>
    ))}
    {/* Basin at bottom */}
    <rect
      x={0}
      y={height * 0.9}
      width={width}
      height={height * 0.1}
      fill="#dbeafe"
      stroke="#3b82f6"
      strokeWidth={2}
    />
  </g>
);

// ============================================
// COMPONENT RENDERER
// ============================================

const ComponentRenderer: React.FC<{
  component: Component;
  showLabel: boolean;
  onSelect?: (component: Component) => void;
}> = ({ component, showLabel, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const renderIcon = () => {
    const props = {
      x: 0,
      y: 0,
      width: component.width,
      height: component.height,
    };
    
    switch (component.type) {
      case 'compressor':
        return <CompressorIcon {...props} />;
      case 'condenser':
        return <CondenserIcon {...props} />;
      case 'evaporator':
        return <EvaporatorIcon {...props} />;
      case 'expansion-valve':
        return <ExpansionValveIcon {...props} />;
      case 'pump':
        return <PumpIcon {...props} />;
      case 'tower':
        return <CoolingTowerIcon {...props} />;
      default:
        return (
          <rect
            x={0}
            y={0}
            width={component.width}
            height={component.height}
            fill="#e5e7eb"
            stroke="#6b7280"
            strokeWidth={2}
            rx={4}
          />
        );
    }
  };
  
  return (
    <g
      transform={`translate(${component.x}, ${component.y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(component)}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
    >
      {/* Highlight on hover */}
      {isHovered && (
        <rect
          x={-5}
          y={-5}
          width={component.width + 10}
          height={component.height + 10}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4,4"
          rx={6}
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </rect>
      )}
      
      {renderIcon()}
      
      {/* Label */}
      {showLabel && (
        <text
          x={component.width / 2}
          y={component.height + 16}
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill="#1f2937"
        >
          {component.label}
        </text>
      )}
      
      {/* Tooltip on hover */}
      {isHovered && component.description && (
        <g transform={`translate(${component.width + 10}, 0)`}>
          <rect
            x={0}
            y={0}
            width={180}
            height={component.stats ? 70 : 50}
            fill="#1f2937"
            rx={4}
            opacity={0.95}
          />
          <text x={8} y={18} fontSize={11} fontWeight={600} fill="#ffffff">
            {component.label}
          </text>
          <text x={8} y={34} fontSize={10} fill="#d1d5db">
            {component.description}
          </text>
          {component.stats && (
            <text x={8} y={50} fontSize={10} fill="#60a5fa">
              {component.stats}
            </text>
          )}
        </g>
      )}
    </g>
  );
};

// ============================================
// HOTSPOT COMPONENT
// ============================================

const HotspotMarker: React.FC<{
  hotspot: Hotspot;
  onSelect?: (hotspot: Hotspot) => void;
}> = ({ hotspot, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect?.(hotspot)}
      style={{ cursor: 'pointer' }}
    >
      {/* Pulsing ring */}
      <circle
        cx={hotspot.x}
        cy={hotspot.y}
        r={hotspot.radius + 5}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        opacity={0.5}
      >
        <animate
          attributeName="r"
          values={`${hotspot.radius};${hotspot.radius + 10};${hotspot.radius}`}
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.5;0;0.5"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>
      
      {/* Main hotspot */}
      <circle
        cx={hotspot.x}
        cy={hotspot.y}
        r={hotspot.radius}
        fill="#3b82f6"
        stroke="#1d4ed8"
        strokeWidth={2}
      />
      
      {/* Plus icon */}
      <text
        x={hotspot.x}
        y={hotspot.y + 4}
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
        fill="#ffffff"
      >
        +
      </text>
      
      {/* Tooltip */}
      {isHovered && (
        <g transform={`translate(${hotspot.x + hotspot.radius + 10}, ${hotspot.y - 25})`}>
          <rect
            x={0}
            y={0}
            width={200}
            height={hotspot.stats ? 70 : 50}
            fill="#1f2937"
            rx={4}
            opacity={0.95}
          />
          <text x={8} y={18} fontSize={11} fontWeight={600} fill="#ffffff">
            {hotspot.label}
          </text>
          <text x={8} y={34} fontSize={10} fill="#d1d5db">
            {hotspot.description}
          </text>
          {hotspot.stats && (
            <text x={8} y={50} fontSize={10} fill="#60a5fa">
              {hotspot.stats}
            </text>
          )}
        </g>
      )}
    </g>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AnimatedSchematic: React.FC<AnimatedSchematicProps> = ({
  width = 800,
  height = 500,
  viewBox,
  title,
  subtitle,
  flowPaths = [],
  components = [],
  hotspots = [],
  showLabels = true,
  animationSpeed = 'normal',
  children,
  className = '',
}) => {
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  
  const speed = ANIMATION_SPEEDS[animationSpeed];
  const effectiveViewBox = viewBox || `0 0 ${width} ${height}`;
  
  return (
    <div className={`animated-schematic ${className}`}>
      {/* Enhanced Header */}
      {(title || subtitle) && (
        <div className="mb-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <div>
            {title && <h3 className="text-xl font-bold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      
      {/* SVG Container with enhanced styling */}
      <div className="relative bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
        <svg
          width="100%"
          height="100%"
          viewBox={effectiveViewBox}
          style={{ minHeight: height }}
          className="block"
        >
          {/* Definitions for gradients and filters */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <linearGradient id="hotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            
            <linearGradient id="coldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          
          {/* Background grid */}
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Flow paths */}
          <g className="flow-paths">
            {flowPaths.map((path) => (
              <AnimatedFlowPath key={path.id} path={path} speed={speed} />
            ))}
          </g>
          
          {/* Components */}
          <g className="components">
            {components.map((component) => (
              <ComponentRenderer
                key={component.id}
                component={component}
                showLabel={showLabels}
                onSelect={setSelectedComponent}
              />
            ))}
          </g>
          
          {/* Hotspots */}
          <g className="hotspots">
            {hotspots.map((hotspot) => (
              <HotspotMarker
                key={hotspot.id}
                hotspot={hotspot}
                onSelect={setSelectedHotspot}
              />
            ))}
          </g>
          
          {/* Custom children */}
          {children}
        </svg>
        
        {/* Enhanced Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 border border-gray-200 shadow-lg">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legend</div>
          <div className="flex items-center gap-5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
              <span className="text-gray-700 font-medium">Hot/High Pressure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm" />
              <span className="text-gray-700 font-medium">Cold/Low Pressure</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm" />
              <span className="text-gray-700 font-medium">Transition</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced Interaction hint */}
        {(components.length > 0 || hotspots.length > 0) && (
          <div className="absolute top-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-lg shadow-blue-500/25 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Click to explore
          </div>
        )}
      </div>
      
      {/* Enhanced Selected component detail panel */}
      {selectedComponent && (
        <div className="mt-5 bg-gradient-to-r from-white to-blue-50 border border-blue-200 rounded-xl p-5 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">
                  {selectedComponent.label.charAt(0)}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg">{selectedComponent.label}</h4>
                {selectedComponent.description && (
                  <p className="text-sm text-gray-600 mt-1 max-w-md">{selectedComponent.description}</p>
                )}
                {selectedComponent.stats && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {selectedComponent.stats}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedComponent(null)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnimatedSchematic;
