const CACHE_NAME = 'sudoku-v73';
// Versión que ve el jugador en el aviso de actualización. Mantenerla igual que BUILD en app.js.
const BUILD = 'ui-v61';

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
  './race.js',
  './app.js',
  './sound.js',
  './tutorial.css',
  './tutorial.js',
  './tutorial-transform.js',
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
  './tutorial-data-variants.js',
  './tutorial-data-variants2.js'
];

// Avisa a todas las ventanas abiertas (incluso las que todavía no controla este worker).
async function tell(msg) {
  const list = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  list.forEach((c) => { try { c.postMessage(msg); } catch (e) { /* ventana cerrándose */ } });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const total = ASSETS.length + OPTIONAL_ASSETS.length;
    let loaded = 0;
    const step = () => { loaded++; return tell({ type: 'SW_UPDATE_PROGRESS', loaded, total, version: BUILD }); };
    await tell({ type: 'SW_UPDATE_PROGRESS', loaded: 0, total, version: BUILD });
    // Los obligatorios: si falla uno, falla la instalación (Promise.all rechaza).
    await Promise.all(ASSETS.map((u) => cache.add(new Request(u, { cache: 'reload' })).then(step)));
    // Los opcionales: se cuentan igual, aunque no existan.
    await Promise.all(OPTIONAL_ASSETS.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => null).then(step)));
    await self.skipWaiting();   // descarga completa: la nueva versión pasa a activarse sin esperar a que se cierren las pestañas
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
    await tell({ type: 'SW_UPDATE_READY', version: BUILD });
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') { self.skipWaiting(); }
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
