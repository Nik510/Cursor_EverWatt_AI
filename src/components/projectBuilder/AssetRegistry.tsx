import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import type { ProjectRecord } from '../../types/change-order';

type AssetType =
  | 'ahu'
  | 'rtu'
  | 'fan'
  | 'pump'
  | 'vav'
  | 'chiller'
  | 'boiler'
  | 'coolingTower'
  | 'lightingFixture'
  | 'lightingControl'
  | 'lightingArea'
  | 'panel'
  | 'other';

type EvidenceRef = {
  fileId?: string;
  page?: number;
  sheet?: string;
  cellRange?: string;
};

type Asset = {
  id: string; // uuid
  assetTag: string; // required unique
  type: AssetType;
  name?: string;
  aliases?: string[];
  location?: string;
  tags?: string[];
  assetRole?: 'primary' | 'component';
  attachedToAssetId?: string;
  componentType?: string;
  evidenceRefs?: EvidenceRef[];
  baseline?: {
    description?: string;
    equipment?: string[];
    properties?: Record<string, string>;
    frozenAt?: string;
  };
  measures?: Array<{
    id: string;
    name: string;
    measureType?: string;
    before?: { description?: string; equipment?: string[] };
    after?: { description?: string; equipmentAdded?: string[] };
    createdAt?: string;
    updatedAt?: string;
  }>;
};

type VaultFile = NonNullable<ProjectRecord['vault']>['files'] extends Array<infer T> ? T : any;

