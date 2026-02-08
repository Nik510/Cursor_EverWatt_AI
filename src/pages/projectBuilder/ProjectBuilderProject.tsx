import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileUp, FolderOpen, Brain, Network, CheckCircle2, XCircle, RefreshCw, Trash2, Save, ClipboardList, ListChecks } from 'lucide-react';
import type { ProjectRecord } from '../../types/change-order';
import { ProjectAiChat } from '../../components/projectBuilder/ProjectAiChat';
import { EvidenceViewer } from '../../components/projectBuilder/EvidenceViewer';
import { AssetRegistry } from '../../components/projectBuilder/AssetRegistry';
import { Phase1FoundationPanel } from '../../components/projectBuilder/Phase1FoundationPanel';
import { WorkbookIngestionPanel } from '../../components/projectBuilder/WorkbookIngestionPanel';
import { ProposalReviewPanel } from '../../components/projectBuilder/ProposalReviewPanel';
import { logger } from '../../services/logger';
import * as pbApi from '../../shared/api/projectBuilder';

type VaultFile = NonNullable<ProjectRecord['vault']>['files'] extends Array<infer T> ? T : any;

export const ProjectBuilderProject: React.FC = () => {
  const params = useParams();
  const projectId = String(params.projectId || '').trim();

  const SHOW_LABS =
    String(import.meta.env.VITE_SHOW_LABS || '').trim().toLowerCase() === 'true' || import.meta.env.DEV;
  const canCommit = String(import.meta.env.VITE_ENABLE_PROPOSAL_COMMIT || '').trim().toLowerCase() === 'true';

  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [graph, setGraph] = useState<any>(null);
  // Workbook ingest is a valid starting point; keep Vault accessible.
  const [activeTab, setActiveTab] = useState<'vault' | 'graph' | 'inbox' | 'proposals' | 'decisions' | 'ai'>('vault');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [decisionMemory, setDecisionMemory] = useState<any[]>([]);
  const [dmTitle, setDmTitle] = useState('');
  const [dmNote, setDmNote] = useState('');
  const [dmFileId, setDmFileId] = useState<string>('');
  const [dmPage, setDmPage] = useState<string>('');
  const [dmSheet, setDmSheet] = useState<string>('');
  const [dmCellRange, setDmCellRange] = useState<string>('');
  const [eeScopeDraft, setEeScopeDraft] = useState<string>('');
  const [savingEeScope, setSavingEeScope] = useState(false);
  const [savingDm, setSavingDm] = useState(false);

  async function loadAll() {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [pData, vData, gData, dmData] = await Promise.all([
        pbApi.getProject(projectId),
        pbApi.listVaultFiles(projectId),
        pbApi.getGraph(projectId),
        pbApi.getDecisionMemory(projectId),
      ]);

      setProject(pData.project as ProjectRecord);
      setVaultFiles(Array.isArray(vData.files) ? vData.files : []);
      setGraph(gData.graph || null);
      setDecisionMemory(Array.isArray((dmData as any).items) ? (dmData as any).items : []);
    } catch (e) {
      logger.error('Failed to load project builder data', e);
      setError(e instanceof Error ? e.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function ingestWorkbookToInbox(file: File) {
    if (!projectId) return;
    setUploading(true);
    setToast(null);
    try {
      const data = await pbApi.ingestWorkbookToInbox(projectId, file);
      if ((data as any)?.file) setVaultFiles((prev) => [...prev, (data as any).file]);
      if ((data as any)?.graph) setGraph((data as any).graph);
      setToast({
        kind: 'success',
        message: `Workbook ingested to Inbox (created=${Number((data as any).createdCount || 0)}, skipped=${Number((data as any).skippedCount || 0)}).`,
      });
      setActiveTab('inbox');
    } catch (e) {
      setToast({ kind: 'error', message: e instanceof Error ? e.message : 'Failed to ingest workbook' });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const inbox = useMemo(() => (Array.isArray(graph?.inbox) ? graph.inbox : []), [graph]);
  const assets = useMemo(() => (Array.isArray(graph?.assets) ? graph.assets : []), [graph]);
  const measures = useMemo(() => (Array.isArray(graph?.measures) ? graph.measures : []), [graph]);
  const bomItems = useMemo(() => (Array.isArray(graph?.bomItems) ? graph.bomItems : []), [graph]);
  const decisions = useMemo(() => (Array.isArray(graph?.decisions) ? graph.decisions : []), [graph]);
  const hasAssets = assets.length > 0;

  const vaultById = useMemo(() => {
    const m = new Map<string, any>();
    for (const f of vaultFiles as any[]) {
      if (f?.id) m.set(String(f.id), f);
    }
    return m;
  }, [vaultFiles]);

  const [evidenceFileId, setEvidenceFileId] = useState<string>('');
  const [evidencePage, setEvidencePage] = useState<number | undefined>(undefined);
  const [evidenceSheet, setEvidenceSheet] = useState<string | undefined>(undefined);

  const [selectedInboxItemId, setSelectedInboxItemId] = useState<string>('');
  const selectedInboxItem = useMemo(
    () => inbox.find((it: any) => String(it?.id || '') === String(selectedInboxItemId || '')) || null,
    [inbox, selectedInboxItemId]
  );
  const [decisionModal, setDecisionModal] = useState<{ open: boolean; inboxItemId: string; decision: 'ACCEPT' | 'REJECT' } | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
  const [deciding, setDeciding] = useState(false);

  function formatProvenance(p: any): { fileId?: string; filename?: string; page?: number; sheet?: string; cellRange?: string } {
    const fileId = String(p?.fileId || p?.file || p?.sourceFileId || '').trim() || undefined;
    const file = fileId ? vaultById.get(fileId) : null;
    const filename = file?.filename ? String(file.filename) : undefined;
    const page = Number.isFinite(Number(p?.page)) ? Number(p.page) : undefined;
    const sheet = String(p?.sheet || '').trim() || undefined;
    const cellRange = String(p?.cellRange || '').trim() || undefined;
    return { fileId, filename, page, sheet, cellRange };
  }

  useEffect(() => {
    // keep local ee scope draft in sync with project record after loads/analyzer
    const s = (project as any)?.eeScopeSummary;
    if (typeof s?.draftText === 'string' && s.draftText !== eeScopeDraft) {
      setEeScopeDraft(s.draftText);
    } else if (!s?.draftText && typeof draft?.eeScopeSummaryDraft === 'string' && draft.eeScopeSummaryDraft !== eeScopeDraft) {
      setEeScopeDraft(draft.eeScopeSummaryDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.eeScopeSummary, draft?.eeScopeSummaryDraft]);

  async function uploadFile(file: File) {
    if (!projectId) return;
    setUploading(true);
    setError(null);
    setToast(null);
    try {
      const data = await pbApi.uploadVaultFile(projectId, file);
      if ((data as any)?.file) setVaultFiles((prev) => [...prev, (data as any).file]);
      setToast({ kind: 'success', message: 'Upload complete. File added to Project Vault.' });
    } catch (e) {
      logger.error('Vault upload failed', e);
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function runAnalyzer() {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);
    setToast(null);
    try {
      const data = await pbApi.analyzeProject(projectId);
      setDraft((data as any).draft || null);
      if ((data as any).graph) setGraph((data as any).graph || null);
    } catch (e) {
      logger.error('Analyzer failed', e);
      setError(e instanceof Error ? e.message : 'Analyzer failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function refreshGraph() {
    if (!projectId) return;
    try {
      const gData = await pbApi.getGraph(projectId);
      setGraph((gData as any).graph || null);
    } catch {
      // best-effort
    }
  }

  async function saveGraph(next: any) {
    if (!projectId) return;
    setError(null);
    try {
      const data = await pbApi.putGraph(projectId, next);
      setGraph((data as any).graph || next);
    } catch (e) {
      logger.error('Save graph failed', e);
      setError(e instanceof Error ? e.message : 'Failed to save graph');
    }
  }

  async function decideInboxItem(args: { inboxItemId: string; decision: 'ACCEPT' | 'REJECT'; reason: string }) {
    if (!projectId) return;
    const reason = String(args.reason || '').trim();
    if (!reason) {
      setError('Reason is required.');
      return;
    }
    setError(null);
    setToast(null);
    setDeciding(true);
    try {
      const data = await pbApi.decideInboxItem(projectId, args.inboxItemId, { decision: args.decision, reason });
      if ((data as any).graph) setGraph((data as any).graph);
      setToast({ kind: 'success', message: `${args.decision === 'ACCEPT' ? 'Accepted' : 'Rejected'} inbox item.` });
      setDecisionModal(null);
      setDecisionReason('');
      setSelectedInboxItemId('');
    } catch (e) {
      logger.error('Inbox decide failed', e);
      setError(e instanceof Error ? e.message : 'Failed to decide inbox item');
    } finally {
      setDeciding(false);
    }
  }

  async function saveEeScope(status: 'draft' | 'approved') {
    if (!projectId) return;
    setSavingEeScope(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const patch = {
        eeScopeSummary: {
          status,
          draftText: eeScopeDraft,
          ...(status === 'approved' ? { approvedText: eeScopeDraft } : {}),
          updatedAt: now,
        },
      };
      const data = await (await import('../../shared/api/client')).apiRequest<{ success: true; project: ProjectRecord }>({
        url: `/api/projects/${encodeURIComponent(projectId)}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patch }),
      });
      setProject(data.project as ProjectRecord);
    } catch (e) {
      logger.error('Save EE scope failed', e);
      setError(e instanceof Error ? e.message : 'Failed to save EE scope');
    } finally {
      setSavingEeScope(false);
    }
  }

  async function addDecisionMemory() {
    if (!projectId) return;
    const title = dmTitle.trim();
    const note = dmNote.trim();
    if (!title || !note) {
      setError('Decision Memory requires a title and note.');
      return;
    }
    setSavingDm(true);
    setError(null);
    try {
      const provenance: any = {};
      if (dmFileId) provenance.fileId = dmFileId;
      if (dmPage.trim()) provenance.page = Number(dmPage);
      if (dmSheet.trim()) provenance.sheet = dmSheet.trim();
      if (dmCellRange.trim()) provenance.cellRange = dmCellRange.trim();
      const body: any = { title, note };
      if (Object.keys(provenance).length > 0) body.provenance = provenance;
      const data = await pbApi.addDecisionMemory(projectId, body);
      setDecisionMemory(Array.isArray((data as any).items) ? (data as any).items : []);
      setDmTitle('');
      setDmNote('');
      setDmFileId('');
      setDmPage('');
      setDmSheet('');
      setDmCellRange('');
    } catch (e) {
      logger.error('Decision memory save failed', e);
      setError(e instanceof Error ? e.message : 'Failed to save decision memory');
    } finally {
      setSavingDm(false);
    }
  }

  async function deleteDecisionMemory(id: string) {
    if (!projectId) return;
    setError(null);
    try {
      const data = await pbApi.deleteDecisionMemory(projectId, id);
      setDecisionMemory(Array.isArray((data as any).items) ? (data as any).items : []);
    } catch (e) {
      logger.error('Decision memory delete failed', e);
      setError(e instanceof Error ? e.message : 'Failed to delete decision memory');
    }
  }

  if (!projectId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="text-sm text-gray-700">Missing projectId.</div>
        <Link to="/project-builder" className="text-sm text-blue-700 underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">
            <Link className="text-blue-700 underline" to="/project-builder">
              Project Builder
            </Link>{' '}
            / <span className="font-mono">{projectId}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {project?.customer?.projectName || project?.customer?.facilityName || project?.customer?.companyName || 'Project'}
          </h1>
          <p className="text-sm text-gray-600">
            Project # <span className="font-semibold">{project?.customer?.projectNumber || '—'}</span> • Company{' '}
            <span className="font-semibold">{project?.customer?.companyName || '—'}</span>
          </p>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
      {toast && (
        <div
          className={`text-sm rounded-lg p-3 border ${
            toast.kind === 'success'
              ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
              : toast.kind === 'error'
                ? 'text-red-700 bg-red-50 border-red-200'
                : 'text-slate-800 bg-slate-50 border-slate-200'
          }`}
        >
          {toast.message}
        </div>
      )}
      {!canCommit && (
        <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="font-semibold">Proposal commit is disabled.</span> You can still import/view ProposalPacks, but you can’t commit scenarios into Inbox on this environment.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === 'vault' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FolderOpen className="w-4 h-4 inline mr-2" />
          Vault
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === 'graph' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Network className="w-4 h-4 inline mr-2" />
          Graph
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === 'inbox' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          Inbox
          {inbox.length ? (
            <span className="ml-2 inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-slate-900 text-white text-xs">{inbox.length}</span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === 'proposals' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
          }`}
        >
          <ClipboardList className="w-4 h-4 inline mr-2" />
          Proposals
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
            activeTab === 'decisions' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
          }`}
        >
          <ListChecks className="w-4 h-4 inline mr-2" />
          Decisions
        </button>
        {SHOW_LABS ? (
          <button
            onClick={() => setActiveTab('ai')}
            disabled={!hasAssets}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
              activeTab === 'ai' ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Brain className="w-4 h-4 inline mr-2" />
            AI (Labs)
          </button>
        ) : null}
      </div>

      {!hasAssets && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
          Start by uploading evidence in Vault, then import a ProposalPack and commit it to Inbox (staging) to confirm into the graph with an auditable decision trail.
        </div>
      )}

      {activeTab === 'vault' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Vault</h2>
              <p className="text-sm text-gray-600">Upload PDFs, spreadsheets (XLSX/CSV), and images. V1 does best-effort extraction + chunking.</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer">
              <FileUp className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.csv,image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0];
                  if (f) void uploadFile(f);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          <EvidenceViewer
            projectId={projectId}
            files={vaultFiles as any}
            selectedFileId={evidenceFileId}
            onSelectFileId={(id) => setEvidenceFileId(id)}
            initialPage={evidencePage}
            initialSheet={evidenceSheet}
          />

          {SHOW_LABS ? (
            <div className="space-y-3">
              <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4 text-sm text-emerald-900">
                <div className="font-semibold">Labs: ingest workbook → Inbox (safe)</div>
                <div className="text-xs text-emerald-800 mt-1">
                  This route appends suggestions to Inbox only. Confirmed graph changes happen only via Accept/Reject decisions.
                </div>
                <label className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 cursor-pointer">
                  <FileUp className="w-4 h-4" />
                  {uploading ? 'Ingesting…' : 'Ingest workbook → Inbox'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      if (f) void ingestWorkbookToInbox(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            <WorkbookIngestionPanel
              projectId={projectId}
              vaultFiles={vaultFiles as any}
              onAfterIngestion={(nextGraph) => {
                if (nextGraph) setGraph(nextGraph);
                // Labs: ingestion may create confirmed items; keep review on Graph.
                setActiveTab('graph');
              }}
              onVaultFilesPatched={(file) => {
                if (file) setVaultFiles((prev) => [...prev, file]);
              }}
            />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
              Workbook ingestion is hidden for the ship slice. Upload workbooks as evidence, then use ProposalPacks → Inbox to confirm scope.
            </div>
          )}
        </div>
      )}

      {activeTab === 'graph' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Project Graph</h2>
            <p className="text-sm text-gray-600">The AI should reason over confirmed graph items, with provenance back to the Vault.</p>
          </div>

          {/* Keep Phase 1 map available, but only after assets exist (don’t distract from the Asset-first entry flow). */}
          {hasAssets && <Phase1FoundationPanel projectId={projectId} vaultFiles={vaultFiles as any} />}

          <AssetRegistry
            graph={graph}
            vaultFiles={vaultFiles as any}
            onSaveGraph={saveGraph}
            onOpenEvidence={(args) => {
              if (args.fileId) setEvidenceFileId(args.fileId);
              setEvidencePage(args.page);
              setEvidenceSheet(args.sheet);
              setActiveTab('vault');
            }}
          />

          <div className="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Inbox (needs confirmation)</div>
              <div className="text-sm text-gray-700">
                Pending: <span className="font-semibold">{inbox.length}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                All Accept/Reject decisions require a reason and are applied via the decision endpoint (audited).
              </div>
            </div>
            <button
              onClick={() => setActiveTab('inbox')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black"
            >
              <ClipboardList className="w-4 h-4" />
              Review Inbox
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Assets — {assets.length}</div>
              <div className="space-y-2">
                {assets.slice(0, 50).map((a: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <div className="font-semibold text-gray-900">{a.name || '(unnamed asset)'}</div>
                    <div className="text-xs text-gray-600">{a.category || '—'}</div>
                  </div>
                ))}
                {assets.length === 0 && <div className="text-sm text-gray-600">No assets yet.</div>}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Measures — {measures.length}</div>
              <div className="space-y-2">
                {measures.slice(0, 50).map((m: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <div className="font-semibold text-gray-900">{m.name || '(unnamed measure)'}</div>
                    <div className="text-xs text-gray-600">{m.category || '—'}</div>
                  </div>
                ))}
                {measures.length === 0 && <div className="text-sm text-gray-600">No measures yet.</div>}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-900">Confirmed BOM (by measure)</div>
            {bomItems.length === 0 && <div className="text-sm text-gray-600">No confirmed BOM items yet.</div>}
            {bomItems.length > 0 && (
              <div className="space-y-3">
                {Object.entries(
                  bomItems.reduce((acc: Record<string, any[]>, b: any) => {
                    const mid = String(b?.measureId || '').trim() || '(unknown)';
                    acc[mid] = acc[mid] || [];
                    acc[mid].push(b);
                    return acc;
                  }, {})
                ).map(([measureId, items]) => {
                  const list = Array.isArray(items) ? (items as any[]) : [];
                  const m = measures.find((x: any) => String(x?.id || '') === measureId);
                  return (
                    <div key={measureId} className="border border-gray-200 rounded-lg p-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {m?.name ? String(m.name) : 'Measure'}{' '}
                        <span className="text-xs font-mono text-gray-600">({measureId})</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">records: {list.length}</div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs text-blue-700 underline">View items JSON</summary>
                        <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-64 text-xs">{JSON.stringify(list, null, 2)}</pre>
                      </details>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-900">Decision Memory</div>
            <p className="text-xs text-gray-600">
              Capture why choices were made (assumptions, rejections, commissioning changes). Add provenance when possible.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="font-medium text-gray-700">Title *</div>
                <input value={dmTitle} onChange={(e) => setDmTitle(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Evidence file (optional)</div>
                <select
                  value={dmFileId}
                  onChange={(e) => setDmFileId(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">(none)</option>
                  {(vaultFiles as any[]).map((f: any) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.filename}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm md:col-span-2">
                <div className="font-medium text-gray-700">Note *</div>
                <textarea
                  value={dmNote}
                  onChange={(e) => setDmNote(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Page (optional)</div>
                <input value={dmPage} onChange={(e) => setDmPage(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. 2" />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Sheet (optional)</div>
                <input value={dmSheet} onChange={(e) => setDmSheet(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. E2.1" />
              </label>
              <label className="text-sm">
                <div className="font-medium text-gray-700">Cell range (optional)</div>
                <input
                  value={dmCellRange}
                  onChange={(e) => setDmCellRange(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Sheet1!A1:D20"
                />
              </label>
            </div>

            <button
              onClick={() => void addDecisionMemory()}
              disabled={savingDm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingDm ? 'Saving…' : 'Add Decision Memory'}
            </button>

            <div className="pt-2 space-y-2">
              {decisionMemory.length === 0 && <div className="text-sm text-gray-600">No decision memory yet.</div>}
              {decisionMemory.slice(0, 100).map((m: any) => {
                const prov = formatProvenance(m?.provenance || {});
                const viewHref = prov.fileId && vaultById.get(prov.fileId)?.storageKey ? `/api/files/${encodeURIComponent(String(vaultById.get(prov.fileId)?.storageKey))}` : null;
                return (
                  <div key={String(m.id)} className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{m.title}</div>
                      <div className="text-xs text-gray-600 whitespace-pre-wrap">{m.note}</div>
                      {(prov.fileId || prov.page || prov.sheet || prov.cellRange) && (
                        <div className="mt-1 text-xs text-gray-500 font-mono">
                          {prov.fileId ? `fileId=${prov.fileId} ` : ''}
                          {prov.page ? `page=${prov.page} ` : ''}
                          {prov.sheet ? `sheet=${prov.sheet} ` : ''}
                          {prov.cellRange ? `cellRange=${prov.cellRange}` : ''}
                          {viewHref ? (
                            <a className="ml-2 text-blue-700 underline font-sans" href={viewHref} target="_blank" rel="noreferrer">
                              View
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => void deleteDecisionMemory(String(m.id))}
                      className="text-xs text-red-700 hover:text-red-800 inline-flex items-center gap-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Inbox</h2>
              <p className="text-sm text-gray-600">
                Review suggestions. Accept/Reject requires a reason and applies via the server decision endpoint (no direct graph mutation from UI).
              </p>
            </div>
            <button
              onClick={() => void refreshGraph()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 text-sm font-semibold text-gray-900">Pending — {inbox.length}</div>
              <div className="max-h-[32rem] overflow-auto">
                {inbox.length === 0 && <div className="p-4 text-sm text-gray-600">No items awaiting review.</div>}
                {inbox.map((it: any) => {
                  const id = String(it?.id || '');
                  const prov = it?.provenance || {};
                  const conf = Number(it?.confidence ?? 0);
                  const selected = id && id === selectedInboxItemId;
                  const sourceSummary =
                    String(prov?.source || '') === 'proposalPack'
                      ? `proposalPack=${String(prov?.proposalPackId || prov?.fileId || '').slice(0, 8)}… scenario=${String(prov?.scenarioId || '').slice(0, 8)}…`
                      : prov?.sheet
                        ? `sheet=${String(prov.sheet)}`
                        : prov?.fileId
                          ? `fileId=${String(prov.fileId).slice(0, 8)}…`
                          : '—';
                  return (
                    <button
                      key={id || Math.random()}
                      onClick={() => setSelectedInboxItemId(id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${selected ? 'bg-blue-50' : 'bg-white'}`}
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">{String(it?.kind || '(unknown kind)')}</div>
                      <div className="text-xs text-gray-600">
                        confidence={Number.isFinite(conf) ? conf.toFixed(2) : '0.00'} • {sourceSummary}
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono truncate">id={id}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3 border border-gray-200 rounded-lg p-4 space-y-3">
              {!selectedInboxItem ? (
                <div className="text-sm text-gray-600">Select an item to review its payload and provenance.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">Item detail</div>
                      <div className="text-xs text-gray-600 font-mono truncate">
                        id={String(selectedInboxItem?.id || '')} kind={String(selectedInboxItem?.kind || '')} status={String(selectedInboxItem?.status || '')}
                      </div>
                    </div>
                    <button
                      className="text-xs text-gray-700 hover:text-gray-900 underline"
                      onClick={() => {
                        const p = selectedInboxItem?.provenance || {};
                        if (p?.fileId) setEvidenceFileId(String(p.fileId));
                        setEvidencePage(Number.isFinite(Number(p?.page)) ? Number(p.page) : undefined);
                        setEvidenceSheet(p?.sheet ? String(p.sheet) : undefined);
                        setActiveTab('vault');
                      }}
                    >
                      Open evidence
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-900 mb-1">Payload</div>
                      <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-64">
                        {JSON.stringify(
                          {
                            suggestedAsset: selectedInboxItem?.suggestedAsset,
                            suggestedMeasure: selectedInboxItem?.suggestedMeasure,
                            suggestedBomItems: selectedInboxItem?.suggestedBomItems,
                            suggestedProperty: selectedInboxItem?.suggestedProperty,
                            quantity: selectedInboxItem?.quantity,
                            unit: selectedInboxItem?.unit,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-900 mb-1">Provenance</div>
                      <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-64">{JSON.stringify(selectedInboxItem?.provenance || {}, null, 2)}</pre>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setDecisionReason('');
                        setDecisionModal({ open: true, inboxItemId: String(selectedInboxItem?.id || ''), decision: 'ACCEPT' });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        setDecisionReason('');
                        setDecisionModal({ open: true, inboxItemId: String(selectedInboxItem?.id || ''), decision: 'REJECT' });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {decisionModal?.open && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setDecisionModal(null)}>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{decisionModal.decision === 'ACCEPT' ? 'Accept' : 'Reject'} inbox item</div>
                    <div className="text-xs text-gray-600 font-mono truncate">id={decisionModal.inboxItemId}</div>
                  </div>
                  <button className="text-sm text-gray-700 hover:text-gray-900" onClick={() => setDecisionModal(null)}>
                    Close
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="text-sm text-gray-700">Reason (required)</div>
                  <textarea
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={4}
                    placeholder="Why are you making this decision?"
                  />
                </div>
                <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => setDecisionModal(null)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-50"
                    disabled={deciding}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      void decideInboxItem({
                        inboxItemId: decisionModal.inboxItemId,
                        decision: decisionModal.decision,
                        reason: decisionReason,
                      })
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 ${
                      decisionModal.decision === 'ACCEPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-black'
                    }`}
                    disabled={deciding}
                  >
                    {deciding ? 'Saving…' : decisionModal.decision === 'ACCEPT' ? 'Accept' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'decisions' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Decisions</h2>
              <p className="text-sm text-gray-600">Latest decision ledger entries (accept/reject/modified) with rationale and provenance context.</p>
            </div>
            <button
              onClick={() => void refreshGraph()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {decisions.length === 0 && <div className="text-sm text-gray-600">No decisions recorded yet.</div>}
          {decisions.length > 0 && (
            <div className="space-y-2">
              {decisions
                .slice()
                .reverse()
                .slice(0, 100)
                .map((d: any) => (
                  <div key={String(d?.id || Math.random())} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {String(d?.disposition || '')} • {String(d?.decisionType || '')}
                        </div>
                        <div className="text-xs text-gray-600 font-mono truncate">{String(d?.context || '')}</div>
                        <div className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{String(d?.rationale || '')}</div>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{String(d?.date || '')}</div>
                    </div>
                    {Array.isArray(d?.evidenceRefs) && d.evidenceRefs.length > 0 ? (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-xs text-blue-700 underline">Evidence refs</summary>
                        <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-48 text-xs">{JSON.stringify(d.evidenceRefs, null, 2)}</pre>
                      </details>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'proposals' && (
        <ProposalReviewPanel projectId={projectId} enableCommit={canCommit} showLabs={SHOW_LABS} onAfterCommit={() => void refreshGraph()} />
      )}

      {activeTab === 'ai' && SHOW_LABS && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Analyzer</h2>
              <p className="text-sm text-gray-600">Generates summary + inferred assets/measures + missing info checklist. Items land in Inbox for confirmation.</p>
            </div>
            <button
              onClick={() => void runAnalyzer()}
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              {analyzing ? 'Analyzing…' : 'Run Analyzer'}
            </button>
            {draft && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-900">Draft output</div>
                <details className="text-sm">
                  <summary className="cursor-pointer">View JSON</summary>
                  <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-80 text-xs">
                    {JSON.stringify(draft, null, 2)}
                  </pre>
                </details>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-900">EE Scope Summary</div>
              <p className="text-xs text-gray-600">AI drafts a scope summary; you approve it. Approved text becomes a structured project artifact.</p>
              <textarea
                value={eeScopeDraft}
                onChange={(e) => setEeScopeDraft(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={6}
                placeholder="Run Analyzer or write a draft here…"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void saveEeScope('draft')}
                  disabled={savingEeScope}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save Draft
                </button>
                <button
                  onClick={() => void saveEeScope('approved')}
                  disabled={savingEeScope || !eeScopeDraft.trim()}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
                {(project as any)?.eeScopeSummary?.status && (
                  <div className="text-xs text-gray-600 self-center">
                    Status: <span className="font-semibold">{String((project as any).eeScopeSummary.status)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Tip: If you want better results, upload a sheet index PDF page and any fixture schedule / equipment schedule spreadsheets first.
            </div>
          </div>

          <ProjectAiChat projectId={projectId} />
        </div>
      )}

    </div>
  );
};

