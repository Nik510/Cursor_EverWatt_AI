import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import type { ProjectCustomerDetails, ProjectRecord } from '../../types/change-order';
import { logger } from '../../services/logger';
import { apiRequest } from '../../shared/api/client';

const emptyCustomer = (): ProjectCustomerDetails => ({
  projectNumber: '',
  companyName: '',
  projectName: '',
  facilityName: '',
});

export const ProjectBuilderHome: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [driveFolderLink, setDriveFolderLink] = useState('');
  const [customer, setCustomer] = useState<ProjectCustomerDetails>(emptyCustomer());

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ success: true; projects: ProjectRecord[] }>({ url: '/api/projects' });
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      logger.error('Failed to load projects', e);
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  }, [projects]);

  async function createProject() {
    const link = driveFolderLink.trim();
    const projectNumber = (customer.projectNumber || '').trim();
    const companyName = (customer.companyName || '').trim();
    if (!link || !projectNumber || !companyName) {
      setError('Drive folder link, Project #, and Company name are required.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const data = await apiRequest<{ success: true; project: ProjectRecord }>({
        url: '/api/projects',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveFolderLink: link, customer }),
      });
      const p: ProjectRecord = data.project;
      setProjects((prev) => [p, ...prev.filter((x) => x.id !== p.id)]);
      setDriveFolderLink('');
      setCustomer(emptyCustomer());
      navigate(`/project-builder/${encodeURIComponent(p.id)}`);
    } catch (e) {
      logger.error('Create project failed', e);
      setError(e instanceof Error ? e.message : 'Create project failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Project Builder</h1>
          <p className="text-sm text-gray-600">
            V1 ships a <span className="font-semibold">Project Vault</span> (uploads + extraction + chunks) and a{' '}
            <span className="font-semibold">Project Graph</span> (assets/measures with provenance).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/project-builder/analysis-runs"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            title="Browse stored snapshot-only analysis runs (V1)"
          >
            Analysis Runs
          </Link>
          <button
            onClick={loadProjects}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-700" />
          <h2 className="text-sm font-semibold text-gray-900">Create new project</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <div className="font-medium text-gray-700">Drive folder link *</div>
            <input
              value={driveFolderLink}
              onChange={(e) => setDriveFolderLink(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="https://drive.google.com/..."
            />
          </label>
          <label className="text-sm">
            <div className="font-medium text-gray-700">Project # *</div>
            <input
              value={customer.projectNumber || ''}
              onChange={(e) => setCustomer((p) => ({ ...p, projectNumber: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="12345"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium text-gray-700">Company name *</div>
            <input
              value={customer.companyName || ''}
              onChange={(e) => setCustomer((p) => ({ ...p, companyName: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Acme Corp"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium text-gray-700">Project name</div>
            <input
              value={customer.projectName || ''}
              onChange={(e) => setCustomer((p) => ({ ...p, projectName: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Main Campus Lighting + HVAC"
            />
          </label>
          <label className="text-sm">
            <div className="font-medium text-gray-700">Facility name</div>
            <input
              value={customer.facilityName || ''}
              onChange={(e) => setCustomer((p) => ({ ...p, facilityName: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Building A"
            />
          </label>
        </div>

        <button
          onClick={() => void createProject()}
          disabled={creating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          <Building2 className="w-4 h-4" />
          Create Project
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Existing projects
        </div>
        {loading && <div className="px-4 py-6 text-sm text-gray-600">Loading…</div>}
        {!loading && sorted.length === 0 && (
          <div className="px-4 py-6 text-sm text-gray-600">No projects yet. Create one above.</div>
        )}
        {!loading &&
          sorted.map((p) => (
            <div key={p.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {p.customer?.projectName || p.customer?.facilityName || p.customer?.companyName || 'Untitled Project'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  #{p.customer?.projectNumber || '—'} • {p.customer?.companyName || '—'} • {p.id}
                </div>
              </div>
              <Link
                to={`/project-builder/${encodeURIComponent(p.id)}`}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Open
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
};

