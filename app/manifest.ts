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
    description: "Browse, upload, download and manage files.",
    start_url: "/",
    // Prefer minimal-ui; fall back to standalone, then browser chrome.
    // display_override is consulted first; display is the legacy fallback.
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: `${title} on desktop`,
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        label: `${title} on mobile`,
      },
    ],
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
