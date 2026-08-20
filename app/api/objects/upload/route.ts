import { Readable } from "node:stream";

import { Upload } from "@aws-sdk/lib-storage";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Uploads a single file sent as the raw request body.
 * The body is streamed to S3 (multipart when needed) without buffering
 * the whole file in memory.
 */
export async function POST(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get("key");
    if (!keyParam) throw new HttpError(400, "Missing key parameter");
    const key = assertKeyInRoot(keyParam);
    if (key.endsWith("/")) throw new HttpError(400, "Invalid file key");
    if (!request.body) throw new HttpError(400, "Empty request body");

    const upload = new Upload({
      client: getS3Client(),
      params: {
        Bucket: getBucket(),
        Key: key,
        Body: Readable.fromWeb(
          request.body as unknown as import("node:stream/web").ReadableStream,
        ),
        ContentType:
          request.headers.get("content-type") ?? "application/octet-stream",
      },
    });
    await upload.done();

    return Response.json({ key });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
