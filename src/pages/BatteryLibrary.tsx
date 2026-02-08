import React, { useState, useEffect } from 'react';
import { BatteryCard } from '../components/BatteryCard';
import type { CatalogBatteryRow } from '../utils/battery-catalog-loader';
import { useAdmin } from '../contexts/AdminContext';
import { useToast } from '../contexts/ToastContext';
import { logger } from '../services/logger';
import { BatteryLibraryCreateSchema } from '../validation/schemas/battery-library-schema';
import { GetLibraryBatteriesResponseSchema, unwrap } from '../types/api-responses';

export const BatteryLibrary: React.FC = () => {
  const [batteries, setBatteries] = useState<CatalogBatteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, session } = useAdmin();
  const { toast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    modelName: '',
    manufacturer: '',
    capacityKwh: '',
    powerKw: '',
    efficiency: '0.9',
    warrantyYears: '10',
    price1_10: '',
    price11_20: '',
    price21_50: '',
    price50Plus: '',
  });

  useEffect(() => {
    loadBatteries();
  }, []);

  const loadBatteries = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/library/batteries');
      if (!response.ok) {
        throw new Error(`Failed to load batteries: ${response.statusText}`);
      }
      const data = await response.json().catch(() => ({}));
      const v = unwrap(GetLibraryBatteriesResponseSchema, data);
      setBatteries(v.batteries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load battery catalog');
      logger.error('Error loading batteries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (battery: CatalogBatteryRow) => {
    if (!isAdmin || !session?.token) {
      toast({ type: 'warning', message: 'Admin access required to delete batteries.' });
      return;
    }

    const id = battery.id;
    if (!id) {
      toast({ type: 'error', message: 'This battery is missing an id and cannot be deleted.' });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${battery.modelName}?`)) return;

    try {
      const res = await fetch(`/api/library/batteries/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': session.token,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Delete failed (${res.status})`);
      }
      await loadBatteries();
      toast({ type: 'success', message: 'Battery deleted.' });
    } catch (err) {
      logger.error('Delete battery error:', err);
      toast({ type: 'error', title: 'Delete failed', message: err instanceof Error ? err.message : 'Failed to delete battery.' });
    }
  };

  const handleAddBattery = async () => {
    if (!isAdmin || !session?.token) {
      toast({ type: 'warning', message: 'Admin access required to add batteries.' });
      return;
    }

    try {
      const parsed = BatteryLibraryCreateSchema.safeParse(form);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => i.message).slice(0, 6).join('\n');
        toast({ type: 'error', title: 'Validation errors', message: msg || 'Please fix the form errors.' });
        return;
      }

      const res = await fetch('/api/library/batteries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': session.token,
        },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Create failed (${res.status})`);
      }
      setShowAddModal(false);
      setForm({
        modelName: '',
        manufacturer: '',
        capacityKwh: '',
        powerKw: '',
        efficiency: '0.9',
        warrantyYears: '10',
        price1_10: '',
        price11_20: '',
        price21_50: '',
        price50Plus: '',
      });
      await loadBatteries();
      toast({ type: 'success', message: 'Battery added.' });
    } catch (err) {
      logger.error('Add battery error:', err);
      toast({ type: 'error', title: 'Create failed', message: err instanceof Error ? err.message : 'Failed to add battery.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading battery catalog...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Battery Model Library</h1>
          <p className="text-gray-600">Manage available battery models for analysis</p>
        </div>
        {isAdmin ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            <span>Add Battery Model</span>
          </button>
        ) : (
          <div className="text-sm text-gray-500">Log in as admin to add/edit batteries.</div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Battery Model</h2>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Model Name</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.modelName}
                  onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Manufacturer</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.manufacturer}
                  onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Capacity (kWh)</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.capacityKwh}
                  onChange={(e) => setForm({ ...form, capacityKwh: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Power (kW)</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.powerKw}
                  onChange={(e) => setForm({ ...form, powerKw: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Round-trip efficiency (0-1)</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.efficiency}
                  onChange={(e) => setForm({ ...form, efficiency: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Warranty (years)</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.warrantyYears}
                  onChange={(e) => setForm({ ...form, warrantyYears: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Price 1-10</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.price1_10}
                  onChange={(e) => setForm({ ...form, price1_10: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Price 11-20</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.price11_20}
                  onChange={(e) => setForm({ ...form, price11_20: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Price 21-50</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.price21_50}
                  onChange={(e) => setForm({ ...form, price21_50: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-gray-700 mb-1">Price 50+</div>
                <input
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={form.price50Plus}
                  onChange={(e) => setForm({ ...form, price50Plus: e.target.value })}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleAddBattery}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Battery Grid */}
      <div className="grid grid-cols-1 gap-6">
        {batteries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No battery models found. Click "Add Battery Model" to get started.
          </div>
        ) : (
          batteries.map((battery, index) => (
            <BatteryCard
              key={`${battery.modelName}-${battery.manufacturer}-${index}`}
              battery={battery}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
};