function uuid(): string {
  // Browser + node both typically have global crypto
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `asset_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const ASSET_TYPES: Array<{ value: AssetType; label: string }> = [
  { value: 'ahu', label: 'AHU' },
  { value: 'rtu', label: 'RTU' },
  { value: 'fan', label: 'Fan' },
  { value: 'pump', label: 'Pump' },
  { value: 'vav', label: 'VAV' },
  { value: 'chiller', label: 'Chiller' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'coolingTower', label: 'Cooling tower' },
  { value: 'lightingFixture', label: 'Lighting fixture' },
  { value: 'lightingControl', label: 'Lighting control' },
  { value: 'lightingArea', label: 'Lighting area' },
  { value: 'panel', label: 'Panel' },
  { value: 'other', label: 'Other equipment' },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ASSET_CATEGORY_OPTIONS = [
  'Lighting',
  'HVAC',
  'Controls',
  'Electrical',
  'Plumbing',
  'Envelope',
  'Medical',
  'IT / Data',
  'Process Load',
  'Other',
] as const;

type AttachmentRule = {
  key: string;
  label: string;
  componentType: string;
  details: Array<{ key: string; label: string; placeholder?: string }>;
};

const ATTACHMENTS_BY_SUBTYPE: Partial<Record<AssetType, AttachmentRule[]>> = {
  ahu: [
    { key: 'vfd', label: 'VFD', componentType: 'VFD', details: [{ key: 'hp', label: 'HP (optional)', placeholder: 'e.g. 10' }, { key: 'vendor', label: 'Vendor (optional)', placeholder: 'e.g. ABB' }] },
    { key: 'economizer', label: 'Economizer', componentType: 'Economizer', details: [{ key: 'type', label: 'Type (optional)', placeholder: 'drybulb / enthalpy / unknown' }] },
    { key: 'heatRecovery', label: 'Heat recovery', componentType: 'Heat Recovery', details: [{ key: 'kind', label: 'Kind (optional)', placeholder: 'wheel / plate / unknown' }] },
    { key: 'humidifier', label: 'Humidifier', componentType: 'Humidifier', details: [{ key: 'kind', label: 'Kind (optional)', placeholder: 'steam / electric / unknown' }] },
    { key: 'preheatCoil', label: 'Preheat coil', componentType: 'Preheat Coil', details: [{ key: 'fuel', label: 'Fuel (optional)', placeholder: 'gas / electric / HW / unknown' }] },
    { key: 'reheatCoil', label: 'Reheat coil', componentType: 'Reheat Coil', details: [{ key: 'fuel', label: 'Fuel (optional)', placeholder: 'gas / electric / HW / unknown' }] },
    { key: 'filters', label: 'Filters', componentType: 'Filters', details: [{ key: 'merv', label: 'MERV (optional)', placeholder: 'e.g. 13' }] },
    { key: 'supplyFan', label: 'Supply fan (modeled separately)', componentType: 'Supply Fan', details: [] },
    { key: 'returnFan', label: 'Return/relief fan (optional)', componentType: 'Return/Relief Fan', details: [] },
  ],
  rtu: [
    { key: 'economizer', label: 'Economizer', componentType: 'Economizer', details: [] },
    { key: 'vfd', label: 'VFD', componentType: 'VFD', details: [{ key: 'hp', label: 'HP (optional)', placeholder: 'e.g. 7.5' }] },
    { key: 'dcv', label: 'Demand control ventilation', componentType: 'DCV', details: [] },
    { key: 'gasHeat', label: 'Gas heat', componentType: 'Gas Heat', details: [] },
    { key: 'heatPump', label: 'Heat pump', componentType: 'Heat Pump', details: [] },
    { key: 'erv', label: 'ERV', componentType: 'ERV', details: [] },
  ],
  fan: [
    { key: 'vfd', label: 'VFD', componentType: 'VFD', details: [{ key: 'hp', label: 'HP (optional)', placeholder: 'e.g. 5' }] },
    { key: 'backdraftDamper', label: 'Backdraft damper', componentType: 'Backdraft Damper', details: [] },
    { key: 'isolationDamper', label: 'Isolation damper', componentType: 'Isolation Damper', details: [] },
  ],
  pump: [
    { key: 'vfd', label: 'VFD', componentType: 'VFD', details: [{ key: 'hp', label: 'HP (optional)', placeholder: 'e.g. 15' }] },
    { key: 'strainer', label: 'Strainer', componentType: 'Strainer', details: [] },
    { key: 'checkValve', label: 'Check valve', componentType: 'Check Valve', details: [] },
  ],
  chiller: [
    { key: 'vfd', label: 'VFD (if applicable)', componentType: 'VFD', details: [] },
    { key: 'coolingTower', label: 'Cooling tower (linked asset)', componentType: 'Cooling Tower', details: [] },
    { key: 'pumps', label: 'Pumps (linked assets)', componentType: 'Pumps', details: [] },
  ],
  boiler: [
    { key: 'pumps', label: 'Pumps (linked assets)', componentType: 'Pumps', details: [] },
    { key: 'stackEconomizer', label: 'Stack economizer', componentType: 'Stack Economizer', details: [] },
    { key: 'controlsPackage', label: 'Controls package', componentType: 'Controls Package', details: [] },
  ],
};

function getBaselineProps(a: Asset): Record<string, string> {
  return a?.baseline?.properties && typeof a.baseline.properties === 'object' ? a.baseline.properties : {};
}

function setBaselineProp(setDraft: (fn: (d: Asset) => Asset) => void, key: string, value: string | undefined) {
  setDraft((d) => {
    const prev = getBaselineProps(d);
    const nextProps = { ...prev };
    if (value == null || String(value).trim() === '') delete nextProps[key];
    else nextProps[key] = String(value);
    return { ...d, baseline: { ...(d.baseline || {}), properties: nextProps } };
  });
}

function defaultPrefix(t: AssetType): string {
  switch (t) {
    case 'ahu':
      return 'AHU-';
    case 'rtu':
      return 'RTU-';
    case 'fan':
      return 'FAN-';
    case 'pump':
      return 'PMP-';
    case 'vav':
      return 'VAV-';
    case 'chiller':
      return 'CH-';
    case 'boiler':
      return 'BLR-';
    case 'coolingTower':
      return 'CT-';
    case 'lightingFixture':
      return 'FIX-';
    case 'lightingControl':
      return 'LC-';
    case 'lightingArea':
      return 'LA-';
    case 'panel':
      return 'PNL-';
    case 'other':
      return 'EQ-';
    default:
      return 'ASSET-';
  }
}

export function AssetRegistry(props: {
  graph: any;
  vaultFiles: VaultFile[];
  onSaveGraph: (nextGraph: any) => Promise<void>;
  onOpenEvidence?: (args: { fileId?: string; page?: number; sheet?: string }) => void;
}) {
  const assets: Asset[] = useMemo(() => (Array.isArray(props.graph?.assets) ? props.graph.assets : []), [props.graph]);
  const primaryAssets: Asset[] = useMemo(() => assets.filter((a) => String(a?.assetRole || 'primary') !== 'component'), [assets]);

  const [editingId, setEditingId] = useState<string>('');
  const editing = useMemo(() => primaryAssets.find((a) => String(a.id) === String(editingId)) || null, [primaryAssets, editingId]);
  const [clonedFrom, setClonedFrom] = useState<string | null>(null);
  const [customComponentName, setCustomComponentName] = useState<string>('');
  const [componentDrafts, setComponentDrafts] = useState<Asset[]>([]);

  const [draft, setDraft] = useState<Asset>(() => ({
    id: uuid(),
    assetTag: '',
    type: 'other',
    name: '',
    location: '',
    evidenceRefs: [],
    baseline: undefined,
    measures: [],
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tagsIndex = useMemo(() => new Set(assets.map((a) => String(a.assetTag || '').trim().toLowerCase()).filter(Boolean)), [assets]);

  function isRemoved(a: Asset): boolean {
    const tags = Array.isArray(a?.tags) ? a.tags : [];
    if (tags.some((t) => String(t).toLowerCase() === 'removed')) return true;
    const removedAt = String(getBaselineProps(a)?.removedAt || '').trim();
    return Boolean(removedAt);
  }

  const visibleComponents = useMemo(() => componentDrafts.filter((c) => !isRemoved(c)), [componentDrafts]);

  function suggestUniqueTagFromBase(base: string): string {
    const clean = String(base || '').trim();
    const key = clean.toLowerCase();
    if (clean && !tagsIndex.has(key)) return clean;
    for (let i = 2; i < 1000; i++) {
      const cand = `${clean}-${i}`;
      if (!tagsIndex.has(cand.toLowerCase())) return cand;
    }
    return `${clean}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  }

  function componentSuffix(componentType: string): string {
    const s = String(componentType || '').trim().toUpperCase();
    if (!s) return 'COMP';
    if (s === 'VFD') return 'VFD';
    if (s === 'ECONOMIZER') return 'ECON';
    if (s.includes('HEAT RECOVERY')) return 'HR';
    if (s.includes('HUMID')) return 'HUM';
    if (s.includes('PREHEAT')) return 'PREHT';
    if (s.includes('REHEAT')) return 'REHT';
    if (s === 'FILTERS') return 'FILT';
    if (s.includes('SUPPLY FAN')) return 'SFAN';
    if (s.includes('RETURN')) return 'RFAN';
    if (s === 'DCV') return 'DCV';
    if (s.includes('GAS HEAT')) return 'GASHT';
    if (s.includes('HEAT PUMP')) return 'HP';
    if (s === 'ERV') return 'ERV';
    if (s.includes('COOLING TOWER')) return 'CT';
    if (s === 'PUMPS') return 'PUMPS';
    if (s.includes('STACK ECONOMIZER')) return 'SECON';
    if (s.includes('CONTROLS')) return 'CTRL';
    // fallback: strip non-alnum and take first 6
    return s.replace(/[^A-Z0-9]+/g, '').slice(0, 6) || 'COMP';
  }

  function loadComponentsForParent(parentId: string): Asset[] {
    const pid = String(parentId || '').trim();
    if (!pid) return [];
    return assets
      .filter((a) => String(a?.attachedToAssetId || '') === pid && String(a?.assetRole || '') === 'component')
      .map((a) => ({ ...a }));
  }

  function ensureComponentForRule(rule: AttachmentRule) {
    const parentId = String(draft.id || '').trim();
    if (!parentId) return;
    const existing = componentDrafts.find((c) => String(c.componentType || '') === rule.componentType);
    const baseName = String(draft.name || draft.assetTag || '').trim() || 'Asset';
    const baseTag = String(draft.assetTag || '').trim() || 'ASSET';

    if (existing) {
      // un-remove if previously removed
      setComponentDrafts((prev) =>
        prev.map((c) => {
          if (String(c.id) !== String(existing.id)) return c;
          const tags = Array.isArray(c.tags) ? c.tags.filter((t) => String(t).toLowerCase() !== 'removed') : [];
          const props = getBaselineProps(c);
          const nextProps = { ...props };
          delete nextProps.removedAt;
          return { ...c, tags, baseline: { ...(c.baseline || {}), properties: nextProps } };
        })
      );
      return;
    }

    const suggestedTag = suggestUniqueTagFromBase(`${baseTag}-${componentSuffix(rule.componentType)}`);
    const comp: Asset = {
      id: uuid(),
      assetTag: suggestedTag,
      type: 'other',
      name: `${baseName} — ${rule.componentType}`,
      assetRole: 'component',
      attachedToAssetId: parentId,
      componentType: rule.componentType,
      location: draft.location,
      baseline: { properties: {} },
    };
    setComponentDrafts((prev) => [...prev, comp]);
  }

  function removeComponentByType(componentType: string) {
    const now = new Date().toISOString();
    setComponentDrafts((prev) =>
      prev.map((c) => {
        if (String(c.componentType || '') !== String(componentType || '')) return c;
        const tags = Array.isArray(c.tags) ? c.tags : [];
        const nextTags = tags.some((t) => String(t).toLowerCase() === 'removed') ? tags : [...tags, 'removed'];
        const props = getBaselineProps(c);
        const nextProps = { ...props, removedAt: now };
        return { ...c, tags: nextTags, baseline: { ...(c.baseline || {}), properties: nextProps } };
      })
    );
  }

  function updateComponent(id: string, patch: Partial<Asset>) {
    setComponentDrafts((prev) => prev.map((c) => (String(c.id) === String(id) ? { ...c, ...patch } : c)));
  }

  function setComponentProp(id: string, key: string, value: string) {
    setComponentDrafts((prev) =>
      prev.map((c) => {
        if (String(c.id) !== String(id)) return c;
        const prevProps = getBaselineProps(c);
        const nextProps = { ...prevProps };
        if (!String(value || '').trim()) delete nextProps[key];
        else nextProps[key] = String(value);
        return { ...c, baseline: { ...(c.baseline || {}), properties: nextProps } };
      })
    );
  }

  function addCustomComponent() {
    const name = String(customComponentName || '').trim();
    if (!name) return;
    const parentId = String(draft.id || '').trim();
    if (!parentId) return;
    const baseName = String(draft.name || draft.assetTag || '').trim() || 'Asset';
    const baseTag = String(draft.assetTag || '').trim() || 'ASSET';
    const suggestedTag = suggestUniqueTagFromBase(`${baseTag}-${componentSuffix(name)}`);
    const comp: Asset = {
      id: uuid(),
      assetTag: suggestedTag,
      type: 'other',
      name: `${baseName} — ${name}`,
      assetRole: 'component',
      attachedToAssetId: parentId,
      componentType: name,
      location: draft.location,
      baseline: { properties: {} },
    };
    setComponentDrafts((prev) => [...prev, comp]);
    setCustomComponentName('');
  }

  function suggestNextAssetTag(type: AssetType): string {
    const prefix = defaultPrefix(type);
    const re = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, 'i');
    let max = 0;
    for (const a of assets) {
      const tag = String(a.assetTag || '').trim();
      const m = tag.match(re);
      if (m && m[1]) {
        const n = Number(m[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
    return `${prefix}${max + 1}`;
  }

  function startNew() {
    setEditingId('');
    setClonedFrom(null);
    setDraft({ id: uuid(), assetTag: '', type: 'other', name: '', location: '', evidenceRefs: [], assetRole: 'primary' });
    setComponentDrafts([]);
    setError(null);
  }

  function startEdit(a: Asset) {
    setEditingId(String(a.id));
    setClonedFrom(null);
    setDraft({ ...a });
    setComponentDrafts(loadComponentsForParent(String(a.id)));
    setError(null);
  }

  function startClone(a: Asset) {
    // Clone creates a new asset (new id) but copies properties/evidence.
    setEditingId('');
    setClonedFrom(String(a.assetTag || a.id));
    const nextType = (a.type || 'other') as AssetType;
    const nextTag = suggestNextAssetTag(nextType);
    const baseName = String(a.name || a.assetTag || '').trim();
    setDraft({
      ...a,
      id: uuid(),
      assetRole: 'primary',
      attachedToAssetId: undefined,
      componentType: undefined,
      type: nextType,
      assetTag: nextTag,
      name: baseName ? `${baseName} (${nextTag})` : '',
    });
    setComponentDrafts([]);
    setError(null);
  }

  // If draft changes to a different existing parent (e.g., user clicks edit in list), load its components.
  useEffect(() => {
    const pid = String(draft?.id || '').trim();
    if (!pid) return;
    if (editingId && String(editingId) === pid) {
      setComponentDrafts(loadComponentsForParent(pid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, draft.id]);

  function validate(next: Asset): string | null {
    const tag = String(next.assetTag || '').trim();
    if (!tag) return 'assetTag is required (e.g., AHU-1).';
    const nm = String(next.name || '').trim();
    if (!nm) return 'name is required (e.g., “Unknown lighting in basement”).';
    // uniqueness (allow if editing same asset)
    const tagKey = tag.toLowerCase();
    const isSame = editing && String(editing.assetTag || '').trim().toLowerCase() === tagKey;
    if (!isSame && tagsIndex.has(tagKey)) return `assetTag must be unique (already exists: ${tag}).`;
    return null;
  }

  async function save() {
    const next: Asset = {
      ...draft,
      id: draft.id || uuid(),
      assetTag: String(draft.assetTag || '').trim(),
      name: String(draft.name || '').trim() || undefined,
      location: String(draft.location || '').trim() || undefined,
      evidenceRefs: Array.isArray(draft.evidenceRefs) ? draft.evidenceRefs : [],
      baseline: draft.baseline,
      measures: Array.isArray(draft.measures) ? draft.measures : [],
    };
    const msg = validate(next);
    if (msg) {
      setError(msg);
      return;
    }

    // Validate child component tags are unique and non-empty.
    const compTags = new Set<string>();
    for (const c of componentDrafts) {
      const tag = String(c?.assetTag || '').trim();
      if (!tag) {
        setError('All components must have an assetTag (auto-filled, but editable).');
        return;
      }
      const key = tag.toLowerCase();
      if (compTags.has(key)) {
        setError(`Duplicate component assetTag: ${tag}`);
        return;
      }
      compTags.add(key);
    }
    setSaving(true);
    setError(null);
    try {
      const nextGraph = { ...(props.graph || {}) };
      const existing = Array.isArray(nextGraph.assets) ? nextGraph.assets : [];
      const withoutParent = existing.filter((a: any) => String(a?.id || '') !== String(next.id));
      const withoutParentComponents = withoutParent.filter(
        (a: any) => !(String(a?.assetRole || '') === 'component' && String(a?.attachedToAssetId || '') === String(next.id))
      );
      // Ensure canonical Phase 1 node kind is always present.
      const normalizedComponents = componentDrafts.map((c) => ({
        ...(c as any),
        id: String(c?.id || '').trim() || uuid(),
        kind: 'asset',
        assetRole: 'component',
        attachedToAssetId: String(next.id),
        type: (c.type || 'other') as any,
      }));
      nextGraph.assets = [
        { ...(next as any), kind: 'asset', assetRole: next.assetRole || 'primary' },
        ...normalizedComponents,
        ...withoutParentComponents.map((a: any) => ({ ...(a || {}), kind: 'asset' })),
      ];
      await props.onSaveGraph(nextGraph);
      startNew();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    setError(null);
    try {
      const nextGraph = { ...(props.graph || {}) };
      nextGraph.assets = (Array.isArray(nextGraph.assets) ? nextGraph.assets : []).filter(
        (a: any) =>
          String(a?.id || '') !== String(id) &&
          !(String(a?.assetRole || '') === 'component' && String(a?.attachedToAssetId || '') === String(id))
      );
      await props.onSaveGraph(nextGraph);
      if (editingId === id) startNew();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete asset');
    } finally {
      setSaving(false);
    }
  }

  function addEvidenceRef() {
    const list = Array.isArray(draft.evidenceRefs) ? [...draft.evidenceRefs] : [];
    list.push({ fileId: '', page: undefined, sheet: '', cellRange: '' });
    setDraft((d) => ({ ...d, evidenceRefs: list }));
  }

  function updateEvidenceRef(idx: number, patch: Partial<EvidenceRef>) {
    const list = Array.isArray(draft.evidenceRefs) ? [...draft.evidenceRefs] : [];
    const cur = list[idx] || {};
    list[idx] = { ...cur, ...patch };
    setDraft((d) => ({ ...d, evidenceRefs: list }));
  }

  function removeEvidenceRef(idx: number) {
    const list = Array.isArray(draft.evidenceRefs) ? [...draft.evidenceRefs] : [];
    list.splice(idx, 1);
    setDraft((d) => ({ ...d, evidenceRefs: list }));
  }

  function addBaselineEquipment() {
    const list = Array.isArray(draft.baseline?.equipment) ? [...(draft.baseline?.equipment as string[])] : [];
    list.push('');
    setDraft((d) => ({
      ...d,
      baseline: {
        ...(d.baseline || {}),
        equipment: list,
      },
    }));
  }

  function updateBaselineEquipment(idx: number, value: string) {
    const list = Array.isArray(draft.baseline?.equipment) ? [...(draft.baseline?.equipment as string[])] : [];
    list[idx] = value;
    setDraft((d) => ({
      ...d,
      baseline: {
        ...(d.baseline || {}),
        equipment: list,
      },
    }));
  }

  function removeBaselineEquipment(idx: number) {
    const list = Array.isArray(draft.baseline?.equipment) ? [...(draft.baseline?.equipment as string[])] : [];
    list.splice(idx, 1);
    setDraft((d) => ({
      ...d,
      baseline: {
        ...(d.baseline || {}),
        equipment: list,
      },
    }));
  }

  function freezeBaseline() {
    const frozenAt = new Date().toISOString();
    setDraft((d) => ({
      ...d,
      baseline: {
        ...(d.baseline || {}),
        frozenAt,
      },
    }));
  }

  const baselineFrozen = Boolean(String(draft.baseline?.frozenAt || '').trim());

  function addMeasure() {
    const list = Array.isArray(draft.measures) ? [...draft.measures] : [];
    const now = new Date().toISOString();
    list.unshift({
      id: uuid(),
      name: 'VFD',
      measureType: 'VFD',
      before: { description: 'No VFD (baseline)', equipment: [] },
      after: { description: 'Install VFD', equipmentAdded: ['VFD'] },
      createdAt: now,
      updatedAt: now,
    });
    setDraft((d) => ({ ...d, measures: list }));
  }

  function updateMeasure(id: string, patch: any) {
    const list = Array.isArray(draft.measures) ? [...draft.measures] : [];
    const idx = list.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) return;
    list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    setDraft((d) => ({ ...d, measures: list }));
  }

  function removeMeasure(id: string) {
    const list = Array.isArray(draft.measures) ? [...draft.measures] : [];
    setDraft((d) => ({ ...d, measures: list.filter((m) => String(m.id) !== String(id)) }));
  }

  function addAfterEquipment(id: string) {
    const m = (draft.measures || []).find((x) => String(x.id) === String(id));
    const arr = Array.isArray(m?.after?.equipmentAdded) ? [...(m!.after!.equipmentAdded as string[])] : [];
    arr.push('');
    updateMeasure(id, { after: { ...(m?.after || {}), equipmentAdded: arr } });
  }

  function updateAfterEquipment(id: string, idx: number, value: string) {
    const m = (draft.measures || []).find((x) => String(x.id) === String(id));
    const arr = Array.isArray(m?.after?.equipmentAdded) ? [...(m!.after!.equipmentAdded as string[])] : [];
    arr[idx] = value;
    updateMeasure(id, { after: { ...(m?.after || {}), equipmentAdded: arr } });
  }

  function removeAfterEquipment(id: string, idx: number) {
    const m = (draft.measures || []).find((x) => String(x.id) === String(id));
    const arr = Array.isArray(m?.after?.equipmentAdded) ? [...(m!.after!.equipmentAdded as string[])] : [];
    arr.splice(idx, 1);
    updateMeasure(id, { after: { ...(m?.after || {}), equipmentAdded: arr } });
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Declared existing assets (baseline)</h3>
          <p className="text-sm text-gray-600">
            Declare what exists—even if incomplete, approximate, or wrong. Unknowns are allowed and useful. Stable IDs: system <span className="font-mono">id</span> + required unique{' '}
            <span className="font-mono">assetTag</span> (e.g., AHU-1).
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          New asset group
        </button>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-900 mb-3">Declared assets ({primaryAssets.length})</div>
          {primaryAssets.length === 0 && (
            <div className="text-sm text-gray-700 border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="font-semibold text-blue-900">Start by declaring what exists (even if uncertain).</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { t: 'ahu' as const, label: 'Add AHU group' },
                    { t: 'rtu' as const, label: 'Add RTU group' },
                    { t: 'chiller' as const, label: 'Add Chiller group' },
                    { t: 'lightingFixture' as const, label: 'Add Lighting group' },
                    { t: 'panel' as const, label: 'Add Electrical panel' },
                    { t: 'other' as const, label: 'Add Unknown/Other' },
                  ] as const
                ).map((x) => (
                  <button
                    key={x.label}
                    type="button"
                    onClick={() => {
                      setDraft((d) => {
                        const nextTag = d.assetTag ? d.assetTag : `${defaultPrefix(x.t)}1`;
                        return { ...d, type: x.t, assetTag: nextTag };
                      });
                    }}
                    className="text-sm px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-900 hover:bg-blue-100"
                  >
                    ➕ {x.label}
                  </button>
                ))}
              </div>
              <div className="text-xs text-blue-900/80">
                Evidence and suggestions come later. Baseline starts as “declared reality” (with confidence and unknowns).
              </div>
            </div>
          )}
          <div className="space-y-2 max-h-[55vh] overflow-auto pr-1">
            {primaryAssets.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900">
                    {a.assetTag} <span className="text-xs text-gray-600">({ASSET_TYPES.find((t) => t.value === a.type)?.label || a.type})</span>
                  </div>
                  <div className="text-xs text-gray-600 truncate">{a.name || '—'}</div>
                  {a.location ? <div className="text-xs text-gray-500 truncate">loc: {a.location}</div> : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(a)} className="text-xs text-blue-700 underline">
                    Edit
                  </button>
                  <button onClick={() => startClone(a)} className="text-xs text-blue-700 underline" title="Clone this asset to create a similar one">
                    Clone
                  </button>
                  <button onClick={() => void remove(String(a.id))} className="text-xs text-red-700 underline" disabled={saving}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-900">
            {editing ? `Edit: ${editing.assetTag}` : clonedFrom ? `Create (cloned from ${clonedFrom})` : 'Create asset'}
          </div>

          {!editing && (
            <div className="flex flex-wrap gap-2">
              {(['ahu', 'vav', 'chiller', 'boiler', 'coolingTower', 'lightingArea', 'panel', 'other'] as AssetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setDraft((d) => {
                      const nextTag = d.assetTag ? d.assetTag : `${defaultPrefix(t)}1`;
                      return { ...d, type: t, assetTag: nextTag };
                    });
                  }}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50"
                >
                  + {ASSET_TYPES.find((x) => x.value === t)?.label || t}
                </button>
              ))}
            </div>
          )}

          <label className="text-sm">
            <div className="font-medium text-gray-700">Asset tag *</div>
            <input value={draft.assetTag} onChange={(e) => setDraft((d) => ({ ...d, assetTag: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="AHU-1" />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm md:col-span-2">
              <div className="font-medium text-gray-700">Asset group name *</div>
              <input
                value={draft.name || ''}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Unknown lighting in basement"
              />
              <div className="text-xs text-gray-500 mt-1">Name the thing that exists (groups/placeholders are fine).</div>
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Asset type (category) *</div>
              <select
                value={String(getBaselineProps(draft)?.assetCategory || 'HVAC')}
                onChange={(e) => setBaselineProp(setDraft, 'assetCategory', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                {ASSET_CATEGORY_OPTIONS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Subtype (optional)</div>
              <select
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as AssetType }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">Leave as “Other” if you don’t know yet.</div>
            </label>

            {String(getBaselineProps(draft)?.assetCategory || '') === 'Other' ? (
              <label className="text-sm md:col-span-2">
                <div className="font-medium text-gray-700">Category (free text)</div>
                <input
                  value={String(getBaselineProps(draft)?.assetCategoryOther || '')}
                  onChange={(e) => setBaselineProp(setDraft, 'assetCategoryOther', e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Steam system"
                />
              </label>
            ) : null}

            <label className="text-sm">
              <div className="font-medium text-gray-700">Status</div>
              <select
                value={String(getBaselineProps(draft)?.declaredStatus || 'existing')}
                onChange={(e) => setBaselineProp(setDraft, 'declaredStatus', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="existing">existing</option>
                <option value="suspected">suspected</option>
                <option value="partially_verified">partially verified</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Confidence</div>
              <select
                value={String(getBaselineProps(draft)?.confidence || 'medium')}
                onChange={(e) => setBaselineProp(setDraft, 'confidence', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Quantity (min)</div>
              <input
                value={String(getBaselineProps(draft)?.qtyMin || '')}
                onChange={(e) => setBaselineProp(setDraft, 'qtyMin', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g. 10"
              />
            </label>
            <label className="text-sm">
              <div className="font-medium text-gray-700">Quantity (max)</div>
              <input
                value={String(getBaselineProps(draft)?.qtyMax || '')}
                onChange={(e) => setBaselineProp(setDraft, 'qtyMax', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g. 15"
              />
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Operating schedule</div>
              <input
                value={String(getBaselineProps(draft)?.schedule || '')}
                onChange={(e) => setBaselineProp(setDraft, 'schedule', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="unknown / 24x7 / weekdays 7-6"
              />
            </label>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Estimated age</div>
              <input
                value={String(getBaselineProps(draft)?.estimatedAge || '')}
                onChange={(e) => setBaselineProp(setDraft, 'estimatedAge', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="unknown / ~15 years"
              />
            </label>
          </div>

          <label className="text-sm">
            <div className="font-medium text-gray-700">Location</div>
            <input value={draft.location || ''} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Location / area (e.g., Roof, East Wing, Basement)" />
          </label>

          {Array.isArray(ATTACHMENTS_BY_SUBTYPE[draft.type]) ? (
            <div className="border border-gray-200 rounded-lg p-3 space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Attachments / components</div>
                <div className="text-xs text-gray-600">
                  Context-aware prompts for common add-ons. Selecting one creates a child asset linked to <span className="font-mono">{draft.assetTag || '(set assetTag first)'}</span>.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(ATTACHMENTS_BY_SUBTYPE[draft.type] || []).map((rule) => {
                  const checked = visibleComponents.some((c) => String(c.componentType || '') === rule.componentType);
                  return (
                    <label key={rule.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) ensureComponentForRule(rule);
                          else removeComponentByType(rule.componentType);
                        }}
                      />
                      <span>{rule.label}</span>
                    </label>
                  );
                })}
              </div>

              {visibleComponents.length > 0 && (
                <div className="space-y-3">
                  {visibleComponents.map((c) => {
                    const rule =
                      (ATTACHMENTS_BY_SUBTYPE[draft.type] || []).find((r) => String(r.componentType) === String(c.componentType || '')) || null;
                    return (
                      <div key={c.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900">{String(c.componentType || 'Component')}</div>
                            <div className="text-xs text-gray-600">
                              attached to <span className="font-mono">{draft.assetTag || '(parent)'}</span>
                            </div>
                          </div>
                          <button type="button" className="text-xs text-slate-700 underline" onClick={() => removeComponentByType(String(c.componentType || ''))}>
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="text-sm">
                            <div className="font-medium text-gray-700">Component name</div>
                            <input
                              value={String(c.name || '')}
                              onChange={(e) => updateComponent(String(c.id), { name: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder={`${String(draft.name || 'Asset')} — ${String(c.componentType || 'Component')}`}
                            />
                          </label>
                          <label className="text-sm">
                            <div className="font-medium text-gray-700">Component assetTag</div>
                            <input
                              value={String(c.assetTag || '')}
                              onChange={(e) => updateComponent(String(c.id), { assetTag: e.target.value })}
                              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg font-mono"
                              placeholder={`${String(draft.assetTag || 'ASSET')}-${componentSuffix(String(c.componentType || 'COMP'))}`}
                            />
                          </label>
                        </div>

                        {rule?.details?.length ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {rule.details.map((f) => (
                              <label key={f.key} className="text-sm">
                                <div className="font-medium text-gray-700">{f.label}</div>
                                <input
                                  value={String(getBaselineProps(c)?.[`component:${String(c.componentType)}:${f.key}`] || '')}
                                  onChange={(e) => setComponentProp(String(c.id), `component:${String(c.componentType)}:${f.key}`, e.target.value)}
                                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  placeholder={f.placeholder || 'unknown'}
                                />
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-end gap-2">
                <label className="text-sm flex-1">
                  <div className="font-medium text-gray-700">Add custom component…</div>
                  <input
                    value={customComponentName}
                    onChange={(e) => setCustomComponentName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., UVGI, Sound attenuator"
                  />
                </label>
                <button type="button" onClick={addCustomComponent} className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold hover:bg-gray-50">
                  Add
                </button>
              </div>
            </div>
          ) : null}

          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Baseline (pre-side blueprint)</div>
                <div className="text-xs text-gray-600">
                  Capture what existed before measures. Once frozen, baseline is immutable.
                  {baselineFrozen ? <span className="ml-2 font-mono">frozenAt={String(draft.baseline?.frozenAt)}</span> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={freezeBaseline}
                disabled={baselineFrozen}
                className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                title="Freeze baseline so it cannot be changed"
              >
                Freeze baseline
              </button>
            </div>

            <label className="text-sm">
              <div className="font-medium text-gray-700">Baseline description</div>
              <textarea
                value={draft.baseline?.description || ''}
                disabled={baselineFrozen}
                onChange={(e) => setDraft((d) => ({ ...d, baseline: { ...(d.baseline || {}), description: e.target.value } }))}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                rows={3}
                placeholder="What existed before? (e.g., constant volume, no VFD, fixed OA, pneumatic controls...)"
              />
            </label>

            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Baseline equipment list</div>
              <button type="button" onClick={addBaselineEquipment} disabled={baselineFrozen} className="text-xs text-blue-700 underline disabled:opacity-50">
                Add item
              </button>
            </div>
            {(draft.baseline?.equipment || []).length === 0 && <div className="text-xs text-gray-600">No baseline equipment listed.</div>}
            <div className="space-y-2">
              {(draft.baseline?.equipment || []).map((it, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={it}
                    disabled={baselineFrozen}
                    onChange={(e) => updateBaselineEquipment(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
                    placeholder="e.g., No VFD"
                  />
                  <button
                    type="button"
                    onClick={() => removeBaselineEquipment(idx)}
                    disabled={baselineFrozen}
                    className="text-xs text-red-700 underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Measures (post-side changes)</div>
                <div className="text-xs text-gray-600">Add what you did to this asset. Example: VFD on AHU.</div>
              </div>
              <button type="button" onClick={addMeasure} className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                Add measure
              </button>
            </div>

            {(draft.measures || []).length === 0 && <div className="text-xs text-gray-600">No measures yet.</div>}
            <div className="space-y-3">
              {(draft.measures || []).map((m) => (
                <div key={m.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-600 font-mono">{m.id}</div>
                    </div>
                    <button type="button" onClick={() => removeMeasure(m.id)} className="text-xs text-red-700 underline">
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="text-sm">
                      <div className="font-medium text-gray-700">Measure name</div>
                      <input value={m.name} onChange={(e) => updateMeasure(m.id, { name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </label>
                    <label className="text-sm">
                      <div className="font-medium text-gray-700">Measure type</div>
                      <input
                        value={m.measureType || ''}
                        onChange={(e) => updateMeasure(m.id, { measureType: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="VFD"
                      />
                    </label>
                  </div>

                  <label className="text-sm">
                    <div className="font-medium text-gray-700">Before (what existed)</div>
                    <textarea
                      value={m.before?.description || ''}
                      onChange={(e) => updateMeasure(m.id, { before: { ...(m.before || {}), description: e.target.value } })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                      placeholder="Reference baseline: e.g., No VFD, constant volume"
                    />
                  </label>

                  <label className="text-sm">
                    <div className="font-medium text-gray-700">After (what we did)</div>
                    <textarea
                      value={m.after?.description || ''}
                      onChange={(e) => updateMeasure(m.id, { after: { ...(m.after || {}), description: e.target.value } })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2}
                      placeholder="e.g., Installed VFD and re-tuned control loop"
                    />
                  </label>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">Equipment added (post-side)</div>
                    <button type="button" onClick={() => addAfterEquipment(m.id)} className="text-xs text-blue-700 underline">
                      Add equipment
                    </button>
                  </div>
                  {(m.after?.equipmentAdded || []).length === 0 && <div className="text-xs text-gray-600">No equipment added listed.</div>}
                  <div className="space-y-2">
                    {(m.after?.equipmentAdded || []).map((it, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={it}
                          onChange={(e) => updateAfterEquipment(m.id, idx, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="e.g., VFD"
                        />
                        <button type="button" onClick={() => removeAfterEquipment(m.id, idx)} className="text-xs text-red-700 underline">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-gray-900">Evidence refs</div>
              <button onClick={addEvidenceRef} className="text-xs text-blue-700 underline">
                Add evidence
              </button>
            </div>
            {(Array.isArray(draft.evidenceRefs) ? draft.evidenceRefs : []).length === 0 && (
              <div className="text-xs text-gray-600">No evidence refs yet.</div>
            )}
            <div className="space-y-2">
              {(Array.isArray(draft.evidenceRefs) ? draft.evidenceRefs : []).map((r, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="text-xs text-gray-700">
                      File
                      <select
                        value={String(r.fileId || '')}
                        onChange={(e) => updateEvidenceRef(idx, { fileId: e.target.value || undefined })}
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                      >
                        <option value="">(none)</option>
                        {(props.vaultFiles as any[]).map((f: any) => (
                          <option key={String(f.id)} value={String(f.id)}>
                            {String(f.filename || f.id)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-gray-700">
                      Page
                      <input
                        value={r.page ? String(r.page) : ''}
                        onChange={(e) => updateEvidenceRef(idx, { page: e.target.value ? Number(e.target.value) : undefined })}
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </label>
                    <label className="text-xs text-gray-700">
                      Sheet
                      <input value={String(r.sheet || '')} onChange={(e) => updateEvidenceRef(idx, { sheet: e.target.value || undefined })} className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" />
                    </label>
                    <label className="text-xs text-gray-700">
                      Cell range
                      <input
                        value={String(r.cellRange || '')}
                        onChange={(e) => updateEvidenceRef(idx, { cellRange: e.target.value || undefined })}
                        className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button onClick={() => removeEvidenceRef(idx)} className="text-xs text-red-700 underline inline-flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                    <button
                      onClick={() => props.onOpenEvidence?.({ fileId: r.fileId, page: r.page, sheet: r.sheet })}
                      className="text-xs text-blue-700 underline"
                      type="button"
                    >
                      Open in Evidence Viewer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save asset'}
          </button>
        </div>
      </div>
    </div>
  );
}

