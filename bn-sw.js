/* Bola de Nieve · service worker (demo). Vive en la raíz para controlar el alcance /demo-heladeria. */

const CACHE = 'bn-v2';            // caché de la app (HTML, icono, scripts propios)
const FONTS_CACHE = 'bn-fonts';   // tipografías de Google Fonts
const PAGE = 'demo-heladeria.html';

// Archivos que se guardan al instalar para que la tienda abra sin conexión
const SHELL = [
  PAGE,
  'bola-de-nieve.webmanifest',
  'assets/sundan-bar.js',
  'assets/sundan-track.js',
  'assets/pwa/favicon-bn.svg',
  'assets/pwa/icon-192.png',
  'assets/pwa/icon-512.png',
  'assets/pwa/icon-maskable-512.png',
  'assets/pwa/apple-touch-icon-180.png'
];

// Instalación: guarda la app y activa la nueva versión sin esperar a cerrar pestañas.
// Si un archivo falla, el resto se guarda igual.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) =>
        fetch(new Request(url, { cache: 'reload' }))
          .then((res) => { if (res.ok) return cache.put(url, res); })
          .catch(() => { /* archivo no disponible: se pedirá en red */ })
      )))
      .then(() => self.skipWaiting())
  );
});

// Activación: borra cachés antiguas de Bola de Nieve y toma el control de las pestañas abiertas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('bn-') && k !== CACHE && k !== FONTS_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Corta una promesa de red si tarda más de ms (para no dejar la pantalla en blanco)
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

// Páginas de la tienda: red primero (máx. 3 s); si no hay red, la copia guardada.
async function navigation(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), 3000);
    if (res && res.ok) cache.put(PAGE, res.clone());
    return res;
  } catch (e) {
    const saved = await cache.match(PAGE, { ignoreSearch: true });
    return saved || Response.error();
  }
}

// Caché primero y actualización en segundo plano (para estáticos y tipografías)
async function cacheThenUpdate(event, cacheName) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const update = fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  });
  if (cached) {
    event.waitUntil(update.catch(() => { /* sin red: seguimos con la copia */ }));
    return cached;
  }
  return update;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;            // solo GET se gestiona aquí
  const url = new URL(req.url);

  // Analítica: siempre red, nunca se guarda; si falla, en silencio
  if (url.hostname === 'cloud.umami.is') {
    event.respondWith(fetch(req).catch(() => Response.error()));
    return;
  }

  // Tipografías de Google Fonts: caché con actualización en segundo plano
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheThenUpdate(event, FONTS_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navegaciones dentro del alcance de la demo
  if (req.mode === 'navigate' && url.pathname.startsWith('/demo-heladeria')) {
    event.respondWith(navigation(req));
    return;
  }

  // Archivos estáticos propios (assets, manifest)
  if (url.pathname.startsWith('/assets/') || url.pathname === '/bola-de-nieve.webmanifest') {
    event.respondWith(cacheThenUpdate(event, CACHE));
  }
});

// Aviso de pedido: abre o enfoca la tienda en el seguimiento del pedido
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || PAGE + '?source=pwa#seguimiento', self.location).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = list.find((c) => new URL(c.url).pathname.startsWith('/demo-heladeria'));
    if (open) {
      await open.focus();
      if (open.url !== target && open.navigate) await open.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
