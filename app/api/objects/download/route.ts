import { Readable } from "node:stream";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams an object from S3 to the browser as an attachment. */
export async function GET(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get("key");
    if (!keyParam) throw new HttpError(400, "Missing key parameter");
    const key = assertKeyInRoot(keyParam);
    if (key.endsWith("/")) throw new HttpError(400, "Cannot download a folder");

    // inline=1 serves the object for in-browser display (gallery previews)
    const inline = request.nextUrl.searchParams.get("inline") === "1";

    const output = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    );
    if (!output.Body) throw new HttpError(404, "Object not found");

    const name = key.split("/").pop() ?? "download";
    const stream = Readable.toWeb(output.Body as Readable);

    const headers = new Headers({
      "Content-Type": output.ContentType ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": inline ? "private, max-age=3600" : "no-store",
    });
    if (output.ContentLength != null) {
      headers.set("Content-Length", String(output.ContentLength));
    }

    return new Response(stream as unknown as ReadableStream, { headers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
