/*!
 * killer-engine.js — Motor de Sudoku Killer para PWA móvil
 * -----------------------------------------------------------------------------
 * JavaScript puro, sin dependencias. Funciona de tres formas:
 *   - <script src="killer-engine.js"> ..... expone el global `KillerEngine`
 *   - Web Worker: importScripts('killer-engine.js')  -> `KillerEngine`
 *   - Node / bundlers: const K = require('./killer-engine.js')
 *
 * Convenciones (idénticas a engine.js):
 *   - Un tablero es un arreglo 9x9 de números: 0 = vacío, 1..9 = valor.
 *   - Filas/columnas se indexan de 0 a 8.
 *   - Dificultades: 'facil' | 'medio' | 'dificil' | 'experto' | 'maestro' | 'extremo'.
 *   - Una jaula es { id, sum, cells: [[r, c], ...], topLeft: [r, c] }.
 *     `topLeft` es la celda (primera en orden de lectura) que muestra la suma
 *     en su esquina superior izquierda.
 *
 * Reglas del Killer: las del Sudoku clásico + cada jaula no repite dígitos y
 * sus celdas suman exactamente `sum`.
 *
 * Algoritmo de generación:
 *   1) Solución completa aleatoria (backtracking MRV con tope de nodos; si falla,
 *      cuadrícula base con permutaciones válidas).
 *   2) Partición en jaulas ortogonalmente conectadas (2-4 celdas; 1 celda solo
 *      si no hay otra opción) sin dígitos repetidos dentro de cada jaula.
 *   3) Pistas iniciales según dificultad (fácil 12-15, medio 4-6, resto 0).
 *   4) Verificación de unicidad con backtracking + poda por suma de jaula. Si hay
 *      más de una solución, se localizan soluciones alternativas y se parten
 *      jaulas (siempre conservando la solución original) hasta que sea única.
 *      Dividir jaulas solo añade restricciones, así que el proceso termina.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KillerEngine = factory();
  }
}(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ===========================================================================
   * Constantes y tablas precalculadas
   * ========================================================================= */

  var ALL = 511; // 0b111111111: dígitos 1..9 (bit d-1 representa el dígito d)
  var DIFFICULTIES = ['facil', 'medio', 'dificil', 'experto', 'maestro', 'extremo'];
  var MAX_CAGE = 4;

  // givens: [mín, máx] de números iniciales. weights: probabilidad de jaulas de 2, 3 y 4 celdas.
  var CONFIG = {
    facil:   { givens: [12, 15], weights: [0.55, 0.35, 0.10] },
    medio:   { givens: [4, 6],   weights: [0.35, 0.45, 0.20] },
    dificil: { givens: [0, 0],   weights: [0.25, 0.45, 0.30] },
    experto: { givens: [0, 0],   weights: [0.10, 0.35, 0.55] },
    maestro: { givens: [0, 0],   weights: [0.05, 0.25, 0.70] },
    extremo: { givens: [0, 0],   weights: [0.00, 0.08, 0.92] }
  };

  var BLOCK_NAMES = [
    'superior izquierdo', 'superior central', 'superior derecho',
    'central izquierdo', 'central', 'central derecho',
    'inferior izquierdo', 'inferior central', 'inferior derecho'
  ];

  var ROW = new Array(81);
  var COL = new Array(81);
  var BOX = new Array(81);
  var POP = new Uint8Array(512);
  var UNITS = [];          // 0-8 filas, 9-17 columnas, 18-26 bloques
  var PEERS = new Array(81);
  var NEIGH = new Array(81); // vecinos ortogonales
  var FEAS = new Uint8Array(512 * 10 * 46);
  var GROUPS = [];         // grupos para la regla del 45

  (function precompute() {
    var i, j, k, u, r, c, b, s;
    for (i = 0; i < 81; i++) {
      ROW[i] = Math.floor(i / 9);
      COL[i] = i % 9;
      BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
    }
    for (i = 1; i < 512; i++) { POP[i] = POP[i >> 1] + (i & 1); }

    for (r = 0; r < 9; r++) {
      u = [];
      for (c = 0; c < 9; c++) { u.push(r * 9 + c); }
      UNITS.push(u);
    }
    for (c = 0; c < 9; c++) {
      u = [];
      for (r = 0; r < 9; r++) { u.push(r * 9 + c); }
      UNITS.push(u);
    }
    for (b = 0; b < 9; b++) {
      u = [];
      for (i = 0; i < 81; i++) { if (BOX[i] === b) { u.push(i); } }
      UNITS.push(u);
    }

    for (i = 0; i < 81; i++) {
      var seen = {};
      var list = [];
      var rel = [UNITS[ROW[i]], UNITS[9 + COL[i]], UNITS[18 + BOX[i]]];
      for (j = 0; j < 3; j++) {
        for (k = 0; k < 9; k++) {
          var p = rel[j][k];
          if (p !== i && !seen[p]) { seen[p] = true; list.push(p); }
        }
      }
      PEERS[i] = list;

      var nb = [];
      if (ROW[i] > 0) { nb.push(i - 9); }
      if (ROW[i] < 8) { nb.push(i + 9); }
      if (COL[i] > 0) { nb.push(i - 1); }
      if (COL[i] < 8) { nb.push(i + 1); }
      NEIGH[i] = nb;
    }

    // FEAS[(M*10 + k)*46 + s] = 1  <=>  existe un subconjunto de k dígitos distintos de la
    // máscara M cuya suma es s. Permite podar jaulas en O(1).
    for (s = 0; s < 512; s++) {
      var kk = POP[s];
      var sum = 0;
      for (var d = 0; d < 9; d++) { if (s & (1 << d)) { sum += d + 1; } }
      var comp = ALL & ~s;
      var sub = comp;
      for (;;) {
        FEAS[(((s | sub) * 10) + kk) * 46 + sum] = 1;
        if (sub === 0) { break; }
        sub = (sub - 1) & comp;
      }
    }

    // Grupos de la regla del 45: rangos contiguos de filas, de columnas y bloques.
    function pushGroup(kind, a, b2, cells, total) {
      var mask = new Uint8Array(81);
      for (var q = 0; q < cells.length; q++) { mask[cells[q]] = 1; }
      GROUPS.push({ kind: kind, a: a, b: b2, cells: cells, mask: mask, total: total });
    }
    var x, y, q2, cl;
    for (x = 0; x < 9; x++) {
      for (y = x; y < 9; y++) {
        if (y - x === 8) { continue; }
        cl = [];
        for (q2 = x; q2 <= y; q2++) { cl = cl.concat(UNITS[q2]); }
        pushGroup('row', x, y, cl, 45 * (y - x + 1));
        cl = [];
        for (q2 = x; q2 <= y; q2++) { cl = cl.concat(UNITS[9 + q2]); }
        pushGroup('col', x, y, cl, 45 * (y - x + 1));
      }
    }
    for (x = 0; x < 9; x++) { pushGroup('box', x, x, UNITS[18 + x].slice(), 45); }
    GROUPS.sort(function (g1, g2) { return g1.cells.length - g2.cells.length; });
  }());

  /* ===========================================================================
   * Utilidades generales
   * ========================================================================= */

  function digitOfMask(mask) { return 32 - Math.clz32(mask); } // solo máscaras de un bit

  function maskDigits(mask) {
    var out = [];
    for (var d = 1; d <= 9; d++) { if (mask & (1 << (d - 1))) { out.push(d); } }
    return out;
  }

  function hashSeed(seed) {
    if (typeof seed === 'number') { return seed | 0; }
    var s = String(seed);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h | 0;
  }

  // PRNG determinista (mulberry32) si hay semilla; si no, Math.random.
  function createRng(seed) {
    if (seed === undefined || seed === null) { return Math.random; }
    var s = hashSeed(seed) >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function checkCoords(row, col) {
    if (row !== (row | 0) || col !== (col | 0) || row < 0 || row > 8 || col < 0 || col > 8) {
      throw new RangeError('Fila y columna deben estar entre 0 y 8.');
    }
  }

  function flattenBoard(board) {
    if (!board || board.length !== 9) {
      throw new TypeError('El tablero debe ser un arreglo de 9 filas.');
    }
    var flat = new Array(81);
    for (var r = 0; r < 9; r++) {
      var row = board[r];
      if (!row || row.length !== 9) {
        throw new TypeError('La fila ' + (r + 1) + ' debe tener 9 columnas.');
      }
      for (var c = 0; c < 9; c++) {
        var v = row[c];
        if (v !== (v | 0) || v < 0 || v > 9) {
          throw new TypeError('Valor inválido en fila ' + (r + 1) + ', columna ' + (c + 1) + ': ' + v);
        }
        flat[r * 9 + c] = v;
      }
    }
    return flat;
  }

  function unflatten(flat) {
    var board = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) { row.push(flat[r * 9 + c]); }
      board.push(row);
    }
    return board;
  }

  function cloneBoard(board) { return unflatten(flattenBoard(board)); }

  function sameFlat(a, b) {
    for (var i = 0; i < 81; i++) { if (a[i] !== b[i]) { return false; } }
    return true;
  }

  function joinList(list) {
    if (list.length <= 1) { return list.join(''); }
    return list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];
  }

  function toCell(i) { return { row: ROW[i], col: COL[i] }; }

  /* ===========================================================================
   * Aritmética de jaulas (poda por suma)
   * ========================================================================= */

  /**
   * Dígitos que aún pueden ir en una celda de una jaula con `k` celdas vacías,
   * `left` por sumar y los dígitos de `avail` disponibles (no usados en la jaula).
   * Un dígito d vale si los k-1 restantes pueden completar `left - d` con dígitos distintos.
   */
  function allowedMask(avail, k, left) {
    if (k <= 0) { return 0; }
    var out = 0;
    for (var d = 1; d <= 9; d++) {
      var bit = 1 << (d - 1);
      if (!(avail & bit)) { continue; }
      var rest = left - d;
      if (rest < 0 || rest > 45) { continue; }
      if (FEAS[(((avail & ~bit) * 10) + (k - 1)) * 46 + rest]) { out |= bit; }
    }
    return out;
  }

  function feasible(avail, k, rest) {
    return k >= 0 && k <= 9 && rest >= 0 && rest <= 45 && FEAS[((avail * 10) + k) * 46 + rest] === 1;
  }

  /* ===========================================================================
   * Especificación de jaulas
   * ========================================================================= */

  // spec = { ng, cageOf[81], sum[], size[], cells[][] (índices planos) }
  function specFromLists(lists, solFlat) {
    var ng = lists.length;
    var spec = { ng: ng, cageOf: new Int8Array(81), sum: new Array(ng), size: new Array(ng), cells: lists };
    for (var g = 0; g < ng; g++) {
      var s = 0;
      for (var k = 0; k < lists[g].length; k++) {
        spec.cageOf[lists[g][k]] = g;
        s += solFlat[lists[g][k]];
      }
      spec.sum[g] = s;
      spec.size[g] = lists[g].length;
    }
    return spec;
  }

  var specCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /** Convierte el arreglo público `cages` en una especificación interna (con validación). */
  function getSpec(cages) {
    if (specCache && specCache.has(cages)) { return specCache.get(cages); }
    if (!Array.isArray(cages) || !cages.length) {
      throw new TypeError('`cages` debe ser un arreglo no vacío de jaulas.');
    }
    var ng = cages.length;
    var spec = { ng: ng, cageOf: new Int8Array(81).fill(-1), sum: new Array(ng), size: new Array(ng), cells: new Array(ng) };
    for (var g = 0; g < ng; g++) {
      var list = cages[g] && cages[g].cells;
      if (!Array.isArray(list) || !list.length) { throw new TypeError('La jaula ' + g + ' no tiene celdas.'); }
      var flat = [];
      for (var k = 0; k < list.length; k++) {
        checkCoords(list[k][0], list[k][1]);
        var i = list[k][0] * 9 + list[k][1];
        if (spec.cageOf[i] !== -1) { throw new TypeError('La celda (' + list[k][0] + ',' + list[k][1] + ') está en dos jaulas.'); }
        spec.cageOf[i] = g;
        flat.push(i);
      }
      spec.sum[g] = cages[g].sum | 0;
      spec.size[g] = flat.length;
      spec.cells[g] = flat;
    }
    for (var j = 0; j < 81; j++) {
      if (spec.cageOf[j] < 0) { throw new TypeError('La celda (' + ROW[j] + ',' + COL[j] + ') no pertenece a ninguna jaula.'); }
    }
    if (specCache) { specCache.set(cages, spec); }
    return spec;
  }

  /* ===========================================================================
   * Backtracking con MRV + poda por suma de jaula
   * ========================================================================= */

  /**
   * Busca hasta `limit` soluciones respetando filas, columnas, bloques y jaulas.
   * `givens` (opcional): arreglo plano de 81 con valores fijos (0 = libre).
   * `nodeLimit`: tope de nodos; si se supera, `aborted` es true.
   * @returns {{count:number, sols:number[][], aborted:boolean, nodes:number}}
   */
  function searchKiller(spec, givens, limit, nodeLimit, rng) {
    var cageOf = spec.cageOf, ng = spec.ng;
    var grid = new Uint8Array(81);
    var rm = new Uint16Array(9), cm = new Uint16Array(9), bm = new Uint16Array(9);
    var cUsed = new Uint16Array(ng), cRem = new Uint8Array(ng), cLeft = new Int16Array(ng), cAllow = new Uint16Array(ng);
    var sols = [], nodes = 0, aborted = false, g, i;

    for (g = 0; g < ng; g++) {
      cRem[g] = spec.size[g];
      cLeft[g] = spec.sum[g];
      cAllow[g] = allowedMask(ALL, cRem[g], cLeft[g]);
    }

    function put(idx, d) {
      var bit = 1 << (d - 1), gg = cageOf[idx];
      grid[idx] = d;
      rm[ROW[idx]] |= bit; cm[COL[idx]] |= bit; bm[BOX[idx]] |= bit;
      cUsed[gg] |= bit; cRem[gg]--; cLeft[gg] -= d;
      cAllow[gg] = allowedMask(ALL & ~cUsed[gg], cRem[gg], cLeft[gg]);
    }

    function take(idx, savedAllow) {
      var d = grid[idx], bit = 1 << (d - 1), gg = cageOf[idx];
      grid[idx] = 0;
      rm[ROW[idx]] &= ~bit; cm[COL[idx]] &= ~bit; bm[BOX[idx]] &= ~bit;
      cUsed[gg] &= ~bit; cRem[gg]++; cLeft[gg] += d;
      cAllow[gg] = savedAllow;
    }

    function cand(idx) {
      return ALL & ~(rm[ROW[idx]] | cm[COL[idx]] | bm[BOX[idx]]) & cAllow[cageOf[idx]];
    }

    if (givens) {
      for (i = 0; i < 81; i++) {
        if (givens[i]) {
          if (!(cand(i) & (1 << (givens[i] - 1)))) { return { count: 0, sols: sols, aborted: false, nodes: 0 }; }
          put(i, givens[i]);
        }
      }
    }

    function rec() {
      if (++nodes > nodeLimit) { aborted = true; return true; }
      var best = -1, bestMask = 0, bestN = 10, k, m, n;
      for (k = 0; k < 81; k++) {
        if (grid[k] === 0) {
          m = cand(k);
          n = POP[m];
          if (n < bestN) {
            best = k; bestMask = m; bestN = n;
            if (n <= 1) { break; }
          }
        }
      }
      if (best === -1) {
        sols.push(Array.prototype.slice.call(grid));
        return sols.length >= limit;
      }
      if (bestN === 0) { return false; }

      var digits = maskDigits(bestMask);
      if (rng) { shuffle(digits, rng); }
      var gg = cageOf[best], saved = cAllow[gg];
      for (var j = 0; j < digits.length; j++) {
        put(best, digits[j]);
        if (rec()) { return true; }
        take(best, saved);
      }
      return false;
    }

    rec();
    return { count: sols.length, sols: sols, aborted: aborted, nodes: nodes };
  }

  function solveFlat(spec, givens) {
    var res = searchKiller(spec, givens, 1, Infinity, null);
    return res.sols.length ? res.sols[0] : null;
  }

  /* ===========================================================================
   * Generación: solución completa
   * ========================================================================= */

  function fillRandomGrid(rng, nodeCap) {
    var grid = new Uint8Array(81);
    var rm = new Uint16Array(9), cm = new Uint16Array(9), bm = new Uint16Array(9);
    var nodes = 0;
    function rec() {
      if (++nodes > nodeCap) { return null; }
      var best = -1, bestMask = 0, bestN = 10, k, m, n;
      for (k = 0; k < 81; k++) {
        if (grid[k] === 0) {
          m = ALL & ~(rm[ROW[k]] | cm[COL[k]] | bm[BOX[k]]);
          n = POP[m];
          if (n < bestN) { best = k; bestMask = m; bestN = n; if (n <= 1) { break; } }
        }
      }
      if (best === -1) { return true; }
      if (bestN === 0) { return false; }
      var digits = shuffle(maskDigits(bestMask), rng);
      var r = ROW[best], c = COL[best], b = BOX[best];
      for (var j = 0; j < digits.length; j++) {
        var bit = 1 << (digits[j] - 1);
        grid[best] = digits[j]; rm[r] |= bit; cm[c] |= bit; bm[b] |= bit;
        var res = rec();
        if (res !== false) { return res; }
        grid[best] = 0; rm[r] &= ~bit; cm[c] &= ~bit; bm[b] &= ~bit;
      }
      return false;
    }
    return rec() === true ? Array.prototype.slice.call(grid) : null;
  }

  // Respaldo: cuadrícula base válida con permutaciones que preservan la validez.
  function patternGrid(rng) {
    var digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
    var bands = shuffle([0, 1, 2], rng), stacks = shuffle([0, 1, 2], rng);
    var rows = [], cols = [], i, j;
    for (i = 0; i < 3; i++) {
      var inB = shuffle([0, 1, 2], rng), inS = shuffle([0, 1, 2], rng);
      for (j = 0; j < 3; j++) { rows.push(bands[i] * 3 + inB[j]); cols.push(stacks[i] * 3 + inS[j]); }
    }
    var out = new Array(81);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        out[r * 9 + c] = digits[(3 * (rows[r] % 3) + Math.floor(rows[r] / 3) + cols[c]) % 9];
      }
    }
    return out;
  }

  function generateSolvedFlat(rng) {
    for (var t = 0; t < 4; t++) {
      var g = fillRandomGrid(rng, 4000);
      if (g) { return g; }
    }
    return patternGrid(rng);
  }

  /* ===========================================================================
   * Generación: jaulas
   * ========================================================================= */

  function pickSize(weights, rng) {
    var r = rng();
    if (r < weights[0]) { return 2; }
    if (r < weights[0] + weights[1]) { return 3; }
    return 4;
  }

  /** Particiona las 81 celdas en jaulas conectadas sin dígitos repetidos. @returns {number[][]} */
  function buildCages(sol, cfg, rng) {
    var owner = new Int16Array(81).fill(-1);
    var lists = [], assigned = 0, i, k;

    function freeN(idx) {
      var n = 0, nb = NEIGH[idx];
      for (var q = 0; q < nb.length; q++) { if (owner[nb[q]] < 0) { n++; } }
      return n;
    }

    while (assigned < 81) {
      // Arranca por la celda libre más "acorralada" para no dejar celdas huérfanas.
      var start = -1, bestN = 99, ties = 0, n;
      for (i = 0; i < 81; i++) {
        if (owner[i] >= 0) { continue; }
        n = freeN(i);
        if (n < bestN) { bestN = n; start = i; ties = 1; }
        else if (n === bestN) { ties++; if (rng() * ties < 1) { start = i; } }
      }
      var target = pickSize(cfg.weights, rng);
      var id = lists.length;
      var cage = [start];
      var used = 1 << (sol[start] - 1);
      owner[start] = id; assigned++;

      while (cage.length < target) {
        var cands = [], c, nb;
        for (c = 0; c < cage.length; c++) {
          nb = NEIGH[cage[c]];
          for (k = 0; k < nb.length; k++) {
            if (owner[nb[k]] < 0 && !(used & (1 << (sol[nb[k]] - 1))) && cands.indexOf(nb[k]) < 0) { cands.push(nb[k]); }
          }
        }
        if (!cands.length) { break; }
        var pick = -1, pn = 99, pt = 0;
        for (k = 0; k < cands.length; k++) {
          n = freeN(cands[k]);
          if (n < pn) { pn = n; pick = cands[k]; pt = 1; }
          else if (n === pn) { pt++; if (rng() * pt < 1) { pick = cands[k]; } }
        }
        cage.push(pick);
        owner[pick] = id; assigned++;
        used |= 1 << (sol[pick] - 1);
      }
      lists.push(cage);
    }

    // Absorbe jaulas de 1 celda en una vecina (si no rompe la regla de dígitos distintos).
    for (var g = 0; g < lists.length; g++) {
      if (lists[g].length !== 1) { continue; }
      var x = lists[g][0], bestG = -1, bestSize = 99, tt = 0, nbs = NEIGH[x];
      for (k = 0; k < nbs.length; k++) {
        var og = owner[nbs[k]];
        if (og === g || lists[og].length >= MAX_CAGE) { continue; }
        var clash = false;
        for (var q = 0; q < lists[og].length; q++) { if (sol[lists[og][q]] === sol[x]) { clash = true; break; } }
        if (clash) { continue; }
        if (lists[og].length < bestSize) { bestSize = lists[og].length; bestG = og; tt = 1; }
        else if (lists[og].length === bestSize) { tt++; if (rng() * tt < 1) { bestG = og; } }
      }
      if (bestG >= 0) {
        lists[bestG].push(x);
        owner[x] = bestG;
        lists[g] = [];
      }
    }
    return lists.filter(function (l) { return l.length > 0; });
  }

  /** Reparte `count` pistas iniciales dispersas, evitando celdas en jaulas de 1 celda. @returns {number[]} (valores, 0 = libre) */
  function pickGivens(count, sol, lists, rng) {
    var out = new Array(81).fill(0);
    if (count <= 0) { return out; }
    var sizeOf = new Array(81).fill(1), g, q, t, i;
    for (g = 0; g < lists.length; g++) { for (q = 0; q < lists[g].length; q++) { sizeOf[lists[g][q]] = lists[g].length; } }
    var rowC = new Array(9).fill(0), colC = new Array(9).fill(0), boxC = new Array(9).fill(0);
    for (t = 0; t < count; t++) {
      var best = -1, bestScore = Infinity;
      for (i = 0; i < 81; i++) {
        if (out[i]) { continue; }
        var score = 2 * boxC[BOX[i]] + rowC[ROW[i]] + colC[COL[i]] + (sizeOf[i] === 1 ? 6 : 0) - 0.5 * sizeOf[i] + rng() * 0.9;
        if (score < bestScore) { bestScore = score; best = i; }
      }
      out[best] = sol[best];
      rowC[ROW[best]]++; colC[COL[best]]++; boxC[BOX[best]]++;
    }
    return out;
  }

  /* ===========================================================================
   * Unicidad: se parten jaulas hasta eliminar toda solución alternativa
   * ========================================================================= */

  function isAdjacent(a, b) {
    return Math.abs(ROW[a] - ROW[b]) + Math.abs(COL[a] - COL[b]) === 1;
  }

  function isConnected(cells) {
    if (cells.length <= 1) { return true; }
    var seen = [cells[0]], head = 0, k;
    while (head < seen.length) {
      var cur = seen[head++];
      for (k = 0; k < cells.length; k++) {
        if (seen.indexOf(cells[k]) < 0 && isAdjacent(cur, cells[k])) { seen.push(cells[k]); }
      }
    }
    return seen.length === cells.length;
  }

  // ¿B sigue cumpliendo la suma de todas las jaulas actuales?
  function satisfiesSums(lists, sol, B) {
    for (var g = 0; g < lists.length; g++) {
      var a = 0, b = 0;
      for (var k = 0; k < lists[g].length; k++) { a += sol[lists[g][k]]; b += B[lists[g][k]]; }
      if (a !== b) { return false; }
    }
    return true;
  }

  /**
   * Parte una jaula en dos trozos conexos de modo que B (solución alternativa) deje de ser válida.
   * La solución original siempre sigue siendo válida (subjaulas con las sumas reales).
   */
  function splitToKill(lists, sol, B, rng) {
    var best = null, bestScore = -Infinity, g, cells, n, mask, k;
    for (g = 0; g < lists.length; g++) {
      cells = lists[g];
      n = cells.length;
      if (n < 2) { continue; }
      var differs = false;
      for (k = 0; k < n; k++) { if (B[cells[k]] !== sol[cells[k]]) { differs = true; break; } }
      if (!differs) { continue; }
      for (mask = 1; mask < (1 << n) - 1; mask++) {
        if (!(mask & 1)) { continue; } // evita duplicar la partición con su complemento
        var S = [], R = [], sa = 0, sb = 0;
        for (k = 0; k < n; k++) {
          if (mask & (1 << k)) { S.push(cells[k]); sa += sol[cells[k]]; sb += B[cells[k]]; } else { R.push(cells[k]); }
        }
        if (sa === sb || !isConnected(S) || !isConnected(R)) { continue; }
        // Preferimos conservar jaulas de >= 2 celdas y partir jaulas grandes.
        var score = (Math.min(S.length, R.length) >= 2 ? 10 : 0) + n + rng();
        if (score > bestScore) { bestScore = score; best = { g: g, S: S, R: R }; }
      }
    }
    if (!best) { return false; }
    lists[best.g] = best.S;
    lists.push(best.R);
    return true;
  }

  // Respaldo cuando no hay solución alternativa a mano (tope de nodos): parte una jaula al azar.
  function splitRandom(lists, rng) {
    var cand = [], g, k;
    for (g = 0; g < lists.length; g++) { if (lists[g].length >= 2) { cand.push(g); } }
    if (!cand.length) { return false; }
    cand.sort(function (a, b) { return lists[b].length - lists[a].length; });
    var top = cand.filter(function (c) { return lists[c].length === lists[cand[0]].length; });
    g = top[Math.floor(rng() * top.length)];
    var cells = lists[g];
    for (k = 0; k < cells.length; k++) {
      var rest = cells.filter(function (c) { return c !== cells[k]; });
      if (isConnected(rest)) {
        lists[g] = rest;
        lists.push([cells[k]]);
        return true;
      }
    }
    return false;
  }

  /**
   * Garantiza solución única. Modifica `lists` (parte jaulas) y devuelve { ok, splits, iterations }.
   */
  function makeUnique(lists, sol, givens, rng, opts) {
    var splits = 0, it;
    for (it = 0; it < opts.maxIter; it++) {
      if (Date.now() > opts.deadline) { return { ok: false, splits: splits, iterations: it }; }
      var spec = specFromLists(lists, sol);
      var res = searchKiller(spec, givens, 6, opts.nodeLimit, null);

      if (!res.aborted && res.count <= 1) {
        // count === 1: única (la original). count === 0 indicaría un error interno.
        return { ok: res.count === 1, splits: splits, iterations: it + 1 };
      }

      var progressed = false, k;
      for (k = 0; k < res.sols.length; k++) {
        var B = res.sols[k];
        if (sameFlat(B, sol) || !satisfiesSums(lists, sol, B)) { continue; }
        if (splitToKill(lists, sol, B, rng)) { splits++; progressed = true; }
      }
      if (!progressed) {
        if (splitRandom(lists, rng)) { splits++; } else { return { ok: false, splits: splits, iterations: it + 1 }; }
      }
    }
    return { ok: false, splits: splits, iterations: it };
  }

  /* ===========================================================================
   * API de generación
   * ========================================================================= */

  function assemble(lists, sol, givens, difficulty, meta) {
    var sorted = lists.map(function (l) { return l.slice().sort(function (a, b) { return a - b; }); });
    sorted.sort(function (a, b) { return a[0] - b[0]; });
    var cages = sorted.map(function (cells, id) {
      var sum = 0;
      for (var k = 0; k < cells.length; k++) { sum += sol[cells[k]]; }
      return {
        id: id,
        sum: sum,
        cells: cells.map(function (i) { return [ROW[i], COL[i]]; }),
        topLeft: [ROW[cells[0]], COL[cells[0]]]
      };
    });
    var clues = 0;
    for (var i = 0; i < 81; i++) { if (givens[i]) { clues++; } }
    return {
      board: unflatten(givens),
      solution: unflatten(sol),
      cages: cages,
      difficulty: difficulty,
      clues: clues,
      stats: {
        cages: cages.length,
        avgCageSize: Math.round((81 / cages.length) * 100) / 100,
        singleCells: cages.filter(function (c) { return c.cells.length === 1; }).length,
        attempts: meta.attempts,
        splits: meta.splits,
        ms: meta.ms
      }
    };
  }

  /**
   * Genera un Sudoku Killer con solución única.
   * @param {string} difficulty 'facil' | 'medio' | 'dificil' | 'experto'
   * @param {{seed?:number|string, maxAttempts?:number, timeBudgetMs?:number, nodeLimit?:number}} [options]
   * @returns {{board:number[][], solution:number[][],
   *            cages:{id:number, sum:number, cells:number[][], topLeft:number[]}[],
   *            difficulty:string, clues:number, stats:Object}}
   */
  function generateKillerPuzzle(difficulty, options) {
    var cfg = CONFIG[difficulty];
    if (!cfg) {
      throw new RangeError("Dificultad inválida: '" + difficulty + "'. Use: " + DIFFICULTIES.join(', ') + '.');
    }
    options = options || {};
    var rng = createRng(options.seed);
    var maxAttempts = options.maxAttempts > 0 ? options.maxAttempts : 8;
    var budget = options.timeBudgetMs > 0 ? options.timeBudgetMs : 1200;
    var nodeLimit = options.nodeLimit > 0 ? options.nodeLimit : 40000;
    var start = Date.now();
    var attempts = 0, totalSplits = 0;
    var sol = null, lists = null, givens = null, ok = false, r;

    while (attempts < maxAttempts && (attempts === 0 || Date.now() - start < budget)) {
      attempts++;
      sol = generateSolvedFlat(rng);
      lists = buildCages(sol, cfg, rng);
      var count = cfg.givens[0] + Math.floor(rng() * (cfg.givens[1] - cfg.givens[0] + 1));
      givens = pickGivens(count, sol, lists, rng);
      r = makeUnique(lists, sol, givens, rng, { maxIter: 60, nodeLimit: nodeLimit, deadline: start + budget });
      totalSplits += r.splits;
      if (r.ok) { ok = true; break; }
    }

    if (!ok) {
      // Último recurso (no ocurre en la práctica): sigue partiendo jaulas, sin límite de tiempo,
      // hasta lograr unicidad. Termina siempre porque dividir solo añade restricciones.
      r = makeUnique(lists, sol, givens, rng, { maxIter: 200, nodeLimit: 2000000, deadline: Infinity });
      totalSplits += r.splits;
      if (!r.ok) {
        lists = [];
        for (var i = 0; i < 81; i++) { lists.push([i]); }
      }
    }
    return assemble(lists, sol, givens, difficulty, { attempts: attempts, splits: totalSplits, ms: Date.now() - start });
  }

  /** Igual que generateKillerPuzzle pero cede el hilo antes de calcular (deja pintar el "Generando…"). */
  function generateKillerPuzzleAsync(difficulty, options) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try { resolve(generateKillerPuzzle(difficulty, options)); } catch (e) { reject(e); }
      }, 0);
    });
  }

  /* ===========================================================================
   * Resolución y conteo sobre datos públicos
   * ========================================================================= */

  function givensFromBoard(board) { return board ? flattenBoard(board) : null; }

  /** Devuelve la solución (tablero 9x9) o null. `board` (opcional) aporta pistas iniciales. */
  function solveKiller(cages, board) {
    var sol = solveFlat(getSpec(cages), givensFromBoard(board));
    return sol ? unflatten(sol) : null;
  }

  /** Cuenta soluciones (se detiene en `limit`, por defecto 2). */
  function countKillerSolutions(cages, board, limit) {
    return searchKiller(getSpec(cages), givensFromBoard(board), limit > 0 ? limit : 2, Infinity, null).count;
  }

  function hasUniqueKillerSolution(cages, board) {
    return countKillerSolutions(cages, board, 2) === 1;
  }

  /* ===========================================================================
   * Validación
   * ========================================================================= */

  // Devuelve un arreglo de 81 con null o la lista de tipos de conflicto de cada celda.
  function conflictsFlat(flat, spec) {
    var out = new Array(81).fill(null), i, k, g;
    function add(idx, t) {
      var a = out[idx] || (out[idx] = []);
      if (a.indexOf(t) < 0) { a.push(t); }
    }
    for (i = 0; i < 81; i++) {
      var v = flat[i];
      if (!v) { continue; }
      var peers = PEERS[i];
      for (k = 0; k < peers.length; k++) {
        var p = peers[k];
        if (flat[p] === v) {
          if (ROW[p] === ROW[i]) { add(i, 'row'); }
          if (COL[p] === COL[i]) { add(i, 'col'); }
          if (BOX[p] === BOX[i]) { add(i, 'box'); }
        }
      }
    }
    for (g = 0; g < spec.ng; g++) {
      var cells = spec.cells[g], used = 0, dup = false, filled = 0, sum = 0, a, b;
      for (a = 0; a < cells.length; a++) {
        var val = flat[cells[a]];
        if (!val) { continue; }
        var bit = 1 << (val - 1);
        if (used & bit) { dup = true; }
        used |= bit; filled++; sum += val;
      }
      if (dup) {
        for (a = 0; a < cells.length; a++) {
          if (!flat[cells[a]]) { continue; }
          for (b = 0; b < cells.length; b++) {
            if (a !== b && flat[cells[b]] === flat[cells[a]]) { add(cells[a], 'cage'); }
          }
        }
      } else if (!feasible(ALL & ~used, cells.length - filled, spec.sum[g] - sum)) {
        // Suma excedida (parcial > objetivo), incorrecta (jaula completa) o imposible de completar.
        for (a = 0; a < cells.length; a++) { if (flat[cells[a]]) { add(cells[a], 'sum'); } }
      }
    }
    return out;
  }

  /**
   * Todas las celdas con valor que están en conflicto. Cada una trae `types`:
   *   'row' | 'col' | 'box'  número repetido en fila / columna / bloque
   *   'cage'                 número repetido dentro de su jaula
   *   'sum'                  suma de la jaula excedida, incorrecta (jaula completa) o imposible de completar
   * @returns {{row:number, col:number, value:number, types:string[]}[]}
   */
  function getKillerConflicts(board, cages) {
    var flat = flattenBoard(board);
    var cf = conflictsFlat(flat, getSpec(cages));
    var out = [];
    for (var i = 0; i < 81; i++) {
      if (cf[i]) { out.push({ row: ROW[i], col: COL[i], value: flat[i], types: cf[i] }); }
    }
    return out;
  }

  /** Conflictos que provoca colocar `value` en (row, col) (sin modificar el tablero recibido). */
  function getKillerCellConflicts(board, cages, row, col, value) {
    checkCoords(row, col);
    var flat = flattenBoard(board);
    flat[row * 9 + col] = value === undefined ? flat[row * 9 + col] : value;
    var cf = conflictsFlat(flat, getSpec(cages));
    return cf[row * 9 + col] ? cf[row * 9 + col].slice() : [];
  }

  /** true si no quedan celdas vacías. */
  function isComplete(board) {
    var flat = flattenBoard(board);
    for (var i = 0; i < 81; i++) { if (flat[i] === 0) { return false; } }
    return true;
  }

  /**
   * true si el tablero está completo y correcto. Con `solution` compara contra ella;
   * sin ella verifica todas las reglas (filas, columnas, bloques, jaulas y sumas).
   */
  function isKillerSolved(board, cages, solution) {
    var flat = flattenBoard(board), i;
    for (i = 0; i < 81; i++) { if (flat[i] === 0) { return false; } }
    if (solution) { return sameFlat(flat, flattenBoard(solution)); }
    var cf = conflictsFlat(flat, getSpec(cages));
    for (i = 0; i < 81; i++) { if (cf[i]) { return false; } }
    return true;
  }

  /** Celdas llenas cuyo valor difiere de la solución. @returns {{row,col,value,expected}[]} */
  function findWrongCells(board, solution) {
    var flat = flattenBoard(board), sol = flattenBoard(solution), out = [];
    for (var i = 0; i < 81; i++) {
      if (flat[i] !== 0 && flat[i] !== sol[i]) { out.push({ row: ROW[i], col: COL[i], value: flat[i], expected: sol[i] }); }
    }
    return out;
  }

  /* ===========================================================================
   * Candidatos conscientes de jaula
   * ========================================================================= */

  // cand: candidatos con filas/columnas/bloques + sumas de jaula. std: solo filas/columnas/bloques.
  function candidatesFlat(flat, spec) {
    var rowU = new Uint16Array(9), colU = new Uint16Array(9), boxU = new Uint16Array(9);
    var ng = spec.ng, cUsed = new Uint16Array(ng), cRem = new Uint8Array(ng), cLeft = new Int16Array(ng), cAllow = new Uint16Array(ng);
    var cand = new Uint16Array(81), std = new Uint16Array(81), i, g;
    for (g = 0; g < ng; g++) { cRem[g] = spec.size[g]; cLeft[g] = spec.sum[g]; }
    for (i = 0; i < 81; i++) {
      var v = flat[i];
      if (!v) { continue; }
      var bit = 1 << (v - 1), gg = spec.cageOf[i];
      rowU[ROW[i]] |= bit; colU[COL[i]] |= bit; boxU[BOX[i]] |= bit;
      cUsed[gg] |= bit; cRem[gg]--; cLeft[gg] -= v;
    }
    for (g = 0; g < ng; g++) { cAllow[g] = allowedMask(ALL & ~cUsed[g], cRem[g], cLeft[g]); }
    for (i = 0; i < 81; i++) {
      if (flat[i]) { continue; }
      std[i] = ALL & ~(rowU[ROW[i]] | colU[COL[i]] | boxU[BOX[i]]);
      cand[i] = std[i] & cAllow[spec.cageOf[i]];
    }
    return { cand: cand, std: std };
  }

  /** Candidatos por celda considerando también las sumas de jaula (para "notas automáticas"). @returns {number[][][]} */
  function computeKillerCandidates(board, cages) {
    var flat = flattenBoard(board);
    var cd = candidatesFlat(flat, getSpec(cages));
    var out = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) { row.push(flat[r * 9 + c] ? [] : maskDigits(cd.cand[r * 9 + c])); }
      out.push(row);
    }
    return out;
  }

  /* ===========================================================================
   * Pistas inteligentes
   * ========================================================================= */

  function unitLabel(u) {
    if (u < 9) { return 'la fila ' + (u + 1); }
    if (u < 18) { return 'la columna ' + (u - 8); }
    return 'el bloque ' + BLOCK_NAMES[u - 18];
  }

  function unitDemonstrative(u) {
    if (u < 9) { return 'esta fila'; }
    if (u < 18) { return 'esta columna'; }
    return 'este bloque';
  }

  function groupLabel(gr) {
    if (gr.kind === 'box') { return 'el bloque ' + BLOCK_NAMES[gr.a]; }
    var w = gr.kind === 'row' ? 'fila' : 'columna';
    if (gr.a === gr.b) { return 'la ' + w + ' ' + (gr.a + 1); }
    return 'las ' + w + 's ' + (gr.a + 1) + ' a ' + (gr.b + 1);
  }

  function noteList(notes, r, c) {
    if (!notes || !notes[r]) { return []; }
    var cell = notes[r][c];
    if (!cell) { return []; }
    if (typeof Set !== 'undefined' && cell instanceof Set) { return Array.from(cell); }
    return Array.isArray(cell) ? cell : [];
  }

  // Desempate a favor de celdas donde el usuario ya tiene notas coherentes con el valor.
  function noteBonus(notes, idx, value) {
    var list = noteList(notes, ROW[idx], COL[idx]);
    if (!list.length) { return 0; }
    if (list.indexOf(value) === -1) { return -2; }
    return Math.max(0, 5 - list.length);
  }

  function cellsToObjects(list) { return list.map(toCell); }

  function makeHint(idx, value, reason, type, technique, related) {
    return {
      row: ROW[idx],
      col: COL[idx],
      value: value,
      reason: reason,
      type: type,           // 'error' | 'single' | 'advanced' | 'solution'
      technique: technique, // 'singleCell' | 'cageLastCell' | 'rule45' | 'nakedSingle' | 'hiddenSingle' | null
      related: related || []
    };
  }

  function buildErrorHint(flat, sol, spec, cf, idx) {
    var wrong = flat[idx], correct = sol[idx], types = cf[idx] || [], g = spec.cageOf[idx];
    var where = [], related = [], k, p;
    if (types.indexOf('row') >= 0) { where.push('su fila'); }
    if (types.indexOf('col') >= 0) { where.push('su columna'); }
    if (types.indexOf('box') >= 0) { where.push('su bloque'); }
    if (types.indexOf('cage') >= 0) { where.push('su jaula'); }
    var reason;
    if (where.length) {
      reason = 'Hay un error: el ' + wrong + ' está repetido en ' + joinList(where) + '. En esta celda debe ir el ' + correct + '.';
    } else if (types.indexOf('sum') >= 0) {
      reason = 'Hay un error: con el ' + wrong + ' la jaula de suma ' + spec.sum[g] + ' ya no puede cuadrar. En esta celda debe ir el ' + correct + '.';
    } else {
      reason = 'Hay un error: el ' + wrong + ' no es correcto aquí (aunque no choque con otro número). En esta celda debe ir el ' + correct + '.';
    }
    for (k = 0; k < PEERS[idx].length; k++) {
      p = PEERS[idx][k];
      if (flat[p] === wrong) { related.push(toCell(p)); }
    }
    for (k = 0; k < spec.cells[g].length; k++) {
      p = spec.cells[g][k];
      if (p !== idx && flat[p] === wrong && related.every(function (o) { return o.row !== ROW[p] || o.col !== COL[p]; })) { related.push(toCell(p)); }
    }
    return makeHint(idx, correct, reason, 'error', null, related);
  }

  // Jaula con una sola celda vacía (o jaula de una celda): el valor sale de la suma.
  function hintCageLast(flat, spec, sol, notes) {
    var best = null, bestScore = -Infinity;
    for (var g = 0; g < spec.ng; g++) {
      var empties = [], vals = [], fsum = 0, k;
      for (k = 0; k < spec.cells[g].length; k++) {
        var c = spec.cells[g][k];
        if (flat[c] === 0) { empties.push(c); } else { vals.push(flat[c]); fsum += flat[c]; }
      }
      if (empties.length !== 1) { continue; }
      var idx = empties[0], val = spec.sum[g] - fsum;
      if (val < 1 || val > 9 || val !== sol[idx]) { continue; }
      var score = noteBonus(notes, idx, val) + (spec.size[g] > 1 ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        var reason, tech;
        if (spec.size[g] === 1) {
          tech = 'singleCell';
          reason = 'Jaula de una sola celda: su valor es la suma indicada, ' + val + '.';
        } else {
          tech = 'cageLastCell';
          reason = 'En la jaula de suma ' + spec.sum[g] + ' solo queda una celda vacía: ' +
            spec.sum[g] + ' − ' + vals.join(' − ') + ' = ' + val + '.';
        }
        best = makeHint(idx, val, reason, 'single', tech, cellsToObjects(spec.cells[g]));
      }
    }
    return best;
  }

  // Regla del 45: cada fila/columna/bloque suma 45. Se buscan "innies" y "outies" de un solo hueco.
  function hintRule45(flat, spec, sol, notes) {
    var best = null, bestScore = -Infinity;
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var gr = GROUPS[gi], inG = gr.mask;
      var inside = [], touching = [], insideSum = 0, touchSum = 0, g, k, c;
      for (g = 0; g < spec.ng; g++) {
        var cnt = 0, cl = spec.cells[g];
        for (k = 0; k < cl.length; k++) { if (inG[cl[k]]) { cnt++; } }
        if (!cnt) { continue; }
        touching.push(g); touchSum += spec.sum[g];
        if (cnt === cl.length) { inside.push(g); insideSum += spec.sum[g]; }
      }
      var many = gr.cells.length > 9 ? 'suman' : 'suma';
      var label = groupLabel(gr);
      var unfilled, filledSum, filledCount, val, idx, reason, rel, score;

      // Innie: celdas del grupo que no están dentro de una jaula completamente contenida en él.
      if (inside.length) {
        var covered = {};
        inside.forEach(function (gg) { spec.cells[gg].forEach(function (cc) { covered[cc] = true; }); });
        unfilled = []; filledSum = 0; filledCount = 0;
        for (k = 0; k < gr.cells.length; k++) {
          c = gr.cells[k];
          if (covered[c]) { continue; }
          if (flat[c] === 0) { unfilled.push(c); } else { filledSum += flat[c]; filledCount++; }
        }
        if (unfilled.length === 1) {
          idx = unfilled[0]; val = gr.total - insideSum - filledSum;
          if (val >= 1 && val <= 9 && val === sol[idx]) {
            score = -2 * gr.cells.length - filledCount + noteBonus(notes, idx, val);
            if (score > bestScore) {
              bestScore = score;
              reason = 'Regla del 45 en ' + label + ': ' + many + ' ' + gr.total + '. Las jaulas contenidas por completo ahí suman ' + insideSum +
                (filledCount ? ' y los números ya colocados fuera de ellas suman ' + filledSum : '') +
                ', así que esta celda vale ' + gr.total + ' − ' + (insideSum + filledSum) + ' = ' + val + '.';
              rel = [];
              inside.forEach(function (gg) { rel = rel.concat(cellsToObjects(spec.cells[gg])); });
              best = makeHint(idx, val, reason, 'advanced', 'rule45', rel);
            }
          }
        }
      }

      // Outie: celdas de las jaulas que tocan el grupo pero quedan fuera de él.
      unfilled = []; filledSum = 0; filledCount = 0;
      for (g = 0; g < touching.length; g++) {
        var cells = spec.cells[touching[g]];
        for (k = 0; k < cells.length; k++) {
          c = cells[k];
          if (inG[c]) { continue; }
          if (flat[c] === 0) { unfilled.push(c); } else { filledSum += flat[c]; filledCount++; }
        }
      }
      if (unfilled.length === 1 && touchSum > gr.total - 1) {
        idx = unfilled[0]; val = touchSum - gr.total - filledSum;
        if (val >= 1 && val <= 9 && val === sol[idx]) {
          score = -2 * gr.cells.length - filledCount + noteBonus(notes, idx, val) - 0.5;
          if (score > bestScore) {
            bestScore = score;
            reason = 'Regla del 45 en ' + label + ': ' + many + ' ' + gr.total + ', y las jaulas que tocan ese sector suman ' + touchSum +
              '. La única celda de esas jaulas que sobresale vale ' + touchSum + ' − ' + gr.total +
              (filledCount ? ' − ' + filledSum + ' (ya colocados)' : '') + ' = ' + val + '.';
            rel = [];
            touching.forEach(function (gg) { rel = rel.concat(cellsToObjects(spec.cells[gg])); });
            best = makeHint(idx, val, reason, 'advanced', 'rule45', rel);
          }
        }
      }
    }
    return best;
  }

  // Naked Single: celda con un único candidato (filas, columnas, bloques y suma de jaula).
  function hintNaked(flat, spec, cd, sol, notes) {
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < 81; i++) {
      if (flat[i] !== 0 || POP[cd.cand[i]] !== 1) { continue; }
      var val = digitOfMask(cd.cand[i]);
      if (val !== sol[i]) { continue; }
      var visible = 0, peers = PEERS[i], k;
      for (k = 0; k < peers.length; k++) { if (flat[peers[k]] !== 0) { visible++; } }
      var viaStd = POP[cd.std[i]] === 1;
      var score = visible + (viaStd ? 20 : 0) + noteBonus(notes, i, val);
      if (score > bestScore) {
        bestScore = score;
        var g = spec.cageOf[i];
        best = makeHint(i, val,
          viaStd
            ? 'Esta celda solo admite el ' + val + ': los demás números ya aparecen en su fila, columna o bloque.'
            : 'Esta celda solo admite el ' + val + ': combinando lo que ya aparece en su fila, columna o bloque con lo que permite la suma de su jaula (' + spec.sum[g] + '), es el único candidato.',
          'single', 'nakedSingle', viaStd ? [] : cellsToObjects(spec.cells[g]));
      }
    }
    return best;
  }

  // Hidden Single: dígito que solo cabe en una celda de una fila/columna/bloque.
  function hintHidden(flat, cd, sol, notes) {
    var best = null, bestScore = -Infinity;
    for (var u = 0; u < 27; u++) {
      var cells = UNITS[u], placed = 0, k, filledCount = 0;
      for (k = 0; k < 9; k++) { if (flat[cells[k]]) { placed |= 1 << (flat[cells[k]] - 1); filledCount++; } }
      for (var d = 1; d <= 9; d++) {
        var bit = 1 << (d - 1);
        if (placed & bit) { continue; }
        var where = -1, n = 0;
        for (k = 0; k < 9; k++) { if (cd.cand[cells[k]] & bit) { n++; where = cells[k]; } }
        if (n !== 1 || d !== sol[where]) { continue; }
        var score = filledCount + (u >= 18 ? 2 : (u < 9 ? 1 : 0)) + noteBonus(notes, where, d);
        if (score > bestScore) {
          bestScore = score;
          best = makeHint(where, d,
            'Único lugar posible para el ' + d + ' en ' + unitDemonstrative(u) + ' (teniendo en cuenta también las sumas de las jaulas).',
            'single', 'hiddenSingle', cellsToObjects(cells));
        }
      }
    }
    return best;
  }

  /**
   * Pista inteligente para Killer.
   * 1) Si hay números que no coinciden con la solución, señala el error (prioriza los que
   *    generan un conflicto visible: fila, columna, bloque, jaula o suma) y da el valor correcto.
   * 2) Si no hay errores, busca una deducción: jaula con una sola celda vacía (o de una celda),
   *    regla del 45 en filas/columnas/bloques (y rangos de ellos), Naked Single o Hidden Single
   *    (con candidatos que ya respetan las sumas de jaula).
   * 3) Si nada de eso aplica, indica la celda con menos candidatos usando la solución.
   *
   * @param {number[][]} board    Estado actual (0 = vacío).
   * @param {number[][]|null} solution Solución completa (si es null se calcula).
   * @param {Object[]} cages      Jaulas devueltas por generateKillerPuzzle.
   * @param {Array<Array<number[]|Set<number>>>} [notes] Notas 9x9 del usuario (solo desempates).
   * @returns {{row:number, col:number, value:number, reason:string, type:string,
   *            technique:string|null, related:{row:number,col:number}[]}|null}
   *          null si el tablero ya está completo y correcto.
   */
  function getKillerHint(board, solution, cages, notes) {
    var flat = flattenBoard(board), spec = getSpec(cages), i;
    var sol = solution ? flattenBoard(solution) : solveFlat(spec, flat);
    if (!sol) { throw new Error('No se pudo determinar la solución del tablero.'); }

    // 1) Errores respecto a la solución.
    var cf = conflictsFlat(flat, spec), firstErr = -1, firstConf = -1;
    for (i = 0; i < 81; i++) {
      if (flat[i] !== 0 && flat[i] !== sol[i]) {
        if (firstErr < 0) { firstErr = i; }
        if (firstConf < 0 && cf[i]) { firstConf = i; }
      }
    }
    if (firstErr >= 0) { return buildErrorHint(flat, sol, spec, cf, firstConf >= 0 ? firstConf : firstErr); }

    var empty = false;
    for (i = 0; i < 81; i++) { if (flat[i] === 0) { empty = true; break; } }
    if (!empty) { return null; }

    // 2) Deducciones lógicas.
    var cd = candidatesFlat(flat, spec);
    var h = hintCageLast(flat, spec, sol, notes) ||
      hintRule45(flat, spec, sol, notes) ||
      hintNaked(flat, spec, cd, sol, notes) ||
      hintHidden(flat, cd, sol, notes);
    if (h) { return h; }

    // 3) Respaldo: celda con menos candidatos, valor tomado de la solución.
    var bestIdx = -1, bestCount = 10, bestVisible = -1;
    for (i = 0; i < 81; i++) {
      if (flat[i] !== 0) { continue; }
      var n = POP[cd.cand[i]], vis = 0;
      for (var k = 0; k < PEERS[i].length; k++) { if (flat[PEERS[i][k]] !== 0) { vis++; } }
      if (n < bestCount || (n === bestCount && vis > bestVisible)) { bestIdx = i; bestCount = n; bestVisible = vis; }
    }
    var cands = maskDigits(cd.cand[bestIdx]).map(String);
    return makeHint(bestIdx, sol[bestIdx],
      'Esta celda admite solo ' + joinList(cands) + ' (según su fila, columna, bloque y la suma de su jaula); por descarte, aquí va el ' + sol[bestIdx] + '.',
      'solution', null, cellsToObjects(spec.cells[spec.cageOf[bestIdx]]));
  }

  /* ===========================================================================
   * API pública
   * ========================================================================= */

  return {
    DIFFICULTIES: DIFFICULTIES.slice(),

    // Generación
    generateKillerPuzzle: generateKillerPuzzle,
    generateKillerPuzzleAsync: generateKillerPuzzleAsync,

    // Resolución
    solveKiller: solveKiller,
    countKillerSolutions: countKillerSolutions,
    hasUniqueKillerSolution: hasUniqueKillerSolution,

    // Pistas
    getKillerHint: getKillerHint,
    computeKillerCandidates: computeKillerCandidates,

    // Validación
    getKillerConflicts: getKillerConflicts,
    getKillerCellConflicts: getKillerCellConflicts,
    findWrongCells: findWrongCells,
    isComplete: isComplete,
    isKillerSolved: isKillerSolved,

    // Utilidades
    cloneBoard: cloneBoard
  };
}));
