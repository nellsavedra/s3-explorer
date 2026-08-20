import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creates a "folder": an empty object whose key ends with "/". */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: unknown };
    if (typeof body.key !== "string") {
      throw new HttpError(400, "Expected JSON body: { key }");
    }

    const key = assertKeyInRoot(body.key.trim());
    if (!key.endsWith("/")) {
      throw new HttpError(400, "Folder keys must end with '/'");
    }

    await getS3Client().send(
      new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: "" }),
    );

    return Response.json({ key });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
