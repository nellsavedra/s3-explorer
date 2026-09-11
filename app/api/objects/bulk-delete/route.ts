import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// S3 DeleteObjects accepts at most 1000 keys per call.
const MAX_KEYS = 1000;

/** Deletes many files at once via S3 batch delete (no folders). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { keys?: unknown };
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

    const output = await getS3Client().send(
      new DeleteObjectsCommand({
        Bucket: getBucket(),
        Delete: { Objects: keys.map((key) => ({ Key: key })) },
      }),
    );

    const failed = (output.Errors ?? []).length;
    return Response.json({ deleted: keys.length - failed, failed });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
