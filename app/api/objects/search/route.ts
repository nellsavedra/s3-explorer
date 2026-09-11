import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getRootPrefix, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SCANNED = 50_000;
const MAX_RESULTS = 200;

interface SearchResult {
  key: string;
  name: string;
  /** Folder path relative to the searched prefix ("" when at its root). */
  folder: string;
  type: "file";
  size: number;
  lastModified: string | null;
}

/**
 * Server-side search. S3 has no substring search API (only prefix filtering),
 * so this lists keys recursively under the given prefix and filters here:
 * nothing is filtered client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("q") ?? "")
      .trim()
      .toLowerCase();
    const prefix = assertKeyInRoot(
      request.nextUrl.searchParams.get("prefix") ?? getRootPrefix(),
    );
    if (query.length < 2) {
      throw new HttpError(400, "Search query needs at least 2 characters");
    }

    const s3 = getS3Client();
    const bucket = getBucket();

    const results: SearchResult[] = [];
    let scanned = 0;
    let truncated = false;
    let continuationToken: string | undefined;

    do {
      const output = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      );
      scanned += output.KeyCount ?? 0;

      for (const object of output.Contents ?? []) {
        if (!object.Key || object.Key.endsWith("/")) continue;
        const relative = object.Key.slice(prefix.length);
        if (!relative.toLowerCase().includes(query)) continue;

        const slash = relative.lastIndexOf("/");
        results.push({
          key: object.Key,
          name: slash === -1 ? relative : relative.slice(slash + 1),
          folder: slash === -1 ? "" : relative.slice(0, slash + 1),
          type: "file",
          size: object.Size ?? 0,
          lastModified: object.LastModified?.toISOString() ?? null,
        });
        if (results.length >= MAX_RESULTS) break;
      }

      continuationToken = output.IsTruncated
        ? output.NextContinuationToken
        : undefined;

      if (results.length >= MAX_RESULTS || scanned >= MAX_SCANNED) {
        truncated = continuationToken !== undefined;
        break;
      }
    } while (continuationToken);

    return Response.json({ items: results, scanned, truncated });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
