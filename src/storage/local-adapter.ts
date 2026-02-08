import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { StorageAdapter, PutObjectResult } from './types';

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private baseDir: string) {}

  private resolvePath(key: string): string {
    // prevent path traversal
    const safe = key.replace(/\\/g, '/').replace(/\.{2,}/g, '.');
    return path.join(this.baseDir, safe);
  }

  async putObject(args: { key: string; body: Buffer; contentType: string }): Promise<PutObjectResult> {
    const filePath = this.resolvePath(args.key);
    const dir = path.dirname(filePath);
    await mkdir(dir, { recursive: true });

    // Simple format: store raw bytes
    await writeFile(filePath, args.body);

    // Store content-type sidecar
    await writeFile(`${filePath}.content-type`, args.contentType, 'utf-8');

    return { key: args.key };
  }

  async getObject(args: { key: string }): Promise<{ body: Buffer; contentType: string } | null> {
    const filePath = this.resolvePath(args.key);
    if (!existsSync(filePath)) return null;

    const body = await readFile(filePath);
    let contentType = 'application/octet-stream';
    const ctPath = `${filePath}.content-type`;
    if (existsSync(ctPath)) {
      contentType = String(await readFile(ctPath, 'utf-8')).trim() || contentType;
    }

    return { body, contentType };
  }
}
