import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface ChillerSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const ChillerSchematic: React.FC<ChillerSchematicProps> = ({ 
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
        {/* Chiller */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'chiller' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('chiller')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="300" y="150" width="200" height="100" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="5" />
          <text x="350" y="200" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">
            CHILLER
          </text>
          <text x="350" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">
            0.35-0.85 kW/ton
          </text>
        </g>

        {/* Evaporator (Chilled Water) */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'evaporator' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('evaporator')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="280" y="170" width="30" height="60" fill="#60a5fa" fillOpacity="0.3" stroke="#60a5fa" strokeWidth="2" />
          <path d="M 250 200 L 280 200" stroke="#60a5fa" strokeWidth="3" markerEnd="url(#arrow-blue)" />
          <path d="M 310 200 L 340 200" stroke="#60a5fa" strokeWidth="3" />
          <text x="200" y="195" fill="#60a5fa" fontSize="11">42-48°F</text>
          <text x="200" y="210" fill="#60a5fa" fontSize="11">Chilled Water</text>
        </g>

        {/* Condenser */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'condenser' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('condenser')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="490" y="170" width="30" height="60" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="2" />
          <path d="M 520 200 L 550 200" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-red)" />
          <path d="M 480 200 L 450 200" stroke="#ef4444" strokeWidth="3" />
          <text x="560" y="195" fill="#ef4444" fontSize="11">75-85°F</text>
          <text x="560" y="210" fill="#ef4444" fontSize="11">Condenser Water</text>
        </g>

        {/* Cooling Tower */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'tower' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('tower')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <ellipse cx="650" cy="120" rx="60" ry="25" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="2" />
          <rect x="635" y="120" width="30" height="80" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="650" cy="100" r="15" fill="#cbd5e1" stroke="#fbbf24" strokeWidth="2" />
          <path d="M 640 100 L 640 80" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
          <text x="650" y="75" fill="#fbbf24" fontSize="11" textAnchor="middle">VFD Fan</text>
          <path d="M 580 200 L 590 200" stroke="#ef4444" strokeWidth="3" />
          <path d="M 710 200 L 720 200" stroke="#22c55e" strokeWidth="3" />
        </g>

        {/* Arrows */}
        <defs>
          <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
          </marker>
          <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
        </defs>

        {/* Labels */}
        <text x="400" y="280" fill="#94a3b8" fontSize="12" textAnchor="middle">
          Lower Lift = Lower Energy (Optimize: Raise ChW, Lower CondW)
        </text>
      </svg>
    </div>
  );
};

