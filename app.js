(function () {
  'use strict';
  const E = window.SudokuEngine;   // clásico, diagonal, anti-caballo
  const K = window.KillerEngine;   // killer
  const D = window.SudokuDuel || null; // duelos y fantasma (duel.js)
  const C = window.SudokuCoop || null; // modo cooperativo (coop.js + peerjs.min.js)
  const $ = s => document.querySelector(s);
  const NAMES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };
  const DIFF_ORDER = ['facil', 'medio', 'dificil', 'experto'];
  const MODES = ['classic', 'killer', 'diagonal', 'antiknight'];
  const MODE_NAMES = { classic: 'Clásico', killer: 'Killer', diagonal: 'Diagonal', antiknight: 'Anti-Caballo' };
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
  const LIVES_BY_DIFF = { facil: 0, medio: 3, dificil: 2, experto: 1 };
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
  const persist = () => { try { store.set(K_GAME, JSON.stringify(G)); } catch (e) { /* ignorar */ } };
  const saveSet = () => store.set(K_SET, JSON.stringify(set));
  const saveStats = () => { try { store.set(K_STATS, JSON.stringify(stats)); } catch (e) { /* ignorar */ } };

  /* ---------- Estado ---------- */
  let set = Object.assign({ theme: 'paper', showErrors: true, mode: 'classic', practice: false }, load(K_SET, {}));
  set.mode = validMode(set.mode);
  set.practice = !!set.practice;
  let stats = Object.assign({ won: {}, best: {}, daily: {}, surv: {} }, load(K_STATS, {}));
  ['won', 'best', 'daily', 'surv'].forEach(k => { if (!stats[k] || typeof stats[k] !== 'object') stats[k] = {}; });
  Object.keys(stats.surv).forEach(k => { // récords de Supervivencia: { n: tableros, t: segundos }
    const v = stats.surv[k];
    if (!SURV_MODES[k] || !v || !Number.isInteger(v.n) || v.n < 1 || !Number.isFinite(v.t) || v.t < 0) delete stats.surv[k];
  });
  let G = null;          // partida: mode, puzzle, solution, board, notes, diff, req, seed, hist, secs, won, lost, lives, counted, rec, (duel), (daily), (surv), (cages), (coop, owners, hints)
  let view = 'home';     // 'home' | 'game'
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
  let pendingCoop = null;                   // código de sala Co-op pendiente de confirmar
  let ghostSeen = 0;                        // último segundo efectivo ya revisado para destellos del fantasma
  const flash = new Array(81).fill(0);      // por celda: instante (ms) hasta el que dura el destello
  let lastHintKey = '';                     // evita cobrar dos veces la misma pista
  let aliasCb = null, toastTimer = 0;
  let co = null;                            // sala Co-op activa (ver newCoop)
  const emptyNotes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const BUILD = 'lives-v1';
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
    const m = $('#mLoad'); if (m) m.hidden = false;
  }
  function hideLoad() {
    const m = $('#mLoad'); if (m) m.hidden = true;
    const b = $('#loadCancel'); if (b) b.hidden = true;
  }

  /* ---------- Tiempo efectivo (cronómetro + penalización por pistas) ---------- */
  const eff = () => G.secs + HINT_PENALTY * (G.rec ? G.rec.hints : 0);
  // El reloj visible muestra: en una racha, el tiempo acumulado de toda la racha; en duelos, el tiempo efectivo;
  // en partidas normales, el cronómetro simple.
  const showSecs = () => (G.surv ? (G.surv.prev | 0) + G.secs : (G.duel ? eff() : G.secs));

  // ¿La partida actual es una sala Co-op con la conexión viva? (si la sala se cierra, la partida sigue como normal)
  const inCoop = () => !!(G && G.coop && co && co.session);

  // ¿La partida terminó (ganada o perdida)? Con la partida terminada no se acepta más entrada.
  const isOver = () => !!(G && (G.won || G.lost));

  /* ---------- Vidas ---------- */
  // Vidas infinitas: Fácil (maxLives 0) o "Modo práctica" activado. El modo práctica solo afecta a las partidas solitarias
  // normales y diarias: duelos, Co-op y Supervivencia siguen con sus vidas.
  const lifeInf = () => !G.maxLives || (set.practice && !G.duel && !G.coop && !G.surv);

  // Reglas iniciales de vidas y pistas según el tipo de partida.
  function rulesFor(diff, o) {
    if (o.surv) return { maxLives: 1, maxHints: 0 };
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
    const show = !!G && !G.surv;   // en una racha no hay margen: la sub-barra muestra la racha
    el.hidden = !show; if (sp) sp.hidden = !show;
    if (!show) return;
    const inf = lifeInf();
    el.classList.toggle('inf', inf);
    el.textContent = livesText();
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
    const key = mode === 'killer' ? 'classic' : mode;
    if (peerCache[key]) return peerCache[key];
    const out = [];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, s = new Set();
      for (let j = 0; j < 9; j++) { s.add(r * 9 + j); s.add(j * 9 + c); }
      const br = r - (r % 3), bc = c - (c % 3);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s.add((br + a) * 9 + bc + b);
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
  const wrongCells = () => (G.mode === 'killer' ? K : E).findWrongCells(G.board, G.solution);
  const isSolvedNow = () => (G.mode === 'killer'
    ? K.isKillerSolved(G.board, G.cages, G.solution)
    : E.isSolved(G.board, G.solution, G.mode));
  const computeHint = () => (G.mode === 'killer'
    ? K.getKillerHint(G.board, G.solution, G.cages, G.notes)
    : E.getSmartHint(G.board, G.solution, G.notes, G.mode));

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
    notePeers(r * 9 + c).forEach(j => { // borra la nota v en todas las celdas relacionadas
      const rr = Math.floor(j / 9), cc = j % 9, k = G.notes[rr][cc].indexOf(v);
      if (k >= 0) { t(rr, cc); G.notes[rr][cc].splice(k, 1); }
    });
  }

  function afterChange() {
    hideHint();
    // El grabador del fantasma se sincroniza tras CADA cambio (colocar, borrar, deshacer, pista).
    if (G.rec) G.rec.sync(G.board, G.solution, G.puzzle, eff());
    if (!G.won && isSolvedNow()) { G.won = true; sel = -1; finishGame(); }
    // Derrota por vidas: se frena el cronómetro (el intervalo ignora las partidas perdidas) y se muestra el modal.
    let defeat = false;
    if (!G.won && !G.lost && !lifeInf() && G.lives <= 0) { G.lost = true; sel = -1; defeat = true; }
    render(); persist();
    if (defeat) showLose();
  }

  function input(n) {
    if (!G || sel < 0 || isOver()) return;
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c]) return;
    if (inCoop()) {
      if (pencil) { if (!G.board[r][c]) coopDo('note', sel, n); }
      else if (G.board[r][c] !== n) coopDo('set', sel, n);
      return;
    }
    if (pencil) {
      if (G.board[r][c]) return;
      mutate(t => {
        t(r, c);
        const a = G.notes[r][c], k = a.indexOf(n);
        if (k < 0) { a.push(n); a.sort((x, y) => x - y); } else a.splice(k, 1);
      });
    } else if (G.board[r][c] !== n) {
      // Solo un dígito definitivo erróneo resta vida (nunca notas ni borrar). Volver a tocar el mismo dígito ya puesto no entra aquí.
      const bad = n !== G.solution[r][c];
      if (G.rec && bad) G.rec.addError(); // error cometido (cuenta aunque no se marque en pantalla)
      if (bad && !lifeInf()) {
        G.lives = Math.max(0, G.lives - 1);
        pulseLives();
        if (G.lives > 0) toast('\u22121 vida \u00B7 te ' + (G.lives === 1 ? 'queda 1' : 'quedan ' + G.lives));
      }
      mutate(t => place(r, c, n, t));
    }
  }

  function erase() {
    if (!G || sel < 0 || isOver()) return;
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c] || (!G.board[r][c] && !G.notes[r][c].length)) return;
    if (inCoop()) { coopDo('erase', sel, 0); return; }
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
  }

  // Tecla numérica: en 'digit-first' elige (o suelta) el dígito activo; en 'cell-first' escribe en la celda elegida.
  function pressDigit(n) {
    if (!G || isOver()) return;
    if (isDigitFirst()) {
      activeDigit = activeDigit === n ? null : n;
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
    G.won = false; afterChange(); // las vidas perdidas no se recuperan al deshacer
  }

  /* ---------- Pistas ---------- */
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
    if (box) box.hidden = false;
    if (h === undefined) {
      hint = null; if (apply) apply.hidden = true;
      setText('#hintText', 'No se pudo calcular una pista para este tablero.');
      return;
    }
    if (!h) {
      hint = null; if (apply) apply.hidden = true;
      setText('#hintText', 'El tablero está completo y correcto.');
      return;
    }
    hint = h; sel = h.row * 9 + h.col;
    if (apply) apply.hidden = false;
    setText('#hintText', h.reason + (G.duel ? ' (+' + HINT_PENALTY + ' s)' : ''));
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

  function updateDuelBar() {
    const bar = $('#duelBar'); if (!bar) return;
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
    setText('#coopStatus', C.statusText(info));
    const md = $('#coopMeDot'), fd = $('#coopFriendDot');
    if (md) md.className = 'pdot p' + co.me;
    if (fd) fd.className = 'pdot p' + (co.me === 1 ? 2 : 1);
    setText('#coopMeName', 'Vos');
    setText('#coopFriendName', info.peerAlias || co.friendAlias || 'Amigo');
    setText('#coopCount', myProgress() + '/81');
    const sh = $('#coopShare'); if (sh) sh.hidden = co.role !== 'host' || info.state === 'connected';
  }

  // Avisa al compañero de qué celda tengo activa (-1 si estoy fuera del tablero o ya se resolvió).
  function syncFocus() {
    if (!inCoop()) return;
    const f = (view === 'game' && !isOver()) ? sel : -1;
    if (f === co.sentFocus) return;
    if (co.session.send({ type: 'focus', index: f })) co.sentFocus = f;
  }

  /* ---------- Render ---------- */
  function render() {
    if (!G || !cells.length) return;
    syncActiveDigit();
    const df = isDigitFirst();
    const mode = G.mode, killer = mode === 'killer';
    const coop = inCoop();
    const ff = coop ? co.friendFocus : -1, fnum = coop ? (co.me === 1 ? 2 : 1) : 0;
    const wrong = set.showErrors ? new Set(wrongCells().map(w => w.row * 9 + w.col)) : null;
    const hasSel = sel >= 0;
    const sr = Math.floor(sel / 9), sc = sel % 9;
    const sv = hasSel ? G.board[sr][sc] : 0;
    const hv = sv || (df && activeDigit) || 0; // dígito cuyas apariciones se resaltan
    const peerSet = hasSel ? new Set(basePeers(mode)[sel]) : null;
    let extra = null; // celdas con anillo suave: diagonal(es) de la selección o saltos de caballo
    if (hasSel && mode === 'antiknight') extra = new Set(knightOf(sel));
    else if (hasSel && mode === 'diagonal') extra = new Set(diagonalsOf(sel));
    const rel = new Set(hint ? hint.related.map(p => p.row * 9 + p.col) : []);
    const count = new Array(10).fill(0);
    const nowMs = Date.now();

    // Etiquetas superiores, modo en tablero y barra de estado
    const ml = G.surv ? '\uD83D\uDD25 ' + (MODE_NAMES[mode] || 'Sudoku') : (G.daily ? 'Diario' : (MODE_NAMES[mode] || 'Sudoku'));
    setText('#modeLabel', (G.duel ? '⚔ ' : (coop ? '👥 ' : '')) + ml);
    setText('#diffLabel', G.surv ? '#' + G.surv.n + ' ' + (NAMES[G.diff] || '') : (G.daily ? dateLabel(G.daily) : (NAMES[G.diff] || 'Sudoku')));
    setText('#clock', fmt(coop ? G.secs : showSecs()));
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
      let cl = 'cell' + (c % 3 === 2 && c < 8 ? ' br' : '') + (r % 3 === 2 && r < 8 ? ' bb' : '');
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
        if (v && !G.puzzle[r][c] && G.owners && G.owners[i]) cl += ' own' + G.owners[i]; // dígito con el color de su autor
        if (i === ff) cl += (i === sel ? ' pf12' : ' pf' + fnum);                        // celda activa del compañero
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
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    }

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
    document.body.classList.toggle('pencil-mode', pencil);
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
    const bu = document.querySelector('[data-act="undo"]');
    if (bu) {
      if (coop) bu.disabled = G.lost || (co.role === 'host' ? !co.hist.some(e => e.by === 1) : !co.session.isConnected());
      else bu.disabled = !G.hist.length || G.lost;
    }
    updateDuelBar();
    updateCoopBar();
    syncFocus();
  }

  /* ---------- Vistas: inicio / juego ---------- */
  const hasProgress = () => !!G && !G.won && !G.lost;

  function showView(v) {
    view = v;
    const h = $('#home-view'), g = $('#game-view');
    if (h) h.hidden = v !== 'home';
    if (g) g.hidden = v !== 'game';
    if (v === 'home') updateHome();
    syncFocus();
  }

  // Despliega o pliega el selector de modo + dificultad del inicio.
  function setPlayOpen(open) {
    const p = $('#playPanel'), b = $('#btnPlay');
    if (p) p.hidden = !open;
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && p) { try { p.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ignorar */ } }
  }

  /* ---------- Calendario de Desafíos Diarios ---------- */
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = (y, m, d) => y + '-' + pad2(m + 1) + '-' + pad2(d);   // m: 0-11
  const todayStr = () => { const n = new Date(); return ymd(n.getFullYear(), n.getMonth(), n.getDate()); };
  const dateLabel = ds => { const p = String(ds).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(ds); };
  const MAX_BACK_MONTHS = 24;
  let calY = 0, calM = 0;

  function renderCalendar() {
    const now = new Date(), curIdx = now.getFullYear() * 12 + now.getMonth(), viewIdx = calY * 12 + calM;
    const today = todayStr();
    const days = new Date(calY, calM + 1, 0).getDate();
    const lead = (new Date(calY, calM, 1).getDay() + 6) % 7;   // semana que empieza en lunes
    let html = '', done = 0, total = 0, d;
    for (d = 0; d < lead; d++) html += '<span class="dday blank" aria-hidden="true"></span>';
    for (d = 1; d <= days; d++) {
      const ds = ymd(calY, calM, d);
      const completed = !!stats.daily[ds];
      const locked = ds > today;                                  // las fechas ISO se comparan como texto
      const cls = ['dday'];
      let label = 'Día ' + d;
      if (locked) { cls.push('locked'); label += ', bloqueado'; }
      else {
        total++;
        if (completed) { done++; cls.push('completed'); label += ', completado'; }
        else if (ds !== today) { cls.push('avail'); label += ', disponible'; }
        if (ds === today) { cls.push('today'); label += ', hoy'; }
      }
      html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + ds + '" aria-label="' + label + '"' +
        (locked ? ' disabled' : '') + '><span>' + d + '</span>' + (completed ? '<i aria-hidden="true">✓</i>' : '') + '</button>';
    }
    const grid = $('#dailyGrid'); if (grid) grid.innerHTML = html;
    setText('#dailyMonth', MONTHS[calM] + ' ' + calY);
    setText('#dailyCount', done + ' de ' + total + ' completados');
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
    const m = $('#mDaily'); if (m) m.hidden = false;
  }

  function updateHome() {
    const prog = hasProgress();
    const bc = $('#btnContinue'); if (bc) bc.hidden = !prog;
    if (prog) {
      setText('#continueInfo', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • ' + fmt(showSecs()) +
        (G.surv ? ' • 🔥 Racha: ' + (G.surv.n - 1) : '') +
        (G.daily ? ' • Diario' : '') + (G.duel ? (G.duel.open ? ' • ⚔ en vivo' : ' • ⚔ vs ' + G.duel.alias) : '') +
        (inCoop() ? ' • 👥 co-op' : ''));
    }
    const w = $('#playWarn'); if (w) w.hidden = !prog;
    const t = todayStr();
    setText('#dailyInfo', stats.daily[t] ? 'Hoy completado ✓ ' + fmt(stats.daily[t]) : 'Hoy disponible • ' + dateLabel(t));
  }

  // Inicio: guarda la partida (modo, jaulas y fantasma incluidos, vía G) y vuelve a #home-view.
  // El cronómetro se pausa solo porque únicamente corre con view === 'game' (en una sala Co-op sigue el reloj del Host).
  function goHome() {
    if (G) persist();
    hideHint(); closeModals(); setPlayOpen(false);
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
  function genPuzzle(diff, mode, seed, fixed) {
    if (mode === 'killer') return K.generateKillerPuzzleAsync(diff, Object.assign({ seed: seed }, GEN_K));
    return E.generatePuzzleAsync(diff, Object.assign({ variant: mode, seed: seed }, fixed ? GEN_E : {}));
  }

  // Enlace de invitación abierta del tablero actual: solo tablero/semilla, sin tiempo ni fantasma. Killer va por semilla.
  const inviteEncoded = () => D.encodeDuelPayload({
    mode: G.mode, diff: G.req, seed: G.seed, board: G.mode === 'killer' ? null : G.puzzle, open: true
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
    if (!opts.board && !opts.transition) showLoad('Generando tablero…', false); // con tablero empaquetado no hay espera
    const seed = toSeed(opts.seed);
    let ok = false, errMsg = '';
    const fixedGen = mode === 'killer' || !!opts.daily || !!opts.legacy;
    // En la transición de una racha se espera un mínimo para que se vea el "tablero superado".
    const wait = opts.transition ? new Promise(res => setTimeout(res, SURV_TRANSITION_MS)) : null;
    Promise.resolve().then(() => {
      if (opts.board) return boardFromPacked(opts.board, mode, diff);
      return genPuzzle(diff, mode, seed, fixedGen);
    }).then(g => (wait ? wait.then(() => g) : g)).then(g => {
      const killer = mode === 'killer', puzzle = killer ? g.board : g.puzzle;
      // Control de coherencia del duelo: el fantasma nunca resuelve una celda dada. Si pasa, el tablero no coincide.
      if (opts.duel && opts.duel.moves.some(m => puzzle[Math.floor(m.cell / 9)][m.cell % 9])) {
        errMsg = 'No se pudo reconstruir el mismo tablero del duelo. ¿Ambos tienen la app actualizada?';
        throw new Error('duel-mismatch');
      }
      if (co) leaveCoop(); // empezar otra partida cierra la sala Co-op
      const rules = rulesFor(diff, opts);
      G = {
        mode: mode, variant: mode, puzzle: puzzle, solution: g.solution, board: E.cloneBoard(puzzle),
        notes: emptyNotes(), diff: g.difficulty, req: diff, seed: seed, hist: [], secs: 0, won: false, lost: false, counted: false,
        rec: D ? new D.DuelRecorder() : null,
        maxLives: rules.maxLives, lives: rules.maxLives, hintsMax: rules.maxHints, hintsUsed: 0
      };
      if (killer) G.cages = g.cages;
      if (opts.daily) G.daily = opts.daily;
      if (opts.duel) G.duel = opts.duel;
      if (opts.surv) { G.surv = opts.surv; G.counted = true; G.rec = null; } // la racha no suma a las estadísticas normales ni se desafía
      if (opts.invite) { // duelo con amigo: invitación abierta (sin tiempo ni fantasma todavía)
        const dec = D.decodeDuelPayload(inviteEncoded());
        G.duel = { id: dec.ok ? dec.id : 'live.' + seed.toString(36), open: true, alias: '', time: 0, errors: 0, hints: 0, moves: [] };
      }
      if (opts.rematchTo) G.rematchTo = opts.rematchTo;
      prepareGame();
      sel = -1; pencil = false; activeDigit = null; hideHint();
      ghostSeen = 0; flash.fill(0); lastHintKey = '';
      if (!opts.daily && !opts.surv) { set.mode = mode; saveSet(); }
      ok = true;
    }).catch(() => { if (!errMsg && opts.board) errMsg = 'El tablero del enlace no es válido.'; /* conserva la partida actual */ }).then(() => {
      busy = false;
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
      // La conexión de una sala Co-op no sobrevive a un reinicio: la partida sigue como partida normal.
      const coopHints = s.hints | 0;
      delete s.coop; delete s.owners; delete s.hints;
      s.mode = mode; s.variant = mode; s.secs = s.secs | 0; s.won = !!s.won; s.lost = !!s.lost;
      s.counted = !!s.counted || s.won;
      if (typeof s.daily !== 'string') delete s.daily;
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
  function recordWin() {
    if (!G || G.counted) return; // evita contar dos veces si se deshace y se vuelve a resolver
    G.counted = true;
    const m = G.mode, key = m + '.' + G.diff;
    stats.won[m] = (stats.won[m] | 0) + 1;
    if (!stats.best[key] || G.secs < stats.best[key]) stats.best[key] = G.secs;
    if (G.daily && (!stats.daily[G.daily] || G.secs < stats.daily[G.daily])) stats.daily[G.daily] = G.secs;
    saveStats();
  }

  // Al resolver: estadísticas, tiempo final efectivo (con penalizaciones) y, en un duelo, marcador cara a cara.
  function finishGame() {
    if (G.surv) { survWin(); return; }
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

  function showWin() {
    if (inCoop()) { showCoopWin(); return; }
    const cr = $('#coopResult'); if (cr) { cr.textContent = ''; cr.hidden = true; }
    const ba = $('#winCoopAgain'); if (ba) ba.hidden = true;
    const live = !!(G.duel && G.duel.open && D);
    const duel = !!(G.duel && !G.duel.open && D && typeof G.finalTime === 'number');
    const box = $('#duelResult'), note = $('#winNote');
    let title = '¡Resuelto!', txt;
    if (duel) {
      const out = D.compareTimes(G.finalTime, G.duel.time);
      title = out === 'win' ? '¡Ganaste el duelo!' : (out === 'loss' ? 'Perdiste el duelo' : 'Empate');
      txt = (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • vs ' + G.duel.alias;
      if (box) { buildDuelResult(box); box.hidden = false; }
    } else {
      if (G.daily) txt = 'Completaste el desafío del ' + dateLabel(G.daily) + ' en ' + fmt(G.secs) + '.';
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
      bc.hidden = !canChallenge();
      bc.textContent = live ? 'Enviar mi resultado (con fantasma)'
        : (G.rematchTo ? 'Mandar revancha a ' + G.rematchTo : 'Desafiar a un amigo');
    }
    const br = $('#winRematch'); if (br) br.hidden = !duel;
    const m = $('#mWin'); if (m) m.hidden = false;
  }

  /* ---------- Derrota por vidas ---------- */
  // Muestra el modal de derrota (o el de fin de racha en Supervivencia).
  function showLose() {
    if (!G) return;
    if (G.surv) { showSurvEnd(); return; }
    const team = inCoop();
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
    G.secs = 0; G.won = false; G.lost = false; G.counted = false;
    G.lives = G.maxLives; G.hintsUsed = 0;
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
    startGame(survDiff(1), survPickMode(rot), {
      surv: { rot: rot, n: 1, prev: 0, rec0: r0 ? { n: r0.n, t: r0.t } : null }
    });
  }

  // Tablero de la racha resuelto: se guarda el récord y se pasa (con transición) al siguiente.
  function survWin() {
    const S = G.surv;
    const done = S.n, total = (S.prev | 0) + G.secs;
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

  function showStats() {
    const body = $('#statsBody'); if (!body) return;
    let total = 0, rows = '';
    MODES.forEach(m => {
      const w = stats.won[m] | 0;
      total += w;
      rows += '<tr><th scope="row">' + MODE_NAMES[m] + '</th><td>' + w + '</td>' +
        DIFF_ORDER.map(d => { const t = stats.best[m + '.' + d]; return '<td>' + (t ? fmt(t) : '—') + '</td>'; }).join('') +
        '</tr>';
    });
    let srows = '';
    Object.keys(SURV_MODES).forEach(k => {
      const r = stats.surv[k];
      srows += '<tr><th scope="row">' + SURV_MODES[k].label + '</th><td>' + (r ? r.n : '—') + '</td><td>' + (r ? fmt(r.t) : '—') + '</td></tr>';
    });
    const dailyDone = Object.keys(stats.daily).length;
    body.innerHTML =
      '<table class="stats-tbl"><thead><tr><th>Modo</th><th>Gan.</th><th>Fác.</th><th>Med.</th><th>Dif.</th><th>Exp.</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<table class="stats-tbl surv-tbl"><thead><tr><th>🔥 Supervivencia</th><th>Racha</th><th>Tiempo</th></tr></thead>' +
      '<tbody>' + srows + '</tbody></table>' +
      '<p class="stats-sum">Partidas ganadas: <b>' + total + '</b> · Desafíos diarios: <b>' + dailyDone + '</b></p>';
    const m = $('#mStats'); if (m) m.hidden = false;
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
      if (G.mode !== 'killer') payload.board = G.puzzle; // tablero empaquetado: el rival arranca al instante
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
    const rt = co;
    co = null;
    if (G) G.coop = false;
    if (rt && rt.session) { try { rt.session.close(); } catch (e) { /* ignorar */ } }
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
      if (co) leaveCoop();
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
    const s = C.createHost({ alias: rt.myAlias });
    rt.session = s; rt.code = s.code;
    s.on('status', info => onCoopStatus(rt, info));
    s.on('ready', () => { if (co === rt) { updateCoopBar(); shareCoopLink(); } });
    s.on('message', m => onHostMessage(rt, m));
    s.start();
  }

  // Comparte (o copia) el enlace de la sala.
  function shareCoopLink() {
    if (!inCoop() || co.role !== 'host') return;
    co.session.share({
      text: co.myAlias + ' te invita a resolver un Sudoku juntos (' + MODE_NAMES[G.mode] + ' • ' + NAMES[G.req] +
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
      puzzle: G.puzzle, solution: G.solution, cages: G.cages, board: G.board, notes: G.notes, owners: G.owners,
      secs: G.secs, hints: G.hints | 0, lives: G.lives, won: G.won, fresh: !!fresh
    }));
  }

  /* ----- Estado de la conexión (ambos roles) ----- */
  function onCoopStatus(rt, info) {
    if (co !== rt) return;
    if (rt.joining) { // el Invitado todavía no recibió el tablero
      if (info.state === 'error' || info.state === 'closed') {
        co = null;
        hideLoad();
        toast(C.statusText(info));
        updateHome();
      } else {
        setText('#loadTxt', info.state === 'reconnecting' ? 'Reconectando…' : 'Conectando con la sala…');
      }
      return;
    }
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
      notePeers(i).forEach(j => { // auto-limpieza de notas en las celdas relacionadas
        const rr = Math.floor(j / 9), cc = j % 9, k = G.notes[rr][cc].indexOf(v);
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
      render(); persist();
      showCoopWin(counts);
      return;
    }
    if (!G.won && !G.lost && G.lives <= 0) {
      G.lost = true; sel = -1;
      co.session.send({ type: 'lost', secs: G.secs, hints: G.hints | 0 });
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
    if (co !== rt || !G || !G.coop) return;
    switch (m.type) {
      case 'hello':
        rt.friendAlias = m.alias; rt.friendFocus = -1; rt.sentFocus = -2;
        sendState(false);
        syncFocus();
        toast(m.alias + (m.resume ? ' volvió a la sala' : ' se unió a la sala'));
        render();
        if (G.lost) showLose();
        break;
      case 'focus':
        rt.friendFocus = m.index; render();
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
      case 'bye':
        rt.friendFocus = -1;
        toast((rt.friendAlias || 'Tu amigo') + ' salió de la sala');
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
    if (co) leaveCoop();
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
    if (m.type === 'state') { applyCoopState(rt, m); return; }
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
        nm.appendChild(mk('i', 'pdot p' + p));
        nm.appendChild(mk('span', '', p === co.me ? 'Vos' : (co.friendAlias || 'Amigo')));
        row.appendChild(nm);
        row.appendChild(mk('b', '', counts[p - 1] + (counts[p - 1] === 1 ? ' celda' : ' celdas')));
        box.appendChild(row);
      });
      const bar = mk('div', 'cr-bar');
      [1, 2].forEach(p => {
        const seg = mk('i', 'p' + p);
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
    if (!coopOk()) { toast('Falta peerjs.min.js: el modo Co-op no está disponible.'); return; }
    if (co && co.code === r.code) {
      if (co.role === 'host') toast('Esa es tu propia sala: mandale el enlace a tu amigo.');
      else if (G && G.coop) { showView('game'); render(); }
      return;
    }
    if (hasProgress()) {
      pendingCoop = r.code;
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
    document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad') m.hidden = true; });
  }
  const modalOpen = () => !!document.querySelector('.modal:not([hidden])');
  const openSettings = () => { const m = $('#mSet'); if (m) m.hidden = false; };

  function applyTheme() {
    document.documentElement.dataset.theme = set.theme;
    $('meta[name="theme-color"]')?.setAttribute('content', set.theme === 'night' ? '#121212' : '#F7F4EB');
    document.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('on', b.dataset.themeSet === set.theme));
    const oe = $('#optErr'); if (oe) oe.checked = set.showErrors;
    const op = $('#optPractice'); if (op) op.checked = set.practice;
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    // Inicio
    on('btnContinue', 'click', continueGame);
    on('btnPlay', 'click', () => { const p = $('#playPanel'); setPlayOpen(!!p && p.hidden); });
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
    on('btnHomeSet', 'click', openSettings);
    document.querySelectorAll('.modes [data-mode]').forEach(b => b.addEventListener('click', () => selectMode(b.dataset.mode)));
    document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => startGame(b.dataset.diff, selMode)));

    // Supervivencia (No-Hit) y derrota por vidas
    on('btnSurv', 'click', openSurv);
    document.querySelectorAll('[data-surv]').forEach(b => b.addEventListener('click', () => startSurvival(b.dataset.surv)));
    on('seAgain', 'click', () => { const rot = G && G.surv ? G.surv.rot : null; closeModals(); if (rot) startSurvival(rot); });
    on('seHome', 'click', () => { goHome(); });
    on('loseRetry', 'click', onLoseRetry);
    on('loseHome', 'click', () => { goHome(); });

    // Co-op
    on('btnCoop', 'click', openCoop);
    on('coopGo', 'click', () => startCoopHost(coopMode, coopDiff));
    document.querySelectorAll('#coopModes [data-cmode]').forEach(b => b.addEventListener('click', () => { coopMode = b.dataset.cmode; setCoopSel(); }));
    document.querySelectorAll('#coopDiffs [data-cdiff]').forEach(b => b.addEventListener('click', () => { coopDiff = b.dataset.cdiff; setCoopSel(); }));
    on('coopShare', 'click', shareCoopLink);
    on('winCoopAgain', 'click', coopAgain);
    on('coopJoinGo', 'click', () => { const code = pendingCoop; closeModals(); if (code) joinCoop(code); });
    on('coopJoinCancel', 'click', closeModals);
    on('loadCancel', 'click', cancelJoin);

    // Juego
    on('board', 'click', e => {
      const t = e.target.closest('.cell');
      if (!t || !G) return;
      const i = +t.dataset.i, r = Math.floor(i / 9), c = i % 9;
      sel = i; hideHint();
      // Número Primero: una celda vacía editable recibe el dígito activo (o su nota, con el lápiz activo).
      // Una celda que ya tiene número no se sobrescribe: solo se selecciona para inspeccionarla.
      if (isDigitFirst() && activeDigit && !isOver() && !G.puzzle[r][c] && !G.board[r][c]) input(activeDigit);
      else render();
    });
    on('keypad', 'click', e => { const b = e.target.closest('button'); if (b && !b.disabled) pressDigit(+b.dataset.n); });
    document.querySelector('.tools')?.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const a = b.dataset.act;
      if (a === 'undo') undo(); else if (a === 'erase') erase();
      else if (a === 'pencil') { pencil = !pencil; render(); } else if (a === 'hint') showHint();
      else if (a === 'inputmode') toggleInputMode();
    });
    on('hintApply', 'click', applyHint);
    on('hintClose', 'click', () => { hideHint(); render(); });
    on('btnHome', 'click', goHome);
    on('btnSet', 'click', openSettings);
    // Con la partida terminada, tocar el reloj vuelve a abrir el resultado (victoria, derrota o fin de racha).
    on('clock', 'click', () => {
      if (!G || view !== 'game') return;
      if (G.won && !G.surv) showWin(); else if (G.lost) showLose();
    });
    on('winNew', 'click', () => { if (inCoop()) leaveCoop(); closeModals(); goHome(); setPlayOpen(true); });
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
      if (e.target !== m || m.id === 'mLoad' || m.id === 'mSurvNext') return;
      if (m.id === 'mAlias') hideAlias(); else closeModals();
    }));
    document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => { set.theme = b.dataset.themeSet; saveSet(); applyTheme(); }));
    on('optErr', 'change', e => { set.showErrors = e.target.checked; saveSet(); render(); });
    on('optPractice', 'change', e => { set.practice = e.target.checked; saveSet(); render(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalOpen()) {
        const al = $('#mAlias');
        if (al && !al.hidden) hideAlias(); else closeModals();
        return;
      }
      if (!G || busy || modalOpen() || view !== 'game') return;
      if (e.key >= '1' && e.key <= '9') pressDigit(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase();
      else if (e.key === 'n' || e.key === 'N') { pencil = !pencil; render(); }
      else if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') || e.key === 'u') { e.preventDefault(); undo(); }
      else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault();
        let r = sel < 0 ? 0 : Math.floor(sel / 9), c = sel < 0 ? 0 : sel % 9;
        if (sel >= 0) {
          if (e.key === 'ArrowUp') r = Math.max(0, r - 1); else if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
          else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1); else c = Math.min(8, c + 1);
        }
        sel = r * 9 + c; hideHint(); render();
      }
    });

    // Cronómetro: solo corre en la vista de juego, con la pestaña visible y la partida activa (ni ganada ni perdida).
    // En un duelo también avanza el fantasma: destellos y progreso del rival según el tiempo efectivo.
    // En una sala Co-op manda el reloj del Host: corre mientras el Invitado esté conectado (aunque el Host esté en el inicio),
    // lo difunde cada segundo y el Invitado solo lo muestra (si el Host se pausa, el reloj del Invitado también).
    setInterval(() => {
      if (!G || busy || G.won || G.lost || document.hidden) return;
      if (inCoop()) {
        if (co.role === 'host' && co.session.isConnected()) {
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
    console.info('[Sudoku] app.js ' + BUILD);
    buildDom();
    bindEvents();
    applyTheme();
    selectMode(set.mode);
    restore();            // si hay partida guardada, queda en G (sin mostrarla)
    showView('home');     // siempre se abre en la pantalla de inicio
    if (G) render();      // deja el tablero listo por si se pulsa "Continuar partida"
    checkDuelHash();      // si se abrió un enlace #duel=..., muestra la invitación
    checkCoopHash();      // si se abrió un enlace #coop=..., se une a la sala
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
