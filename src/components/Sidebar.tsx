import React from 'react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'new-analysis', label: 'New Analysis', icon: '➕' },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: '⚡' },
    { id: 'historical-library', label: 'Historical Library', icon: '📈' },
    { id: 'battery-library', label: 'Battery Library', icon: '🔋' },
    { id: 'equipment-library', label: 'Equipment Library', icon: '⚙️' },
    { id: 'measures-library', label: 'Measures Library', icon: '📋' },
    { id: 'rate-library', label: 'Rate Library', icon: '💰' },
    { id: 'rebate-library', label: 'Rebate Library', icon: '💵' },
    { id: 'technology-explorer', label: 'Technology Explorer', icon: '🔍' },
    { id: 'ai-advisor', label: 'AI Advisor', icon: '✨' },
    { id: 'technical-library', label: 'Technical Library', icon: '📚' },
    { id: 'user-management', label: 'User Management', icon: '👥' },
  ];

  const resourceItems = [
    { id: 'battery-analytics', label: 'Battery Analytics', icon: '⚡' },
    { id: 'rate-structures', label: 'Rate Structures', icon: '📄' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-lg">
            E
          </div>
          <h1 className="text-xl font-bold text-gray-900">EnergyIQ</h1>
        </div>
        <p className="text-xs text-gray-500 ml-11">Multi-Tech Analysis Platform</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            NAVIGATION
          </h2>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Resources */}
        <div className="px-4 mt-6 border-t border-gray-200 pt-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            RESOURCES
          </h2>
          <nav className="space-y-1">
            {resourceItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activePage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-blue-600">🔋</span>
            <span className="text-sm font-semibold text-blue-900">Energy Insights</span>
          </div>
          <p className="text-xs text-blue-700">AI-powered energy efficiency analysis</p>
        </div>
      </div>
    </div>
  );
};

