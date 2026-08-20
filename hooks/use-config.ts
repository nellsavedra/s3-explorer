"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { fetchConfig } from "@/lib/api";

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Picks a readable foreground (near-black / near-white) for a hex color. */
function readableForeground(hex: string): string {
  const c = hex.replace("#", "");
  const full =
    c.length === 3
      ? c
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : c;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
}

/** Reads the whitelabel config (shared react-query cache, no side effects). */
export function useConfigData() {
  return useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
  }).data;
}

/**
 * Loads the whitelabel config from the server and applies it at runtime:
 * document title + accent color injected into the shadcn CSS variables.
 */
export function useConfig() {
  const query = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
  });

  const config = query.data;

  useEffect(() => {
    if (!config) return;
    document.title = config.title;
    const accent = config.accentColor?.trim();
    if (accent && HEX_COLOR.test(accent)) {
      const root = document.documentElement;
      root.style.setProperty("--primary", accent);
      root.style.setProperty(
        "--primary-foreground",
        readableForeground(accent),
      );
      root.style.setProperty("--ring", accent);
    }
  }, [config]);

  return query;
}
