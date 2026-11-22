// Caché propia del proyecto: el prefijo evita pisar (o borrar) cachés de otros proyectos del mismo origen (p. ej. GitHub Pages).
const CACHE_PREFIX = 'gridlab-sudoku-';
const LEGACY_PREFIX = 'sudoku-v';   // nombre anterior de nuestras cachés: se limpian al actualizar
const CACHE_NAME = 'gridlab-sudoku-v84';
// Versión que ve el jugador en el aviso de actualización. Mantenerla igual que BUILD en app.js.
const BUILD = 'ui-v72';

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
  './tutorial-data-classic.js',
  './tutorial-data-killer.js',
  './tutorial-data-variants.js',
  './tutorial-data-variants2.js',
  './manifest.json',
  './favicon.svg',
  './favicon.png',
  './icon-192.png',
  './icon-512.png'
];

// Solo el modo Co-op depende de PeerJS: si falta el archivo, el resto de la app se instala igual.
// (Los datos de las técnicas del Tutorial son obligatorios: están en ASSETS para que las 71 lecciones funcionen offline.)
const OPTIONAL_ASSETS = [
  './peerjs.min.js'
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
    // Sin skipWaiting(): la versión nueva queda "en espera" hasta que la app (con el jugador sin partida ni sala en curso, o
    // cuando lo confirma) le envíe { type: 'SKIP_WAITING' }. Así una actualización nunca corta una partida o una sala.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Solo se borran cachés PROPIAS obsoletas; cualquier otra caché del origen queda intacta.
    await Promise.all(keys.filter((key) => key !== CACHE_NAME && (key.startsWith(CACHE_PREFIX) || key.startsWith(LEGACY_PREFIX))).map((key) => caches.delete(key)));
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
    // Se busca solo en la caché de ESTA versión: nunca se mezclan recursos de versiones distintas ni de otros proyectos.
    caches.open(CACHE_NAME).then((cache) => cache.match(req, { ignoreSearch: true })).then((cached) => {
      return cached || fetch(req);
    })
  );
});
