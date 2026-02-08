import React, { useState } from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface BatteryType {
  id: string;
  name: string;
  capacity: string;
  power: string;
  efficiency: string;
  description: string;
  color: string;
}

interface InteractiveBatterySchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

const BATTERY_TYPES: BatteryType[] = [
  {
    id: 'lithium-ion',
    name: 'Lithium-Ion (Li-Ion)',
    capacity: '1-10 MWh',
    power: '500 kW - 5 MW',
    efficiency: '85-95%',
    description: 'Most common, high energy density',
    color: 'blue',
  },
  {
    id: 'lithium-iron-phosphate',
    name: 'LFP (LiFePO₄)',
    capacity: '500 kWh - 5 MWh',
    power: '250 kW - 2.5 MW',
    efficiency: '90-95%',
    description: 'Long cycle life, safer chemistry',
    color: 'green',
  },
  {
    id: 'flow-battery',
    name: 'Flow Battery',
    capacity: '2-100 MWh',
    power: '500 kW - 20 MW',
    efficiency: '65-75%',
    description: 'Long duration, scalable capacity',
    color: 'purple',
  },
  {
    id: 'sodium-ion',
    name: 'Sodium-Ion',
    capacity: '500 kWh - 2 MWh',
    power: '250 kW - 1 MW',
    efficiency: '85-90%',
    description: 'Lower cost, abundant materials',
    color: 'orange',
  },
];

