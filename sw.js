// ── RahmanGrow Service Worker ──────────────────────────────
// Version — bump this number whenever you deploy changes
const CACHE_NAME = "rahmangrow-v1";

// Files to cache for offline use
const STATIC_FILES = [
  "/",
  "/index.html",
  "/shop.html",
  "/order.html",
  "/track.html",
  "/about.html",
  "/contact.html",
  "/style.css",
  "/shop.css",
  "/search.css",
  "/promo.css",
  "/hero.css",
  "/testimonial.css",
  "/subscribe.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
];

// ── INSTALL — cache static files ──────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static files");
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE — clean up old caches ───────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH — serve from cache, fall back to network ───────
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and Firebase/Cloudinary API calls
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("firestore.googleapis.com")) return;
  if (event.request.url.includes("firebase")) return;
  if (event.request.url.includes("cloudinary")) return;
  if (event.request.url.includes("emailjs")) return;
  if (event.request.url.includes("paystack")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached version, but also update in background
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, response.clone());
              });
            }
          })
          .catch(() => {});
        return cached;
      }

      // Not in cache — fetch from network
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) return response;

          // Cache a copy of the response
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback for HTML pages
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
