const CACHE_NAME = 'sudoku-v30';

// Archivos imprescindibles: si alguno falla, la instalación falla (la app no queda a medias).
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './engine.js',
  './killer-engine.js',
  './worker.js',
  './duel.js',
  './coop.js',
  './app.js',
  './sound.js',
  './tutorial.css',
  './tutorial.js',
  './manifest.json',
  './favicon.svg',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

// Solo el modo Co-op depende de PeerJS: si falta el archivo, el resto de la app se instala igual.
// Los archivos de datos del tutorial también son opcionales: se cachean en cuanto existan.
const OPTIONAL_ASSETS = [
  './peerjs.min.js',
  './tutorial-data-classic.js',
  './tutorial-data-killer.js',
  './tutorial-data-variants.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))).then(() =>
        Promise.all(
          OPTIONAL_ASSETS.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Solo se atienden GET del mismo origen; PeerJS (señalización) y cualquier otro tráfico pasan directo.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) { return; }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      return cached || fetch(req);
    })
  );
});
