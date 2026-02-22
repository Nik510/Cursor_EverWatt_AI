import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import type { StorageAdapter } from '../storage/types';
import { LocalStorageAdapter } from '../storage/local-adapter';
import { S3StorageAdapter } from '../storage/s3-adapter';
import { R2StorageAdapter } from '../storage/r2-adapter';

let adapter: StorageAdapter | null = null;
let adapterSig: string | null = null;

function getLocalBaseDir(): string {
  return process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'data', 'uploads');
}

export function getStorageAdapter(): StorageAdapter {
  const type = (config.storage.type || 'local').toLowerCase();
  const sig =
    type === 's3'
      ? `s3:${config.storage.s3.bucket}:${config.storage.s3.region}:${String(config.storage.s3.accessKeyId || '').slice(0, 4)}`
      : type === 'r2'
        ? `r2:${config.storage.r2.accountId}:${config.storage.r2.bucketName}:${String(config.storage.r2.accessKeyId || '').slice(0, 4)}`
        : `local:${getLocalBaseDir()}`;

  if (adapter && adapterSig === sig) return adapter;
  adapterSig = sig;

  if (type === 's3') {
    adapter = new S3StorageAdapter({
      bucket: config.storage.s3.bucket,
      region: config.storage.s3.region,
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
    });
    return adapter;
  }

  if (type === 'r2') {
    adapter = new R2StorageAdapter({
      accountId: config.storage.r2.accountId,
      accessKeyId: config.storage.r2.accessKeyId,
      secretAccessKey: config.storage.r2.secretAccessKey,
      bucketName: config.storage.r2.bucketName,
    });
    return adapter;
  }

  adapter = new LocalStorageAdapter(getLocalBaseDir());
  return adapter;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/\\/g, '_')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 180);
}

export function buildUserFileKey(args: { userId: string; originalName: string }): string {
  const id = randomUUID();
  const safe = sanitizeFilename(args.originalName || 'file');
  return `${args.userId}/${id}-${safe}`;
}

export function buildUserFileKeyAtPath(args: { userId: string; pathPrefix: string; filename: string }): string {
  const safePrefix = String(args.pathPrefix || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const safeName = sanitizeFilename(args.filename || 'file');
  const suffix = safePrefix ? `${safePrefix}/${safeName}` : safeName;
  return `${args.userId}/${suffix}`;
}

export async function putUserFile(args: {
  userId: string;
  originalName: string;
  contentType: string;
  body: Buffer;
}): Promise<{ key: string; url?: string }> {
  const key = buildUserFileKey({ userId: args.userId, originalName: args.originalName });
  const res = await getStorageAdapter().putObject({ key, body: args.body, contentType: args.contentType });
  return res;
}

export async function putUserFileAtKey(args: {
  userId: string;
  key: string;
  originalName: string;
  contentType: string;
  body: Buffer;
}): Promise<{ key: string; url?: string }> {
  const key = String(args.key || '').trim();
  if (!key.startsWith(`${args.userId}/`)) {
    throw new Error('Invalid storage key (must be under userId prefix)');
  }
  const res = await getStorageAdapter().putObject({ key, body: args.body, contentType: args.contentType });
  return res;
}

export async function getUserFile(args: { userId: string; key: string }): Promise<{ body: Buffer; contentType: string } | null> {
  if (!args.key.startsWith(`${args.userId}/`)) {
    return null;
  }
  return await getStorageAdapter().getObject({ key: args.key });
}
