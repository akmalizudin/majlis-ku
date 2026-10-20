// Browser-only upload engine for guests: compress, ask the server for an upload URL, PUT the
// bytes with progress, then confirm. Retries with back-off and waits for the network to return.
// No third-party code, to keep the guest page small.

export type UploadKind = "PHOTO" | "VIDEO" | "VOICE";
export type Stage = "compressing" | "uploading" | "processing" | "retrying" | "waitingOnline" | "done";

export class UploadError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(code);
  }
}

/** Only an explicit false means offline (some runtimes leave onLine undefined). */
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function waitOnline(): Promise<void> {
  if (!isOffline()) return Promise.resolve();
  return new Promise((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new UploadError("network", true);
  }
  if (response.ok) {
    return (response.status === 204 ? undefined : await response.json()) as T;
  }
  const data = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
  const code = data?.error?.code ?? `http_${response.status}`;
  throw new UploadError(code, response.status >= 500 || response.status === 429 || code === "not_uploaded");
}

function putWithProgress(url: string, body: Blob, headers: Record<string, string>, onProgress: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", body.type || "application/octet-stream");
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new UploadError(xhr.status === 413 ? "too_large" : `http_${xhr.status}`, xhr.status >= 500 || xhr.status === 0));
    };
    xhr.onerror = () => reject(new UploadError("network", true));
    xhr.ontimeout = () => reject(new UploadError("network", true));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(body);
  });
}

/** Run `task`, retrying retryable failures up to `tries` times; pauses while the browser is offline. */
export async function withRetry<T>(task: () => Promise<T>, onStage: (stage: Stage) => void, tries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      const retryable = error instanceof UploadError ? error.retryable : true;
      if (!retryable || attempt >= tries) throw error;
      if (isOffline()) {
        onStage("waitingOnline");
        await waitOnline();
        attempt--; // time spent offline does not use up a try
      } else {
        onStage("retrying");
        await sleep(1000 * 3 ** attempt);
      }
    }
  }
}

/** Resize to at most `maxSide` px and re-encode as JPEG. Falls back to the original file. */
export async function compressImage(file: File, maxSide = 2560, quality = 0.85): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  if (scale === 1 && file.type === "image/jpeg" && blob.size >= file.size) return file;
  return blob;
}

export async function uploadOne({
  slug,
  kind,
  blob,
  durationSec,
  onStage,
  onProgress,
}: {
  slug: string;
  kind: UploadKind;
  blob: Blob;
  durationSec?: number | null;
  onStage: (stage: Stage) => void;
  onProgress: (fraction: number) => void;
}): Promise<void> {
  const mimeType = blob.type || "application/octet-stream";
  const start = await withRetry(
    () =>
      postJson<{ uploadId: string; url: string; headers: Record<string, string> }>(`/api/e/${slug}/uploads`, {
        kind,
        mimeType,
        sizeBytes: blob.size,
        durationSec: durationSec ?? null,
      }),
    onStage,
  );
  await withRetry(
    () => {
      onStage("uploading");
      return putWithProgress(start.url, blob, start.headers, onProgress);
    },
    onStage,
  );
  onStage("processing");
  await withRetry(() => postJson(`/api/e/${slug}/uploads/${start.uploadId}/complete`), onStage);
  onStage("done");
}