import path from 'path';
import { createHash } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';

import { ProjectLibraryManifestSchema, type ProjectLibraryManifest } from './manifest';
import { ProjectRecordSchema, type ProjectRecord, PROJECT_RECORD_SCHEMA_VERSION } from './projectRecord';

export type IngestProjectLibraryOptions = {
  /** Absolute path to the project library root folder */
  libraryRoot: string;
  /** If set, ingest only this raw/<project_slug>/ project */
  onlyProjectSlug?: string;
};

export type IngestedProject = {
  project_id: string;
  project_slug: string;
  normalized_path: string;
  source_file_count: number;
};

function stableProjectIdFromSlug(projectSlug: string): string {
  const hex = createHash('sha256').update(projectSlug, 'utf8').digest('hex');
  return `pl_${hex.slice(0, 12)}`;
}

function contentTypeFromPath(p: string): string | undefined {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.csv':
      return 'text/csv';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.doc':
      return 'application/msword';
    case '.txt':
      return 'text/plain';
    case '.md':
      return 'text/markdown';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return undefined;
  }
}

async function sha256OfFile(absPath: string): Promise<string> {
  const buf = await readFile(absPath);
  return createHash('sha256').update(buf).digest('hex');
}

async function readManifestFromFile(manifestPath: string): Promise<ProjectLibraryManifest> {
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = parseYaml(raw);
  return ProjectLibraryManifestSchema.parse(parsed);
}

export async function ingestProjectLibrary(options: IngestProjectLibraryOptions): Promise<IngestedProject[]> {
  const rawRoot = path.join(options.libraryRoot, 'raw');
  const normalizedRoot = path.join(options.libraryRoot, 'normalized');

  if (!existsSync(rawRoot)) {
    throw new Error(`Project Library raw folder not found: ${rawRoot}`);
  }
  await mkdir(normalizedRoot, { recursive: true });

  const entries = await readdir(rawRoot, { withFileTypes: true });
  const projectDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((slug) => (options.onlyProjectSlug ? slug === options.onlyProjectSlug : true))
    .sort((a, b) => a.localeCompare(b));

  const ingested: IngestedProject[] = [];

  for (const projectSlug of projectDirs) {
    const projectRawDir = path.join(rawRoot, projectSlug);
    const manifestPath = path.join(projectRawDir, 'manifest.yaml');
    if (!existsSync(manifestPath)) continue;

    const manifest = await readManifestFromFile(manifestPath);
    if (manifest.project_slug !== projectSlug) {
      throw new Error(
        `Manifest project_slug mismatch for ${projectSlug}: manifest=${manifest.project_slug} folder=${projectSlug}`
      );
    }

    const projectId = manifest.project_id || stableProjectIdFromSlug(projectSlug);

    // Ensure raw artifacts are present. Phase 1 MUST NOT mutate raw files.
    for (const f of manifest.source_files) {
      const destAbs = path.join(projectRawDir, f.path);
      if (!existsSync(destAbs)) {
        throw new Error(`Missing source file for ${projectSlug}: ${f.path}`);
      }
    }

    const sourceFiles: ProjectRecord['source_files'] = [];
    for (const f of manifest.source_files) {
      const abs = path.join(projectRawDir, f.path);
      const st = await stat(abs);
      const sha256 = await sha256OfFile(abs);
      sourceFiles.push({
        path: path
          .join('everwatt-project-library', 'raw', projectSlug, f.path)
          .replaceAll('\\', '/'),
        role: f.role,
        sha256,
        bytes: st.size,
        content_type: contentTypeFromPath(f.path),
        description: f.description,
        source: 'raw',
      });
    }

    const epochIso = new Date(0).toISOString();
    const record: ProjectRecord = {
      schema_version: PROJECT_RECORD_SCHEMA_VERSION,
      project_id: projectId,
      project_slug: projectSlug,
      title: manifest.manual.title,
      created_at: epochIso,
      updated_at: epochIso,
      project_year: manifest.manual.project_year,
      client: manifest.manual.client,
      site: manifest.manual.site,
      building_type: manifest.manual.building_type,
      tags: manifest.manual.tags,
      systems: manifest.manual.systems,
      measures: manifest.manual.measures,
      assumptions: manifest.manual.assumptions,
      calc_outputs: manifest.manual.calc_outputs,
      confidence: { overall: manifest.manual.confidence_overall },
      implementation_notes: manifest.manual.implementation_notes,
      source_files: sourceFiles,
    };

    const validated = ProjectRecordSchema.parse(record);
    const normalizedPathAbs = path.join(normalizedRoot, `${projectId}.json`);
    await writeFile(normalizedPathAbs, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');

    ingested.push({
      project_id: projectId,
      project_slug: projectSlug,
      normalized_path: normalizedPathAbs,
      source_file_count: sourceFiles.length,
    });
  }

  return ingested;
}

