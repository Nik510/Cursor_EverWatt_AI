import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Zap, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { DemandProfileChart } from '../../../components/charts/DemandProfileChart';
import { EnergyBreakdownChart } from '../../../components/charts/EnergyBreakdownChart';

interface SystemStatus {
  id: string;
  name: string;
  type: 'hvac' | 'lighting' | 'battery' | 'other';
  status: 'online' | 'offline' | 'warning' | 'error';
  currentLoad: number;
  efficiency: number;
  lastUpdate: Date;
}

interface EnergyMetrics {
  currentDemand: number; // kW
  todayEnergy: number; // kWh
  monthEnergy: number; // kWh
  peakDemand: number; // kW
  demandReduction: number; // kW (from battery)
  costToday: number; // $
  costMonth: number; // $
}

export const MonitoringDashboard: React.FC = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('building-1');
  const [metrics, setMetrics] = useState<EnergyMetrics>({
    currentDemand: 0,
    todayEnergy: 0,
    monthEnergy: 0,
    peakDemand: 0,
    demandReduction: 0,
    costToday: 0,
    costMonth: 0,
  });
  const [systems, setSystems] = useState<SystemStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [demandData, setDemandData] = useState<Array<{ time: string; demand: number; afterBattery: number }>>([]);
  const [energyBreakdown, setEnergyBreakdown] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  type SnapshotSystem = Omit<SystemStatus, 'lastUpdate'> & { lastUpdate: string };
  type SnapshotData = {
    metrics: EnergyMetrics;
    systems: SnapshotSystem[];
    demandData: Array<{ time: string; demand: number; afterBattery: number }>;
    energyBreakdown: Array<{ name: string; value: number; color: string }>;
  };

  async function fetchSnapshot(buildingId: string) {
    const res = await fetch(`/api/monitoring/snapshot?buildingId=${encodeURIComponent(buildingId)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || `Failed to load snapshot (${res.status})`);
    }
    const snap = data.snapshot as SnapshotData;
    setMetrics(snap.metrics);
    setSystems(
      (snap.systems || []).map((s) => ({
        ...s,
        lastUpdate: new Date(s.lastUpdate),
      }))
    );
    setDemandData(snap.demandData || []);
    setEnergyBreakdown(snap.energyBreakdown || []);
  }

  // Simulate real-time data updates
  useEffect(() => {
    if (!isConnected) return;

    let cancelled = false;
    setError(null);

    // Load immediately, then poll
    fetchSnapshot(selectedBuilding).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
    });

    const interval = setInterval(() => {
      fetchSnapshot(selectedBuilding).catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isConnected, selectedBuilding]);

  const getStatusColor = (status: SystemStatus['status']) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Monitoring Dashboard</h1>
            <p className="text-gray-600">Real-time performance tracking and analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="building-1">Main Office Building</option>
              <option value="building-2">Warehouse Facility</option>
              <option value="building-3">Retail Store</option>
            </select>
            <button
              onClick={() => setIsConnected(!isConnected)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isConnected
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {!isConnected ? (
        /* Connection Required */
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Connected</h2>
          <p className="text-gray-600 mb-6">
            Click "Connect" to start monitoring real-time data from your building systems.
          </p>
          <button
            onClick={() => setIsConnected(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Connect to Systems
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Current Demand</p>
                <Zap className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.currentDemand.toFixed(0)} kW
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Peak shaving active</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Today's Energy</p>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.todayEnergy.toFixed(0)} kWh
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Cost: ${metrics.costToday.toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Peak Demand</p>
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.peakDemand.toFixed(0)} kW
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Reduced by {metrics.demandReduction.toFixed(0)} kW
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Monthly Cost</p>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${metrics.costMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">12% vs baseline</span>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systems.map((system) => {
                const Icon = system.type === 'hvac' ? Droplet :
                             system.type === 'battery' ? Battery :
                             system.type === 'lighting' ? Lightbulb : Activity;
                return (
                  <div key={system.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-gray-600" />
                        <h3 className="font-semibold text-gray-900">{system.name}</h3>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(system.status)}`}>
                        {getStatusIcon(system.status)}
                        {system.status}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Load:</span>
                        <span className="font-semibold text-gray-900">
                          {system.currentLoad.toFixed(0)} {system.type === 'hvac' ? 'tons' : system.type === 'battery' ? 'kW' : 'kW'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efficiency:</span>
                        <span className="font-semibold text-gray-900">
                          {system.efficiency.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Update:</span>
                        <span className="text-gray-900">
                          {system.lastUpdate.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Profile (24 Hours)</h3>
              {demandData.length > 0 ? (
                <DemandProfileChart data={demandData} height={300} />
              ) : (
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Loading chart data...</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Energy Breakdown</h3>
              {energyBreakdown.length > 0 ? (
                <EnergyBreakdownChart data={energyBreakdown} height={300} />
              ) : (
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Loading chart data...</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              System Alerts
            </h3>
            <div className="space-y-2">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Chiller #1 efficiency below optimal (65% vs target 70%)
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Info:</strong> Battery system operating normally. SOC: 78%
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

