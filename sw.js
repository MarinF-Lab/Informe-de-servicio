/* Service worker · Informe de Servicio */
const CACHE = "registro-predicacion-v1";

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
  // Deja pasar TODO lo que no sea de este sitio (Firebase, Google, fuentes) sin tocar la caché.
  if (url.origin !== self.location.origin) return;

  // Navegaciones (abrir la app): primero red, y si no hay, lo cacheado.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./", cp)); return r; })
        .catch(() => caches.match("./").then((r) => r || caches.match(req)))
    );
    return;
  }

  // Recursos propios (iconos, etc.): primero caché, luego red.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((r) => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      }).catch(() => hit)
    )
  );
});

});
