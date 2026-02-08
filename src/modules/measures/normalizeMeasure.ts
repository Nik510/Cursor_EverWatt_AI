import type { Measure, MeasureType } from './types';

function normText(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 _/-]+/g, '')
    .trim();
}

const CANONICAL: ReadonlySet<string> = new Set<MeasureType>([
  'VFD_RETROFIT',
  'AHU_SCHEDULE_OPT',
  'VAV_RESET',
  'CHILLED_WATER_RESET',
  'HOT_WATER_RESET',
  'OCCUPANCY_CONTROLS',
  'LIGHTING_RETROFIT',
  'EMS_TUNING',
  'BATTERY_PEAK_SHAVE',
  'DEMAND_RESPONSE_ENROLLMENT',
  'RATE_CHANGE',
  'LOAD_SHIFTING_STRATEGY',
  'OPTION_S_EVALUATION',
  'UTILITY_PROGRAM_ENROLLMENT',
  'STEAM_OPTIMIZATION',
  'RADIATOR_TRV',
  'PUMP_VFD',
  'CHILLER_PLANT_OPT',
  'OTHER',
]);

function asMeasureType(x: unknown): MeasureType | null {
  const s = String(x ?? '').trim();
  if (!s) return null;
  return CANONICAL.has(s) ? (s as MeasureType) : null;
}

