import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renames a file. S3 has no native rename: it is implemented as
 * CopyObject + DeleteObject, so the IAM policy must allow both
 * s3:PutObject and s3:DeleteObject.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      source?: unknown;
      newName?: unknown;
    };
    if (typeof body.source !== "string" || typeof body.newName !== "string") {
      throw new HttpError(400, "Expected JSON body: { source, newName }");
    }

    const source = assertKeyInRoot(body.source);
    const newName = body.newName.trim();
    if (source.endsWith("/")) {
      throw new HttpError(400, "Folder rename is not supported");
    }
    if (!newName || newName.includes("/") || newName.includes("\\")) {
      throw new HttpError(400, "Invalid name");
    }

    const parentPrefix = source.slice(
      0,
      source.length - (source.split("/").pop() ?? "").length,
    );
    const destination = assertKeyInRoot(parentPrefix + newName);
    if (destination === source) return Response.json({ key: destination });

    const bucket = getBucket();
    const s3 = getS3Client();

    // CopySource must be URL-encoded per segment ("/" stays as separator).
    const copySource = [bucket, ...source.split("/").map(encodeURIComponent)].join(
      "/",
    );
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: destination,
        CopySource: copySource,
      }),
    );
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: source }));

    return Response.json({ key: destination });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
