import type { MetadataRoute } from "next";

// Evaluated per request so whitelabel env vars apply without a rebuild.
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const title = process.env.BRAND_TITLE?.trim() || "S3 Explorer";
  const accent = process.env.BRAND_ACCENT_COLOR?.trim() ?? "";
  const themeColor = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)
    ? accent
    : "#111827";

  return {
    name: title,
    short_name: title,
    description: "Whitelabel S3 bucket explorer",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
