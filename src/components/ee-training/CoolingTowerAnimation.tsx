/**
 * CoolingTowerAnimation Component
 * Animated cooling tower diagram showing evaporative cooling process
 * With water flow, evaporation, and performance metrics
 */

import React, { useState } from 'react';
import { Droplets, Wind, Thermometer, Gauge, Settings, DollarSign, Info, TrendingUp } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface TowerConfig {
  enteringWaterTemp: number;
  leavingWaterTemp: number;
  wetBulbTemp: number;
  fanSpeed: number; // 0-100%
  waterFlow: number; // GPM
}

interface CoolingTowerAnimationProps {
  title?: string;
  towerType?: 'crossflow' | 'counterflow';
  showCalculator?: boolean;
  interactive?: boolean;
}

// ============================================
// PERFORMANCE CALCULATIONS
// ============================================

const calculatePerformance = (config: TowerConfig) => {
  const range = config.enteringWaterTemp - config.leavingWaterTemp;
  const approach = config.leavingWaterTemp - config.wetBulbTemp;
  const effectiveness = (range / (range + approach)) * 100;
  
  // Approximate heat rejection (BTU/hr) = 500 × GPM × ΔT
  const heatRejection = 500 * config.waterFlow * range;
  
  // Approximate evaporation rate (GPM) ≈ 0.001 × GPM × Range
  const evaporationRate = 0.001 * config.waterFlow * range;
  
  // Fan power estimate (kW) based on speed cubed (affinity laws)
  const baseFanPower = 25; // kW at 100% speed
  const fanPower = baseFanPower * Math.pow(config.fanSpeed / 100, 3);
  
  return {
    range,
    approach,
    effectiveness: Math.round(effectiveness),
    heatRejection: Math.round(heatRejection / 1000000 * 100) / 100, // Million BTU/hr
    evaporationRate: Math.round(evaporationRate * 10) / 10,
    fanPower: Math.round(fanPower * 10) / 10,
    status: approach <= 7 ? 'good' : approach <= 10 ? 'fair' : 'poor',
  };
};

// ============================================
// ANIMATED TOWER SVG
// ============================================

