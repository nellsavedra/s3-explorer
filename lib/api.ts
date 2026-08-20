export interface BrandConfig {
  title: string;
  logoUrl: string | null;
  accentColor: string | null;
  bucket: string | null;
  rootPrefix: string | null;
  cdnBaseUrl: string | null;
}

export interface ObjectItem {
  key: string;
  name: string;
  type: "folder" | "file";
  size: number;
  lastModified: string | null;
}

export interface ListObjectsResponse {
  prefix: string;
  items: ObjectItem[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  let message = `Request failed (${response.status})`;
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) message = data.error;
  } catch {
    // keep the default message
  }
  throw new ApiError(response.status, message);
}

export async function fetchConfig(): Promise<BrandConfig> {
  const response = await fetch("/api/config");
  await throwIfNotOk(response);
  return response.json();
}

export async function fetchObjects(
  prefix: string,
  continuationToken?: string | null,
): Promise<ListObjectsResponse> {
  const params = new URLSearchParams({ prefix });
  if (continuationToken) params.set("continuationToken", continuationToken);
  const response = await fetch(`/api/objects?${params}`);
  await throwIfNotOk(response);
  return response.json();
}

export async function deleteObject(key: string): Promise<void> {
  const response = await fetch(`/api/objects?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  await throwIfNotOk(response);
}

export async function renameObject(source: string, newName: string): Promise<void> {
  const response = await fetch("/api/objects/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source, newName }),
  });
  await throwIfNotOk(response);
}

export async function createFolder(key: string): Promise<void> {
  const response = await fetch("/api/objects/folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  await throwIfNotOk(response);
}

export function downloadUrl(key: string): string {
  return `/api/objects/download?key=${encodeURIComponent(key)}`;
}

/** URL that serves the object inline (for <img> previews). */
export function previewUrl(key: string): string {
  return `${downloadUrl(key)}&inline=1`;
}

/** Public CDN URL of an object (requires CDN_BASE_URL to be configured). */
export function assetUrl(cdnBaseUrl: string, key: string): string {
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${cdnBaseUrl}/${path}`;
}

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "svg",
  "bmp",
  "ico",
]);

export function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

export function hasFileExtension(name: string): boolean {
  return /\.[a-z0-9]+$/i.test(name);
}

export interface SniffResult {
  image: boolean;
  mimeType: string | null;
}

/** Server-side magic-byte detection, for files without an image extension. */
export async function sniffObject(key: string): Promise<SniffResult> {
  const response = await fetch(`/api/objects/sniff?key=${encodeURIComponent(key)}`);
  await throwIfNotOk(response);
  return response.json();
}

/**
 * Uploads one file as the raw request body using XHR so we get
 * real upload progress events (fetch does not expose them).
 */
export function uploadFile(
  key: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/objects/upload?key=${encodeURIComponent(key)}`);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const data = JSON.parse(xhr.responseText) as { error?: string };
        if (data.error) message = data.error;
      } catch {
        // keep the default message
      }
      reject(new ApiError(xhr.status, message));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload"));
    xhr.send(file);
  });
}
