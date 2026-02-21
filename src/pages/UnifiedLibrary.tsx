/**
 * Unified Library Browser
 * Browse and search batteries and utility rates with AI-generated descriptions
 * Admin users can add/edit library items
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Battery,
  Zap,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Brain,
  Info,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { CatalogBatteryRow } from '../shared/types/batteryCatalog';
import { loadBatteryCatalogFromUrl } from '../utils/battery-catalog-browser';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../services/logger';

type LibraryRate = {
  id: string;
  name?: string;
  rateName?: string;
  provider?: string;
  utility?: string;
  rateCode?: string;
  rateType?: string;
  demandCharge?: number;
  peakRate?: number;
  description?: string;
};

// AI-generated description helper (can be enhanced with actual AI API)
const generateAIDescription = (item: CatalogBatteryRow | LibraryRate, type: 'battery' | 'rate'): string => {
  if (type === 'battery') {
    const battery = item as CatalogBatteryRow;
    const duration = battery.powerKw > 0 ? (battery.capacityKwh / battery.powerKw).toFixed(1) : 'N/A';
    const cRate = battery.capacityKwh > 0 ? (battery.powerKw / battery.capacityKwh).toFixed(2) : 'N/A';
    
    return `The ${battery.manufacturer} ${battery.modelName} is a ${battery.capacityKwh} kWh / ${battery.powerKw} kW battery storage system with ${(battery.efficiency * 100).toFixed(0)}% round-trip efficiency. With a ${duration}-hour duration at full power and ${cRate}C discharge rate, this system is ideal for ${battery.capacityKwh > 500 ? 'large commercial and industrial applications requiring extended backup power and peak shaving' : battery.capacityKwh > 100 ? 'medium commercial facilities with significant demand charges' : 'small to medium commercial applications with moderate peak demand'}. The ${battery.warrantyYears}-year warranty provides long-term reliability. Typical use cases include demand charge reduction, TOU arbitrage, and ${battery.powerKw / battery.capacityKwh > 0.5 ? 'high-power applications requiring rapid discharge' : 'load shifting and backup power'}.`;
  } else {
    // Rate descriptions - simplified, can be enhanced
    const rate = item as LibraryRate;
    return rate.description || `Utility rate ${rate.rateCode || rate.name || 'rate'} for ${rate.utility || rate.provider || 'utility'} customers.`;
  }
};

// Battery Card Component
const BatteryLibraryCard: React.FC<{
  battery: CatalogBatteryRow;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}> = ({ battery, onEdit, onDelete, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const aiDescription = useMemo(() => generateAIDescription(battery, 'battery'), [battery]);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Battery className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{battery.modelName}</h3>
                <p className="text-sm text-gray-500">{battery.manufacturer}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-1">Capacity</div>
                <div className="text-lg font-bold text-blue-800">{battery.capacityKwh} kWh</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600 mb-1">Power</div>
                <div className="text-lg font-bold text-purple-800">{battery.powerKw} kW</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 mb-1">Efficiency</div>
                <div className="text-lg font-bold text-green-800">{(battery.efficiency * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-xs text-amber-600 mb-1">Price</div>
                <div className="text-lg font-bold text-amber-800">${battery.price1_10.toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2 ml-4">
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left text-sm text-gray-600 hover:text-gray-900 py-2 border-t border-gray-200"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="font-medium">AI-Generated Description</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expanded && (
          <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700 leading-relaxed">{aiDescription}</p>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">Duration:</span> {(battery.capacityKwh / battery.powerKw).toFixed(1)} hrs
          </div>
          <div>
            <span className="font-medium">C-Rate:</span> {(battery.powerKw / battery.capacityKwh).toFixed(2)}C
          </div>
          <div>
            <span className="font-medium">Warranty:</span> {battery.warrantyYears} years
          </div>
        </div>
      </div>
    </div>
  );
};

// Rate Card Component (simplified - will be enhanced with actual rate data)
const RateLibraryCard: React.FC<{
  rate: LibraryRate;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}> = ({ rate, onEdit, onDelete, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const aiDescription = useMemo(() => generateAIDescription(rate, 'rate'), [rate]);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="text-xl font-bold text-gray-900">{rate.name || rate.rateName}</h3>
                <p className="text-sm text-gray-500">{rate.provider || rate.utility} • {rate.rateCode}</p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-4">
              {rate.demandCharge && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs text-red-600 mb-1">Demand Charge</div>
                  <div className="text-lg font-bold text-red-800">${rate.demandCharge}/kW</div>
                </div>
              )}
              {rate.peakRate && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs text-orange-600 mb-1">Peak Rate</div>
                  <div className="text-lg font-bold text-orange-800">${rate.peakRate.toFixed(3)}/kWh</div>
                </div>
              )}
              {rate.rateType && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-600 mb-1">Type</div>
                  <div className="text-lg font-bold text-blue-800">{rate.rateType}</div>
                </div>
              )}
            </div>
          </div>
          
          {isAdmin && (
            <div className="flex gap-2 ml-4">
              <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left text-sm text-gray-600 hover:text-gray-900 py-2 border-t border-gray-200"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="font-medium">AI-Generated Description</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {expanded && (
          <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-gray-700 leading-relaxed">{aiDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel: React.FC<{
  type: 'battery' | 'rate';
  onAdd: () => void;
}> = ({ type, onAdd }) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-purple-600" />
          <div>
            <div className="font-semibold text-purple-900">Admin Mode</div>
            <div className="text-sm text-purple-700">You can add and edit {type === 'battery' ? 'batteries' : 'utility rates'}</div>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {type === 'battery' ? 'Battery' : 'Rate'}
        </button>
      </div>
    </div>
  );
};

// Add/Edit Modal Component
type LibraryFormData = Partial<CatalogBatteryRow> &
  Partial<LibraryRate> & {
    rateName?: string;
    provider?: string;
  };

const AddEditModal: React.FC<{
  isOpen: boolean;
  type: 'battery' | 'rate';
  item?: CatalogBatteryRow | LibraryRate;
  onClose: () => void;
  onSave: (item: LibraryFormData) => void;
}> = ({ isOpen, type, item, onClose, onSave }) => {
  const [formData, setFormData] = useState<LibraryFormData>((item as LibraryFormData) || {});
  
  useEffect(() => {
    if (item) setFormData(item);
  }, [item]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {item ? 'Edit' : 'Add'} {type === 'battery' ? 'Battery' : 'Utility Rate'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {type === 'battery' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Tesla, Fluence"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                <input
                  type="text"
                  value={formData.modelName || ''}
                  onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Megapack 2, Stack 225"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (kWh)</label>
                  <input
                    type="number"
                    value={formData.capacityKwh || ''}
                    onChange={(e) => setFormData({ ...formData, capacityKwh: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Power (kW)</label>
                  <input
                    type="number"
                    value={formData.powerKw || ''}
                    onChange={(e) => setFormData({ ...formData, powerKw: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.efficiency ? formData.efficiency * 100 : ''}
                    onChange={(e) => setFormData({ ...formData, efficiency: (parseFloat(e.target.value) || 0) / 100 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (Years)</label>
                  <input
                    type="number"
                    value={formData.warrantyYears || ''}
                    onChange={(e) => setFormData({ ...formData, warrantyYears: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (1-10 units)</label>
                <input
                  type="number"
                  value={formData.price1_10 || ''}
                  onChange={(e) => setFormData({ ...formData, price1_10: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utility Provider</label>
                <input
                  type="text"
                  value={formData.provider || formData.utility || ''}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value, utility: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., PG&E, SCE, SDG&E"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Code</label>
                <input
                  type="text"
                  value={formData.rateCode || ''}
                  onChange={(e) => setFormData({ ...formData, rateCode: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., B-19, B-20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Name</label>
                <input
                  type="text"
                  value={formData.name || formData.rateName || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, rateName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(formData);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
export const UnifiedLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'batteries' | 'rates'>('batteries');
  const [batteries, setBatteries] = useState<CatalogBatteryRow[]>([]);
  const [rates, setRates] = useState<LibraryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogBatteryRow | LibraryRate | null>(null);
  const [isAdmin] = useState(true); // TODO: Get from auth context
  
  // Mock rates data - will be replaced with actual API call
  useEffect(() => {
    setRates([
      {
        id: '1',
        name: 'B-19 Medium General Demand-Metered TOU',
        provider: 'PG&E',
        rateCode: 'B-19',
        rateType: 'TOU',
        demandCharge: 38.37,
        peakRate: 0.25755,
        description: 'Medium commercial customers with demand metering. Multi-part demand charges.',
      },
      {
        id: '2',
        name: 'B-20 Large General Demand-Metered TOU',
        provider: 'PG&E',
        rateCode: 'B-20',
        rateType: 'TOU',
        demandCharge: 25.00,
        peakRate: 0.25,
        description: 'Large commercial customers with demand metering.',
      },
    ]);
  }, []);
  
  useEffect(() => {
    loadBatteries();
  }, []);
  
  const loadBatteries = async () => {
    try {
      setLoading(true);
      const loadedBatteries = await loadBatteryCatalogFromUrl('/battery-catalog.csv');
      setBatteries(loadedBatteries);
    } catch (err) {
      console.error('Error loading batteries:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredBatteries = useMemo(() => {
    if (!searchQuery) return batteries;
    const query = searchQuery.toLowerCase();
    return batteries.filter(b => 
      b.modelName.toLowerCase().includes(query) ||
      b.manufacturer.toLowerCase().includes(query) ||
      b.capacityKwh.toString().includes(query) ||
      b.powerKw.toString().includes(query)
    );
  }, [batteries, searchQuery]);
  
  const filteredRates = useMemo(() => {
    if (!searchQuery) return rates;
    const query = searchQuery.toLowerCase();
    return rates.filter(r =>
      (r.name || r.rateName || '').toLowerCase().includes(query) ||
      (r.provider || r.utility || '').toLowerCase().includes(query) ||
      (r.rateCode || '').toLowerCase().includes(query)
    );
  }, [rates, searchQuery]);
  
  const handleAdd = () => {
    setEditingItem(null);
    setShowModal(true);
  };
  
  const handleEdit = (item: CatalogBatteryRow | LibraryRate) => {
    setEditingItem(item);
    setShowModal(true);
  };
  
  const handleDelete = async (item: { id?: string }, type: 'battery' | 'rate') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    
    try {
      if (!item.id) {
        toast({ type: 'error', title: 'Delete failed', message: 'Missing id.' });
        return;
      }
      const endpoint = `/api/library/${type}s/${item.id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      
      if (res.ok) {
        if (type === 'battery') {
          setBatteries(batteries.filter(b => b.id !== item.id));
        } else {
          setRates(rates.filter(r => r.id !== item.id));
        }
        toast({ type: 'success', message: `${type === 'battery' ? 'Battery' : 'Rate'} deleted.` });
      } else {
        toast({ type: 'error', title: 'Delete failed', message: 'Failed to delete item.' });
      }
    } catch (err) {
      logger.error('Delete error:', err);
      toast({ type: 'error', title: 'Delete failed', message: 'Error deleting item.' });
    }
  };
  
  const handleSave = async (item: CatalogBatteryRow | LibraryRate) => {
    try {
      const endpoint = `/api/library/${activeTab}/${editingItem?.id || ''}`;
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? endpoint : `/api/library/${activeTab}`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'batteries') {
          if (editingItem) {
            setBatteries(batteries.map((b) => (b.id === editingItem.id ? (data.battery as CatalogBatteryRow) : b)));
          } else {
            setBatteries([...batteries, data.battery as CatalogBatteryRow]);
          }
        } else {
          if (editingItem) {
            setRates(rates.map((r) => (r.id === editingItem.id ? (data.rate as LibraryRate) : r)));
          } else {
            setRates([...rates, data.rate as LibraryRate]);
          }
        }
        toast({ type: 'success', message: editingItem ? 'Saved changes.' : 'Item created.' });
      } else {
        const error = await res.json();
        toast({ type: 'error', title: 'Save failed', message: error.error || 'Failed to save item' });
      }
    } catch (err) {
      logger.error('Save error:', err);
      toast({ type: 'error', title: 'Save failed', message: 'Error saving item' });
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading library...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Energy Technology Library</h1>
          <p className="text-gray-600">Browse batteries and utility rates with AI-generated insights</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('batteries')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'batteries'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Battery className="w-5 h-5" />
            Batteries ({batteries.length})
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'rates'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-5 h-5" />
            Utility Rates ({rates.length})
          </button>
        </div>
        
        {/* Admin Panel */}
        {isAdmin && <AdminPanel type={activeTab} onAdd={handleAdd} />}
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'batteries' ? 'batteries by model, manufacturer, capacity, or power' : 'rates by name, provider, or code'}...`}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Results */}
        <div className="space-y-6">
          {activeTab === 'batteries' ? (
            <>
              <div className="text-sm text-gray-600 mb-4">
                Showing {filteredBatteries.length} of {batteries.length} batteries
              </div>
              {filteredBatteries.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Battery className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No batteries found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredBatteries.map((battery, index) => (
                    <BatteryLibraryCard
                      key={`${battery.modelName}-${battery.manufacturer}-${index}`}
                      battery={battery}
                      onEdit={() => handleEdit(battery)}
                      onDelete={() => handleDelete(battery, 'battery')}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-4">
                Showing {filteredRates.length} of {rates.length} utility rates
              </div>
              {filteredRates.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No utility rates found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredRates.map((rate) => (
                    <RateLibraryCard
                      key={rate.id}
                      rate={rate}
                      onEdit={() => handleEdit(rate)}
                      onDelete={() => handleDelete(rate, 'rate')}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Add/Edit Modal */}
      <AddEditModal
        isOpen={showModal}
        type={activeTab}
        item={editingItem}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};

export default UnifiedLibrary;
