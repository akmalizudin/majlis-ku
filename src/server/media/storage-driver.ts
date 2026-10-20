// The storage boundary. `local` is used now; an S3/R2 driver implements the same interface later.

export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };

export interface StorageDriver {
  /** A short-lived URL the browser PUTs the file to. */
  createUploadUrl(key: string, options: { contentType: string; maxBytes: number; expiresInSec: number }): Promise<UploadTarget>;
  /** A short-lived URL for reading a private object. Create it only after an access check. */
  getDownloadUrl(key: string, options: { expiresInSec: number; filename?: string }): Promise<string>;
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  stat(key: string): Promise<{ size: number } | null>;
  readHead(key: string, bytes: number): Promise<Buffer>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}