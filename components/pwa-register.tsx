"use client";

import { useEffect } from "react";

/** Registers the dummy service worker so Chrome offers PWA installation. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  return null;
}
