import { Readable } from "node:stream";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest } from "next/server";

import { apiErrorResponse, HttpError } from "@/lib/api-error";
import {
  isPdfBuffer,
  looksLikePlainText,
  sniffImageMimeType,
} from "@/lib/mime-sniff";
import { assertKeyInRoot, getBucket, getS3Client } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SNIFF_BYTES = 512;

/**
 * Reads the first bytes of an object (Range request) and reports whether it
 * is an image, PDF or plain text, detected from magic bytes. Used by the
 * gallery and the preview lightbox for files with no extension.
 */
export async function GET(request: NextRequest) {
  try {
    const keyParam = request.nextUrl.searchParams.get("key");
    if (!keyParam) throw new HttpError(400, "Missing key parameter");
    const key = assertKeyInRoot(keyParam);
    if (key.endsWith("/")) throw new HttpError(400, "Cannot sniff a folder");

    const output = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Range: `bytes=0-${SNIFF_BYTES - 1}`,
      }),
    );
    if (!output.Body) throw new HttpError(404, "Object not found");

    // Read at most SNIFF_BYTES even if the provider ignores the Range header.
    const body = output.Body as Readable;
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body) {
      const buf = chunk as Buffer;
      chunks.push(buf);
      total += buf.length;
      if (total >= SNIFF_BYTES) break;
    }
    body.destroy();

    const head = Buffer.concat(chunks).subarray(0, SNIFF_BYTES);
    const mimeType = sniffImageMimeType(head);
    const pdf = mimeType === null && isPdfBuffer(head);
    const text = mimeType === null && !pdf && looksLikePlainText(head);
    return Response.json(
      { image: mimeType !== null, pdf, text, mimeType },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
