import { S3StorageAdapter } from './s3-adapter';

export class R2StorageAdapter extends S3StorageAdapter {
  constructor(opts: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string }) {
    super({
      bucket: opts.bucketName,
      region: 'auto',
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
      endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
    });
  }
}
