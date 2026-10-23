/**
 * Labo STI — Service Worker Hors-Ligne (Issue #124 / TEC-08 / Résilience Lycée)
 * Met en cache l'application, les bundles JS/CSS/WASM auto-hébergés et les routes
 * de travail (/sujet/$id, /cours, /) pour garantir la continuité pédagogique
 * en cas de coupure réseau en salle informatique.
 */

const CACHE_NAME = "labo-sti-offline-v1";
const APP_SHELL_URLS = ["/", "/cours", "/favicon.svg", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((oldKey) => caches.delete(oldKey)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation HTML (/sujet/$id, /cours, /) : Network-first avec repli sur le cache ou l'App Shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootFallback = await caches.match("/");
          return rootFallback || Response.error();
        }),
    );
    return;
  }

  // Ressources statiques (JS, CSS, WASM, polices, icônes) : Stale-While-Revalidate
  if (
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|wasm|woff2?|svg|png|jpg|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);

        return cached || networkPromise;
      }),
    );
  }
});
