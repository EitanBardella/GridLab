/* worker.js — Genera tableros en un hilo secundario para no bloquear la interfaz.
   Mensaje de entrada:  { id, mode, diff, seed, fixed }
   Mensaje de salida:   { id, ok: true, result }   (en 'jigsaw', result.regions lleva el mapa de regiones)
   | { id, ok: false, error }
   El modo ('classic' | 'diagonal' | 'antiknight' | 'nonconsecutive' | 'jigsaw') se pasa como `variant` al motor; 'killer' usa killer-engine.js.
   Usa los mismos motores y las mismas opciones que el hilo principal: con la misma semilla produce el mismo tablero. */
importScripts('engine.js', 'killer-engine.js');

var GEN_E = { maxAttempts: 30, timeBudgetMs: 1e9 };   // espejo de app.js (topes fijos, deterministas por semilla)
var GEN_K = { timeBudgetMs: 1e9 };

self.onmessage = function (ev) {
  var m = ev.data || {};
  try {
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
