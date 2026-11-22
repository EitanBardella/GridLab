/*!
 * engine.js — Motor de Sudoku para PWA móvil
 * -----------------------------------------------------------------------------
 * JavaScript puro, sin dependencias. Funciona de tres formas:
 *   - <script src="engine.js"> ............ expone el global `SudokuEngine`
 *   - Web Worker: importScripts('engine.js')  -> `SudokuEngine`
 *   - Node / bundlers: const E = require('./engine.js')
 *
 * Convenciones:
 *   - Un tablero es un arreglo 9x9 de números: 0 = vacío, 1..9 = valor.
 *   - Las filas/columnas se indexan de 0 a 8.
 *   - Dificultades: 'facil' | 'medio' | 'dificil' | 'experto' | 'maestro' | 'extremo'.
 *   - Variantes:    'classic' | 'diagonal' | 'antiknight' | 'nonconsecutive' | 'jigsaw'  (por defecto 'classic').
 *
 * Variantes (parámetro opcional `variant`):
 *   - 'classic'    Sudoku clásico (filas, columnas y bloques).
 *   - 'diagonal'   X-Sudoku: además, las dos diagonales principales (r === c y
 *                  r + c === 8) contienen los dígitos 1..9 sin repetirse.
 *   - 'antiknight' Anti-Caballo: además, ninguna celda repite el número de otra
 *                  ubicada a un salto de caballo de ajedrez ([±1,±2] y [±2,±1]).
 *   - 'nonconsecutive' Sin Consecutivos: además, dos celdas que comparten lado (arriba, abajo,
 *                  izquierda, derecha) no pueden contener números consecutivos (|a - b| !== 1).
 *   - 'jigsaw'     Irregular: en lugar de los bloques de 3x3 hay 9 regiones contiguas de 9 celdas
 *                  con forma libre. El mapa de regiones (81 números 0..8) lo genera el motor a partir de
 *                  la semilla y viaja en el resultado (`regions`). Para las demás funciones se pasa como
 *                  variante un objeto: { name: 'jigsaw', regions: number[81] | number[9][9] }.
 *
 *   Dónde se pasa `variant`:
 *     generatePuzzle(difficulty, { variant })       generatePuzzleAsync(difficulty, { variant })
 *     solve(board, variant)                         countSolutions(board, limit, variant)
 *     hasUniqueSolution(board, variant)             analyzeDifficulty(board, variant)
 *     getSmartHint(board, solution, notes, variant) computeCandidates(board, variant)
 *     getCellConflicts(board, row, col, value, variant)
 *     isValidPlacement(board, row, col, value, variant)
 *     getConflicts(board, variant)                  isSolved(board, solution, variant)
 *   Si se omite (p. ej. en los Desafíos Diarios con semilla), se usa 'classic' y el
 *   comportamiento —incluida la secuencia pseudoaleatoria de cada semilla— es idéntico
 *   al de la versión anterior.
 *
 * Clasificación de dificultad (según las técnicas humanas NECESARIAS):
 *   facil   -> se resuelve solo con Naked Singles.
 *   medio   -> requiere además Hidden Singles.
 *   dificil -> requiere Naked Pairs y/o Pointing Pairs / Box-Line Reduction
 *              (uso moderado: hasta ADVANCED_LIMIT pasos de descarte).
 *   experto -> exige muchos pasos de descarte avanzados (pares / pointing / box-line).
 *   maestro -> además exige al menos un X-Wing.
 *   extremo -> las técnicas implementadas (incluido X-Wing) no bastan para resolverlo
 *              (requeriría probar y errar): tableros con las menos pistas posibles.
 *   (En 'diagonal' las diagonales actúan como unidades extra para todas las técnicas;
 *    en 'antiknight' los saltos de caballo amplían los "vecinos" de cada celda.)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SudokuEngine = factory();
  }
}(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ===========================================================================
   * Constantes y tablas precalculadas
   * ========================================================================= */

  var ALL = 511; // 0b111111111: los nueve candidatos 1..9 (bit d-1 representa el dígito d)
  var DIFFICULTIES = ['facil', 'medio', 'dificil', 'experto', 'maestro', 'extremo'];
  var RANK = { facil: 0, medio: 1, dificil: 2, experto: 3, maestro: 4, extremo: 5 };
  var VARIANT_NAMES = ['classic', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw'];

  // Nivel de cada técnica (para determinar la más difícil usada).
  var TECHNIQUE_LEVEL = { nakedSingle: 1, hiddenSingle: 2, nakedPair: 3, pointing: 4, boxLine: 4, xwing: 5 };
  var TECHNIQUE_ORDER = ['nakedSingle', 'hiddenSingle', 'nakedPair', 'pointing', 'boxLine', 'xwing'];

  // Máximo de pasos de descarte avanzados (pares / pointing / box-line) para seguir siendo 'dificil'.
  var ADVANCED_LIMIT = 4;

  // Pistas mínimas por dificultad (evita tableros demasiado vacíos en niveles bajos).
  var MIN_CLUES = { facil: 36, medio: 30, dificil: 0, experto: 0, maestro: 0, extremo: 0 };

  var BLOCK_NAMES = [
    'superior izquierdo', 'superior central', 'superior derecho',
    'central izquierdo', 'central', 'central derecho',
    'inferior izquierdo', 'inferior central', 'inferior derecho'
  ];

  // Saltos de caballo de ajedrez: [±1, ±2] y [±2, ±1].
  var KNIGHT_MOVES = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  var ROW = new Array(81);
  var COL = new Array(81);
  var BOX = new Array(81);
  var POP = new Array(512);
  var UNITS = [];        // 0-8 filas, 9-17 columnas, 18-26 bloques (unidades del Sudoku clásico)
  var PEERS = new Array(81);       // vecinos del Sudoku clásico
  var DG = new Array(81);          // bit0: diagonal principal (r===c), bit1: diagonal secundaria (r+c===8)
  var KNIGHT = new Array(81);      // celdas a un salto de caballo
  var ADJ = new Array(81);         // celdas ortogonalmente adyacentes (comparten lado)
  var UNITS_ALL = [];    // UNITS + 27: diagonal principal, 28: diagonal secundaria
  var MEMBER = [];       // MEMBER[u][celda] = 1 si la celda pertenece a la unidad u (u = 0..28)
  var VARIANTS = {};     // datos precalculados por variante

  (function precompute() {
    var i, j, u, r, c, b;
    for (i = 0; i < 81; i++) {
      ROW[i] = Math.floor(i / 9);
      COL[i] = i % 9;
      BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
    }
    POP[0] = 0;
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
        for (var k = 0; k < 9; k++) {
          var p = rel[j][k];
          if (p !== i && !seen[p]) { seen[p] = true; list.push(p); }
        }
      }
      PEERS[i] = list;
    }

    // Diagonales y saltos de caballo.
    var diagMain = [], diagAnti = [];
    for (i = 0; i < 9; i++) { diagMain.push(i * 9 + i); diagAnti.push(i * 9 + (8 - i)); }
    UNITS_ALL = UNITS.concat([diagMain, diagAnti]);

    for (i = 0; i < 81; i++) {
      DG[i] = (ROW[i] === COL[i] ? 1 : 0) | (ROW[i] + COL[i] === 8 ? 2 : 0);
      var kn = [];
      for (j = 0; j < KNIGHT_MOVES.length; j++) {
        var rr = ROW[i] + KNIGHT_MOVES[j][0], cc = COL[i] + KNIGHT_MOVES[j][1];
        if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) { kn.push(rr * 9 + cc); }
      }
      KNIGHT[i] = kn;
      var ad = [];
      if (ROW[i] > 0) { ad.push(i - 9); }
      if (ROW[i] < 8) { ad.push(i + 9); }
      if (COL[i] > 0) { ad.push(i - 1); }
      if (COL[i] < 8) { ad.push(i + 1); }
      ADJ[i] = ad;
    }

    for (u = 0; u < UNITS_ALL.length; u++) {
      var mem = new Uint8Array(81);
      for (j = 0; j < UNITS_ALL[u].length; j++) { mem[UNITS_ALL[u][j]] = 1; }
      MEMBER.push(mem);
    }

    // Vecinos ampliados: los del clásico (mismo orden) + los de la variante, sin duplicados.
    function extendPeers(extra) {
      var out = new Array(81);
      for (var x = 0; x < 81; x++) {
        var have = {}, lst = PEERS[x].slice(), q, e;
        for (q = 0; q < lst.length; q++) { have[lst[q]] = true; }
        e = extra(x);
        for (q = 0; q < e.length; q++) {
          if (e[q] !== x && !have[e[q]]) { have[e[q]] = true; lst.push(e[q]); }
        }
        out[x] = lst;
      }
      return out;
    }

    var lines = [], q2;
    for (q2 = 0; q2 < 18; q2++) { lines.push(q2); }

    VARIANTS.classic = {
      name: 'classic', diag: false, knight: false, nonc: false,
      units: UNITS, peers: PEERS, lineUnits: lines.slice(), extraUnits: []
    };
    VARIANTS.diagonal = {
      name: 'diagonal', diag: true, knight: false, nonc: false,
      units: UNITS.concat([diagMain, diagAnti]),
      peers: extendPeers(function (x) {
        var e = [];
        if (DG[x] & 1) { e = e.concat(diagMain); }
        if (DG[x] & 2) { e = e.concat(diagAnti); }
        return e;
      }),
      lineUnits: lines.concat([27, 28]),
      extraUnits: [27, 28]
    };
    VARIANTS.antiknight = {
      name: 'antiknight', diag: false, knight: true, nonc: false,
      units: UNITS,
      peers: extendPeers(function (x) { return KNIGHT[x]; }),
      lineUnits: lines.slice(), extraUnits: []
    };
    // Sin Consecutivos: los vecinos "iguales" son los del clásico; la regla extra (|a-b| !== 1) se aplica por ADJ.
    VARIANTS.nonconsecutive = {
      name: 'nonconsecutive', diag: false, knight: false, nonc: true,
      units: UNITS, peers: PEERS, lineUnits: lines.slice(), extraUnits: []
    };
    // Datos de "bloque" por variante (en Irregular el bloque es la región).
    for (var vn in VARIANTS) {
      if (Object.prototype.hasOwnProperty.call(VARIANTS, vn)) {
        VARIANTS[vn].box = BOX; VARIANTS[vn].member = MEMBER; VARIANTS[vn].jig = false;
      }
    }
  }());

  /* ---------- Regiones irregulares (Jigsaw) ---------- */
  var ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function regionConnected(reg, id) {
    var first = -1, total = 0, i;
    for (i = 0; i < 81; i++) { if (reg[i] === id) { total++; if (first < 0) { first = i; } } }
    if (first < 0) { return false; }
    var seen = {}, stack = [first], n = 0;
    seen[first] = true;
    while (stack.length) {
      var x = stack.pop();
      n++;
      for (var d = 0; d < 4; d++) {
        var rr = ROW[x] + ORTHO[d][0], cc = COL[x] + ORTHO[d][1];
        if (rr < 0 || rr > 8 || cc < 0 || cc > 8) { continue; }
        var y = rr * 9 + cc;
        if (reg[y] === id && !seen[y]) { seen[y] = true; stack.push(y); }
      }
    }
    return n === total;
  }

  /** Normaliza un mapa de regiones (plano o 9x9) a un arreglo plano de 81 enteros 0..8; lanza si no es válido. */
  function normalizeRegions(regions) {
    var flat = [], i, r;
    if (regions && regions.length === 9 && regions[0] && typeof regions[0] === 'object') {
      for (r = 0; r < 9; r++) {
        if (!regions[r] || regions[r].length !== 9) { throw new TypeError('Mapa de regiones inválido.'); }
        for (i = 0; i < 9; i++) { flat.push(regions[r][i]); }
      }
    } else if (regions && regions.length === 81) {
      flat = Array.prototype.slice.call(regions);
    } else {
      throw new TypeError('Mapa de regiones inválido.');
    }
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < 81; i++) {
      var g = flat[i];
      if (g !== (g | 0) || g < 0 || g > 8) { throw new TypeError('Mapa de regiones inválido.'); }
      counts[g]++;
    }
    for (i = 0; i < 9; i++) {
      if (counts[i] !== 9 || !regionConnected(flat, i)) { throw new TypeError('Cada región debe ser contigua y tener 9 celdas.'); }
    }
    return flat;
  }

  // Caché LRU acotada: durante la generación se construyen decenas de mapas candidatos que casi nunca se reutilizan.
  // Map conserva el orden de inserción: consultar = reinsertar al final; al pasar el tope se descarta el más antiguo.
  var JIG_CACHE_MAX = 48;
  // Topes duros por búsqueda interna (además del plazo): una prueba de unicidad normal usa <1000 nodos.
  var UNIQ_NODES = 300000, FINAL_NODES = 5000000;
  var JIG_CACHE = new Map();

  /** Construye (con caché) los datos de variante para un mapa de regiones. */
  function makeJigsawVariant(regions) {
    var flat = normalizeRegions(regions);
    var key = flat.join('');
    var hit = JIG_CACHE.get(key);
    if (hit) { JIG_CACHE.delete(key); JIG_CACHE.set(key, hit); return hit; }
    var units = UNITS.slice(0, 18), i, b, k, j;
    for (b = 0; b < 9; b++) {
      var u = [];
      for (i = 0; i < 81; i++) { if (flat[i] === b) { u.push(i); } }
      units.push(u);
    }
    var peers = new Array(81);
    for (i = 0; i < 81; i++) {
      var seen = {}, list = [], rel = [units[ROW[i]], units[9 + COL[i]], units[18 + flat[i]]];
      for (j = 0; j < 3; j++) {
        for (k = 0; k < 9; k++) {
          var q = rel[j][k];
          if (q !== i && !seen[q]) { seen[q] = true; list.push(q); }
        }
      }
      peers[i] = list;
    }
    var member = [];
    for (b = 0; b < units.length; b++) {
      var mem = new Uint8Array(81);
      for (j = 0; j < units[b].length; j++) { mem[units[b][j]] = 1; }
      member.push(mem);
    }
    var lines = [];
    for (k = 0; k < 18; k++) { lines.push(k); }
    var V = {
      name: 'jigsaw', diag: false, knight: false, nonc: false, jig: true,
      units: units, peers: peers, lineUnits: lines, extraUnits: [],
      box: flat, member: member, regions: flat
    };
    JIG_CACHE.set(key, V);
    while (JIG_CACHE.size > JIG_CACHE_MAX) { JIG_CACHE.delete(JIG_CACHE.keys().next().value); }
    return V;
  }

  /**
   * Mapa aleatorio de 9 regiones contiguas de 9 celdas: parte de los bloques de 3x3 y los deforma
   * intercambiando pares de celdas vecinas de regiones distintas (sin romper la contigüidad).
   */
  function randomRegions(rng) {
    var reg = BOX.slice(), n = 0, tries = 0, i, k;
    var target = 90 + Math.floor(rng() * 40);
    function touches(c, id) {
      for (var d = 0; d < 4; d++) {
        var rr = ROW[c] + ORTHO[d][0], cc = COL[c] + ORTHO[d][1];
        if (rr >= 0 && rr <= 8 && cc >= 0 && cc <= 8 && reg[rr * 9 + cc] === id) { return true; }
      }
      return false;
    }
    while (n < target && tries < 6000) {
      tries++;
      var a = Math.floor(rng() * 81), dd = ORTHO[Math.floor(rng() * 4)];
      var r2 = ROW[a] + dd[0], c2 = COL[a] + dd[1];
      if (r2 < 0 || r2 > 8 || c2 < 0 || c2 > 8) { continue; }
      var bb = r2 * 9 + c2;
      if (reg[a] === reg[bb]) { continue; }
      var A = reg[a], B = reg[bb];
      reg[a] = B;                                   // a pasa de A a B (A queda con 8 y B con 10)
      if (!regionConnected(reg, A)) { reg[a] = A; continue; }
      var cand = [];
      for (i = 0; i < 81; i++) { if (reg[i] === B && i !== a && touches(i, A)) { cand.push(i); } }
      shuffle(cand, rng);
      var done = false;
      for (k = 0; k < cand.length && !done; k++) {  // un vecino de B pasa a A para recuperar los 9 y 9
        reg[cand[k]] = A;
        if (regionConnected(reg, A) && regionConnected(reg, B)) { done = true; } else { reg[cand[k]] = B; }
      }
      if (done) { n++; } else { reg[a] = A; }
    }
    // Numeración canónica: por orden de aparición (fila a fila).
    var map = {}, next = 0, out = new Array(81);
    for (var i = 0; i < 81; i++) {
      if (map[reg[i]] === undefined) { map[reg[i]] = next++; }
      out[i] = map[reg[i]];
    }
    return out;
  }

  // Dígitos prohibidos (máscara) en una celda adyacente a otra que contiene `v`: v - 1 y v + 1.
  function consecMask(v) {
    var m = 0;
    if (v > 1) { m |= 1 << (v - 2); }
    if (v < 9) { m |= 1 << v; }
    return m;
  }

  /** Normaliza el parámetro `variant` (undefined/null -> 'classic'). */
  function getVariant(v) {
    if (v === undefined || v === null || v === '') { return VARIANTS.classic; }
    if (typeof v === 'object' && v.name === 'jigsaw') {
      if (!v.regions) { throw new RangeError("La variante 'jigsaw' necesita { name: 'jigsaw', regions }."); }
      return makeJigsawVariant(v.regions);
    }
    if (v === 'jigsaw') { throw new RangeError("La variante 'jigsaw' necesita { name: 'jigsaw', regions }."); }
    if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(VARIANTS, v)) { return VARIANTS[v]; }
    throw new RangeError("Variante inválida: '" + v + "'. Use: " + VARIANT_NAMES.join(', ') + '.');
  }

  /* ===========================================================================
   * Utilidades generales
   * ========================================================================= */

  function digitOfMask(mask) { return 32 - Math.clz32(mask); } // solo para máscaras de un bit

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

  // Generador pseudoaleatorio determinista (mulberry32) si se da semilla; si no, Math.random.
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
    for (var r = 0; r < 9; r++) { board.push(flat.slice(r * 9, r * 9 + 9)); }
    return board;
  }

  function cloneBoard(board) {
    return unflatten(flattenBoard(board));
  }

  function boardToString(board) {
    return flattenBoard(board).join('');
  }

  function boardFromString(str) {
    var clean = String(str).replace(/[\s|\-+]/g, '');
    if (clean.length !== 81) {
      throw new TypeError('La cadena debe tener 81 caracteres (0 o . = vacío).');
    }
    var flat = new Array(81);
    for (var i = 0; i < 81; i++) {
      var ch = clean.charAt(i);
      var v = (ch === '.' || ch === '0') ? 0 : parseInt(ch, 10);
      if (isNaN(v)) { throw new TypeError('Carácter inválido en la posición ' + i + ': ' + ch); }
      flat[i] = v;
    }
    return unflatten(flat);
  }

  function checkCoords(row, col) {
    if (row !== (row | 0) || col !== (col | 0) || row < 0 || row > 8 || col < 0 || col > 8) {
      throw new RangeError('Fila y columna deben estar entre 0 y 8.');
    }
  }

  /* ===========================================================================
   * Backtracking con MRV (celda con menos candidatos) — conteo y resolución
   * ========================================================================= */

  /**
   * Busca soluciones por backtracking respetando las reglas de la variante.
   * Se detiene al encontrar `limit` soluciones.
   * Si se pasa `rng`, el orden de los dígitos se aleatoriza (para generar tableros).
   * `nodeLimit` (opcional) corta la búsqueda tras ese número de nodos y `deadline` (ms epoch, opcional) tras ese instante:
   * en ambos casos `aborted` = true y NO se debe interpretar `count` como "única" ni "sin solución".
   * @returns {{count:number, first:number[]|null, aborted:boolean}}
   */
  function search(flat, limit, rng, V, nodeLimit, deadline) {
    V = V || VARIANTS.classic;
    var BX = V.box;
    var grid = flat.slice();
    var rm = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var cm = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var bm = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var dm = [0, 0];                                       // dígitos usados en cada diagonal
    var useDiag = V.diag, useKnight = V.knight, useNonc = V.nonc;
    var nx = useNonc ? new Array(81).fill(0) : null;       // máscara de dígitos prohibidos por vecino ortogonal consecutivo
    var nc = useNonc ? new Uint8Array(729) : null;         // contadores por (celda, dígito)
    var kx = useKnight ? new Array(81).fill(0) : null;     // máscara de dígitos prohibidos por salto de caballo
    var kc = useKnight ? new Uint8Array(729) : null;       // contadores por (celda, dígito)
    var count = 0, first = null, nodes = 0, aborted = false;
    var i;

    function candOf(k) {
      var m = ALL & ~(rm[ROW[k]] | cm[COL[k]] | bm[BX[k]]);
      if (useDiag) {
        var g = DG[k];
        if (g) {
          if (g & 1) { m &= ~dm[0]; }
          if (g & 2) { m &= ~dm[1]; }
        }
      }
      if (useKnight) { m &= ~kx[k]; }
      if (useNonc) { m &= ~nx[k]; }
      return m;
    }

    function put(k, d) {
      var bt = 1 << (d - 1), j;
      grid[k] = d;
      rm[ROW[k]] |= bt; cm[COL[k]] |= bt; bm[BX[k]] |= bt;
      if (useDiag) {
        var g = DG[k];
        if (g & 1) { dm[0] |= bt; }
        if (g & 2) { dm[1] |= bt; }
      }
      if (useKnight) {
        var kn = KNIGHT[k];
        for (j = 0; j < kn.length; j++) {
          if (kc[kn[j] * 9 + d - 1]++ === 0) { kx[kn[j]] |= bt; }
        }
      }
      if (useNonc) {
        var ad = ADJ[k], e;
        for (j = 0; j < ad.length; j++) {
          for (e = d - 1; e <= d + 1; e += 2) {
            if (e >= 1 && e <= 9 && nc[ad[j] * 9 + e - 1]++ === 0) { nx[ad[j]] |= 1 << (e - 1); }
          }
        }
      }
    }

    function take(k, d) {
      var bt = 1 << (d - 1), j;
      grid[k] = 0;
      rm[ROW[k]] &= ~bt; cm[COL[k]] &= ~bt; bm[BX[k]] &= ~bt;
      if (useDiag) {
        var g = DG[k];
        if (g & 1) { dm[0] &= ~bt; }
        if (g & 2) { dm[1] &= ~bt; }
      }
      if (useKnight) {
        var kn = KNIGHT[k];
        for (j = 0; j < kn.length; j++) {
          if (--kc[kn[j] * 9 + d - 1] === 0) { kx[kn[j]] &= ~bt; }
        }
      }
      if (useNonc) {
        var ad = ADJ[k], e;
        for (j = 0; j < ad.length; j++) {
          for (e = d - 1; e <= d + 1; e += 2) {
            if (e >= 1 && e <= 9 && --nc[ad[j] * 9 + e - 1] === 0) { nx[ad[j]] &= ~(1 << (e - 1)); }
          }
        }
      }
    }

    for (i = 0; i < 81; i++) {
      var v = grid[i];
      if (v) {
        if (!(candOf(i) & (1 << (v - 1)))) { return { count: 0, first: null, aborted: false }; }
        put(i, v);
      }
    }

    function rec() {
      ++nodes;
      if (nodeLimit && nodes > nodeLimit) { aborted = true; return true; }
      if (deadline && (nodes & 255) === 0 && Date.now() > deadline) { aborted = true; return true; }
      var best = -1, bestMask = 0, bestCount = 10, k;
      for (k = 0; k < 81; k++) {
        if (grid[k] === 0) {
          var m = candOf(k);
          var n = POP[m];
          if (n < bestCount) {
            best = k; bestMask = m; bestCount = n;
            if (n <= 1) { break; }
          }
        }
      }
      if (best === -1) {
        count++;
        if (!first) { first = grid.slice(); }
        return count >= limit;
      }
      if (bestCount === 0) { return false; }

      var digits = maskDigits(bestMask);
      if (rng) { shuffle(digits, rng); }
      for (var j = 0; j < digits.length; j++) {
        var d = digits[j];
        put(best, d);
        if (rec()) { return true; }
        take(best, d);
      }
      return false;
    }

    rec();
    return { count: count, first: first, aborted: aborted };
  }

  /** Cuenta soluciones (se detiene en `limit`, por defecto 2). */
  function countSolutions(board, limit, variant) {
    return search(flattenBoard(board), limit > 0 ? limit : 2, null, getVariant(variant)).count;
  }

  /** true si el tablero tiene una y solo una solución. */
  function hasUniqueSolution(board, variant) {
    return search(flattenBoard(board), 2, null, getVariant(variant)).count === 1;
  }

  /** Devuelve una solución (tablero 9x9) o null si no existe. */
  function solve(board, variant) {
    var res = search(flattenBoard(board), 1, null, getVariant(variant));
    return res.first ? unflatten(res.first) : null;
  }

  function generateSolvedFlat(rng, V, deadline) {
    var empty = new Array(81).fill(0), t, res;
    if (V.name === 'classic') { return search(empty, 1, rng, V, 0, deadline).first; }
    if (V.jig) {   // algunos mapas de regiones no admiten solución: se limita la búsqueda y quien llama prueba otro mapa
      for (t = 0; t < 6; t++) {
        res = search(empty, 1, rng, V, 4000 * (t + 1), deadline);
        if (res.first) { return res.first; }
        if (deadline && Date.now() > deadline) { break; }
      }
      return null;
    }
    // Variantes: se reintenta con tope de nodos creciente para evitar búsquedas patológicas.
    for (t = 0; t < 30; t++) {
      res = search(empty, 1, rng, V, 10000 * (t + 1), deadline);
      if (res.first) { return res.first; }
      if (deadline && Date.now() > deadline) { return null; }
    }
    return search(empty, 1, rng, V, FINAL_NODES, deadline).first;   // último intento: acotado en nodos y en tiempo
  }

  /* ===========================================================================
   * Solucionador lógico (técnicas humanas)
   * ========================================================================= */

  /** Estado lógico: valores + máscaras de candidatos por celda. null si hay contradicción inicial. */
  function createLogicState(flat, V) {
    V = V || VARIANTS.classic;
    var grid = flat.slice();
    var cand = new Array(81);
    var empties = 0;
    var i, k, peers, used, v;

    for (i = 0; i < 81; i++) {
      v = grid[i];
      if (v) {
        peers = V.peers[i];
        for (k = 0; k < peers.length; k++) {
          if (grid[peers[k]] === v) { return null; }
        }
        if (V.nonc) {
          var ad0 = ADJ[i];
          for (k = 0; k < ad0.length; k++) {
            if (grid[ad0[k]] && Math.abs(grid[ad0[k]] - v) === 1) { return null; }
          }
        }
      }
    }
    for (i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        used = 0;
        peers = V.peers[i];
        for (k = 0; k < peers.length; k++) {
          if (grid[peers[k]]) { used |= 1 << (grid[peers[k]] - 1); }
        }
        if (V.nonc) {
          var ad1 = ADJ[i];
          for (k = 0; k < ad1.length; k++) { if (grid[ad1[k]]) { used |= consecMask(grid[ad1[k]]); } }
        }
        cand[i] = ALL & ~used;
        empties++;
      } else {
        cand[i] = 0;
      }
    }
    return { grid: grid, cand: cand, empties: empties, V: V };
  }

  function cloneLogicState(st) {
    return { grid: st.grid.slice(), cand: st.cand.slice(), empties: st.empties, V: st.V };
  }

  function placeValue(st, idx, value) {
    var bit = 1 << (value - 1);
    st.grid[idx] = value;
    st.cand[idx] = 0;
    st.empties--;
    var peers = st.V.peers[idx];
    for (var k = 0; k < peers.length; k++) { st.cand[peers[k]] &= ~bit; }
    if (st.V.nonc) {
      var cm = consecMask(value), ad = ADJ[idx];
      for (k = 0; k < ad.length; k++) { st.cand[ad[k]] &= ~cm; }
    }
  }

  function applyStep(st, step) {
    if (step.elims) {
      for (var k = 0; k < step.elims.length; k++) {
        st.cand[step.elims[k][0]] &= ~step.elims[k][1];
      }
    } else {
      placeValue(st, step.idx, step.value);
    }
  }

  /** Naked Single: celda vacía con un único candidato. */
  function listNakedSingles(st, firstOnly) {
    var out = [];
    for (var i = 0; i < 81; i++) {
      if (st.grid[i] === 0) {
        var m = st.cand[i];
        if (m !== 0 && POP[m] === 1) {
          out.push({ technique: 'nakedSingle', idx: i, value: digitOfMask(m) });
          if (firstOnly) { return out; }
        }
      }
    }
    return out;
  }

  /** Hidden Single: dígito que solo cabe en una celda de una unidad (fila/columna/bloque/diagonal). */
  function listHiddenSingles(st, firstOnly) {
    var out = [];
    var units = st.V.units;
    for (var u = 0; u < units.length; u++) {
      var cells = units[u];
      var once = 0, twice = 0, k;
      for (k = 0; k < 9; k++) {
        var m = st.cand[cells[k]];
        twice |= once & m;
        once |= m;
      }
      var uniq = once & ~twice;
      if (!uniq) { continue; }
      for (k = 0; k < 9; k++) {
        var bits = st.cand[cells[k]] & uniq;
        if (bits && POP[bits] === 1) {
          out.push({ technique: 'hiddenSingle', idx: cells[k], value: digitOfMask(bits), unit: u });
          if (firstOnly) { return out; }
        }
      }
    }
    return out;
  }

  /** Naked Pair: dos celdas de una unidad con los mismos 2 candidatos -> se descartan en el resto. */
  function findNakedPair(st) {
    var units = st.V.units;
    for (var u = 0; u < units.length; u++) {
      var cells = units[u];
      for (var a = 0; a < 9; a++) {
        var ia = cells[a];
        var ma = st.cand[ia];
        if (POP[ma] !== 2) { continue; }
        for (var b = a + 1; b < 9; b++) {
          var ib = cells[b];
          if (st.cand[ib] !== ma) { continue; }
          var elims = [];
          for (var k = 0; k < 9; k++) {
            var ik = cells[k];
            if (ik !== ia && ik !== ib && (st.cand[ik] & ma)) {
              elims.push([ik, st.cand[ik] & ma]);
            }
          }
          if (elims.length) {
            return { technique: 'nakedPair', unit: u, cells: [ia, ib], mask: ma, elims: elims };
          }
        }
      }
    }
    return null;
  }

  function allSame(list, table) {
    for (var i = 1; i < list.length; i++) { if (table[list[i]] !== table[list[0]]) { return false; } }
    return true;
  }

  /**
   * Pointing Pairs/Triples: en un bloque, un dígito confinado a una línea (fila, columna o,
   * en 'diagonal', una diagonal) -> se descarta fuera del bloque.
   */
  function findPointing(st) {
    var V = st.V, lines = V.lineUnits;
    for (var b = 0; b < 9; b++) {
      var cells = V.units[18 + b];
      for (var d = 0; d < 9; d++) {
        var bit = 1 << d;
        var hit = [], k;
        for (k = 0; k < 9; k++) { if (st.cand[cells[k]] & bit) { hit.push(cells[k]); } }
        if (hit.length < 2 || hit.length > 3) { continue; }

        for (var li = 0; li < lines.length; li++) {
          var lineUnit = lines[li], mem = V.member[lineUnit], inAll = true, q;
          for (q = 0; q < hit.length; q++) { if (!mem[hit[q]]) { inAll = false; break; } }
          if (!inAll) { continue; }

          var line = V.units[lineUnit];
          var elims = [];
          for (k = 0; k < 9; k++) {
            if (V.box[line[k]] !== b && (st.cand[line[k]] & bit)) { elims.push([line[k], bit]); }
          }
          if (elims.length) {
            return { technique: 'pointing', unit: 18 + b, line: lineUnit, digit: d + 1, cells: hit, elims: elims };
          }
        }
      }
    }
    return null;
  }

  /**
   * Box-Line Reduction: en una línea (fila, columna o, en 'diagonal', una diagonal), un dígito
   * confinado a un bloque -> se descarta en el resto del bloque.
   */
  function findBoxLine(st) {
    var V = st.V, lines = V.lineUnits;
    for (var li = 0; li < lines.length; li++) {
      var u = lines[li];
      var cells = V.units[u];
      var mem = V.member[u];
      for (var d = 0; d < 9; d++) {
        var bit = 1 << d;
        var hit = [], k;
        for (k = 0; k < 9; k++) { if (st.cand[cells[k]] & bit) { hit.push(cells[k]); } }
        if (hit.length < 2 || hit.length > 3 || !allSame(hit, V.box)) { continue; }

        var box = V.box[hit[0]];
        var boxCells = V.units[18 + box];
        var elims = [];
        for (k = 0; k < 9; k++) {
          var cell = boxCells[k];
          if (!mem[cell] && (st.cand[cell] & bit)) { elims.push([cell, bit]); }
        }
        if (elims.length) {
          return { technique: 'boxLine', unit: u, box: box, digit: d + 1, cells: hit, elims: elims };
        }
      }
    }
    return null;
  }

  /**
   * X-Wing: un dígito que en dos filas (o dos columnas) solo cabe en las MISMAS dos columnas (filas) forma un
   * rectángulo: el dígito irá en una diagonal del rectángulo, así que se descarta del resto de esas dos columnas
   * (filas). Solo usa filas y columnas, por lo que es válido en todas las variantes.
   */
  function findXWing(st) {
    for (var d = 0; d < 9; d++) {
      var bit = 1 << d;
      for (var mode = 0; mode < 2; mode++) {   // 0: filas base / columnas de cobertura; 1: al revés
        var pos = [], a, b;
        for (a = 0; a < 9; a++) {
          var p = [];
          for (b = 0; b < 9; b++) {
            var cell = mode === 0 ? a * 9 + b : b * 9 + a;
            if (st.grid[cell] === 0 && (st.cand[cell] & bit)) { p.push(b); }
          }
          pos.push(p);
        }
        for (a = 0; a < 8; a++) {
          if (pos[a].length !== 2) { continue; }
          for (var a2 = a + 1; a2 < 9; a2++) {
            if (pos[a2].length !== 2 || pos[a2][0] !== pos[a][0] || pos[a2][1] !== pos[a][1]) { continue; }
            var elims = [], cov, t;
            for (t = 0; t < 2; t++) {
              cov = pos[a][t];
              for (b = 0; b < 9; b++) {
                if (b === a || b === a2) { continue; }
                var c2 = mode === 0 ? b * 9 + cov : cov * 9 + b;
                if (st.grid[c2] === 0 && (st.cand[c2] & bit)) { elims.push([c2, bit]); }
              }
            }
            if (elims.length) {
              return { technique: 'xwing', digit: d + 1, byRows: mode === 0, lines: [a, a2], covers: [pos[a][0], pos[a][1]], elims: elims };
            }
          }
        }
      }
    }
    return null;
  }

  function findAdvancedStep(st) {
    return findNakedPair(st) || findPointing(st) || findBoxLine(st) || findXWing(st);
  }

  // Prioridad: siempre se usa la técnica más simple disponible.
  function nextStep(st) {
    return listNakedSingles(st, true)[0] ||
      listHiddenSingles(st, true)[0] ||
      findAdvancedStep(st) ||
      null;
  }

  function emptyCounts() {
    return { nakedSingle: 0, hiddenSingle: 0, nakedPair: 0, pointing: 0, boxLine: 0, xwing: 0 };
  }

  function hardestTechnique(counts) {
    for (var i = TECHNIQUE_ORDER.length - 1; i >= 0; i--) {
      if (counts[TECHNIQUE_ORDER[i]] > 0) { return TECHNIQUE_ORDER[i]; }
    }
    return null;
  }

  function classify(solved, maxLevel, counts) {
    if (!solved) { return 'extremo'; }
    if (maxLevel <= 1) { return 'facil'; }
    if (maxLevel === 2) { return 'medio'; }
    if (counts.xwing > 0) { return 'maestro'; }
    var advanced = counts.nakedPair + counts.pointing + counts.boxLine;
    return advanced > ADVANCED_LIMIT ? 'experto' : 'dificil';
  }

  /** Resuelve lógicamente un tablero (plano) y registra qué técnicas necesitó. */
  function analyzeFlat(flat, V) {
    V = V || VARIANTS.classic;
    var counts = emptyCounts();
    var st = createLogicState(flat, V);
    if (!st) {
      return { valid: false, solved: false, maxLevel: 0, counts: counts, difficulty: 'extremo', hardest: null };
    }
    var maxLevel = 0;
    while (st.empties > 0) {
      var step = nextStep(st);
      if (!step) { break; }
      applyStep(st, step);
      counts[step.technique]++;
      if (TECHNIQUE_LEVEL[step.technique] > maxLevel) { maxLevel = TECHNIQUE_LEVEL[step.technique]; }
    }
    var solved = st.empties === 0;
    return {
      valid: true,
      solved: solved,
      maxLevel: maxLevel,
      counts: counts,
      difficulty: classify(solved, maxLevel, counts),
      hardest: hardestTechnique(counts)
    };
  }

  /**
   * Analiza un tablero: unicidad, técnicas necesarias y dificultad real.
   * @param {number[][]} board
   * @param {string} [variant] 'classic' (por defecto) | 'diagonal' | 'antiknight' | 'nonconsecutive'
   * @returns {{valid:boolean, unique:boolean, difficulty:string|null, solvedByLogic:boolean,
   *            techniques:Object, hardestTechnique:string|null, clues:number, variant:string}}
   */
  function analyzeDifficulty(board, variant) {
    var V = getVariant(variant);
    var flat = flattenBoard(board);
    var clues = 0;
    for (var i = 0; i < 81; i++) { if (flat[i]) { clues++; } }
    var n = search(flat, 2, null, V).count;
    if (n === 0) {
      return { valid: false, unique: false, difficulty: null, solvedByLogic: false,
        techniques: emptyCounts(), hardestTechnique: null, clues: clues, variant: V.name };
    }
    var a = analyzeFlat(flat, V);
    return {
      valid: true,
      unique: n === 1,
      difficulty: a.difficulty,
      solvedByLogic: a.solved,
      techniques: a.counts,
      hardestTechnique: a.hardest,
      clues: clues,
      variant: V.name
    };
  }

  /* ===========================================================================
   * Generador de tableros con solución única y dificultad real
   * ========================================================================= */

  function budgetError() {
    var e = new Error('Presupuesto de tiempo agotado generando el tablero.');
    e.code = 'budget';
    return e;
  }

  /**
   * Un intento reanudable: parte de una solución completa y remueve celdas (en pares simétricos
   * por rotación de 180° si `symmetric`), conservando siempre solución única (backtracking)
   * y sin superar la dificultad objetivo (solucionador lógico). Respeta la variante.
   * `deadline` (ms epoch) y UNIQ_NODES acotan cada búsqueda: una prueba ABORTADA no cuenta como "única" (la celda se conserva),
   * y si el plazo vence a mitad de la poda el intento termina ahí con lo ya podado (siempre con solución única).
   * `advance(until)` trabaja hasta `until` (ms epoch; 0 = sin corte) y devuelve true al terminar: así la versión asíncrona
   * cede el hilo entre grupos de celdas sin congelar la interfaz.
   */
  function startAttempt(difficulty, rng, symmetric, V, jigGen, deadline) {
    var targetRank = RANK[difficulty];
    var floor = MIN_CLUES[difficulty];
    var solution = null;
    if (jigGen) {
      for (var q = 0; q < 60 && !solution; q++) {
        if (deadline && Date.now() > deadline) { throw budgetError(); }
        V = makeJigsawVariant(randomRegions(rng));
        solution = generateSolvedFlat(rng, V, deadline);
      }
      if (!solution) { throw (deadline && Date.now() > deadline) ? budgetError() : new Error('No se pudo generar un mapa de regiones válido.'); }
    } else {
      solution = generateSolvedFlat(rng, V, deadline);
      if (!solution) { throw budgetError(); }
    }
    var puzzle = solution.slice();
    var groups = [];
    var i;

    if (symmetric) {
      for (i = 0; i <= 40; i++) { groups.push(i === 40 ? [40] : [i, 80 - i]); }
    } else {
      for (i = 0; i < 81; i++) { groups.push([i]); }
    }
    shuffle(groups, rng);

    var clues = 81, g = 0;
    return {
      advance: function (until) {
        for (; g < groups.length; g++) {
          if (deadline && Date.now() > deadline) { g = groups.length; break; }   // plazo agotado: se queda con lo podado
          if (until && Date.now() >= until) { return false; }
          var group = groups[g];
          if (clues - group.length < floor) { continue; }

          var saved = [];
          for (i = 0; i < group.length; i++) { saved.push(puzzle[group[i]]); puzzle[group[i]] = 0; }

          var r = search(puzzle, 2, null, V, UNIQ_NODES, deadline);
          var ok = !r.aborted && r.count === 1; // unicidad confirmada por backtracking (abortada = no confirmada)
          if (ok && targetRank < RANK.extremo) {
            var a = analyzeFlat(puzzle, V);
            ok = a.solved && RANK[a.difficulty] <= targetRank;
          }
          if (ok) {
            clues -= group.length;
          } else {
            for (i = 0; i < group.length; i++) { puzzle[group[i]] = saved[i]; }
          }
        }
        return true;
      },
      finish: function () {
        return { puzzle: puzzle, solution: solution, clues: clues, analysis: analyzeFlat(puzzle, V), V: V };
      }
    };
  }

  function createGenerator(difficulty, options) {
    if (RANK[difficulty] === undefined) {
      throw new RangeError("Dificultad inválida: '" + difficulty + "'. Use: " + DIFFICULTIES.join(', ') + '.');
    }
    if (typeof options === 'string') { options = { variant: options }; } // atajo: generatePuzzle('facil', 'diagonal')
    options = options || {};
    var jigGen = false, V;
    if (options.variant === 'jigsaw' || (options.variant && typeof options.variant === 'object' && options.variant.name === 'jigsaw')) {
      var given = options.regions || (options.variant && options.variant.regions);
      if (given) { V = makeJigsawVariant(given); } else { jigGen = true; V = VARIANTS.classic; }
    } else {
      V = getVariant(options.variant);
    }
    var rng = createRng(options.seed);
    // Los niveles altos aciertan la dificultad exacta con menos frecuencia: más intentos (cada uno cuesta ~1 ms).
    var maxAttempts = options.maxAttempts > 0 ? options.maxAttempts : (RANK[difficulty] >= RANK.experto ? 500 : 60);
    var budget = options.timeBudgetMs > 0 ? options.timeBudgetMs : 8000;
    // Extremo: sin simetría, para quitar más pistas (tableros con muy pocas pistas iniciales).
    var symmetric = options.symmetric !== false && difficulty !== 'extremo';
    var start = Date.now();
    var deadline = start + budget;     // plazo DURO: lo respetan también las búsquedas internas
    var attempts = 0;
    var best = null;
    var cur = null;

    return {
      // Avanza el trabajo. `sliceMs` (opcional) limita cuánto trabaja antes de devolver false para ceder el hilo.
      // Devuelve true cuando ya no hay que seguir.
      step: function (sliceMs) {
        if (!cur) {
          try { cur = startAttempt(difficulty, rng, symmetric, V, jigGen, deadline); }
          catch (e) { if (best && e && e.code === 'budget') { return true; } throw e; }
        }
        if (!cur.advance(sliceMs > 0 ? Date.now() + sliceMs : 0)) { return false; }
        var a = cur.finish(); cur = null;
        attempts++;
        a.distance = Math.abs(RANK[a.analysis.difficulty] - RANK[difficulty]);
        if (!best || a.distance < best.distance) { best = a; }
        return best.distance === 0 || attempts >= maxAttempts || Date.now() >= deadline;
      },
      result: function () {
        var c = best.analysis.counts;
        return {
          puzzle: unflatten(best.puzzle),
          solution: unflatten(best.solution),
          difficulty: best.analysis.difficulty,
          requested: difficulty,
          variant: best.V.name,
          regions: best.V.jig ? best.V.regions.slice() : undefined,
          exact: best.analysis.difficulty === difficulty,
          clues: best.clues,
          techniques: {
            nakedSingle: c.nakedSingle, hiddenSingle: c.hiddenSingle, nakedPair: c.nakedPair,
            pointing: c.pointing, boxLine: c.boxLine, xwing: c.xwing
          },
          hardestTechnique: best.analysis.hardest,
          attempts: attempts
        };
      }
    };
  }

  /**
   * Genera un tablero. Bloqueante (usar en un Web Worker o preferir generatePuzzleAsync).
   * `timeBudgetMs` es un plazo duro: también corta las búsquedas internas; si vence sin ningún tablero lanza un Error con code 'budget'.
   * @param {string} difficulty 'facil' | 'medio' | 'dificil' | 'experto' | 'maestro' | 'extremo'
   * @param {{variant?:string, seed?:number|string, maxAttempts?:number, timeBudgetMs?:number, symmetric?:boolean}} [options]
   *        `variant`: 'classic' (por defecto) | 'diagonal' | 'antiknight' | 'nonconsecutive'.
   * @returns {{puzzle:number[][], solution:number[][], difficulty:string, requested:string, variant:string,
   *            exact:boolean, clues:number, techniques:Object, hardestTechnique:string|null, attempts:number}}
   */
  function generatePuzzle(difficulty, options) {
    var gen = createGenerator(difficulty, options);
    while (!gen.step()) { /* sigue intentando hasta lograr la dificultad pedida */ }
    return gen.result();
  }

  /** Igual que generatePuzzle pero cede el hilo cada ~12 ms (también dentro de un intento): no congela la interfaz. */
  function generatePuzzleAsync(difficulty, options) {
    return new Promise(function (resolve, reject) {
      var gen;
      try { gen = createGenerator(difficulty, options); } catch (e) { reject(e); return; }
      (function loop() {
        try {
          if (gen.step(12)) { resolve(gen.result()); } else { setTimeout(loop, 0); }
        } catch (e) { reject(e); }
      }());
    });
  }

  /* ===========================================================================
   * Validación
   * ========================================================================= */

  function cellConflictsFlat(flat, idx, value, V) {
    var out = [];
    if (!value) { return out; }
    var peers = (V || VARIANTS.classic).peers[idx];
    for (var k = 0; k < peers.length; k++) { if (flat[peers[k]] === value) { out.push(peers[k]); } }
    if (V && V.nonc) {
      var ad = ADJ[idx];
      for (k = 0; k < ad.length; k++) {
        if (flat[ad[k]] && Math.abs(flat[ad[k]] - value) === 1) { out.push(ad[k]); }
      }
    }
    return out;
  }

  /**
   * Celdas que chocan (misma fila, columna, bloque y, según la variante, diagonal o salto de
   * caballo) con `value` colocado en (row, col).
   * Si no se pasa `value`, se usa el que ya está en el tablero.
   * @returns {{row:number, col:number}[]}
   */
  function getCellConflicts(board, row, col, value, variant) {
    checkCoords(row, col);
    var V = getVariant(variant);
    var flat = flattenBoard(board);
    var v = value === undefined ? flat[row * 9 + col] : value;
    return cellConflictsFlat(flat, row * 9 + col, v, V).map(function (p) {
      return { row: ROW[p], col: COL[p] };
    });
  }

  /** true si colocar `value` en (row, col) no genera conflictos inmediatos. */
  function isValidPlacement(board, row, col, value, variant) {
    if (value !== (value | 0) || value < 1 || value > 9) { return false; }
    return getCellConflicts(board, row, col, value, variant).length === 0;
  }

  /** Todas las celdas con valor que están en conflicto con otra. @returns {{row,col,value}[]} */
  function getConflicts(board, variant) {
    var V = getVariant(variant);
    var flat = flattenBoard(board);
    var out = [];
    for (var i = 0; i < 81; i++) {
      if (flat[i] && cellConflictsFlat(flat, i, flat[i], V).length) {
        out.push({ row: ROW[i], col: COL[i], value: flat[i] });
      }
    }
    return out;
  }

  /** true si no quedan celdas vacías. */
  function isComplete(board) {
    var flat = flattenBoard(board);
    for (var i = 0; i < 81; i++) { if (flat[i] === 0) { return false; } }
    return true;
  }

  /**
   * true si el tablero está completo y correcto. Con `solution` compara contra ella;
   * sin `solution` verifica que cumpla todas las reglas de la variante.
   */
  function isSolved(board, solution, variant) {
    var flat = flattenBoard(board);
    var i;
    for (i = 0; i < 81; i++) { if (flat[i] === 0) { return false; } }
    if (solution) {
      var sol = flattenBoard(solution);
      for (i = 0; i < 81; i++) { if (flat[i] !== sol[i]) { return false; } }
      return true;
    }
    var V = getVariant(variant);
    for (i = 0; i < 81; i++) { if (cellConflictsFlat(flat, i, flat[i], V).length) { return false; } }
    return true;
  }

  /** Celdas llenas cuyo valor difiere de la solución. @returns {{row,col,value,expected}[]} */
  function findWrongCells(board, solution) {
    var flat = flattenBoard(board);
    var sol = flattenBoard(solution);
    var out = [];
    for (var i = 0; i < 81; i++) {
      if (flat[i] !== 0 && flat[i] !== sol[i]) {
        out.push({ row: ROW[i], col: COL[i], value: flat[i], expected: sol[i] });
      }
    }
    return out;
  }

  /** Candidatos posibles por celda (para "notas automáticas"). @returns {number[][][]} */
  function computeCandidates(board, variant) {
    var V = getVariant(variant);
    var flat = flattenBoard(board);
    var out = [];
    for (var r = 0; r < 9; r++) {
      var row = [];
      for (var c = 0; c < 9; c++) {
        var i = r * 9 + c;
        row.push(flat[i] ? [] : maskDigits(candidateMaskFlat(flat, i, V)));
      }
      out.push(row);
    }
    return out;
  }

  function candidateMaskFlat(flat, idx, V) {
    var used = 0, peers = (V || VARIANTS.classic).peers[idx];
    for (var k = 0; k < peers.length; k++) {
      if (flat[peers[k]]) { used |= 1 << (flat[peers[k]] - 1); }
    }
    if (V && V.nonc) {
      var ad = ADJ[idx];
      for (k = 0; k < ad.length; k++) { if (flat[ad[k]]) { used |= consecMask(flat[ad[k]]); } }
    }
    return ALL & ~used;
  }

  /* ===========================================================================
   * Pistas inteligentes
   * ========================================================================= */

  function unitLabel(u, V) {
    if (u < 9) { return 'la fila ' + (u + 1); }
    if (u < 18) { return 'la columna ' + (u - 8); }
    if (u < 27) { return (V && V.jig) ? 'la región ' + (u - 17) : 'el bloque ' + BLOCK_NAMES[u - 18]; }
    return u === 27 ? 'la diagonal principal' : 'la diagonal secundaria';
  }

  function unitDemonstrative(u, V) {
    if (u < 9) { return 'esta fila'; }
    if (u < 18) { return 'esta columna'; }
    if (u < 27) { return (V && V.jig) ? 'esta región' : 'este bloque'; }
    return 'esta diagonal';
  }

  // Dónde "ve" una celda otros números (texto de las pistas de Naked Single).
  function seenWhere(V, idx) {
    if (V.diag && DG[idx]) { return 'su fila, columna, bloque o diagonal'; }
    if (V.jig) { return 'su fila, columna o región'; }
    if (V.knight) { return 'su fila, columna o bloque, o a un salto de caballo'; }
    if (V.nonc) { return 'su fila, columna o bloque, o son consecutivos de una celda vecina'; }
    return 'su fila, columna o bloque';
  }

  function joinList(list) {
    if (list.length <= 1) { return list.join(''); }
    return list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];
  }

  function cellsOfUnit(V, u) {
    return V.units[u].map(function (p) { return { row: ROW[p], col: COL[p] }; });
  }

  function emptyCountInUnit(st, u) {
    var n = 0, cells = st.V.units[u];
    for (var k = 0; k < 9; k++) { if (st.grid[cells[k]] === 0) { n++; } }
    return n;
  }

  function noteList(notes, r, c) {
    if (!notes || !notes[r]) { return []; }
    var cell = notes[r][c];
    if (!cell) { return []; }
    if (typeof Set !== 'undefined' && cell instanceof Set) { return Array.from(cell); }
    return Array.isArray(cell) ? cell : [];
  }

  // Pequeño desempate a favor de celdas donde el usuario ya tiene notas coherentes con el valor.
  function noteBonus(notes, idx, value) {
    var list = noteList(notes, ROW[idx], COL[idx]);
    if (!list.length) { return 0; }
    if (list.indexOf(value) === -1) { return -2; }
    return Math.max(0, 5 - list.length);
  }

  function describeElimination(step, V) {
    if (step.technique === 'nakedPair') {
      return 'un par desnudo de ' + joinList(maskDigits(step.mask)) + ' en ' + unitLabel(step.unit, V);
    }
    if (step.technique === 'pointing') {
      return (step.cells.length === 3 ? 'un trío apuntador' : 'un par apuntador') +
        ' (el ' + step.digit + ' de ' + unitLabel(step.unit, V) + ' solo cabe en ' + unitLabel(step.line, V) + ')';
    }
    if (step.technique === 'xwing') {
      var fl = step.byRows ? 'filas' : 'columnas', cl = step.byRows ? 'columnas' : 'filas';
      return 'un X-Wing del ' + step.digit + ' (en las ' + fl + ' ' + (step.lines[0] + 1) + ' y ' + (step.lines[1] + 1) +
        ' solo cabe en las ' + cl + ' ' + (step.covers[0] + 1) + ' y ' + (step.covers[1] + 1) + ')';
    }
    return 'una reducción bloque-línea (el ' + step.digit + ' de ' + unitLabel(step.unit, V) +
      ' solo cabe en ' + unitLabel(18 + step.box, V) + ')';
  }

  var TECHNIQUE_SHORT = {
    nakedPair: 'par desnudo',
    pointing: 'par apuntador',
    boxLine: 'reducción bloque-línea',
    xwing: 'X-Wing'
  };

  function describeEliminations(steps, V) {
    if (steps.length === 1) { return describeElimination(steps[0], V); }
    var names = [];
    steps.forEach(function (s) {
      var n = TECHNIQUE_SHORT[s.technique];
      if (names.indexOf(n) === -1) { names.push(n); }
    });
    return 'varios descartes (' + joinList(names) + ')';
  }

  function scoreNakedSingle(st, s) {
    var idx = s.idx, V = st.V;
    var units = [18 + V.box[idx], ROW[idx], 9 + COL[idx]]; // preferencia: bloque, fila, columna
    for (var e = 0; e < V.extraUnits.length; e++) {      // luego diagonales (solo en 'diagonal')
      if (V.member[V.extraUnits[e]][idx]) { units.push(V.extraUnits[e]); }
    }
    for (var k = 0; k < units.length; k++) {
      if (emptyCountInUnit(st, units[k]) === 1) {
        return {
          score: 200 + (2 - k),
          core: 'Última celda vacía de ' + unitDemonstrative(units[k], V) + ': solo falta el ' + s.value,
          unit: units[k]
        };
      }
    }
    var visible = 0, peers = V.peers[idx];
    for (var j = 0; j < peers.length; j++) { if (st.grid[peers[j]] !== 0) { visible++; } }
    return {
      score: 100 + visible,
      core: 'Esta celda solo admite el ' + s.value + ': los demás números ya aparecen en ' + seenWhere(V, idx),
      unit: -1
    };
  }

  function scoreHiddenSingle(st, s) {
    var kind = Math.floor(s.unit / 9); // 0 fila, 1 columna, 2 bloque, 3 diagonal
    var filled = 9 - emptyCountInUnit(st, s.unit);
    var typeBonus = kind === 2 ? 2 : (kind === 0 ? 1 : 0);
    return {
      score: 50 + filled * 3 + typeBonus,
      core: 'Único lugar posible para el ' + s.value + ' en ' + unitDemonstrative(s.unit, st.V),
      unit: s.unit
    };
  }

  // Elige, entre las colocaciones directas disponibles, la más evidente para una persona.
  function pickPlacement(st, notes) {
    var best = null, bestScore = -Infinity, k, info, total, list;

    list = listNakedSingles(st, false);
    for (k = 0; k < list.length; k++) {
      info = scoreNakedSingle(st, list[k]);
      total = info.score + noteBonus(notes, list[k].idx, list[k].value);
      if (total > bestScore) {
        bestScore = total;
        best = { idx: list[k].idx, value: list[k].value, technique: 'nakedSingle', core: info.core, unit: info.unit };
      }
    }
    if (best) { return best; }

    list = listHiddenSingles(st, false);
    for (k = 0; k < list.length; k++) {
      info = scoreHiddenSingle(st, list[k]);
      total = info.score + noteBonus(notes, list[k].idx, list[k].value);
      if (total > bestScore) {
        bestScore = total;
        best = { idx: list[k].idx, value: list[k].value, technique: 'hiddenSingle', core: info.core, unit: info.unit };
      }
    }
    return best;
  }

  function makeHint(idx, value, reason, type, technique, via, related) {
    return {
      row: ROW[idx],
      col: COL[idx],
      value: value,
      reason: reason,
      type: type,           // 'error' | 'single' | 'advanced' | 'solution'
      technique: technique, // técnica con la que se coloca el valor (o null)
      via: via || [],       // técnicas de descarte previas (pares, pointing, box-line)
      related: related || []
    };
  }

  function isKnightApart(a, b) {
    var dr = Math.abs(ROW[a] - ROW[b]), dc = Math.abs(COL[a] - COL[b]);
    return (dr === 1 && dc === 2) || (dr === 2 && dc === 1);
  }

  function buildErrorHint(flat, sol, idx, V) {
    var wrong = flat[idx];
    var correct = sol[idx];
    var conflicts = cellConflictsFlat(flat, idx, wrong, V);
    var reason;
    if (conflicts.length) {
      var where = [];
      var inRow = false, inCol = false, inBox = false, inDiag = false, inKnight = false, inConsec = false;
      conflicts.forEach(function (p) {
        if (flat[p] !== wrong) { inConsec = true; return; }
        if (ROW[p] === ROW[idx]) { inRow = true; }
        if (COL[p] === COL[idx]) { inCol = true; }
        if (V.box[p] === V.box[idx]) { inBox = true; }
        if (V.diag && (DG[p] & DG[idx])) { inDiag = true; }
        if (V.knight && isKnightApart(p, idx)) { inKnight = true; }
      });
      if (inRow) { where.push('su fila'); }
      if (inCol) { where.push('su columna'); }
      if (inBox) { where.push(V.jig ? 'su región' : 'su bloque'); }
      if (inDiag) { where.push('su diagonal'); }
      if (inKnight) { where.push('una celda a salto de caballo'); }
      var parts = [];
      if (where.length) { parts.push('está repetido en ' + joinList(where)); }
      if (inConsec) {
        var lo = wrong > 1 ? String(wrong - 1) : '', hi = wrong < 9 ? String(wrong + 1) : '';
        parts.push('queda pegado a un número consecutivo (' + (lo && hi ? lo + ' o ' + hi : lo + hi) + ') en una celda vecina');
      }
      reason = 'Hay un error: el ' + wrong + ' ' + parts.join(' y ') +
        '. En esta celda debe ir el ' + correct + '.';
    } else {
      reason = 'Hay un error: el ' + wrong + ' no es correcto aquí (aunque no choque con otro número). ' +
        'En esta celda debe ir el ' + correct + '.';
    }
    var related = conflicts.map(function (p) { return { row: ROW[p], col: COL[p] }; });
    return makeHint(idx, correct, reason, 'error', null, [], related);
  }

  /**
   * Pista inteligente.
   * 1) Si el usuario puso algún número que no coincide con la solución, señala ese error
   *    (prioriza los que además generan conflicto visible) y da el valor correcto.
   * 2) Si no hay errores, busca la colocación lógica más evidente (Naked Single, Hidden Single;
   *    si hace falta, aplica antes Naked Pairs / Pointing / Box-Line sobre una copia del tablero).
   * 3) Si ninguna técnica lo resuelve, indica la celda con menos candidatos usando la solución.
   * Las notas (opcionales) solo sirven de desempate entre pistas igual de evidentes.
   * Todas las deducciones respetan las restricciones de la variante.
   *
   * @param {number[][]} board    Estado actual (0 = vacío).
   * @param {number[][]} solution Solución completa del tablero.
   * @param {Array<Array<number[]|Set<number>>>} [notes] Notas 9x9 del usuario por celda.
   * @param {string} [variant] 'classic' (por defecto) | 'diagonal' | 'antiknight' | 'nonconsecutive'
   * @returns {{row:number, col:number, value:number, reason:string, type:string,
   *            technique:string|null, via:string[], related:{row:number,col:number}[]}|null}
   *          null si el tablero ya está completo y correcto.
   */
  function getSmartHint(board, solution, notes, variant) {
    var V = getVariant(variant);
    var flat = flattenBoard(board);
    var sol = solution ? flattenBoard(solution) : search(flat, 1, null, V).first;
    if (!sol) { throw new Error('No se pudo determinar la solución del tablero.'); }

    var i;

    // 1) Errores respecto a la solución.
    var firstError = -1, firstConflictError = -1;
    for (i = 0; i < 81; i++) {
      if (flat[i] !== 0 && flat[i] !== sol[i]) {
        if (firstError < 0) { firstError = i; }
        if (firstConflictError < 0 && cellConflictsFlat(flat, i, flat[i], V).length) { firstConflictError = i; }
      }
    }
    if (firstError >= 0) {
      return buildErrorHint(flat, sol, firstConflictError >= 0 ? firstConflictError : firstError, V);
    }

    // Tablero completo y correcto: no hay nada que sugerir.
    var empty = false;
    for (i = 0; i < 81; i++) { if (flat[i] === 0) { empty = true; break; } }
    if (!empty) { return null; }

    // 2) Siguiente paso lógico.
    var st = createLogicState(flat, V);
    if (st) {
      var applied = [];
      for (var guard = 0; guard < 500; guard++) {
        var pick = pickPlacement(st, notes);
        if (pick) {
          if (pick.value !== sol[pick.idx]) { break; } // salvaguarda: nunca contradecir la solución
          var reason = pick.core + '.';
          var via = [];
          if (applied.length) {
            reason = 'Tras aplicar ' + describeEliminations(applied, V) + ': ' +
              pick.core.charAt(0).toLowerCase() + pick.core.slice(1) + '.';
            applied.forEach(function (s) { if (via.indexOf(s.technique) === -1) { via.push(s.technique); } });
          }
          return makeHint(
            pick.idx, pick.value, reason,
            applied.length ? 'advanced' : 'single',
            pick.technique, via,
            pick.unit >= 0 ? cellsOfUnit(V, pick.unit) : []
          );
        }
        var adv = findAdvancedStep(st);
        if (!adv) { break; }
        applyStep(st, adv);
        applied.push(adv);
      }
    }

    // 3) Respaldo: celda con menos candidatos, valor tomado de la solución.
    var bestIdx = -1, bestCount = 10, bestVisible = -1;
    for (i = 0; i < 81; i++) {
      if (flat[i] !== 0) { continue; }
      var mask = candidateMaskFlat(flat, i, V);
      var n = POP[mask];
      var vis = 0;
      for (var k = 0; k < V.peers[i].length; k++) { if (flat[V.peers[i][k]] !== 0) { vis++; } }
      if (n < bestCount || (n === bestCount && vis > bestVisible)) {
        bestIdx = i; bestCount = n; bestVisible = vis;
      }
    }
    var cands = maskDigits(candidateMaskFlat(flat, bestIdx, V));
    return makeHint(
      bestIdx, sol[bestIdx],
      'Esta celda admite solo ' + joinList(cands.map(String)) + '; por descarte, aquí va el ' + sol[bestIdx] + '.',
      'solution', null, [], []
    );
  }

  /* ===========================================================================
   * API pública
   * ========================================================================= */

  return {
    DIFFICULTIES: DIFFICULTIES.slice(),
    VARIANTS: VARIANT_NAMES.slice(),
    DEFAULT_VARIANT: 'classic',
    randomRegions: randomRegions,
    validateRegions: normalizeRegions,

    // Generación y análisis
    generatePuzzle: generatePuzzle,
    generatePuzzleAsync: generatePuzzleAsync,
    _jigCache: JIG_CACHE, JIG_CACHE_MAX: JIG_CACHE_MAX,
    analyzeDifficulty: analyzeDifficulty,

    // Resolución
    solve: solve,
    countSolutions: countSolutions,
    hasUniqueSolution: hasUniqueSolution,

    // Pistas
    getSmartHint: getSmartHint,
    computeCandidates: computeCandidates,

    // Validación
    getCellConflicts: getCellConflicts,
    isValidPlacement: isValidPlacement,
    getConflicts: getConflicts,
    findWrongCells: findWrongCells,
    isComplete: isComplete,
    isSolved: isSolved,
    isBoardCompleteAndCorrect: isSolved,

    // Utilidades de tablero
    cloneBoard: cloneBoard,
    boardToString: boardToString,
    boardFromString: boardFromString
  };
}));
