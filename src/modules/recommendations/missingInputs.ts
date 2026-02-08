import type { Project } from '../project/types';
import type { Measure } from '../measures/types';
import { MEASURE_REQUIREMENTS } from '../measures/requirements';

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

function hasIntervalElectricity(project: Project): boolean {
  const pb: any = (project as any)?.projectBuilder || {};
  if (Boolean(pb.utilityIntervalDataKey) || Boolean(pb.intervalDataKey) || Boolean(pb.baselineIntervalKey)) return true;
  // Battery Calc v1 (and other deterministic modules) may attach telemetry refs on the canonical project wrapper.
  const telemetry: any = (project as any)?.telemetry || {};
  if (Array.isArray(telemetry.intervalKwSeries) && telemetry.intervalKwSeries.length > 0) return true;
  if (typeof telemetry.intervalFilePath === 'string' && telemetry.intervalFilePath.trim()) return true;
  return false;
}

function hasAssetField(project: Project, assetType: string, propKey: string): boolean {
  const pb: any = (project as any)?.projectBuilder || {};
  const graph: any = pb.graph || {};
  const assets: any[] = Array.isArray(graph.assets) ? graph.assets : [];
  const t = String(assetType || '').trim();
  const key = String(propKey || '').trim();
  if (!t || !key) return false;

  return assets.some((a) => {
    if (!a || typeof a !== 'object') return false;
    if (String(a.type || '').trim() !== t) return false;
    const props = a?.baseline?.properties && typeof a.baseline.properties === 'object' ? a.baseline.properties : null;
    if (!props) return false;
    const v = (props as any)[key];
    return typeof v === 'string' ? Boolean(String(v).trim()) : v != null;
  });
}

function hasAssetFieldAny(project: Project, assetTypes: string[], propKey: string): boolean {
  for (const t of assetTypes) {
    if (hasAssetField(project, t, propKey)) return true;
  }
  return false;
}

function parseAssetFieldKey(key: string): { assetType: string; propKey: string } | null {
  // expected: asset.<assetType>.properties.<propKey>
  const parts = String(key || '').trim().split('.');
  if (parts.length < 4) return null;
  if (parts[0] !== 'asset') return null;
  const assetType = parts[1];
  if (parts[2] !== 'properties') return null;
  const propKey = parts.slice(3).join('.');
  if (!assetType || !propKey) return null;
  return { assetType, propKey };
}

export function getMissingInputs(project: Project, measure: Measure): string[] {
  const req = MEASURE_REQUIREMENTS[measure.measureType];
  if (!req) {
    // Conservative: unknown measureType requirements -> treat as missing until registry updated.
    return ['requirements registry missing for this measure type'];
  }

  const missing: string[] = [];
  for (const r of req.required) {
    if (r.kind === 'telemetry') {
      const k = normText(r.key);
      // v1 supports interval electricity presence check only. Unknown telemetry keys => missing.
      if (k.includes('telemetry') && (k.includes('interval15min') || k.includes('interval'))) {
        if (!hasIntervalElectricity(project)) missing.push(r.description);
      } else {
        missing.push(r.description);
      }
    } else if (r.kind === 'asset_field') {
      const parsed = parseAssetFieldKey(r.key);
      if (!parsed) {
        missing.push(r.description);
        continue;
      }
      // Special-case: motor sizing can live on multiple HVAC asset types in Project Builder.
      const prop = String(parsed.propKey || '').trim();
      const motorLike = prop === 'motorHp' || prop === 'motorKW' || prop === 'ratedKw' || prop === 'hp';
      if (motorLike && (parsed.assetType === 'fan' || parsed.assetType === 'pump' || parsed.assetType === 'ahu' || parsed.assetType === 'rtu')) {
        const checkTypes = ['fan', 'pump', 'ahu', 'rtu'];
        if (!hasAssetFieldAny(project, checkTypes, prop)) missing.push(r.description);
      } else if (!hasAssetField(project, parsed.assetType, parsed.propKey)) {
        missing.push(r.description);
      }
    } else {
      missing.push(r.description);
    }
  }

  // Conservative: if measure declares affectedAssetTypes but project has none of those, keep missing signal.
  const affectedTypes = Array.isArray(measure.affectedAssetTypes) ? measure.affectedAssetTypes : [];
  if (affectedTypes.length) {
    const pb: any = (project as any)?.projectBuilder || {};
    const graph: any = pb.graph || {};
    const assets: any[] = Array.isArray(graph.assets) ? graph.assets : [];
    const present = new Set(assets.map((a) => String(a?.type || '').trim()).filter(Boolean));
    const needAny = affectedTypes.some((t) => present.has(String(t).trim()));
    if (!needAny) missing.push(`project missing affected asset types: ${affectedTypes.join(', ')}`);
  }

  return [...new Set(missing)];
}

