import { PassThrough, Readable } from "node:stream";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ZipArchive } from "archiver";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KEYS = 200;

/**
 * Streams a ZIP with the requested objects. Files are stored without
 * recompression (`store: true`): most assets here are images/videos, which
 * don't compress, and skipping it keeps the stream fast and cheap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      keys?: unknown;
      basePrefix?: unknown;
    };
    if (
      !Array.isArray(body.keys) ||
      body.keys.length === 0 ||
      !body.keys.every((k) => typeof k === "string")
    ) {
      throw new HttpError(400, "Expected JSON body: { keys: string[] }");
    }
    if (body.keys.length > MAX_KEYS) {
      throw new HttpError(400, `Too many files selected (max ${MAX_KEYS})`);
    }

    const keys = (body.keys as string[])
      .map((k) => assertKeyInRoot(k))
      .filter((k) => !k.endsWith("/"));
    const basePrefix =
      typeof body.basePrefix === "string" ? body.basePrefix : "";

    const s3 = getS3Client();
    const bucket = getBucket();

    const archive = new ZipArchive({ store: true });
    const pass = new PassThrough();
    archive.pipe(pass);
    archive.on("error", (err) => pass.destroy(err));

    // Fetch each object before the response starts, so S3 errors
    // (e.g. NoSuchKey) still produce a clean JSON error response.
    for (const key of keys) {
      const output = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!output.Body) continue;
      const name =
        basePrefix && key.startsWith(basePrefix)
          ? key.slice(basePrefix.length)
          : (key.split("/").pop() ?? key);
      archive.append(output.Body as Readable, { name });
    }
    void archive.finalize();

    return new Response(Readable.toWeb(pass) as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="download.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