function getFirstString(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function pickParams(x: unknown): Record<string, number | string | boolean | null> {
  if (!isRecord(x)) return {};
  const out: Record<string, number | string | boolean | null> = {};
  for (const [k, v] of Object.entries(x)) {
    if (v === null) out[k] = null;
    else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (v === undefined) continue;
    else out[k] = String(v);
  }
  return out;
}

function uniqStr(arr: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

const SYNONYMS: Array<{ containsAny: string[]; measureType: MeasureType }> = [
  // Lighting
  { containsAny: ['lighting retrofit', 'led retrofit', 'led relamp', 'lamp replacement', 'troffer retrofit', 'led upgrade'], measureType: 'LIGHTING_RETROFIT' },
  { containsAny: ['occupancy sensor', 'vacancy sensor', 'motion sensor', 'occupancy controls'], measureType: 'OCCUPANCY_CONTROLS' },

  // VFDs
  { containsAny: ['pump vfd', 'vfd on pump', 'pump variable speed', 'variable speed pump'], measureType: 'PUMP_VFD' },
  { containsAny: ['vfd retrofit', 'install vfd', 'variable frequency drive', 'variable speed drive', 'vsd', 'vfd'], measureType: 'VFD_RETROFIT' },

  // Schedules / EMS / controls
  { containsAny: ['ahu schedule', 'air handler schedule', 'ahu scheduling', 'air handler scheduling'], measureType: 'AHU_SCHEDULE_OPT' },
  { containsAny: ['vav reset', 'static pressure reset', 'sp reset', 'dp reset', 'duct pressure reset'], measureType: 'VAV_RESET' },
  { containsAny: ['chilled water reset', 'chw reset', 'chwst reset', 'chws reset', 'chws temp reset', 'chilled water supply temp reset'], measureType: 'CHILLED_WATER_RESET' },
  { containsAny: ['hot water reset', 'hws reset', 'hwst reset', 'hot water supply temp reset', 'boiler supply temp reset'], measureType: 'HOT_WATER_RESET' },
  { containsAny: ['ems tuning', 'bms tuning', 'controls tuning', 'sequence tuning', 'retrocommissioning', 'recommissioning', 'rcx', 'setpoint tuning'], measureType: 'EMS_TUNING' },

  // Batteries / DR
  { containsAny: ['battery peak shave', 'battery peak shaving', 'peak shaving battery', 'demand charge management', 'peak shave'], measureType: 'BATTERY_PEAK_SHAVE' },
  { containsAny: ['demand response', 'dr enrollment', 'auto dr', 'demand response enrollment'], measureType: 'DEMAND_RESPONSE_ENROLLMENT' },

  // Utility intelligence v1
  { containsAny: ['rate change', 'rate switch', 'tariff change', 'tariff switch'], measureType: 'RATE_CHANGE' },
  { containsAny: ['load shifting', 'load shift', 'shift load'], measureType: 'LOAD_SHIFTING_STRATEGY' },
  { containsAny: ['option s', 's rate', 's-rate'], measureType: 'OPTION_S_EVALUATION' },
  { containsAny: ['utility program', 'program enrollment'], measureType: 'UTILITY_PROGRAM_ENROLLMENT' },

  // Steam / radiator
  { containsAny: ['steam optimization', 'steam system optimization', 'steam traps'], measureType: 'STEAM_OPTIMIZATION' },
  { containsAny: ['radiator trv', 'thermostatic radiator valve', 'trv'], measureType: 'RADIATOR_TRV' },

  // Plant
  { containsAny: ['chiller plant optimization', 'chiller plant opt', 'plant optimization', 'central plant optimization'], measureType: 'CHILLER_PLANT_OPT' },
];

function inferAffectedAssetTypes(measureType: MeasureType): string[] {
  switch (measureType) {
    case 'PUMP_VFD':
      return ['pump'];
    case 'VFD_RETROFIT':
      return ['fan', 'pump', 'ahu', 'rtu'];
    case 'AHU_SCHEDULE_OPT':
      return ['ahu', 'rtu'];
    case 'VAV_RESET':
      return ['vav', 'ahu', 'rtu'];
    case 'CHILLED_WATER_RESET':
      return ['chiller', 'pump', 'coolingTower'];
    case 'HOT_WATER_RESET':
      return ['boiler', 'pump'];
    case 'LIGHTING_RETROFIT':
      return ['lightingFixture', 'lightingArea'];
    case 'OCCUPANCY_CONTROLS':
      return ['lightingControl', 'lightingFixture'];
    case 'CHILLER_PLANT_OPT':
      return ['chiller', 'pump', 'coolingTower'];
    case 'LOAD_SHIFTING_STRATEGY':
    case 'RATE_CHANGE':
    case 'OPTION_S_EVALUATION':
    case 'UTILITY_PROGRAM_ENROLLMENT':
      return [];
    default:
      return [];
  }
}

function mapSynonym(labelNorm: string, affectedAssetTypesNorm: string[]): MeasureType | null {
  // Disambiguate: if label indicates pump VFD (even without the literal "vfd"), prefer PUMP_VFD
  const mentionsPump = labelNorm.includes('pump') || affectedAssetTypesNorm.includes('pump');
  const mentionsVfdLike = labelNorm.includes('vfd') || labelNorm.includes('variable frequency drive') || labelNorm.includes('variable speed drive') || labelNorm.includes('vsd');
  if (mentionsPump && mentionsVfdLike) return 'PUMP_VFD';

  for (const rule of SYNONYMS) {
    if (rule.containsAny.some((s) => labelNorm.includes(s))) return rule.measureType;
  }
  return null;
}

export function normalizeMeasure(input: any): Measure {
  const direct = asMeasureType(input?.measureType) || asMeasureType(input?.type);
  const label = getFirstString(input?.label, input?.name, input?.title, input?.type, input?.measureType);

  const tags = uniqStr(Array.isArray(input?.tags) ? input.tags : []);
  const parameters = pickParams(input?.parameters ?? input?.params ?? {});

  const affectedAssetIds = uniqStr(Array.isArray(input?.affectedAssetIds) ? input.affectedAssetIds : Array.isArray(input?.assetIds) ? input.assetIds : []);
  const affectedAssetTypes = uniqStr(
    Array.isArray(input?.affectedAssetTypes) ? input.affectedAssetTypes : Array.isArray(input?.assetTypes) ? input.assetTypes : []
  );

  const affectedAssetTypesNorm = affectedAssetTypes.map((t) => normText(t)).filter(Boolean);
  const labelNorm = normText(label);

  const mapped = direct || mapSynonym(labelNorm, affectedAssetTypesNorm) || 'OTHER';
  const inferredTypes = inferAffectedAssetTypes(mapped);

  const finalAssetTypes = affectedAssetTypes.length ? affectedAssetTypes : inferredTypes;

  return {
    measureType: mapped,
    ...(label ? { label } : {}),
    tags,
    parameters,
    ...(affectedAssetIds.length ? { affectedAssetIds } : {}),
    ...(finalAssetTypes.length ? { affectedAssetTypes: finalAssetTypes } : {}),
  };
}

