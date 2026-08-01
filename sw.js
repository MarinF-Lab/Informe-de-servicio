/* Service worker · Informe de Servicio */
const CACHE = "registro-predicacion-v2";

/* App shell: lo que se cachea para que la app abra sin conexión.
   (Los logos van aquí; si renombras el HTML, mantén "./" como inicio.) */
const SHELL = [
  "./",
  "manifest.json",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-192-maskable.png",
  "icon-512.png",
  "icon-512-maskable.png"
];

/* Hosts externos que hace falta cachear para que la app (incluyendo el
   SDK de Firebase y las fuentes) cargue sin conexión. Todo lo demás
   (Firestore, Auth) se deja pasar sin tocar, para no servir datos viejos. */
const RUNTIME_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))   // si falta algún icono, no rompe la instalación
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Navegaciones (abrir la app): primero red, y si no hay, lo cacheado.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./", cp)); return r; })
        .catch(() => caches.match("./").then((r) => r || caches.match(req)))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isRuntimeHost = RUNTIME_HOSTS.includes(url.hostname);

  // Deja pasar sin tocar todo lo demás (Firestore, Auth, etc.): datos en vivo, nunca desde caché.
  if (!sameOrigin && !isRuntimeHost) return;

  // Recursos propios y del SDK/fuentes: primero caché, luego red (y se actualiza la caché de paso).
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((r) => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      }).catch(() => hit)
    )
  );
});
