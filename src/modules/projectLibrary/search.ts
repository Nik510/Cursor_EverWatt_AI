import path from 'path';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';

import { ProjectRecordSchema, type ProjectRecord } from './projectRecord';

export type ProjectLibrarySearchOptions = {
  q: string;
  /** Absolute path to the project library root folder */
  libraryRoot: string;
  limit?: number;
};

export type ProjectLibrarySearchWhy = {
  score: number;
  matched_terms: string[];
  matched_fields: string[];
  details: Array<{
    term: string;
    field: string;
    weight: number;
  }>;
};

export type ProjectLibrarySearchResult = {
  project_id: string;
  project_slug: string;
  title?: string;
  client_name: string;
  site_name?: string;
  building_type: string;
  tags: string[];
  why_matched: ProjectLibrarySearchWhy;
  source_files: ProjectRecord['source_files'];
};

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'hvac',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

function normalizeToken(t: string): string {
  const s = t.trim().toLowerCase();
  // very small deterministic "stemmer"
  if (s.endsWith('ies') && s.length > 4) return `${s.slice(0, -3)}y`;
  if (s.endsWith('ing') && s.length > 5) return s.slice(0, -3);
  if (s.endsWith('ed') && s.length > 4) return s.slice(0, -2);
  if (s.endsWith('s') && s.length > 3) return s.slice(0, -1);
  return s;
}

function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned
    .split(/\s+/g)
    .map(normalizeToken)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  // deterministic de-dupe (preserve order)
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

type RecordTokenIndex = Record<
  'tags' | 'building_type' | 'systems' | 'measures' | 'client' | 'site' | 'notes',
  Set<string>
>;

function indexRecord(r: ProjectRecord): RecordTokenIndex {
  const idx: RecordTokenIndex = {
    tags: new Set<string>(),
    building_type: new Set<string>(),
    systems: new Set<string>(),
    measures: new Set<string>(),
    client: new Set<string>(),
    site: new Set<string>(),
    notes: new Set<string>(),
  };

  for (const t of r.tags) tokenize(t).forEach((x) => idx.tags.add(x));
  tokenize(r.building_type).forEach((x) => idx.building_type.add(x));
  tokenize(r.client.name).forEach((x) => idx.client.add(x));
  if (r.site.name) tokenize(r.site.name).forEach((x) => idx.site.add(x));
  if (r.site.city) tokenize(r.site.city).forEach((x) => idx.site.add(x));
  if (r.site.state) tokenize(r.site.state).forEach((x) => idx.site.add(x));

  for (const s of r.systems) {
    tokenize(s.system_type).forEach((x) => idx.systems.add(x));
    if (s.description) tokenize(s.description).forEach((x) => idx.systems.add(x));
  }

  for (const m of r.measures) {
    tokenize(m.name).forEach((x) => idx.measures.add(x));
    if (m.category) tokenize(m.category).forEach((x) => idx.measures.add(x));
    if (m.description) tokenize(m.description).forEach((x) => idx.measures.add(x));
  }

  if (r.assumptions.notes) tokenize(r.assumptions.notes).forEach((x) => idx.notes.add(x));
  if (r.implementation_notes) tokenize(r.implementation_notes).forEach((x) => idx.notes.add(x));

  return idx;
}

const FIELD_WEIGHTS: Record<keyof RecordTokenIndex, number> = {
  tags: 6,
  measures: 5,
  systems: 4,
  building_type: 3,
  client: 2,
  site: 2,
  notes: 1,
};

async function loadAllProjectRecords(libraryRoot: string): Promise<ProjectRecord[]> {
  const normalizedRoot = path.join(libraryRoot, 'normalized');
  if (!existsSync(normalizedRoot)) return [];

  const files = (await readdir(normalizedRoot))
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  const records: ProjectRecord[] = [];
  for (const f of files) {
    const abs = path.join(normalizedRoot, f);
    const raw = await readFile(abs, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    records.push(ProjectRecordSchema.parse(parsed));
  }
  return records;
}

export async function searchProjectLibrary(
  opts: ProjectLibrarySearchOptions
): Promise<ProjectLibrarySearchResult[]> {
  const query = String(opts.q || '').trim();
  if (!query) return [];
  const limit = Math.max(1, Math.min(50, opts.limit ?? 10));

  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const records = await loadAllProjectRecords(opts.libraryRoot);

  const scored: Array<{ r: ProjectRecord; why: ProjectLibrarySearchWhy }> = [];
  for (const r of records) {
    const idx = indexRecord(r);

    let score = 0;
    const details: ProjectLibrarySearchWhy['details'] = [];
    const matchedTermsSet = new Set<string>();
    const matchedFieldsSet = new Set<string>();

    for (const term of qTokens) {
      for (const field of Object.keys(idx) as Array<keyof RecordTokenIndex>) {
        if (!idx[field].has(term)) continue;
        const w = FIELD_WEIGHTS[field];
        score += w;
        details.push({ term, field, weight: w });
        matchedTermsSet.add(term);
        matchedFieldsSet.add(field);
      }
    }

    if (score > 0) {
      scored.push({
        r,
        why: {
          score,
          matched_terms: Array.from(matchedTermsSet).sort((a, b) => a.localeCompare(b)),
          matched_fields: Array.from(matchedFieldsSet).sort((a, b) => a.localeCompare(b)),
          details,
        },
      });
    }
  }

  scored.sort((a, b) => {
    if (b.why.score !== a.why.score) return b.why.score - a.why.score;
    return a.r.project_id.localeCompare(b.r.project_id);
  });

  return scored.slice(0, limit).map(({ r, why }) => ({
    project_id: r.project_id,
    project_slug: r.project_slug,
    title: r.title,
    client_name: r.client.name,
    site_name: r.site.name,
    building_type: r.building_type,
    tags: r.tags,
    why_matched: why,
    source_files: r.source_files,
  }));
}

