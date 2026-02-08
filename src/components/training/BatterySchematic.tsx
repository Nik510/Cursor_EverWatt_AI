import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface BatterySchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const BatterySchematic: React.FC<BatterySchematicProps> = ({ 
  activeComponent, 
  setActiveComponent, 
  tooltipData 
}) => {
  return (
    <div className="relative w-full h-96 bg-slate-900 overflow-hidden">
      {activeComponent && tooltipData[activeComponent] && (
        <div 
          className="absolute z-20 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-lg text-white shadow-2xl pointer-events-none" 
          style={tooltipData[activeComponent].style}
        >
          <h4 className="font-bold text-sm text-yellow-300 mb-1">
            {tooltipData[activeComponent].title}
          </h4>
          <p className="text-xs text-slate-200 mb-2 max-w-[200px]">
            {tooltipData[activeComponent].desc}
          </p>
          <div className="text-[10px] font-mono bg-black/40 px-2 py-1 rounded text-yellow-100">
            {tooltipData[activeComponent].stats}
          </div>
        </div>
      )}
      
      <svg viewBox="0 0 800 400" className="w-full h-full">
        {/* Building Load */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'demand' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('demand')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="50" y="150" width="150" height="100" fill="#1e293b" stroke="#ef4444" strokeWidth="3" rx="5" />
          <text x="125" y="190" fill="#ef4444" fontSize="14" fontWeight="bold" textAnchor="middle">
            BUILDING
          </text>
          <text x="125" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">
            Demand: 500kW
          </text>
          <text x="125" y="225" fill="#94a3b8" fontSize="11" textAnchor="middle">
            Peak: 500kW
          </text>
        </g>

        {/* Battery Bank */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'battery' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('battery')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="350" y="100" width="100" height="200" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="5" />
          <rect x="360" y="120" width="20" height="60" fill="#22c55e" fillOpacity="0.5" />
          <rect x="390" y="120" width="20" height="60" fill="#22c55e" fillOpacity="0.5" />
          <rect x="420" y="120" width="20" height="60" fill="#22c55e" fillOpacity="0.5" />
          <text x="400" y="200" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">
            BESS
          </text>
          <text x="400" y="220" fill="#94a3b8" fontSize="10" textAnchor="middle">
            1 MWh
          </text>
          <text x="400" y="235" fill="#94a3b8" fontSize="10" textAnchor="middle">
            500 kW
          </text>
        </g>

        {/* Inverter */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'inverter' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('inverter')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="320" y="180" width="60" height="40" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="2" rx="3" />
          <text x="350" y="200" fill="#22c55e" fontSize="10" textAnchor="middle">PCS</text>
          <text x="350" y="212" fill="#94a3b8" fontSize="9" textAnchor="middle">95-97%</text>
        </g>

        {/* Grid Connection */}
        <rect x="550" y="170" width="150" height="60" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" rx="5" />
        <text x="625" y="195" fill="#fbbf24" fontSize="12" textAnchor="middle">GRID</text>
        <text x="625" y="210" fill="#94a3b8" fontSize="10" textAnchor="middle">Connection</text>

        {/* Power Flow - Normal */}
        <path d="M 200 200 L 320 200" stroke="#94a3b8" strokeWidth="4" strokeDasharray="5 5" />
        <text x="260" y="190" fill="#94a3b8" fontSize="11" textAnchor="middle">Normal: 500kW</text>

        {/* Power Flow - Peak Shaving */}
        <path d="M 380 150 L 320 150 L 270 150 L 270 180" stroke="#22c55e" strokeWidth="4" />
        <path d="M 270 180 L 200 180" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrow-green)" />
        <text x="325" y="140" fill="#22c55e" fontSize="11">Discharge: 100kW</text>

        {/* Peak Shaving Indicator */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'peakShaving' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('peakShaving')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="550" y="100" width="150" height="50" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="2" rx="3" />
          <text x="625" y="120" fill="#22c55e" fontSize="12" textAnchor="middle" fontWeight="bold">
            Peak Shaving
          </text>
          <text x="625" y="135" fill="#94a3b8" fontSize="11" textAnchor="middle">
            500kW → 400kW
          </text>
          <text x="625" y="148" fill="#94a3b8" fontSize="10" textAnchor="middle">
            (100kW reduction)
          </text>
        </g>

        {/* Demand Chart */}
        <g className="opacity-70">
          <rect x="50" y="280" width="300" height="80" fill="#1e293b" stroke="#475569" />
          <text x="200" y="295" fill="#94a3b8" fontSize="11" textAnchor="middle">Demand Profile</text>
          
          {/* Original Peak Line */}
          <line x1="60" y1="320" x2="340" y2="320" stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" />
          <text x="70" y="315" fill="#ef4444" fontSize="10">Original Peak: 500kW</text>
          
          {/* Shaved Peak Line */}
          <line x1="60" y1="340" x2="340" y2="340" stroke="#22c55e" strokeWidth="2" />
          <text x="70" y="345" fill="#22c55e" fontSize="10">New Peak: 400kW</text>
          
          {/* Savings */}
          <text x="200" y="360" fill="#94a3b8" fontSize="11" textAnchor="middle">
            Savings: 100kW × $2,000/kW = $200k/year
          </text>
        </g>

        {/* SOC Indicator */}
        <g className="opacity-60">
          <rect x="400" y="320" width="150" height="40" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" rx="3" />
          <text x="475" y="335" fill="#3b82f6" fontSize="11" textAnchor="middle">State of Charge</text>
          <rect x="410" y="340" width="130" height="12" fill="#1e293b" stroke="#22c55e" strokeWidth="1" />
          <rect x="412" y="342" width="78" height="8" fill="#22c55e" />
          <text x="475" y="351" fill="#94a3b8" fontSize="9" textAnchor="middle">60%</text>
        </g>

        {/* Arrows */}
        <defs>
          <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

