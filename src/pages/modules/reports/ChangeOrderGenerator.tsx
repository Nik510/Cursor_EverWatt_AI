import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, ClipboardSignature, FileText, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { logger } from '../../../services/logger';
import type {
  ChangeOrderAiBody,
  ChangeOrderFileFormat,
  ChangeOrderInput,
  ChangeOrderRecord,
  ProjectCustomerDetails,
  ProjectRecord,
} from '../../../types/change-order';
import { downloadBlob, generateChangeOrder } from '../../../utils/change-order-generator';

type Mode = 'existing' | 'new';

const emptyCustomer = (): ProjectCustomerDetails => ({
  projectNumber: '',
  companyName: '',
});

export const ChangeOrderGenerator: React.FC = () => {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('existing');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId) || null, [projects, selectedProjectId]);

  // New project form
  const [newProjectDriveLink, setNewProjectDriveLink] = useState('');
  const [newProjectCustomer, setNewProjectCustomer] = useState<ProjectCustomerDetails>(emptyCustomer());
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Change order form
  const [driveFolderLink, setDriveFolderLink] = useState('');
  const [customer, setCustomer] = useState<ProjectCustomerDetails>(emptyCustomer());
  const [amountUsd, setAmountUsd] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [salesNotes, setSalesNotes] = useState('');
  const [nextNumber, setNextNumber] = useState<number | null>(null);

  const [aiBody, setAiBody] = useState<ChangeOrderAiBody | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedChangeOrder, setSavedChangeOrder] = useState<ChangeOrderRecord | null>(null);
  const [exportFormat, setExportFormat] = useState<ChangeOrderFileFormat>('pdf');

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load projects (${res.status})`);
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      logger.error('Failed to load projects', e);
      toast({ type: 'error', title: 'Failed to load projects', message: 'Please try again.' });
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync project details into CO form on selection
  useEffect(() => {
    if (!selectedProject) return;
    setDriveFolderLink(selectedProject.driveFolderLink || '');
    setCustomer(selectedProject.customer || emptyCustomer());
    setSavedChangeOrder(null);
    setAiBody(null);
    setAmountUsd(0);
    setDescription('');
    setRequestedBy('');
    setSalesNotes('');
  }, [selectedProjectId]); // intentionally only on id change

  // Fetch next CO#
  useEffect(() => {
    async function loadNext() {
      if (!selectedProjectId) {
        setNextNumber(null);
        return;
      }
      try {
        const res = await fetch(`/api/change-orders/next-number?projectId=${encodeURIComponent(selectedProjectId)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to get next number (${res.status})`);
        setNextNumber(Number(data.nextNumber));
      } catch (e) {
        logger.error('Failed to load next change order number', e);
        setNextNumber(null);
      }
    }
    loadNext();
  }, [selectedProjectId]);

  async function handleCreateProject() {
    const driveLink = newProjectDriveLink.trim();
    const projectNumber = (newProjectCustomer.projectNumber || '').trim();
    const companyName = (newProjectCustomer.companyName || '').trim();
    if (!driveLink) {
      toast({ type: 'error', title: 'Drive folder link required', message: 'Please paste the project drive folder link.' });
      return;
    }
    if (!projectNumber) {
      toast({ type: 'error', title: 'Project # required', message: 'Please enter the project number.' });
      return;
    }
    if (!companyName) {
      toast({ type: 'error', title: 'Client name required', message: 'Please enter the client/company name.' });
      return;
    }

    setIsCreatingProject(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveFolderLink: driveLink, customer: newProjectCustomer }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to create project (${res.status})`);
      const project: ProjectRecord = data.project;
      setProjects((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
      setMode('existing');
      setSelectedProjectId(project.id);
      toast({ type: 'success', title: 'Project created', message: 'Ready to create change orders.' });
    } catch (e) {
      logger.error('Create project failed', e);
      toast({ type: 'error', title: 'Create project failed', message: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setIsCreatingProject(false);
    }
  }

  const input: ChangeOrderInput | null = useMemo(() => {
    if (!selectedProjectId) return null;
    return {
      projectId: selectedProjectId,
      driveFolderLink: driveFolderLink.trim(),
      customer,
      amountUsd: Number(amountUsd || 0),
      description: description.trim(),
      requestedBy: requestedBy.trim() || undefined,
      salesNotes: salesNotes.trim() || undefined,
    };
  }, [amountUsd, customer, description, driveFolderLink, requestedBy, salesNotes, selectedProjectId]);

  async function handleGenerateAi() {
    if (!input) return;
    if (!input.driveFolderLink) {
      toast({ type: 'error', title: 'Drive folder link required', message: 'Please paste the project drive folder link.' });
      return;
    }
    if (!input.customer?.projectNumber?.trim() || !input.customer?.companyName?.trim()) {
      toast({ type: 'error', title: 'Missing customer details', message: 'Project # and Client name are required.' });
      return;
    }
    if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
      toast({ type: 'error', title: 'Invalid amount', message: 'Enter a change order amount > 0.' });
      return;
    }
    if (!input.description?.trim()) {
      toast({ type: 'error', title: 'Description required', message: 'Enter basic details about what the change order is for.' });
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/change-orders/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `AI generation failed (${res.status})`);
      setAiBody(data.aiBody as ChangeOrderAiBody);
      toast({ type: 'success', title: 'AI draft generated', message: 'Review and save when ready.' });
    } catch (e) {
      logger.error('AI generate change order failed', e);
      toast({ type: 'error', title: 'AI generation failed', message: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setIsGeneratingAi(false);
    }
  }

  async function handleSave() {
    if (!input) return;
    if (!input.driveFolderLink) {
      toast({ type: 'error', title: 'Drive folder link required', message: 'Please paste the project drive folder link.' });
      return;
    }
    if (!input.customer?.projectNumber?.trim() || !input.customer?.companyName?.trim()) {
      toast({ type: 'error', title: 'Missing customer details', message: 'Project # and Client name are required.' });
      return;
    }
    if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
      toast({ type: 'error', title: 'Invalid amount', message: 'Enter a change order amount > 0.' });
      return;
    }
    if (!input.description?.trim()) {
      toast({ type: 'error', title: 'Description required', message: 'Enter basic details about what the change order is for.' });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          aiBody: aiBody || undefined,
          generateAiBody: !aiBody, // if no AI draft yet, generate server-side
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to save (${res.status})`);
      setSavedChangeOrder(data.changeOrder as ChangeOrderRecord);
      toast({ type: 'success', title: 'Change order saved', message: 'You can now export PDF/Word.' });

      // Refresh next number
      const nextRes = await fetch(`/api/change-orders/next-number?projectId=${encodeURIComponent(selectedProjectId)}`);
      const nextData = await nextRes.json().catch(() => ({}));
      if (nextRes.ok && nextData?.success) setNextNumber(Number(nextData.nextNumber));
    } catch (e) {
      logger.error('Save change order failed', e);
      toast({ type: 'error', title: 'Save failed', message: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport(format: ChangeOrderFileFormat) {
    const co = savedChangeOrder;
    if (!co) return;
    try {
      const { blob, filename } = await generateChangeOrder(co, format);
      downloadBlob(blob, filename);

      // Upload to the project's stored folder in EverWatt storage
      const contentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const file = new File([blob], filename, { type: contentType });
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch(`/api/change-orders/${encodeURIComponent(co.id)}/upload`, { method: 'POST', body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok || !upData?.success) {
        throw new Error(upData?.error || `Upload failed (${up.status})`);
      }
      setSavedChangeOrder(upData.changeOrder as ChangeOrderRecord);
      toast({ type: 'success', title: 'Uploaded', message: 'Saved into the project folder.' });
    } catch (e) {
      logger.error('Export change order failed', e);
      toast({ type: 'error', title: 'Export/Upload failed', message: e instanceof Error ? e.message : 'Could not generate or upload document.' });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardSignature className="w-6 h-6 text-slate-700" />
            Change Order Generator
          </h2>
          <p className="text-gray-600 mt-1">Create, number, and generate professional change orders (PDF/Word).</p>
        </div>
      </div>

      {/* Project selection / creation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'existing' ? 'bg-white border border-slate-300' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              Existing Project
            </button>
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'new' ? 'bg-white border border-slate-300' : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              New Project
            </button>
          </div>

          {mode === 'existing' ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customer?.projectNumber || p.id} — {p.customer?.companyName || ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadProjects}
                className="text-sm text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Refresh projects
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Drive Folder Link *</label>
                <input
                  value={newProjectDriveLink}
                  onChange={(e) => setNewProjectDriveLink(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                  placeholder="Paste the project drive folder link"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project # *</label>
                  <input
                    value={newProjectCustomer.projectNumber}
                    onChange={(e) => setNewProjectCustomer((p) => ({ ...p, projectNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholder="EW-2025-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">OBF #</label>
                  <input
                    value={newProjectCustomer.obfNumber || ''}
                    onChange={(e) => setNewProjectCustomer((p) => ({ ...p, obfNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client / Company Name *</label>
                <input
                  value={newProjectCustomer.companyName}
                  onChange={(e) => setNewProjectCustomer((p) => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                  placeholder="ABC Manufacturing Inc."
                />
              </div>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreatingProject}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isCreatingProject ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
              >
                {isCreatingProject ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Create Project
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-900">Change Order</p>
            <span className="text-xs text-slate-600">
              Next CO#: <span className="font-semibold text-slate-900">{nextNumber ?? '—'}</span>
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Drive Folder Link *</label>
              <input
                value={driveFolderLink}
                onChange={(e) => setDriveFolderLink(e.target.value)}
                disabled={!selectedProjectId}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                placeholder="Paste the project drive folder link"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project # *</label>
                <input
                  value={customer.projectNumber}
                  onChange={(e) => setCustomer((p) => ({ ...p, projectNumber: e.target.value }))}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">OBF #</label>
                <input
                  value={customer.obfNumber || ''}
                  onChange={(e) => setCustomer((p) => ({ ...p, obfNumber: e.target.value }))}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client / Company Name *</label>
              <input
                value={customer.companyName}
                onChange={(e) => setCustomer((p) => ({ ...p, companyName: e.target.value }))}
                disabled={!selectedProjectId}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Change Order Amount (USD) *</label>
                <input
                  type="number"
                  value={amountUsd || ''}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  placeholder="25000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Requested By</label>
                <input
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                  placeholder="Sales / Client contact"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Basic Details (what is this change order for?) *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!selectedProjectId}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                rows={4}
                placeholder="Example: Add (2) VFDs to AHU-3 and AHU-4 including electrical tie-in, controls integration, startup, and commissioning..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sales Notes (optional)</label>
              <textarea
                value={salesNotes}
                onChange={(e) => setSalesNotes(e.target.value)}
                disabled={!selectedProjectId}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                rows={2}
                placeholder="Any notes you want the AI to incorporate (constraints, assumptions, pricing notes)."
              />
            </div>

            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleGenerateAi}
                disabled={!selectedProjectId || isGeneratingAi}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  !selectedProjectId || isGeneratingAi
                    ? 'bg-slate-300 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                }`}
              >
                {isGeneratingAi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Generate with AI
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedProjectId || isSaving}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                  !selectedProjectId || isSaving
                    ? 'bg-slate-300 text-white cursor-not-allowed'
                    : 'bg-slate-800 text-white hover:bg-slate-900'
                }`}
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Save Change Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Draft Preview
          </h3>
          {!aiBody ? (
            <p className="text-sm text-gray-600">Generate with AI to see a professional draft here.</p>
          ) : (
            <div className="space-y-3 text-sm text-gray-800">
              <div>
                <p className="text-xs font-semibold text-gray-600">Subject</p>
                <p className="font-medium">{aiBody.subjectLine}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Summary</p>
                <p className="whitespace-pre-wrap">{aiBody.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Scope of Work</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(aiBody.scopeOfWork || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Terms</p>
                <ul className="list-disc pl-5 space-y-1">
                  {(aiBody.termsAndConditions || []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-700" />
            Export
          </h3>

          {!savedChangeOrder ? (
            <p className="text-sm text-gray-600">Save the change order to enable export.</p>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-slate-900">
                  Saved: CO #{savedChangeOrder.changeOrderNumber} for Project #{savedChangeOrder.customer?.projectNumber}
                </p>
                <p className="text-slate-700">{savedChangeOrder.customer?.companyName}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat('pdf');
                    handleExport('pdf');
                  }}
                  className={`py-3 px-4 rounded-lg font-semibold border transition-colors ${
                    exportFormat === 'pdf' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportFormat('word');
                    handleExport('word');
                  }}
                  className={`py-3 px-4 rounded-lg font-semibold border transition-colors ${
                    exportFormat === 'word' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Export Word
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Exporting will also upload the document into the project’s stored folder in EverWatt (and track it on the change order).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


