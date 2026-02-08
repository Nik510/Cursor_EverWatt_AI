import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter, PutObjectResult } from './types';

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;

  constructor(
    private opts: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
    }
  ) {
    this.client = new S3Client({
      region: opts.region,
      credentials: {
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
      },
      endpoint: opts.endpoint,
    });
  }

  async putObject(args: { key: string; body: Buffer; contentType: string }): Promise<PutObjectResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.opts.bucket,
        Key: args.key,
        Body: args.body,
        ContentType: args.contentType,
      })
    );

    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.opts.bucket, Key: args.key }),
      { expiresIn: 60 * 60 }
    );

    return { key: args.key, url };
  }

  async getObject(args: { key: string }): Promise<{ body: Buffer; contentType: string } | null> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.opts.bucket, Key: args.key })
    );

    const chunks: Buffer[] = [];
    const stream = res.Body as any;
    if (!stream || typeof stream.on !== 'function') return null;

    await new Promise<void>((resolve, reject) => {
      stream.on('data', (c: Buffer) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on('end', () => resolve());
      stream.on('error', (e: any) => reject(e));
    });

    return {
      body: Buffer.concat(chunks),
      contentType: res.ContentType || 'application/octet-stream',
    };
  }
}
