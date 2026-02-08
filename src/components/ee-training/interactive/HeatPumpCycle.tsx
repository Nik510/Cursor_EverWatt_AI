/**
 * HeatPumpCycle Component
 * Animated heat pump heating cycle showing how heat is extracted from cold outdoor air
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Thermometer, Zap, Wind, Droplets } from 'lucide-react';

interface CycleStep {
  id: number;
  name: string;
  description: string;
  engineering: {
    process: string;
    temp: string;
    pressure: string;
    state: string;
  };
  sales: {
    analogy: string;
    benefit: string;
  };
}

export interface HeatPumpCycleProps {
  title?: string;
  outdoorTemp?: number;
  mode?: 'heating' | 'cooling';
  className?: string;
}

const heatingCycleSteps: CycleStep[] = [
  {
    id: 1,
    name: 'Evaporation',
    description: 'Refrigerant absorbs heat from cold outdoor air',
    engineering: {
      process: 'Low-pressure liquid refrigerant evaporates by absorbing heat from outdoor air (even at 20°F, there is heat energy to extract).',
      temp: '-10°F to 20°F',
      pressure: 'Low (50-80 psig)',
      state: 'Liquid → Vapor',
    },
    sales: {
      analogy: 'Just like your skin feels cold when water evaporates, the refrigerant feels cold as it evaporates - but it is pulling heat from the air.',
      benefit: 'This is the magic - extracting usable heat from cold air!',
    },
  },
  {
    id: 2,
    name: 'Compression',
    description: 'Compressor raises temperature and pressure',
    engineering: {
      process: 'Compressor adds work to the vapor, dramatically increasing both pressure and temperature. This is where electrical energy enters the cycle.',
      temp: '120°F to 180°F',
      pressure: 'High (200-400 psig)',
      state: 'Hot Vapor',
    },
    sales: {
      analogy: 'Like a bicycle pump getting hot when you compress air. We are concentrating the heat we collected outside.',
      benefit: 'The compressor is the only part that uses significant electricity.',
    },
  },
  {
    id: 3,
    name: 'Condensation',
    description: 'Hot refrigerant releases heat to indoor air',
    engineering: {
      process: 'Hot, high-pressure vapor condenses in the indoor coil, releasing heat to the indoor air or water. This is where useful heating is delivered.',
      temp: '90°F to 130°F',
      pressure: 'High (200-400 psig)',
      state: 'Vapor → Liquid',
    },
    sales: {
      analogy: 'The opposite of evaporation - when steam condenses on a cold mirror, it releases heat. Here we release that heat into your building.',
      benefit: 'This is where you get 3-4 times more heat than the electricity you put in!',
    },
  },
  {
    id: 4,
    name: 'Expansion',
    description: 'Pressure drops to restart the cycle',
    engineering: {
      process: 'Expansion valve (TXV or EEV) drops pressure, cooling the refrigerant before it returns to the evaporator. No work is done here.',
      temp: '-10°F to 20°F',
      pressure: 'Low (50-80 psig)',
      state: 'Liquid/Vapor Mix',
    },
    sales: {
      analogy: 'Like releasing pressure from a spray can - it gets cold. This preps the refrigerant to absorb more outdoor heat.',
      benefit: 'Simple but essential - resets the cycle to collect more free outdoor heat.',
    },
  },
];

export const HeatPumpCycle: React.FC<HeatPumpCycleProps> = ({
  title = 'Heat Pump Heating Cycle',
  outdoorTemp = 35,
  mode = 'heating',
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'engineering' | 'sales'>('engineering');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev % 4) + 1);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const step = heatingCycleSteps.find((s) => s.id === currentStep)!;

  // Calculate COP based on outdoor temp
  const cop = outdoorTemp >= 47 ? 4.0 : outdoorTemp >= 30 ? 3.0 : outdoorTemp >= 17 ? 2.5 : 2.0;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Thermometer className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">
              Outdoor temp: {outdoorTemp}°F | COP: {cop.toFixed(1)} ({(cop * 100).toFixed(0)}% efficient)
            </p>
          </div>
        </div>

        {/* COP indicator */}
        <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-600">{cop.toFixed(1)}x</div>
          <div className="text-xs text-green-600">Heat Output</div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Animated diagram */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-50 via-gray-50 to-orange-50 rounded-xl p-4 min-h-[400px]">
          <svg viewBox="0 0 500 350" className="w-full h-full">
            {/* Outdoor unit (evaporator in heating mode) */}
            <g transform="translate(20, 100)">
              <rect x="0" y="0" width="120" height="150" rx="10" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
              <text x="60" y="25" textAnchor="middle" className="text-xs font-semibold fill-blue-700">OUTDOOR UNIT</text>
              
              {/* Fan */}
              <circle cx="60" cy="80" r="35" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
              <g transform="translate(60, 80)">
                <line x1="-25" y1="0" x2="25" y2="0" stroke="#0284c7" strokeWidth="3">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" repeatCount="indefinite" />
                </line>
                <line x1="0" y1="-25" x2="0" y2="25" stroke="#0284c7" strokeWidth="3">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s" repeatCount="indefinite" />
                </line>
              </g>
              
              {/* Cold air arrows */}
              <path d="M-20 60 L0 60" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrowBlue)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
              </path>
              <path d="M-20 100 L0 100" stroke="#60a5fa" strokeWidth="2" markerEnd="url(#arrowBlue)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
              </path>
              
              {/* Temp label */}
              <text x="60" y="145" textAnchor="middle" className="text-sm fill-blue-600">{outdoorTemp}°F</text>
            </g>

            {/* Indoor unit (condenser in heating mode) */}
            <g transform="translate(360, 100)">
              <rect x="0" y="0" width="120" height="150" rx="10" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
              <text x="60" y="25" textAnchor="middle" className="text-xs font-semibold fill-orange-700">INDOOR UNIT</text>
              
              {/* Coil representation */}
              <path d="M20 50 L100 50 L100 60 L20 60 L20 70 L100 70 L100 80 L20 80 L20 90 L100 90 L100 100 L20 100" 
                    stroke="#f97316" strokeWidth="3" fill="none" />
              
              {/* Warm air arrows */}
              <path d="M120 60 L140 60" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrowOrange)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
              </path>
              <path d="M120 100 L140 100" stroke="#f97316" strokeWidth="2" markerEnd="url(#arrowOrange)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.5s" />
              </path>
              
              {/* Temp label */}
              <text x="60" y="145" textAnchor="middle" className="text-sm fill-orange-600">70°F</text>
            </g>

            {/* Compressor */}
            <g transform="translate(200, 50)">
              <rect x="0" y="0" width="80" height="60" rx="10" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
              <text x="40" y="25" textAnchor="middle" className="text-xs font-semibold fill-pink-700">COMPRESSOR</text>
              <Zap x="25" y="30" className="w-6 h-6 text-pink-500" />
              <text x="40" y="55" textAnchor="middle" className="text-xs fill-pink-600">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
                ⚡ Power
              </text>
            </g>

            {/* Expansion valve */}
            <g transform="translate(200, 280)">
              <rect x="0" y="0" width="80" height="40" rx="5" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2" />
              <text x="40" y="25" textAnchor="middle" className="text-xs font-semibold fill-indigo-700">EXPANSION</text>
            </g>

            {/* Refrigerant flow lines */}
            {/* Evaporator to Compressor (cold vapor) */}
            <path d="M140 175 L200 175 L200 110" stroke="#60a5fa" strokeWidth="4" fill="none" strokeDasharray="10,5">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>
            
            {/* Compressor to Condenser (hot vapor) */}
            <path d="M280 80 L340 80 L340 175 L360 175" stroke="#ef4444" strokeWidth="4" fill="none" strokeDasharray="10,5">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>
            
            {/* Condenser to Expansion (warm liquid) */}
            <path d="M420 250 L420 300 L280 300" stroke="#f97316" strokeWidth="4" fill="none" strokeDasharray="10,5">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>
            
            {/* Expansion to Evaporator (cold mix) */}
            <path d="M200 300 L80 300 L80 250" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray="10,5">
              <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1s" repeatCount="indefinite" />
            </path>

            {/* Step indicators */}
            <g>
              <circle cx="170" cy="140" r="20" fill={currentStep === 1 ? '#3b82f6' : '#e5e7eb'} />
              <text x="170" y="145" textAnchor="middle" className="text-sm font-bold fill-white">1</text>
              
              <circle cx="240" cy="70" r="20" fill={currentStep === 2 ? '#ec4899' : '#e5e7eb'} />
              <text x="240" y="75" textAnchor="middle" className="text-sm font-bold fill-white">2</text>
              
              <circle cx="390" cy="200" r="20" fill={currentStep === 3 ? '#f97316' : '#e5e7eb'} />
              <text x="390" y="205" textAnchor="middle" className="text-sm font-bold fill-white">3</text>
              
              <circle cx="240" cy="280" r="20" fill={currentStep === 4 ? '#6366f1' : '#e5e7eb'} />
              <text x="240" y="285" textAnchor="middle" className="text-sm font-bold fill-white">4</text>
            </g>

            {/* Arrow markers */}
            <defs>
              <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
              </marker>
              <marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <path d="M0,0 L0,6 L9,3 z" fill="#f97316" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* Step info panel */}
        <div className="w-80">
          {/* Playback controls */}
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gray-100 rounded-lg">
            <button
              onClick={() => setCurrentStep((prev) => (prev === 1 ? 4 : prev - 1))}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <SkipBack className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-full transition-colors ${
                isPlaying ? 'bg-orange-500 text-white' : 'bg-white border border-gray-300 text-gray-700'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCurrentStep((prev) => (prev % 4) + 1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <SkipForward className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Step progress */}
          <div className="flex gap-2 mb-4">
            {heatingCycleSteps.map((s) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(s.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  currentStep === s.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.id}. {s.name}
              </button>
            ))}
          </div>

          {/* Step details */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
              <div className="text-sm opacity-80">Step {step.id} of 4</div>
              <h4 className="text-lg font-bold">{step.name}</h4>
              <p className="text-sm opacity-90">{step.description}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('engineering')}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'engineering'
                    ? 'text-orange-600 border-b-2 border-orange-500'
                    : 'text-gray-500'
                }`}
              >
                🔧 Technical
              </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`flex-1 py-2 text-sm font-medium ${
                  activeTab === 'sales'
                    ? 'text-orange-600 border-b-2 border-orange-500'
                    : 'text-gray-500'
                }`}
              >
                💼 Sales
              </button>
            </div>

            <div className="p-4 space-y-3">
              {activeTab === 'engineering' ? (
                <>
                  <p className="text-sm text-gray-600">{step.engineering.process}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-white rounded-lg text-center border border-gray-200">
                      <div className="text-xs text-gray-500">Temp</div>
                      <div className="text-sm font-semibold text-gray-900">{step.engineering.temp}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center border border-gray-200">
                      <div className="text-xs text-gray-500">Pressure</div>
                      <div className="text-sm font-semibold text-gray-900">{step.engineering.pressure}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg text-center border border-gray-200">
                      <div className="text-xs text-gray-500">State</div>
                      <div className="text-sm font-semibold text-gray-900">{step.engineering.state}</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-600 mb-1">Analogy</div>
                    <p className="text-sm text-gray-700">{step.sales.analogy}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs text-green-600 mb-1">Key Benefit</div>
                    <p className="text-sm text-gray-700">{step.sales.benefit}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatPumpCycle;
