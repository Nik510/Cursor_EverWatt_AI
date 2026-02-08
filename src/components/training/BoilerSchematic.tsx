import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface BoilerSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const BoilerSchematic: React.FC<BoilerSchematicProps> = ({ 
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
        {/* Boiler */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'heatExchanger' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('heatExchanger')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="300" y="120" width="200" height="180" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" rx="5" />
          <text x="400" y="200" fill="#3b82f6" fontSize="14" fontWeight="bold" textAnchor="middle">
            BOILER
          </text>
          <text x="400" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Condensing: 90-98% AFUE
          </text>
        </g>

        {/* Burner */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'burner' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('burner')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="320" y="280" width="160" height="20" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="2" />
          <circle cx="330" cy="290" r="3" fill="#ef4444" />
          <circle cx="350" cy="290" r="3" fill="#ef4444" />
          <circle cx="470" cy="290" r="3" fill="#ef4444" />
          <text x="400" y="310" fill="#ef4444" fontSize="11" textAnchor="middle">Modulating Burner</text>
        </g>

        {/* Return Water */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'returnWater' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('returnWater')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <path d="M 200 180 L 300 180" stroke="#60a5fa" strokeWidth="3" markerEnd="url(#arrow-blue)" />
          <text x="200" y="170" fill="#60a5fa" fontSize="11">Return Water</text>
          <text x="200" y="185" fill="#60a5fa" fontSize="11">&lt; 130°F (Optimal)</text>
        </g>

        {/* Supply Water */}
        <path d="M 500 180 L 600 180" stroke="#22c55e" strokeWidth="3" markerEnd="url(#arrow-green)" />
        <text x="600" y="170" fill="#22c55e" fontSize="11">Supply Water</text>
        <text x="600" y="185" fill="#22c55e" fontSize="11">140-180°F</text>

        {/* Flue/Exhaust */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'flue' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('flue')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="390" y="60" width="20" height="60" fill="#fbbf24" fillOpacity="0.3" stroke="#fbbf24" strokeWidth="2" />
          <path d="M 400 60 L 400 40 L 650 40" stroke="#fbbf24" strokeWidth="3" strokeDasharray="5 5" />
          <circle cx="660" cy="40" r="5" fill="#fbbf24" />
          <text x="670" y="45" fill="#fbbf24" fontSize="11">Exhaust</text>
          <text x="670" y="58" fill="#94a3b8" fontSize="10">Non-condensing: 350°F+</text>
          <text x="670" y="71" fill="#94a3b8" fontSize="10">Condensing: &lt; 140°F</text>
        </g>

        {/* Condensing Indicator */}
        <g className="opacity-70">
          <rect x="320" y="140" width="160" height="30" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
          <text x="400" y="160" fill="#22c55e" fontSize="10" textAnchor="middle">
            Condensing Zone: &lt; 140°F Return
          </text>
        </g>

        {/* Arrows */}
        <defs>
          <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#60a5fa" />
          </marker>
          <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Efficiency Comparison */}
        <g className="opacity-60">
          <rect x="50" y="250" width="120" height="80" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="1" />
          <text x="110" y="270" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
            Non-Condensing
          </text>
          <text x="110" y="285" fill="#94a3b8" fontSize="10" textAnchor="middle">
            80-85% AFUE
          </text>
          <text x="110" y="300" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Return &gt; 140°F
          </text>
          <text x="110" y="315" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Exhaust: 350°F+
          </text>

          <rect x="630" y="250" width="120" height="80" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" />
          <text x="690" y="270" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
            Condensing
          </text>
          <text x="690" y="285" fill="#94a3b8" fontSize="10" textAnchor="middle">
            90-98% AFUE
          </text>
          <text x="690" y="300" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Return &lt; 130°F
          </text>
          <text x="690" y="315" fill="#94a3b8" fontSize="10" textAnchor="middle">
            Exhaust: &lt; 140°F
          </text>
        </g>
      </svg>
    </div>
  );
};

