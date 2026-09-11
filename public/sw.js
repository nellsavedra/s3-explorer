// Dummy service worker: its only purpose is to make the app installable
// as a PWA in Chrome. It intentionally has NO fetch listener (not required
// for installability since Chrome 108), so it never intercepts requests —
// everything always goes straight to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
