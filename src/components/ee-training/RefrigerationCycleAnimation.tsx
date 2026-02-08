/**
 * RefrigerationCycleAnimation Component
 * Animated P-h (Pressure-Enthalpy) diagram with step-through cycle explanation
 * Shows the thermodynamic refrigeration cycle with real values
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Info, Zap, TrendingUp, MessageSquare, Gauge } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface CycleStep {
  id: number;
  name: string;
  shortName: string;
  process: string;
  component: string;
  description: string;
  engineerNote: string;
  salesNote: string;
  conditions: {
    pressure: string;
    temperature: string;
    state: string;
    enthalpy: string;
  };
  color: string;
}

interface RefrigerationCycleAnimationProps {
  title?: string;
  refrigerant?: 'R-134a' | 'R-410A' | 'R-1234ze';
  autoPlay?: boolean;
  showPHDiagram?: boolean;
}

// ============================================
// CYCLE DATA
// ============================================

const CYCLE_STEPS: CycleStep[] = [
  {
    id: 1,
    name: 'Compression',
    shortName: '1→2',
    process: 'Isentropic Compression',
    component: 'Compressor',
    description: 'Low-pressure, low-temperature vapor is compressed to high-pressure, high-temperature vapor. This is where most of the energy input occurs.',
    engineerNote: 'Work input: W = m_dot × (h2 - h1). Isentropic efficiency typically 70-85%. Compression ratio = P_high / P_low. Higher lift = more compression work = lower efficiency.',
    salesNote: 'This is where 90%+ of your chiller energy goes. VFD compressors reduce this work by 20-35% at part load. Magnetic-bearing compressors are most efficient (no friction losses).',
    conditions: {
      pressure: '40 → 180 psia',
      temperature: '40°F → 165°F',
      state: 'Superheated Vapor',
      enthalpy: '105 → 120 BTU/lb',
    },
    color: '#ef4444',
  },
  {
    id: 2,
    name: 'Condensation',
    shortName: '2→3',
    process: 'Isobaric Heat Rejection',
    component: 'Condenser',
    description: 'High-pressure vapor releases heat to cooling water (or air) and condenses to liquid. Heat rejected = evaporator load + compressor work.',
    engineerNote: 'Q_cond = m_dot × (h2 - h3). Condenser approach = T_refrigerant - T_water_leaving. Target: 3-5°F. Lower condenser temperature = lower lift = better efficiency.',
    salesNote: 'This is where you reject heat. Colder condenser water = less work for compressor. VFD tower fans + lower setpoint = 15-20% savings. "Your 85°F water could be 75°F."',
    conditions: {
      pressure: '180 psia (constant)',
      temperature: '165°F → 95°F',
      state: 'Vapor → Liquid',
      enthalpy: '120 → 45 BTU/lb',
    },
    color: '#f97316',
  },
  {
    id: 3,
    name: 'Expansion',
    shortName: '3→4',
    process: 'Isenthalpic Expansion',
    component: 'Expansion Valve',
    description: 'High-pressure liquid passes through a restriction and drops to low pressure. Temperature drops dramatically. Some liquid flashes to vapor.',
    engineerNote: 'h3 = h4 (isenthalpic). Flash gas = ~15-25%. No work done, no heat transfer. Pressure drop causes temperature drop (Joule-Thomson effect).',
    salesNote: 'The expansion valve is like the throttle. EEV (electronic) valves give 5-10% better efficiency than old mechanical TXV valves through precise control.',
    conditions: {
      pressure: '180 → 40 psia',
      temperature: '95°F → 38°F',
      state: 'Liquid + Flash Gas',
      enthalpy: '45 BTU/lb (constant)',
    },
    color: '#f59e0b',
  },
  {
    id: 4,
    name: 'Evaporation',
    shortName: '4→1',
    process: 'Isobaric Heat Absorption',
    component: 'Evaporator',
    description: 'Low-pressure liquid absorbs heat from chilled water and evaporates to vapor. This is where useful cooling happens - the refrigeration effect.',
    engineerNote: 'Q_evap = m_dot × (h1 - h4). Evaporator approach = T_CHW_leaving - T_refrigerant. Target: 2-4°F. Higher CHW temp = higher evaporator pressure = less lift.',
    salesNote: 'This makes your cold water. Most run 42°F when 46-48°F works fine. Each degree warmer saves 1.5-2% energy. "We can save you 8% just by raising this 4°F."',
    conditions: {
      pressure: '40 psia (constant)',
      temperature: '38°F → 40°F',
      state: 'Liquid → Vapor',
      enthalpy: '45 → 105 BTU/lb',
    },
    color: '#3b82f6',
  },
];

// ============================================
// P-H DIAGRAM COMPONENT
// ============================================

const PHDiagram: React.FC<{
  currentStep: number;
  isAnimating: boolean;
}> = ({ currentStep, isAnimating }) => {
  // Coordinates for the cycle on P-h diagram
  // Scaled to fit 400x300 viewBox
  const points = {
    1: { x: 280, y: 240 },  // Low P, moderate h (evaporator outlet)
    2: { x: 350, y: 80 },   // High P, high h (compressor outlet)
    3: { x: 120, y: 80 },   // High P, low h (condenser outlet)
    4: { x: 120, y: 240 },  // Low P, low h (expansion outlet)
  };
  
  // Saturation dome (simplified)
  const domePath = `
    M 80 260 
    Q 100 180 140 120 
    Q 180 60 250 60 
    Q 320 60 360 120 
    Q 400 180 420 260
  `;
  
  return (
    <svg viewBox="0 0 500 350" className="w-full h-auto">
      {/* Background */}
      <rect width="500" height="350" fill="#f8fafc" />
      
      {/* Grid */}
      <defs>
        <pattern id="ph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="60" y="40" width="420" height="260" fill="url(#ph-grid)" />
      
      {/* Axes */}
      <line x1="60" y1="300" x2="480" y2="300" stroke="#64748b" strokeWidth="2" />
      <line x1="60" y1="40" x2="60" y2="300" stroke="#64748b" strokeWidth="2" />
      
      {/* Axis labels */}
      <text x="270" y="335" textAnchor="middle" className="text-sm fill-gray-600 font-medium">
        Enthalpy (h) BTU/lb
      </text>
      <text x="25" y="170" textAnchor="middle" className="text-sm fill-gray-600 font-medium" transform="rotate(-90 25 170)">
        Pressure (P) psia
      </text>
      
      {/* Pressure labels */}
      <text x="55" y="245" textAnchor="end" className="text-xs fill-gray-500">40</text>
      <text x="55" y="85" textAnchor="end" className="text-xs fill-gray-500">180</text>
      
      {/* Enthalpy labels */}
      <text x="120" y="315" textAnchor="middle" className="text-xs fill-gray-500">45</text>
      <text x="280" y="315" textAnchor="middle" className="text-xs fill-gray-500">105</text>
      <text x="350" y="315" textAnchor="middle" className="text-xs fill-gray-500">120</text>
      
      {/* Saturation dome */}
      <path
        d={domePath}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeDasharray="6,4"
      />
      <text x="250" y="150" textAnchor="middle" className="text-xs fill-gray-400">
        Saturation Dome
      </text>
      <text x="100" y="200" className="text-xs fill-gray-400">Liquid</text>
      <text x="380" y="200" className="text-xs fill-gray-400">Vapor</text>
      <text x="250" y="100" className="text-xs fill-gray-400">2-Phase</text>
      
      {/* Cycle path - background */}
      <path
        d={`M ${points[1].x} ${points[1].y} 
            L ${points[2].x} ${points[2].y} 
            L ${points[3].x} ${points[3].y} 
            L ${points[4].x} ${points[4].y} 
            Z`}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="none"
      />
      
      {/* Compression (1→2) */}
      <line
        x1={points[1].x} y1={points[1].y}
        x2={points[2].x} y2={points[2].y}
        stroke={currentStep === 1 ? '#ef4444' : '#fca5a5'}
        strokeWidth={currentStep === 1 ? 4 : 3}
        strokeLinecap="round"
      />
      
      {/* Condensation (2→3) */}
      <line
        x1={points[2].x} y1={points[2].y}
        x2={points[3].x} y2={points[3].y}
        stroke={currentStep === 2 ? '#f97316' : '#fdba74'}
        strokeWidth={currentStep === 2 ? 4 : 3}
        strokeLinecap="round"
      />
      
      {/* Expansion (3→4) */}
      <line
        x1={points[3].x} y1={points[3].y}
        x2={points[4].x} y2={points[4].y}
        stroke={currentStep === 3 ? '#f59e0b' : '#fcd34d'}
        strokeWidth={currentStep === 3 ? 4 : 3}
        strokeLinecap="round"
      />
      
      {/* Evaporation (4→1) */}
      <line
        x1={points[4].x} y1={points[4].y}
        x2={points[1].x} y2={points[1].y}
        stroke={currentStep === 4 ? '#3b82f6' : '#93c5fd'}
        strokeWidth={currentStep === 4 ? 4 : 3}
        strokeLinecap="round"
      />
      
      {/* State points */}
      {Object.entries(points).map(([num, pos]) => {
        const stepNum = parseInt(num);
        const isActive = currentStep === stepNum || currentStep === (stepNum === 1 ? 4 : stepNum - 1);
        return (
          <g key={num}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={isActive ? 12 : 8}
              fill={CYCLE_STEPS[(stepNum - 1) % 4].color}
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              className="text-xs font-bold fill-white"
            >
              {num}
            </text>
          </g>
        );
      })}
      
      {/* Animated flow indicator */}
      {isAnimating && (
        <circle r="6" fill={CYCLE_STEPS[currentStep - 1].color}>
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={
              currentStep === 1 ? `M ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y}` :
              currentStep === 2 ? `M ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y}` :
              currentStep === 3 ? `M ${points[3].x} ${points[3].y} L ${points[4].x} ${points[4].y}` :
              `M ${points[4].x} ${points[4].y} L ${points[1].x} ${points[1].y}`
            }
          />
        </circle>
      )}
      
      {/* Process labels */}
      <text x="330" y="155" className="text-xs fill-red-600 font-medium" transform="rotate(-55 330 155)">Compression</text>
      <text x="235" y="65" className="text-xs fill-orange-600 font-medium">Condensation</text>
      <text x="95" y="170" className="text-xs fill-amber-600 font-medium" transform="rotate(-90 95 170)">Expansion</text>
      <text x="200" y="260" className="text-xs fill-blue-600 font-medium">Evaporation</text>
      
      {/* Title */}
      <text x="250" y="25" textAnchor="middle" className="text-sm font-bold fill-gray-800">
        Pressure-Enthalpy (P-h) Diagram
      </text>
    </svg>
  );
};

