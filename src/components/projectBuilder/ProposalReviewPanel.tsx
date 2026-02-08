import { useEffect, useMemo, useState } from 'react';
import { Download, Play, Upload } from 'lucide-react';
import * as pbApi from '../../shared/api/projectBuilder';
import { runCalculator as runCalculatorApi } from '../../shared/api/calculators';

type ProposalIndex = {
  proposalPackId: string;
  createdAt: string;
  createdBy: string;
  title: string;
  summary?: string;
  basedOnSnapshotId?: string;
};

export function ProposalReviewPanel(props: {
  projectId: string;
  enableCommit?: boolean;
  showLabs?: boolean;
  onAfterCommit?: () => void;
}) {
  const canCommit = String((import.meta as any)?.env?.VITE_ENABLE_PROPOSAL_COMMIT || '').trim().toLowerCase() === 'true';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ProposalIndex[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [pack, setPack] = useState<any>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');

  const [importText, setImportText] = useState<string>('');
  const [draftPack, setDraftPack] = useState<any>(null);

  const selectedProposal = useMemo(() => proposals.find((p) => String(p.proposalPackId) === String(selectedId)) || null, [proposals, selectedId]);

  async function loadProposals() {
    if (!props.projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pbApi.listProposals(props.projectId);
      const list = Array.isArray((data as any).proposals) ? (data as any).proposals : [];
      setProposals(list);
      if (list.length === 1 && !selectedId) setSelectedId(String(list[0].proposalPackId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposals');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPack(proposalPackId: string) {
    if (!props.projectId || !proposalPackId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pbApi.getProposalPack(props.projectId, proposalPackId);
      setPack((data as any).pack || null);
      const scenarios = Array.isArray((data as any).pack?.scenarios) ? (data as any).pack.scenarios : [];
      const rec = String((data as any).pack?.recommendedScenarioId || '').trim();
      setSelectedScenarioId(rec || (scenarios[0]?.scenarioId ? String(scenarios[0].scenarioId) : ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposal pack');
      setPack(null);
      setSelectedScenarioId('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.projectId]);

  useEffect(() => {
    if (selectedId) void loadPack(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  async function importPack(packObj: any) {
    if (!props.projectId || !packObj) return;
    setLoading(true);
    setError(null);
    try {
      const data = await pbApi.importProposalPack(props.projectId, packObj);
      await loadProposals();
      if ((data as any).proposalPackId) setSelectedId(String((data as any).proposalPackId));
      setImportText('');
      setDraftPack(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to import proposal pack');
    } finally {
      setLoading(false);
    }
  }

  async function runCalculator(kind: 'battery' | 'hvac') {
    if (!props.projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runCalculatorApi({ kind, projectId: props.projectId });
      setDraftPack((data as any).pack || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run calculator');
      setDraftPack(null);
    } finally {
      setLoading(false);
    }
  }

  async function commitScenarioToInbox(args: { proposalPackId: string; scenarioId: string }) {
    if (!props.projectId) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      try {
        const data = await pbApi.commitProposalScenario(props.projectId, args.proposalPackId, args.scenarioId);
        setNotice(
          `Committed scenario to Inbox. created=${Number((data as any).createdCount || 0)} skipped=${Number((data as any).skippedCount || 0)} inboxCount=${Number(
            (data as any).inboxCount || 0
          )}`
        );
      } catch (e: any) {
        if (e && typeof e === 'object' && (e as any).status === 404 && (e as any).details?.enabled === false) {
          setNotice('Commit disabled server-side. You can still import/view proposals.');
          return;
        }
        throw e;
      }
      props.onAfterCommit?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to commit proposal scenario');
    } finally {
      setLoading(false);
    }
  }

  const scenarios = Array.isArray(pack?.scenarios) ? pack.scenarios : [];
  const selectedScenario = scenarios.find((s: any) => String(s?.scenarioId || '') === String(selectedScenarioId)) || null;
  const deltas = Array.isArray(selectedScenario?.deltas) ? selectedScenario.deltas : [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Proposals</h2>
          <p className="text-sm text-gray-600">
            Import and review ProposalPacks. In staging, you can commit a scenario to Inbox (guarded by a feature flag) and then confirm via Inbox decisions.
          </p>
        </div>
        <button
          onClick={() => void loadProposals()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
      {notice && <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{notice}</div>}
      {!canCommit && (
        <div className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Proposal commit is disabled. You can still import and view proposals.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          {props.showLabs ? (
            <>
              <div className="text-sm font-semibold text-gray-900">Run calculators (Labs)</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runCalculator('battery')}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Run Battery
                </button>
                <button
                  onClick={() => void runCalculator('hvac')}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Run HVAC
                </button>
              </div>
              {draftPack && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-gray-700 font-semibold">Draft ProposalPack (not imported yet)</div>
                  <div className="text-xs text-gray-600">
                    <span className="font-mono">proposalPackId={String(draftPack.proposalPackId || '')}</span>
                  </div>
                  <button
                    onClick={() => void importPack(draftPack)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    Import draft pack
                  </button>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200" />
            </>
          ) : null}

          <div className="text-sm font-semibold text-gray-900">Import ProposalPack JSON</div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.currentTarget.value)}
            rows={8}
            placeholder="Paste ProposalPack JSON here…"
            className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              try {
                const obj = JSON.parse(importText);
                void importPack(obj);
              } catch {
                setError('Invalid JSON in ProposalPack textarea');
              }
            }}
            disabled={loading || !importText.trim()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Import JSON
          </button>

          <div className="pt-2 border-t border-gray-200" />
          <div className="text-sm font-semibold text-gray-900">Imported proposal packs</div>
          {proposals.length === 0 && <div className="text-sm text-gray-600">No proposals imported yet.</div>}
          <div className="space-y-2 max-h-[35vh] overflow-auto pr-1">
            {proposals.map((p) => (
              <button
                key={p.proposalPackId}
                onClick={() => setSelectedId(String(p.proposalPackId))}
                className={`w-full text-left border rounded-lg p-3 hover:bg-gray-50 ${
                  String(selectedId) === String(p.proposalPackId) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900 truncate">{p.title || p.proposalPackId}</div>
                <div className="text-xs text-gray-600 truncate">
                  by {p.createdBy} • {p.createdAt}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-3 space-y-3">
          <div className="text-sm font-semibold text-gray-900">Proposal details</div>
          {!selectedProposal && <div className="text-sm text-gray-600">Select a proposal pack from the left.</div>}

          {pack && (
            <>
              <div className="text-xs text-gray-600">
                <span className="font-mono">proposalPackId={String(pack.proposalPackId || '')}</span>
                <span className="ml-2">basedOnSnapshotId={String(pack.basedOnSnapshotId || '')}</span>
              </div>
              <div className="text-sm text-gray-900">{String(pack.summary || '')}</div>

              <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">Scenarios</div>
                  {canCommit && selectedId && selectedScenarioId ? (
                    <button
                      onClick={() => void commitScenarioToInbox({ proposalPackId: String(selectedId), scenarioId: String(selectedScenarioId) })}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-black disabled:opacity-50"
                      title="Commit the selected scenario into Project Graph inbox suggestions"
                    >
                      Commit scenario → Inbox
                    </button>
                  ) : null}
                </div>
                {scenarios.length === 0 && <div className="text-sm text-gray-600">No scenarios.</div>}
                {scenarios.map((s: any) => (
                  <label key={String(s?.scenarioId || '')} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      checked={String(selectedScenarioId) === String(s?.scenarioId || '')}
                      onChange={() => setSelectedScenarioId(String(s?.scenarioId || ''))}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{String(s?.name || s?.scenarioId || '')}</div>
                      <div className="text-xs text-gray-600">
                        objective={String(s?.objective || '')} • confidence={String(s?.confidence ?? '')} • deltas={Array.isArray(s?.deltas) ? s.deltas.length : 0}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="border border-gray-200 rounded-lg p-3 space-y-3">
                <div className="text-sm font-semibold text-gray-900">Scenario details</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-gray-200 rounded p-2">
                    <div className="text-xs font-semibold text-gray-700">Economics</div>
                    <pre className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(selectedScenario?.economics || {}, null, 2)}</pre>
                  </div>
                  <div className="border border-gray-200 rounded p-2">
                    <div className="text-xs font-semibold text-gray-700">Performance</div>
                    <pre className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(selectedScenario?.performance || {}, null, 2)}</pre>
                  </div>
                </div>

                <div className="text-sm font-semibold text-gray-900">Deltas (explicit)</div>
                {deltas.length === 0 && <div className="text-sm text-gray-600">No deltas in selected scenario.</div>}
                {deltas.length > 0 && (
                  <div className="space-y-2 max-h-[30vh] overflow-auto pr-1">
                    {deltas.map((d: any) => (
                      <div key={String(d?.id || Math.random())} className="text-xs border border-gray-200 rounded p-2">
                        <div className="font-mono text-gray-700">
                          id={String(d?.id || '')} kind={String(d?.kind || '')}
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(d, null, 2)}</pre>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm font-semibold text-gray-900">Assumptions used</div>
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(pack.assumptionsUsed || [], null, 2)}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

