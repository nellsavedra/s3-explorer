import { S3Client } from "@aws-sdk/client-s3";

import { HttpError } from "./api-error";

let client: S3Client | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`);
  }
  return value;
}

export function getS3Client(): S3Client {
  if (!client) {
    const endpoint = process.env.S3_ENDPOINT?.trim() || undefined;
    client = new S3Client({
      region: process.env.S3_REGION?.trim() || "us-east-1",
      endpoint,
      // Path style is required by most S3-compatible providers (MinIO, R2...)
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE
        ? process.env.S3_FORCE_PATH_STYLE === "true"
        : Boolean(endpoint),
      credentials: {
        accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function getBucket(): string {
  return requiredEnv("S3_BUCKET");
}

/** Optional prefix the explorer is restricted to. Always "" or ends with "/". */
export function getRootPrefix(): string {
  const raw = process.env.S3_ROOT_PREFIX?.trim() ?? "";
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/** Ensures a key/prefix stays inside the configured root prefix. */
export function assertKeyInRoot(key: string): string {
  const root = getRootPrefix();
  if (!key.startsWith(root)) {
    throw new HttpError(403, "Key is outside the allowed root prefix");
  }
  return key;
}
