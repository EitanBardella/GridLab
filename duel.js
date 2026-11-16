/*!
 * duel.js — Duelos por enlace compartible + Modo Fantasma para la PWA de Sudoku
 * -----------------------------------------------------------------------------
 * JavaScript puro, sin dependencias, sin servidor. Funciona de dos formas:
 *   - <script src="duel.js"> ..... expone el global `SudokuDuel`
 *   - Node / pruebas: const D = require('./duel.js')
 *
 * Qué hace este módulo (no toca el DOM ni el motor del juego):
 *   1) Serializa / valida un desafío como un hash `#duel=<Base64URL>`.
 *   2) `DuelRecorder`: graba, celda a celda, cuándo resolvió el jugador cada casilla
 *      (el "fantasma"), más errores y pistas.
 *   3) Historial cara a cara por alias de rival + registro de enlaces ya jugados.
 *   4) Utilidades para la interfaz: progreso del fantasma, destellos, compartir enlace.
 *
 * Formato binario del payload (big-endian), versión 1:
 *   offset  bytes  campo
 *   0       1      v        versión del protocolo (1)
 *   1       1      m        modo: 0 clásico, 1 killer, 2 diagonal, 3 anti-caballo
 *   2       1      d        dificultad: 1 fácil, 2 medio, 3 difícil, 4 experto
 *   3       4      s        semilla Uint32 (compatible con Mulberry32 de los motores)
 *   7       2      t        tiempo final del retador en segundos (con penalizaciones)
 *   9       1      e        errores cometidos (máx. 255)
 *   10      1      p        pistas usadas (máx. 255)
 *   11      1      nameLen  longitud del alias en bytes UTF-8 (0–12)
 *   12      n      alias    UTF-8
 *   12+n    1      moveCount cantidad de pares siguientes
 *   13+n    2*k    pares [cellIndex 0–80, deltaSeconds 0–255], cronológicos
 *
 *   Pausas largas: un par [255, 255] ("salto") no es una celda: solo avanza el reloj 255 s.
 *   Así se pueden representar partidas con más de 255 s entre dos celdas sin cambiar el formato.
 *
 * IMPORTANTE (determinismo): el tablero de un duelo se regenera en el teléfono del rival a
 * partir de (modo, dificultad, semilla). Para que ambos obtengan EXACTAMENTE el mismo tablero,
 * la app debe generar siempre con la misma configuración (ver notas en app.js).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SudokuDuel = factory();
  }
}(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ===========================================================================
   * Constantes
   * ========================================================================= */

  var VERSION = 1;
  var MODES = ['classic', 'killer', 'diagonal', 'antiknight'];            // código = índice
  var DIFFS = ['facil', 'medio', 'dificil', 'experto'];                    // código = índice + 1
  var MODE_LABELS = { classic: 'Clásico', killer: 'Killer', diagonal: 'Diagonal', antiknight: 'Anti-Caballo' };
  var DIFF_LABELS = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };

  var HINT_PENALTY = 30;          // segundos que suma cada pista en un duelo
  var MAX_ALIAS_BYTES = 12;
  var MAX_TIME = 65535;           // Uint16
  var ESCAPE = 255;               // par [255, 255] = "avanzar 255 s sin celda"
  var HEADER_BYTES = 12;          // v m d s(4) t(2) e p nameLen
  var MAX_B64_LENGTH = 900;       // tope defensivo antes de decodificar

  var KEY_ALIAS = 'sudoku_player_alias';
  var KEY_HISTORY = 'sudoku_duel_history';
  var MAX_PLAYED = 300;           // enlaces jugados que se recuerdan

  /* ===========================================================================
   * Almacenamiento seguro (localStorage con respaldo en memoria)
   * ========================================================================= */

  var mem = {};
  var storage = {
    get: function (k) {
      try {
        var v = window.localStorage.getItem(k);
        if (v !== null && v !== undefined) { return v; }
      } catch (e) { /* restringido o no disponible */ }
      return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
    },
    set: function (k, v) {
      mem[k] = v;
      try { window.localStorage.setItem(k, v); } catch (e) { /* cuota o modo privado */ }
    }
  };

  /* ===========================================================================
   * Utilidades
   * ========================================================================= */

  var textEnc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  var textDec = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { fatal: true }) : null;

  function clampInt(n, min, max) {
    n = Math.floor(Number(n));
    if (!isFinite(n)) { return min; }
    return n < min ? min : (n > max ? max : n);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Segundos -> "MM:SS" (los minutos pueden pasar de 99). */
  function formatTime(secs) {
    secs = clampInt(secs, 0, 99 * 3600);
    return pad2(Math.floor(secs / 60)) + ':' + pad2(secs % 60);
  }

  /** Hash FNV-1a de 32 bits (el mismo que usan los motores para semillas de texto). */
  function fnv1a(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * Semilla numérica equivalente a una semilla de texto (p. ej. "2026-11-16" de los Desafíos
   * Diarios): los motores aplican `hashSeed`, que para números hace `seed | 0` y para textos
   * FNV-1a; pasar este número da la MISMA secuencia pseudoaleatoria que pasar el texto.
   */
  function seedFromString(str) { return fnv1a(String(str)); }

  /** Semilla Uint32 aleatoria para un tablero nuevo. */
  function randomSeed() {
    try {
      var c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
      if (c) { return c.getRandomValues(new Uint32Array(1))[0] >>> 0; }
    } catch (e) { /* respaldo abajo */ }
    return Math.floor(Math.random() * 4294967296) >>> 0;
  }

  function modeCode(m) {
    if (typeof m === 'string') {
      var i = MODES.indexOf(m);
      if (i >= 0) { return i; }
    } else if (typeof m === 'number' && m === (m | 0) && m >= 0 && m < MODES.length) {
      return m;
    }
    throw new RangeError('Modo inválido: ' + m);
  }

  function diffCode(d) {
    if (typeof d === 'string') {
      var i = DIFFS.indexOf(d);
      if (i >= 0) { return i + 1; }
    } else if (typeof d === 'number' && d === (d | 0) && d >= 1 && d <= DIFFS.length) {
      return d;
    }
    throw new RangeError('Dificultad inválida: ' + d);
  }

  /* ----- Alias ----- */

  // Control, formato bidireccional, espacios de ancho cero y signos que podrían inyectar HTML.
  var BAD_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF<>]/g;

  function truncateUtf8(str, maxBytes) {
    var out = '', bytes = 0;
    for (var ch of str) {                       // recorre por caracteres (no parte emojis)
      var n = textEnc.encode(ch).length;
      if (bytes + n > maxBytes) { break; }
      out += ch; bytes += n;
    }
    return out;
  }

  /** Limpia un alias: sin caracteres raros, espacios colapsados y máx. 12 bytes UTF-8. */
  function sanitizeAlias(raw) {
    var s = String(raw === undefined || raw === null ? '' : raw);
    if (typeof s.normalize === 'function') { s = s.normalize('NFC'); }
    s = s.replace(BAD_CHARS, '').replace(/\s+/g, ' ').trim();
    return truncateUtf8(s, MAX_ALIAS_BYTES).trim();
  }

  /** Alias guardado del jugador ('' si todavía no eligió uno). */
  function getAlias() { return sanitizeAlias(storage.get(KEY_ALIAS) || ''); }

  /** Guarda el alias (ya saneado) y lo devuelve; '' si quedó vacío (no se guarda). */
  function setAlias(raw) {
    var s = sanitizeAlias(raw);
    if (s) { storage.set(KEY_ALIAS, s); }
    return s;
  }

  /* ----- Base64URL (sin relleno) ----- */

  function bytesToB64u(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /** @returns {Uint8Array|null} null si el texto no es Base64URL válido. */
  function b64uToBytes(str) {
    if (!/^[A-Za-z0-9_-]+$/.test(str) || str.length % 4 === 1) { return null; }
    var b = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) { b += '='; }
    var bin;
    try { bin = atob(b); } catch (e) { return null; }
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
    return out;
  }

  /* ===========================================================================
   * Serialización: encodeDuelPayload / decodeDuelPayload
   * ========================================================================= */

  // Normaliza movimientos: celdas válidas, sin duplicados (gana la marca más tardía), orden cronológico.
  function normalizeMoves(moves) {
    var byCell = {}, list = [], k;
    if (!Array.isArray(moves)) { return list; }
    for (k = 0; k < moves.length; k++) {
      var m = moves[k];
      if (!m || m.cell !== (m.cell | 0) || m.cell < 0 || m.cell > 80) { continue; }
      var t = clampInt(m.t, 0, MAX_TIME);
      if (byCell[m.cell] === undefined || t >= byCell[m.cell]) { byCell[m.cell] = t; }
    }
    for (var cell in byCell) {
      if (Object.prototype.hasOwnProperty.call(byCell, cell)) { list.push({ cell: +cell, t: byCell[cell] }); }
    }
    list.sort(function (a, b) { return a.t - b.t || a.cell - b.cell; });
    return list;
  }

  // Convierte movimientos absolutos en pares [celda, delta]. Con `clamp` no usa saltos (límite 255 pares).
  function buildPairs(moves, clamp) {
    var pairs = [], cur = 0;
    for (var k = 0; k < moves.length; k++) {
      var gap = moves[k].t - cur;
      if (clamp) {
        gap = Math.min(gap, 255);
      } else {
        while (gap > 255) { pairs.push([ESCAPE, 255]); cur += 255; gap -= 255; }
      }
      pairs.push([moves[k].cell, gap]);
      cur += gap;
    }
    return pairs;
  }

  /**
   * Empaqueta un desafío en un texto Base64URL (sin `#duel=`).
   * @param {{mode:string|number, diff:string|number, seed:number, time:number, errors?:number,
   *          hints?:number, alias?:string, moves?:{cell:number,t:number}[]}} data
   *        `moves`: celdas resueltas con su segundo absoluto desde el inicio de la partida.
   * @returns {string}
   * @throws {RangeError|TypeError} si faltan datos esenciales o son inválidos.
   */
  function encodeDuelPayload(data) {
    if (!data || typeof data !== 'object') { throw new TypeError('Faltan los datos del desafío.'); }
    if (!textEnc) { throw new Error('Este navegador no soporta TextEncoder.'); }
    var m = modeCode(data.mode), d = diffCode(data.diff);
    var seed = Number(data.seed);
    if (!isFinite(seed)) { throw new TypeError('La semilla debe ser un número.'); }
    seed = Math.floor(seed) >>> 0;
    var time = clampInt(data.time, 0, MAX_TIME);
    var errors = clampInt(data.errors, 0, 255);
    var hints = clampInt(data.hints, 0, 255);
    var nameBytes = textEnc.encode(sanitizeAlias(data.alias) || 'Jugador');

    var moves = normalizeMoves(data.moves);
    var pairs = buildPairs(moves, false);
    if (pairs.length > 255) { pairs = buildPairs(moves, true); }   // partida enorme: sin saltos

    var out = new Uint8Array(HEADER_BYTES + nameBytes.length + 1 + pairs.length * 2);
    var dv = new DataView(out.buffer);
    var p = 0, i;
    dv.setUint8(p++, VERSION);
    dv.setUint8(p++, m);
    dv.setUint8(p++, d);
    dv.setUint32(p, seed, false); p += 4;
    dv.setUint16(p, time, false); p += 2;
    dv.setUint8(p++, errors);
    dv.setUint8(p++, hints);
    dv.setUint8(p++, nameBytes.length);
    for (i = 0; i < nameBytes.length; i++) { out[p++] = nameBytes[i]; }
    dv.setUint8(p++, pairs.length);
    for (i = 0; i < pairs.length; i++) { out[p++] = pairs[i][0]; out[p++] = pairs[i][1]; }
    return bytesToB64u(out);
  }

  function fail(error) { return { ok: false, error: error }; }

  /**
   * Lee y valida un desafío. Acepta `#duel=XXXX`, `duel=XXXX` o solo `XXXX`.
   * Nunca lanza: ante un enlace roto o manipulado devuelve { ok:false, error }.
   * Errores posibles: empty, too-long, format, truncated, version, mode, difficulty,
   *                   alias, length, moves, unsupported.
   * @returns {{ok:true, id:string, data:{version:number, mode:string, modeCode:number, diff:string,
   *            diffCode:number, seed:number, time:number, errors:number, hints:number, alias:string,
   *            moves:{cell:number,t:number}[]}} | {ok:false, error:string}}
   */
  function decodeDuelPayload(input) {
    try {
      var str = String(input === undefined || input === null ? '' : input).trim();
      if (!str) { return fail('empty'); }
      var found = /(?:^|[#&?])duel=([^&#\s]*)/.exec(str);
      var b64 = found ? found[1] : str;
      if (!b64) { return fail('empty'); }
      if (b64.length > MAX_B64_LENGTH) { return fail('too-long'); }
      if (!textDec) { return fail('unsupported'); }

      var bytes = b64uToBytes(b64);
      if (!bytes) { return fail('format'); }
      if (bytes.length < HEADER_BYTES + 1) { return fail('truncated'); }

      var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      if (dv.getUint8(0) !== VERSION) { return fail('version'); }
      var m = dv.getUint8(1), d = dv.getUint8(2);
      if (m >= MODES.length) { return fail('mode'); }
      if (d < 1 || d > DIFFS.length) { return fail('difficulty'); }
      var seed = dv.getUint32(3, false);
      var time = dv.getUint16(7, false);
      var errors = dv.getUint8(9), hints = dv.getUint8(10);
      var nameLen = dv.getUint8(11);
      if (nameLen > MAX_ALIAS_BYTES) { return fail('alias'); }
      if (bytes.length < HEADER_BYTES + nameLen + 1) { return fail('truncated'); }

      var alias;
      try { alias = textDec.decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + nameLen)); } catch (e) { return fail('alias'); }
      alias = sanitizeAlias(alias) || 'Rival';

      var count = dv.getUint8(HEADER_BYTES + nameLen);
      var expected = HEADER_BYTES + nameLen + 1 + count * 2;
      if (bytes.length !== expected) { return fail('length'); }   // truncado, con basura o manipulado

      var moves = [], seen = {}, cur = 0, p = HEADER_BYTES + nameLen + 1;
      for (var k = 0; k < count; k++, p += 2) {
        var cell = bytes[p], delta = bytes[p + 1];
        cur += delta;
        if (cur > MAX_TIME) { return fail('moves'); }
        if (cell === ESCAPE) { continue; }                          // salto de reloj, no es celda
        if (cell > 80 || seen[cell]) { return fail('moves'); }
        seen[cell] = true;
        moves.push({ cell: cell, t: cur });
      }

      return {
        ok: true,
        id: fnv1a(b64).toString(36) + '.' + b64.length.toString(36),
        data: {
          version: VERSION, mode: MODES[m], modeCode: m, diff: DIFFS[d - 1], diffCode: d,
          seed: seed, time: time, errors: errors, hints: hints, alias: alias, moves: moves
        }
      };
    } catch (e) {
      return fail('format');
    }
  }

  /* ===========================================================================
   * Enlaces y hash de la URL
   * ========================================================================= */

  /** URL completa de la app (sin hash previo) con `#duel=<encoded>`. */
  function buildLink(encoded) {
    var base = String(window.location.href).split('#')[0];
    return base + '#duel=' + encoded;
  }

  /** Lee `location.hash`: null si no hay `duel=`; si lo hay, el resultado de decodeDuelPayload. */
  function readLocationHash() {
    var h = '';
    try { h = String(window.location.hash || ''); } catch (e) { return null; }
    if (!/(?:^|[#&])duel=/.test(h)) { return null; }
    return decodeDuelPayload(h);
  }

  /** Quita el hash de la URL sin recargar ni agregar una entrada al historial. */
  function clearHash() {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      try { window.location.hash = ''; } catch (e2) { /* ignorar */ }
    }
  }

  /* ===========================================================================
   * DuelRecorder: grabación del fantasma en tiempo real
   * ========================================================================= */

  /**
   * Registra cuándo quedó correctamente resuelta cada celda (no dada) del tablero.
   * Uso: llamar a `sync(...)` tras CADA cambio del tablero (colocar, borrar, deshacer, pista).
   *   - Una celda correcta sin marca recibe el segundo actual.
   *   - Una celda que deja de ser correcta (borrada, deshecha o reemplazada por un error)
   *     pierde su marca; si se vuelve a resolver, se guarda la nueva marca válida.
   * Los segundos deben ser el TIEMPO EFECTIVO (cronómetro + penalizaciones) para que el fantasma
   * quede alineado con el tiempo final `t` del enlace.
   */
  function DuelRecorder(saved) {
    this.reset();
    if (saved) { this.load(saved); }
  }

  DuelRecorder.prototype.reset = function () {
    this.marks = new Array(81).fill(-1);   // segundo en que se resolvió cada celda (-1 = sin resolver)
    this.errors = 0;
    this.hints = 0;
    return this;
  };

  /**
   * @param {number[][]} board    Estado actual (0 = vacío).
   * @param {number[][]} solution Solución completa.
   * @param {number[][]} puzzle   Pistas iniciales (las celdas dadas no cuentan como movimientos).
   * @param {number} secs         Tiempo efectivo actual en segundos.
   */
  DuelRecorder.prototype.sync = function (board, solution, puzzle, secs) {
    var t = clampInt(secs, 0, MAX_TIME);
    for (var r = 0; r < 9; r++) {
      for (var c = 0; c < 9; c++) {
        var i = r * 9 + c;
        if (puzzle && puzzle[r][c]) { this.marks[i] = -1; continue; }
        var v = board[r][c];
        if (v !== 0 && v === solution[r][c]) {
          if (this.marks[i] < 0) { this.marks[i] = t; }
        } else if (this.marks[i] >= 0) {
          this.marks[i] = -1;
        }
      }
    }
    return this;
  };

  /** Suma un error (colocar un número distinto del correcto). */
  DuelRecorder.prototype.addError = function () { this.errors = Math.min(255, this.errors + 1); return this; };
  /** Suma una pista usada. */
  DuelRecorder.prototype.addHint = function () { this.hints = Math.min(255, this.hints + 1); return this; };

  /** Celdas resueltas hasta ahora, en orden cronológico. @returns {{cell:number,t:number}[]} */
  DuelRecorder.prototype.moves = function () {
    var out = [];
    for (var i = 0; i < 81; i++) { if (this.marks[i] >= 0) { out.push({ cell: i, t: this.marks[i] }); } }
    out.sort(function (a, b) { return a.t - b.t || a.cell - b.cell; });
    return out;
  };

  /** Cantidad de celdas no dadas resueltas correctamente. */
  DuelRecorder.prototype.solvedCount = function () {
    var n = 0;
    for (var i = 0; i < 81; i++) { if (this.marks[i] >= 0) { n++; } }
    return n;
  };

  /**
   * Datos listos para `encodeDuelPayload`.
   * @param {{mode:string, diff:string, seed:number, time:number, alias?:string}} meta
   */
  DuelRecorder.prototype.toPayload = function (meta) {
    return {
      mode: meta.mode, diff: meta.diff, seed: meta.seed, time: meta.time,
      alias: meta.alias, errors: this.errors, hints: this.hints, moves: this.moves()
    };
  };

  /** Estado serializable (para guardarlo dentro de la partida y poder continuarla). */
  DuelRecorder.prototype.toJSON = function () {
    return { m: this.marks.slice(), e: this.errors, h: this.hints };
  };

  /** Restaura desde `toJSON()`. Ignora datos inválidos (queda vacío). */
  DuelRecorder.prototype.load = function (obj) {
    this.reset();
    if (!obj || !Array.isArray(obj.m) || obj.m.length !== 81) { return this; }
    for (var i = 0; i < 81; i++) {
      var v = obj.m[i];
      this.marks[i] = (v === (v | 0) && v >= 0 && v <= MAX_TIME) ? v : -1;
    }
    this.errors = clampInt(obj.e, 0, 255);
    this.hints = clampInt(obj.h, 0, 255);
    return this;
  };

  /* ===========================================================================
   * Fantasma: ayudas para la barra de progreso y los destellos
   * ========================================================================= */

  /**
   * Progreso del rival en "X/81": pistas iniciales (ya visibles para ambos) + movimientos
   * del fantasma con marca <= `secs`.
   */
  function ghostProgress(moves, secs, givens) {
    var n = clampInt(givens, 0, 81);
    for (var i = 0; i < moves.length; i++) { if (moves[i].t <= secs) { n++; } }
    return Math.min(81, n);
  }

  /**
   * Celdas que el fantasma completó en el intervalo (after, upTo]. Usar con el segundo anterior
   * y el actual para no perder destellos si el reloj salta (pestaña en segundo plano, etc.).
   * @returns {number[]} índices de celda 0–80
   */
  function ghostCellsBetween(moves, after, upTo) {
    var out = [];
    for (var i = 0; i < moves.length; i++) {
      if (moves[i].t > after && moves[i].t <= upTo) { out.push(moves[i].cell); }
    }
    return out;
  }

  /** Tiempo efectivo = cronómetro + penalización por pistas. */
  function effectiveTime(secs, hintsUsed) {
    return clampInt(secs, 0, MAX_TIME) + HINT_PENALTY * clampInt(hintsUsed, 0, 255);
  }

  /** Compara tiempos: 'win' (yo menos tiempo), 'loss' o 'tie'. */
  function compareTimes(mine, theirs) {
    return mine < theirs ? 'win' : (mine > theirs ? 'loss' : 'tie');
  }

  /* ===========================================================================
   * Historial cara a cara
   * ===========================================================================
   * Estructura en localStorage ('sudoku_duel_history'):
   *   { v:1,
   *     rivals: { 'a:<alias en minúsculas>': { name, wins, losses, ties, lastPlayed } },
   *     played: { '<id del enlace>': { o:'win'|'loss'|'tie', at:<ms> } } }
   * `played` evita contar dos veces el mismo enlace si se recarga la página.
   */

  function emptyHistory() { return { v: 1, rivals: {}, played: {} }; }

  function rivalKey(alias) { return 'a:' + sanitizeAlias(alias).toLowerCase(); }

  function loadHistory() {
    var h = emptyHistory();
    try {
      var raw = storage.get(KEY_HISTORY);
      var o = raw ? JSON.parse(raw) : null;
      if (!o || typeof o !== 'object') { return h; }
      var key;
      if (o.rivals && typeof o.rivals === 'object') {
        for (key in o.rivals) {
          if (!Object.prototype.hasOwnProperty.call(o.rivals, key) || key.indexOf('a:') !== 0) { continue; }
          var r = o.rivals[key];
          if (!r || typeof r !== 'object') { continue; }
          h.rivals[key] = {
            name: sanitizeAlias(r.name) || key.slice(2),
            wins: clampInt(r.wins, 0, 1e6), losses: clampInt(r.losses, 0, 1e6),
            ties: clampInt(r.ties, 0, 1e6), lastPlayed: clampInt(r.lastPlayed, 0, 8.64e15)
          };
        }
      }
      if (o.played && typeof o.played === 'object') {
        for (key in o.played) {
          if (!Object.prototype.hasOwnProperty.call(o.played, key)) { continue; }
          var p = o.played[key];
          if (p && (p.o === 'win' || p.o === 'loss' || p.o === 'tie')) {
            h.played[key] = { o: p.o, at: clampInt(p.at, 0, 8.64e15) };
          }
        }
      }
    } catch (e) { /* historial corrupto: se empieza de cero */ }
    return h;
  }

  function saveHistory(h) {
    // Recorta los enlaces jugados más antiguos.
    var ids = Object.keys(h.played);
    if (ids.length > MAX_PLAYED) {
      ids.sort(function (a, b) { return h.played[a].at - h.played[b].at; });
      for (var i = 0; i < ids.length - MAX_PLAYED; i++) { delete h.played[ids[i]]; }
    }
    try { storage.set(KEY_HISTORY, JSON.stringify(h)); } catch (e) { /* ignorar */ }
  }

  var history = {
    /** Marcador contra un alias: { name, wins, losses, ties, lastPlayed } (ceros si nunca jugaron). */
    get: function (alias) {
      var r = loadHistory().rivals[rivalKey(alias)];
      return r ? { name: r.name, wins: r.wins, losses: r.losses, ties: r.ties, lastPlayed: r.lastPlayed }
        : { name: sanitizeAlias(alias), wins: 0, losses: 0, ties: 0, lastPlayed: 0 };
    },

    /** Resultado ya guardado para un enlace ('win' | 'loss' | 'tie') o null si no se jugó. */
    playedOutcome: function (id) {
      var p = loadHistory().played[id];
      return p ? p.o : null;
    },

    /**
     * Registra el resultado de un duelo (una sola vez por enlace).
     * @param {string} id          `id` devuelto por decodeDuelPayload.
     * @param {string} rivalAlias  Alias del retador.
     * @param {number} myTime      Mi tiempo final (con penalizaciones).
     * @param {number} rivalTime   Tiempo final del retador.
     * @returns {{counted:boolean, outcome:string, record:Object}}
     *          `counted` = false si ese enlace ya estaba registrado (no se suma de nuevo).
     */
    record: function (id, rivalAlias, myTime, rivalTime) {
      var h = loadHistory(), prev = h.played[id], key = rivalKey(rivalAlias);
      if (prev) {
        var r0 = h.rivals[key];
        return { counted: false, outcome: prev.o, record: r0 ? { name: r0.name, wins: r0.wins, losses: r0.losses, ties: r0.ties, lastPlayed: r0.lastPlayed } : history.get(rivalAlias) };
      }
      var outcome = compareTimes(myTime, rivalTime), now = Date.now();
      var r = h.rivals[key] || (h.rivals[key] = { name: sanitizeAlias(rivalAlias) || 'Rival', wins: 0, losses: 0, ties: 0, lastPlayed: 0 });
      if (outcome === 'win') { r.wins++; } else if (outcome === 'loss') { r.losses++; } else { r.ties++; }
      r.lastPlayed = now;
      r.name = sanitizeAlias(rivalAlias) || r.name;
      h.played[id] = { o: outcome, at: now };
      saveHistory(h);
      return { counted: true, outcome: outcome, record: { name: r.name, wins: r.wins, losses: r.losses, ties: r.ties, lastPlayed: r.lastPlayed } };
    }
  };

  /* ===========================================================================
   * Textos y compartir
   * ========================================================================= */

  /** "⚔️ Alias te desafía — Modo • Dificultad • Tiempo objetivo: MM:SS" (usar con textContent). */
  function challengeTitle(data) {
    return '\u2694\uFE0F ' + data.alias + ' te desaf\u00EDa \u2014 ' + MODE_LABELS[data.mode] + ' \u2022 ' +
      DIFF_LABELS[data.diff] + ' \u2022 Tiempo objetivo: ' + formatTime(data.time);
  }

  /** Copia texto al portapapeles (con respaldo para contextos sin la API moderna). @returns {Promise<boolean>} */
  function copyText(text) {
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, text.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacy(); });
    }
    return Promise.resolve(legacy());
  }

  /**
   * Comparte el enlace: hoja nativa de Android (navigator.share) o, si no existe, copia al portapapeles.
   * @param {{title?:string, text?:string, url:string}} opts
   * @returns {Promise<'shared'|'cancelled'|'copied'|'failed'>}
   */
  function shareLink(opts) {
    function fallback() {
      return copyText(opts.url).then(function (ok) { return ok ? 'copied' : 'failed'; });
    }
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      return navigator.share({ title: opts.title, text: opts.text, url: opts.url }).then(
        function () { return 'shared'; },
        function (e) { return (e && e.name === 'AbortError') ? 'cancelled' : fallback(); }
      );
    }
    return fallback();
  }

  /* ===========================================================================
   * API pública
   * ========================================================================= */

  return {
    VERSION: VERSION,
    MODES: MODES.slice(),
    DIFFS: DIFFS.slice(),
    MODE_LABELS: MODE_LABELS,
    DIFF_LABELS: DIFF_LABELS,
    HINT_PENALTY: HINT_PENALTY,
    MAX_ALIAS_BYTES: MAX_ALIAS_BYTES,

    // Semillas y códigos
    randomSeed: randomSeed,
    seedFromString: seedFromString,
    modeCode: modeCode,
    diffCode: diffCode,

    // Alias
    sanitizeAlias: sanitizeAlias,
    getAlias: getAlias,
    setAlias: setAlias,

    // Serialización y enlaces
    encodeDuelPayload: encodeDuelPayload,
    decodeDuelPayload: decodeDuelPayload,
    buildLink: buildLink,
    readLocationHash: readLocationHash,
    clearHash: clearHash,

    // Grabación y fantasma
    DuelRecorder: DuelRecorder,
    ghostProgress: ghostProgress,
    ghostCellsBetween: ghostCellsBetween,
    effectiveTime: effectiveTime,
    compareTimes: compareTimes,

    // Historial
    history: history,

    // Interfaz
    formatTime: formatTime,
    challengeTitle: challengeTitle,
    copyText: copyText,
    shareLink: shareLink
  };
}));
