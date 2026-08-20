// Dummy service worker: its only purpose is to make the app installable
// as a PWA in Chrome. It caches nothing; requests fall through to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: no respondWith -> browser falls back to network.
});
