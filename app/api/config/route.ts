import { getRootPrefix } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whitelabel runtime config. Read from server env vars on every request,
 * so the same build can serve different brands via env vars only.
 */
export async function GET() {
  return Response.json({
    title: process.env.BRAND_TITLE?.trim() || "S3 Explorer",
    logoUrl: process.env.BRAND_LOGO_URL?.trim() || null,
    accentColor: process.env.BRAND_ACCENT_COLOR?.trim() || null,
    bucket: process.env.S3_BUCKET?.trim() || null,
    rootPrefix: getRootPrefix() || null,
    cdnBaseUrl:
      process.env.CDN_BASE_URL?.trim().replace(/\/+$/, "") || null,
  });
}
