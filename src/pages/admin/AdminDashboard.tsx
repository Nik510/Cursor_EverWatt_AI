/**
 * Admin Dashboard
 * Main admin interface for managing content
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Edit, 
  Plus, 
  FileText, 
  Users, 
  BarChart3,
  ArrowLeft,
  Search,
  Filter
} from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import { AdminLogin } from '../../components/admin/AdminLogin';
import { fetchAllModules } from '../../api/ee-training';
import type { TrainingModule } from '../../backend/ee-training/types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, session } = useAdmin();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'hidden' | 'archived'>('all');

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadModules();
    }
  }, [isAuthenticated, isAdmin]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await fetchAllModules(true); // Include hidden
      setModules(response.modules);
    } catch (error) {
      console.error('Error loading modules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => {}} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have admin permissions.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const filteredModules = modules.filter(module => {
    const matchesSearch = 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || module.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: modules.length,
    published: modules.filter(m => m.status === 'published').length,
    draft: modules.filter(m => m.status === 'draft').length,
    hidden: modules.filter(m => m.status === 'hidden').length,
    archived: modules.filter(m => m.status === 'archived').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700 border-green-300';
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'hidden': return 'bg-red-100 text-red-700 border-red-300';
      case 'archived': return 'bg-gray-100 text-gray-700 border-gray-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage training content and visibility</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{session?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Modules</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.published}</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.draft}</p>
              </div>
              <Edit className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hidden</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.hidden}</p>
              </div>
              <EyeOff className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'published', 'draft', 'hidden', 'archived'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Module
            </button>
          </div>
        </div>

        {/* Modules List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredModules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No modules found</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredModules.map(module => (
                <div key={module.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-2xl">{module.icon || '📚'}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{module.title}</h3>
                        {module.subtitle && (
                          <p className="text-sm text-gray-600">{module.subtitle}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500">
                            {module.sections.length} sections
                          </span>
                          {module.metadata?.lastUpdated && (
                            <span className="text-xs text-gray-500">
                              Updated {new Date(module.metadata.lastUpdated).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(module.status)}`}>
                        {module.status}
                      </span>
                      <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
