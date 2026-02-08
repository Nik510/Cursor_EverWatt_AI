import type { ProjectRecord } from '../../types/change-order';

type VaultFile = NonNullable<ProjectRecord['vault']>['files'] extends Array<infer T> ? T : any;

export function Phase1FoundationPanel(props: { projectId: string; vaultFiles: VaultFile[] }) {
  const tree = [
    'Project (Phase 1 universe)',
    '├── Assets (authoritative, human-defined)',
    '│   ├── Asset (AHU, Chiller, Lighting Area, Panel, VAV, Other)',
    '│   │   ├── Properties (name, type, location, tags)',
    '│   │   ├── Evidence Links (optional)',
    '│   │   ├── Measures (optional)',
    '│   │   └── Assumptions (optional)',
    '│',
    '├── Evidence (files only, non-authoritative)',
    '│   ├── File',
    '│   │   ├── Extracted Chunks',
    '│   │   └── AI Suggestions (unconfirmed)',
    '│',
    '├── Inbox / Review Queue (unconfirmed only)',
    '│   ├── Suggested Asset',
    '│   ├── Suggested Property',
    '│   └── Suggested Measure',
    '│',
    '└── Decisions / Rationale',
    '    ├── Accepted',
    '    ├── Rejected',
    '    └── Modified',
  ].join('\n');

  const flow = [
    'Phase 1 flow (Assets-first, two-lane)',
    '',
    'Lane A — Reality (authoritative)',
    '  1) Create Project',
    '  2) Add Asset (manual, named by human)',
    '  5) Human confirms → Asset / Measure / Assumption',
    '  6) Decision logged',
    '',
    'Lane B — Evidence (non-authoritative)',
    '  3) (Optional) Upload Evidence (file only)',
    '  4) AI extracts facts → Inbox (unconfirmed)',
    '',
    'The lanes only meet at confirmation.',
  ].join('\n');

  const example = [
    'Example walkthrough (Phase 1): RCP → propose 2 fixtures + 1 panel → confirm',
    '',
    '1) Add assets first (Graph → Asset Registry)',
    '   - Create: Lighting Area LA-1 (e.g. 2nd Floor West)',
    '',
    '2) Upload RCP.pdf (Vault) (optional, evidence-only)',
    '',
    '3) Evidence Viewer: select RCP.pdf, search for fixture/panel references; note page/sheet',
    '',
    '4) AI extracts and proposes into Inbox (unconfirmed):',
    '   - Suggested Asset: Lighting fixture (2x4 troffer) with provenance {fileId,page}',
    '   - Suggested Asset: Lighting fixture (downlight) with provenance {fileId,page}',
    '   - Suggested Asset: Panel (LP-2) with provenance {fileId,page}',
    '',
    '5) Human reviews Inbox and confirms:',
    '   - Create/confirm assets: FIX-1, FIX-2, PNL-1 (LP-2)',
    '   - Attach evidenceRefs to each confirmed asset',
    '',
    '6) Decision logged: accepted/rejected/modified rationale',
  ].join('\n');

  const deferrals = [
    '- No fully automated takeoff claims',
    '- No CAD ingestion (DWG/DXF/IFC)',
    '- No XLSX mapping UI / table-to-schema mapping yet',
    '- No telemetry/BMS bindings yet',
    '- No commissioning/verification log yet',
    '- No “state of knowledge” dashboards',
    '- No standalone edge list (edges are implicit via refs in Phase 1)',
  ].join('\n');

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Phase 1 Foundation Map</h3>
        <p className="text-sm text-gray-600">
          This panel locks the Phase 1 data flow and schema. It’s the reference tree the system should follow.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Full doc: <span className="font-mono">docs/project-builder/PHASE1_FOUNDATION.md</span>
        </p>
      </div>

      <details className="border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">1) Project Graph schema (nodes + edges)</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">{tree}</pre>
        <div className="mt-3 text-xs text-gray-600">
          Edges are implicit in Phase 1: nodes reference evidence via <span className="font-mono">provenance</span> /{' '}
          <span className="font-mono">evidenceRefs</span>.
        </div>
      </details>

      <details className="border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">2) Example walkthrough (RCP → propose → confirm)</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">{example}</pre>
      </details>

      <details className="border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">3) Explicit Phase 1 deferrals</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">{deferrals}</pre>
      </details>

      <details className="border border-gray-200 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900">Data flow (tree-following logic)</summary>
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">{flow}</pre>
        <div className="mt-3 text-xs text-gray-600">Vault files in this project: {props.vaultFiles.length}</div>
      </details>
    </div>
  );
}

