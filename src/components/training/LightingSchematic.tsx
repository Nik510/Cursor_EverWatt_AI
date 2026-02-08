import React from 'react';

interface TooltipData {
  title: string;
  desc: string;
  stats: string;
  style: React.CSSProperties;
}

interface LightingSchematicProps {
  activeComponent: string | null;
  setActiveComponent: (id: string | null) => void;
  tooltipData: Record<string, TooltipData>;
}

export const LightingSchematic: React.FC<LightingSchematicProps> = ({ 
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
        <defs>
          <linearGradient id="sunbeam" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* ROOM */}
        <rect x="100" y="100" width="600" height="250" fill="#1e293b" stroke="#334155" strokeWidth="4" />
        <line x1="100" y1="350" x2="700" y2="350" stroke="#475569" strokeWidth="4" />

        {/* WINDOW */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'window' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('window')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="20" y="120" width="80" height="200" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 100 150 L 400 350 L 100 350 Z" fill="url(#sunbeam)" className="animate-pulse" />
          <text x="30" y="110" fill="#fde047" fontSize="12" fontWeight="bold">SUNLIGHT</text>
        </g>

        {/* FIXTURE */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'driver' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('driver')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="300" y="100" width="200" height="20" fill="#cbd5e1" />
          <path d="M 320 120 L 300 350 L 500 350 L 480 120 Z" fill="#fff" fillOpacity="0.1" />
          <circle cx="400" cy="110" r="5" fill="#22c55e" />
          <text x="360" y="90" fill="#cbd5e1" fontSize="12">LED FIXTURE (Dimmed)</text>
        </g>

        {/* SENSOR */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'sensor' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('sensor')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <circle cx="250" cy="100" r="10" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
          <path d="M 250 120 L 250 150" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 4" />
          <text x="220" y="80" fill="#fbbf24" fontSize="12">SENSOR</text>
        </g>

        {/* GRAPH */}
        <g 
          className={`transition-all duration-300 cursor-pointer ${
            activeComponent && activeComponent !== 'grid' ? 'opacity-20' : 'opacity-100'
          }`}
          onMouseEnter={() => setActiveComponent('grid')}
          onMouseLeave={() => setActiveComponent(null)}
        >
          <rect x="600" y="200" width="150" height="100" fill="#0f172a" stroke="#475569" />
          <polyline points="610,290 640,250 670,220 700,220 730,250" fill="none" stroke="#fde047" strokeWidth="2" />
          <polyline points="610,220 640,260 670,290 700,290 730,260" fill="none" stroke="#ef4444" strokeWidth="2" />
          <text x="610" y="190" fill="#94a3b8" fontSize="10">GRID LOAD (Red) vs SUN (Yell)</text>
        </g>
      </svg>
    </div>
  );
};

