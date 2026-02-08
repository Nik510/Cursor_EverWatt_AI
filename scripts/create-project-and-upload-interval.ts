/**
 * CLI-only interval intake (deterministic, additive).
 *
 * Usage:
 *   npx tsx scripts/create-project-and-upload-interval.ts --projectName "X" --address "..." --territory PGE --intervalFile <file> --resolution 15min
 *
 * Optional:
 *   --org <orgId>      (defaults to "default-user")
 */

import path from 'path';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';

import type { ProjectRecord } from '../src/types/change-order';
import { createOrOverwriteProjectForOrg, patchProjectForOrg } from '../src/modules/project/projectRepository';
import { buildUserFileKeyAtPath, putUserFileAtKey } from '../src/services/storage-service';

function argMap(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
    out[k] = v;
  }
  return out;
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return 'text/csv';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === '.xls') return 'application/vnd.ms-excel';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

function getLocalStoragePathForKey(storageKey: string): string {
  // Mirrors LocalStorageAdapter base dir default (see src/services/storage-service.ts).
  const base = process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'data', 'uploads');
  // Local adapter writes under baseDir/<key>
  return path.join(base, storageKey.replace(/\//g, path.sep));
}

async function main() {
  const args = argMap(process.argv.slice(2));
  const orgId = String(args.org || 'default-user').trim();
  const projectName = String(args.projectName || '').trim();
  const address = String(args.address || '').trim();
  const territory = String(args.territory || '').trim();
  const intervalFile = String(args.intervalFile || '').trim();
  const resolution = String(args.resolution || '15min').trim();

  if (!projectName) {
    console.error('Missing --projectName "X"');
    process.exit(2);
  }
  if (!territory) {
    console.error('Missing --territory PGE');
    process.exit(2);
  }
  if (!intervalFile) {
    console.error('Missing --intervalFile <file>');
    process.exit(2);
  }

  const projectId = randomUUID();
  const nowIso = new Date('2026-01-01T00:00:00.000Z').toISOString();

  const project: ProjectRecord = {
    id: projectId,
    driveFolderLink: 'local',
    customer: {
      projectNumber: `TMP-${projectId.slice(0, 8)}`,
      projectName,
      companyName: projectName,
      siteLocation: address || undefined,
      utilityCompany: territory,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
    graph: { assets: [], measures: [], inbox: [], inboxHistory: [], bomItems: [], decisions: [] } as any,
    vault: { files: [] },
  };

  await createOrOverwriteProjectForOrg(orgId, project);

  const body = readFileSync(intervalFile);
  const originalName = path.basename(intervalFile);
  const contentType = guessContentType(intervalFile);
  const storageKey = buildUserFileKeyAtPath({
    userId: orgId,
    pathPrefix: `projects/${projectId}/telemetry`,
    filename: `interval_${Date.now()}_${originalName}`,
  });

  const put = await putUserFileAtKey({
    userId: orgId,
    key: storageKey,
    originalName,
    contentType,
    body,
  });

  const localPath = getLocalStoragePathForKey(put.key);

  const vaultFileId = randomUUID();
  await patchProjectForOrg(orgId, projectId, {
    vault: {
      files: [
        {
          id: vaultFileId,
          filename: originalName,
          contentType,
          sizeBytes: body.length,
          kind: contentType.includes('spreadsheet') || contentType.includes('excel') ? 'spreadsheet' : 'unknown',
          tags: ['interval', `resolution:${resolution}`, `territory:${territory}`],
          storageKey: put.key,
          storageUrl: put.url,
          uploadedAt: nowIso,
        },
      ],
    },
    telemetry: {
      kind: 'interval_electricity',
      intervalFilePath: localPath,
      intervalStorageKey: put.key,
      intervalResolution: resolution,
      telemetrySeriesId: `storage:${put.key}`,
      notes: `Uploaded via CLI interval intake; vaultFileId=${vaultFileId}`,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        orgId,
        projectId,
        projectName,
        territory,
        uploaded: {
          originalName,
          contentType,
          storageKey: put.key,
          localPath,
          sizeBytes: body.length,
          resolution,
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

