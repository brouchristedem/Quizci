// Service worker Quizci
// Quizci est un jeu en direct : les parties passent par Firebase (Firestore, Auth), jamais mis en cache ici.
// - Pages et scripts/styles : réseau d'abord (toujours la dernière version), repli sur le cache si hors-ligne.
// - Images et icônes : cache d'abord.
// - Tout ce qui vient d'un autre domaine (Firebase, Google, CDN) passe directement au réseau.

const CACHE_VERSION = "quizci-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

const isImage = (url) => /\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname);
const isCode = (url) => /\.(js|css)$/.test(url.pathname);

function networkFirst(request, fallback) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached || fallback()));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // L'espace admin n'est jamais mis en cache.
  if (url.pathname.startsWith("/admin")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, () => caches.match(OFFLINE_URL)));
    return;
  }

  if (isCode(url)) {
    event.respondWith(networkFirst(request, () => Response.error()));
    return;
  }

  if (isImage(url) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
