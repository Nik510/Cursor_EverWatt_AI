import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface VRFSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const VRFSchematic: React.FC<VRFSchematicProps> = ({ 
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
        {/* Outdoor Unit */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'outdoor' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('outdoor')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="300" y="50" width="200" height="120" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="5" />
          <circle cx="400" cy="90" r="30" fill="#22c55e" fillOpacity="0.2" stroke="#22c55e" strokeWidth="2" />
          <text x="400" y="95" fill="#22c55e" fontSize="12" textAnchor="middle" fontWeight="bold">
            VSD
          </text>
          <text x="400" y="110" fill="#3b82f6" fontSize="14" textAnchor="middle" fontWeight="bold">
            OUTDOOR UNIT
          </text>
          <text x="400" y="128" fill="#94a3b8" fontSize="11" textAnchor="middle">
            Variable-Speed Compressor
          </text>
          <text x="400" y="145" fill="#94a3b8" fontSize="10" textAnchor="middle">
            5-60 tons capacity
          </text>
          <text x="400" y="158" fill="#94a3b8" fontSize="10" textAnchor="middle">
            COP 4.5-6.0
          </text>
        </g>

        {/* Refrigerant Piping */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'refrigerant' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('refrigerant')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          {/* Main Lines */}
          <line x1="400" y1="170" x2="400" y2="250" stroke="#fbbf24" strokeWidth="4" />
          <line x1="380" y1="250" x2="420" y2="250" stroke="#fbbf24" strokeWidth="4" />
          
          {/* Branch to Zone 1 */}
          <line x1="380" y1="250" x2="200" y2="300" stroke="#fbbf24" strokeWidth="3" />
          
          {/* Branch to Zone 2 */}
          <line x1="400" y1="250" x2="400" y2="300" stroke="#fbbf24" strokeWidth="3" />
          
          {/* Branch to Zone 3 */}
          <line x1="420" y1="250" x2="600" y2="300" stroke="#fbbf24" strokeWidth="3" />
          
          <text x="450" y="245" fill="#fbbf24" fontSize="11">Refrigerant Lines</text>
          <text x="450" y="258" fill="#94a3b8" fontSize="9">Small diameter, flexible</text>
        </g>

        {/* Indoor Units */}
        {/* Zone 1 - Cooling */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'indoor' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('indoor')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="150" y="280" width="100" height="80" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" rx="3" />
          <text x="200" y="305" fill="#60a5fa" fontSize="11" textAnchor="middle" fontWeight="bold">
            Zone 1
          </text>
          <text x="200" y="320" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Ceiling Cassette
          </text>
          <text x="200" y="335" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
            COOLING
          </text>
          <text x="200" y="350" fill="#94a3b8" fontSize="9" textAnchor="middle">
            Individual Control
          </text>
        </g>

        {/* Zone 2 - Heating */}
        <rect x="350" y="280" width="100" height="80" fill="#1e293b" stroke="#ef4444" strokeWidth="2" rx="3" />
        <text x="400" y="305" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
          Zone 2
        </text>
        <text x="400" y="320" fill="#94a3b8" fontSize="10" textAnchor="middle">
          Wall Unit
        </text>
        <text x="400" y="335" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
          HEATING
        </text>
        <text x="400" y="350" fill="#94a3b8" fontSize="9" textAnchor="middle">
          Individual Control
        </text>

        {/* Zone 3 - Cooling */}
        <rect x="550" y="280" width="100" height="80" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" rx="3" />
        <text x="600" y="305" fill="#60a5fa" fontSize="11" textAnchor="middle" fontWeight="bold">
          Zone 3
        </text>
        <text x="600" y="320" fill="#94a3b8" fontSize="10" textAnchor="middle">
          Ducted
        </text>
        <text x="600" y="335" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
          COOLING
        </text>
        <text x="600" y="350" fill="#94a3b8" fontSize="9" textAnchor="middle">
          Individual Control
        </text>

        {/* Heat Recovery Indicator */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'heatRecovery' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('heatRecovery')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <path d="M 200 340 L 400 340" stroke="#22c55e" strokeWidth="3" strokeDasharray="5 5" />
          <text x="300" y="335" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
            Heat Recovery
          </text>
          <text x="300" y="350" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Cooling Zone 1 → Heating Zone 2
          </text>
        </g>

        {/* Efficiency Comparison */}
        <g className="opacity-70">
          <rect x="50" y="50" width="150" height="80" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="1" />
          <text x="125" y="70" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
            Traditional Gas RTU
          </text>
          <text x="125" y="85" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Heating: 0.80 AFUE
          </text>
          <text x="125" y="98" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Cooling: 3.0 COP
          </text>
          <text x="125" y="111" fill="#94a3b8" fontSize="10" textAnchor="middle">
            On/Off Operation
          </text>
          <text x="125" y="124" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Emissions: CO₂, NOx
          </text>

          <rect x="600" y="50" width="150" height="80" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" />
          <text x="675" y="70" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
            VRF Heat Recovery
          </text>
          <text x="675" y="85" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Heating: 4.5-6.0 COP
          </text>
          <text x="675" y="98" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Cooling: 4.5-6.0 COP
          </text>
          <text x="675" y="111" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Variable Capacity
          </text>
          <text x="675" y="124" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Zero On-Site Emissions
          </text>
        </g>

        {/* Key Benefits */}
        <g className="opacity-60">
          <rect x="250" y="200" width="300" height="30" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" rx="3" />
          <text x="400" y="218" fill="#22c55e" fontSize="12" textAnchor="middle" fontWeight="bold">
            Simultaneous Heating & Cooling = Energy Transfer = Efficiency
          </text>
        </g>
      </svg>
    </div>
  );
};

