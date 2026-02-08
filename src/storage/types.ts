export type PutObjectResult = {
  key: string;
  url?: string;
};

export interface StorageAdapter {
  putObject(args: { key: string; body: Buffer; contentType: string }): Promise<PutObjectResult>;
  getObject(args: { key: string }): Promise<{ body: Buffer; contentType: string } | null>;
}