// ============================================
// SCHEMATIC DIAGRAM
// ============================================

const SchematicDiagram: React.FC<{
  currentStep: number;
  isAnimating: boolean;
}> = ({ currentStep, isAnimating }) => {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-auto">
      <defs>
        <pattern id="cycle-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#cycle-grid)" />
      
      {/* Piping */}
      {/* Compression line (bottom left to top right) */}
      <path
        d="M 80 220 Q 80 150 150 150 Q 200 150 200 80"
        fill="none"
        stroke={currentStep === 1 ? '#ef4444' : '#fca5a5'}
        strokeWidth={currentStep === 1 ? 6 : 4}
        strokeLinecap="round"
      />
      
      {/* Condensation line (top right to top left) */}
      <path
        d="M 200 80 L 320 80"
        fill="none"
        stroke={currentStep === 2 ? '#f97316' : '#fdba74'}
        strokeWidth={currentStep === 2 ? 6 : 4}
        strokeLinecap="round"
      />
      
      {/* Expansion line (top left to bottom left) */}
      <path
        d="M 320 80 Q 320 150 280 150 Q 250 150 250 220"
        fill="none"
        stroke={currentStep === 3 ? '#f59e0b' : '#fcd34d'}
        strokeWidth={currentStep === 3 ? 6 : 4}
        strokeLinecap="round"
      />
      
      {/* Evaporation line (bottom left to bottom right back to start) */}
      <path
        d="M 250 220 L 80 220"
        fill="none"
        stroke={currentStep === 4 ? '#3b82f6' : '#93c5fd'}
        strokeWidth={currentStep === 4 ? 6 : 4}
        strokeLinecap="round"
      />
      
      {/* Flow indicators */}
      {isAnimating && [1, 2, 3, 4, 5].map((i) => (
        <circle key={i} r="4" fill={CYCLE_STEPS[currentStep - 1].color}>
          <animateMotion
            dur="3s"
            repeatCount="indefinite"
            begin={`${i * 0.6}s`}
            path={
              currentStep === 1 ? "M 80 220 Q 80 150 150 150 Q 200 150 200 80" :
              currentStep === 2 ? "M 200 80 L 320 80" :
              currentStep === 3 ? "M 320 80 Q 320 150 280 150 Q 250 150 250 220" :
              "M 250 220 L 80 220"
            }
          />
        </circle>
      ))}
      
      {/* Compressor */}
      <g transform="translate(60, 130)">
        <rect
          x="0" y="0" width="40" height="50" rx="6"
          fill={currentStep === 1 ? '#fef2f2' : '#1f2937'}
          stroke={currentStep === 1 ? '#ef4444' : '#374151'}
          strokeWidth={currentStep === 1 ? 3 : 2}
        />
        <ellipse cx="20" cy="25" rx="12" ry="8" fill="#374151" />
        <ellipse cx="20" cy="25" rx="8" ry="5" fill="#60a5fa">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
        </ellipse>
        <text x="20" y="65" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Compressor</text>
      </g>
      
      {/* Condenser */}
      <g transform="translate(180, 50)">
        <rect
          x="0" y="0" width="100" height="40" rx="6"
          fill={currentStep === 2 ? '#fef2f2' : '#fff1f2'}
          stroke={currentStep === 2 ? '#f97316' : '#fca5a5'}
          strokeWidth={currentStep === 2 ? 3 : 2}
        />
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i} x1="10" y1={40 * r} x2="90" y2={40 * r} stroke="#ef4444" strokeWidth="2" opacity="0.5" />
        ))}
        <text x="50" y="55" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Condenser</text>
        {/* Heat arrows */}
        {currentStep === 2 && [0.3, 0.5, 0.7].map((r, i) => (
          <path key={i} d={`M ${100 * r} -5 L ${100 * r + 5} -12 L ${100 * r - 5} -12 Z`} fill="#f97316">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </path>
        ))}
      </g>
      
      {/* Expansion Valve */}
      <g transform="translate(300, 120)">
        <path
          d="M 0 0 L 30 20 L 30 30 L 0 50 Z"
          fill={currentStep === 3 ? '#fef3c7' : '#fefce8'}
          stroke={currentStep === 3 ? '#f59e0b' : '#fcd34d'}
          strokeWidth={currentStep === 3 ? 3 : 2}
        />
        <circle cx="15" cy="25" r="4" fill="#f59e0b">
          <animate attributeName="r" values="2;5;2" dur="0.5s" repeatCount="indefinite" />
        </circle>
        <text x="15" y="65" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Expansion</text>
        <text x="15" y="77" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Valve</text>
      </g>
      
      {/* Evaporator */}
      <g transform="translate(120, 200)">
        <rect
          x="0" y="0" width="100" height="40" rx="6"
          fill={currentStep === 4 ? '#dbeafe' : '#eff6ff'}
          stroke={currentStep === 4 ? '#3b82f6' : '#93c5fd'}
          strokeWidth={currentStep === 4 ? 3 : 2}
        />
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line key={i} x1="10" y1={40 * r} x2="90" y2={40 * r} stroke="#3b82f6" strokeWidth="2" opacity="0.5" />
        ))}
        <text x="50" y="55" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Evaporator</text>
        {/* Cold arrows */}
        {currentStep === 4 && [0.3, 0.5, 0.7].map((r, i) => (
          <path key={i} d={`M ${100 * r} 45 L ${100 * r + 5} 52 L ${100 * r - 5} 52 Z`} fill="#3b82f6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
          </path>
        ))}
      </g>
      
      {/* State labels */}
      <g className="text-xs">
        <text x="60" y="220" fill="#3b82f6" fontWeight="bold">1</text>
        <text x="185" y="70" fill="#ef4444" fontWeight="bold">2</text>
        <text x="290" y="70" fill="#f97316" fontWeight="bold">3</text>
        <text x="265" y="220" fill="#f59e0b" fontWeight="bold">4</text>
      </g>
      
      {/* Temperature/Pressure labels */}
      <text x="45" y="215" className="text-xs fill-blue-600">40°F, Low P</text>
      <text x="195" y="45" className="text-xs fill-red-600">165°F, High P</text>
      <text x="300" y="45" className="text-xs fill-orange-600">95°F, High P</text>
      <text x="270" y="215" className="text-xs fill-amber-600">38°F, Low P</text>
    </svg>
  );
};

