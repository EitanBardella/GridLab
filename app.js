(function () {
  'use strict';
  const E = window.SudokuEngine;   // clásico, diagonal, anti-caballo, sin consecutivos, irregular
  const K = window.KillerEngine;   // killer
  const D = window.SudokuDuel || null; // duelos y fantasma (duel.js)
  const C = window.SudokuCoop || null; // modo cooperativo (coop.js + peerjs.min.js)
  const $ = s => document.querySelector(s);
  const NAMES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto', maestro: 'Maestro', extremo: 'Extremo' };
  const DIFF_ORDER = ['facil', 'medio', 'dificil', 'experto', 'maestro', 'extremo'];
  const MODES = ['classic', 'killer', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw'];
  const MODE_NAMES = { classic: 'Clásico', killer: 'Killer', diagonal: 'Diagonal', antiknight: 'Anti-Caballo', nonconsecutive: 'Sin Consecutivos', jigsaw: 'Jigsaw' };
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const RING = 'inset 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)';
  const K_GAME = 'sudoku.game.v1', K_SET = 'sudoku.settings.v1', K_STATS = 'sudoku.stats.v1';
  const validMode = m => (MODES.indexOf(m) >= 0 ? m : 'classic');
  const HINT_PENALTY = D ? D.HINT_PENALTY : 30; // segundos que suma cada pista al tiempo final
  const FLASH_MS = 1250;                        // duración del destello fantasma
  const COOP_ALIAS = { sub: 'Así te verá tu amigo (hasta 12 caracteres).', ok: 'Guardar y continuar' };
  const COOP_HIST_MAX = 2000;                   // tope del historial de deshacer en una sala

  /* ---------- Vidas y pistas ---------- */
  // Vidas en solitario según la dificultad (0 = infinitas). Duelos y Co-op: 3 fijas. Supervivencia: 0 de margen (1 error = fin).
  const LIVES_BY_DIFF = { facil: 0, medio: 5, dificil: 4, experto: 3, maestro: 2, extremo: 2 };
  const FRIEND_LIVES = 3;
  const HINTS_SOLO = 3, HINTS_DUEL = 2, HINTS_COOP = 3;
  const HEART_ON = '\u2764\uFE0F', HEART_OFF = '\uD83D\uDDA4';

  /* ---------- Supervivencia (No-Hit) ---------- */
  const SURV_MODES = {
    classic:    { label: 'Clásico',        pool: ['classic'] },
    diagonal:   { label: 'Diagonal',       pool: ['diagonal'] },
    antiknight: { label: 'Anti-Caballo',   pool: ['antiknight'] },
    killer:     { label: 'Killer',         pool: ['killer'] },
    mixed:      { label: 'Mixto',          pool: ['classic', 'diagonal', 'antiknight'] },
    mixedk:     { label: 'Mixto + Killer', pool: ['classic', 'diagonal', 'antiknight', 'killer'] }
  };
  // Tableros #1–2 Fácil, #3–4 Medio, #5–6 Difícil, #7 en adelante Experto.
  const survDiff = n => (n <= 2 ? 'facil' : (n <= 4 ? 'medio' : (n <= 6 ? 'dificil' : 'experto')));
  const survPickMode = rot => { const p = SURV_MODES[rot].pool; return p[Math.floor(Math.random() * p.length)]; };
  // ¿a es mejor que b? Más tableros; a igualdad, menos tiempo. b nulo = no hay récord.
  const survBetter = (a, b) => !b || a.n > b.n || (a.n === b.n && a.t < b.t);
  const SURV_TRANSITION_MS = 1500;

  // Generación. Killer, los Desafíos Diarios y los enlaces viejos (v1) usan topes FIJOS (sin límite de tiempo): el tablero
  // depende solo de la semilla y debe salir igual en cualquier teléfono (un duelo Killer se regenera desde la semilla).
  // En Clásico, Diagonal y Anti-Caballo el duelo ya NO regenera: el enlace lleva el tablero empaquetado (41 bytes), así que
  // los tableros nuevos se generan con los topes normales del motor (sin el límite de 30 intentos).
  // En Co-op el Host envía el estado completo, así que tampoco hace falta regenerar nada.
  const GEN_E = { maxAttempts: 30, timeBudgetMs: 1e9 };
  const GEN_K = { timeBudgetMs: 1e9 };

  /* ---------- Persistencia segura: localStorage con respaldo en memoria ---------- */
  const store = {
    mem: {},
    get(k) {
      try { const v = window.localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* restringido */ }
      return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null;
    },
    set(k, v) {
      this.mem[k] = v;
      try { window.localStorage.setItem(k, v); } catch (e) { /* cuota o modo privado */ }
    }
  };
  const load = (k, d) => { try { const v = store.get(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  // G incluye `mode`/`variant`, `seed`, `req`, `rec` (grabador del fantasma), `duel` y, en Killer, `cages`.
  // También `maxLives`, `lives`, `lost`, `hintsMax`, `hintsUsed` y, en una racha, `surv`.
  // En una sala Co-op también `coop`, `owners` y `hints` (al restaurar, la partida sigue como partida normal).
  // El duelo en vivo no se guarda; la carrera va a su propia clave: así "Continuar partida" (K_GAME) nunca se pisa con partidas de sala.
  const K_RACE = 'sudoku.race.v1', K_RTOK = 'sudoku.race.tok';
  const persist = () => { try { if (G && G.live) return; store.set(G && G.race ? K_RACE : K_GAME, JSON.stringify(G)); } catch (e) { /* ignorar */ } };
  const saveSet = () => store.set(K_SET, JSON.stringify(set));
  const saveStats = () => { try { store.set(K_STATS, JSON.stringify(stats)); } catch (e) { /* ignorar */ } };

  /* ---------- Estado ---------- */
  const THEMES = { paper: '#F7F4EB', night: '#0E0F12', swiss: '#FFFFFF', retro: '#CCD4A0' }; // tema → color de la barra del navegador
  let set = Object.assign({ theme: 'paper', showErrors: true, mode: 'classic' }, load(K_SET, {}));
  if (!THEMES[set.theme]) set.theme = 'paper';
  set.mode = validMode(set.mode);
  set.zen = !!set.zen;
  set.haptic = set.haptic !== false;
  set.bigNums = !!set.bigNums;
  let stats = Object.assign({ won: {}, best: {}, daily: {}, surv: {} }, load(K_STATS, {}));
  ['won', 'best', 'daily', 'surv', 'g', 'dd', 'sv'].forEach(k => { if (!stats[k] || typeof stats[k] !== 'object') stats[k] = {}; });
  // stats.dd[fecha] = { e: errores con los que se completó ese desafío diario } (los días anteriores a este campo no lo tienen:
  // se tratan como estrella de oro). stats.sv[rotación] = { a: intentos (rachas iniciadas), b: tableros superados en total }.
  Object.keys(stats.dd).forEach(k => {
    const v = stats.dd[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || !Number.isFinite(v.e) || v.e < 0) delete stats.dd[k]; else stats.dd[k] = { e: Math.floor(v.e) };
  });
  Object.keys(stats.sv).forEach(k => {
    const v = stats.sv[k];
    if (!SURV_MODES[k] || !v) delete stats.sv[k];
    else stats.sv[k] = { a: Number.isFinite(v.a) && v.a > 0 ? Math.floor(v.a) : 0, b: Number.isFinite(v.b) && v.b > 0 ? Math.floor(v.b) : 0 };
  });
  // stats.g['<modo|all>.<dificultad>'] = { s: iniciadas, w: ganadas, f: sin errores, bt: mejor tiempo, tt: suma de tiempos,
  //   tn: partidas con tiempo, cs: racha actual, ms: mejor racha }. Las partidas en Modo Zen suman a w/f/racha pero no a bt/tt/tn.
  const blankG = () => ({ s: 0, w: 0, f: 0, bt: 0, tt: 0, tn: 0, cs: 0, ms: 0 });
  const cleanG = o => {
    const b = blankG();
    Object.keys(b).forEach(k => { b[k] = (o && Number.isFinite(o[k]) && o[k] > 0) ? Math.floor(o[k]) : 0; });
    return b;
  };
  Object.keys(stats.g).forEach(k => { stats.g[k] = cleanG(stats.g[k]); });
  // Migración: los mejores tiempos de versiones anteriores pasan a las tarjetas nuevas (lo demás empieza en cero).
  Object.keys(stats.best).forEach(k => {
    const t = stats.best[k], p = k.split('.');
    if (p.length !== 2 || !Number.isFinite(t) || t <= 0) return;
    [k, 'all.' + p[1]].forEach(key => {
      const g = stats.g[key] || (stats.g[key] = blankG());
      if (!g.bt || t < g.bt) g.bt = Math.floor(t);
    });
  });
  Object.keys(stats.surv).forEach(k => { // récords de Supervivencia: { n: tableros, t: segundos }
    const v = stats.surv[k];
    if (!SURV_MODES[k] || !v || !Number.isInteger(v.n) || v.n < 1 || !Number.isFinite(v.t) || v.t < 0) delete stats.surv[k];
  });
  let G = null;          // partida: mode, puzzle, solution, board, notes, diff, req, seed, hist, secs, won, lost, lives, counted, rec, (duel), (daily), (surv), (cages), (coop, owners, hints)
  let view = 'home';     // 'home' | 'game' | 'stats' | 'daily' | 'tutorial'
  let sel = -1, pencil = false, hint = null, busy = false;
  let selMode = set.mode; // modo elegido en el panel "Jugar" del inicio
  let boardEl = null, keypad = null;
  const K_INPUT = 'sudoku_input_mode';
  let inputMode = store.get(K_INPUT) === 'digit-first' ? 'digit-first' : 'cell-first'; // 'cell-first' | 'digit-first'
  let activeDigit = null; // dígito 1–9 elegido en modo 'digit-first' (o null)
  const cells = [], keys = [];
  let cageOf = new Int16Array(81).fill(-1); // índice de jaula por celda (solo Killer)
  let sumAt = new Int16Array(81);           // suma de la jaula en su celda topLeft
  let givensN = 0;                          // pistas iniciales del tablero actual
  let pendingDuel = null;                   // invitación a duelo pendiente (resultado de decodeDuelPayload)
  let pendingCoopKind = 'coop';
  let pendingCoop = null;                   // código de sala Co-op pendiente de confirmar
  let ghostSeen = 0;                        // último segundo efectivo ya revisado para destellos del fantasma
  const flash = new Array(81).fill(0);      // por celda: instante (ms) hasta el que dura el destello
  let lastHintKey = '';                     // evita cobrar dos veces la misma pista
  let aliasCb = null, toastTimer = 0;
  let co = null;                            // sala Co-op activa (ver newCoop)
  const emptyNotes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const BUILD = 'ui-v66';
  // Efectos de sonido (sound.js): nunca deben romper el juego si falta el módulo.
  const sfx = name => { if (name === "error") triggerHaptic("error"); else if (name === "win") triggerHaptic("milestone"); try { if (window.Sound) window.Sound.play(name); } catch (e) { /* ignorar */ } };
  // Vibración háptica (opcional, Ajustes → Vibración). Nunca debe romper el juego si el dispositivo no la soporta.
  const HAPTIC = { tap: 12, error: [30, 40, 30], milestone: [20, 30, 40] };
  // Único punto de vibración: "tap" (teclado, borrar, deshacer, rewind, notas, pista), "error" y "milestone". Navegación y menús no vibran.
  function triggerHaptic(type) {
    try { if (set.haptic !== false && navigator.vibrate && HAPTIC[type]) navigator.vibrate(HAPTIC[type]); } catch (e) { /* ignorar */ }
  }
  let keyMemo = { g: null, rem: [] };       // restantes por dígito en el render anterior (detecta cuándo se agota uno)
  let pendingSfx = null;                    // sonido de la jugada en curso; afterChange decide el definitivo
  let unitsMemo = { g: null, k: new Set() };        // filas/columnas/cajas completas y correctas (para el sonido de "completaste")
  // Enlaza un evento a un id; si el id no existe lo avisa en consola (antes el ?. lo ocultaba).
  const on = (id, ev, fn) => {
    const el = document.getElementById(id);
    if (!el) { console.warn('[Sudoku] No existe #' + id + ' en index.html'); return null; }
    el.addEventListener(ev, fn);
    return el;
  };
  const setText = (sel_, txt) => { const el = $(sel_); if (el) el.textContent = txt; };
  const mk = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  };

  function toast(msg) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
  }

  // Modal de carga reutilizable (generar tablero / conectar a una sala).
  function showLoad(txt, cancelable) {
    setText('#loadTxt', txt);
    const b = $('#loadCancel'); if (b) b.hidden = !cancelable;
    const rb = $('#loadRetry'); if (rb) rb.hidden = true;
    const m = $('#mLoad'); if (m) m.hidden = false;
  }
  function hideLoad() {
    const m = $('#mLoad'); if (m) m.hidden = true;
    const b = $('#loadCancel'); if (b) b.hidden = true;
    const rb = $('#loadRetry'); if (rb) rb.hidden = true;
  }

  /* ---------- Tiempo efectivo (cronómetro + penalización por pistas) ---------- */
  const eff = () => G.secs + HINT_PENALTY * (G.rec ? G.rec.hints : 0);
  // El reloj visible muestra: en una racha, el tiempo acumulado de toda la racha; en duelos, el tiempo efectivo;
  // en partidas normales, el cronómetro simple.
  const showSecs = () => (G.surv ? (G.surv.prev | 0) + G.secs : (G.duel ? eff() : G.secs));

  // ¿La partida actual es una sala Co-op con la conexión viva? (si la sala se cierra, la partida sigue como normal)
  const inCoop = () => !!(G && G.coop && co && co.session);

  // ¿La partida terminó (ganada o perdida)? Con la partida terminada no se acepta más entrada.
  const isOver = () => !!(G && (G.won || G.lost || (G.race && G.race.over)));

  /* ---------- Vidas ---------- */
  // Vidas infinitas: Fácil (maxLives 0).
  // Duelos, Co-op y Supervivencia siempre llevan sus vidas.
  const lifeInf = () => !G.maxLives;

  // Reglas iniciales de vidas y pistas según el tipo de partida.
  function rulesFor(diff, o) {
    if (o.surv) return { maxLives: 1, maxHints: 0 };
    if (o.zen) return { maxLives: 0, maxHints: 9 };   // Modo Zen: sin vidas y con pistas de sobra
    if (o.duel || o.invite) return { maxLives: FRIEND_LIVES, maxHints: HINTS_DUEL };
    return { maxLives: LIVES_BY_DIFF[diff] | 0, maxHints: HINTS_SOLO };
  }

  function livesText() {
    if (lifeInf()) return '\u221E';
    let s = '';
    for (let i = 0; i < G.maxLives; i++) s += i < G.lives ? HEART_ON : HEART_OFF;
    return s;
  }

  function updateLives() {
    const el = $('#lives'), sp = $('#livesSep'); if (!el) return;
    const show = !!G && !G.surv && !G.zen;   // en una racha no hay margen (la sub-barra muestra la racha); en Zen no hay vidas
    el.hidden = !show; if (sp) sp.hidden = !show;
    if (!show) return;
    const inf = lifeInf();
    el.classList.toggle('inf', inf);
    if (inf) el.innerHTML = '<span class="inf-symbol">&#8734;</span>'; else el.textContent = livesText();
    el.setAttribute('aria-label', inf ? 'Vidas ilimitadas' : 'Vidas: ' + G.lives + ' de ' + G.maxLives);
  }

  function pulseLives() {
    const el = $('#lives'); if (!el) return;
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
    setTimeout(() => { el.classList.remove('hit'); }, 600);
  }

  /* ---------- Pistas restantes ---------- */
  // En Co-op las pistas son compartidas (G.hints, las suma el Host); en el resto, G.hintsUsed.
  const hintsLeft = () => Math.max(0, (G.hintsMax | 0) - Math.max(G.hintsUsed | 0, G.hints | 0));

  /* ---------- Vecindad por modo ---------- */
  const peerCache = {};
  // Celdas que "ven" a cada celda: fila, columna, bloque + diagonal (diagonal) o salto de caballo (antiknight).
  function basePeers(mode) {
    const jig = mode === 'jigsaw' && G && Array.isArray(G.regions);
    const key = mode === 'killer' ? 'classic' : (jig ? 'jigsaw:' + G.regions.join('') : mode);
    if (peerCache[key]) return peerCache[key];
    if (jig) Object.keys(peerCache).forEach(k => { if (k.indexOf('jigsaw:') === 0) delete peerCache[k]; });
    const out = [];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, s = new Set();
      for (let j = 0; j < 9; j++) { s.add(r * 9 + j); s.add(j * 9 + c); }
      if (jig) {
        for (let j = 0; j < 81; j++) if (G.regions[j] === G.regions[i]) s.add(j);
      } else {
        const br = r - (r % 3), bc = c - (c % 3);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s.add((br + a) * 9 + bc + b);
      }
      if (key === 'diagonal') {
        if (r === c) for (let j = 0; j < 9; j++) s.add(j * 9 + j);
        if (r + c === 8) for (let j = 0; j < 9; j++) s.add(j * 9 + 8 - j);
      }
      if (key === 'antiknight') knightOf(i).forEach(p => s.add(p));
      s.delete(i);
      out.push(Array.from(s));
    }
    peerCache[key] = out;
    return out;
  }

  function knightOf(i) {
    const r = Math.floor(i / 9), c = i % 9, out = [];
    KN.forEach(m => {
      const rr = r + m[0], cc = c + m[1];
      if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) out.push(rr * 9 + cc);
    });
    return out;
  }

  // Celdas que comparten lado con la celda i (arriba, abajo, izquierda, derecha).
  function adjOf(i) {
    const r = Math.floor(i / 9), c = i % 9, out = [];
    if (r > 0) out.push(i - 9);
    if (r < 8) out.push(i + 9);
    if (c > 0) out.push(i - 1);
    if (c < 8) out.push(i + 1);
    return out;
  }

  function diagonalsOf(i) {
    const r = Math.floor(i / 9), c = i % 9, out = [];
    if (r === c) for (let j = 0; j < 9; j++) out.push(j * 9 + j);
    if (r + c === 8) for (let j = 0; j < 9; j++) out.push(j * 9 + 8 - j);
    return out.filter(p => p !== i);
  }

  // Celdas donde una colocación debe borrar notas: vecinas del modo + compañeras de jaula en Killer.
  function notePeers(i) {
    const p = basePeers(G.mode)[i];
    if (G.mode !== 'killer' || cageOf[i] < 0) return p;
    const mates = G.cages[cageOf[i]].cells.map(q => q[0] * 9 + q[1]).filter(j => j !== i && p.indexOf(j) < 0);
    return p.concat(mates);
  }

  // Pares [celda, dígito] cuyas notas se borran al colocar v en la celda i: el dígito v en las celdas relacionadas y,
  // en Sin Consecutivos, también v - 1 y v + 1 en las celdas ortogonalmente adyacentes.
  function noteClears(i, v) {
    const out = notePeers(i).map(j => [j, v]);
    if (G.mode === 'nonconsecutive') {
      adjOf(i).forEach(j => { if (v > 1) out.push([j, v - 1]); if (v < 9) out.push([j, v + 1]); });
    }
    return out;
  }

  // Prepara los índices derivados (no se guardan en G): jaulas de Killer y cantidad de pistas iniciales.
  function prepareGame() {
    cageOf = new Int16Array(81).fill(-1);
    sumAt = new Int16Array(81);
    givensN = 0;
    if (!G) return;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (G.puzzle[r][c]) givensN++;
    if (G.mode !== 'killer') return;
    G.cages.forEach((cg, idx) => {
      let tl = cg.topLeft ? cg.topLeft[0] * 9 + cg.topLeft[1] : 81;
      cg.cells.forEach(q => {
        const k = q[0] * 9 + q[1];
        cageOf[k] = idx;
        if (!cg.topLeft && k < tl) tl = k;
      });
      if (tl < 81) sumAt[tl] = cg.sum | 0;
    });
  }

  /* ---------- Motor según el modo ---------- */
  // Variante que se le pasa al motor: en Jigsaw lleva el mapa de regiones de la partida.
  const eVar = () => (G.mode === 'jigsaw' ? { name: 'jigsaw', regions: G.regions } : G.mode);
  const wrongCells = () => (G.mode === 'killer' ? K : E).findWrongCells(G.board, G.solution);
  const isSolvedNow = () => (G.mode === 'killer'
    ? K.isKillerSolved(G.board, G.cages, G.solution)
    : E.isSolved(G.board, G.solution, G.mode));
  const computeHint = () => (G.mode === 'killer'
    ? K.getKillerHint(G.board, G.solution, G.cages, G.notes)
    : E.getSmartHint(G.board, G.solution, G.notes, eVar()));

  /* ---------- Construcción del DOM ---------- */
  function buildDom() {
    if (boardEl && !cells.length) {
      for (let i = 0; i < 81; i++) {
        const d = document.createElement('div');
        d.className = 'cell'; d.dataset.i = i; d.setAttribute('role', 'gridcell');
        boardEl.appendChild(d); cells.push(d);
      }
    }
    if (keypad && !keys.length) {
      for (let n = 1; n <= 9; n++) {
        const b = document.createElement('button');
        b.dataset.n = n; b.innerHTML = n + '<span class="rem"></span>'; b.setAttribute('aria-label', 'Número ' + n);
        keypad.appendChild(b); keys.push(b);
      }
    }
  }

  /* ---------- Edición con historial ilimitado ---------- */
  // fn recibe t(r,c): registra el estado previo de la celda antes de modificarla.
  function mutate(fn) {
    const snap = new Map();
    const t = (r, c) => {
      const k = r * 9 + c;
      if (!snap.has(k)) snap.set(k, [r, c, G.board[r][c], G.notes[r][c].slice()]);
    };
    fn(t);
    if (snap.size) G.hist.push(Array.from(snap.values()));
    afterChange();
  }

  function place(r, c, v, t) {
    t(r, c);
    G.board[r][c] = v; G.notes[r][c] = [];
    noteClears(r * 9 + c, v).forEach(p => { // borra la nota v (y v±1 junto a vecinos ortogonales en Sin Consecutivos)
      const rr = Math.floor(p[0] / 9), cc = p[0] % 9, k = G.notes[rr][cc].indexOf(p[1]);
      if (k >= 0) { t(rr, cc); G.notes[rr][cc].splice(k, 1); }
    });
  }

  // Filas, columnas y cajas completas y correctas.
  function unitsDone() { return unitMap().size; }
  // Mapa clave de unidad ('r3', 'c0', 'b5') → índices de sus 9 celdas, solo de las completas y correctas.
  function unitMap() {
    const ok = (r, c) => G.board[r][c] && G.board[r][c] === G.solution[r][c];
    const done = new Map();
    let regCells = null;
    if (G.mode === 'jigsaw' && Array.isArray(G.regions)) {
      regCells = Array.from({ length: 9 }, () => []);
      G.regions.forEach((g, i) => regCells[g].push(i));
    }
    for (let a = 0; a < 9; a++) {
      let row = true, col = true, box = true;
      const bc = [];
      for (let b = 0; b < 9; b++) {
        if (!ok(a, b)) row = false;
        if (!ok(b, a)) col = false;
        if (regCells) {
          const q = regCells[a][b]; bc.push(q);
          if (!ok(Math.floor(q / 9), q % 9)) box = false;
        } else {
          const br = Math.floor(a / 3) * 3 + Math.floor(b / 3), bcol = (a % 3) * 3 + (b % 3);
          bc.push(br * 9 + bcol);
          if (!ok(br, bcol)) box = false;
        }
      }
      if (row) done.set('r' + a, Array.from({ length: 9 }, (_, b) => a * 9 + b));
      if (col) done.set('c' + a, Array.from({ length: 9 }, (_, b) => b * 9 + a));
      if (box) done.set('b' + a, bc);
    }
    return done;
  }

  // Destello suave sobre las 9 celdas de una unidad recién completada (se aplica tras render()).
  let pendingFlash = null;
  function flashUnits() {
    const cells = pendingFlash; pendingFlash = null;
    if (!cells || !cells.size) return;
    const boardEl = $('#board'); if (!boardEl) return;
    const els = [];
    cells.forEach(i => { const el = boardEl.querySelector('.cell[data-i="' + i + '"]'); if (el) { el.classList.remove('unit-flash'); els.push(el); } });
    void boardEl.offsetWidth; // reinicia la animación si ya estaba corriendo
    els.forEach(el => { el.classList.add('unit-flash'); setTimeout(() => el.classList.remove('unit-flash'), 480); });
  }

  // Un único sonido por jugada: victoria > derrota > unidad completada > el de la propia acción (nota, acierto, error).
  function sfxFor(defeat) {
    const fromAction = pendingSfx; pendingSfx = null;
    let map = new Map();
    try { map = G.solution ? unitMap() : map; } catch (e) { map = new Map(); }
    const fresh = new Set();
    if (unitsMemo.g === G) map.forEach((cells, k) => { if (!unitsMemo.k.has(k)) cells.forEach(i => fresh.add(i)); });
    const grew = fresh.size > 0;
    if (grew && !G.won) pendingFlash = fresh;
    unitsMemo = { g: G, k: new Set(map.keys()) };
    if (G.won) return 'win';
    if (defeat) return 'lose';
    if (fromAction === 'error') return 'error';
    if (grew) return 'line';
    return fromAction;
  }

  function afterChange() {
    hideHint();
    // El grabador del fantasma se sincroniza tras CADA cambio (colocar, borrar, deshacer, pista).
    if (G.rec) G.rec.sync(G.board, G.solution, G.puzzle, eff());
    if (!G.won && isSolvedNow()) { G.won = true; sel = -1; finishGame(); }
    // Derrota por vidas: se frena el cronómetro (el intervalo ignora las partidas perdidas) y se muestra el modal.
    let defeat = false;
    if (!G.won && !G.lost && !lifeInf() && G.lives <= 0) { G.lost = true; sel = -1; defeat = true; }
    if (defeat) statLoss(G);
    sfx(sfxFor(defeat));
    if (inLive()) sendLiveProg(); else if (inRace()) raceReport();
    render(); persist();
    flashUnits();
    if (defeat) showLose();
  }

  /* ---------- Explicación del error (solo Fácil, Medio y Difícil) ---------- */
  const EXPLAIN_DIFFS = ['facil', 'medio', 'dificil'];
  let errTimer = 0;
  function hideErrExplain() {
    clearTimeout(errTimer);
    const b = $('#errExplain'); if (b) b.hidden = true;
  }
  function showErrExplain(msg) {
    const b = $('#errExplain'); if (!b) return;
    setText('#errExplainTxt', msg); b.hidden = false;
    const bar = b.querySelector('.errx-bar');   // reinicia la barra de progreso desde cero
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    clearTimeout(errTimer);
    errTimer = setTimeout(hideErrExplain, 4000);
  }

  // Motivo por el que `n` no encaja en (r, c): regla del modo que se rompe o, si no choca con nada, la solución única.
  function explainWrong(r, c, n) {
    const i = r * 9 + c, mode = G.mode;
    const at = j => G.board[Math.floor(j / 9)][j % 9];
    const dup = list => list.some(j => j !== i && at(j) === n);
    const row = [], col = [];
    for (let k = 0; k < 9; k++) { row.push(r * 9 + k); col.push(k * 9 + c); }
    if (dup(row)) return 'El ' + n + ' ya está en esta fila.';
    if (dup(col)) return 'El ' + n + ' ya está en esta columna.';
    if (mode === 'jigsaw' && Array.isArray(G.regions)) {
      if (dup(basePeers(mode)[i].filter(j => G.regions[j] === G.regions[i]))) return 'El ' + n + ' ya está en esta región.';
    } else {
      const box = [], br = r - (r % 3), bc = c - (c % 3);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) box.push((br + a) * 9 + bc + b);
      if (dup(box)) return 'El ' + n + ' ya está en esta caja 3×3.';
    }
    if (mode === 'diagonal') {
      if (r === c && dup(diagonalsOf(i).filter(j => Math.floor(j / 9) === j % 9))) return 'El ' + n + ' ya está en la diagonal principal.';
      if (r + c === 8 && dup(diagonalsOf(i).filter(j => Math.floor(j / 9) + (j % 9) === 8))) return 'El ' + n + ' ya está en la diagonal secundaria.';
    }
    if (mode === 'antiknight' && dup(knightOf(i))) return 'El ' + n + ' choca con otro ' + n + ' a un salto de caballo.';
    if (mode === 'nonconsecutive') {
      const nb = adjOf(i).map(at).find(v => v && Math.abs(v - n) === 1);
      if (nb) return 'El ' + n + ' es consecutivo del ' + nb + ' que está pegado a esta celda.';
    }
    if (mode === 'killer' && cageOf[i] >= 0) {
      const cg = G.cages[cageOf[i]], cells = cg.cells.map(q => q[0] * 9 + q[1]);
      if (dup(cells)) return 'El ' + n + ' ya está en esta jaula.';
      const others = cells.filter(j => j !== i);
      const total = others.reduce((a, j) => a + at(j), 0) + n;
      if (total > cg.sum) return 'La suma de la jaula superaría ' + cg.sum + '.';
      if (others.every(j => at(j)) && total !== cg.sum) return 'La jaula debe sumar ' + cg.sum + ', no ' + total + '.';
    }
    return 'No choca a simple vista, pero impide completar el tablero de forma lógica.';
  }

  function input(n) {
    if (!G || sel < 0 || isOver()) return;
    hideErrExplain();
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c]) return;
    triggerHaptic("tap");
    if (inCoop()) {
      if (pencil) { if (!G.board[r][c]) { sfx('note'); coopDo('note', sel, n); } }
      else if (G.board[r][c] !== n) {
        const bad = !!(G.solution && G.solution[r][c] && n !== G.solution[r][c]);
        sfx(bad ? 'error' : 'correct');
        // Error en Co-op: el banner con el motivo sale en ambos dispositivos (aquí y en el del compañero)
        const why = bad && set.showErrors ? explainWrong(r, c, n) : '';
        coopDo('set', sel, n);
        if (why && !isOver()) {
          showErrExplain(why);
          try { co.session.send({ type: 'coop-mistake-alert', reason: why, playerName: (co.session.info() || {}).alias || 'Tu amigo' }); } catch (e) { /* sin conexión */ }
        }
      }
      return;
    }
    if (pencil) {
      if (G.board[r][c]) return;
      pendingSfx = 'note';
      mutate(t => {
        t(r, c);
        const a = G.notes[r][c], k = a.indexOf(n);
        if (k < 0) { a.push(n); a.sort((x, y) => x - y); } else a.splice(k, 1);
      });
    } else if (G.board[r][c] !== n) {
      // Solo un dígito definitivo erróneo resta vida (nunca notas ni borrar). Volver a tocar el mismo dígito ya puesto no entra aquí.
      const bad = n !== G.solution[r][c];
      if (G.rec && bad) G.rec.addError(); // error cometido (cuenta aunque no se marque en pantalla)
      if ((G.live || G.race) && bad) G.errs = (G.errs | 0) + 1;
      if (bad && !lifeInf()) {
        G.lives = Math.max(0, G.lives - 1);
        pulseLives();
        if (G.lives > 0) toast('\u22121 vida \u00B7 te ' + (G.lives === 1 ? 'queda 1' : 'quedan ' + G.lives));
      }
      pendingSfx = bad ? (G.zen ? 'note' : 'error') : 'correct';
      const why = bad && set.showErrors && EXPLAIN_DIFFS.indexOf(G.diff) >= 0 ? explainWrong(r, c, n) : '';
      mutate(t => place(r, c, n, t));
      if (why && !isOver()) showErrExplain(why);
    }
  }

  function erase() {
    if (!G || sel < 0 || isOver()) return;
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c] || (!G.board[r][c] && !G.notes[r][c].length)) return;
    triggerHaptic("tap");
    if (inCoop()) { coopDo('erase', sel, 0); return; }
    pendingSfx = 'tap';
    mutate(t => { t(r, c); G.board[r][c] = 0; G.notes[r][c] = []; });
  }

  /* ---------- Entrada "Número Primero" (digit-first) ---------- */
  const isDigitFirst = () => inputMode === 'digit-first';

  // Cuántas veces falta colocar el dígito n (misma regla que el contador del teclado).
  function digitsLeft(n) {
    let placed = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (G.board[r][c] === n && (!set.showErrors || G.solution[r][c] === n)) placed++;
      }
    }
    return Math.max(0, 9 - placed);
  }

  // Si el dígito activo ya está completo, salta al siguiente con huecos (1–9, en círculo); si no queda ninguno, se suelta.
  function syncActiveDigit() {
    if (!G || !isDigitFirst()) { activeDigit = null; return; }
    if (!activeDigit || digitsLeft(activeDigit) > 0) return;
    let next = null;
    for (let k = 1; k <= 8 && !next; k++) {
      const n = ((activeDigit - 1 + k) % 9) + 1;
      if (digitsLeft(n) > 0) next = n;
    }
    activeDigit = next;
    sel = -1;   // al auto-avanzar de dígito no queda marcada la última celda del número anterior
  }

  // Tecla numérica: en 'digit-first' elige (o suelta) el dígito activo; en 'cell-first' escribe en la celda elegida.
  function pressDigit(n) {
    if (!G || isOver()) return;
    if (isDigitFirst()) {
      activeDigit = activeDigit === n ? null : n;
      sfx('tap'); triggerHaptic('tap');
      sel = -1; hideHint(); render();
    } else {
      input(n);
    }
  }

  // Alterna el modo de entrada. Al volver a 'cell-first' se limpia activeDigit; el tablero no se toca.
  function toggleInputMode() {
    inputMode = isDigitFirst() ? 'cell-first' : 'digit-first';
    activeDigit = null;
    store.set(K_INPUT, inputMode);
    render();
  }

  function undo() {
    if (!G || G.lost) return;
    triggerHaptic("tap");
    if (inCoop()) {
      if (G.won) return;
      if (co.role === 'host') {
        const res = coopApply(1, { kind: 'undo' }, false);
        coopAfter(res, 1, 0);
      } else if (co.session.isConnected()) {
        co.session.send({ type: 'op', kind: 'undo', id: ++co.opId });
      } else {
        toast('Sin conexión con tu amigo. Reconectando…');
      }
      return;
    }
    if (!G.hist.length) return;
    G.hist.pop().forEach(([r, c, v, n]) => { G.board[r][c] = v; G.notes[r][c] = n; });
    pendingSfx = 'tap';
    G.won = false; afterChange(); // las vidas perdidas no se recuperan al deshacer
  }


  /* ---------- Rewind seguro: volver al último estado sin celdas erróneas ---------- */
  // Recorre el historial hacia atrás (sin tocar nada) hasta que el tablero no tenga ningún número distinto de la solución.
  function rewindSteps() {
    const b = G.board.map(r => r.slice());
    const wrong = () => { for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (b[r][c] && b[r][c] !== G.solution[r][c]) return true; return false; };
    if (!wrong()) return 0;
    for (let i = G.hist.length - 1, n = 1; i >= 0; i--, n++) {
      G.hist[i].forEach(([r, c, v]) => { b[r][c] = v; });
      if (!wrong()) return n;
    }
    return G.hist.length;
  }
  function rewind() {
    if (!G || isOver() || inCoop()) return;
    if (!G.hist.length) { toast('No hay movimientos para retroceder'); return; }
    const n = rewindSteps();
    if (!n) { toast('Tu tablero no tiene errores ✓'); return; }
    triggerHaptic("tap");
    if (n > 1 && !window.confirm('Se retrocederán ' + n + ' movimientos hasta el último tablero sin errores. ¿Continuar?')) return;
    for (let k = 0; k < n; k++) G.hist.pop().forEach(([r, c, v, nt]) => { G.board[r][c] = v; G.notes[r][c] = nt; });
    pendingSfx = 'tap';
    G.won = false; afterChange(); // las vidas perdidas no se recuperan
    toast('Tablero restaurado sin errores (' + n + (n === 1 ? ' movimiento' : ' movimientos') + ')');
  }
  /* ---------- Pistas ---------- */
  // Nombre legible de la técnica de una pista (para la tarjeta explicativa).
  const TECH_NAMES = {
    nakedSingle: 'Naked Single', hiddenSingle: 'Hidden Single', nakedPair: 'Naked Pair', pointing: 'Pointing Pair/Triple',
    boxLine: 'Box-Line', xwing: 'X-Wing', singleCell: 'Celda única de jaula', cageLastCell: 'Última celda de la jaula', rule45: 'Regla del 45'
  };
  function hintTitle(h) {
    if (h.type === 'error') return 'Hay un error en el tablero';
    if (h.type === 'solution') return 'Técnica avanzada';
    const t = h.technique ? (TECH_NAMES[h.technique] || '') : '';
    const via = (h.via || []).map(v => TECH_NAMES[v]).filter(Boolean);
    return via.length ? via.join(' + ') + ' → ' + t : t || 'Pista';
  }
  function hideHint() {
    hint = null;
    const h = $('#hint'); if (h) h.hidden = true;
  }

  // Cada pista nueva suma una pista usada (y +30 s al tiempo final en duelos). Pedir otra vez la misma pista no se vuelve a cobrar.
  // En una sala Co-op las pistas se cuentan en equipo (sin penalización de tiempo): el Host las suma y las difunde.
  // Devuelve false si ya no quedan pistas (y la pista no es la que ya estaba en pantalla).
  function chargeHint(h) {
    let filled = 0;
    if (inCoop()) { for (let i = 0; i < 81; i++) if (G.board[Math.floor(i / 9)][i % 9]) filled++; }
    const key = (inCoop() ? 'c' + filled : G.hist.length) + ':' + h.row + ',' + h.col + ',' + h.value;
    if (key === lastHintKey) return true;
    if (hintsLeft() <= 0) return false;
    lastHintKey = key;
    if (inCoop()) {
      G.hints = (G.hints | 0) + 1; // el Invitado lo suma en optimista: el Host corrige con `clock`
      if (co.role === 'host') {
        if (co.session.isConnected()) co.session.send({ type: 'clock', secs: G.secs, hints: G.hints });
      } else {
        co.session.send({ type: 'hint' });
      }
      persist();
      return true;
    }
    G.hintsUsed = (G.hintsUsed | 0) + 1;
    if (G.rec) G.rec.addHint();
    if (G.duel) { toast('+' + HINT_PENALTY + ' s de penalización'); advanceGhost(); }
    persist();
    return true;
  }

  function showHint() {
    if (!G || isOver()) return;
    let h = null;
    try { h = computeHint(); } catch (e) { h = undefined; }
    const box = $('#hint'), apply = $('#hintApply');
    if (h && !chargeHint(h)) { toast('Ya no te quedan pistas'); render(); return; }
    triggerHaptic("tap");
    if (box) box.hidden = false;
    if (h === undefined) {
      hint = null; if (apply) apply.hidden = true;
      setText('#hintTech', ''); setText('#hintText', 'No se pudo calcular una pista para este tablero.');
      return;
    }
    if (!h) {
      hint = null; if (apply) apply.hidden = true;
      setText('#hintTech', ''); setText('#hintText', 'El tablero está completo y correcto.');
      return;
    }
    hint = h; sel = h.row * 9 + h.col;
    if (apply) apply.hidden = false;
    let msg = h.reason;
    if (h.type === 'error') msg += ' Corregilo, o usá «Rewind» para volver al último estado sin errores.';
    else if (h.type === 'solution') msg = 'Este paso necesita técnicas más avanzadas que las que detecta la pista. ' + msg;
    setText('#hintTech', hintTitle(h));
    setText('#hintText', msg + (G.duel ? ' (+' + HINT_PENALTY + ' s)' : ''));
    render();
  }

  function applyHint() {
    if (!hint || isOver()) return;
    const h = hint;
    if (inCoop()) {
      hideHint();
      coopDo('set', h.row * 9 + h.col, h.value);
      return;
    }
    pendingSfx = 'correct';
    mutate(t => place(h.row, h.col, h.value, t)); // el valor de la pista es el correcto: nunca resta vida
  }

  /* ---------- Estado de la jaula seleccionada (Killer) ---------- */
  function updateCageStatus() {
    const sumEl = $('#cageSum'), leftEl = $('#cageLeft');
    if (!sumEl || !leftEl) return;
    if (!G || G.mode !== 'killer' || sel < 0 || cageOf[sel] < 0) {
      sumEl.textContent = '—'; leftEl.textContent = '—'; return;
    }
    const cg = G.cages[cageOf[sel]];
    let filled = 0;
    cg.cells.forEach(q => { filled += G.board[q[0]][q[1]] || 0; });
    sumEl.textContent = String(cg.sum);
    leftEl.textContent = String(cg.sum - filled);
  }

  /* ---------- Supervivencia: sub-barra ---------- */
  function updateSurvBar() {
    const el = $('#survBar'); if (!el) return;
    const on_ = !!(G && G.surv);
    el.hidden = !on_;
    if (!on_) return;
    const S = G.surv, rec = stats.surv[S.rot];
    setText('#survStreak', String(S.n - 1 + (G.won ? 1 : 0)));
    setText('#survN', String(S.n));
    setText('#survRec', rec ? String(rec.n) : '—');
  }

  /* ---------- Duelo: progreso dual y fantasma ---------- */
  // Celdas con número que cuentan para mi progreso X/81 (con errores ocultos, cuenta lo colocado).
  function myProgress() {
    let n = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = G.board[r][c];
        if (v && (!set.showErrors || v === G.solution[r][c])) n++;
      }
    }
    return n;
  }

  // Tarjeta del duelo 1v1 en vivo: Vos (--coop-p1) y el rival (--coop-p2) con su avance, y el botón "Salir del duelo".
  function updateLiveBar(bar) {
    bar.hidden = false;
    bar.classList.remove('live'); bar.classList.add('lv');
    const lv = $('#duelLive'); if (lv) lv.hidden = true;
    const q = $('#duelQuit'); if (q) q.hidden = !inLive();
    const mine = liveFilled(), theirs = G.lv.rf;
    setText('#duelMe', mine + '/81');
    setText('#duelMeT', fmt(G.secs));
    const mb = $('#duelMeBar'); if (mb) mb.style.width = (mine / 81 * 100) + '%';
    setText('#duelRivalName', G.lv.alias || 'Rival');
    setText('#duelRival', theirs + '/81');
    const rb = $('#duelRivalBar'); if (rb) rb.style.width = (theirs / 81 * 100) + '%';
    const reconnecting = inLive() && co.session.info().state === 'reconnecting';
    const hearts = G.lv.rl > 0 ? '♥'.repeat(G.lv.rl) + '♡'.repeat(Math.max(0, FRIEND_LIVES - G.lv.rl)) : 'Eliminado';
    setText('#duelRivalT', reconnecting ? 'Reconectando…' : hearts);
  }

  function updateDuelBar() {
    const bar = $('#duelBar'); if (!bar) return;
    if (G && G.live && G.lv) { updateLiveBar(bar); return; }
    bar.classList.remove('lv');
    const qb = $('#duelQuit'); if (qb) qb.hidden = true;
    const active = !!(G && G.duel && D);
    bar.hidden = !active;
    if (!active) return;
    const live = !!G.duel.open;           // invitación abierta: sin marcador de rival
    bar.classList.toggle('live', live);
    const lv = $('#duelLive');
    if (lv) { lv.hidden = !live; if (live) lv.textContent = D.liveLabel(G.mode, G.req); }
    const t = eff();
    const mine = myProgress();
    setText('#duelMe', mine + '/81');
    setText('#duelMeT', fmt(t));
    const mb = $('#duelMeBar'); if (mb) mb.style.width = (mine / 81 * 100) + '%';
    if (live) return;
    const theirs = D.ghostProgress(G.duel.moves, t, givensN);
    setText('#duelRivalName', G.duel.alias);
    setText('#duelRival', theirs + '/81');
    setText('#duelRivalT', 'Obj. ' + fmt(G.duel.time));
    const rb = $('#duelRivalBar'); if (rb) rb.style.width = (theirs / 81 * 100) + '%';
  }

  // Marca para destello las celdas que el rival completó desde la última revisión, si en mi tablero siguen vacías.
  // Devuelve true si hay algún destello nuevo (la app vuelve a pintar el tablero).
  function advanceGhost() {
    if (!G || !G.duel || !D || G.duel.open) return false;
    const now = eff();
    const cs = D.ghostCellsBetween(G.duel.moves, ghostSeen, now);
    ghostSeen = Math.max(ghostSeen, now);
    let any = false;
    cs.forEach(i => {
      const r = Math.floor(i / 9), c = i % 9;
      if (!G.puzzle[r][c] && !G.board[r][c]) { flash[i] = Date.now() + FLASH_MS; any = true; }
    });
    if (any) setTimeout(() => { if (G && view === 'game') render(); }, FLASH_MS + 60);
    return any;
  }

  /* ---------- Co-op: barra de sala y foco del compañero ---------- */
  function updateCoopBar() {
    const bar = $('#coopBar'); if (!bar) return;
    const active = inCoop();
    bar.hidden = !active;
    if (!active) return;
    const info = co.session.info();
    bar.dataset.state = info.state;
    const who = info.peerAlias || co.friendAlias || 'tu compañero';
    const waiting = co.role === 'host' && !!co.guestLeft && info.state !== 'connected';
    setText('#coopStatus', waiting ? 'Esperando a ' + who + '…'
      : (info.state === 'reconnecting' && (co.hasState || co.role === 'host') ? 'Reconectando con ' + who + '…' : C.statusText(info)));
    const md = $('#coopMeDot'), fd = $('#coopFriendDot');
    if (md) md.className = 'pdot p1';
    if (fd) fd.className = 'pdot p2';
    setText('#coopMeName', 'Vos');
    setText('#coopFriendName', info.peerAlias || co.friendAlias || 'Amigo');
    setText('#coopCount', myProgress() + '/81');
    const sh = $('#coopShare'); if (sh) { sh.hidden = co.role !== 'host' || info.state === 'connected'; sh.textContent = waiting ? 'Copiar link' : 'Compartir'; }
    const so = $('#coopSolo'); if (so) so.hidden = !waiting;
    const ce = $('#coopEnd'); if (ce) ce.textContent = co.role === 'host' ? 'Terminar partida' : 'Salir de la sala';
  }

  // Avisa al compañero de qué celda tengo activa (-1 si estoy fuera del tablero o ya se resolvió).
  function syncFocus() {
    if (!inCoop()) return;
    const f = (view === 'game' && !isOver()) ? sel : -1;
    if (f === co.sentFocus) return;
    if (co.session.send({ type: 'focus', index: f })) co.sentFocus = f;
  }

  // Inicial del compañero para la insignia de su cursor.
  function coopInitial() {
    const a = String((co && (co.friendAlias || (co.session.info() || {}).peerAlias)) || '').trim();
    return (a ? Array.from(a)[0].toUpperCase() : 'J' + (co && co.me === 1 ? 2 : 1)).replace(/[<>&"]/g, '');
  }

  /* ---------- Render ---------- */
  function render() {
    if (!G || !cells.length) return;
    syncActiveDigit();
    const df = isDigitFirst();
    const mode = G.mode, killer = mode === 'killer';
    const coop = inCoop();
    const ff = coop ? co.friendFocus : -1;
    const wrong = set.showErrors ? new Set(wrongCells().map(w => w.row * 9 + w.col)) : null;
    const hasSel = sel >= 0;
    const sr = Math.floor(sel / 9), sc = sel % 9;
    const sv = hasSel ? G.board[sr][sc] : 0;
    const hv = (df && activeDigit) || sv || 0; // dígito cuyas apariciones se resaltan
    const peerSet = hasSel ? new Set(basePeers(mode)[sel]) : null;
    let extra = null; // celdas con anillo suave: diagonal(es) de la selección o saltos de caballo
    if (hasSel && mode === 'antiknight') extra = new Set(knightOf(sel));
    else if (hasSel && mode === 'diagonal') extra = new Set(diagonalsOf(sel));
    else if (hasSel && mode === 'nonconsecutive') extra = new Set(adjOf(sel));
    const rel = new Set(hint ? hint.related.map(p => p.row * 9 + p.col) : []);
    const count = new Array(10).fill(0);
    const nowMs = Date.now();

    // Etiquetas superiores, modo en tablero y barra de estado
    const ml = G.surv ? '\uD83D\uDD25 ' + (MODE_NAMES[mode] || 'Sudoku') : (G.daily ? 'Diario' : (MODE_NAMES[mode] || 'Sudoku'));
    setText('#modeLabel', (G.duel || G.live ? '⚔ ' : (G.race ? '🏁 ' : (coop ? '👥 ' : ''))) + ml);
    setText('#diffLabel', G.zen ? (NAMES[G.diff] || 'Sudoku') + ' · Zen' : G.surv ? '#' + G.surv.n + ' ' + (NAMES[G.diff] || '') : (G.daily ? dateLabel(G.daily) : (NAMES[G.diff] || 'Sudoku')));
    setText('#clock', fmt(coop ? G.secs : showSecs()));
    // Modo Zen: sin cronómetro ni vidas (queda una etiqueta tranquila en su lugar).
    const zenOn = !!G.zen;
    const ck = $('#clock'), zt = $('#zenTag'), sd = $('#livesSep');
    if (ck) ck.hidden = zenOn;
    if (zt) zt.hidden = !zenOn;
    if (zenOn && sd) sd.hidden = true;
    updateLives();
    updateSurvBar();
    if (boardEl) {
      boardEl.dataset.mode = mode;
      boardEl.classList.toggle('coop', coop);
      boardEl.classList.toggle('coop-off', coop && co.role === 'guest' && !co.session.isConnected());
    }
    const st = $('#status'); if (st) st.hidden = !killer;
    updateCageStatus();

    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, v = G.board[r][c], el = cells[i];
      let cl;
      if (mode === 'jigsaw' && G.regions) { // bordes gruesos solo donde la celda vecina es de otra región
        const rg = G.regions;
        cl = 'cell' + (c < 8 && rg[i] !== rg[i + 1] ? ' br' : '') + (r < 8 && rg[i] !== rg[i + 9] ? ' bb' : '');
      } else {
        cl = 'cell' + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '');
      }
      if (G.puzzle[r][c]) cl += ' given'; else if (v) cl += ' user';
      if (mode === 'diagonal' && (r === c || r + c === 8)) cl += ' diagonal-cell';
      if (hasSel) {
        if (i === sel) cl += ' sel';
        else if (peerSet.has(i)) cl += ' peer';
      }
      if (hv && v === hv) cl += ' same';
      if (wrong && wrong.has(i)) cl += ' err';
      const isHint = hint && i === hint.row * 9 + hint.col;
      if (isHint) cl += ' hint'; else if (rel.has(i)) cl += ' rel';
      if (flash[i] > nowMs && !v) cl += ' ghost'; // destello del rival (sin mostrar el número)
      if (coop) {
        if (v && !G.puzzle[r][c] && G.owners && G.owners[i]) cl += ' own' + (G.owners[i] === co.me ? 1 : 2); // dígito con el color de su autor
        if (i === ff) cl += (i === sel ? ' pf12' : ' pf2');                        // celda activa del compañero
      }
      if (killer && cageOf[i] >= 0) { // contorno punteado donde la celda vecina es de otra jaula
        const g = cageOf[i];
        if (r === 0 || cageOf[i - 9] !== g) cl += ' cage-top';
        if (r === 8 || cageOf[i + 9] !== g) cl += ' cage-bottom';
        if (c === 0 || cageOf[i - 1] !== g) cl += ' cage-left';
        if (c === 8 || cageOf[i + 1] !== g) cl += ' cage-right';
      }
      el.className = cl;
      el.style.boxShadow = (extra && extra.has(i) && !isHint && !rel.has(i)) ? RING : '';

      // Contenido: la suma de la jaula se reinserta siempre en la celda topLeft.
      let html = killer && sumAt[i] ? '<span class="cage-sum">' + sumAt[i] + '</span>' : '';
      if (v) {
        html += v;
        // con errores ocultos cuenta lo colocado; con errores visibles solo lo correcto
        if (!set.showErrors || v === G.solution[r][c]) count[v]++;
      } else if (G.notes[r][c].length) {
        const a = G.notes[r][c];
        html += '<span class="nt">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<i>' + (a.indexOf(n) >= 0 ? n : '') + '</i>').join('') + '</span>';
      }
      if (coop && i === ff) html += '<span class="pbadge" aria-hidden="true">' + coopInitial() + '</span>';
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }

    const remNow = keys.map((_, k) => Math.max(0, 9 - count[k + 1]));
    if (keyMemo.g === G && remNow.some((v, k) => v === 0 && keyMemo.rem[k] > 0)) triggerHaptic("milestone");
    keyMemo = { g: G, rem: remNow };
    keys.forEach((b, k) => {
      const rem = Math.max(0, 9 - count[k + 1]);
      const remEl = b.querySelector('.rem');
      if (remEl) remEl.textContent = rem || '';
      b.classList.toggle('done', rem === 0);
      b.disabled = rem === 0;
      const act = df && activeDigit === k + 1;
      b.classList.toggle('active', act);
      b.setAttribute('aria-pressed', String(act));
    });

    boardEl?.classList.toggle('pencil', pencil);
    document.body.classList.toggle('pencil-mode', pencil && view === 'game');
    const bp = $('#btnPencil');
    if (bp) { bp.classList.toggle('on', pencil); bp.setAttribute('aria-pressed', String(pencil)); }
    setText('#pencilTag', pencil ? 'ON' : 'OFF');
    const bm = $('#btnInputMode');
    if (bm) {
      bm.classList.toggle('dfirst', df);
      bm.setAttribute('aria-pressed', String(df));
      bm.setAttribute('aria-label', 'Modo de entrada: ' + (df ? 'número primero' : 'celda primero'));
      const lb = bm.querySelector('.lbl'); if (lb) lb.textContent = df ? 'Nº→Celda' : 'Celda→Nº';
    }
    // Botón Pista: insignia con las pistas restantes; se bloquea al llegar a 0 (o con la partida terminada).
    const bh = $('#btnHint');
    if (bh) {
      const left = hintsLeft();
      bh.disabled = left <= 0 || isOver();
      bh.setAttribute('aria-label', 'Pista, quedan ' + left);
      const tag = $('#hintTag');
      if (tag) { tag.textContent = String(left); tag.classList.toggle('zero', left <= 0); }
    }
    const brw = document.querySelector('[data-act="rewind"]');
    if (brw) brw.disabled = coop || !G.hist.length || G.lost || G.won;
    const bu = document.querySelector('[data-act="undo"]');
    if (bu) {
      if (coop) bu.disabled = G.lost || (co.role === 'host' ? !co.hist.some(e => e.by === 1) : !co.session.isConnected());
      else bu.disabled = !G.hist.length || G.lost;
    }
    updateDuelBar();
    updateRaceBar();
    updateCoopBar();
    syncFocus();
  }

  /* ---------- Vistas: inicio / juego ---------- */
  const hasProgress = () => !!G && !G.won && !G.lost;

  function showView(v) {
    view = v; schedulePre();
    if (v !== 'game') document.body.classList.remove('pencil-mode');   // el modo Notas del tablero no debe teñir otras pantallas (teclado del Tutorial)
    // Una sola vista de página completa visible a la vez.
    [['home', 'home-view'], ['game', 'game-view'], ['stats', 'stats-view'], ['daily', 'daily-view']].forEach(p => {
      const el = $('#' + p[1]); if (el) { el.hidden = v !== p[0]; if (v === p[0] && p[0] !== 'game') el.scrollTop = 0; }
    });
    const tu = $('#tutorial-view'); if (tu) tu.hidden = true;   // el tutorial nunca queda visible junto a otra vista
    if (v === 'home') updateHome();
    syncFocus();
  }

  /* ---------- Tutorial: solo abre y cierra #tutorial-view (toda la lógica vive en tutorial.js) ---------- */
  function openTutorial() {
    const t = $('#tutorial-view'); if (!t) return;
    const h = $('#home-view'); if (h) h.hidden = true;
    document.body.classList.remove('pencil-mode');
    view = 'tutorial';   // el cronómetro y los atajos de teclado solo actúan con view === 'game'
    t.hidden = false;
    if (window.Tutorial) window.Tutorial.open(t);
  }
  function closeTutorial() {
    if (window.Tutorial) window.Tutorial.close();
    showView('home');    // oculta el tutorial y vuelve al inicio
  }

  // Abre o cierra el selector de dificultad del modo elegido (hoja inferior).
  function setPlayOpen(open) {
    const p = $('#playPanel');
    if (p) p.hidden = !open;
  }

  // Inicio: 'main' (título y cinco accesos) o 'play' (modos de juego).
  function setHomeScreen(name) {
    const main = $('#homeMain'), play = $('#homePlay');
    if (main) main.hidden = name !== 'main';
    if (play) play.hidden = name !== 'play';
    const h = $('#home-view'); if (h) h.scrollTop = 0;
  }

  /* ---------- Calendario de Desafíos Diarios ---------- */
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = (y, m, d) => y + '-' + pad2(m + 1) + '-' + pad2(d);   // m: 0-11
  const todayStr = () => { const n = new Date(); return ymd(n.getFullYear(), n.getMonth(), n.getDate()); };
  const dateLabel = ds => { const p = String(ds).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(ds); };
  const MAX_BACK_MONTHS = 24;
  let calY = 0, calM = 0;

  /* Estrellas por errores (oro 0 · plata 1–2 · bronce 3+) y copas mensuales. Los días sin dato de errores cuentan como oro. */
  const TIERS = ['gold', 'silver', 'bronze'], TIER_ES = ['oro', 'plata', 'bronce'];
  // Dos geometrías en el mismo SVG: la suave (Papel, Noche, Minimalista) y la de píxeles (Retro); el CSS muestra la del tema activo.
  const STAR_SVG = '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><polygon class="s-smooth" points="12,2.2 14.9,8.7 22,9.4 16.7,14.1 18.2,21 12,17.4 5.8,21 7.3,14.1 2,9.4 9.1,8.7"/><path class="s-pixel" transform="translate(1 1) scale(2)" d="M5 0h1v1h-1zM5 1h1v1h-1zM4 2h3v1h-3zM4 3h3v1h-3zM0 4h11v1h-11zM1 5h9v1h-9zM2 6h7v1h-7zM3 7h5v1h-5zM3 8h2v1h-2zM6 8h2v1h-2zM2 9h2v1h-2zM7 9h2v1h-2zM2 10h1v1h-1zM8 10h1v1h-1z"/></svg>';
  const CUP_SVG = t => '<svg class="cup t-' + TIERS[t] + '" viewBox="0 0 24 24" role="img" aria-label="Copa de ' + TIER_ES[t] + '">' +
    '<g class="c-smooth"><path d="M7 3h10v5a5 5 0 0 1-10 0V3z"/><path class="nf" d="M7 5H4v2.5A3.5 3.5 0 0 0 7.5 11M17 5h3v2.5a3.5 3.5 0 0 1-3.5 3.5"/>' +
    '<path class="nf" d="M12 13v4M8.5 21h7M10 17h4v4h-4z"/></g>' +
    // Versión 8-bit para el tema Retro (el CSS muestra una u otra)
    '<path class="c-pixel" transform="translate(1 1) scale(2)" d="M1 0h9v1h-9zM0 1h11v1h-11zM0 2h1v1h-1zM2 2h7v1h-7zM10 2h1v1h-1zM1 3h9v1h-9zM2 4h7v1h-7zM3 5h5v1h-5zM4 6h3v1h-3zM5 7h1v1h-1zM5 8h1v1h-1zM4 9h3v1h-3zM2 10h7v1h-7z"/></svg>';
  const dayLevel = ds => { const e = stats.dd[ds] ? stats.dd[ds].e : 0; return e === 0 ? 0 : (e <= 2 ? 1 : 2); };
  const addDay = (ds, n) => { const p = ds.split('-'); const d = new Date(+p[0], +p[1] - 1, +p[2] + n); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };
  const CUP_WHY = ['todas las estrellas del mes son de oro (sin errores)', 'ninguna estrella de bronce en el mes', 'mes completo, con alguna estrella de bronce'];

  // Mes completo = los días del mes están todos completados. La copa depende de la peor estrella: oro, plata o bronce.
  function monthInfo(y, m) {
    const days = new Date(y, m + 1, 0).getDate();
    let done = 0, worst = 0;
    for (let d = 1; d <= days; d++) { const ds = ymd(y, m, d); if (stats.daily[ds]) { done++; worst = Math.max(worst, dayLevel(ds)); } }
    return { days: days, done: done, complete: done === days, tier: worst };
  }

  // Métricas de la pestaña "Desafíos diarios" de Estadísticas.
  function dailySummary() {
    const dates = Object.keys(stats.daily).filter(k => stats.daily[k]).sort();
    const done = new Set(dates);
    const r = { n: dates.length, best: 0, avg: 0, cur: 0, max: 0, flawless: 0, cups: [0, 0, 0] };
    if (!r.n) return r;
    let sum = 0, run = 0, prev = null;
    dates.forEach(ds => {
      const t = stats.daily[ds]; sum += t;
      if (!r.best || t < r.best) r.best = t;
      if (dayLevel(ds) === 0) r.flawless++;
      run = (prev && addDay(prev, 1) === ds) ? run + 1 : 1;
      if (run > r.max) r.max = run;
      prev = ds;
    });
    r.avg = Math.round(sum / r.n);
    let ds = todayStr(); if (!done.has(ds)) ds = addDay(ds, -1);   // la racha sigue viva si hoy todavía no se jugó
    while (done.has(ds)) { r.cur++; ds = addDay(ds, -1); }
    const f = dates[0].split('-'), now = new Date();
    for (let i = (+f[0]) * 12 + (+f[1] - 1); i <= now.getFullYear() * 12 + now.getMonth(); i++) {
      const mi = monthInfo(Math.floor(i / 12), i % 12);
      if (mi.complete) r.cups[mi.tier]++;
    }
    return r;
  }

  function renderCalendar() {
    const now = new Date(), curIdx = now.getFullYear() * 12 + now.getMonth(), viewIdx = calY * 12 + calM;
    const today = todayStr();
    const days = new Date(calY, calM + 1, 0).getDate();
    const lead = (new Date(calY, calM, 1).getDay() + 6) % 7;   // semana que empieza en lunes
    let html = '', done = 0, total = 0, d;
    for (d = 0; d < lead; d++) html += '<span class="dday blank" aria-hidden="true"></span>';
    const BLANK = '<span class="dday blank" aria-hidden="true"></span>';
    for (d = 1; d <= days; d++) {
      const ds = ymd(calY, calM, d);
      const completed = !!stats.daily[ds];
      const locked = ds > today;                                  // las fechas ISO se comparan como texto
      const cls = ['dday'];
      let label = 'Día ' + d;
      let lvl = 0;
      if (locked) { cls.push('locked'); label += ', bloqueado'; }
      else {
        total++;
        if (completed) {
          done++; lvl = dayLevel(ds);
          cls.push('completed', 't-' + TIERS[lvl]);
          if (ds === justDone) cls.push('pop');
          label += ', completado con estrella de ' + TIER_ES[lvl];
        }
        else if (ds !== today) { cls.push('avail'); label += ', disponible'; }
        if (ds === today) { cls.push('today'); label += ', hoy'; }
      }
      html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + ds + '" aria-label="' + label + '"' +
        (locked ? ' disabled' : '') + '>' + (completed ? STAR_SVG : '') + '<span class="dn">' + d + '</span></button>';
    }
    // Siempre 6 filas × 7 columnas (42 celdas): la altura de la vista no cambia de un mes a otro.
    for (let n = lead + days; n < 42; n++) html += BLANK;
    const grid = $('#dailyGrid'); if (grid) grid.innerHTML = html;
    if (justDone && justDone.slice(0, 7) === ymd(calY, calM, 1).slice(0, 7)) justDone = null;   // la animación se ve una sola vez
    const mi = monthInfo(calY, calM), mEl = $('#dailyMonth');
    if (mEl) {
      mEl.innerHTML = (mi.complete ? CUP_SVG(mi.tier) : '') + MONTHS[calM] + ' ' + calY;
      mEl.title = mi.complete ? 'Copa de ' + TIER_ES[mi.tier] + ': ' + CUP_WHY[mi.tier] : '';
    }
    setText('#dailyCount', done + ' de ' + total + ' completados');
    // Copa grande como marca de agua detrás de la grilla (solo con el mes completo).
    const cw = $('#calWrap'), cm = $('#calMark');
    if (cw) cw.classList.toggle('cup-on', mi.complete);
    if (cm) cm.innerHTML = mi.complete ? CUP_SVG(mi.tier) : '';
    setText('#dailyCup', mi.complete ? 'Copa de ' + TIER_ES[mi.tier] + ' · ' + CUP_WHY[mi.tier] : '\u00A0');
    const prev = $('#dailyPrev'), next = $('#dailyNext');
    if (prev) prev.disabled = viewIdx <= curIdx - MAX_BACK_MONTHS;
    if (next) next.disabled = viewIdx >= curIdx;
    const w = $('#dailyWarn'); if (w) w.hidden = !hasProgress();
  }

  function shiftMonth(delta) {
    const t = calY * 12 + calM + delta;
    calY = Math.floor(t / 12); calM = t % 12;
    renderCalendar();
  }

  function openDaily() {
    const n = new Date();
    calY = n.getFullYear(); calM = n.getMonth();
    renderCalendar();
    showView('daily');
  }

  function updateHome() {
    const prog = hasProgress();
    const bc = $('#btnContinue'); if (bc) bc.hidden = !prog;
    setText('#playSub', prog ? 'Tenés una partida en curso' : 'Elegí modo y dificultad');
    if (prog) {
      setText('#continueInfo', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + (G.zen ? ' • Zen' : ' • ' + fmt(showSecs())) +
        (G.surv ? ' • 🔥 Racha: ' + (G.surv.n - 1) : '') +
        (G.daily ? ' • Diario' : '') + (G.duel ? (G.duel.open ? ' • ⚔ en vivo' : ' • ⚔ vs ' + G.duel.alias) : '') +
        (inCoop() ? ' • 👥 co-op' : ''));
    }
    const w = $('#playWarn'); if (w) w.hidden = !prog;
    const t = todayStr();
    const dn = !!stats.daily[t], bd = $('#btnDaily');
    setText('#dailyInfo', dn ? 'Completado ✓ ' + fmt(stats.daily[t]) : 'Hoy · ' + dateLabel(t).slice(0, 5));
    if (bd) bd.dataset.done = dn ? '1' : '0';
  }

  // Inicio: guarda la partida (modo, jaulas y fantasma incluidos, vía G) y vuelve a #home-view.
  // El cronómetro se pausa solo porque únicamente corre con view === 'game' (en una sala Co-op sigue el reloj del Host).
  function goHome() {
    if (pendingReload && !co && !rc) { pendingReload = false; updReloaded = true; if (G) persist(); window.location.reload(); return; }   // actualización que esperaba a salir de la sala
    if (G && ((G.race && G.race.over) || (G.live && G.lv && G.lv.over))) dropRoomGame();   // terminó la partida de sala: vuelve la individual guardada
    if (G) persist();
    hideHint(); hideErrExplain(); closeModals(); setPlayOpen(false); setHomeScreen('main');
    showView('home');
  }

  function continueGame() {
    if (!hasProgress()) return;
    hideHint(); showView('game'); render();
  }

  // Inicia (o retoma) el tablero clásico del día `ds` ("YYYY-MM-DD"), con esa misma cadena como semilla.
  function playDay(ds) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds) || ds > todayStr()) return;
    closeModals();
    if (hasProgress() && G.daily === ds) { showView('game'); render(); return; }
    startGame('medio', 'classic', { seed: ds, daily: ds });
  }

  /* ---------- Modo: selector, atributos y pestañas ---------- */
  // Marca la pestaña activa y asigna data-mode al panel del inicio (controla descripción y subtítulos).
  function setModeAttrs(m) {
    m = validMode(m);
    const panel = $('#playPanel'); if (panel) panel.dataset.mode = m;
    setText('#playTitle', MODE_NAMES[m] || '');
    document.querySelectorAll('.modes [data-mode]').forEach(b => {
      const on_ = b.dataset.mode === m;
      b.classList.toggle('on', on_);
      b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
  }
  function selectMode(m) { selMode = validMode(m); setModeAttrs(selMode); }

  /* ---------- Partidas ---------- */
  // Semilla numérica Uint32. Las semillas de texto (Desafíos Diarios) se convierten con el mismo hash FNV-1a
  // que usan los motores, así el tablero del día es idéntico y además se puede enviar como duelo.
  function toSeed(v) {
    if (v === undefined || v === null) return D ? D.randomSeed() : (Math.floor(Math.random() * 4294967296) >>> 0);
    if (typeof v === 'string') return D ? D.seedFromString(v) : (parseInt(v.replace(/\D/g, ''), 10) >>> 0);
    return v >>> 0;
  }

  // Tablero que llegó empaquetado en el enlace (modos estándar): verifica solución única y la calcula (≈ms).
  function boardFromPacked(board, mode, diff) {
    if (E.countSolutions(board, 2, mode) !== 1) throw new Error('packed-board-invalid');
    const solution = E.solve(board, mode);
    if (!solution) throw new Error('packed-board-invalid');
    return { puzzle: E.cloneBoard(board), solution: solution, difficulty: diff };
  }

  // Genera un tablero nuevo del modo pedido. `fixed` = topes fijos (Killer y estándar deterministas por semilla).
  // Primero intenta el Web Worker (hilo secundario); si no existe (file://, navegador antiguo) o falla, usa el hilo principal.
  const GenWorker = (function () {
    let w = null, dead = !window.Worker || window.location.protocol === 'file:', nid = 0;
    const pend = new Map();
    function failAll() { pend.forEach(p => p.reject(new Error('worker'))); pend.clear(); }
    function get() {
      if (dead) return null;
      if (w) return w;
      try {
        w = new Worker('worker.js?v=' + BUILD);
        w.onmessage = ev => {
          const m = ev.data || {}, p = pend.get(m.id); if (!p) return;
          pend.delete(m.id);
          if (m.ok) p.resolve(m.result); else p.reject(new Error(m.error || 'gen'));
        };
        w.onerror = () => { dead = true; try { w.terminate(); } catch (e) { /* ignorar */ } w = null; failAll(); };
      } catch (e) { dead = true; w = null; }
      return w;
    }
    return {
      available: () => !dead,
      request(diff, mode, seed, fixed) {
        const wk = get();
        if (!wk) return Promise.reject(new Error('no-worker'));
        return new Promise((resolve, reject) => {
          const id = ++nid; pend.set(id, { resolve: resolve, reject: reject });
          try { wk.postMessage({ id: id, diff: diff, mode: mode, seed: seed, fixed: !!fixed }); } catch (e) { pend.delete(id); reject(e); }
        });
      }
    };
  }());

  function genPuzzleMain(diff, mode, seed, fixed) {
    if (mode === 'killer') return K.generateKillerPuzzleAsync(diff, Object.assign({ seed: seed }, GEN_K));
    return E.generatePuzzleAsync(diff, Object.assign({ variant: mode, seed: seed }, fixed ? GEN_E : {}));
  }
  function genPuzzle(diff, mode, seed, fixed) {
    return GenWorker.request(diff, mode, seed, fixed).catch(() => genPuzzleMain(diff, mode, seed, fixed));
  }

  /* ---------- Pre-generación en segundo plano ---------- */
  // Tableros listos en memoria (clave modo:dificultad) para que empezar una partida normal sea instantáneo.
  // Solo se usan en partidas con semilla aleatoria; Desafíos, duelos y enlaces generan o reconstruyen como siempre.
  const pre = new Map(), PRE_MAX = 4;
  const lastDiff = {};          // última dificultad jugada por modo
  let preBusy = false, preTimer = 0;
  const preKey = (mode, diff) => mode + ':' + diff;
  function preWanted() {
    const out = [], add = (m, d) => { if (!out.some(x => x[0] === m && x[1] === d)) out.push([m, d]); };
    const m0 = validMode(set.mode);
    add(m0, lastDiff[m0] || 'medio'); add(m0, 'facil'); add(m0, 'medio');
    MODES.forEach(m => add(m, lastDiff[m] || 'medio'));
    return out;
  }
  function takePre(diff, mode) {
    const k = preKey(mode, diff), e = pre.get(k);
    if (e) { pre.delete(k); schedulePre(); }
    return e || null;
  }
  function schedulePre() {
    if (preTimer || !GenWorker.available()) return;
    const run = () => { preTimer = 0; fillPre(); };
    preTimer = setTimeout(() => { if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 4000 }); else run(); }, 1200);
  }
  function fillPre() {
    if (preBusy || busy || view === 'game' || document.hidden || pre.size >= PRE_MAX) return;
    const want = preWanted().find(x => !pre.has(preKey(x[0], x[1])));
    if (!want) return;
    const mode = want[0], diff = want[1], seed = toSeed(), fixed = mode === 'killer' || mode === 'jigsaw';
    preBusy = true;
    GenWorker.request(diff, mode, seed, fixed).then(g => {
      if (g && pre.size < PRE_MAX) pre.set(preKey(mode, diff), { seed: seed, g: g });
    }).catch(() => { /* sin worker: se genera al pedir la partida */ }).then(() => { preBusy = false; schedulePre(); });
  }

  // Enlace de invitación abierta del tablero actual: solo tablero/semilla, sin tiempo ni fantasma. Killer va por semilla.
  const inviteEncoded = () => D.encodeDuelPayload({
    mode: G.mode, diff: G.req, seed: G.seed, board: (G.mode === 'killer' || G.mode === 'jigsaw') ? null : G.puzzle, open: true
  });

  function shareInvite() {
    if (!D || !G || typeof G.seed !== 'number' || !NAMES[G.req]) return;
    let url;
    try { url = D.buildLink(inviteEncoded()); } catch (e) { toast('No se pudo crear el enlace.'); return; }
    const text = 'Te invito a un duelo de Sudoku (' + MODE_NAMES[G.mode] + ' • ' + NAMES[G.req] +
      '). Abrí el enlace y arrancamos el mismo tablero a la vez: ¡gana el que termine antes!';
    D.shareLink({ title: 'Duelo de Sudoku', text: text, url: url }).then(res => {
      if (res === 'copied') toast('Enlace copiado: pegáselo a tu amigo');
      else if (res === 'failed') {
        try { window.prompt('Copiá este enlace:', url); } catch (e) { toast('No se pudo compartir el enlace.'); }
      }
    });
  }

  // opts: { seed, daily, duel, rematchTo, board (tablero empaquetado), legacy (enlace v1), invite (duelo con amigo),
  //         surv ({ rot, n, prev, rec0 }: tablero de una racha), transition (pasa de tablero en una racha sin cerrar el modal) }
  function startGame(diff, mode, opts) {
    if (busy) return;
    opts = opts || {};
    mode = validMode(mode);
    busy = true;
    if (!opts.transition) closeModals();
    if (!opts.daily && !opts.surv) selectMode(mode);
    // Tablero ya generado en segundo plano (solo partidas con semilla aleatoria): arranque instantáneo.
    const prebuilt = (opts.seed === undefined && !opts.board && !opts.daily && !opts.legacy && !opts.duel) ? takePre(diff, mode) : null;
    if (!opts.board && !opts.transition && !prebuilt) showLoad('Generando tablero…', false); // con tablero empaquetado o ya generado no hay espera
    const seed = prebuilt ? prebuilt.seed : toSeed(opts.seed);
    lastDiff[mode] = diff;
    let ok = false, errMsg = '';
    const fixedGen = mode === 'killer' || mode === 'jigsaw' || !!opts.daily || !!opts.legacy;
    // En la transición de una racha se espera un mínimo para que se vea el "tablero superado".
    const wait = opts.transition ? new Promise(res => setTimeout(res, SURV_TRANSITION_MS)) : null;
    Promise.resolve().then(() => {
      if (opts.board) return boardFromPacked(opts.board, mode, diff);
      if (prebuilt) return prebuilt.g;
      return genPuzzle(diff, mode, seed, fixedGen);
    }).then(g => (wait ? wait.then(() => g) : g)).then(g => {
      const killer = mode === 'killer', puzzle = killer ? g.board : g.puzzle;
      // Control de coherencia del duelo: el fantasma nunca resuelve una celda dada. Si pasa, el tablero no coincide.
      if (opts.duel && opts.duel.moves.some(m => puzzle[Math.floor(m.cell / 9)][m.cell % 9])) {
        errMsg = 'No se pudo reconstruir el mismo tablero del duelo. ¿Ambos tienen la app actualizada?';
        throw new Error('duel-mismatch');
      }
      if (co || rc) leaveCoop(); // empezar otra partida cierra la sala Co-op
      const prevG = G;
      const zen = !!opts.zen && !opts.daily && !opts.duel && !opts.invite && !opts.surv;
      const rules = rulesFor(diff, Object.assign({}, opts, { zen: zen }));
      G = {
        mode: mode, variant: mode, puzzle: puzzle, solution: g.solution, board: E.cloneBoard(puzzle),
        notes: emptyNotes(), diff: g.difficulty, req: diff, seed: seed, hist: [], secs: 0, won: false, lost: false, counted: false,
        rec: D ? new D.DuelRecorder() : null,
        maxLives: rules.maxLives, lives: rules.maxLives, hintsMax: rules.maxHints, hintsUsed: 0
      };
      if (killer) G.cages = g.cages;
      if (mode === 'jigsaw') G.regions = g.regions;
      if (zen) G.zen = true;
      if (opts.daily) G.daily = opts.daily;
      if (opts.duel) G.duel = opts.duel;
      if (opts.surv) { G.surv = opts.surv; G.counted = true; G.rec = null; } // la racha no suma a las estadísticas normales ni se desafía
      if (opts.invite) { // duelo con amigo: invitación abierta (sin tiempo ni fantasma todavía)
        const dec = D.decodeDuelPayload(inviteEncoded());
        G.duel = { id: dec.ok ? dec.id : 'live.' + seed.toString(36), open: true, alias: '', time: 0, errors: 0, hints: 0, moves: [] };
      }
      if (opts.rematchTo) G.rematchTo = opts.rematchTo;
      // Estadísticas: la partida anterior sin terminar cuenta como abandonada (corta la racha); la nueva cuenta como iniciada.
      if (prevG && !prevG.won && !prevG.lost && !prevG.surv && !prevG.coop && !prevG.zen) statLoss(prevG);
      if (!opts.surv) statStart(G);
      prepareGame();
      sel = -1; pencil = false; activeDigit = null; hideHint();
      ghostSeen = 0; flash.fill(0); lastHintKey = '';
      if (!opts.daily && !opts.surv) { set.mode = mode; saveSet(); }
      ok = true;
    }).catch(() => { if (!errMsg && opts.board) errMsg = 'El tablero del enlace no es válido.'; /* conserva la partida actual */ }).then(() => {
      busy = false; schedulePre();
      hideLoad();
      if (opts.transition) closeModals();
      if (ok) {
        persist(); setPlayOpen(false); showView('game'); render();
        if (opts.rematchTo) toast('Resolvé este tablero y mandale la revancha a ' + opts.rematchTo);
        if (opts.invite) shareInvite();
      } else {
        if (opts.transition) toast('No se pudo generar el siguiente tablero.'); else updateHome();
        if (errMsg) toast(errMsg);
      }
    });
  }

  // Valida el bloque `duel` guardado en una partida (los datos de localStorage no son de fiar).
  function cleanDuel(d) {
    if (!D || !d || typeof d !== 'object' || typeof d.id !== 'string' || !Array.isArray(d.moves)) return null;
    const moves = d.moves
      .filter(m => m && Number.isInteger(m.cell) && m.cell >= 0 && m.cell < 81 && Number.isFinite(m.t))
      .map(m => ({ cell: m.cell, t: m.t }));
    return {
      id: d.id.slice(0, 40), open: !!d.open, alias: D.sanitizeAlias(d.alias) || (d.open ? '' : 'Rival'),
      time: Math.max(0, d.time | 0), errors: Math.max(0, d.errors | 0), hints: Math.max(0, d.hints | 0), moves: moves
    };
  }

  // Valida el bloque `surv` guardado en una partida.
  function cleanSurv(s) {
    if (!s || typeof s !== 'object' || !SURV_MODES[s.rot] || !Number.isInteger(s.n) || s.n < 1 || s.n > 9999) return null;
    const r0 = s.rec0;
    const rec0 = (r0 && Number.isInteger(r0.n) && r0.n >= 1 && Number.isFinite(r0.t) && r0.t >= 0) ? { n: r0.n, t: r0.t | 0 } : null;
    return { rot: s.rot, n: s.n, prev: Math.max(0, s.prev | 0), rec0: rec0 };
  }

  function restore() {
    const s = load(K_GAME, null);
    try {
      if (!s || typeof s !== 'object') return false;
      E.cloneBoard(s.puzzle); E.cloneBoard(s.solution); E.cloneBoard(s.board);
      if (!Array.isArray(s.notes) || s.notes.length !== 9 || !Array.isArray(s.hist)) return false;
      if (!s.notes.every(row => Array.isArray(row) && row.length === 9 && row.every(Array.isArray))) return false;
      const mode = MODES.indexOf(s.mode) >= 0 ? s.mode : (MODES.indexOf(s.variant) >= 0 ? s.variant : 'classic');
      if (mode === 'killer') {
        if (!K || !Array.isArray(s.cages) || !s.cages.length) return false;
        K.getKillerConflicts(s.board, s.cages); // lanza error si las jaulas son inválidas
      } else {
        delete s.cages;
      }
      if (mode === 'jigsaw') {
        s.regions = E.validateRegions(s.regions); // lanza si el mapa no es válido
      } else {
        delete s.regions;
      }
      // La conexión de una sala Co-op no sobrevive a un reinicio: la partida sigue como partida normal.
      const coopHints = s.hints | 0;
      delete s.coop; delete s.owners; delete s.hints; delete s.live; delete s.lv; delete s.errs; delete s.race;
      s.mode = mode; s.variant = mode; s.secs = s.secs | 0; s.won = !!s.won; s.lost = !!s.lost;
      s.counted = !!s.counted || s.won;
      if (typeof s.daily !== 'string') delete s.daily;
      if (!s.zen || s.surv || s.duel) delete s.zen; else s.zen = true;
      if (!NAMES[s.diff]) s.diff = 'facil';
      // Campos de duelos (las partidas guardadas antes de esta versión no los tienen y siguen funcionando).
      if (typeof s.seed === 'number' && isFinite(s.seed)) s.seed = s.seed >>> 0; else delete s.seed;
      if (!NAMES[s.req]) delete s.req;
      if (typeof s.finalTime !== 'number' || !isFinite(s.finalTime)) delete s.finalTime;
      if (typeof s.rematchTo === 'string' && D) s.rematchTo = D.sanitizeAlias(s.rematchTo); else delete s.rematchTo;
      if (s.duel) { s.duel = cleanDuel(s.duel); if (!s.duel) delete s.duel; }
      if (s.duelResult && (typeof s.duelResult !== 'object' || !s.duelResult.record)) delete s.duelResult;
      if (s.surv) { s.surv = cleanSurv(s.surv); if (!s.surv) delete s.surv; }
      if (D) {
        const had = !!(s.rec && Array.isArray(s.rec.m));
        s.rec = new D.DuelRecorder(had ? s.rec : null);
        if (!had) s.rec.sync(s.board, s.solution, s.puzzle, s.secs); // partida vieja: marcas aproximadas
      } else {
        s.rec = null;
      }
      if (s.surv) { s.rec = null; s.counted = true; }
      // Vidas y pistas (las partidas guardadas antes de esta versión no las tienen: se asignan según su tipo).
      const friend = !!s.duel;
      if (!Number.isInteger(s.maxLives) || s.maxLives < 0 || s.maxLives > 9) {
        s.maxLives = s.surv ? 1 : (friend ? FRIEND_LIVES : (LIVES_BY_DIFF[s.diff] | 0));
      }
      if (!Number.isInteger(s.lives) || s.lives < 0 || s.lives > s.maxLives) s.lives = s.maxLives;
      if (!Number.isInteger(s.hintsMax) || s.hintsMax < 0 || s.hintsMax > 9) {
        s.hintsMax = s.surv ? 0 : (friend ? HINTS_DUEL : HINTS_SOLO);
      }
      s.hintsUsed = Math.max(0, s.hintsUsed | 0, coopHints, s.rec ? s.rec.hints : 0);
      G = s; prepareGame();
      ghostSeen = eff(); flash.fill(0); lastHintKey = '';
      return true;
    } catch (e) { return false; }
  }

  /* ---------- Victoria y estadísticas ---------- */
  let justDone = null;                       // fecha del diario recién completado (para animar su estrella)
  const gStat = key => stats.g[key] || (stats.g[key] = blankG());
  const svStat = rot => stats.sv[rot] || (stats.sv[rot] = { a: 0, b: 0 });
  const statKeys = g => [g.mode + '.' + g.diff, 'all.' + g.diff];
  // Partida iniciada (nueva o reintento). Las partidas guardadas por versiones anteriores no la tienen: ganar sigue funcionando.
  function statStart(g) {
    statKeys(g).forEach(k => { gStat(k).s++; });
    saveStats();
  }
  // Derrota o abandono: corta la racha de victorias de esa dificultad (una sola vez por partida).
  function statLoss(g) {
    if (!g || g.statLost || g.surv || g.coop || g.live || g.race || g.zen) return;
    g.statLost = true;
    statKeys(g).forEach(k => { gStat(k).cs = 0; });
    saveStats();
  }

  function recordWin() {
    if (!G || G.counted) return; // evita contar dos veces si se deshace y se vuelve a resolver
    G.counted = true;
    const m = G.mode, key = m + '.' + G.diff;
    const clean = (G.rec ? G.rec.errors : 0) === 0;
    stats.won[m] = (stats.won[m] | 0) + 1;
    statKeys(G).forEach(k => {
      const g = gStat(k);
      g.w++;
      if (g.s < g.w) g.s = g.w;
      if (clean) g.f++;
      g.cs++; if (g.cs > g.ms) g.ms = g.cs;
      if (!G.zen) {                                  // el Modo Zen no toca récords ni promedios de tiempo
        if (!g.bt || G.secs < g.bt) g.bt = Math.max(1, G.secs);
        g.tt += G.secs; g.tn++;
      }
    });
    if (!G.zen) {
      const prevBest = stats.best[key];
      G.newRecord = prevBest && G.secs < prevBest ? prevBest - G.secs : 0;   // mejora respecto a la marca previa de este Modo + Dificultad
      if (!stats.best[key] || G.secs < stats.best[key]) stats.best[key] = G.secs;
      if (G.daily) {
        const ds = G.daily, first = !stats.daily[ds], e = G.rec ? G.rec.errors : 0, pe = stats.dd[ds] ? stats.dd[ds].e : 0;
        if (first || G.secs < stats.daily[ds]) stats.daily[ds] = Math.max(1, G.secs);
        if (first || e < pe) { stats.dd[ds] = { e: e }; justDone = ds; }   // estrella nueva (o mejorada): se anima en el calendario
      }
    }
    saveStats();
  }

  // Al resolver: estadísticas, tiempo final efectivo (con penalizaciones) y, en un duelo, marcador cara a cara.
  function finishGame() {
    if (G.surv) { survWin(); return; }
    if (G.live && G.lv && !G.lv.over) { liveWin(); return; }
    if (G.race && !G.race.over && rc) { raceWin(); return; }
    recordWin();
    G.finalTime = eff();
    if (G.duel && !G.duel.open && D) {
      const res = D.history.record(G.duel.id, G.duel.alias, G.finalTime, G.duel.time);
      G.duelResult = { counted: res.counted, record: res.record };
    }
    showWin();
  }

  const canChallenge = () => !!(D && G && G.won && G.rec && typeof G.seed === 'number' && NAMES[G.req] && typeof G.finalTime === 'number');

  // Comparativa lado a lado (Tiempo final, Errores, Pistas) + marcador histórico contra ese rival.
  function buildDuelResult(box) {
    box.textContent = '';
    const d = G.duel, hints = G.rec ? G.rec.hints : 0, errors = G.rec ? G.rec.errors : 0;
    const rows = [
      ['Tiempo final', fmt(G.finalTime), fmt(d.time), G.finalTime, d.time],
      ['Errores', String(errors), String(d.errors), errors, d.errors],
      ['Pistas', hints + (hints ? ' (+' + hints * HINT_PENALTY + ' s)' : ''), String(d.hints), hints, d.hints]
    ];
    const tbl = mk('table', 'dr-tbl'), head = mk('thead'), hr = mk('tr'), body = mk('tbody');
    hr.appendChild(mk('th')); hr.appendChild(mk('th', '', 'Vos')); hr.appendChild(mk('th', '', d.alias));
    head.appendChild(hr);
    rows.forEach(r => {
      const tr = mk('tr'), th = mk('th', '', r[0]);
      th.scope = 'row';
      const a = mk('td', r[3] < r[4] ? 'best' : '', r[1]), b = mk('td', r[4] < r[3] ? 'best' : '', r[2]);
      tr.appendChild(th); tr.appendChild(a); tr.appendChild(b); body.appendChild(tr);
    });
    tbl.appendChild(head); tbl.appendChild(body); box.appendChild(tbl);
    const rec = G.duelResult && G.duelResult.record;
    if (rec) {
      box.appendChild(mk('p', 'dr-score', 'Marcador contra ' + rec.name + ': Vos ' + rec.wins + ' · ' + rec.name + ' ' + rec.losses +
        (rec.ties ? ' · Empates ' + rec.ties : '')));
    }
    if (G.duelResult && !G.duelResult.counted) box.appendChild(mk('p', 'dr-score', 'Este enlace ya estaba registrado: el marcador no cambió.'));
  }

  /* ---------- Íconos del resultado de un duelo (copa / espadas cruzadas), con una versión por tema ---------- */
  // Cada SVG lleva dos dibujos: .i-smooth (Papel, Noche, Minimalista) e .i-pixel (Retro); el CSS muestra el que corresponde.
  const px = pts => pts.map(p => 'M' + p[0] + ' ' + p[1] + 'h1v1h-1z').join('');
  const ICON_TROPHY = '<svg class="res-svg" viewBox="0 0 64 64" aria-hidden="true">' +
    '<g class="i-smooth"><path d="M20 10h24v14a12 12 0 0 1-24 0z"/><path class="nf" d="M20 14h-8v4a10 10 0 0 0 10 10M44 14h8v4a10 10 0 0 1-10 10M32 36v10"/><path d="M26 46h12v8H26zM20 54h24v4H20z"/></g>' +
    '<g class="i-pixel" transform="scale(4)"><path d="M3 1h10v2H3zM4 3h8v4H4zM5 7h6v1H5zM6 8h4v1H6zM1 2h2v1H1zM1 3h1v2H1zM2 5h2v1H2zM13 2h2v1h-2zM14 3h1v2h-1zM12 5h2v1h-2zM7 9h2v2H7zM5 11h6v1H5zM4 12h8v2H4z"/></g></svg>';
  const SW_A = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [8, 11], [9, 10], [10, 9], [11, 8], [11, 11], [12, 12], [13, 13]];
  const ICON_SWORDS = '<svg class="res-svg" viewBox="0 0 64 64" aria-hidden="true">' +
    '<g class="i-smooth"><path class="nf" d="M12 12L46 46M52 12L18 46M38 50L50 38M26 50L14 38M46 46L54 54M18 46L10 54"/></g>' +
    '<g class="i-pixel" transform="scale(4)"><path d="' + px(SW_A) + px(SW_A.map(p => [15 - p[0], p[1]])) + '"/></g></svg>';
  function setResIcon(id, kind) {
    const el = $(id); if (!el) return;
    el.innerHTML = kind === 'trophy' ? ICON_TROPHY : (kind === 'swords' ? ICON_SWORDS : '');
    el.hidden = !kind;
  }

  function showWin() {
    setResIcon('#winIcon', null);
    setText('#winNew', 'Nueva partida');
    const rb = $('#winRecord'); if (rb) rb.hidden = true;
    if (inCoop()) { showCoopWin(); return; }
    if (rb && G.newRecord > 0 && !G.zen) {
      setText('#winRecordTxt', '−' + fmt(G.newRecord) + ' respecto a tu marca anterior');
      rb.hidden = false;
    }
    const cr = $('#coopResult'); if (cr) { cr.textContent = ''; cr.hidden = true; }
    const ba = $('#winCoopAgain'); if (ba) ba.hidden = true;
    const live = !!(G.duel && G.duel.open && D);
    const duel = !!(G.duel && !G.duel.open && D && typeof G.finalTime === 'number');
    const box = $('#duelResult'), note = $('#winNote');
    let title = '¡Resuelto!', txt;
    if (duel) {
      const out = D.compareTimes(G.finalTime, G.duel.time);
      setResIcon('#winIcon', out === 'win' ? 'trophy' : (out === 'loss' ? 'swords' : null));
      title = out === 'win' ? '¡Ganaste el duelo!' : (out === 'loss' ? 'Perdiste el duelo' : 'Empate');
      txt = (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • vs ' + G.duel.alias;
      if (box) { buildDuelResult(box); box.hidden = false; }
    } else {
      if (G.daily) txt = 'Completaste el desafío del ' + dateLabel(G.daily) + ' en ' + fmt(G.secs) + '.';
      else if (G.zen) txt = 'Completaste el tablero ' + (MODE_NAMES[G.mode] || '') + ' ' + (NAMES[G.diff] || '') + ' en Modo Zen. Sin prisa, sin presión.';
      else txt = 'Completaste el tablero ' + (MODE_NAMES[G.mode] || '') + ' ' + (NAMES[G.diff] || '') + ' en ' + fmt(G.secs) + '.';
      if (box) { box.textContent = ''; box.hidden = true; }
    }
    if (live && typeof G.finalTime === 'number') txt = D.liveLabel(G.mode, G.req) + ': terminaste en ' + fmt(G.finalTime) + '.';
    setText('#winTitle', title);
    setText('#winTxt', txt);
    const hints = G.rec ? G.rec.hints : 0;
    if (note) {
      if (!duel && hints && typeof G.finalTime === 'number') {
        note.textContent = 'Tu tiempo para desafiar es ' + fmt(G.finalTime) + ' (incluye ' + hints + (hints === 1 ? ' pista' : ' pistas') +
          ' × ' + HINT_PENALTY + ' s).';
        note.hidden = false;
      } else if (live) {
        note.textContent = 'Enviá tu resultado para que tu amigo compare tiempo, errores y pistas.';
        note.hidden = false;
      } else note.hidden = true;
    }
    const bc = $('#winChallenge'); if (bc) {
      bc.hidden = !canChallenge() || !!G.zen;
      bc.textContent = live ? 'Enviar mi resultado (con fantasma)'
        : (G.rematchTo ? 'Mandar revancha a ' + G.rematchTo : 'Desafiar a un amigo');
    }
    const br = $('#winRematch'); if (br) br.hidden = !duel;
    const m = $('#mWin'); if (m) m.hidden = false;
  }

  /* ---------- Copiar resultado ---------- */
  function resultText(lost) {
    const errors = G.rec ? G.rec.errors : (G.errs | 0);
    const secs = lost ? showSecs() : (typeof G.finalTime === 'number' ? G.finalTime : G.secs);
    const lines = ['GridLab · ' + (MODE_NAMES[G.mode] || '') + ' · ' + (NAMES[G.diff] || '') + (lost ? ' · Derrota' : (G.zen ? ' · Modo Zen' : '')),
      'Tiempo: ' + fmt(secs), 'Errores: ' + errors];
    if (!lost && G.newRecord > 0 && !G.zen) lines.push('Nuevo récord personal (−' + fmt(G.newRecord) + ')');
    return lines.join('\n');
  }
  async function copyResult(btn) {
    if (!G) return;
    const txt = resultText(btn.dataset.copy === 'lose');
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) {
      try {   // respaldo para navegadores sin API del portapapeles
        const ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove();
      } catch (e2) { ok = false; }
    }
    const orig = btn.dataset.label || (btn.dataset.label = btn.textContent);
    btn.textContent = ok ? '¡Copiado! ✓' : 'No se pudo copiar';
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = orig; }, 1600);
  }

  /* ---------- Derrota por vidas ---------- */
  // Muestra el modal de derrota (o el de fin de racha en Supervivencia).
  function showLose() {
    if (!G) return;
    if (G.live && G.lv && !G.lv.over) { liveEliminated(); return; }
    if (G.race && !G.race.over) { raceEliminated(); return; }
    if (G.surv) { showSurvEnd(); return; }
    const team = inCoop();
    setResIcon('#loseIcon', G.duel && !G.duel.open ? 'swords' : null);
    setText('#loseTitle', team ? 'Se acabaron las vidas' : 'Derrota');
    setText('#loseTxt', (team ? 'Entre los dos agotaron las ' + G.maxLives + ' vidas.' : 'Te quedaste sin vidas.') + ' ' +
      (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • ' + fmt(team ? G.secs : showSecs()));
    const note = $('#loseNote');
    if (note) {
      if (team && co.role === 'guest') { note.textContent = 'El reintento lo inicia el anfitrión: se lo pedimos.'; note.hidden = false; }
      else { note.textContent = ''; note.hidden = true; }
    }
    setText('#loseRetry', team && co.role === 'guest' ? 'Pedir reintento al anfitrión' : 'Reintentar el mismo tablero');
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mLose') m.hidden = true; });
    const m = $('#mLose'); if (m) m.hidden = false;
  }

  // Reintentar el mismo tablero en solitario / duelo: tablero, notas, tiempo, vidas y pistas vuelven al inicio.
  function retryBoard() {
    if (!G || !G.lost) return;
    G.board = E.cloneBoard(G.puzzle); G.notes = emptyNotes(); G.hist = [];
    G.secs = 0; G.won = false; G.lost = false; G.counted = false; delete G.statLost;
    G.lives = G.maxLives; G.hintsUsed = 0;
    if (!G.surv && !G.coop) statStart(G);
    delete G.finalTime; delete G.duelResult;
    if (D) G.rec = new D.DuelRecorder();
    sel = -1; pencil = false; activeDigit = null; hideHint();
    ghostSeen = 0; flash.fill(0); lastHintKey = '';
    closeModals(); persist(); render();
  }

  function onLoseRetry() {
    if (!G) return;
    if (inCoop()) {
      if (co.role === 'host') { coopRetry(); return; }
      if (!co.session.isConnected()) { toast('Sin conexión con tu amigo. Reconectando…'); return; }
      co.session.send({ type: 'again' });
      toast('Pidiendo el reintento al anfitrión…');
      return;
    }
    retryBoard();
  }

  /* ---------- Supervivencia (No-Hit) ---------- */
  const recText = r => r.n + (r.n === 1 ? ' tablero' : ' tableros') + ' · ' + fmt(r.t);

  function openSurv() {
    Object.keys(SURV_MODES).forEach(k => {
      const el = document.querySelector('[data-rec="' + k + '"]');
      if (el) el.textContent = stats.surv[k] ? 'Récord: ' + recText(stats.surv[k]) : 'Sin récord';
    });
    const w = $('#survWarn'); if (w) w.hidden = !hasProgress();
    const m = $('#mSurv'); if (m) m.hidden = false;
  }

  function startSurvival(rot) {
    if (!SURV_MODES[rot]) return;
    const r0 = stats.surv[rot];
    svStat(rot).a++; saveStats();
    startGame(survDiff(1), survPickMode(rot), {
      surv: { rot: rot, n: 1, prev: 0, rec0: r0 ? { n: r0.n, t: r0.t } : null }
    });
  }

  // Tablero de la racha resuelto: se guarda el récord y se pasa (con transición) al siguiente.
  function survWin() {
    const S = G.surv;
    const done = S.n, total = (S.prev | 0) + G.secs;
    svStat(S.rot).b++; saveStats();
    if (survBetter({ n: done, t: total }, stats.surv[S.rot])) { stats.surv[S.rot] = { n: done, t: total }; saveStats(); }
    const nextN = done + 1, nextMode = survPickMode(S.rot), nextDiff = survDiff(nextN);
    setText('#snTitle', '¡Tablero ' + done + ' superado!');
    setText('#snTxt', '🔥 Racha: ' + done + ' · Tiempo acumulado: ' + fmt(total));
    setText('#snNext', 'Siguiente: ' + MODE_NAMES[nextMode] + ' • ' + NAMES[nextDiff]);
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mSurvNext') m.hidden = true; });
    const m = $('#mSurvNext'); if (m) m.hidden = false;
    // El timeout deja que afterChange termine de pintar y guardar el tablero resuelto antes de generar el siguiente.
    setTimeout(() => {
      startGame(nextDiff, nextMode, {
        transition: true,
        surv: { rot: S.rot, n: nextN, prev: total, rec0: S.rec0 }
      });
    }, 0);
  }

  // Fin de la racha: comparación contra el récord histórico.
  function showSurvEnd() {
    const S = G.surv, done = S.n - 1, t = S.prev | 0;
    const rec = stats.surv[S.rot] || null;
    const isNew = done > 0 && survBetter({ n: done, t: t }, S.rec0);
    setText('#seTitle', isNew ? '¡Nuevo récord!' : 'Fin de la racha');
    setText('#seTxt', done
      ? '🔥 Superaste ' + done + (done === 1 ? ' tablero' : ' tableros') + ' en ' + fmt(t) + '.'
      : 'No lograste superar ningún tablero.');
    setText('#seMode', SURV_MODES[S.rot].label + ' • Caíste en el tablero ' + S.n + ' (' + (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ')');
    let line;
    if (isNew) line = S.rec0 ? 'Récord anterior: ' + recText(S.rec0) : 'Es tu primer récord en esta rotación.';
    else line = rec ? 'Récord histórico: ' + recText(rec) : 'Todavía no hay récord en esta rotación.';
    setText('#seRec', line);
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mSurvEnd') m.hidden = true; });
    const m = $('#mSurvEnd'); if (m) m.hidden = false;
  }

  // Estadísticas en dos pasos: 1) elegir modo; 2) métricas por dificultad (o Supervivencia y diarios).
  let statsDiff = 'facil', statsMode = 'all', statsView = 'home';
  const STAT_MODES = [['all', 'Todos los modos'], ['classic', 'Clásico'], ['killer', 'Killer'], ['diagonal', 'Diagonal'],
    ['antiknight', 'Anti-Caballo'], ['nonconsecutive', 'Sin Consecutivos'], ['jigsaw', 'Jigsaw (Irregular)'], ['surv', 'Supervivencia (No-Hit)'], ['daily', 'Desafíos diarios']];
  let statsRot = 'classic';
  const statCard = (label, value, sub, wide) =>
    '<div class="stat-card' + (wide ? ' wide' : '') + '"><span class="sl">' + label + '</span><b class="sv">' + value + '</b>' +
    (sub ? '<span class="ss">' + sub + '</span>' : '') + '</div>';
  const winsOf = mode => DIFF_ORDER.reduce((n, d) => n + ((stats.g[mode + '.' + d] || {}).w | 0), 0);

  function renderStatsHome() {
    const box = $('#statsHome'); if (!box) return;
    box.innerHTML = STAT_MODES.map(p => {
      const k = p[0], w = (k === 'surv' || k === 'daily') ? 0 : winsOf(k), dn = Object.keys(stats.daily).length;
      let right, sub;
      if (k === 'surv') {
        const best = Object.keys(stats.surv).reduce((n, r) => Math.max(n, stats.surv[r].n | 0), 0);
        right = 'Racha máx. ' + best; sub = 'Una racha por rotación';
      } else if (k === 'daily') {
        right = dn + (dn === 1 ? ' completado' : ' completados'); sub = 'Estrellas, rachas y copas';
      } else { right = w + (w === 1 ? ' victoria' : ' victorias'); sub = 'De Fácil a Extremo'; }
      return '<button type="button" class="vcard" data-stat="' + k + '"><span class="vc-main"><b class="vc-t">' + p[1] + '</b>' +
        '<small class="vc-s">' + sub + '</small></span>' +
        '<span class="vc-r">' + right + '</span></button>';
    }).join('');
  }

  function renderStats() {
    const g = Object.assign(blankG(), stats.g[statsMode + '.' + statsDiff] || {});
    const started = Math.max(g.s, g.w);
    const pct = started ? Math.round(g.w * 100 / started) : 0;
    document.querySelectorAll('#statsTabs [data-sdiff]').forEach(b => {
      const on_ = b.dataset.sdiff === statsDiff;
      b.classList.toggle('on', on_); b.setAttribute('aria-selected', on_ ? 'true' : 'false');
    });
    const body = $('#statsBody'); if (!body) return;
    const avg = g.tn ? Math.round(g.tt / g.tn) : 0;
    body.innerHTML =
      '<div class="stat-hero"><div class="ring" style="--p:' + pct + '"><b>' + (started ? pct + '%' : '—') + '</b></div>' +
      '<div class="hero-txt"><b>' + g.w + (g.w === 1 ? ' victoria' : ' victorias') + '</b><span>de ' + started +
      (started === 1 ? ' partida iniciada' : ' partidas iniciadas') + '</span></div></div>' +
      '<div class="stat-grid">' +
      statCard('Partidas iniciadas', started) +
      statCard('Partidas ganadas', g.w, started ? pct + '% de victorias' : '') +
      statCard('Mejor tiempo', g.bt ? fmt(g.bt) : '—') +
      statCard('Tiempo promedio', avg ? fmt(avg) : '—') +
      statCard('Racha actual', g.cs, g.cs === 1 ? 'victoria seguida' : 'victorias seguidas') +
      statCard('Mejor racha', g.ms, g.ms === 1 ? 'victoria' : 'victorias') +
      statCard('Victorias sin equivocarse', g.f, g.w ? Math.round(g.f * 100 / g.w) + '% de tus victorias' : '', true) +
      '</div>' +
      '<p class="stats-sum">Las victorias en Modo Zen suman a las ganadas, pero no a los tiempos.</p>';
  }

  function renderStatsSurv() {
    document.querySelectorAll('#statsRots [data-srot]').forEach(b => {
      const on_ = b.dataset.srot === statsRot;
      b.classList.toggle('on', on_); b.setAttribute('aria-selected', on_ ? 'true' : 'false');
    });
    const body = $('#statsSurvBody'); if (!body) return;
    const r = stats.surv[statsRot], sv = stats.sv[statsRot] || { a: 0, b: 0 };
    body.innerHTML = '<div class="stat-grid">' +
      statCard('Racha máxima', r ? r.n : 0, r ? (r.n === 1 ? 'tablero seguido' : 'tableros seguidos') : 'sin racha todavía') +
      statCard('Tiempo de mejor racha', r ? fmt(r.t) : '—') +
      statCard('Intentos totales', sv.a, sv.a === 1 ? 'racha iniciada' : 'rachas iniciadas') +
      statCard('Tableros superados', Math.max(sv.b, r ? r.n : 0), 'en todas tus rachas') +
      '</div><p class="stats-sum">Cada rotación guarda sus propios números. Un error y la racha termina.</p>';
  }

  function renderStatsDaily() {
    const box = $('#statsDaily'); if (!box) return;
    const s = dailySummary(), cups = s.cups[0] + s.cups[1] + s.cups[2];
    box.innerHTML = '<div class="stat-grid">' +
      statCard('Desafíos completados', s.n, s.n === 1 ? 'día resuelto' : 'días resueltos') +
      statCard('Mejor tiempo', s.best ? fmt(s.best) : '—') +
      statCard('Tiempo promedio', s.avg ? fmt(s.avg) : '—') +
      statCard('Racha actual', s.cur, s.cur === 1 ? 'día seguido' : 'días seguidos') +
      statCard('Mejor racha', s.max, s.max === 1 ? 'día' : 'días') +
      statCard('Meses completados (Copas)', cups, s.cups[0] + ' oro · ' + s.cups[1] + ' plata · ' + s.cups[2] + ' bronce') +
      statCard('Completados sin errores', s.flawless, s.n ? Math.round(s.flawless * 100 / s.n) + '% de tus desafíos (los días anteriores a las estrellas cuentan como oro)' : '', true) +
      '</div>';
  }

  function setStatsView(v) {
    statsView = v;
    const vis = (id, on_) => { const e = $(id); if (e) e.hidden = !on_; };
    vis('#statsHome', v === 'home'); vis('#statsDetail', v === 'mode'); vis('#statsSurv', v === 'surv'); vis('#statsDaily', v === 'daily');
    vis('#statsTabs', v === 'mode');
    setText('#statsBack', v === 'home' ? '← Inicio' : '← Estadísticas');
    setText('#statsTitle', v === 'mode' ? (statsMode === 'all' ? 'Todos los modos' : MODE_NAMES[statsMode]) : (v === 'surv' ? 'Supervivencia (No-Hit)' : (v === 'daily' ? 'Desafíos diarios' : 'Estadísticas')));
    const sv = $('#stats-view'); if (sv) sv.scrollTop = 0;
    if (v === 'home') renderStatsHome(); else if (v === 'mode') renderStats(); else if (v === 'surv') renderStatsSurv(); else renderStatsDaily();
  }

  function showStats() {
    if (G && NAMES[G.diff] && !G.surv) statsDiff = G.diff;   // la vista de modo abre en la dificultad que se está jugando
    setStatsView('home');
    showView('stats');
  }

  /* ---------- Duelos: invitación por enlace, desafiar y revancha ---------- */
  // Lee #duel=... (al cargar y en hashchange). Un enlace válido abre la invitación; uno roto, solo avisa.
  function checkDuelHash() {
    if (!D || busy) return;
    const r = D.readLocationHash();
    if (!r) return;
    if (!r.ok) { D.clearHash(); toast('El enlace de duelo no es válido.'); return; }
    showInvite(r);
  }

  // ¿El enlace de resultado `d` es del mismo tablero que mi duelo en vivo (invitación abierta)?
  function matchLive(d) {
    return !!(G && G.duel && G.duel.open && !d.open && G.mode === d.mode && G.req === d.diff && G.seed === d.seed);
  }

  function showInvite(r) {
    const d = r.data;
    pendingDuel = r;
    setText('#duelTitle', D.challengeTitle(d)); // textContent: el alias nunca se interpreta como HTML
    const prev = D.history.playedOutcome(r.id), rec = D.history.get(d.alias);
    const meta = $('#duelMeta');
    if (meta) {
      let t = '';
      if (d.open) t = 'Los dos juegan el mismo tablero a la vez. Al terminar, cada uno envía su resultado y se comparan.';
      else if (matchLive(d)) t = G.won ? 'Es el mismo tablero que acabás de jugar: se comparan los resultados.'
        : 'Es el mismo tablero que estás jugando: el rival se conecta sin perder tu progreso.';
      else if (prev) t = 'Ya jugaste este duelo (' + ({ win: 'ganaste', loss: 'perdiste', tie: 'empataste' }[prev]) + '): el marcador no cambiará.';
      else if (rec.wins + rec.losses + rec.ties) t = 'Marcador contra ' + rec.name + ': Vos ' + rec.wins + ' · ' + rec.name + ' ' + rec.losses +
        (rec.ties ? ' · Empates ' + rec.ties : '');
      meta.textContent = t; meta.hidden = !t;
    }
    const same = hasProgress() && G.duel && G.duel.id === r.id;     // el mismo duelo ya está en curso: se retoma
    const w = $('#duelWarn'); if (w) w.hidden = !hasProgress() || !!same || matchLive(d);
    setText('#duelAccept', matchLive(d) ? (G.won ? 'Ver comparativa' : 'Conectar al rival') : (d.open ? 'Unirme al duelo' : 'Aceptar Duelo'));
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mDuel') m.hidden = true; });
    const m = $('#mDuel'); if (m) m.hidden = false;
  }

  function acceptDuel() {
    const r = pendingDuel; if (!r) return;
    pendingDuel = null;
    D.clearHash();
    closeModals();
    const d = r.data;
    if (hasProgress() && G.duel && G.duel.id === r.id) { showView('game'); render(); return; }
    if (matchLive(d)) { attachRival(r); return; }
    startGame(d.diff, d.mode, {
      seed: d.seed,
      board: d.board || undefined,      // modos estándar: tablero empaquetado, arranque instantáneo
      legacy: d.version === 1,          // enlace viejo: se regenera con los topes fijos de siempre
      duel: { id: r.id, open: !!d.open, alias: d.alias, time: d.time, errors: d.errors, hints: d.hints, moves: d.moves }
    });
  }

  // Llegó el resultado del rival para el MISMO tablero que ya juego en vivo: se le conecta el fantasma.
  // Si ya terminé, se muestra la comparativa cara a cara (y se anota en el historial) sin volver a jugar.
  function attachRival(r) {
    const d = r.data;
    if (d.moves.some(m => G.puzzle[Math.floor(m.cell / 9)][m.cell % 9])) { toast('El enlace no coincide con este tablero.'); return; }
    G.duel = { id: r.id, open: false, alias: d.alias, time: d.time, errors: d.errors, hints: d.hints, moves: d.moves };
    ghostSeen = eff(); flash.fill(0);
    if (G.won && typeof G.finalTime === 'number') {
      const res = D.history.record(r.id, d.alias, G.finalTime, d.time);
      G.duelResult = { counted: res.counted, record: res.record };
      persist(); showView('game'); render(); showWin();
    } else {
      persist(); showView('game'); render();
      toast(d.alias + ' ya terminó en ' + fmt(d.time) + '. ¡Ganale!');
    }
  }

  function cancelDuel() {
    pendingDuel = null;
    if (D) D.clearHash();
    closeModals();
  }

  function askAlias(cb, o) {
    const inp = $('#aliasInput'), er = $('#aliasErr'), m = $('#mAlias'), A = D || C;
    if (!m || !A) return;
    o = o || {};
    aliasCb = cb;
    setText('#aliasSub', o.sub || 'Así te verá tu rival (hasta 12 caracteres).');
    setText('#aliasOk', o.ok || 'Guardar y compartir');
    if (inp) inp.value = A.getAlias();
    if (er) er.hidden = true;
    m.hidden = false;
    if (inp) setTimeout(() => { try { inp.focus(); } catch (e) { /* ignorar */ } }, 50);
  }

  function hideAlias() { aliasCb = null; const m = $('#mAlias'); if (m) m.hidden = true; }

  function submitAlias() {
    const inp = $('#aliasInput'), A = D || C;
    const a = A ? A.setAlias(inp ? inp.value : '') : '';
    if (!a) { const er = $('#aliasErr'); if (er) er.hidden = false; return; }
    const cb = aliasCb;
    hideAlias();
    if (cb) cb(a);
  }

  // "Desafiar a un amigo": pide el alias la primera vez y comparte el enlace con el fantasma de esta partida.
  function challengeFriend() {
    if (!canChallenge()) return;
    const alias = D.getAlias();
    if (alias) shareChallenge(alias); else askAlias(shareChallenge);
  }

  function shareChallenge(alias) {
    if (!canChallenge()) return;
    let enc;
    try {
      const payload = G.rec.toPayload({ mode: G.mode, diff: G.req, seed: G.seed, time: G.finalTime, alias: alias });
      if (G.mode !== 'killer' && G.mode !== 'jigsaw') payload.board = G.puzzle; // tablero empaquetado: el rival arranca al instante
      enc = D.encodeDuelPayload(payload);
    } catch (e) { toast('No se pudo crear el enlace.'); return; }
    const url = D.buildLink(enc);
    const text = alias + ' te desafía en Sudoku (' + MODE_NAMES[G.mode] + ' • ' + NAMES[G.req] + '): mi tiempo fue ' +
      fmt(G.finalTime) + '. ¿Podés ganarme?';
    D.shareLink({ title: 'Desafío de Sudoku', text: text, url: url }).then(res => {
      if (res === 'copied') toast('Enlace copiado');
      else if (res === 'failed') {
        try { window.prompt('Copiá este enlace:', url); } catch (e) { toast('No se pudo compartir el enlace.'); }
      }
    });
  }

  // "Devolver desafío": tablero nuevo (semilla nueva) del mismo modo y dificultad, para mandar la revancha al ganar.
  function rematch() {
    if (!G || !G.duel || !NAMES[G.req]) return;
    const rival = G.duel.alias, mode = G.mode, diff = G.req;
    closeModals();
    startGame(diff, mode, { rematchTo: rival });
  }

  /* ---------- Duelo con amigo: elegir tablero, crear invitación y jugar ---------- */
  let friendMode = 'classic', friendDiff = 'medio';

  function setFriendSel() {
    document.querySelectorAll('#friendModes [data-fmode]').forEach(b => {
      const on_ = b.dataset.fmode === friendMode;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
    document.querySelectorAll('#friendDiffs [data-fdiff]').forEach(b => {
      const on_ = b.dataset.fdiff === friendDiff;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
  }

  function openFriend() {
    friendMode = selMode;
    setFriendSel();
    const w = $('#friendWarn'); if (w) w.hidden = !hasProgress();
    const m = $('#mFriend'); if (m) m.hidden = false;
  }

  // "Compartir enlace y jugar": genera el tablero, crea el enlace de invitación abierta, lo comparte y entra a jugar.
  function createFriendDuel() {
    if (!D) { toast('Los duelos no están disponibles.'); return; }
    startGame(friendDiff, friendMode, { invite: true });
  }
  /* ===========================================================================
   * Duelo 1v1 en vivo (P2P con PeerJS, reutiliza las salas de Co-op)
   * ---------------------------------------------------------------------------
   *  - Cada jugador resuelve SU copia del mismo tablero (misma semilla); no se comparten jugadas.
   *  - El Host crea la sala y espera; al conectarse el Invitado le envía `state` (con `duel:true`) y ambos arrancan en 00:00.
   *  - Cada cambio de avance se informa con `dprog` {filled, errors, lives, secs}.
   *  - Fin: `duel-win` (81/81), `duel-eliminated` (3 vidas agotadas) o `duel-forfeit` (abandono); se envían y la sala se cierra 150 ms después.
   *  - `G.live` marca la partida; `G.lv` guarda lo del rival (nombre, celdas, errores, vidas, tiempo final) y sobrevive al cierre de la sala.
   *  - `co.kind === 'duel'` distingue la sala; G.coop sigue en false, así que nada de la lógica Co-op interviene.
   * ========================================================================= */
  let liveMode = 'classic', liveDiff = 'medio';
  const inLive = () => !!(G && G.live && G.lv && !G.lv.over && co && co.kind === 'duel' && co.session);

  // Celdas correctas (incluye las dadas), sin depender de "Marcar errores".
  function liveFilled() {
    let n = 0;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (G.board[r][c] && G.board[r][c] === G.solution[r][c]) n++;
    return n;
  }

  function setLiveSel() {
    document.querySelectorAll('#liveModes [data-lmode]').forEach(b => {
      const on_ = b.dataset.lmode === liveMode;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
    document.querySelectorAll('#liveDiffs [data-ldiff]').forEach(b => {
      const on_ = b.dataset.ldiff === liveDiff;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
  }

  function openLive() {
    if (!coopOk()) { toast('Falta peerjs.min.js: el duelo en vivo no está disponible.'); return; }
    liveMode = selMode;     // arranca con el modo elegido en Jugar; la elección se conserva mientras la app esté abierta
    setLiveSel();
    const w = $('#liveWarn'); if (w) w.hidden = true;      // la partida individual se conserva aparte
    const m = $('#mLive'); if (m) m.hidden = false;
  }

  // Arma la partida de duelo en vivo (Host y Invitado): vidas 3, sin pistas, sin estadísticas ni fantasma.
  function buildLiveGame(src) {
    if (G && !G.race && !G.live) persist();        // la partida individual en curso queda guardada antes de reemplazar G
    G = {
      mode: src.mode, variant: src.mode, puzzle: src.puzzle, solution: src.solution, board: E.cloneBoard(src.puzzle),
      notes: emptyNotes(), diff: src.diff, req: src.req, seed: src.seed, hist: [], secs: 0, won: false, lost: false, counted: true,
      rec: null, live: true, errs: 0, lv: { alias: '', rf: 0, re: 0, rl: FRIEND_LIVES, rt: 0, over: false },
      maxLives: FRIEND_LIVES, lives: FRIEND_LIVES, hintsMax: 0, hintsUsed: 0
    };
    if (src.mode === 'killer') G.cages = src.cages;
    if (src.mode === 'jigsaw') G.regions = src.regions;
    prepareGame();
    G.lv.rf = givensN;
    sel = -1; pencil = false; activeDigit = null; hideHint(); hideErrExplain();
    ghostSeen = 0; flash.fill(0); lastHintKey = '';
  }

  function startLiveHost(mode, diff) {
    if (!coopOk()) { toast('Falta peerjs.min.js: el duelo en vivo no está disponible.'); return; }
    const alias = C.getAlias();
    if (!alias) { askAlias(() => startLiveHost(mode, diff), COOP_ALIAS); return; }
    if (busy) return;
    mode = validMode(mode);
    busy = true; closeModals();
    showLoad('Generando tablero…', false);
    const seed = toSeed();
    let ok = false;
    genPuzzle(diff, mode, seed, false).then(g => {
      if (co || rc) leaveCoop();
      const killer = mode === 'killer';
      buildLiveGame({ mode: mode, puzzle: killer ? g.board : g.puzzle, solution: g.solution, diff: g.difficulty, req: diff, seed: seed, cages: g.cages, regions: g.regions });
      co = newCoop('host', alias);
      co.kind = 'duel';
      ok = true;
    }).catch(() => { /* conserva la partida actual */ }).then(() => {
      busy = false;
      hideLoad();
      if (!ok) { toast('No se pudo crear la sala.'); updateHome(); return; }
      startHostSession();                      // el enlace sale con &k=d; shareCoopLink() se ejecuta al estar lista la sala
      const w = $('#mLiveWait'); if (w) w.hidden = false;
    });
  }

  function hideLiveWait() { const w = $('#mLiveWait'); if (w) w.hidden = true; }

  // El Host cancela antes de que llegue el rival: se cierra la sala y no queda partida.
  function cancelLiveWait() {
    hideLiveWait();
    if (co && co.kind === 'duel') leaveCoop();
    dropRoomGame();
    updateHome();
  }

  // Arranque simultáneo: ambos ponen el reloj en 00:00 al recibir/enviar el tablero.
  function liveBegin(rt) {
    rt.started = true; rt.t0 = Date.now();
    G.secs = 0;
    hideLiveWait(); closeModals(); hideLoad();
    showView('game'); render(); persist();
  }

  function sendLiveState() {
    co.session.send(C.buildState({
      alias: co.myAlias, mode: G.mode, diff: G.diff, req: G.req, seed: G.seed,
      puzzle: G.puzzle, solution: G.solution, cages: G.cages, regions: G.regions, board: G.puzzle, notes: emptyNotes(),
      owners: C.emptyOwners(), secs: 0, hints: 0, lives: FRIEND_LIVES, won: false, fresh: true, duel: true
    }));
  }

  // Invitado: llegó el tablero del duelo.
  function applyLiveState(rt, m) {
    if (rt.started && G && G.live && G.seed === m.seed) { sendLiveProg(); return; }   // reconexión: no se reinicia nada
    rt.kind = 'duel'; rt.joining = false; rt.friendAlias = m.alias;
    buildLiveGame({ mode: m.mode, puzzle: m.puzzle, solution: m.solution, diff: m.diff, req: m.req, seed: m.seed, cages: m.cages, regions: m.regions });
    G.lv.alias = m.alias;
    liveBegin(rt);
    sendLiveProg();
  }

  function sendLiveProg() {
    if (!inLive()) return;
    co.session.send({ type: 'dprog', filled: liveFilled(), errors: G.errs | 0, lives: G.lives, secs: G.secs });
  }

  // Cierre común: la partida local queda terminada y la sala se suelta.
  function liveClose() {
    const rt = co;
    co = null;
    if (G && G.lv) G.lv.over = true;
    if (rt && rt.session) { try { rt.session.close(); } catch (e) { /* ignorar */ } }
  }

  // Modal final del duelo en vivo (copa si ganaste, espadas si perdiste) con la comparativa de tiempos y avance.
  function showLiveResult(won, reason) {
    const mine = { t: G.secs, f: liveFilled() };
    const them = { t: G.lv.rt || G.secs, f: G.lv.rf };
    G.finalTime = G.secs;
    setResIcon('#winIcon', won ? 'trophy' : 'swords');
    setText('#winTitle', won ? '¡Ganaste el duelo!' : 'Perdiste el duelo');
    setText('#winTxt', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • vs ' + (G.lv.alias || 'Rival'));
    const dr = $('#duelResult'); if (dr) { dr.textContent = ''; dr.hidden = true; }
    const box = $('#coopResult');
    if (box) {
      box.textContent = '';
      [['Vos', 1, mine], [G.lv.alias || 'Rival', 2, them]].forEach(r => {
        const row = mk('div', 'cr-row'), nm = mk('div', 'cr-name');
        nm.appendChild(mk('i', 'pdot p' + r[1]));
        nm.appendChild(mk('span', '', r[0]));
        row.appendChild(nm);
        row.appendChild(mk('b', '', fmt(r[2].t) + ' · ' + r[2].f + '/81'));
        box.appendChild(row);
      });
      box.hidden = false;
    }
    const note = $('#winNote'); if (note) { note.textContent = reason; note.hidden = !reason; }
    ['#winCoopAgain', '#winChallenge', '#winRematch'].forEach(id => { const b = $(id); if (b) b.hidden = true; });
    setText('#winNew', 'Volver al inicio');
    sel = -1; hideHint(); render(); persist();
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mWin') m.hidden = true; });
    const m = $('#mWin'); if (m) m.hidden = false;
  }

  // Yo llegué a 81/81 (se llama desde finishGame).
  function liveWin() {
    G.lv.over = true;
    const rt = co;
    if (rt && rt.session) rt.session.sendAndClose({ type: 'duel-win', time: G.secs, filled: 81 });
    co = null;
    showLiveResult(true, 'Completaste las 81 celdas primero.');
  }

  // Me quedé sin vidas (se llama desde showLose): el rival gana al instante.
  function liveEliminated() {
    G.lv.over = true;
    const rt = co;
    if (rt && rt.session) rt.session.sendAndClose({ type: 'duel-eliminated', time: G.secs, filled: liveFilled() });
    co = null;
    showLiveResult(false, 'Agotaste tus 3 vidas.');
  }

  // El rival terminó o se fue: resolución de mi lado.
  function liveRivalEnded(kind, m) {
    if (!inLive()) return;
    if (m && m.filled) G.lv.rf = m.filled;
    G.lv.rt = (m && m.time) || G.secs;
    const who = G.lv.alias || 'Tu rival';
    if (kind === 'win') {       // me ganó por llegar primero a 81/81
      G.lv.rf = 81; G.lost = true; liveClose();
      sfx('lose');
      showLiveResult(false, who + ' completó las 81 celdas primero.');
    } else {                    // eliminado o abandono: gano yo
      G.won = true; liveClose();
      sfx('win');
      showLiveResult(true, kind === 'eliminated' ? who + ' agotó sus 3 vidas.' : who + ' abandonó el duelo.');
    }
  }

  // Mensajes del rival (ambos roles).
  function onLiveMessage(rt, m) {
    switch (m.type) {
      case 'hello':                       // solo llega al Host
        rt.friendAlias = m.alias; G.lv.alias = m.alias;
        sendLiveState();
        if (!rt.started) liveBegin(rt); else sendLiveProg();
        break;
      case 'dprog':
        if (!G || !G.lv) break;
        G.lv.rf = m.filled; G.lv.re = m.errors; G.lv.rl = m.lives;
        updateDuelBar();
        break;
      case 'duel-win': liveRivalEnded('win', m); break;
      case 'duel-eliminated': liveRivalEnded('eliminated', m); break;
      case 'duel-forfeit': liveRivalEnded('forfeit', m); break;
      case 'bye':                         // el rival cerró la sala sin avisar antes: cuenta como abandono
        if (rt.started) liveRivalEnded('forfeit', null);
        break;
      default: break;
    }
  }

  // Estado de la conexión de la sala de duelo. Un micro-corte (reconectando) NO pausa ni abre modales: solo se ve en la tarjeta.
  function onLiveStatus(rt, info) {
    if (info.state === 'error' || info.state === 'closed') {
      if (info.reason === 'local') return;
      if (rt.started) liveRivalEnded('forfeit', null);
      else if (rt.role === 'host') updateHome();
      return;
    }
    updateDuelBar();
    updateRaceBar();
  }

  // "Salir del duelo": confirmación propia; el rival recibe la victoria.
  function liveQuit() {
    if (!inLive()) return;
    coopAsk({
      title: '¿Salir del duelo?', text: 'Tu rival ganará la partida.', yes: 'Sí, salir', no: 'Cancelar',
      onYes: () => {
        if (!inLive()) return;
        G.lv.over = true; G.lost = true;
        const rt = co; co = null;
        if (rt.session) rt.session.sendAndClose({ type: 'duel-forfeit' });
        goHome(); updateHome();
        toast('Abandonaste el duelo.');
      }
    });
  }


  /* ===========================================================================
   * Carrera grupal (todos contra todos, 3 a 8 jugadores, P2P con PeerJS en estrella) — transporte en race.js
   * ---------------------------------------------------------------------------
   *  - El Host crea la sala y es un jugador más: juega su tablero y figura en la tabla. También es el nodo central:
   *    recibe `rprog` de cada invitado y retransmite `race-leaderboard` a todos.
   *  - Al tocar "Iniciar carrera" (3 a 8 jugadores) el Host genera el tablero y envía `race-start` con el tablero; todos
   *    arrancan el reloj en 00:00 al recibirlo.
   *  - 3 errores = eliminado: el tablero se bloquea y se sigue viendo la tabla hasta el final. "Salir de la carrera" abandona.
   *  - Termina cuando alguien completa 81/81 o queda un solo jugador activo: `race-finish` con el podio.
   *  - `G.race` = { me, rows (ranking vigente), over, tableOpen, winnerId }.  `rc` = sala de ejecución (no se guarda).
   * ========================================================================= */
  const SR = window.SudokuRace || null;
  let raceMode = 'classic', raceDiff = 'medio';
  let rc = null;
  const raceOk = () => !!(SR && SR.available());
  const inRace = () => !!(G && G.race && !G.race.over && rc && rc.net);

  function setRaceSel() {
    document.querySelectorAll('#raceModes [data-rmode]').forEach(b => {
      const on_ = b.dataset.rmode === raceMode;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
    document.querySelectorAll('#raceDiffs [data-rdiff]').forEach(b => {
      const on_ = b.dataset.rdiff === raceDiff;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
  }

  function openRace() {
    if (!raceOk()) { toast('Falta peerjs.min.js: la carrera grupal no está disponible.'); return; }
    raceMode = selMode;
    setRaceSel();
    const w = $('#raceWarn'); if (w) w.hidden = true;
    const m = $('#mRace'); if (m) m.hidden = false;
  }

  function raceNotice(title, text) {
    coopAsk({ title: title, text: text || '', yes: 'Entendido', single: true });
  }

  function hideRaceLobby() { const m = $('#mRaceLobby'); if (m) m.hidden = true; hideRaceAlert(); }

  function leaveRace() {
    const r = rc;
    rc = null;
    if (G && G.race) G.race.over = true;
    hideRaceLobby();
    if (r && r.net) { try { r.net.close(); } catch (e) { /* ignorar */ } }
  }

  /* ----- Lobby ----- */
  function renderRaceLobby(list) {
    if (!rc) return;
    rc.lobby = list;
    const ul = $('#raceList'); if (ul) {
      ul.textContent = '';
      list.forEach(p => {
        const li = mk('li', 'race-li');
        li.appendChild(mk('span', 'rl-name', p.alias));
        if (p.host) li.appendChild(mk('em', 'rl-tag', 'Anfitrión'));
        if (p.id === rc.id) li.appendChild(mk('em', 'rl-tag me', 'Vos'));
        ul.appendChild(li);
      });
    }
    const n = list.length, host = rc.role === 'host';
    setText('#raceLobbyInfo', host ? n + ' de ' + SR.MAX_PLAYERS + ' jugadores · mínimo ' + SR.MIN_PLAYERS + ' para empezar'
      : n + ' de ' + SR.MAX_PLAYERS + ' jugadores · esperando a que el anfitrión inicie la carrera…');
    const st = $('#raceStart'); if (st) { st.hidden = !host; st.disabled = !(n >= SR.MIN_PLAYERS && n <= SR.MAX_PLAYERS); }
    const cp = $('#raceCopy'); if (cp) cp.hidden = !host;
    setText('#raceLobbyLeave', host ? 'Cancelar' : 'Salir de la sala');
    if (!rc.started) { const m = $('#mRaceLobby'); if (m) m.hidden = false; }
  }

  /* ----- Host: crear la sala ----- */
  function startRaceHost(mode, diff) {
    if (!raceOk()) { toast('Falta peerjs.min.js: la carrera grupal no está disponible.'); return; }
    const alias = C.getAlias();
    if (!alias) { askAlias(() => startRaceHost(mode, diff), COOP_ALIAS); return; }
    if (busy) return;
    if (co || rc) leaveCoop();
    closeModals();
    const net = SR.createHost({ alias: alias });
    rc = { role: 'host', net: net, id: 0, mode: validMode(mode), diff: diff, started: false, table: {}, voluntary: {}, code: '' };
    const me = rc;
    net.on('ready', code => { if (rc !== me) return; me.code = code; shareRace(); });
    net.on('lobby', list => { if (rc === me) renderRaceLobby(list); });
    net.on('message', (m, id) => { if (rc === me) onRaceHostMessage(m, id); });
    net.on('dropped', id => { if (rc === me && me.started && me.table[id]) { me.table[id].left = true; raceHostUpdated(); } });
    net.on('rejoin', id => {
      if (rc !== me || !me.started) return;
      const e = me.table[id];                       // volvió antes de que termine la carrera: si no se había ido a propósito, vuelve a estar activo
      if (e && e.left && !me.voluntary[id]) { e.left = false; raceHostUpdated(); }
      if (me.voluntary[id]) { net.send(id, { type: 'race-closed', reason: 'started' }); return; }
      net.send(id, Object.assign({}, me.startMsg, { elapsed: Math.max(0, Math.floor((Date.now() - me.t0) / 1000)) }));   // tablero + tiempo transcurrido
      net.send(id, { type: 'race-leaderboard', rankings: Object.values(me.table) });
    });
    net.on('error', reason => {
      if (rc !== me) return;
      leaveRace(); updateHome();
      toast(reason === 'no-peerjs' ? 'Falta peerjs.min.js.' : 'No se pudo crear la sala. Probá de nuevo.');
    });
    renderRaceLobby(net.lobby());
    net.start();
  }

  function shareRace() {
    if (!rc || rc.role !== 'host') return;
    rc.net.share({ text: rc.net.alias + ' te invita a una carrera de Sudoku (' + MODE_NAMES[rc.mode] + ' • ' + NAMES[rc.diff] + '). Entrá con el enlace.' }).then(res => {
      if (res === 'copied') toast('Enlace copiado: mandalo a tus amigos');
      else if (res === 'failed') { try { window.prompt('Copiá este enlace:', rc ? rc.net.link() : ''); } catch (e) { toast('No se pudo compartir el enlace.'); } }
    });
  }

  function raceCopyLink() {
    if (!rc || rc.role !== 'host') return;
    rc.net.copy().then(ok => { if (ok) toast('Enlace copiado'); else shareRace(); });
  }

  // Cancelar desde el lobby: el Host avisa a los que ya entraron; el invitado simplemente sale.
  function raceLobbyLeave() {
    const r = rc;
    if (!r) { hideRaceLobby(); return; }
    if (r.role === 'host') r.net.finish({ type: 'race-closed', reason: 'host-quit' });
    else { r.net.sendHost({ type: 'rleave' }); }
    leaveRace(); updateHome();
  }

  /* ----- Arranque ----- */
  // Arma la partida de carrera (Host e Invitados): vidas 3, sin pistas, sin estadísticas.
  function buildRaceGame(src, players, me) {
    buildLiveGame(src);
    G.live = false; delete G.lv;
    G.raceCode = rc ? rc.code : '';
    G.race = { me: me, rows: [], over: false, tableOpen: false, winnerId: -1, mode: src.mode };
    G.race.rows = SR.rank(players.map(p => ({ id: p.id, alias: p.alias, filled: givensN, mistakes: 0, time: 0, eliminated: false, left: false, done: false, host: !!p.host })));
  }

  // Token por sala (30 min de vigencia): identifica al jugador si cierra la app y vuelve a abrir el enlace.
  function raceToken(code) {
    const now = Date.now(), o = load(K_RTOK, null);
    const t = (o && o.code === code && o.exp > now && typeof o.t === 'string') ? o.t : Math.random().toString(36).slice(2) + now.toString(36);
    store.set(K_RTOK, JSON.stringify({ code: code, t: t, exp: now + 30 * 60 * 1000 }));
    return t;
  }

  // Reingreso: si lo guardado es de esta misma sala y tablero, se recuperan celdas, notas, vidas y errores.
  function restoreRaceProgress(sv, seed) {
    try {
      if (!sv || sv.raceCode !== rc.code || sv.seed !== seed || !Array.isArray(sv.board) || sv.board.length !== 9 || !Array.isArray(sv.notes) || sv.notes.length !== 9) return;
      for (let r = 0; r < 9; r++) {
        if (!Array.isArray(sv.board[r]) || sv.board[r].length !== 9 || !Array.isArray(sv.notes[r]) || sv.notes[r].length !== 9) return;
        for (let c = 0; c < 9; c++) {
          const v = sv.board[r][c];
          if (!Number.isInteger(v) || v < 0 || v > 9 || (G.puzzle[r][c] && v !== G.puzzle[r][c])) return;
          if (!Array.isArray(sv.notes[r][c])) return;
        }
      }
      G.board = sv.board; G.notes = sv.notes;
      G.lives = Number.isInteger(sv.lives) ? Math.max(0, Math.min(G.maxLives, sv.lives)) : G.lives;
      G.errs = sv.errs | 0; G.lost = !!sv.lost; G.won = !!sv.won;
    } catch (e) { /* se empieza de cero */ }
  }

  // Al terminar o abandonar una partida de sala se vuelve a la partida individual guardada ("Continuar partida").
  function dropRoomGame() {
    if (!(G && (G.race || G.live))) return;
    G = null; sel = -1; hideHint();
    restore();
  }

  function raceBegin(elapsed) {
    elapsed = elapsed | 0;
    rc.started = true; rc.t0 = Date.now() - elapsed * 1000;   // en un reingreso retoma el tiempo transcurrido de la carrera
    G.secs = elapsed;
    hideLoad(); hideRaceLobby(); closeModals();
    showView('game'); render(); persist();
  }

  function raceStartNow() {
    if (!rc || rc.role !== 'host' || rc.started || busy) return;
    const list = rc.net.lobby();
    if (list.length < SR.MIN_PLAYERS || list.length > SR.MAX_PLAYERS) return;
    const me = rc, mode = rc.mode, diff = rc.diff;
    me.net.lock();                                  // nadie más entra mientras se genera el tablero
    busy = true; hideRaceLobby();
    showLoad('Generando tablero…', false);
    const seed = toSeed();
    let ok = false;
    genPuzzle(diff, mode, seed, false).then(g => {
      if (rc !== me) return;
      const killer = mode === 'killer';
      buildRaceGame({ mode: mode, puzzle: killer ? g.board : g.puzzle, solution: g.solution, diff: g.difficulty, req: diff, seed: seed, cages: g.cages, regions: g.regions }, list, 0);
      list.forEach(p => { me.table[p.id] = { id: p.id, alias: p.alias, filled: givensN, mistakes: 0, time: 0, eliminated: false, left: false, done: false, host: !!p.host }; });
      me.startMsg = {
        type: 'race-start', seed: seed, mode: mode, difficulty: diff, players: list,
        state: C.buildState({
          alias: me.net.alias, mode: mode, diff: g.difficulty, req: diff, seed: seed, puzzle: G.puzzle, solution: G.solution,
          cages: G.cages, regions: G.regions, board: G.puzzle, notes: emptyNotes(), owners: C.emptyOwners(),
          secs: 0, hints: 0, lives: FRIEND_LIVES, won: false, fresh: true
        })
      };
      me.givens = givensN; me.ms = {};
      me.net.broadcast(me.startMsg);
      ok = true;
    }).catch(() => { /* se informa abajo */ }).then(() => {
      busy = false;
      if (rc !== me) { hideLoad(); return; }
      if (!ok) {
        hideLoad(); me.net.locked = false;
        toast('No se pudo generar el tablero.');
        renderRaceLobby(me.net.lobby());
        return;
      }
      raceBegin();
      raceHostUpdated();
    });
  }

  /* ----- Invitado: unirse ----- */
  function joinRace(code) {
    if (!raceOk()) { toast('Falta peerjs.min.js: la carrera grupal no está disponible.'); return; }
    if (busy) { toast('Esperá un momento…'); return; }
    const alias = C.getAlias();
    if (!alias) { askAlias(() => joinRace(code), COOP_ALIAS); return; }
    if (co || rc) leaveCoop();
    let net;
    try { net = SR.join(code, { alias: alias, sid: raceToken(code) }); } catch (e) { toast('El código de sala no es válido.'); return; }
    const me = rc = { role: 'guest', net: net, id: -1, started: false, code: code };
    closeModals();
    showLoad('Conectando con la sala…', true);
    net.on('message', m => { if (rc === me) onRaceGuestMessage(m); });
    net.on('reconnecting', () => { if (rc === me) { me.reconnecting = true; updateRaceBar(); } });
    net.on('closed', () => { if (rc === me) raceLost('Se perdió la conexión con la sala.'); });
    net.on('error', reason => {
      if (rc !== me) return;
      hideLoad(); leaveRace(); updateHome();
      raceNotice(reason === 'not-found' ? 'No se encontró la sala' : 'No se pudo conectar',
        reason === 'not-found' ? '¿El enlace sigue activo?' : 'Revisá tu conexión e intentá de nuevo.');
    });
    net.start();
  }

  // El Host se fue o se perdió la conexión: la carrera termina para este jugador.
  function raceLost(text) {
    const inGame = !!(G && G.race && rc && rc.started);
    hideLoad(); leaveRace();
    if (inGame) { render(); persist(); }
    updateHome();
    raceNotice('La carrera terminó', text);
    if (inGame) goHome();
  }

  function onRaceGuestMessage(m) {
    rc.reconnecting = false;
    switch (m.type) {
      case 'race-lobby':
        rc.id = m.you; hideLoad();
        if (!rc.started) renderRaceLobby(m.players); else raceReport();   // reconexión: vuelve a informar su avance actual
        break;
      case 'race-start': {
        if (rc.started) break;                                     // reenvío tras una reconexión sin haber cerrado la app
        const s = m.state;
        const sv = load(K_RACE, null);                             // si reabrió la app a mitad de carrera: retoma su tablero guardado
        buildRaceGame({ mode: s.mode, puzzle: s.puzzle, solution: s.solution, diff: s.diff, req: s.req, seed: s.seed, cages: s.cages, regions: s.regions }, m.players, rc.id);
        restoreRaceProgress(sv, s.seed);
        raceBegin(m.elapsed);
        if (m.elapsed || G.lost || G.won) raceReport();            // el Host vuelve a ver su avance actual
        break;
      }
      case 'race-milestone':
        raceMilestoneBanner(m);
        break;
      case 'race-leaderboard':
        if (G && G.race) { G.race.rows = SR.rank(m.rankings); updateRaceBar(); }
        break;
      case 'race-finish':
        if (G && G.race && !G.race.over) {
          G.race.over = true; G.race.rows = SR.rank(m.rankings); G.race.winnerId = m.winnerId;
          raceShowPodium();
        }
        break;
      case 'race-full':
        hideLoad(); leaveRace(); updateHome();
        raceNotice('La sala está llena', 'La sala está llena (máximo 8 jugadores).');
        break;
      case 'race-closed':
        if (m.reason === 'started') { hideLoad(); leaveRace(); updateHome(); raceNotice('La carrera ya empezó', 'No se puede entrar a una carrera en curso.'); }
        else raceLost('El anfitrión cerró la sala.');
        break;
      default: break;
    }
  }

  /* ----- Hitos del líder (50 % y 80 %): aviso con el mismo diseño que el del error, en color de acento ----- */
  let msTimer = 0;
  function hideRaceAlert() { clearTimeout(msTimer); const b = $('#raceAlert'); if (b) b.hidden = true; }
  function showRaceAlert(msg) {
    const b = $('#raceAlert'); if (!b || !G || !G.race || G.race.over) return;
    setText('#raceAlertTxt', msg); b.hidden = false;
    const bar = b.querySelector('.errx-bar');
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }   // reinicia la barra de 4 s
    clearTimeout(msTimer);
    msTimer = setTimeout(hideRaceAlert, 4000);
    sfx('line'); triggerHaptic('milestone');
  }
  function raceMilestoneBanner(m) {
    if (!G || !G.race) return;
    const mine = m.playerId === G.race.me, who = m.playerName;
    showRaceAlert(m.milestone === 50
      ? (mine ? '¡Ya completaste el 50 % del tablero!' : who + ' ya completó el 50 % del tablero')
      : (mine ? '¡Recta final! Ya llevás el 80 % completado' : '¡Atención! ' + who + ' ya lleva el 80 % completado'));
  }
  // Host: la primera vez que alguien completa el 50 % o el 80 % de las celdas jugables lo anuncia a todos, una sola vez por partida.
  function raceMilestones(rows) {
    if (!rc.ms) rc.ms = {};
    // Porcentaje sobre las celdas que había que completar: (filled - dadas) / (81 - dadas), no sobre el tablero entero.
    const g0 = rc.givens | 0, span = Math.max(1, 81 - g0);
    [[50, 0.5], [80, 0.8]].forEach(pair => {
      const ms = pair[0], th = pair[1];
      if (rc.ms[ms]) return;
      const lead = rows.filter(r => !r.left && r.filled > g0 && (r.filled - g0) / span >= th).sort((a, b) => b.filled - a.filled)[0];
      if (!lead) return;
      rc.ms[ms] = true;
      const msg = { type: 'race-milestone', milestone: ms, playerId: lead.id, playerName: lead.alias };
      rc.net.broadcast(msg);
      raceMilestoneBanner(msg);
    });
  }

  /* ----- Host: tabla y fin ----- */
  function onRaceHostMessage(m, id) {
    if (!rc || !rc.started || !G || !G.race || G.race.over) return;
    const e = rc.table[id];
    if (!e || e.left) return;
    if (m.type === 'rprog') {
      if (!e.done) { e.filled = m.filled; e.mistakes = m.mistakes; e.time = m.time; e.eliminated = e.eliminated || m.eliminated; }
    } else if (m.type === 'rwin') {
      e.done = true; e.filled = 81; e.time = m.time;
    } else if (m.type === 'rleave') {
      e.left = true; if (!m.soft) rc.voluntary[id] = true;   // "Salir de la carrera" es definitivo; cerrar la app (soft) permite reingresar
    } else return;
    raceHostUpdated();
  }

  function raceHostUpdated() {
    if (!rc || rc.role !== 'host' || !G || !G.race || G.race.over) return;
    const rows = Object.values(rc.table);
    G.race.rows = SR.rank(rows);
    rc.net.broadcast({ type: 'race-leaderboard', rankings: rows });
    raceMilestones(rows);
    updateRaceBar();
    // Fin: alguien completó 81/81, o quedó un solo jugador activo (o ninguno).
    const done = rows.find(r => r.done);
    if (done) { raceFinishHost(done.id); return; }
    const active = rows.filter(r => !r.eliminated && !r.left);
    if (active.length <= 1) raceFinishHost(active.length ? active[0].id : -1);
  }

  function raceFinishHost(winnerId) {
    if (!rc || G.race.over) return;
    const rows = SR.rank(Object.values(rc.table));
    G.race.over = true; G.race.rows = rows; G.race.winnerId = winnerId;
    rc.net.finish({ type: 'race-finish', rankings: rows, finalTime: G.secs, winnerId: winnerId });   // envía y cierra 150 ms después
    raceShowPodium();
  }

  /* ----- Avance propio ----- */
  function raceMine() {
    return { filled: liveFilled(), mistakes: G.errs | 0, time: G.secs, eliminated: !!G.lost && !G.won };
  }

  function raceReport() {
    if (!inRace() || !rc.started) return;
    const mine = raceMine();
    if (rc.role === 'host') {
      const e = rc.table[0]; if (!e) return;
      e.filled = mine.filled; e.mistakes = mine.mistakes; e.time = mine.time; e.eliminated = mine.eliminated;
      raceHostUpdated();
    } else {
      rc.net.sendHost({ type: 'rprog', filled: mine.filled, mistakes: mine.mistakes, time: mine.time, eliminated: mine.eliminated, left: false });
    }
  }

  // Yo completé 81/81 (se llama desde finishGame).
  function raceWin() {
    sfx('win');
    if (rc.role === 'host') {
      const e = rc.table[0]; e.filled = 81; e.time = G.secs; e.done = true;
      raceHostUpdated();
    } else {
      rc.net.sendHost({ type: 'rwin', time: G.secs });
      toast('¡Completaste el tablero! Esperando el resultado…');
    }
    render();
  }

  // Me quedé sin vidas (se llama desde showLose): tablero bloqueado, sigo mirando la tabla hasta el final.
  function raceEliminated() {
    if (G.race) G.race.tableOpen = true;
    toast('Quedaste eliminado. Seguís viendo la tabla en vivo.');
    render();
  }

  function raceQuit() {
    if (!inRace()) return;
    const host = rc.role === 'host';
    coopAsk({
      title: '¿Salir de la carrera?', text: host ? 'La sala se cerrará para todos los jugadores.' : 'Quedás fuera y el resto sigue jugando.',
      yes: 'Sí, salir', no: 'Cancelar',
      onYes: () => {
        if (!inRace()) return;
        const r = rc;
        if (host) r.net.finish({ type: 'race-closed', reason: 'host-quit' });
        else { r.net.sendHost({ type: 'rleave' }); setTimeout(() => r.net.close(), 150); }
        rc = null; G.race.over = true; G.lost = true;
        goHome(); updateHome();
        toast('Saliste de la carrera.');
      }
    });
  }

  /* ----- Tarjeta superior y tabla ----- */
  function raceStatus(r) {
    if (r.done) return fmt(r.time);
    if (r.left) return 'Abandonó';
    if (r.eliminated) return 'Eliminado';
    return r.filled + '/81';   // el tiempo de un jugador activo solo se actualiza con sus jugadas: no se muestra para no confundir
  }

  function updateRaceBar() {
    const bar = $('#raceBar'); if (!bar) return;
    const on = !!(G && G.race);
    bar.hidden = !on;
    if (!on) return;
    const rows = G.race.rows || [], me = rows.find(r => r.id === G.race.me);
    const filled = liveFilled();
    setText('#raceRank', '#' + (me ? me.pos : 1));
    setText('#raceFilled', filled + '/81');
    setText('#raceTime', rc && rc.reconnecting ? 'Reconectando…' : fmt(G.secs));
    const f = $('#raceBarFill'); if (f) f.style.width = (filled / 81 * 100) + '%';
    bar.classList.toggle('elim', !!(G.lost && !G.won));
    const tb = $('#raceTableBtn'); if (tb) { tb.textContent = 'Tabla (' + rows.length + ')'; tb.setAttribute('aria-expanded', G.race.tableOpen ? 'true' : 'false'); }
    const q = $('#raceQuit'); if (q) q.hidden = !!G.race.over;
    const tbl = $('#raceTable'); if (!tbl) return;
    tbl.hidden = !G.race.tableOpen;
    if (!G.race.tableOpen) return;
    tbl.textContent = '';
    rows.forEach(r => {
      const li = mk('li', 'rt-row' + (r.id === G.race.me ? ' you' : '') + (r.eliminated || r.left ? ' out' : ''));
      li.appendChild(mk('span', 'rt-pos', '#' + r.pos));
      const nm = mk('span', 'rt-name', r.id === G.race.me ? 'Vos' : r.alias);
      if (r.host) nm.appendChild(mk('em', 'rl-tag', 'Anfitrión'));
      li.appendChild(nm);
      li.appendChild(mk('span', 'rt-st', raceStatus(r) + (r.mistakes ? ' · ' + r.mistakes + ' err' : '')));
      tbl.appendChild(li);
    });
  }

  /* ----- Podio final ----- */
  function raceShowPodium() {
    const rows = G.race.rows || [], me = rows.find(r => r.id === G.race.me);
    const iWon = !!me && G.race.winnerId === me.id;
    setResIcon('#podIcon', iWon ? 'trophy' : null);
    setText('#podTitle', G.race.winnerId < 0 ? 'Carrera terminada' : (iWon ? '¡Ganaste la carrera!' : (me ? 'Terminaste ' + me.pos + '.º' : 'Carrera terminada')));
    setText('#podTxt', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • ' + rows.length + ' jugadores');
    const ol = $('#podList'); if (ol) {
      ol.textContent = '';
      rows.forEach(r => {
        const li = mk('li', 'pod-row' + (r.pos <= 3 && G.race.winnerId >= 0 ? ' p' + r.pos : '') + (r.id === G.race.me ? ' you' : '') + (r.eliminated || r.left ? ' out' : ''));
        li.appendChild(mk('span', 'pod-pos', r.pos + '.º'));
        const nm = mk('span', 'pod-name', r.id === G.race.me ? 'Vos' : r.alias);
        if (r.host) nm.appendChild(mk('em', 'rl-tag', 'Anfitrión'));
        li.appendChild(nm);
        li.appendChild(mk('span', 'pod-st', raceStatus(r) + (r.mistakes ? ' · ' + r.mistakes + ' err' : '')));
        ol.appendChild(li);
      });
    }
    G.race.tableOpen = false;
    sel = -1; hideHint(); render(); persist();
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mRacePodium') m.hidden = true; });
    hideRaceAlert();
    const m = $('#mRacePodium'); if (m) m.hidden = false;
  }

  /* ===========================================================================
   * Co-op: resolver juntos (2 jugadores, mismo tablero, P2P con PeerJS)
   * ---------------------------------------------------------------------------
   *  - El Host es la fuente de verdad: valida cada jugada (la suya y la del Invitado), la aplica y difunde el resultado.
   *  - El Invitado pinta su jugada al instante (optimista) y se corrige con lo que diga el Host.
   *  - `G.owners[81]`: 0 = pista inicial / vacía, 1 = Host, 2 = Invitado (color de cada dígito).
   *  - El reloj es el del Host (corre solo con el Invitado conectado) y se difunde cada segundo: la pausa también se sincroniza.
   *  - Las 3 vidas y las 3 pistas son compartidas: las descuenta el Host y se sincronizan con `cells`/`clock`/`state`;
   *    al quedarse sin vidas el Host difunde `lost`.
   * ========================================================================= */
  let coopMode = 'classic', coopDiff = 'medio';

  // Estado de ejecución de la sala (no se guarda en G).
  function newCoop(role, alias) {
    return {
      role: role, me: role === 'host' ? 1 : 2, myAlias: alias, session: null, code: '',
      friendAlias: '', friendFocus: -1, sentFocus: -2,
      opId: 0, seq: 0, hist: [], joining: role === 'guest', hasState: false
    };
  }

  const coopOk = () => !!(C && C.available());

  function setCoopSel() {
    document.querySelectorAll('#coopModes [data-cmode]').forEach(b => {
      const on_ = b.dataset.cmode === coopMode;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
    document.querySelectorAll('#coopDiffs [data-cdiff]').forEach(b => {
      const on_ = b.dataset.cdiff === coopDiff;
      b.classList.toggle('on', on_); b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
  }

  function openCoop() {
    if (!coopOk()) { toast('Falta peerjs.min.js: el modo Co-op no está disponible.'); return; }
    coopMode = selMode;
    setCoopSel();
    const w = $('#coopWarn'); if (w) w.hidden = !hasProgress();
    const m = $('#mCoop'); if (m) m.hidden = false;
  }

  // Cierra la sala (avisa al compañero) y deja la partida como partida normal.
  function leaveCoop() {
    if (rc) leaveRace();
    const rt = co;
    co = null;
    if (G) G.coop = false;
    if (G && G.lv) G.lv.over = true;   // duelo en vivo: la tarjeta deja de ser interactiva (el cierre avisa al rival con 'bye')
    if (rt && rt.session) { try { rt.session.close(); } catch (e) { /* ignorar */ } }
  }

  /* ---------- Co-op: modales propios (reemplazan confirm/alert) ---------- */
  // `sticky` = decisión obligatoria: no se cierra con el fondo ni con Escape.
  let askCb = null, askSticky = false;
  function coopAsk(o) {
    setText('#coopAskTitle', o.title);
    const t = $('#coopAskTxt'); if (t) { t.textContent = o.text || ''; t.hidden = !o.text; }
    setText('#coopAskYes', o.yes); setText('#coopAskNo', o.no);
    const nb = $('#coopAskNo'); if (nb) nb.hidden = !!o.single;
    askCb = { yes: o.onYes, no: o.onNo }; askSticky = !!o.sticky;
    const m = $('#mCoopAsk'); if (m) m.hidden = false;
  }
  function coopAskAnswer(k) {
    const cb = askCb; askCb = null; askSticky = false;
    const m = $('#mCoopAsk'); if (m) m.hidden = true;
    if (cb && cb[k]) cb[k]();
  }

  // Convierte la sala en una partida individual: se conservan celdas, notas, errores y tiempo, y el reloj local retoma solo.
  function coopGoSolo(msg) {
    const rt = co;
    co = null;
    if (G) { G.coop = false; G.hintsUsed = Math.max(G.hintsUsed | 0, G.hints | 0); }
    if (rt && rt.session) { try { rt.session.close(); } catch (e) { /* ignorar */ } }
    persist(); render(); updateHome();
    toast(msg);
  }

  // Host: termina la partida para los dos. Invitado: solo sale de la sala (el Host decide qué hacer). Ambos piden confirmación.
  function coopEndOrLeave() {
    if (!inCoop()) return;
    if (co.role === 'host') {
      coopAsk({
        title: '¿Terminar la partida cooperativa?', yes: 'Sí, terminar', no: 'Cancelar',
        onYes: () => {
          if (!inCoop() || co.role !== 'host') return;
          const rt = co;
          co = null;
          if (G) G.coop = false;
          rt.session.endGame();   // envía coop-end, espera 150 ms y cierra
          goHome(); updateHome();
          toast('Partida terminada.');
        }
      });
    } else {
      coopAsk({
        title: '¿Salir de la sala?', yes: 'Sí, salir', no: 'Cancelar',
        onYes: () => {
          if (!inCoop() || co.role !== 'guest') return;
          const rt = co;
          co = null;
          if (G) G.coop = false;
          rt.session.leaveRoom(); // envía coop-leave, espera 150 ms y cierra
          goHome(); updateHome();
          toast('Saliste de la sala.');
        }
      });
    }
  }

  // Host: el invitado salió a propósito (coop-leave). El reloj queda pausado (solo corre con el invitado conectado).
  function onGuestLeft(rt) {
    const name = rt.friendAlias || 'Tu compañero';
    rt.guestLeft = true; rt.friendFocus = -1;
    closeModals(); render();
    coopAsk({
      title: name + ' salió de la sala', yes: 'Esperar a que se reconecte ' + name, no: 'Seguir jugando solo', sticky: true,
      onYes: () => { if (co === rt) { updateCoopBar(); render(); } }, // la sala sigue abierta con el mismo enlace
      onNo: () => { if (co === rt) coopGoSolo('Seguís solo con tu tablero.'); }
    });
  }

  // La sala terminó (error, el anfitrión se fue, etc.): la partida sigue sola con lo que ya tiene.
  function endCoop(info) {
    co = null;
    if (G) { G.coop = false; G.hintsUsed = Math.max(G.hintsUsed | 0, G.hints | 0); }
    persist(); render(); updateHome();
    toast(info.reason === 'host-left' ? 'El anfitrión cerró la sala. Seguís solo.' : C.statusText(info) + ' Seguís solo.');
  }

  // Configura G como partida cooperativa nueva a partir de un tablero recién generado (Host).
  function setCoopGame(g, mode, diff, seed) {
    const killer = mode === 'killer', puzzle = killer ? g.board : g.puzzle;
    G = {
      mode: mode, variant: mode, puzzle: puzzle, solution: g.solution, board: E.cloneBoard(puzzle),
      notes: emptyNotes(), diff: g.difficulty, req: diff, seed: seed, hist: [], secs: 0, won: false, lost: false, counted: true,
      rec: null, coop: true, owners: C.emptyOwners(), hints: 0,
      maxLives: FRIEND_LIVES, lives: FRIEND_LIVES, hintsMax: HINTS_COOP, hintsUsed: 0
    };
    if (killer) G.cages = g.cages;
    if (mode === 'jigsaw') G.regions = g.regions;
    prepareGame();
    sel = -1; pencil = false; activeDigit = null; hideHint();
    ghostSeen = 0; flash.fill(0); lastHintKey = '';
  }

  /* ----- Host: crear la sala ----- */
  function startCoopHost(mode, diff) {
    if (!coopOk()) { toast('Falta peerjs.min.js: el modo Co-op no está disponible.'); return; }
    const alias = C.getAlias();
    if (!alias) { askAlias(() => startCoopHost(mode, diff), COOP_ALIAS); return; }
    if (busy) return;
    mode = validMode(mode);
    busy = true; closeModals();
    showLoad('Generando tablero…', false);
    const seed = toSeed();
    let ok = false;
    genPuzzle(diff, mode, seed, false).then(g => {
      if (co || rc) leaveCoop();
      setCoopGame(g, mode, diff, seed);
      co = newCoop('host', alias);
      ok = true;
    }).catch(() => { /* conserva la partida actual */ }).then(() => {
      busy = false;
      hideLoad();
      if (!ok) { toast('No se pudo crear la sala.'); updateHome(); return; }
      startHostSession();
      persist(); setPlayOpen(false); showView('game'); render();
    });
  }

  function startHostSession() {
    const rt = co;
    const s = C.createHost({ alias: rt.myAlias, kind: rt.kind });
    rt.session = s; rt.code = s.code;
    s.on('status', info => onCoopStatus(rt, info));
    s.on('ready', () => { if (co === rt) { updateCoopBar(); shareCoopLink(); } });
    s.on('message', m => onHostMessage(rt, m));
    s.start();
  }

  // Comparte (o copia) el enlace de la sala.
  function shareCoopLink() {
    if (!co || !co.session || co.role !== 'host' || (!inCoop() && co.kind !== 'duel')) return;
    co.session.share({
      text: co.myAlias + (co.kind === 'duel' ? ' te desafía a un duelo 1v1 en vivo (' : ' te invita a resolver un Sudoku juntos (') + MODE_NAMES[G.mode] + ' • ' + NAMES[G.req] +
        '). Abrí el enlace y entrás a la sala.'
    }).then(res => {
      if (res === 'copied') toast('Enlace copiado: pegáselo a tu amigo');
      else if (res === 'failed') {
        try { window.prompt('Copiá este enlace:', co ? co.session.link() : ''); } catch (e) { toast('No se pudo compartir el enlace.'); }
      }
    });
  }

  // Estado completo hacia el Invitado (alta, reconexión o tablero nuevo).
  function sendState(fresh) {
    if (!inCoop() || co.role !== 'host') return false;
    return co.session.send(C.buildState({
      alias: co.myAlias, mode: G.mode, diff: G.diff, req: G.req, seed: G.seed,
      puzzle: G.puzzle, solution: G.solution, cages: G.cages, regions: G.regions, board: G.board, notes: G.notes, owners: G.owners,
      secs: G.secs, hints: G.hints | 0, lives: G.lives, won: G.won, fresh: !!fresh
    }));
  }

  /* ----- Estado de la conexión (ambos roles) ----- */
  function onCoopStatus(rt, info) {
    if (co !== rt) return;
    if (rt.joining) { // el Invitado todavía no recibió el tablero
      if (info.state === 'error' || info.state === 'closed') {
        co = null;
        if (info.state === 'error' && rt.code) { // falló tras todos los intentos: se ofrece reintentar a mano
          showLoad(C.statusText(info), true);
          const rb = $('#loadRetry'); if (rb) { rb.hidden = false; rb.dataset.code = rt.code; }
        } else {
          hideLoad();
          toast(C.statusText(info));
        }
        updateHome();
      } else {
        setText('#loadTxt', info.state === 'reconnecting' ? 'Reconectando…' : C.statusText(info));
      }
      return;
    }
    if (rt.kind === 'duel') { onLiveStatus(rt, info); return; }
    if (rt.ended) return;   // el invitado está eligiendo en el diálogo de cierre
    if (info.state === 'error' || info.state === 'closed') {
      if (info.reason !== 'local') endCoop(info);
      return;
    }
    if (info.state !== 'connected') rt.friendFocus = -1;
    rt.sentFocus = -2;       // al reconectar se vuelve a informar la celda activa
    render();
  }

  /* ----- Arbitraje: el Host aplica las jugadas ----- */
  // Aplica una jugada al tablero compartido. `who` = 1 Host, 2 Invitado. `track` = guardar en el historial (solo el Host).
  // Devuelve { touched: índices modificados, rej: la jugada se rechazó y `touched` lleva el estado vigente de esa celda,
  //            lost: la jugada era un dígito erróneo y el Host descontó una vida compartida }.
  function coopApply(who, op, track) {
    if (op.kind === 'undo') return (G.won || G.lost) ? { touched: [], rej: false } : coopUndo(who);
    const touched = new Map(); // índice -> [valor, notas, dueño] antes del cambio
    const snap = j => {
      if (!touched.has(j)) { const rr = Math.floor(j / 9), cc = j % 9; touched.set(j, [G.board[rr][cc], G.notes[rr][cc].slice(), G.owners[j]]); }
    };
    const i = op.index, r = Math.floor(i / 9), c = i % 9;
    const blocked = { touched: [i], rej: true };
    if (G.won || G.lost || G.puzzle[r][c]) return blocked;
    let lifeLost = false;

    if (op.kind === 'set') {
      if (G.board[r][c] !== op.expect) return blocked;          // alguien cambió la celda antes: prevalece lo ya validado
      if (G.board[r][c] === op.value) return { touched: [], rej: false }; // volver a tocar el mismo dígito no cuesta vida
      const v = op.value;
      snap(i);
      G.board[r][c] = v; G.notes[r][c] = []; G.owners[i] = who;
      // Solo el Host descuenta vidas (el Invitado se corrige con `cells.lives`).
      if (co && co.role === 'host' && v !== G.solution[r][c]) { G.lives = Math.max(0, G.lives - 1); lifeLost = true; }
      noteClears(i, v).forEach(p => { // auto-limpieza de notas en las celdas relacionadas
        const j = p[0], rr = Math.floor(j / 9), cc = j % 9, k = G.notes[rr][cc].indexOf(p[1]);
        if (k >= 0) { snap(j); G.notes[rr][cc].splice(k, 1); }
      });
    } else if (op.kind === 'note') {
      if (G.board[r][c]) return blocked;
      snap(i);
      const a = G.notes[r][c], k = a.indexOf(op.value);
      if (k < 0) { a.push(op.value); a.sort((x, y) => x - y); } else a.splice(k, 1);
    } else if (op.kind === 'erase') {
      if (G.board[r][c] !== op.expect) return blocked;
      if (!G.board[r][c] && !G.notes[r][c].length) return { touched: [], rej: false };
      snap(i);
      G.board[r][c] = 0; G.notes[r][c] = []; G.owners[i] = 0;
    } else {
      return { touched: [], rej: false };
    }

    const idx = Array.from(touched.keys());
    if (track && co) {
      co.hist.push({
        by: who,
        cells: idx.map(k => {
          const s = touched.get(k), rr = Math.floor(k / 9), cc = k % 9;
          return [k, s[0], s[1], s[2], G.board[rr][cc], G.notes[rr][cc].slice(), G.owners[k]];
        })
      });
      if (co.hist.length > COOP_HIST_MAX) co.hist.shift();
    }
    return { touched: idx, rej: false, lost: lifeLost };
  }

  // Deshace la última jugada de `who`. Las celdas que alguien cambió después de esa jugada no se tocan.
  // (Las vidas perdidas no se recuperan al deshacer.)
  function coopUndo(who) {
    for (let h = co.hist.length - 1; h >= 0; h--) {
      if (co.hist[h].by !== who) continue;
      const e = co.hist.splice(h, 1)[0], touched = [];
      e.cells.forEach(cl => {
        const k = cl[0], r = Math.floor(k / 9), c = k % 9;
        if (G.puzzle[r][c]) return;
        const same = G.board[r][c] === cl[4] && G.owners[k] === cl[6] && G.notes[r][c].join() === cl[5].join();
        if (!same) return;
        G.board[r][c] = cl[1]; G.notes[r][c] = cl[2].slice(); G.owners[k] = cl[1] ? cl[3] : 0;
        touched.push(k);
      });
      return { touched: touched, rej: false };
    }
    return { touched: [], rej: false };
  }

  // Difunde al Invitado las celdas que cambiaron (o el estado vigente si rechazó su jugada), junto con vidas y pistas.
  function coopBroadcast(res, who, ack) {
    if (!res.touched.length && !res.rej) return;
    const changes = res.touched.map(i => C.makeChange(i, G.board, G.notes, G.owners));
    co.session.send({
      type: 'cells', seq: ++co.seq, by: who, ack: ack || 0, rej: !!res.rej,
      changes: changes, hints: G.hints | 0, secs: G.secs, lives: G.lives
    });
  }

  // Cierre común de una jugada en el Host: difundir, detectar la victoria o la derrota, repintar y guardar.
  function coopAfter(res, who, ack) {
    coopBroadcast(res, who, ack);
    if (who === co.me) hideHint();
    else if (hint && res.touched.indexOf(hint.row * 9 + hint.col) >= 0) hideHint();
    if (res.lost) {
      pulseLives();
      if (G.lives > 0) {
        toast((who === co.me ? 'Te equivocaste' : (co.friendAlias || 'Tu amigo') + ' se equivocó') +
          ' · ' + (G.lives === 1 ? 'queda 1 vida' : 'quedan ' + G.lives + ' vidas'));
      }
    }
    if (!G.won && res.touched.length && !res.rej && isSolvedNow()) {
      G.won = true; sel = -1;
      const counts = C.countByOwner(G.owners, G.board, G.puzzle, G.solution);
      co.session.send({ type: 'won', secs: G.secs, hints: G.hints | 0, counts: counts });
      sfx('win');
      render(); persist();
      showCoopWin(counts);
      return;
    }
    if (!G.won && !G.lost && G.lives <= 0) {
      G.lost = true; sel = -1;
      co.session.send({ type: 'lost', secs: G.secs, hints: G.hints | 0 });
      sfx('lose');
      render(); persist();
      showLose();
      return;
    }
    render(); persist();
  }

  // Jugada del jugador local (set / note / erase) sobre la celda `i`.
  function coopDo(kind, i, value) {
    const r = Math.floor(i / 9), c = i % 9;
    const op = { type: 'op', kind: kind, index: i, value: value || 0, expect: G.board[r][c], hint: false };
    if (co.role === 'host') {
      coopAfter(coopApply(1, op, true), 1, 0);
      return;
    }
    if (!co.session.isConnected()) { toast('Sin conexión con tu amigo. Reconectando…'); return; }
    op.id = ++co.opId;
    coopApply(2, op, false);   // pinta al instante; el Host confirma o corrige con `cells` (y descuenta la vida)
    co.session.send(op);
    hideHint(); render(); persist();
  }

  // Mensajes que llegan al Host desde el Invitado.
  function onHostMessage(rt, m) {
    if (co !== rt || !G) return;
    if (rt.kind === 'duel') { onLiveMessage(rt, m); return; }
    if (!G.coop) return;
    switch (m.type) {
      case 'hello':
        rt.friendAlias = m.alias; rt.friendFocus = -1; rt.sentFocus = -2;
        if (rt.guestLeft && askSticky) { askCb = null; askSticky = false; const am = $('#mCoopAsk'); if (am) am.hidden = true; }
        rt.guestLeft = false;   // volvió: el reloj retoma y recibe el tablero completo
        sendState(false);
        syncFocus();
        toast(m.alias + (m.resume ? ' volvió a la sala' : ' se unió a la sala'));
        render();
        if (G.lost) showLose();
        break;
      case 'focus':
        rt.friendFocus = m.index; render();
        break;
      case 'coop-mistake-alert':
        showErrExplain(m.playerName + ': ' + m.reason);
        break;
      case 'op':
        coopAfter(coopApply(2, m, m.kind !== 'undo'), 2, m.id);
        break;
      case 'hint':
        if ((G.hints | 0) < G.hintsMax) G.hints = (G.hints | 0) + 1; // tope de pistas compartidas
        rt.session.send({ type: 'clock', secs: G.secs, hints: G.hints });
        render(); persist();
        break;
      case 'again':
        if (G.won) coopNewGame();
        else if (G.lost) coopRetry();
        break;
      case 'coop-leave':
        onGuestLeft(rt);
        break;
      case 'bye':
        rt.friendFocus = -1;
        if (!rt.guestLeft) toast((rt.friendAlias || 'Tu compañero') + ' se desconectó de la sala');
        render();
        break;
      default:
        break;
    }
  }

  /* ----- Invitado: conectarse a una sala ----- */
  function joinCoop(code) {
    if (!coopOk()) { toast('Falta peerjs.min.js: el modo Co-op no está disponible.'); return; }
    if (busy) { toast('Esperá un momento…'); return; }
    const alias = C.getAlias();
    if (!alias) { askAlias(() => joinCoop(code), COOP_ALIAS); return; }
    if (co || rc) leaveCoop();
    const rt = newCoop('guest', alias);
    rt.code = code;
    let s;
    try { s = C.join(code, { alias: alias }); } catch (e) { toast('El código de sala no es válido.'); return; }
    rt.session = s;
    co = rt;
    closeModals();
    showLoad('Conectando con la sala…', true);
    s.on('status', info => onCoopStatus(rt, info));
    s.on('message', m => onGuestMessage(rt, m));
    s.start();
  }

  function cancelJoin() {
    if (rc && rc.role === 'guest' && !rc.started) { leaveRace(); hideLoad(); updateHome(); return; }
    if (co && co.joining) {
      const s = co.session;
      co = null;
      try { s.close(); } catch (e) { /* ignorar */ }
    }
    hideLoad();
    updateHome();
  }

  // Estado completo recibido del Host: reemplaza la partida local.
  function applyCoopState(rt, m) {
    const first = !rt.hasState;
    G = {
      mode: m.mode, variant: m.mode, puzzle: m.puzzle, solution: m.solution, board: E.cloneBoard(m.board),
      notes: m.notes, diff: m.diff, req: m.req, seed: m.seed, hist: [], secs: m.secs, won: m.won,
      lost: !m.won && m.lives <= 0, counted: true,
      rec: null, coop: true, owners: m.owners, hints: m.hints,
      maxLives: FRIEND_LIVES, lives: m.lives, hintsMax: HINTS_COOP, hintsUsed: 0
    };
    if (m.mode === 'killer') G.cages = m.cages;
    if (m.mode === 'jigsaw') G.regions = m.regions;
    prepareGame();
    rt.hasState = true; rt.joining = false; rt.friendAlias = m.alias;
    rt.friendFocus = -1; rt.sentFocus = -2;
    if (first || m.fresh) { sel = -1; pencil = false; activeDigit = null; hideHint(); lastHintKey = ''; }
    ghostSeen = 0; flash.fill(0);
    hideLoad();
    if (first || m.fresh) closeModals();
    persist();
    showView('game');
    render();
    if (m.won && first) showCoopWin();
    else if (G.lost && first) showLose();
  }

  // Mensajes que llegan al Invitado desde el Host.
  function onGuestMessage(rt, m) {
    if (co !== rt) return;
    if (m.type === 'state') { if (m.duel) applyLiveState(rt, m); else applyCoopState(rt, m); return; }
    if (rt.kind === 'duel') { onLiveMessage(rt, m); return; }
    if (m.type === 'coop-end') { // el Host terminó la partida: el invitado decide (el reloj ya está frenado: depende del Host)
      rt.ended = true; rt.friendFocus = -1;
      closeModals(); hideHint(); hideErrExplain(); render();
      coopAsk({
        title: 'El anfitrión se ha salido. ¿Querés continuar?', yes: 'Sí', no: 'No', sticky: true,
        onYes: () => { if (co === rt) coopGoSolo('Seguís solo con tu tablero.'); },
        onNo: () => { if (co === rt) { leaveCoop(); goHome(); updateHome(); } }
      });
      return;
    }
    if (!rt.hasState || !G || !G.coop) return;
    switch (m.type) {
      case 'cells': {
        const touched = C.applyChanges(G.board, G.notes, G.owners, G.puzzle, m.changes);
        if (m.hints !== undefined) G.hints = m.hints;
        if (m.secs !== undefined) G.secs = m.secs;
        if (m.lives !== undefined) {
          const before = G.lives;
          G.lives = m.lives;
          if (m.lives < before) {
            pulseLives();
            if (m.lives > 0) {
              toast((m.by === rt.me ? 'Te equivocaste' : (rt.friendAlias || 'Tu amigo') + ' se equivocó') +
                ' · ' + (m.lives === 1 ? 'queda 1 vida' : 'quedan ' + m.lives + ' vidas'));
            }
          }
        }
        if (hint && touched.indexOf(hint.row * 9 + hint.col) >= 0) hideHint();
        if (m.rej) toast('Tu amigo se adelantó en esa celda');
        render(); persist();
        break;
      }
      case 'clock':
        G.secs = m.secs; G.hints = m.hints;
        setText('#clock', fmt(G.secs));
        render();
        if (G.secs % 10 === 0) persist();
        break;
      case 'focus':
        rt.friendFocus = m.index; render();
        break;
      case 'coop-mistake-alert':
        showErrExplain(m.playerName + ': ' + m.reason);
        break;
      case 'won':
        G.won = true; sel = -1; G.secs = m.secs; G.hints = m.hints;
        render(); persist();
        showCoopWin(m.counts);
        break;
      case 'lost':
        G.lost = true; G.lives = 0; sel = -1; G.secs = m.secs; G.hints = m.hints;
        hideHint(); render(); persist();
        showLose();
        break;
      default:
        break;
    }
  }

  /* ----- Victoria compartida y "Jugar otro juntos" ----- */
  function showCoopWin(counts) {
    setResIcon('#winIcon', null);
    setText('#winNew', 'Nueva partida');
    if (!inCoop()) { return; }
    counts = counts || C.countByOwner(G.owners, G.board, G.puzzle, G.solution);
    const box = $('#coopResult'), note = $('#winNote'), dr = $('#duelResult');
    setText('#winTitle', '¡Lo resolvieron juntos!');
    setText('#winTxt', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • Tiempo en equipo: ' + fmt(G.secs));
    if (dr) { dr.textContent = ''; dr.hidden = true; }
    if (box) {
      box.textContent = '';
      const total = (counts[0] + counts[1]) || 1;
      [1, 2].forEach(p => {
        const row = mk('div', 'cr-row'), nm = mk('div', 'cr-name');
        nm.appendChild(mk('i', 'pdot p' + (p === co.me ? 1 : 2)));
        nm.appendChild(mk('span', '', p === co.me ? 'Vos' : (co.friendAlias || 'Amigo')));
        row.appendChild(nm);
        row.appendChild(mk('b', '', counts[p - 1] + (counts[p - 1] === 1 ? ' celda' : ' celdas')));
        box.appendChild(row);
      });
      const bar = mk('div', 'cr-bar');
      [1, 2].forEach(p => {
        const seg = mk('i', 'p' + (p === co.me ? 1 : 2));
        seg.style.width = (counts[p - 1] / total * 100) + '%';
        bar.appendChild(seg);
      });
      box.appendChild(bar);
      const hs = G.hints | 0;
      if (hs) box.appendChild(mk('p', 'cr-note', 'Pistas usadas: ' + hs + ' de ' + G.hintsMax));
      if (G.lives < G.maxLives) box.appendChild(mk('p', 'cr-note', 'Vidas restantes: ' + G.lives + ' de ' + G.maxLives));
      box.hidden = false;
    }
    if (note) {
      note.textContent = co.role === 'host' ? '' : 'Podés pedir otro tablero: lo genera el anfitrión.';
      note.hidden = co.role === 'host';
    }
    const bc = $('#winChallenge'); if (bc) bc.hidden = true;
    const br = $('#winRematch'); if (br) br.hidden = true;
    const ba = $('#winCoopAgain'); if (ba) ba.hidden = false;
    const m = $('#mWin'); if (m) m.hidden = false;
  }

  // "Jugar otro juntos": el Host genera un tablero nuevo del mismo modo y dificultad en la misma sala.
  function coopAgain() {
    if (!inCoop()) return;
    if (co.role === 'host') { coopNewGame(); return; }
    if (!co.session.isConnected()) { toast('Sin conexión con tu amigo. Reconectando…'); return; }
    co.session.send({ type: 'again' });
    toast('Pidiendo un tablero nuevo al anfitrión…');
  }

  function coopNewGame() {
    if (busy || !inCoop() || co.role !== 'host') return;
    const rt = co, mode = G.mode, diff = G.req, seed = toSeed();
    busy = true; closeModals();
    showLoad('Generando tablero…', false);
    let ok = false;
    genPuzzle(diff, mode, seed, false).then(g => {
      if (co !== rt) return;
      setCoopGame(g, mode, diff, seed);
      rt.hist = []; rt.friendFocus = -1; rt.sentFocus = -2;
      ok = true;
    }).catch(() => { /* ignorar */ }).then(() => {
      busy = false;
      hideLoad();
      if (!ok) { toast('No se pudo generar otro tablero.'); return; }
      sendState(true);
      persist(); showView('game'); render();
      toast('¡Nuevo tablero!');
    });
  }

  // Reintentar el MISMO tablero tras quedarse sin vidas compartidas (lo ejecuta el Host; el Invitado lo pide con `again`).
  function coopRetry() {
    if (!inCoop() || co.role !== 'host' || !G.lost) return;
    G.board = E.cloneBoard(G.puzzle); G.notes = emptyNotes(); G.owners = C.emptyOwners();
    G.secs = 0; G.hints = 0; G.lives = G.maxLives; G.won = false; G.lost = false;
    co.hist = []; co.friendFocus = -1; co.sentFocus = -2;
    sel = -1; pencil = false; activeDigit = null; hideHint(); lastHintKey = '';
    closeModals();
    sendState(true);
    persist(); render();
    toast('¡Otro intento con el mismo tablero!');
  }

  // Lee #coop=XXXX (al cargar y en hashchange): sin partida en curso se conecta solo; con partida, pide confirmar.
  function checkCoopHash() {
    if (!C || busy) return;
    const r = C.readLocationHash();
    if (!r) return;
    C.clearHash();
    if (!r.ok) { toast('El enlace de sala no es válido.'); return; }
    if (r.kind === 'race') {            // carrera grupal: ruta propia
      if (!raceOk()) { toast('Falta peerjs.min.js: la carrera grupal no está disponible.'); return; }
      if (rc && rc.code === r.code) { toast(rc.role === 'host' ? 'Esa es tu propia sala: mandale el enlace a tus amigos.' : 'Ya estás en esa sala.'); return; }
      joinRace(r.code);                 // la carrera no pisa la partida individual guardada: se entra directo
      return;
    }
    if (!coopOk()) { toast('Falta peerjs.min.js: el modo Co-op no está disponible.'); return; }
    if (co && co.code === r.code) {
      if (co.role === 'host') toast('Esa es tu propia sala: mandale el enlace a tu amigo.');
      else if (G && G.coop) { showView('game'); render(); }
      return;
    }
    if (hasProgress() && r.kind !== 'duel') {   // el duelo en vivo no pisa la partida individual: no hace falta confirmar
      pendingCoop = r.code; pendingCoopKind = r.kind;
      setText('#coopJoinKind', r.kind === 'duel' ? 'Te desafiaron a un duelo 1v1 en vivo' : 'Te invitaron a resolver un Sudoku en equipo');
      setText('#coopJoinCode', r.code);
      const w = $('#coopJoinWarn'); if (w) w.hidden = false;
      document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mCoopJoin') m.hidden = true; });
      const m = $('#mCoopJoin'); if (m) m.hidden = false;
    } else {
      joinCoop(r.code);
    }
  }

  /* ---------- Ajustes y modales ---------- */
  function closeModals() {
    const inv = $('#mDuel');
    if (inv && !inv.hidden && pendingDuel) { pendingDuel = null; if (D) D.clearHash(); } // invitación descartada
    const cj = $('#mCoopJoin');
    if (cj && !cj.hidden) pendingCoop = null;                                              // invitación Co-op descartada
    aliasCb = null;
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad' && m.id !== 'mLiveWait' && m.id !== 'mRaceLobby' && m.id !== 'mUpdate' && !(m.id === 'mCoopAsk' && askSticky)) m.hidden = true; });
  }
  const modalOpen = () => !!document.querySelector('.modal:not([hidden])');
  const openSettings = () => { const m = $('#mSet'); if (m) m.hidden = false; };

  function applyTheme() {
    document.documentElement.dataset.theme = set.theme;
    document.documentElement.classList.toggle('big-nums', !!set.bigNums);
    try { render(); } catch (e) { /* aún sin partida */ }
    $('meta[name="theme-color"]')?.setAttribute('content', THEMES[set.theme] || THEMES.paper);
    document.querySelectorAll('[data-theme-set]').forEach(b => {
      const on_ = b.dataset.themeSet === set.theme;
      b.classList.toggle('on', on_);
      b.setAttribute('aria-checked', on_ ? 'true' : 'false');
    });
    const os = $('#optSound'); if (os) os.checked = !!(window.Sound && window.Sound.enabled());
    const oz = $('#optZen'); if (oz) oz.checked = !!set.zen;
    const oe = $('#optErr'); if (oe) oe.checked = set.showErrors;
    const ov = $('#optHaptic'); if (ov) ov.checked = set.haptic;
    const obn = $('#optBigNums'); if (obn) obn.checked = !!set.bigNums;
  }


  /* ---------- Respaldo de progreso (exportar / importar) ---------- */
  // Todas las claves de GridLab empiezan con "sudoku" (partida, ajustes, estadísticas, Diario, tutorial, alias, historial...).
  const BK_APP = 'gridlab-backup', BK_RE = /^sudoku[._]/;
  function exportBackup() {
    const data = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (BK_RE.test(k)) data[k] = window.localStorage.getItem(k);
      }
    } catch (e) { /* almacenamiento restringido: se usa la copia en memoria */ }
    Object.keys(store.mem).forEach(k => { if (BK_RE.test(k) && !(k in data)) data[k] = store.mem[k]; });
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
    const blob = new Blob([JSON.stringify({ app: BK_APP, version: 1, exported: d.toISOString(), data: data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'gridlab-backup-' + stamp + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Progreso exportado (' + Object.keys(data).length + ' elementos)');
  }
  function importBackup(file) {
    if (!file) return;
    if (file.size > 5e6) { toast('Archivo demasiado grande'); return; }
    const fr = new FileReader();
    fr.onerror = () => toast('No se pudo leer el archivo');
    fr.onload = () => {
      let o = null;
      try { o = JSON.parse(String(fr.result)); } catch (e) { /* inválido */ }
      const ok = o && o.app === BK_APP && o.data && typeof o.data === 'object' && !Array.isArray(o.data) &&
        Object.keys(o.data).length > 0 && Object.keys(o.data).every(k => BK_RE.test(k) && typeof o.data[k] === 'string');
      if (!ok) { toast('Ese archivo no es un respaldo de GridLab'); return; }
      const n = Object.keys(o.data).length;
      if (!window.confirm('Se reemplazará tu progreso actual por el del respaldo (' + n + ' elementos). ¿Continuar?')) return;
      Object.keys(o.data).forEach(k => store.set(k, o.data[k]));
      toast('Progreso restaurado ✓');
      setTimeout(() => { try { window.location.reload(); } catch (e) { /* ignorar */ } }, 1100);
    };
    fr.readAsText(file);
  }
  /* ---------- Eventos ---------- */
  function bindEvents() {
    // Inicio
    on('btnContinue', 'click', continueGame);
    on('btnPlay', 'click', () => { sfx('tap'); setHomeScreen('play'); });
    on('btnPlayBack', 'click', () => { sfx('tap'); setHomeScreen('main'); });
    document.querySelectorAll('[data-play-mode]').forEach(b => b.addEventListener('click', () => {
      sfx('tap'); selectMode(b.dataset.playMode); setPlayOpen(true);
    }));
    on('btnFriends', 'click', () => { sfx('tap'); const m = $('#mFriends'); if (m) m.hidden = false; });
    // Duelo y Co-op abren su propia hoja: la de "Jugar con amigos" se cierra (se registra después de openFriend / openCoop).
    on('btnDaily', 'click', openDaily);
    on('btnFriend', 'click', openFriend);
    on('friendGo', 'click', createFriendDuel);
    document.querySelectorAll('#friendModes [data-fmode]').forEach(b => b.addEventListener('click', () => { friendMode = b.dataset.fmode; setFriendSel(); }));
    document.querySelectorAll('#friendDiffs [data-fdiff]').forEach(b => b.addEventListener('click', () => { friendDiff = b.dataset.fdiff; setFriendSel(); }));
    on('duelLive', 'click', () => { if (G && G.duel && G.duel.open && !G.won) shareInvite(); });
    on('dailyPrev', 'click', () => shiftMonth(-1));
    on('dailyNext', 'click', () => shiftMonth(1));
    on('dailyGrid', 'click', e => {
      const b = e.target.closest('.dday');
      if (b && !b.disabled && b.dataset.date) playDay(b.dataset.date);
    });
    on('btnStats', 'click', showStats);
    on('btnTutorial', 'click', openTutorial);
    on('tutorial-view', 'tutorial:exit', closeTutorial);
    on('btnHomeSet', 'click', openSettings);
    document.querySelectorAll('.modes [data-mode]').forEach(b => b.addEventListener('click', () => selectMode(b.dataset.mode)));
    document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => startGame(b.dataset.diff, selMode, { zen: !!set.zen })));
    on('optZen', 'change', e => { set.zen = e.target.checked; saveSet(); });
    document.querySelectorAll('#statsTabs [data-sdiff]').forEach(b => b.addEventListener('click', () => { statsDiff = b.dataset.sdiff; renderStats(); }));
    on('statsHome', 'click', e => {
      const b = e.target.closest('[data-stat]'); if (!b) return;
      sfx('tap');
      if (b.dataset.stat === 'surv' || b.dataset.stat === 'daily') setStatsView(b.dataset.stat); else { statsMode = b.dataset.stat; setStatsView('mode'); }
    });
    document.querySelectorAll('#statsRots [data-srot]').forEach(b => b.addEventListener('click', () => { statsRot = b.dataset.srot; renderStatsSurv(); }));
    on('statsBack', 'click', () => { sfx('tap'); if (statsView === 'home') showView('home'); else setStatsView('home'); });
    on('dailyBack', 'click', () => { sfx('tap'); showView('home'); });

    // Supervivencia (No-Hit) y derrota por vidas
    on('btnSurv', 'click', openSurv);
    document.querySelectorAll('[data-surv]').forEach(b => b.addEventListener('click', () => startSurvival(b.dataset.surv)));
    on('seAgain', 'click', () => { const rot = G && G.surv ? G.surv.rot : null; closeModals(); if (rot) startSurvival(rot); });
    on('seHome', 'click', () => { goHome(); });
    on('loseRetry', 'click', onLoseRetry);
    on('loseHome', 'click', () => { goHome(); });

    // Co-op
    on('btnCoop', 'click', openCoop);
    ['btnFriend', 'btnCoop'].forEach(id => on(id, 'click', () => { const m = $('#mFriends'); if (m) m.hidden = true; }));
    on('coopGo', 'click', () => startCoopHost(coopMode, coopDiff));
    document.querySelectorAll('#coopModes [data-cmode]').forEach(b => b.addEventListener('click', () => { coopMode = b.dataset.cmode; setCoopSel(); }));
    document.querySelectorAll('#coopDiffs [data-cdiff]').forEach(b => b.addEventListener('click', () => { coopDiff = b.dataset.cdiff; setCoopSel(); }));
    on('coopShare', 'click', shareCoopLink);
    on('coopEnd', 'click', coopEndOrLeave);
    // Carrera grupal
    on('btnRace', 'click', () => { const m = $('#mFriends'); if (m) m.hidden = true; openRace(); });
    on('raceGo', 'click', () => startRaceHost(raceMode, raceDiff));
    document.querySelectorAll('#raceModes [data-rmode]').forEach(b => b.addEventListener('click', () => { raceMode = b.dataset.rmode; setRaceSel(); }));
    document.querySelectorAll('#raceDiffs [data-rdiff]').forEach(b => b.addEventListener('click', () => { raceDiff = b.dataset.rdiff; setRaceSel(); }));
    on('raceCopy', 'click', raceCopyLink);
    on('raceStart', 'click', raceStartNow);
    on('raceLobbyLeave', 'click', raceLobbyLeave);
    on('raceQuit', 'click', raceQuit);
    on('raceAlertClose', 'click', hideRaceAlert);
    on('raceTableBtn', 'click', () => { if (G && G.race) { G.race.tableOpen = !G.race.tableOpen; updateRaceBar(); } });
    on('podHome', 'click', () => { leaveRace(); closeModals(); goHome(); });
    on('podView', 'click', () => { const m = $('#mRacePodium'); if (m) m.hidden = true; });
    // Duelo 1v1 en vivo
    on('btnLive', 'click', () => { const m = $('#mFriends'); if (m) m.hidden = true; openLive(); });
    on('liveGo', 'click', () => startLiveHost(liveMode, liveDiff));
    document.querySelectorAll('#liveModes [data-lmode]').forEach(b => b.addEventListener('click', () => { liveMode = b.dataset.lmode; setLiveSel(); }));
    document.querySelectorAll('#liveDiffs [data-ldiff]').forEach(b => b.addEventListener('click', () => { liveDiff = b.dataset.ldiff; setLiveSel(); }));
    on('liveWaitShare', 'click', shareCoopLink);
    on('liveWaitCancel', 'click', cancelLiveWait);
    on('duelQuit', 'click', liveQuit);
    on('coopSolo', 'click', () => { if (inCoop()) coopGoSolo('Seguís solo con tu tablero.'); });
    on('coopAskYes', 'click', () => coopAskAnswer('yes'));
    on('coopAskNo', 'click', () => coopAskAnswer('no'));
    on('errExplainClose', 'click', hideErrExplain);
    on('winCoopAgain', 'click', coopAgain);
    on('coopJoinGo', 'click', () => { const code = pendingCoop, kind = pendingCoopKind; closeModals(); if (code) { if (kind === 'race') joinRace(code); else joinCoop(code); } });
    on('coopJoinCancel', 'click', closeModals);
    on('loadCancel', 'click', cancelJoin);
    on('loadRetry', 'click', () => { const rb = $('#loadRetry'); const code = rb && rb.dataset.code; hideLoad(); if (code) joinCoop(code); });

    // Juego
    on('board', 'click', e => {
      const t = e.target.closest('.cell');
      if (!t || !G) return;
      const i = +t.dataset.i, r = Math.floor(i / 9), c = i % 9;
      sel = i; hideHint(); hideErrExplain();
      if (!(isDigitFirst() && activeDigit && !isOver() && !G.puzzle[r][c] && !G.board[r][c])) sfx('tap');
      // Número Primero: una celda vacía editable recibe el dígito activo (o su nota, con el lápiz activo).
      // Una celda que ya tiene número no se sobrescribe: solo se selecciona para inspeccionarla.
      if (isDigitFirst() && activeDigit && !isOver() && !G.puzzle[r][c] && !G.board[r][c]) input(activeDigit);
      else render();
    });
    on('keypad', 'click', e => { const b = e.target.closest('button'); if (b && !b.disabled) pressDigit(+b.dataset.n); });
    document.querySelector('.tools')?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const a = b.dataset.act;
      if (a === 'undo') undo(); else if (a === 'rewind') rewind(); else if (a === 'erase') erase();
      else if (a === 'pencil') { pencil = !pencil; triggerHaptic('tap'); render(); } else if (a === 'hint') showHint();
      else if (a === 'inputmode') toggleInputMode();
    });
    on('hintApply', 'click', applyHint);
    on('hintClose', 'click', () => { hideHint(); render(); });
    on('btnHome', 'click', goHome);
    on('btnSet', 'click', openSettings);
    on('btnNews', 'click', openNews);
    on('newsBack', 'click', () => { closeModals(); openSettings(); });
    // Ajustes desde las vistas secundarias: el engranaje se clona del de la partida; el modal se abre encima sin cambiar de vista.
    const gearSrc = document.querySelector('#btnSet .gear');
    document.querySelectorAll('[data-open-settings]').forEach(b => { if (gearSrc && !b.querySelector('svg')) b.appendChild(gearSrc.cloneNode(true)); });
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-open-settings]')) { sfx('tap'); openSettings(); } });
    // Con la partida terminada, tocar el reloj vuelve a abrir el resultado (victoria, derrota o fin de racha).
    ['clock', 'zenTag'].forEach(id => on(id, 'click', () => {
      if (!G || view !== 'game') return;
      if (G.won && !G.surv) showWin(); else if (G.lost) showLose();
    }));
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyResult(b)));
    on('winNew', 'click', () => { if (inCoop() || (co && co.kind === 'duel')) leaveCoop(); closeModals(); goHome(); setHomeScreen('play'); });
    on('winChallenge', 'click', challengeFriend);
    on('winRematch', 'click', rematch);

    // Duelos
    on('duelAccept', 'click', acceptDuel);
    on('duelCancel', 'click', cancelDuel);
    on('aliasOk', 'click', submitAlias);
    on('aliasCancel', 'click', hideAlias);
    on('aliasInput', 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submitAlias(); } });
    window.addEventListener('hashchange', () => { checkDuelHash(); checkCoopHash(); });

    // Modales y ajustes
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
      if (e.target !== m || m.id === 'mLoad' || m.id === 'mSurvNext' || (m.id === 'mCoopAsk' && askSticky) || m.id === 'mLiveWait' || m.id === 'mRaceLobby' || m.id === 'mUpdate') return;
      if (m.id === 'mAlias') hideAlias(); else closeModals();
    }));
    document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
      if (!THEMES[b.dataset.themeSet]) return;
      set.theme = b.dataset.themeSet; saveSet(); applyTheme(); sfx('tap');
    }));
    on('optSound', 'change', e => { if (window.Sound) window.Sound.setEnabled(e.target.checked); });
    on('optErr', 'change', e => { set.showErrors = e.target.checked; saveSet(); render(); });
    on('optHaptic', 'change', e => { set.haptic = e.target.checked; saveSet(); triggerHaptic('tap'); });
    on('optBigNums', 'change', e => { set.bigNums = e.target.checked; saveSet(); applyTheme(); });
    on('btnExport', 'click', () => { sfx('tap'); exportBackup(); });
    on('btnImport', 'click', () => { sfx('tap'); $('#fileImport').click(); });
    on('fileImport', 'change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; importBackup(f); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !modalOpen()) {
        if (view === 'daily') { showView('home'); return; }
        if (view === 'stats') { if (statsView === 'home') showView('home'); else setStatsView('home'); return; }
      }
      if (e.key === 'Escape' && modalOpen()) {
        const al = $('#mAlias');
        if (al && !al.hidden) hideAlias(); else closeModals();
        return;
      }
      if (!G || busy || modalOpen() || view !== 'game') return;
      const tg = e.target, tag = tg && tg.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (tg && tg.isContentEditable)) return;
      const k = e.key, kl = k.length === 1 ? k.toLowerCase() : k;
      if ((e.ctrlKey || e.metaKey) && kl === 'z') { e.preventDefault(); undo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;   // no pisar atajos del navegador (Ctrl+R, Alt+←, ...)
      const dig = /^Numpad[1-9]$/.test(e.code) ? +e.code.slice(6) : (/^[1-9]$/.test(k) ? +k : 0);
      const dir = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r' }[kl];
      if (dig) { e.preventDefault(); pressDigit(dig); }
      else if (k === 'Backspace' || k === 'Delete' || k === '0' || e.code === 'Numpad0') { e.preventDefault(); erase(); }
      else if (kl === 'n' || k === ' ' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) { pencil = !pencil; sfx('tap'); triggerHaptic('tap'); render(); } }
      else if (kl === 'u') { e.preventDefault(); undo(); }
      else if (kl === 'r') { e.preventDefault(); if (!e.repeat) rewind(); }
      else if (kl === 'h') { e.preventDefault(); if (!e.repeat) showHint(); }
      else if (dir) {
        e.preventDefault();
        let r = sel < 0 ? 4 : Math.floor(sel / 9), c = sel < 0 ? 4 : sel % 9;
        if (sel >= 0) {
          if (dir === 'u') r = Math.max(0, r - 1); else if (dir === 'd') r = Math.min(8, r + 1);
          else if (dir === 'l') c = Math.max(0, c - 1); else c = Math.min(8, c + 1);
        }
        sel = r * 9 + c; hideHint(); render();
      }
    });

    // Cronómetro: solo corre en la vista de juego, con la pestaña visible y la partida activa (ni ganada ni perdida).
    // En un duelo también avanza el fantasma: destellos y progreso del rival según el tiempo efectivo.
    // En una sala Co-op manda el reloj del Host: corre mientras el Invitado esté conectado (aunque el Host esté en el inicio),
    // lo difunde cada segundo y el Invitado solo lo muestra (si el Host se pausa, el reloj del Invitado también).
    setInterval(() => {
      if (inRace() && rc.started && !G.won && !G.lost) {
        G.secs = Math.max(0, Math.floor((Date.now() - rc.t0) / 1000));
        if (view === 'game') { setText('#clock', fmt(G.secs)); updateRaceBar(); }
        return;
      }
      if (inLive() && co.started && !G.won && !G.lost) {
        G.secs = Math.max(0, Math.floor((Date.now() - co.t0) / 1000));
        if (view === 'game') { setText('#clock', fmt(G.secs)); updateDuelBar(); }
        return;
      }
      if (!G || busy || G.won || G.lost || document.hidden) return;
      if (inCoop()) {
        if (co.role === 'host' && co.session.isConnected() && !co.guestLeft) {
          G.secs++;
          co.session.send({ type: 'clock', secs: G.secs, hints: G.hints | 0 });
          setText('#clock', fmt(G.secs));
          if (G.secs % 10 === 0) persist();
        }
        return;
      }
      if (view !== 'game') return;
      G.secs++;
      setText('#clock', fmt(showSecs()));
      if (G.duel) { if (advanceGhost()) render(); else updateDuelBar(); }
      if (G.secs % 10 === 0) persist();
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (G) persist(); } else if (view === 'home') updateHome();
    });
    window.addEventListener('pagehide', () => { if (G) persist(); });
  }

  /* ---------- Inicio de la app ---------- */
  /* ===========================================================================
   * Actualizaciones con barra de progreso y "Novedades de la versión"
   * ---------------------------------------------------------------------------
   *  - sw.js descarga la versión nueva archivo por archivo y avisa con SW_UPDATE_PROGRESS {loaded, total, version}; al activarse
   *    manda SW_UPDATE_READY. Si ya había una versión instalada, se abre "ACTUALIZANDO GRIDLAB" (bloquea la pantalla) y, al terminar,
   *    se recarga sola. Dentro de una sala (Co-op, duelo o carrera) NO se recarga para no cortar la partida: queda pendiente
   *    hasta volver al inicio.
   *  - gridlab.lastSeenBuild guarda la última versión ejecutada; si cambió, Ajustes muestra un punto hasta abrir las novedades.
   * ========================================================================= */
  const K_LASTBUILD = 'gridlab.lastSeenBuild', K_NEWS = 'gridlab.newsPending';
  const verLabel = b => 'v' + ((String(b).match(/\d+/) || [String(b)])[0]);
  const CHANGELOG = [
    { v: 'ui-v66', title: 'Pulido final: horizontal, modos y offline', items: [
      'En el Tutorial, las Técnicas y las Estadísticas se puede deslizar desde cualquier parte de la pantalla, también desde los márgenes laterales, y en horizontal la lectura aprovecha más ancho.',
      'Práctica y Entrenamiento en móvil horizontal pasan a dos columnas sin scroll: tablero a la izquierda; Objetivo, herramientas y teclado 3×3 a la derecha.',
      'El selector de modos ya no se corta en pantallas de 360 px, y el modo Notas ya no tiñe el teclado del Tutorial.',
      'Las 71 técnicas quedan garantizadas offline y la descripción de la app menciona los 6 modos.'
    ] },
    { v: 'ui-v65', title: 'Listón en escarapela (Papel)', items: [
      'En el tema Papel, el listón del sello completado se abre en diagonal simétrica como una escarapela y deja libre el centro por donde sale el camino al siguiente capítulo.'
    ] },
    { v: 'ui-v64', title: 'Papel: sello festoneado con listón', items: [
      'En el tema Papel, los capítulos del mapa de Técnicas son un sello circular de borde festoneado con su anillo de progreso. Al completarlos se rellenan de tinta y suman un listón con la marca de verificación.'
    ] },
    { v: 'ui-v63', title: 'Mapa de Técnicas: una silueta por tema', items: [
      'Se quitó la barra de variantes del mapa (ya elegiste la variante antes) y el encabezado queda con aire arriba en todos los temas.',
      'Cada tema dibuja sus nodos con su propia forma: sello vertical con marco de progreso en Papel, círculo luminoso con halo pulsante en Noche, círculo o cuadrado de trazo fino en Minimalista y caja LCD escalonada con barra de batería en Retro.'
    ] },
    { v: 'ui-v62', title: 'Mapa de Técnicas renovado', items: [
      'Cabecera con selector de variante y técnicas dominadas con barra de progreso. Cada capítulo muestra un subtítulo breve y un anillo que refleja el avance real (lecciones completadas / total).',
      'Cuatro estados de nodo (bloqueado, disponible, en curso y completado) con zoom suave al tocar y un destello al volver tras completar una técnica.',
      'Cada tema tiene su propio lenguaje: sello editorial en Papel, anillo luminoso en Noche, trazo fino en Minimalista y segmentos pixelados en Retro.'
    ] },
    { v: 'ui-v61', title: 'Entrenamiento por niveles y pistas más finas', items: [
      'El Entrenamiento ahora se elige por nivel (Fácil, Medio o Difícil). Los ejercicios se sortean al azar y el tablero cambia cada vez (giros, espejos y números), así que no se pueden memorizar.',
      'La pista marca las celdas con un trazo fino y un color propio (distinto del de selección y del de error), sin tapar las notas.',
      'El botón Solución del resumen toma el estilo de los botones de cada tema.'
    ] },
    { v: 'ui-v60', title: 'Entrenamiento: soluciones y detalles', items: [
      'La consigna del Entrenamiento muestra una barra de tiempo mientras está desplegada, y Objetivo / Saltar usan el mismo estilo de botón de cada tema.',
      'Al cerrar una tanda podés elegir Ver soluciones: cada ejercicio tiene un botón Solución con el razonamiento paso a paso y el tablero resuelto.'
    ] },
    { v: 'ui-v59', title: 'Números grandes y Entrenamiento pulido', items: [
      'Nuevo ajuste Números grandes: dígitos un 20 % más grandes y notas y sumas de jaula más legibles. Se guarda y viaja con el respaldo de progreso.',
      'Entrenamiento: barra Objetivo / Saltar sobre el tablero (la consigna se repliega sola a los 7,5 s) y una tarjeta final con tres niveles según tu puntaje.'
    ] },
    { v: 'ui-v58', title: 'Resultados, récords y Entrenamiento', items: [
      'La tarjeta de resultados aparece centrada en pantalla. Si batís tu mejor tiempo de ese modo y dificultad, suma la insignia ¡NUEVO RÉCORD PERSONAL! con cuánto mejoraste.',
      'Nuevo botón Copiar resultado en las tarjetas de victoria y derrota.',
      'Nuevo Entrenamiento en el Tutorial: tandas de 5 ejercicios que priorizan las técnicas pendientes o donde más fallaste.',
      'En la práctica de Técnicas, el aviso de "celda correcta pero no es la técnica" usa el mismo banner flotante con barra de tiempo que los errores.'
    ] },
    { v: 'ui-v57', title: 'Destello y práctica más estricta', items: [
      'Al completar una fila, columna, caja o región, esas 9 celdas hacen un destello breve con el color de tu tema (se desactiva con "reducir movimiento").',
      'En la práctica de Técnicas, resolver otra celda ya no aprueba la lección: hay que aplicar la técnica enseñada, y un aviso te lo recuerda.',
      'La barra de herramientas de la práctica ocupa todo el ancho del tablero.'
    ] },
    { v: 'ui-v56', title: 'Horizontal más equilibrado', items: [
      'En móvil horizontal el tablero crece y el panel de controles se acota: herramientas y teclado quedan compactos en vez de estirarse a lo ancho.'
    ] },
    { v: 'ui-v55', title: 'Móvil en horizontal', items: [
      'Nuevo diseño de dos columnas al girar el celular: el tablero ocupa casi toda la altura a la izquierda, y a la derecha quedan INICIO y Ajustes, las herramientas en grilla 3×2 y el teclado numérico 3×3 para el pulgar.',
      'Sin scroll ni desbordes en los cuatro temas, en Clásico y Killer. El diseño vertical no cambia.'
    ] },
    { v: 'ui-v54', title: 'Técnicas avanzadas de las variantes', items: [
      'Siete lecciones nuevas en Técnicas: Trío desnudo en diagonal, Doble salto desde una caja y Pasillo bloqueado por el caballo (Anti-Caballo), Encrucijada ortogonal (Sin Consecutivos), y Reducción línea–región, Par oculto y Ley del 45 en 3 líneas (Jigsaw).',
      'Cada lección trae ejemplo paso a paso y práctica con tablero de solución única.'
    ] },
    { v: 'ui-v53', title: 'Ajuste fino en pantallas angostas', items: [
      'Auditoría en 360×800, 375×667, 390×844 y 412×915 con los cuatro temas: sin desbordes horizontales y con tablero, herramientas y teclado completos sin scroll.',
      'El título de la partida ("Sin Consecutivos • Extremo") ya no se corta con puntos suspensivos en 360 px.',
      'Las hojas de Ajustes, Novedades y salas respetan la zona segura superior en móviles con notch.'
    ] },
    { v: 'ui-v52', title: 'Más técnicas en las variantes', items: [
      'Técnicas ahora incluye Sin Consecutivos y Jigsaw, cada una con sus capítulos, ejemplos paso a paso y práctica.',
      'Nuevas lecciones: Par en diagonal (Diagonal), Esquina que ataca al bloque vecino (Anti-Caballo), Aislamiento del 1 y el 9 y Par consecutivo (Sin Consecutivos), e Intersección región–línea y Regla del 45 (Jigsaw).',
      'La práctica de Jigsaw y Sin Consecutivos ya calcula las notas automáticas con las reglas de cada variante.'
    ] },
    { v: 'ui-v51', title: 'Vibración consistente', items: [
      'Vibración unificada: toque suave en el teclado, borrar, deshacer, rewind, notas y pistas; pulso doble al equivocarte; pulso especial al agotar un número, en los hitos de la carrera y al ganar.',
      'Navegar por el tablero, abrir menús y modales, elegir modos o dificultades y cambiar de tema ya no vibran.'
    ] },
    { v: 'ui-v50', title: 'Co-op más claro y selector de modo completo', items: [
      'Co-op: el aviso con el motivo del error aparece en las seis dificultades, para los dos jugadores.',
      'El selector de modo se ve completo (las dos filas) en Co-op, Duelo 1v1, Duelo fantasma y Carrera grupal, en los cuatro temas.',
      'Novedades: línea divisoria bajo el título para separar el encabezado del listado.'
    ] },
    { v: 'ui-v49', title: 'Instalación y errores en Co-op', items: [
      'Nuevo botón "Instalar aplicación" en Ajustes (solo si todavía no está instalada). Si tu navegador no permite instalar con un toque, te explica cómo añadirla a la pantalla de inicio.',
      'Manifest renovado para instalar en Brave, Edge, Samsung Internet e iOS.',
      'Co-op: cuando alguien se equivoca, el aviso con el motivo aparece en la pantalla de ambos jugadores.'
    ] },
    { v: 'ui-v48', title: 'Ajustes unificados y carrera más estable', items: [
      'Nuevo diseño unificado en Ajustes: "Novedades de la versión" tiene el mismo botón enmarcado que "Controles y atajos" en los cuatro temas.',
      'Alertas flotantes (errores y hitos de la carrera) que no mueven el tablero ni el teclado.',
      'Carrera grupal: lobby más limpio (nombres repetidos se renombran, quien se va libera su lugar) y reconexión mejorada si se pierde la señal o se cierra la app.',
      'Actualización automática con barra de progreso: la app se reinicia sola al terminar de descargar.'
    ] },
    { v: 'ui-v47', title: 'Carrera grupal y actualizaciones', items: [
      'Carrera grupal de 3 a 8 jugadores, todos contra todos: tabla en vivo, eliminación a los 3 errores, avisos del 50 % y 80 % y podio final por tema.',
      'Duelo 1v1 en vivo por sala, junto al Duelo fantasma asíncrono y el Co-op: "Jugar con amigos" ahora tiene cuatro opciones.',
      'Los avisos de error y de hitos flotan sobre el tablero y ya no lo desplazan.',
      'Reconexión en móviles: si cerrás la app en plena carrera, volvés con el mismo enlace y seguís donde estabas.',
      '"Continuar partida" ya no se pisa al jugar duelos o carreras.',
      'Actualizaciones automáticas con barra de progreso y esta sección de novedades.'
    ] },
    { v: 'ui-v39', title: 'Multijugador y temas', items: [
      'Co-op: vos siempre ves tu color y a tu compañero con el suyo, con insignia de su inicial; el anfitrión puede terminar la partida y el invitado salir sin cortarla.',
      'Modales propios en lugar de los cuadros del navegador, con avisos claros cuando alguien se va.',
      'Cada tema tiene su propio efecto al pasar el mouse y su pulsación táctil; mejor contraste del resaltado en Noche.',
      'Botón de Ajustes en todas las pantallas y el podio con copa y espadas temáticas.'
    ] },
    { v: 'ui-v27', title: 'Aprender mientras jugás', items: [
      'En Fácil, Medio y Difícil, un error muestra por qué es incorrecto (fila, columna, caja, diagonal, caballo, consecutivos o jaula).',
      'En N° → Celda, al completar un número se resalta el nuevo dígito activo sin dejar marcada la celda anterior.',
      'Nueva guía "Jugar con amigos" en el Tutorial.'
    ] }
  ];

  let updating = false, updReloaded = false, pendingReload = false;
  const inRoom = () => !!(co || rc);

  function showUpdate(loaded, total, version) {
    if (updReloaded) return;
    if (inRoom()) { pendingReload = true; return; }       // no se interrumpe una sala: se aplica al volver al inicio
    updating = true;
    const m = $('#mUpdate'); if (m) m.hidden = false;
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round(loaded / total * 100))) : 0;
    if (version) setText('#updVer', 'Versión ' + verLabel(version));
    setText('#updPct', pct + ' %');
    const f = $('#updFill'); if (f) f.style.width = pct + '%';
    const bar = $('#updBar'); if (bar) bar.setAttribute('aria-valuenow', String(pct));
  }

  function finishUpdate() {
    if (updReloaded) return;
    if (inRoom()) {
      pendingReload = true;
      const m = $('#mUpdate'); if (m) m.hidden = true;
      toast('Nueva versión lista: se instalará al salir de la sala.');
      return;
    }
    updReloaded = true;
    showUpdate(1, 1);                                     // 100 % a la vista antes de recargar
    setTimeout(() => { try { if (G) persist(); } catch (e) { /* ignorar */ } window.location.reload(); }, 300);
  }

  function initUpdates() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(window.location.protocol)) return;
    let had = !!navigator.serviceWorker.controller;        // sin versión previa (primera instalación) no se muestra nada
    navigator.serviceWorker.onmessage = e => {
      const m = e.data;
      if (!m || !had) return;
      if (m.type === 'SW_UPDATE_PROGRESS') showUpdate(m.loaded, m.total, m.version);
      else if (m.type === 'SW_UPDATE_READY' && (updating || pendingReload)) finishUpdate();
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) { had = true; return; }                    // la primera instalación toma el control: a partir de ahora cualquier cambio es una actualización
      if (updating || pendingReload) finishUpdate();
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      if (had && reg.waiting) { showUpdate(0, 1); try { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { /* ignorar */ } }
      reg.addEventListener('updatefound', () => { if (had && reg.installing) showUpdate(0, 1); });
      const check = () => { try { reg.update(); } catch (e) { /* ignorar */ } };
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    }).catch(() => { /* sin service worker la app funciona igual */ });
  }

  /* ----- Instalar aplicación ----- */
  let deferredPrompt = null;
  const isInstalled = () => {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
  };
  function refreshInstallBtn() {
    const b = $('#btnInstall'); if (b) b.hidden = isInstalled();
  }
  function initInstall() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
    window.addEventListener('appinstalled', () => { deferredPrompt = null; refreshInstallBtn(); });
    try { window.matchMedia('(display-mode: standalone)').addEventListener('change', refreshInstallBtn); } catch (e) { /* navegador antiguo */ }
    const b = $('#btnInstall');
    if (b) b.addEventListener('click', () => {
      if (deferredPrompt) {
        const p = deferredPrompt; deferredPrompt = null;
        try { p.prompt(); if (p.userChoice) p.userChoice.then(() => refreshInstallBtn()); } catch (e) { /* ignorar */ }
      } else {
        closeModals(); const m = $('#mInstall'); if (m) m.hidden = false;
      }
    });
    refreshInstallBtn();
  }

  /* ----- Novedades ----- */
  const newsPending = () => store.get(K_NEWS) === '1';
  function markBuildSeen() {
    const prev = store.get(K_LASTBUILD);
    store.set(K_LASTBUILD, BUILD);
    if (prev && prev !== BUILD) store.set(K_NEWS, '1');   // acaba de actualizarse
  }
  function refreshNewsBadge() {
    document.body.classList.toggle('has-news', newsPending());
    const t = $('#newsNew'); if (t) t.hidden = !newsPending();
    setText('#newsVer', 'Versión actual: ' + verLabel(BUILD));
  }
  function openNews() {
    const box = $('#newsList');
    if (box) {
      box.textContent = '';
      CHANGELOG.forEach((e, i) => {
        const sec = mk('section', 'news-ver');
        const h = mk('h3', '', verLabel(e.v) + ' · ' + e.title);
        if (e.v === BUILD || i === 0) h.appendChild(mk('em', 'rl-tag', 'Actual'));
        sec.appendChild(h);
        const ul = mk('ul', 'news-items');
        e.items.forEach(t => ul.appendChild(mk('li', '', t)));
        sec.appendChild(ul);
        box.appendChild(sec);
      });
    }
    store.set(K_NEWS, '0'); refreshNewsBadge();
    closeModals();
    const m = $('#mNews'); if (m) m.hidden = false;
  }

  function init() {
    boardEl = $('#board'); keypad = $('#keypad');
    ['home-view', 'game-view', 'btnPlay', 'playPanel', 'duelBar', 'mDuel', 'coopBar', 'mCoop', 'mLose', 'mSurv', 'mSurvNext', 'mSurvEnd', 'survBar', 'lives', 'hintTag'].forEach(id => {
      if (!document.getElementById(id)) console.error('[Sudoku] Falta #' + id + ': ¿index.html y app.js son de la misma versión?');
    });
    if (!D) {
      console.error('[Sudoku] Falta duel.js: los duelos y desafíos están desactivados.');
      const bf = $('#btnFriend'); if (bf) bf.hidden = true;
    }
    if (!C || !C.available()) {
      console.error('[Sudoku] Falta coop.js o peerjs.min.js: el modo Co-op está desactivado.');
      const bc = $('#btnCoop'); if (bc) bc.hidden = true;
    }
    {
      const bf = $('#btnFriend'), bc = $('#btnCoop'), bs = $('#btnFriends');
      if (bs && bf && bc && bf.hidden && bc.hidden) bs.hidden = true;
    }
    console.info('[Sudoku] app.js ' + BUILD);
    buildDom();
    bindEvents(); schedulePre();
    applyTheme();
    selectMode(set.mode);
    restore();            // si hay partida guardada, queda en G (sin mostrarla)
    showView('home');     // siempre se abre en la pantalla de inicio
    if (G) render();      // deja el tablero listo por si se pulsa "Continuar partida"
    checkDuelHash();      // si se abrió un enlace #duel=..., muestra la invitación
    checkCoopHash();      // si se abrió un enlace #coop=..., se une a la sala
    markBuildSeen(); refreshNewsBadge();
    initUpdates();
    initInstall();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
