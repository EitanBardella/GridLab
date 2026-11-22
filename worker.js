/* worker.js — Genera tableros en un hilo secundario para no bloquear la interfaz.
   Mensaje de entrada:  { id, mode, diff, seed, fixed }
   Mensaje de salida:   { id, ok: true, result }   (en 'jigsaw', result.regions lleva el mapa de regiones)
   | { id, ok: false, error }
   El modo ('classic' | 'diagonal' | 'antiknight' | 'nonconsecutive' | 'jigsaw') se pasa como `variant` al motor; 'killer' usa killer-engine.js.
   Usa los mismos motores y las mismas opciones que el hilo principal: con la misma semilla produce el mismo tablero. */
// Plazo duro por tablero (ms): holgado para cualquier teléfono, pero finito. Un tablero que lo supere responde con error
// estructurado en vez de colgar el hilo. (Antes 1e9 ms ≈ sin límite.)
var WORKER_BUDGET_MS = 25000;
var GEN_E = { maxAttempts: 30, timeBudgetMs: WORKER_BUDGET_MS };   // espejo de app.js (topes fijos, deterministas por semilla)
var GEN_K = { timeBudgetMs: WORKER_BUDGET_MS };

var loaded = false;
// importScripts dentro del try: si falla (archivo ausente, sin red, script corrupto) se responde { id, ok:false, error }
// y se vuelve a intentar en el mensaje siguiente.
function ensureLoaded() {
  if (loaded) { return; }
  importScripts('engine.js', 'killer-engine.js');
  if (!self.SudokuEngine || !self.KillerEngine) { throw new Error('Los motores de generación no se cargaron.'); }
  loaded = true;
}

self.onmessage = function (ev) {
  var m = ev.data || {};
  try {
    ensureLoaded();
    var res;
    if (m.mode === 'killer') {
      res = self.KillerEngine.generateKillerPuzzle(m.diff, Object.assign({ seed: m.seed }, GEN_K));
    } else {
      res = self.SudokuEngine.generatePuzzle(m.diff, Object.assign({ variant: m.mode, seed: m.seed }, m.fixed ? GEN_E : {}));
    }
    self.postMessage({ id: m.id, ok: true, result: res });
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
};