// ============================================
// STEP INFO PANEL
// ============================================

const StepInfoPanel: React.FC<{
  step: CycleStep;
  view: 'engineer' | 'sales';
  onViewChange: (view: 'engineer' | 'sales') => void;
}> = ({ step, view, onViewChange }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {/* Enhanced Header */}
      <div 
        className="p-5 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${step.color}20 0%, ${step.color}40 100%)`,
          borderBottom: `3px solid ${step.color}` 
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ backgroundColor: step.color, borderRadius: '0 0 0 100%' }} />
        <div className="flex items-center gap-4 relative">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
            style={{ backgroundColor: step.color }}
          >
            {step.id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-lg">{step.name}</h3>
              <span className="px-2 py-0.5 bg-white/70 rounded-full text-xs font-medium" style={{ color: step.color }}>
                {step.shortName}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{step.process}</p>
            <p className="text-xs text-gray-500 mt-1">Component: <span className="font-semibold">{step.component}</span></p>
          </div>
        </div>
      </div>
      
      {/* Description Card */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
      </div>
      
      {/* Conditions Grid */}
      <div className="p-4 bg-gray-50 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Gauge className="w-3 h-3" />
          Thermodynamic State
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(step.conditions).map(([key, value]) => (
            <div key={key} className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 capitalize">{key}</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">{value}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Enhanced Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => onViewChange('engineer')}
          className={`flex-1 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            view === 'engineer'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Engineering
        </button>
        <button
          onClick={() => onViewChange('sales')}
          className={`flex-1 py-3 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            view === 'sales'
              ? 'text-emerald-600 border-b-2 border-emerald-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Sales Playbook
        </button>
      </div>
      
      {/* Enhanced Notes */}
      <div className="p-4">
        {view === 'engineer' ? (
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {step.engineerNote}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Extract and format sales content */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">The Pitch</span>
              </div>
              <div className="text-sm text-gray-700 italic leading-relaxed">
                {step.salesNote.split('\n').filter(line => line.trim()).slice(0, 3).join(' ').substring(0, 200)}...
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {step.salesNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const RefrigerationCycleAnimation: React.FC<RefrigerationCycleAnimationProps> = ({
  title = 'The Refrigeration Cycle',
  refrigerant = 'R-134a',
  autoPlay = false,
  showPHDiagram = true,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showDiagram, setShowDiagram] = useState<'schematic' | 'ph'>('schematic');
  const [infoView, setInfoView] = useState<'engineer' | 'sales'>('engineer');
  
  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => (prev % 4) + 1);
    }, 3000);
    
    return () => clearInterval(timer);
  }, [isPlaying]);
  
  const handlePrev = () => {
    setCurrentStep(prev => prev === 1 ? 4 : prev - 1);
    setIsPlaying(false);
  };
  
  const handleNext = () => {
    setCurrentStep(prev => (prev % 4) + 1);
    setIsPlaying(false);
  };
  
  const handleReset = () => {
    setCurrentStep(1);
    setIsPlaying(false);
  };
  
  const currentStepData = CYCLE_STEPS[currentStep - 1];
  
  return (
    <div className="refrigeration-cycle-animation">
      {/* Enhanced Header */}
      {title && (
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Understanding the vapor-compression refrigeration cycle ({refrigerant})
            </p>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagram section */}
        <div className="space-y-4">
          {/* Diagram toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowDiagram('schematic')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showDiagram === 'schematic'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Schematic
              </button>
              {showPHDiagram && (
                <button
                  onClick={() => setShowDiagram('ph')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    showDiagram === 'ph'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  P-h Diagram
                </button>
              )}
            </div>
            
            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Previous step"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg transition-colors ${
                  isPlaying ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={handleNext}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Next step"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-2"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          {/* Diagram */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            {showDiagram === 'schematic' ? (
              <SchematicDiagram currentStep={currentStep} isAnimating={isPlaying} />
            ) : (
              <PHDiagram currentStep={currentStep} isAnimating={isPlaying} />
            )}
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2">
            {CYCLE_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStep(step.id);
                  setIsPlaying(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentStep === step.id
                    ? 'bg-white shadow-md border-2'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-transparent'
                }`}
                style={{
                  borderColor: currentStep === step.id ? step.color : 'transparent',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: step.color }}
                >
                  {step.id}
                </div>
                <span className="hidden sm:inline">{step.shortName}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Info panel */}
        <div>
          <StepInfoPanel
            step={currentStepData}
            view={infoView}
            onViewChange={setInfoView}
          />
          
          {/* Quick reference */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900 mb-1">Key Efficiency Insight</h4>
                <p className="text-xs text-blue-800">
                  <strong>Lift = T_condenser - T_evaporator.</strong> Every 1°F reduction in lift 
                  saves ~2% compressor energy. Lower condenser temp (VFD tower fans) + higher 
                  evaporator temp (CHW reset) = 20-30% savings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefrigerationCycleAnimation;