const TowerSVG: React.FC<{
  config: TowerConfig;
  towerType: 'crossflow' | 'counterflow';
}> = ({ config, towerType }) => {
  const fanSpeedDuration = 3 - (config.fanSpeed / 100) * 2; // 1-3 seconds
  const dropletCount = Math.ceil(config.waterFlow / 200); // More droplets for higher flow
  
  return (
    <svg viewBox="0 0 400 450" className="w-full h-auto">
      <defs>
        <pattern id="tower-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
        </pattern>
        
        {/* Evaporation particles */}
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
        </filter>
        
        {/* Water gradient */}
        <linearGradient id="water-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        
        {/* Hot water gradient */}
        <linearGradient id="hot-water" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      
      <rect width="400" height="450" fill="url(#tower-grid)" />
      
      {/* Title */}
      <text x="200" y="25" textAnchor="middle" className="text-sm font-bold fill-gray-800">
        {towerType === 'crossflow' ? 'Crossflow Cooling Tower' : 'Counterflow Cooling Tower'}
      </text>
      
      {/* Tower Structure */}
      <g transform="translate(100, 50)">
        {/* Main tower body - trapezoid */}
        <path
          d="M 20 320 L 50 60 L 150 60 L 180 320 Z"
          fill="#f8fafc"
          stroke="#64748b"
          strokeWidth="3"
        />
        
        {/* Fill media section */}
        <rect x="40" y="140" width="120" height="100" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="45"
            y1={150 + i * 20}
            x2="155"
            y2={150 + i * 20}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="8,4"
          />
        ))}
        <text x="100" y="195" textAnchor="middle" className="text-xs fill-gray-500">Fill Media</text>
        
        {/* Water distribution deck */}
        <rect x="35" y="120" width="130" height="15" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
        <text x="100" y="115" textAnchor="middle" className="text-xs fill-gray-600">Distribution</text>
        
        {/* Hot water inlet pipe */}
        <rect x="160" y="100" width="50" height="20" fill="url(#hot-water)" stroke="#dc2626" strokeWidth="2" rx="3" />
        <text x="185" y="95" textAnchor="middle" className="text-xs fill-red-600 font-semibold">
          {config.enteringWaterTemp}°F
        </text>
        {/* Animated flow in hot pipe */}
        <circle r="4" fill="#fca5a5">
          <animateMotion dur="1s" repeatCount="indefinite" path="M 210 110 L 160 110" />
        </circle>
        
        {/* Water spray/distribution */}
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={i}>
            <line
              x1={50 + i * 15}
              y1="135"
              x2={50 + i * 15}
              y2="140"
              stroke="#60a5fa"
              strokeWidth="2"
            />
          </g>
        ))}
        
        {/* Falling water droplets through fill */}
        {Array.from({ length: dropletCount }).map((_, i) => (
          <circle
            key={i}
            cx={55 + (i % 6) * 20}
            cy="160"
            r="3"
            fill="#60a5fa"
          >
            <animate
              attributeName="cy"
              values="145;235;145"
              dur={`${1.5 + (i * 0.2)}s`}
              begin={`${i * 0.15}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.8;0.4;0.8"
              dur={`${1.5 + (i * 0.2)}s`}
              begin={`${i * 0.15}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
        
        {/* Air flow arrows */}
        {towerType === 'crossflow' ? (
          // Crossflow - air enters from sides
          <g>
            {[0, 1, 2].map((i) => (
              <g key={i}>
                <path
                  d={`M 0 ${170 + i * 25} L 35 ${170 + i * 25}`}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  markerEnd="url(#air-arrow)"
                />
                <path
                  d={`M 200 ${170 + i * 25} L 165 ${170 + i * 25}`}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  markerEnd="url(#air-arrow)"
                />
              </g>
            ))}
            <text x="-15" y="195" className="text-xs fill-gray-400">Air →</text>
            <text x="205" y="195" className="text-xs fill-gray-400">← Air</text>
          </g>
        ) : (
          // Counterflow - air enters from bottom
          <g>
            {[0, 1, 2].map((i) => (
              <path
                key={i}
                d={`M ${70 + i * 30} 310 L ${70 + i * 30} 245`}
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4,4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  values="0;-8"
                  dur="0.5s"
                  repeatCount="indefinite"
                />
              </path>
            ))}
            <text x="100" y="335" textAnchor="middle" className="text-xs fill-gray-400">↑ Air Flow ↑</text>
          </g>
        )}
        
        {/* Fan housing */}
        <ellipse cx="100" cy="55" rx="45" ry="15" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
        
        {/* Spinning fan */}
        <g transform="translate(100, 55)">
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <rect
              key={i}
              x="-4"
              y="-35"
              width="8"
              height="30"
              fill="#475569"
              rx="2"
              transform={`rotate(${angle})`}
            />
          ))}
          {config.fanSpeed > 0 && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0"
              to="360"
              dur={`${fanSpeedDuration}s`}
              repeatCount="indefinite"
            />
          )}
        </g>
        
        {/* Evaporation vapor */}
        {config.fanSpeed > 0 && Array.from({ length: 5 }).map((_, i) => (
          <g key={i} filter="url(#blur)">
            <circle
              cx={70 + i * 15}
              cy="40"
              r="6"
              fill="#dbeafe"
              opacity="0.6"
            >
              <animate
                attributeName="cy"
                values="40;-10"
                dur="2s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0"
                dur="2s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="6;15"
                dur="2s"
                begin={`${i * 0.3}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
        
        {/* Cold water basin */}
        <rect x="30" y="285" width="140" height="35" fill="url(#water-gradient)" stroke="#1d4ed8" strokeWidth="2" rx="4" />
        <text x="100" y="307" textAnchor="middle" className="text-xs fill-white font-semibold">Basin</text>
        
        {/* Cold water outlet pipe */}
        <rect x="-20" y="290" width="50" height="20" fill="url(#water-gradient)" stroke="#1d4ed8" strokeWidth="2" rx="3" />
        <text x="5" y="285" textAnchor="middle" className="text-xs fill-blue-600 font-semibold">
          {config.leavingWaterTemp}°F
        </text>
        {/* Animated flow in cold pipe */}
        <circle r="4" fill="#93c5fd">
          <animateMotion dur="1s" repeatCount="indefinite" path="M 30 300 L -20 300" />
        </circle>
        
        {/* Fan speed indicator */}
        <text x="100" y="15" textAnchor="middle" className="text-xs fill-gray-600">
          Fan: {config.fanSpeed}% speed
        </text>
      </g>
      
      {/* Ambient conditions */}
      <g transform="translate(320, 120)">
        <rect x="0" y="0" width="70" height="80" fill="white" stroke="#e2e8f0" strokeWidth="1" rx="4" />
        <text x="35" y="20" textAnchor="middle" className="text-xs font-semibold fill-gray-700">Ambient</text>
        <Thermometer className="w-4 h-4 text-gray-500" x="10" y="30" />
        <text x="55" y="42" textAnchor="end" className="text-xs fill-gray-600">WB: {config.wetBulbTemp}°F</text>
        <Wind className="w-4 h-4 text-gray-500" x="10" y="55" />
        <text x="55" y="67" textAnchor="end" className="text-xs fill-gray-600">Air In</text>
      </g>
      
      {/* Flow rate label */}
      <g transform="translate(10, 380)">
        <Droplets className="w-4 h-4 text-blue-500" />
        <text x="22" y="12" className="text-xs fill-gray-600">Flow: {config.waterFlow} GPM</text>
      </g>
      
      {/* Legend */}
      <g transform="translate(20, 420)">
        <rect x="0" y="0" width="360" height="25" fill="white" fillOpacity="0.9" rx="4" stroke="#e5e7eb" />
        <circle cx="20" cy="12" r="5" fill="#ef4444" />
        <text x="30" y="16" className="text-xs fill-gray-600">Hot Water In</text>
        <circle cx="120" cy="12" r="5" fill="#3b82f6" />
        <text x="130" y="16" className="text-xs fill-gray-600">Cold Water Out</text>
        <circle cx="230" cy="12" r="5" fill="#dbeafe" opacity="0.7" />
        <text x="240" y="16" className="text-xs fill-gray-600">Evaporation</text>
      </g>
    </svg>
  );
};

// ============================================
// PERFORMANCE PANEL
// ============================================

const PerformancePanel: React.FC<{
  config: TowerConfig;
  performance: ReturnType<typeof calculatePerformance>;
}> = ({ config, performance }) => {
  const statusConfig = {
    good: { 
      bg: 'bg-gradient-to-r from-emerald-500 to-green-500', 
      text: 'text-white',
      icon: '✓',
      message: 'Excellent efficiency - Approach ≤7°F'
    },
    fair: { 
      bg: 'bg-gradient-to-r from-amber-500 to-orange-500', 
      text: 'text-white',
      icon: '!',
      message: 'Check fill condition - Approach 7-10°F'
    },
    poor: { 
      bg: 'bg-gradient-to-r from-red-500 to-rose-500', 
      text: 'text-white',
      icon: '✕',
      message: 'Needs maintenance - Approach >10°F'
    },
  };
  
  const status = statusConfig[performance.status];
  const fanSavings = Math.round((25 - performance.fanPower) * 2000 * 0.12);
  const chillerSavings = Math.round(500 * 0.55 * 2000 * 0.12 * (95 - config.leavingWaterTemp) * 0.015);
  const totalSavings = fanSavings + chillerSavings;
  
  return (
    <div className="space-y-4">
      {/* Status indicator - Enhanced */}
      <div className={`rounded-xl p-4 ${status.bg} shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
            {status.icon}
          </div>
          <div className={status.text}>
            <div className="font-bold text-lg capitalize">Performance: {performance.status}</div>
            <p className="text-sm opacity-90">{status.message}</p>
          </div>
        </div>
      </div>
      
      {/* Key Metrics - Redesigned */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Range</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{performance.range}°F</div>
          <div className="text-xs text-gray-400 mt-1">EWT - LWT</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              performance.approach <= 7 ? 'bg-green-100' : 
              performance.approach <= 10 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <Gauge className={`w-4 h-4 ${
                performance.approach <= 7 ? 'text-green-600' : 
                performance.approach <= 10 ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Approach</span>
          </div>
          <div className={`text-2xl font-bold ${
            performance.approach <= 7 ? 'text-green-600' : 
            performance.approach <= 10 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {performance.approach}°F
          </div>
          <div className="text-xs text-gray-400 mt-1">LWT - Wet Bulb</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Effectiveness</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{performance.effectiveness}%</div>
          <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" 
              style={{ width: `${performance.effectiveness}%` }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wind className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fan Power</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{performance.fanPower} kW</div>
          <div className="text-xs text-gray-400 mt-1">At {config.fanSpeed}% speed</div>
        </div>
      </div>
      
      {/* Savings Calculator - Enhanced */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-lg">VFD Savings Calculator</h4>
            <p className="text-emerald-100 text-sm">Based on current settings</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-100 mb-1">Fan Savings</div>
            <div className="text-xl font-bold">${fanSavings.toLocaleString()}</div>
            <div className="text-xs text-emerald-200">/year</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-100 mb-1">Chiller Bonus</div>
            <div className="text-xl font-bold">${chillerSavings.toLocaleString()}</div>
            <div className="text-xs text-emerald-200">/year</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center border border-white/30">
            <div className="text-xs text-white mb-1">Total Savings</div>
            <div className="text-2xl font-bold">${totalSavings.toLocaleString()}</div>
            <div className="text-xs text-emerald-100">/year</div>
          </div>
        </div>
        
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Estimated Payback</span>
            <span className="font-bold text-lg">
              {totalSavings > 0 ? (18000 / totalSavings).toFixed(1) : '∞'} years
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, (totalSavings / 18000) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-emerald-100 mt-2">
            VFD install cost: ~$18,000 • Operating hours: 2,000/year • Rate: $0.12/kWh
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// CONFIGURATION PANEL
// ============================================

const ConfigPanel: React.FC<{
  config: TowerConfig;
  onChange: (config: TowerConfig) => void;
}> = ({ config, onChange }) => {
  const handleChange = (key: keyof TowerConfig, value: number) => {
    onChange({ ...config, [key]: value });
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-gray-600" />
        <h4 className="font-semibold text-gray-900">Tower Configuration</h4>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-600 block mb-1">Entering Water Temp (°F)</label>
          <input
            type="range"
            min="80"
            max="100"
            value={config.enteringWaterTemp}
            onChange={(e) => handleChange('enteringWaterTemp', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-sm font-medium text-red-600">{config.enteringWaterTemp}°F</div>
        </div>
        
        <div>
          <label className="text-xs text-gray-600 block mb-1">Leaving Water Temp (°F)</label>
          <input
            type="range"
            min="70"
            max="90"
            value={config.leavingWaterTemp}
            onChange={(e) => handleChange('leavingWaterTemp', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-sm font-medium text-blue-600">{config.leavingWaterTemp}°F</div>
        </div>
        
        <div>
          <label className="text-xs text-gray-600 block mb-1">Wet Bulb Temperature (°F)</label>
          <input
            type="range"
            min="60"
            max="80"
            value={config.wetBulbTemp}
            onChange={(e) => handleChange('wetBulbTemp', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-sm font-medium text-gray-600">{config.wetBulbTemp}°F</div>
        </div>
        
        <div>
          <label className="text-xs text-gray-600 block mb-1">Fan Speed (%)</label>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={config.fanSpeed}
            onChange={(e) => handleChange('fanSpeed', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-sm font-medium text-purple-600">{config.fanSpeed}%</div>
        </div>
        
        <div>
          <label className="text-xs text-gray-600 block mb-1">Water Flow (GPM)</label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={config.waterFlow}
            onChange={(e) => handleChange('waterFlow', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-right text-sm font-medium text-blue-600">{config.waterFlow} GPM</div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// INSIGHTS PANEL
// ============================================

const InsightsPanel: React.FC<{
  performance: ReturnType<typeof calculatePerformance>;
}> = ({ performance }) => {
  return (
    <div className="space-y-4">
      {/* Engineering Insights */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Info className="w-4 h-4 text-white" />
          </div>
          <h4 className="font-bold text-blue-900">Engineering Insights</h4>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">Approach Temperature</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              The key metric. Lower approach = better tower performance.
              Target: 5-7°F. Above 10°F indicates fouled fill or undersized tower.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-900">VFD Cube Law</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              Fan power follows the cube law: 50% speed = 12.5% power.
              This is why VFDs have the best ROI of any chiller plant upgrade.
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-cyan-600" />
              <span className="font-semibold text-gray-900">Water Treatment</span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              Scale buildup increases approach temp and reduces efficiency.
              Target: 4-6 cycles of concentration to balance efficiency and water use.
            </p>
          </div>
        </div>
      </div>
      
      {/* Sales Playbook */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h4 className="font-bold">Sales Playbook</h4>
        </div>
        
        {/* The Hook */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/20">
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">🎣 The Hook</div>
          <p className="text-sm text-gray-200 italic">
            "Let me ask you something - are your tower fans running at 100% speed right now?"
            [They almost always are]
            "That's costing you about $8,000 per year in wasted electricity."
          </p>
        </div>
        
        {/* The Pitch */}
        <div className="bg-emerald-500/20 rounded-lg p-3 mb-3 border border-emerald-500/30">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">💬 The Pitch</div>
          <p className="text-sm text-gray-200">
            "Your tower fans are running full speed 24/7 when they could run at 50% most of the time.
            That's like driving your car with your foot on the gas all the time.
            VFD tower fans save 30-50% on fan energy AND make your chiller more efficient.
            Two savings for the price of one. Payback: less than 2 years."
          </p>
        </div>
        
        {/* Objection Handler */}
        <div className="bg-red-500/20 rounded-lg p-3 mb-3 border border-red-500/30">
          <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">⚠️ Objection: "We don't have budget"</div>
          <p className="text-sm text-gray-200">
            "I hear you. But here's the thing - VFD tower fans pay for themselves in 18 months.
            After that, you're making money every single day. Some utilities even offer rebates
            that cut the payback to under a year. Can I show you the numbers?"
          </p>
        </div>
        
        {/* The Close */}
        <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">🎯 The Close</div>
          <p className="text-sm text-gray-200">
            "This is the single best ROI upgrade in a chiller plant. Under two years payback, guaranteed.
            Want me to write this up as a proposal? I can have numbers on your desk by Friday."
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CoolingTowerAnimation: React.FC<CoolingTowerAnimationProps> = ({
  title = 'Cooling Tower Operation',
  towerType = 'counterflow',
  showCalculator = true,
  interactive = true,
}) => {
  const [config, setConfig] = useState<TowerConfig>({
    enteringWaterTemp: 95,
    leavingWaterTemp: 85,
    wetBulbTemp: 78,
    fanSpeed: 100,
    waterFlow: 500,
  });
  
  const [activeTab, setActiveTab] = useState<'performance' | 'insights'>('performance');
  
  const performance = calculatePerformance(config);
  
  return (
    <div className="cooling-tower-animation">
      {/* Enhanced Header */}
      {title && (
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Droplets className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Interactive evaporative cooling demonstration - adjust parameters to see effects
            </p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tower diagram */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <TowerSVG config={config} towerType={towerType} />
          </div>
          
          {/* Configuration controls */}
          {interactive && showCalculator && (
            <div className="mt-4">
              <ConfigPanel config={config} onChange={setConfig} />
            </div>
          )}
        </div>
        
        {/* Info panel */}
        <div className="space-y-4">
          {/* Tab buttons */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'performance'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              📊 Performance
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === 'insights'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              💡 Insights
            </button>
          </div>
          
          {/* Tab content */}
          {activeTab === 'performance' ? (
            <PerformancePanel config={config} performance={performance} />
          ) : (
            <InsightsPanel performance={performance} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CoolingTowerAnimation;
