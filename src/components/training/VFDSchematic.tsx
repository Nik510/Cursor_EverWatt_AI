import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface VFDSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const VFDSchematic: React.FC<VFDSchematicProps> = ({ 
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
        {/* Power Input */}
        <rect x="50" y="150" width="100" height="100" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" rx="5" />
        <text x="100" y="200" fill="#94a3b8" fontSize="12" textAnchor="middle">60Hz AC</text>
        <text x="100" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">Fixed</text>

        {/* VFD Controller */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'vfd' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('vfd')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="200" y="130" width="150" height="140" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="3" rx="5" />
          <text x="275" y="180" fill="#22c55e" fontSize="16" fontWeight="bold" textAnchor="middle">VFD</text>
          <text x="275" y="200" fill="#94a3b8" fontSize="11" textAnchor="middle">Variable</text>
          <text x="275" y="215" fill="#94a3b8" fontSize="11" textAnchor="middle">Frequency</text>
          <text x="275" y="230" fill="#94a3b8" fontSize="11" textAnchor="middle">10-60Hz</text>
          <text x="275" y="250" fill="#94a3b8" fontSize="10" textAnchor="middle">Efficiency: 95-97%</text>
        </g>

        {/* Motor */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'motor' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('motor')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <circle cx="450" cy="200" r="50" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
          <text x="450" y="200" fill="#3b82f6" fontSize="12" textAnchor="middle">MOTOR</text>
          <text x="450" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">Variable</text>
          <text x="450" y="228" fill="#94a3b8" fontSize="10" textAnchor="middle">Speed</text>
        </g>

        {/* Fan/Pump */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'fan' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('fan')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <circle cx="600" cy="200" r="40" fill="#1e293b" stroke="#ef4444" strokeWidth="3" />
          <path d="M 600 160 L 600 140 L 620 150 L 610 160 Z M 600 240 L 600 260 L 620 250 L 610 240 Z M 560 200 L 540 200 L 550 220 L 560 210 Z M 640 200 L 660 200 L 650 220 L 640 210 Z" 
            fill="#ef4444" fillOpacity="0.5" />
          <text x="600" y="260" fill="#ef4444" fontSize="11" textAnchor="middle">Fan/Pump</text>
        </g>

        {/* Control Signal */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'control' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('control')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <path d="M 275 130 L 275 80 L 550 80 L 550 150" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5 5" />
          <circle cx="275" cy="80" r="5" fill="#fbbf24" />
          <text x="285" y="75" fill="#fbbf24" fontSize="10">Control Signal</text>
          <text x="285" y="88" fill="#94a3b8" fontSize="9">0-10V / 4-20mA</text>
        </g>

        {/* Power Flow */}
        <path d="M 150 200 L 200 200" stroke="#94a3b8" strokeWidth="4" markerEnd="url(#arrow-gray)" />
        <path d="M 350 200 L 400 200" stroke="#22c55e" strokeWidth="4" markerEnd="url(#arrow-green)" />
        <path d="M 500 200 L 560 200" stroke="#3b82f6" strokeWidth="4" />

        {/* Power Comparison */}
        <g className="opacity-70">
          <rect x="50" y="280" width="150" height="80" fill="#ef4444" fillOpacity="0.1" stroke="#ef4444" strokeWidth="1" />
          <text x="125" y="300" fill="#ef4444" fontSize="11" textAnchor="middle" fontWeight="bold">
            Constant Speed
          </text>
          <text x="125" y="318" fill="#94a3b8" fontSize="10" textAnchor="middle">
            100% Speed = 100% Power
          </text>
          <text x="125" y="335" fill="#94a3b8" fontSize="10" textAnchor="middle">
            80% Speed = 100% Power
          </text>
          <text x="125" y="352" fill="#94a3b8" fontSize="10" textAnchor="middle">
            (Throttled)
          </text>

          <rect x="600" y="280" width="150" height="80" fill="#22c55e" fillOpacity="0.1" stroke="#22c55e" strokeWidth="1" />
          <text x="675" y="300" fill="#22c55e" fontSize="11" textAnchor="middle" fontWeight="bold">
            Variable Speed
          </text>
          <text x="675" y="318" fill="#94a3b8" fontSize="10" textAnchor="middle">
            100% Speed = 100% Power
          </text>
          <text x="675" y="335" fill="#94a3b8" fontSize="10" textAnchor="middle">
            80% Speed = 51% Power
          </text>
          <text x="675" y="352" fill="#94a3b8" fontSize="10" textAnchor="middle">
            (Cubic Law)
          </text>
        </g>

        {/* Arrows */}
        <defs>
          <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
          </marker>
          <marker id="arrow-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
          </marker>
        </defs>

        {/* Formula */}
        <text x="400" y="330" fill="#94a3b8" fontSize="14" textAnchor="middle" fontWeight="bold">
          Power ∝ Speed³
        </text>
        <text x="400" y="350" fill="#94a3b8" fontSize="12" textAnchor="middle">
          Cut speed in half = 12.5% power (87.5% savings)
        </text>
      </svg>
    </div>
  );
};

