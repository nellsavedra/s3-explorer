"use client";

import { useEffect } from "react";

/**
 * Registers the dummy service worker so Chrome offers PWA installation.
 * Registration is deferred until the page has fully loaded so the SW
 * lifecycle (install/activate/clients.claim) can't interfere with the
 * initial load's in-flight requests.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js");
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