export const InteractiveBatterySchematic: React.FC<InteractiveBatterySchematicProps> = ({ 
  activeComponent, 
  setActiveComponent, 
  tooltipData 
}) => {
  const [selectedBatteryType, setSelectedBatteryType] = useState<BatteryType | null>(BATTERY_TYPES[0]);
  const [animatingFlow, setAnimatingFlow] = useState(true);
  const [operationMode, setOperationMode] = useState<'normal' | 'charging' | 'discharging'>('discharging');

  const getBatteryColor = () => {
    if (!selectedBatteryType) return '#3b82f6';
    const colors: Record<string, string> = {
      blue: '#3b82f6',
      green: '#22c55e',
      purple: '#a855f7',
      orange: '#f97316',
    };
    return colors[selectedBatteryType.color] || '#3b82f6';
  };

  return (
    <div className="w-full space-y-6">
      {/* Battery Type Selector Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {BATTERY_TYPES.map((battery) => (
          <button
            key={battery.id}
            onClick={() => setSelectedBatteryType(battery)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-300 text-left
              ${selectedBatteryType?.id === battery.id 
                ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <h4 className="font-semibold text-sm text-gray-900 mb-2">{battery.name}</h4>
            <p className="text-xs text-gray-600 mb-2">{battery.description}</p>
            <div className="text-xs font-mono text-blue-600 mb-1">
              {battery.capacity} / {battery.power}
            </div>
            <p className="text-xs text-gray-500">Efficiency: {battery.efficiency}</p>
          </button>
        ))}
      </div>

      {/* Operation Mode Selector */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setOperationMode('normal')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            operationMode === 'normal' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Normal Operation
        </button>
        <button
          onClick={() => setOperationMode('charging')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            operationMode === 'charging' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Charging
        </button>
        <button
          onClick={() => setOperationMode('discharging')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            operationMode === 'discharging' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Peak Shaving (Discharging)
        </button>
      </div>

      {/* Main Diagram */}
      <div className="relative w-full h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden rounded-xl border border-slate-700">
        {activeComponent && tooltipData[activeComponent] && (
          <div 
            className="absolute z-20 bg-white/95 backdrop-blur-md border border-white/20 p-4 rounded-lg text-gray-900 shadow-2xl pointer-events-none" 
            style={tooltipData[activeComponent].style}
          >
            <h4 className="font-bold text-sm text-blue-600 mb-1">
              {tooltipData[activeComponent].title}
            </h4>
            <p className="text-xs text-gray-700 mb-2 max-w-[200px]">
              {tooltipData[activeComponent].desc}
            </p>
            <div className="text-[10px] font-mono bg-blue-50 px-2 py-1 rounded text-blue-700">
              {tooltipData[activeComponent].stats}
            </div>
          </div>
        )}
        
        <svg viewBox="0 0 900 600" className="w-full h-full">
          <defs>
            <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
            </marker>
            <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#3b82f6" />
            </marker>
            <marker id="arrow-yellow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#fbbf24" />
            </marker>
          </defs>

          {/* Building Load */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'building' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('building')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            <rect x="50" y="200" width="180" height="120" fill="#1e293b" stroke="#ef4444" strokeWidth="3" rx="8" />
            <text x="140" y="235" fill="#ef4444" fontSize="16" fontWeight="bold" textAnchor="middle">
              BUILDING
            </text>
            <text x="140" y="255" fill="#94a3b8" fontSize="12" textAnchor="middle">
              Demand: {operationMode === 'discharging' ? '500kW' : '300kW'}
            </text>
            <text x="140" y="275" fill="#94a3b8" fontSize="12" textAnchor="middle">
              Peak: {operationMode === 'discharging' ? '400kW' : '500kW'}
            </text>
            <text x="140" y="295" fill="#64748b" fontSize="11" textAnchor="middle">
              (After Battery)
            </text>
          </g>

          {/* Battery Bank */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'battery' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('battery')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            <rect x="350" y="150" width="120" height="220" fill="#1e293b" stroke={getBatteryColor()} strokeWidth="4" rx="8" />
            <text x="410" y="185" fill={getBatteryColor()} fontSize="16" fontWeight="bold" textAnchor="middle">
              BESS
            </text>
            <text x="410" y="205" fill="#94a3b8" fontSize="12" textAnchor="middle">
              {selectedBatteryType?.capacity || '1 MWh'}
            </text>
            <text x="410" y="225" fill="#94a3b8" fontSize="12" textAnchor="middle">
              {selectedBatteryType?.power || '500 kW'}
            </text>

            {/* Battery Cells Visualization */}
            {[0, 1, 2].map((i) => (
              <rect 
                key={i} 
                x={370 + i * 30} 
                y={250} 
                width="25" 
                height="80" 
                fill={getBatteryColor()} 
                fillOpacity={operationMode === 'discharging' ? 0.6 - i * 0.1 : 0.4 + i * 0.1}
                stroke={getBatteryColor()} 
                strokeWidth="2" 
                rx="3"
              >
                {animatingFlow && operationMode === 'discharging' && (
                  <animate attributeName="fill-opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
                )}
              </rect>
            ))}

            {/* SOC Indicator */}
            <rect x="360" y="350" width="100" height="20" rx="4" fill="#0f172a" stroke={getBatteryColor()} strokeWidth="2" />
            <rect 
              x="362" 
              y="352" 
              width={`${operationMode === 'discharging' ? 60 : operationMode === 'charging' ? 96 : 80}`} 
              height="16" 
              rx="3" 
              fill={getBatteryColor()}
            >
              {animatingFlow && (
                <animate 
                  attributeName="width" 
                  values={operationMode === 'discharging' ? '60;50;60' : operationMode === 'charging' ? '80;96;80' : '80;80;80'}
                  dur="3s" 
                  repeatCount="indefinite" 
                />
              )}
            </rect>
            <text x="410" y="365" fill="#ffffff" fontSize="11" textAnchor="middle" fontWeight="bold">
              SOC: {operationMode === 'discharging' ? '60%' : operationMode === 'charging' ? '96%' : '80%'}
            </text>
          </g>

          {/* Power Conversion System (PCS/Inverter) */}
          <g 
            className={`transition-all duration-300 cursor-pointer ${activeComponent && activeComponent !== 'inverter' ? 'opacity-30' : 'opacity-100'}`}
            onMouseEnter={() => setActiveComponent('inverter')}
            onMouseLeave={() => setActiveComponent(null)}
          >
            <rect x="320" y="235" width="70" height="50" fill="#0f172a" stroke="#22c55e" strokeWidth="3" rx="5" />
            <text x="355" y="255" fill="#22c55e" fontSize="12" fontWeight="bold" textAnchor="middle">
              PCS
            </text>
            <text x="355" y="270" fill="#94a3b8" fontSize="10" textAnchor="middle">
              {selectedBatteryType?.efficiency || '95%'} Eff
            </text>
          </g>

          {/* Grid Connection */}
          <rect x="600" y="215" width="180" height="70" fill="#1e293b" stroke="#fbbf24" strokeWidth="3" rx="8" />
          <text x="690" y="245" fill="#fbbf24" fontSize="16" fontWeight="bold" textAnchor="middle">
            UTILITY GRID
          </text>
          <text x="690" y="265" fill="#94a3b8" fontSize="12" textAnchor="middle">
            Connection Point
          </text>

          {/* Power Flow - Building to Grid (Normal) */}
          <path 
            d="M 230 260 L 600 260" 
            stroke={operationMode === 'normal' ? '#94a3b8' : '#475569'} 
            strokeWidth="6" 
            strokeDasharray="8 4"
            opacity={operationMode === 'normal' ? 1 : 0.3}
            markerEnd="url(#arrow-yellow)"
          >
            {animatingFlow && operationMode === 'normal' && (
              <animate
                attributeName="stroke-dashoffset"
                values="0;-12"
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </path>
          {operationMode === 'normal' && (
            <text x="415" y="250" fill="#94a3b8" fontSize="13" fontWeight="bold" textAnchor="middle">
              Normal: 500kW → Grid
            </text>
          )}

          {/* Power Flow - Battery Discharge (Peak Shaving) */}
          {operationMode === 'discharging' && (
            <>
              <path 
                d="M 380 260 L 270 260 L 270 240 L 230 240" 
                stroke="#22c55e" 
                strokeWidth="6"
                markerEnd="url(#arrow-green)"
              >
                {animatingFlow && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
              <text x="325" y="250" fill="#22c55e" fontSize="13" fontWeight="bold" textAnchor="middle">
                Battery Discharge: 100kW
              </text>
            </>
          )}

          {/* Power Flow - Battery Charge */}
          {operationMode === 'charging' && (
            <>
              <path 
                d="M 600 260 L 510 260 L 510 280 L 480 280" 
                stroke="#3b82f6" 
                strokeWidth="6"
                markerEnd="url(#arrow-blue)"
              >
                {animatingFlow && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="0;-12"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
              <text x="540" y="285" fill="#3b82f6" fontSize="13" fontWeight="bold" textAnchor="middle">
                Battery Charge: 100kW
              </text>
            </>
          )}

          {/* Peak Shaving Indicator */}
          <rect x="550" y="80" width="200" height="80" rx="8" fill="#1e293b" fillOpacity="0.9" stroke="#22c55e" strokeWidth="3" />
          <text x="650" y="105" fill="#22c55e" fontSize="16" fontWeight="bold" textAnchor="middle">
            Peak Shaving Impact
          </text>
          <text x="650" y="125" fill="#94a3b8" fontSize="13" textAnchor="middle">
            Original Peak: <tspan fill="#ef4444" fontWeight="bold">500kW</tspan>
          </text>
          <text x="650" y="145" fill="#94a3b8" fontSize="13" textAnchor="middle">
            New Peak: <tspan fill="#22c55e" fontWeight="bold">{operationMode === 'discharging' ? '400kW' : '500kW'}</tspan>
          </text>
          {operationMode === 'discharging' && (
            <text x="650" y="160" fill="#fbbf24" fontSize="12" textAnchor="middle">
              Savings: 100kW × $2,000/kW = $200k/year
            </text>
          )}

          {/* Demand Profile Chart */}
          <g className="opacity-80">
            <rect x="50" y="380" width="400" height="180" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="5" />
            <text x="250" y="400" fill="#94a3b8" fontSize="14" fontWeight="bold" textAnchor="middle">
              Demand Profile (24 Hours)
            </text>
            
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
              <line 
                key={i} 
                x1="60" 
                y1={420 + i * 30} 
                x2="440" 
                y2={420 + i * 30} 
                stroke="#334155" 
                strokeWidth="1" 
                strokeDasharray="2 2"
              />
            ))}

            {/* Original demand curve */}
            <polyline
              points="60,510 100,460 140,480 180,450 220,470 260,440 300,460 340,430 380,450 420,420"
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeDasharray="3 2"
            />

            {/* Shaved demand curve (when discharging) */}
            {operationMode === 'discharging' && (
              <polyline
                points="60,510 100,490 140,510 180,480 220,500 260,470 300,490 340,460 380,480 420,450"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
              >
                {animatingFlow && (
                  <animate
                    attributeName="opacity"
                    values="0.5;1;0.5"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </polyline>
            )}

            {/* Legend */}
            <circle cx="280" cy="550" r="5" fill="#ef4444" />
            <text x="295" y="554" fill="#94a3b8" fontSize="11">Original Peak</text>
            {operationMode === 'discharging' && (
              <>
                <circle cx="280" cy="570" r="5" fill="#22c55e" />
                <text x="295" y="574" fill="#94a3b8" fontSize="11">With Battery Shaving</text>
              </>
            )}
          </g>

          {/* Energy Flow Summary */}
          <rect x="500" y="380" width="320" height="180" rx="8" fill="#1e293b" fillOpacity="0.9" stroke="#3b82f6" strokeWidth="2" />
          <text x="660" y="405" fill="#3b82f6" fontSize="16" fontWeight="bold" textAnchor="middle">
            System Status
          </text>
          <text x="660" y="430" fill="#94a3b8" fontSize="12" textAnchor="middle">
            Battery Type: <tspan fill="#ffffff">{selectedBatteryType?.name || 'Lithium-Ion'}</tspan>
          </text>
          <text x="660" y="450" fill="#94a3b8" fontSize="12" textAnchor="middle">
            Mode: <tspan fill="#ffffff" fontWeight="bold">{operationMode.toUpperCase()}</tspan>
          </text>
          <text x="660" y="470" fill="#94a3b8" fontSize="12" textAnchor="middle">
            Efficiency: <tspan fill="#22c55e">{selectedBatteryType?.efficiency || '95%'}</tspan>
          </text>
          <text x="660" y="490" fill="#94a3b8" fontSize="12" textAnchor="middle">
            Round-trip Loss: <tspan fill="#ef4444">{(100 - parseFloat(selectedBatteryType?.efficiency.replace('%', '') || '95')).toFixed(1)}%</tspan>
          </text>
          {operationMode === 'discharging' && (
            <text x="660" y="510" fill="#22c55e" fontSize="13" fontWeight="bold" textAnchor="middle">
              Peak Reduction: 100kW Active
            </text>
          )}
          {operationMode === 'charging' && (
            <text x="660" y="510" fill="#3b82f6" fontSize="13" fontWeight="bold" textAnchor="middle">
              Charging: 100kW from Grid
            </text>
          )}
        </svg>

        {/* Animation Control */}
        <button
          onClick={() => setAnimatingFlow(!animatingFlow)}
          className="absolute top-4 right-4 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white text-xs rounded-lg backdrop-blur-sm transition-colors"
        >
          {animatingFlow ? '⏸️ Pause' : '▶️ Play'}
        </button>
      </div>
    </div>
  );
};

