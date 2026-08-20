import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getRootPrefix, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const prefix = assertKeyInRoot(
      request.nextUrl.searchParams.get("prefix") ?? getRootPrefix(),
    );
    const continuationToken =
      request.nextUrl.searchParams.get("continuationToken") ?? undefined;

    const output = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: getBucket(),
        Prefix: prefix,
        Delimiter: "/",
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );

    const folders = (output.CommonPrefixes ?? [])
      .filter((cp) => cp.Prefix && cp.Prefix !== prefix)
      .map((cp) => ({
        key: cp.Prefix as string,
        name: (cp.Prefix as string).slice(prefix.length, -1),
        type: "folder" as const,
        size: 0,
        lastModified: null,
      }));

    const files = (output.Contents ?? [])
      .filter((c) => c.Key && c.Key !== prefix)
      .map((c) => ({
        key: c.Key as string,
        name: (c.Key as string).slice(prefix.length),
        type: "file" as const,
        size: c.Size ?? 0,
        lastModified: c.LastModified?.toISOString() ?? null,
      }));

    return Response.json({
      prefix,
      items: [...folders, ...files],
      isTruncated: output.IsTruncated ?? false,
      nextContinuationToken: output.NextContinuationToken ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get("key");
    if (!keyParam) throw new HttpError(400, "Missing key parameter");
    const key = assertKeyInRoot(keyParam);

    const s3 = getS3Client();
    const bucket = getBucket();

    if (key.endsWith("/")) {
      // Folder: delete every object under the prefix (including the marker).
      let deleted = 0;
      let continuationToken: string | undefined;
      do {
        const listed = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: key,
            ContinuationToken: continuationToken,
          }),
        );
        const objects = (listed.Contents ?? [])
          .filter((c) => c.Key)
          .map((c) => ({ Key: c.Key as string }));
        if (objects.length > 0) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: objects, Quiet: true },
            }),
          );
          deleted += objects.length;
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);
      return Response.json({ deleted });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return Response.json({ deleted: 1 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
