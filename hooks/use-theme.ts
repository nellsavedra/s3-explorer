"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "s3-explorer-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeNoop() {
  return () => {};
}

function getStoredTheme(): Theme | null {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : null;
}

function subscribeSystemDark(callback: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

function applyTheme(theme: Theme, systemDark: boolean) {
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Theme state. The initial <html> class is set by an inline script in the
 * layout (before first paint, no flash); this hook keeps React state and the
 * class in sync afterwards, including OS preference changes on "system".
 */
export function useTheme() {
  const [override, setOverride] = useState<Theme | null>(null);
  const stored = useSyncExternalStore(subscribeNoop, getStoredTheme, () => null);
  const theme = override ?? stored ?? "system";
  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDark,
    () => false,
  );
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyTheme(theme, systemDark);
  }, [theme, systemDark]);

  const setTheme = (next: Theme) => {
    setOverride(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return { theme, resolvedTheme, setTheme };
}
