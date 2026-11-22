/* =====================================================================
   Transformaciones válidas de los tableros de práctica (tutorial-transform.js)
   ---------------------------------------------------------------------
   El Entrenamiento sortea lecciones y, para que no se memoricen, cambia el tablero sin cambiar la técnica:
     · Geometría: las 8 simetrías del cuadrado (giros y espejos). Valen en todas las variantes porque las
       reglas (filas, columnas, cajas, diagonales, salto de caballo, vecinos ortogonales, jaulas y regiones
       irregulares) se conservan al transformar también las jaulas y el mapa de regiones.
     · Dígitos: permutación 1–9. Solo en variantes donde los números son meras etiquetas (Clásico, Diagonal,
       Anti-Caballo, Jigsaw); NO en Killer (las sumas dependen del valor) ni en Sin Consecutivos (importa |a−b|).
   Si el texto de la consigna o de la pista nombra celdas, filas o números concretos, esa transformación se omite
   para no dejar el enunciado desalineado con el tablero.
   Funciona en el navegador (window.TutorialTransform) y en Node (require / import).
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TutorialTransform = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIGIT_MODES = { classic: 1, diagonal: 1, antiknight: 1, jigsaw: 1 };
  var RE_NUM = /(^|[^\dA-Za-zÁ-ú])[1-9]([^\dA-Za-zÁ-ú]|$)/;
  var RE_POS = /F\d\s*C\d|(fila|columna)s?\s+\d|superior|inferior|arriba|abajo|izquierda|derecha|esquina|centr|↘|↙|principal|secundaria/i;

  var canDigits = function (mode, text) { return !!DIGIT_MODES[mode] && !RE_NUM.test(text || ''); };
  var canGeom = function (text) { return !RE_POS.test(text || ''); };

  // t = 0..7: bit 0 = transponer, bit 1 = espejo vertical, bit 2 = espejo horizontal.
  function cellMap(t) {
    return function (i) {
      var r = Math.floor(i / 9), c = i % 9, x;
      if (t & 1) { x = r; r = c; c = x; }
      if (t & 2) r = 8 - r;
      if (t & 4) c = 8 - c;
      return r * 9 + c;
    };
  }
  function shuffle(arr, rnd) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
    return arr;
  }

  /** Devuelve una copia de la práctica transformada. opts: { geom: 0..7, perm: number[10] | null }. */
  function apply(pr, opts) {
    var f = cellMap(opts.geom | 0), perm = opts.perm || [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    var out = JSON.parse(JSON.stringify(pr));
    var str = function (s) { var a = new Array(81); for (var i = 0; i < 81; i++) { var ch = String(s).charAt(i); a[f(i)] = ch >= '1' && ch <= '9' ? String(perm[+ch]) : ch; } return a.join(''); };
    out.grid = str(pr.grid);
    if (pr.solution) out.solution = str(pr.solution);
    if (pr.cages) out.cages = pr.cages.map(function (c) { return { sum: c.sum, cells: c.cells.map(f) }; });
    if (pr.regions) { var rg = new Array(81); for (var i = 0; i < 81; i++) rg[f(i)] = pr.regions[i]; out.regions = rg; }
    var cd = function (x) { return [f(x[0]), perm[x[1]]]; };
    if (pr.goal) {
      if (pr.goal.place) out.goal.place = pr.goal.place.map(cd);
      if (pr.goal.elimSets) out.goal.elimSets = pr.goal.elimSets.map(function (s) { return s.map(cd); });
    }
    if (pr.hintCells) out.hintCells = pr.hintCells.map(f);
    return out;
  }

  /** Elige al azar una transformación permitida para esa práctica (si ninguna lo es, devuelve la original). */
  function randomize(pr, rnd) {
    rnd = rnd || Math.random;
    var mode = pr.mode || 'classic', text = ((pr.goal && pr.goal.text) || '') + ' ' + (pr.hint || '');
    var geom = canGeom(text) ? Math.floor(rnd() * 8) : 0;
    var perm = null;
    if (canDigits(mode, text)) perm = [0].concat(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rnd));
    return (geom || perm) ? apply(pr, { geom: geom, perm: perm }) : pr;
  }

  return { apply: apply, randomize: randomize, canDigits: canDigits, canGeom: canGeom };
}));
