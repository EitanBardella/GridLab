/*!
 * coop.js — Modo Cooperativo en Tiempo Real (2 jugadores, mismo tablero) para la PWA de Sudoku
 * -----------------------------------------------------------------------------
 * JavaScript puro. Requiere ./peerjs.min.js (global `Peer`) cargado ANTES. Expone `SudokuCoop`.
 * No toca el DOM (salvo escuchar visibilitychange/online) ni el estado del juego: solo transporte,
 * protocolo, validación estricta de mensajes y utilidades. La lógica del tablero vive en app.js.
 *
 * Arquitectura Host – Invitado:
 *   - El Host crea una sala con id PeerJS `sudoku-XXXX` (4 caracteres sin ambigüedad) y comparte
 *     el enlace `<app>#coop=XXXX`. El Invitado abre el enlace y se conecta solo.
 *   - El Host es la fuente de verdad: valida cada operación del Invitado, la aplica a su estado y
 *     difunde el resultado (`cells`). El Invitado nunca modifica su tablero por su cuenta: aplica lo
 *     que dice el Host (o pinta de forma optimista y se corrige con `cells`).
 *   - Las VIDAS (3, compartidas) y las PISTAS (3, compartidas) también las arbitra el Host:
 *     viajan en `state`, `cells` (lives) y `clock` (hints), y el fin de partida por vidas en `lost`.
 *   - Conexión: STUN públicos de Google; latido (ping/pong) para detectar caídas silenciosas;
 *     reconexión automática del Invitado y de la señalización del Host.
 *
 * Ciclo de vida:
 *   var s = SudokuCoop.createHost({ alias });   // o SudokuCoop.join(code, { alias })
 *   s.on('status', fn); s.on('ready', fn); s.on('message', fn);
 *   s.start();
 *   s.send({ type: 'focus', index: 12 });
 *   s.close();
 *
 * Eventos:
 *   'status'  info = { state, reason, role, code, alias, peerAlias, attempt }
 *             state: 'creating' | 'waiting' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error'
 *   'ready'   { code, link }                 (solo Host: sala registrada, ya se puede compartir)
 *   'message' msg ya validado y saneado (ver protocolo)
 *
 * Protocolo (objetos JSON, siempre con `type`):
 *   Invitado -> Host
 *     hello   { alias, resume, v }                  primer mensaje tras abrir el canal
 *     op      { id, kind:'set'|'note'|'erase', index, value, expect, hint }
 *             { id, kind:'undo' }                   `expect` = valor que el Invitado veía en la celda
 *     hint    {}                                    se usó una pista (el Host suma y difunde)
 *     again   {}                                    pide "Jugar otro juntos" (si ganaron) o reintentar (si perdieron)
 *   Host -> Invitado
 *     state   { alias, mode, diff, req, seed, puzzle, solution, cages?, regions?, board, notes, owners,
 *               secs, hints, lives, won, fresh }    estado completo (alta, reconexión, tablero nuevo)
 *     cells   { seq, by, ack, rej, changes:[{i,v,n,o}], hints?, secs?, lives? }
 *     clock   { secs, hints }                       corrección de reloj (cada pocos segundos)
 *     won     { secs, hints, counts:[p1,p2] }
 *     lost    { secs, hints }                       se acabaron las vidas compartidas
 *   Ambos
 *     focus   { index }                             celda activa (-1 = ninguna)
 *     bye     {}                                    salida voluntaria
 *   Internos (no llegan a la app): ping, pong, full
 *
 * Dueños de celda (`owners[81]`): 0 = pista inicial / vacía, 1 = Host, 2 = Invitado.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SudokuCoop = factory();
  }
}(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ===========================================================================
   * Constantes
   * ========================================================================= */

  var VERSION = 2;
  var DEFAULT_LIVES = 3;       // vidas compartidas de una sala
  var MAX_LIVES = 9;
  var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin I, L, O, 0, 1
  var CODE_LEN = 4;
  var CODE_RX = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{4}$/;
  var ID_PREFIX = 'sudoku-';
  var MODES = ['classic', 'killer', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw'];
  var DIFFS = ['facil', 'medio', 'dificil', 'experto', 'maestro', 'extremo'];
  var OWNER = { GIVEN: 0, HOST: 1, GUEST: 2 };
  var ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  var PING_MS = 4000;          // latido
  var CHECK_MS = 2000;         // revisión de silencio
  var STALE_MS = 13000;        // sin noticias del otro lado -> conexión caída
  var OPEN_TIMEOUT_MS = 10000; // tiempo máx. para abrir el canal de datos
  var STATE_TIMEOUT_MS = 8000; // el Invitado espera el estado completo tras el hello
  var MAX_FIRST_ATTEMPTS = 5;  // intentos del Invitado antes de rendirse (primera conexión)
  var MAX_RESUME_ATTEMPTS = 12;
  var MAX_PEER_TRIES = 15;
  var MAX_SECS = 359999;
  var MAX_ID = 2147483647;
  var KEY_ALIAS = 'sudoku_player_alias'; // la misma clave que duel.js: el alias es único

  var BAD_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF<>]/g;

  // Tipos de mensaje que cada rol acepta del otro lado.
  var HOST_ACCEPTS = { hello: 1, focus: 1, op: 1, hint: 1, again: 1, bye: 1 };
  var GUEST_ACCEPTS = { state: 1, cells: 1, clock: 1, won: 1, lost: 1, focus: 1, full: 1, bye: 1 };

  /* ===========================================================================
   * Utilidades
   * ========================================================================= */

  function isInt(n, min, max) {
    return typeof n === 'number' && n === Math.floor(n) && n >= min && n <= max;
  }

  function randomInts(n, max) {
    var out = [], i;
    try {
      var c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
      if (c) {
        var a = c.getRandomValues(new Uint32Array(n));
        for (i = 0; i < n; i++) { out.push(a[i] % max); }
        return out;
      }
    } catch (e) { /* respaldo abajo */ }
    for (i = 0; i < n; i++) { out.push(Math.floor(Math.random() * max)); }
    return out;
  }

  function randomToken() {
    return randomInts(8, 36).map(function (n) { return n.toString(36); }).join('');
  }

  function peerCtor() {
    if (typeof Peer === 'function') { return Peer; }
    if (typeof window !== 'undefined' && typeof window.Peer === 'function') { return window.Peer; }
    return null;
  }

  function duelMod() {
    return (typeof window !== 'undefined' && window.SudokuDuel) || null;
  }

  /* ----- Alias ----- */

  function sanitizeAlias(raw) {
    var D = duelMod();
    if (D && typeof D.sanitizeAlias === 'function') { return D.sanitizeAlias(raw); }
    var s = String(raw === undefined || raw === null ? '' : raw);
    if (typeof s.normalize === 'function') { s = s.normalize('NFC'); }
    s = s.replace(BAD_CHARS, '').replace(/\s+/g, ' ').trim();
    return Array.from(s).slice(0, 12).join('').trim();
  }

  var mem = {};
  function storageGet(k) {
    try { var v = window.localStorage.getItem(k); if (v !== null && v !== undefined) { return v; } } catch (e) { /* restringido */ }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  }
  function storageSet(k, v) {
    mem[k] = v;
    try { window.localStorage.setItem(k, v); } catch (e) { /* cuota o modo privado */ }
  }

  /** Alias guardado del jugador ('' si todavía no eligió uno). */
  function getAlias() { return sanitizeAlias(storageGet(KEY_ALIAS) || ''); }

  /** Guarda el alias (saneado) y lo devuelve; '' si quedó vacío (no se guarda). */
  function setAlias(raw) {
    var s = sanitizeAlias(raw);
    if (s) { storageSet(KEY_ALIAS, s); }
    return s;
  }

  /* ----- Código de sala y enlaces ----- */

  /** Código de sala de 4 caracteres sin ambigüedad (sin I, L, O, 0, 1). */
  function generateCode() {
    return randomInts(CODE_LEN, CODE_CHARS.length).map(function (n) { return CODE_CHARS.charAt(n); }).join('');
  }

  /** Normaliza lo que escribió o pegó una persona: mayúsculas y sin espacios. @returns {string} */
  function normalizeCode(raw) {
    return String(raw === undefined || raw === null ? '' : raw).replace(/^sudoku-/i, '').replace(/\s+/g, '').toUpperCase();
  }

  function isValidCode(code) { return CODE_RX.test(String(code)); }

  /** URL completa de la app (sin hash previo) con `#coop=XXXX`. */
  function buildLink(code) {
    return String(window.location.href).split('#')[0] + '#coop=' + code;
  }

  /**
   * Lee `location.hash`: null si no hay `coop=`; si lo hay, { ok:true, code } o { ok:false, error:'code' }.
   */
  function readLocationHash() {
    var h = '';
    try { h = String(window.location.hash || ''); } catch (e) { return null; }
    var m = /(?:^|[#&])coop=([^&#\s]*)/.exec(h);
    if (!m) { return null; }
    var code = normalizeCode(decodeURIComponent_safe(m[1]));
    return isValidCode(code) ? { ok: true, code: code } : { ok: false, error: 'code' };
  }

  function decodeURIComponent_safe(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  /** Quita el hash de la URL sin recargar ni agregar una entrada al historial. */
  function clearHash() {
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (e) {
      try { window.location.hash = ''; } catch (e2) { /* ignorar */ }
    }
  }

  /* ----- Portapapeles y compartir ----- */

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
   * Hoja nativa de compartir (Android) o, si no existe, copia el enlace.
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
   * Validación de datos (todo lo que llega por la red es no confiable)
   * ========================================================================= */

  function validBoard(b) {
    if (!Array.isArray(b) || b.length !== 9) { return null; }
    var out = [], r, c;
    for (r = 0; r < 9; r++) {
      if (!Array.isArray(b[r]) || b[r].length !== 9) { return null; }
      var row = [];
      for (c = 0; c < 9; c++) {
        if (!isInt(b[r][c], 0, 9)) { return null; }
        row.push(b[r][c]);
      }
      out.push(row);
    }
    return out;
  }

  function cleanNotes(arr) {
    var mask = 0, out = [], d;
    if (!Array.isArray(arr)) { return out; }
    for (var k = 0; k < arr.length && k < 32; k++) {
      if (isInt(arr[k], 1, 9)) { mask |= 1 << (arr[k] - 1); }
    }
    for (d = 1; d <= 9; d++) { if (mask & (1 << (d - 1))) { out.push(d); } }
    return out;
  }

  function validNotes(n) {
    if (!Array.isArray(n) || n.length !== 9) { return null; }
    var out = [], r, c;
    for (r = 0; r < 9; r++) {
      if (!Array.isArray(n[r]) || n[r].length !== 9) { return null; }
      var row = [];
      for (c = 0; c < 9; c++) { row.push(cleanNotes(n[r][c])); }
      out.push(row);
    }
    return out;
  }

  function validOwners(o, puzzle, board) {
    if (!Array.isArray(o) || o.length !== 81) { return null; }
    var out = new Array(81), i;
    for (i = 0; i < 81; i++) {
      var r = Math.floor(i / 9), c = i % 9;
      if (puzzle[r][c] || !board[r][c]) { out[i] = 0; } else { out[i] = o[i] === 2 ? 2 : 1; }
    }
    return out;
  }

  // Las jaulas deben cubrir las 81 celdas exactamente una vez.
  // Mapa de regiones del modo Jigsaw: 81 enteros 0..8, nueve de cada uno (la contigüidad la verifica la app).
  function validRegions(rg) {
    if (!Array.isArray(rg) || rg.length !== 81) { return null; }
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0], i;
    for (i = 0; i < 81; i++) {
      if (!isInt(rg[i], 0, 8)) { return null; }
      counts[rg[i]]++;
    }
    for (i = 0; i < 9; i++) { if (counts[i] !== 9) { return null; } }
    return rg.slice();
  }

  function validCages(cs) {
    if (!Array.isArray(cs) || !cs.length || cs.length > 81) { return null; }
    var seen = new Array(81).fill(false), out = [], total = 0, g, q;
    for (g = 0; g < cs.length; g++) {
      var cg = cs[g];
      if (!cg || typeof cg !== 'object' || !isInt(cg.sum, 1, 45)) { return null; }
      if (!Array.isArray(cg.cells) || !cg.cells.length || cg.cells.length > 9) { return null; }
      var cells = [], tl = 81;
      for (q = 0; q < cg.cells.length; q++) {
        var cell = cg.cells[q];
        if (!Array.isArray(cell) || !isInt(cell[0], 0, 8) || !isInt(cell[1], 0, 8)) { return null; }
        var k = cell[0] * 9 + cell[1];
        if (seen[k]) { return null; }
        seen[k] = true; total++;
        if (k < tl) { tl = k; }
        cells.push([cell[0], cell[1]]);
      }
      out.push({ id: isInt(cg.id, 0, 1000) ? cg.id : g, sum: cg.sum, cells: cells, topLeft: [Math.floor(tl / 9), tl % 9] });
    }
    return total === 81 ? out : null;
  }

  function sanitizeState(m) {
    var mode = MODES.indexOf(m.mode) >= 0 ? m.mode : null;
    var diff = DIFFS.indexOf(m.diff) >= 0 ? m.diff : null;
    if (!mode || !diff) { return null; }
    var req = DIFFS.indexOf(m.req) >= 0 ? m.req : diff;
    var puzzle = validBoard(m.puzzle), solution = validBoard(m.solution), board = validBoard(m.board);
    if (!puzzle || !solution || !board) { return null; }
    var notes = validNotes(m.notes);
    if (!notes) { return null; }
    var r, c;
    for (r = 0; r < 9; r++) {
      for (c = 0; c < 9; c++) {
        if (!solution[r][c]) { return null; }
        if (puzzle[r][c] && (puzzle[r][c] !== solution[r][c] || board[r][c] !== puzzle[r][c])) { return null; }
        if (puzzle[r][c] || board[r][c]) { notes[r][c] = []; }
      }
    }
    var owners = validOwners(m.owners, puzzle, board);
    if (!owners) { return null; }
    var cages = null;
    if (mode === 'killer') {
      cages = validCages(m.cages);
      if (!cages) { return null; }
    }
    var regions = null;
    if (mode === 'jigsaw') {
      regions = validRegions(m.regions);
      if (!regions) { return null; }
    }
    var st = {
      mode: mode, diff: diff, req: req,
      seed: isInt(m.seed, 0, 4294967295) ? m.seed : 0,
      puzzle: puzzle, solution: solution, board: board, notes: notes, owners: owners,
      secs: isInt(m.secs, 0, MAX_SECS) ? m.secs : 0,
      hints: isInt(m.hints, 0, 255) ? m.hints : 0,
      lives: isInt(m.lives, 0, MAX_LIVES) ? m.lives : DEFAULT_LIVES,
      won: !!m.won
    };
    if (cages) { st.cages = cages; }
    if (regions) { st.regions = regions; }
    return st;
  }

  /**
   * Valida y normaliza un mensaje entrante. Nunca lanza.
   * @returns {Object|null} el mensaje saneado o null si es inválido.
   */
  function sanitizeMessage(m) {
    try {
      if (!m || typeof m !== 'object' || typeof m.type !== 'string') { return null; }
      var i, list, ch;
      switch (m.type) {
        case 'ping': case 'pong': case 'bye': case 'full': case 'again': case 'hint':
          return { type: m.type };
        case 'hello':
          return { type: 'hello', alias: sanitizeAlias(m.alias) || 'Amigo', resume: !!m.resume, v: isInt(m.v, 0, 1000) ? m.v : 0 };
        case 'state': {
          var st = sanitizeState(m);
          if (!st) { return null; }
          st.type = 'state';
          st.fresh = !!m.fresh;
          st.alias = sanitizeAlias(m.alias) || 'Anfitrión';
          return st;
        }
        case 'focus':
          return isInt(m.index, -1, 80) ? { type: 'focus', index: m.index } : null;
        case 'op': {
          if (!isInt(m.id, 0, MAX_ID)) { return null; }
          var k = m.kind;
          if (k === 'undo') { return { type: 'op', kind: 'undo', id: m.id }; }
          if (k !== 'set' && k !== 'note' && k !== 'erase') { return null; }
          if (!isInt(m.index, 0, 80)) { return null; }
          if ((k === 'set' || k === 'note') && !isInt(m.value, 1, 9)) { return null; }
          return {
            type: 'op', kind: k, id: m.id, index: m.index, value: k === 'erase' ? 0 : m.value,
            expect: isInt(m.expect, 0, 9) ? m.expect : 0, hint: !!m.hint
          };
        }
        case 'cells': {
          if (!Array.isArray(m.changes) || m.changes.length > 81) { return null; }
          list = [];
          for (i = 0; i < m.changes.length; i++) {
            ch = m.changes[i];
            if (!ch || !isInt(ch.i, 0, 80) || !isInt(ch.v, 0, 9)) { return null; }
            list.push({ i: ch.i, v: ch.v, n: ch.v ? [] : cleanNotes(ch.n), o: ch.v ? (ch.o === 2 ? 2 : 1) : 0 });
          }
          var out = {
            type: 'cells', seq: isInt(m.seq, 0, MAX_ID) ? m.seq : 0, by: isInt(m.by, 0, 2) ? m.by : 0,
            ack: isInt(m.ack, 0, MAX_ID) ? m.ack : 0, rej: !!m.rej, changes: list
          };
          if (isInt(m.hints, 0, 255)) { out.hints = m.hints; }
          if (isInt(m.secs, 0, MAX_SECS)) { out.secs = m.secs; }
          if (isInt(m.lives, 0, MAX_LIVES)) { out.lives = m.lives; }
          return out;
        }
        case 'clock':
          if (!isInt(m.secs, 0, MAX_SECS)) { return null; }
          return { type: 'clock', secs: m.secs, hints: isInt(m.hints, 0, 255) ? m.hints : 0 };
        case 'won':
          if (!isInt(m.secs, 0, MAX_SECS) || !Array.isArray(m.counts) || m.counts.length !== 2 ||
            !isInt(m.counts[0], 0, 81) || !isInt(m.counts[1], 0, 81)) { return null; }
          return { type: 'won', secs: m.secs, hints: isInt(m.hints, 0, 255) ? m.hints : 0, counts: [m.counts[0], m.counts[1]] };
        case 'lost':
          if (!isInt(m.secs, 0, MAX_SECS)) { return null; }
          return { type: 'lost', secs: m.secs, hints: isInt(m.hints, 0, 255) ? m.hints : 0 };
        default:
          return null;
      }
    } catch (e) {
      return null;
    }
  }

  /* ===========================================================================
   * Utilidades de estado compartido (usadas por app.js en Host e Invitado)
   * ========================================================================= */

  function clone9(b) { return b.map(function (row) { return row.slice(); }); }
  function cloneNotes9(n) { return n.map(function (row) { return row.map(function (a) { return a.slice(); }); }); }
  function emptyOwners() { return new Array(81).fill(0); }

  /** Dueño (1 Host, 2 Invitado) según el rol de la sesión. */
  function ownerForRole(role) { return role === 'host' ? OWNER.HOST : OWNER.GUEST; }

  /**
   * Copia profunda lista para enviar como mensaje `state`.
   * @param {{alias:string, mode:string, diff:string, req?:string, seed:number, puzzle:number[][], solution:number[][],
   *          cages?:Object[], board:number[][], notes:number[][][], owners:number[], secs:number, hints:number,
   *          lives?:number, won?:boolean, fresh?:boolean}} src
   */
  function buildState(src) {
    var s = {
      type: 'state', v: VERSION, fresh: !!src.fresh,
      alias: sanitizeAlias(src.alias) || 'Anfitrión',
      mode: src.mode, diff: src.diff, req: src.req || src.diff,
      seed: (src.seed >>> 0),
      puzzle: clone9(src.puzzle), solution: clone9(src.solution), board: clone9(src.board),
      notes: cloneNotes9(src.notes),
      owners: Array.prototype.slice.call(src.owners || emptyOwners()),
      secs: src.secs | 0, hints: src.hints | 0,
      lives: src.lives === undefined || src.lives === null ? DEFAULT_LIVES : (src.lives | 0),
      won: !!src.won
    };
    if (src.mode === 'killer' && src.cages) { s.cages = JSON.parse(JSON.stringify(src.cages)); }
    if (src.mode === 'jigsaw' && src.regions) { s.regions = Array.prototype.slice.call(src.regions); }
    return s;
  }

  /** Cambio de una celda para el mensaje `cells`. */
  function makeChange(i, board, notes, owners) {
    var r = Math.floor(i / 9), c = i % 9;
    return { i: i, v: board[r][c], n: board[r][c] ? [] : notes[r][c].slice(), o: board[r][c] ? owners[i] : 0 };
  }

  /**
   * Aplica una lista de cambios (de un mensaje `cells`) a tablero, notas y dueños. Ignora las pistas iniciales.
   * @returns {number[]} índices realmente modificados
   */
  function applyChanges(board, notes, owners, puzzle, changes) {
    var touched = [];
    for (var k = 0; k < changes.length; k++) {
      var ch = changes[k], r = Math.floor(ch.i / 9), c = ch.i % 9;
      if (puzzle && puzzle[r][c]) { continue; }
      board[r][c] = ch.v;
      notes[r][c] = ch.v ? [] : ch.n.slice();
      owners[ch.i] = ch.v ? ch.o : 0;
      touched.push(ch.i);
    }
    return touched;
  }

  /**
   * Cuántas celdas (no dadas) resolvió cada jugador. Con `solution` solo cuenta las correctas.
   * @returns {number[]} [celdasDelHost, celdasDelInvitado]
   */
  function countByOwner(owners, board, puzzle, solution) {
    var out = [0, 0];
    for (var i = 0; i < 81; i++) {
      var r = Math.floor(i / 9), c = i % 9;
      if (puzzle[r][c] || !board[r][c]) { continue; }
      if (solution && board[r][c] !== solution[r][c]) { continue; }
      if (owners[i] === 1) { out[0]++; } else if (owners[i] === 2) { out[1]++; }
    }
    return out;
  }

  /* ===========================================================================
   * Textos de estado
   * ========================================================================= */

  function errorText(reason) {
    switch (reason) {
      case 'not-found': return 'No se encontró la sala. ¿El enlace sigue activo?';
      case 'full': return 'La sala ya tiene dos jugadores.';
      case 'no-peerjs': return 'Falta peerjs.min.js en la app.';
      case 'unsupported': return 'Este navegador no soporta conexiones directas.';
      case 'lost': return 'Se perdió la conexión.';
      case 'timeout': return 'No se pudo conectar. Revisá tu conexión.';
      case 'network': return 'Sin conexión con el servidor de salas.';
      case 'no-code': return 'No se pudo crear la sala. Probá de nuevo.';
      default: return 'No se pudo conectar.';
    }
  }

  /** Texto en español para mostrar el estado (`info` viene del evento 'status'). */
  function statusText(info) {
    var who = info.peerAlias || 'tu amigo';
    switch (info.state) {
      case 'creating': return 'Creando sala...';
      case 'waiting': return 'Esperando a tu amigo...';
      case 'connecting': return 'Conectando...';
      case 'connected': return 'Conectado con ' + who;
      case 'reconnecting': return 'Reconectando...';
      case 'closed': return info.reason === 'host-left' ? 'El anfitrión cerró la sala.' : 'Desconectado.';
      case 'error': return errorText(info.reason);
      default: return '';
    }
  }

  /* ===========================================================================
   * Sesión P2P (Host o Invitado)
   * ========================================================================= */

  function Session(role, opts) {
    opts = opts || {};
    this.role = role;                       // 'host' | 'guest'
    this.alias = sanitizeAlias(opts.alias) || 'Jugador';
    this.code = opts.code || null;
    this.iceServers = opts.iceServers || ICE_SERVERS;
    this.peerAlias = '';
    this.state = 'idle';
    this.reason = '';
    this.attempts = 0;
    this.sid = randomToken();               // identifica al Invitado entre reconexiones
    this.peer = null;
    this.conn = null;
    this.closed = false;
    this.lastSeen = 0;
    this.everConnected = false;
    this.timers = {};
    this.listeners = {};
    this._started = false;
    this._ready = false;
    this._connecting = false;
    this._att = null;
    this._gotState = false;
    this._lastKey = '';
    this._peerTries = 0;
    this._codeTries = 0;
    this._onVis = null;
  }

  Session.prototype.on = function (ev, fn) {
    (this.listeners[ev] || (this.listeners[ev] = [])).push(fn);
    return this;
  };

  Session.prototype.off = function (ev, fn) {
    var a = this.listeners[ev];
    if (!a) { return this; }
    var k = a.indexOf(fn);
    if (k >= 0) { a.splice(k, 1); }
    return this;
  };

  Session.prototype.emit = function (ev, data) {
    var a = (this.listeners[ev] || []).slice();
    for (var i = 0; i < a.length; i++) {
      try { a[i](data); } catch (e) { if (typeof console !== 'undefined') { console.error('[Coop] error en "' + ev + '"', e); } }
    }
  };

  Session.prototype.info = function () {
    return {
      state: this.state, reason: this.reason, role: this.role, code: this.code,
      alias: this.alias, peerAlias: this.peerAlias, attempt: this.attempts
    };
  };

  Session.prototype._setStatus = function (state, reason) {
    var key = state + '|' + (reason || '') + '|' + this.peerAlias;
    if (key === this._lastKey) { return; }
    this._lastKey = key;
    this.state = state;
    this.reason = reason || '';
    this.emit('status', this.info());
  };

  Session.prototype._later = function (name, ms, fn) {
    var self = this;
    this._clear(name);
    this.timers[name] = setTimeout(function () {
      delete self.timers[name];
      if (!self.closed) { fn.call(self); }
    }, ms);
  };

  Session.prototype._clear = function (name) {
    if (this.timers[name] !== undefined) {
      clearTimeout(this.timers[name]);
      clearInterval(this.timers[name]);
      delete this.timers[name];
    }
  };

  /** Enlace compartible de la sala. */
  Session.prototype.link = function () { return buildLink(this.code); };

  /** Comparte (o copia) el enlace de la sala. @returns {Promise<'shared'|'cancelled'|'copied'|'failed'>} */
  Session.prototype.share = function (opts) {
    opts = opts || {};
    return shareLink({
      title: opts.title || 'Sudoku Co-op',
      text: opts.text || (this.alias + ' te invita a resolver un Sudoku juntos. Abrí el enlace para entrar a la sala ' + this.code + '.'),
      url: this.link()
    });
  };

  Session.prototype.isConnected = function () {
    return this.state === 'connected' && !!this.conn && !!this.conn.open;
  };

  /** Envía un mensaje al otro jugador. @returns {boolean} false si no hay canal abierto. */
  Session.prototype.send = function (msg) {
    return this._rawSend(msg);
  };

  Session.prototype._rawSend = function (msg) {
    var c = this.conn;
    if (!c || !c.open) { return false; }
    try { c.send(msg); return true; } catch (e) { return false; }
  };

  /** Arranca la sala (Host) o la conexión (Invitado). Llamar después de registrar los `on(...)`. */
  Session.prototype.start = function () {
    if (this._started) { return this; }
    this._started = true;
    this._bindDom();
    if (!peerCtor()) { this._fail('no-peerjs'); return this; }
    if (this.role === 'host') {
      if (!this.code) { this.code = generateCode(); }
      this._setStatus('creating');
      this._openPeer(ID_PREFIX + this.code);
    } else {
      this._setStatus('connecting');
      this._openPeer(undefined);
    }
    return this;
  };

  /** Cierra la sesión avisando al otro jugador. */
  Session.prototype.close = function () {
    if (this.closed) { return; }
    this._rawSend({ type: 'bye' });
    this._setStatus('closed', 'local');
    this._teardown(true);
  };

  /* ----- Peer (señalización) ----- */

  Session.prototype._killPeer = function () {
    var p = this.peer;
    this.peer = null;
    if (p) { try { p.destroy(); } catch (e) { /* ignorar */ } }
  };

  Session.prototype._openPeer = function (id) {
    var self = this, Ctor = peerCtor(), peer;
    if (!Ctor) { this._fail('no-peerjs'); return; }
    this._killPeer();
    try {
      peer = new Ctor(id, { debug: 0, config: { iceServers: this.iceServers } });
    } catch (e) {
      this._fail('unsupported');
      return;
    }
    this.peer = peer;

    peer.on('open', function () {
      if (self.peer !== peer || self.closed) { return; }
      self._onPeerOpen();
    });

    peer.on('connection', function (c) {
      if (self.peer !== peer || self.closed || self.role !== 'host') { try { c.close(); } catch (e) { /* ignorar */ } return; }
      self._onIncoming(c);
    });

    peer.on('disconnected', function () {
      if (self.peer !== peer || self.closed) { return; }
      self._sigRetry(peer);
    });

    peer.on('close', function () {
      if (self.peer !== peer || self.closed) { return; }
      self.peer = null;
      self._peerDied();
    });

    peer.on('error', function (err) {
      if (self.peer !== peer || self.closed) { return; }
      var t = err && err.type;
      if (t === 'unavailable-id') { self._onIdTaken(peer); return; }
      if (t === 'peer-unavailable') { self._onHostMissing(); return; }
      if (t === 'browser-incompatible') { self._fail('unsupported'); return; }
      if (t === 'invalid-id' || t === 'invalid-key' || t === 'ssl-unavailable') { self._fail('error'); return; }
      // network / server-error / socket-* / webrtc: transitorios; 'disconnected' o 'close' dirigen la recuperación.
    });
  };

  // Reintenta la señalización mientras el Peer esté desconectado del servidor.
  Session.prototype._sigRetry = function (peer) {
    var self = this;
    this._later('sig', 1500, function () {
      if (self.peer !== peer || peer.destroyed || !peer.disconnected) { return; }
      try { peer.reconnect(); } catch (e) { /* ignorar */ }
      self._sigRetry(peer);
    });
  };

  Session.prototype._onPeerOpen = function () {
    this._clear('sig');
    this._peerTries = 0;
    if (this.role === 'host') {
      if (!this._ready) {
        this._ready = true;
        this._setStatus('waiting');
        this.emit('ready', { code: this.code, link: this.link() });
      } else if (!this.conn) {
        this._setStatus(this.everConnected ? 'reconnecting' : 'waiting');
      }
    } else if (!this.conn || !this.conn.open) {
      this._connectToHost();
    }
  };

  // El Peer se destruyó (error fatal de red, etc.): se vuelve a crear con espera creciente.
  Session.prototype._peerDied = function () {
    var self = this;
    this._abortAttempt();
    this.conn = null;
    this._stopHeartbeat();
    this._clear('state');
    if (this.role === 'guest') { this.attempts = 0; }
    this._peerTries++;
    if (this._peerTries > MAX_PEER_TRIES) { this._fail(this.everConnected ? 'lost' : 'network'); return; }
    if (this.role === 'host') {
      this._setStatus(this.everConnected ? 'reconnecting' : (this._ready ? 'waiting' : 'creating'));
    } else {
      this._setStatus(this.everConnected ? 'reconnecting' : 'connecting');
    }
    this._later('repeer', Math.min(1000 * this._peerTries, 5000), function () {
      self._openPeer(self.role === 'host' ? ID_PREFIX + self.code : undefined);
    });
  };

  // Host: el id de sala ya está ocupado.
  Session.prototype._onIdTaken = function (peer) {
    var self = this;
    this.peer = null; // el Peer ya se autodestruye; se ignoran sus eventos posteriores
    try { peer.destroy(); } catch (e) { /* ignorar */ }
    if (this.role !== 'host') { this._fail('error'); return; }
    if (!this._ready) {
      this._codeTries++;
      if (this._codeTries > 8) { this._fail('no-code'); return; }
      this.code = generateCode();
      this._later('repeer', 50, function () { self._openPeer(ID_PREFIX + self.code); });
    } else {
      // Recreando la misma sala: el registro anterior puede tardar en expirar.
      this._peerTries++;
      if (this._peerTries > MAX_PEER_TRIES) { this._fail('lost'); return; }
      this._later('repeer', 2500, function () { self._openPeer(ID_PREFIX + self.code); });
    }
  };

  /* ----- Host: conexiones entrantes ----- */

  Session.prototype._onIncoming = function (conn) {
    var self = this;
    var sid = conn.metadata && typeof conn.metadata.sid === 'string' ? conn.metadata.sid : '';
    var cur = this.conn;
    var alive = !!cur && cur.open && (Date.now() - this.lastSeen) < STALE_MS;

    if (cur && cur !== conn && alive && cur._sid !== sid) {
      // Otra persona intenta entrar a una sala ocupada.
      conn.on('open', function () {
        try { conn.send({ type: 'full' }); } catch (e) { /* ignorar */ }
        setTimeout(function () { try { conn.close(); } catch (e) { /* ignorar */ } }, 400);
      });
      return;
    }
    if (cur && cur !== conn) {
      this.conn = null;               // el mismo Invitado reconectando: se reemplaza el canal viejo
      this._stopHeartbeat();
      try { cur.close(); } catch (e) { /* ignorar */ }
    }

    conn._sid = sid;
    this.conn = conn;
    conn.on('open', function () {
      if (self.conn !== conn || self.closed) { return; }
      self.lastSeen = Date.now();
      self._startHeartbeat();
    });
    conn.on('data', function (d) { self._onData(conn, d); });
    conn.on('close', function () { self._onConnClose(conn); });
    conn.on('error', function () { self._onConnClose(conn); });
  };

  /* ----- Invitado: conectar al Host ----- */

  Session.prototype._connectToHost = function () {
    var self = this;
    if (this.closed || !this.peer || this.peer.destroyed || this._connecting) { return; }
    if (this.conn && this.conn.open) { return; }
    if (!this.peer.open) {
      if (this.peer.disconnected) { try { this.peer.reconnect(); } catch (e) { /* ignorar */ } }
      return; // al abrirse el Peer se vuelve a intentar
    }
    this._clear('retry');
    this._connecting = true;
    this.attempts++;
    this._setStatus(this.everConnected ? 'reconnecting' : 'connecting');

    var att = { conn: null, timer: 0 };
    this._att = att;
    var conn;
    try {
      conn = this.peer.connect(ID_PREFIX + this.code, {
        reliable: true, serialization: 'json', metadata: { sid: this.sid, v: VERSION }
      });
    } catch (e) {
      this._att = null; this._connecting = false;
      this._guestAttemptFailed('timeout');
      return;
    }
    att.conn = conn;
    att.timer = setTimeout(function () {
      if (self._att !== att) { return; }
      self._abortAttempt();
      self._guestAttemptFailed('timeout');
    }, OPEN_TIMEOUT_MS);

    conn.on('open', function () {
      if (self._att !== att || self.closed) { try { conn.close(); } catch (e) { /* ignorar */ } return; }
      clearTimeout(att.timer);
      self._att = null;
      self._connecting = false;
      self._adopt(conn);
    });
    conn.on('data', function (d) { self._onData(conn, d); });
    var lost = function () {
      if (self._att === att) { self._abortAttempt(); self._guestAttemptFailed('closed'); }
      else { self._onConnClose(conn); }
    };
    conn.on('close', lost);
    conn.on('error', lost);
  };

  Session.prototype._abortAttempt = function () {
    var att = this._att;
    this._att = null;
    this._connecting = false;
    if (att) {
      clearTimeout(att.timer);
      if (att.conn) { try { att.conn.close(); } catch (e) { /* ignorar */ } }
    }
  };

  Session.prototype._onHostMissing = function () {
    if (this.role !== 'guest' || !this._connecting) { return; }
    this._abortAttempt();
    this._guestAttemptFailed('not-found');
  };

  Session.prototype._guestAttemptFailed = function (reason) {
    if (this.closed) { return; }
    var max = this.everConnected ? MAX_RESUME_ATTEMPTS : MAX_FIRST_ATTEMPTS;
    if (this.attempts >= max) {
      this._fail(this.everConnected ? 'lost' : (reason === 'not-found' ? 'not-found' : 'timeout'));
      return;
    }
    this._setStatus(this.everConnected ? 'reconnecting' : 'connecting');
    this._later('retry', Math.min(1500 * this.attempts, 6000), this._connectToHost);
  };

  Session.prototype._adopt = function (conn) {
    var self = this;
    this.conn = conn;
    this.lastSeen = Date.now();
    this._gotState = false;
    this._startHeartbeat();
    this._rawSend({ type: 'hello', alias: this.alias, resume: this.everConnected, v: VERSION });
    this._later('state', STATE_TIMEOUT_MS, function () {
      if (!self._gotState) { self._dropConn(); }
    });
  };

  /* ----- Latido y caídas ----- */

  Session.prototype._startHeartbeat = function () {
    var self = this;
    this._stopHeartbeat();
    this.timers.hb = setInterval(function () {
      if (self.closed) { return; }
      if (self.conn && self.conn.open) { self._rawSend({ type: 'ping' }); }
    }, PING_MS);
    this.timers.chk = setInterval(function () {
      if (self.closed) { return; }
      if (self.conn && Date.now() - self.lastSeen > STALE_MS) { self._dropConn(); }
    }, CHECK_MS);
  };

  Session.prototype._stopHeartbeat = function () {
    this._clear('hb');
    this._clear('chk');
  };

  // Fuerza el cierre del canal actual (caída silenciosa) y arranca la recuperación.
  Session.prototype._dropConn = function () {
    var c = this.conn;
    if (!c) { return; }
    try { c.close(); } catch (e) { /* ignorar */ }
    this._onConnClose(c);
  };

  Session.prototype._onConnClose = function (conn) {
    if (conn !== this.conn) { return; }   // canal ya reemplazado
    this.conn = null;
    this._stopHeartbeat();
    this._clear('state');
    if (this.closed) { return; }

    if (conn && conn._bye) {              // salida voluntaria del otro jugador
      if (this.role === 'guest') {
        this._finish('closed', 'host-left');
      } else {
        this.peerAlias = '';
        this.everConnected = false;
        this._setStatus('waiting');
      }
      return;
    }

    if (this.role === 'host') {
      this._setStatus(this.everConnected ? 'reconnecting' : 'waiting');
    } else {
      this.attempts = 0;
      this._setStatus('reconnecting');
      this._later('retry', 600, this._connectToHost);
    }
  };

  /* ----- Mensajes ----- */

  Session.prototype._onData = function (conn, raw) {
    if (this.closed || conn !== this.conn) { return; }
    this.lastSeen = Date.now();
    var m = sanitizeMessage(raw);
    if (!m) { return; }
    if (m.type === 'ping') { this._rawSend({ type: 'pong' }); return; }
    if (m.type === 'pong') { return; }
    var allowed = this.role === 'host' ? HOST_ACCEPTS : GUEST_ACCEPTS;
    if (!allowed[m.type]) { return; }

    switch (m.type) {
      case 'hello':
        this.peerAlias = m.alias;
        this.everConnected = true;
        this._setStatus('connected');
        break;
      case 'state':
        this.peerAlias = m.alias;
        this.everConnected = true;
        this._gotState = true;
        this._clear('state');
        this.attempts = 0;
        this._peerTries = 0;
        this._setStatus('connected');
        break;
      case 'full':
        this._fail('full');
        return;
      case 'bye':
        conn._bye = true;
        break;
      default:
        break;
    }
    this.emit('message', m);
  };

  /* ----- Cierre y errores ----- */

  Session.prototype._finish = function (state, reason) {
    this._setStatus(state, reason);
    this._teardown(false);
  };

  Session.prototype._fail = function (reason) { this._finish('error', reason); };

  Session.prototype._teardown = function (delayed) {
    if (this.closed) { return; }
    this.closed = true;
    var names = Object.keys(this.timers), i;
    for (i = 0; i < names.length; i++) { this._clear(names[i]); }
    this._unbindDom();
    var conn = this.conn, peer = this.peer;
    this.conn = null;
    this.peer = null;
    this._att = null;
    var kill = function () {
      if (conn) { try { conn.close(); } catch (e) { /* ignorar */ } }
      if (peer) { try { peer.destroy(); } catch (e) { /* ignorar */ } }
    };
    if (delayed) { setTimeout(kill, 300); } else { kill(); }  // deja salir el mensaje 'bye'
  };

  /* ----- Eventos del navegador (volver a primer plano / recuperar red) ----- */

  Session.prototype._bindDom = function () {
    var self = this;
    if (typeof document === 'undefined' || typeof window === 'undefined') { return; }
    this._onVis = function () {
      if (self.closed || (typeof document !== 'undefined' && document.hidden)) { return; }
      self._wake();
    };
    document.addEventListener('visibilitychange', this._onVis);
    window.addEventListener('online', this._onVis);
  };

  Session.prototype._unbindDom = function () {
    if (!this._onVis) { return; }
    try {
      document.removeEventListener('visibilitychange', this._onVis);
      window.removeEventListener('online', this._onVis);
    } catch (e) { /* ignorar */ }
    this._onVis = null;
  };

  // Al volver a primer plano los temporizadores pudieron estar congelados: se da margen y se comprueba el canal.
  Session.prototype._wake = function () {
    if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
      try { this.peer.reconnect(); } catch (e) { /* ignorar */ }
    }
    if (this.conn && this.conn.open) {
      this.lastSeen = Date.now();
      this._rawSend({ type: 'ping' });
    } else if (this.role === 'guest' && !this._connecting && this.peer) {
      this.attempts = 0;
      this._connectToHost();
    }
  };

  /* ===========================================================================
   * API pública
   * ========================================================================= */

  /**
   * Crea la sesión del Host (sin arrancarla: registrar `on(...)` y luego `start()`).
   * @param {{alias?:string, iceServers?:Object[]}} [opts]
   */
  function createHost(opts) {
    opts = opts || {};
    var code = opts.code ? normalizeCode(opts.code) : generateCode();
    return new Session('host', { alias: opts.alias, iceServers: opts.iceServers, code: isValidCode(code) ? code : generateCode() });
  }

  /**
   * Crea la sesión del Invitado para la sala `code` (sin arrancarla).
   * @param {string} code Código de 4 caracteres (con o sin `sudoku-`).
   * @param {{alias?:string, iceServers?:Object[]}} [opts]
   * @throws {RangeError} si el código no es válido.
   */
  function join(code, opts) {
    opts = opts || {};
    var c = normalizeCode(code);
    if (!isValidCode(c)) { throw new RangeError('Código de sala inválido.'); }
    return new Session('guest', { alias: opts.alias, iceServers: opts.iceServers, code: c });
  }

  return {
    VERSION: VERSION,
    DEFAULT_LIVES: DEFAULT_LIVES,
    OWNER: OWNER,
    CODE_CHARS: CODE_CHARS,
    ICE_SERVERS: ICE_SERVERS.slice(),

    // Disponibilidad
    available: function () { return !!peerCtor(); },

    // Sesiones
    createHost: createHost,
    join: join,

    // Código de sala y enlaces
    generateCode: generateCode,
    normalizeCode: normalizeCode,
    isValidCode: isValidCode,
    buildLink: buildLink,
    readLocationHash: readLocationHash,
    clearHash: clearHash,

    // Alias
    sanitizeAlias: sanitizeAlias,
    getAlias: getAlias,
    setAlias: setAlias,

    // Estado compartido
    buildState: buildState,
    makeChange: makeChange,
    applyChanges: applyChanges,
    countByOwner: countByOwner,
    emptyOwners: emptyOwners,
    ownerForRole: ownerForRole,
    sanitizeMessage: sanitizeMessage,

    // Interfaz
    statusText: statusText,
    copyText: copyText,
    shareLink: shareLink
  };
}));
