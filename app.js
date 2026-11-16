(function () {
  'use strict';
  const E = window.SudokuEngine;   // clásico, diagonal, anti-caballo
  const K = window.KillerEngine;   // killer
  const $ = s => document.querySelector(s);
  const NAMES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', experto: 'Experto' };
  const DIFF_ORDER = ['facil', 'medio', 'dificil', 'experto'];
  const MODES = ['classic', 'killer', 'diagonal', 'antiknight'];
  const MODE_NAMES = { classic: 'Clásico', killer: 'Killer', diagonal: 'Diagonal', antiknight: 'Anti-Caballo' };
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const RING = 'inset 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent)';
  const K_GAME = 'sudoku.game.v1', K_SET = 'sudoku.settings.v1', K_STATS = 'sudoku.stats.v1';
  const validMode = m => (MODES.indexOf(m) >= 0 ? m : 'classic');

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
  // G incluye `mode`/`variant` y, en Killer, el arreglo `cages`.
  const persist = () => { try { store.set(K_GAME, JSON.stringify(G)); } catch (e) { /* ignorar */ } };
  const saveSet = () => store.set(K_SET, JSON.stringify(set));
  const saveStats = () => { try { store.set(K_STATS, JSON.stringify(stats)); } catch (e) { /* ignorar */ } };

  /* ---------- Estado ---------- */
  let set = Object.assign({ theme: 'paper', showErrors: true, mode: 'classic' }, load(K_SET, {}));
  set.mode = validMode(set.mode);
  let stats = Object.assign({ won: {}, best: {}, daily: {} }, load(K_STATS, {}));
  ['won', 'best', 'daily'].forEach(k => { if (!stats[k] || typeof stats[k] !== 'object') stats[k] = {}; });
  let G = null;          // partida: mode, puzzle, solution, board, notes, diff, hist, secs, won, counted, (daily), (cages)
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
  const emptyNotes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));
  const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const BUILD = 'digit-v4';
  // Enlaza un evento a un id; si el id no existe lo avisa en consola (antes el ?. lo ocultaba).
  const on = (id, ev, fn) => {
    const el = document.getElementById(id);
    if (!el) { console.warn('[Sudoku] No existe #' + id + ' en index.html'); return null; }
    el.addEventListener(ev, fn);
    return el;
  };
  const setText = (sel_, txt) => { const el = $(sel_); if (el) el.textContent = txt; };

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

  // Prepara los índices derivados de las jaulas (no se guardan en G).
  function prepareGame() {
    cageOf = new Int16Array(81).fill(-1);
    sumAt = new Int16Array(81);
    if (!G || G.mode !== 'killer') return;
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
    if (!G.won && isSolvedNow()) { G.won = true; sel = -1; recordWin(); showWin(); }
    render(); persist();
  }

  function input(n) {
    if (!G || sel < 0 || G.won) return;
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c]) return;
    if (pencil) {
      if (G.board[r][c]) return;
      mutate(t => {
        t(r, c);
        const a = G.notes[r][c], k = a.indexOf(n);
        if (k < 0) { a.push(n); a.sort((x, y) => x - y); } else a.splice(k, 1);
      });
    } else if (G.board[r][c] !== n) {
      mutate(t => place(r, c, n, t));
    }
  }

  function erase() {
    if (!G || sel < 0 || G.won) return;
    const r = Math.floor(sel / 9), c = sel % 9;
    if (G.puzzle[r][c] || (!G.board[r][c] && !G.notes[r][c].length)) return;
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
    if (!G || G.won) return;
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
    if (!G || !G.hist.length) return;
    G.hist.pop().forEach(([r, c, v, n]) => { G.board[r][c] = v; G.notes[r][c] = n; });
    G.won = false; afterChange();
  }

  /* ---------- Pistas ---------- */
  function hideHint() {
    hint = null;
    const h = $('#hint'); if (h) h.hidden = true;
  }

  function showHint() {
    if (!G || G.won) return;
    let h = null;
    try { h = computeHint(); } catch (e) { h = undefined; }
    const box = $('#hint'), apply = $('#hintApply');
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
    setText('#hintText', h.reason);
    render();
  }

  function applyHint() {
    if (!hint) return;
    const h = hint;
    mutate(t => place(h.row, h.col, h.value, t));
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

  /* ---------- Render ---------- */
  function render() {
    if (!G || !cells.length) return;
    syncActiveDigit();
    const df = isDigitFirst();
    const mode = G.mode, killer = mode === 'killer';
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

    // Etiquetas superiores, modo en tablero y barra de estado
    setText('#modeLabel', G.daily ? 'Diario' : (MODE_NAMES[mode] || 'Sudoku'));
    setText('#diffLabel', G.daily ? dateLabel(G.daily) : (NAMES[G.diff] || 'Sudoku'));
    setText('#clock', fmt(G.secs));
    if (boardEl) boardEl.dataset.mode = mode;
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
    const bu = document.querySelector('[data-act="undo"]');
    if (bu) bu.disabled = !G.hist.length;
  }

  /* ---------- Vistas: inicio / juego ---------- */
  const hasProgress = () => !!G && !G.won;

  function showView(v) {
    view = v;
    const h = $('#home-view'), g = $('#game-view');
    if (h) h.hidden = v !== 'home';
    if (g) g.hidden = v !== 'game';
    if (v === 'home') updateHome();
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
      setText('#continueInfo', (MODE_NAMES[G.mode] || '') + ' • ' + (NAMES[G.diff] || '') + ' • ' + fmt(G.secs) + (G.daily ? ' • Diario' : ''));
    }
    const w = $('#playWarn'); if (w) w.hidden = !prog;
    const t = todayStr();
    setText('#dailyInfo', stats.daily[t] ? 'Hoy completado ✓ ' + fmt(stats.daily[t]) : 'Hoy disponible • ' + dateLabel(t));
  }

  // Inicio: guarda la partida (modo y jaulas incluidos, vía G) y vuelve a #home-view.
  // El cronómetro se pausa solo porque únicamente corre con view === 'game'.
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
      const on = b.dataset.mode === m;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }
  function selectMode(m) { selMode = validMode(m); setModeAttrs(selMode); }

  /* ---------- Partidas ---------- */
  function startGame(diff, mode, opts) {
    if (busy) return;
    opts = opts || {};
    mode = validMode(mode);
    busy = true; closeModals(); if (!opts.daily) selectMode(mode);
    const ml = $('#mLoad'); if (ml) ml.hidden = false;
    let ok = false;
    Promise.resolve().then(() => (mode === 'killer'
      ? K.generateKillerPuzzleAsync(diff, opts.seed ? { seed: opts.seed } : undefined)
      : E.generatePuzzleAsync(diff, opts.seed ? { variant: mode, seed: opts.seed } : { variant: mode }))
    ).then(g => {
      const killer = mode === 'killer', puzzle = killer ? g.board : g.puzzle;
      G = {
        mode: mode, variant: mode, puzzle: puzzle, solution: g.solution, board: E.cloneBoard(puzzle),
        notes: emptyNotes(), diff: g.difficulty, hist: [], secs: 0, won: false, counted: false
      };
      if (killer) G.cages = g.cages;
      if (opts.daily) G.daily = opts.daily;
      prepareGame();
      sel = -1; pencil = false; activeDigit = null; hideHint();
      if (!opts.daily) { set.mode = mode; saveSet(); }
      ok = true;
    }).catch(() => { /* conserva la partida actual si falla */ }).then(() => {
      busy = false;
      const l = $('#mLoad'); if (l) l.hidden = true;
      if (ok) {
        persist(); setPlayOpen(false); showView('game'); render();
      } else {
        updateHome();
      }
    });
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
      s.mode = mode; s.variant = mode; s.secs = s.secs | 0; s.won = !!s.won;
      s.counted = !!s.counted || s.won;
      if (typeof s.daily !== 'string') delete s.daily;
      if (!NAMES[s.diff]) s.diff = 'facil';
      G = s; prepareGame();
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

  function showWin() {
    if (G.daily) setText('#winTxt', 'Completaste el desafío del ' + dateLabel(G.daily) + ' en ' + fmt(G.secs) + '.');
    else setText('#winTxt', 'Completaste el tablero ' + (MODE_NAMES[G.mode] || '') + ' ' + (NAMES[G.diff] || '') + ' en ' + fmt(G.secs) + '.');
    const m = $('#mWin'); if (m) m.hidden = false;
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
    const dailyDone = Object.keys(stats.daily).length;
    body.innerHTML =
      '<table class="stats-tbl"><thead><tr><th>Modo</th><th>Gan.</th><th>Fác.</th><th>Med.</th><th>Dif.</th><th>Exp.</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="stats-sum">Partidas ganadas: <b>' + total + '</b> · Desafíos diarios: <b>' + dailyDone + '</b></p>';
    const m = $('#mStats'); if (m) m.hidden = false;
  }

  /* ---------- Ajustes y modales ---------- */
  function closeModals() { document.querySelectorAll('.modal').forEach(m => { if (m.id !== 'mLoad') m.hidden = true; }); }
  const modalOpen = () => !!document.querySelector('.modal:not([hidden])');
  const openSettings = () => { const m = $('#mSet'); if (m) m.hidden = false; };

  function applyTheme() {
    document.documentElement.dataset.theme = set.theme;
    $('meta[name="theme-color"]')?.setAttribute('content', set.theme === 'night' ? '#121212' : '#F7F4EB');
    document.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('on', b.dataset.themeSet === set.theme));
    const oe = $('#optErr'); if (oe) oe.checked = set.showErrors;
  }

  /* ---------- Eventos ---------- */
  function bindEvents() {
    // Inicio
    on('btnContinue', 'click', continueGame);
    on('btnPlay', 'click', () => { const p = $('#playPanel'); setPlayOpen(!!p && p.hidden); });
    on('btnDaily', 'click', openDaily);
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

    // Juego
    on('board', 'click', e => {
      const t = e.target.closest('.cell');
      if (!t || !G) return;
      const i = +t.dataset.i, r = Math.floor(i / 9), c = i % 9;
      sel = i; hideHint();
      // Número Primero: una celda vacía editable recibe el dígito activo (o su nota, con el lápiz activo).
      // Una celda que ya tiene número no se sobrescribe: solo se selecciona para inspeccionarla.
      if (isDigitFirst() && activeDigit && !G.won && !G.puzzle[r][c] && !G.board[r][c]) input(activeDigit);
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
    on('winNew', 'click', () => { closeModals(); goHome(); setPlayOpen(true); });

    // Modales y ajustes
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m && m.id !== 'mLoad') closeModals(); }));
    document.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => { set.theme = b.dataset.themeSet; saveSet(); applyTheme(); }));
    on('optErr', 'change', e => { set.showErrors = e.target.checked; saveSet(); render(); });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalOpen()) { closeModals(); return; }
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

    // Cronómetro: solo corre en la vista de juego, con la pestaña visible y la partida activa.
    setInterval(() => {
      if (G && view === 'game' && !G.won && !busy && !document.hidden) {
        G.secs++; setText('#clock', fmt(G.secs));
        if (G.secs % 10 === 0) persist();
      }
    }, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (G) persist(); } else if (view === 'home') updateHome();
    });
    window.addEventListener('pagehide', () => { if (G) persist(); });
  }

  /* ---------- Inicio de la app ---------- */
  function init() {
    boardEl = $('#board'); keypad = $('#keypad');
    ['home-view', 'game-view', 'btnPlay', 'playPanel'].forEach(id => {
      if (!document.getElementById(id)) console.error('[Sudoku] Falta #' + id + ': ¿index.html y app.js son de la misma versión?');
    });
    console.info('[Sudoku] app.js ' + BUILD);
    buildDom();
    bindEvents();
    applyTheme();
    selectMode(set.mode);
    restore();            // si hay partida guardada, queda en G (sin mostrarla)
    showView('home');     // siempre se abre en la pantalla de inicio
    if (G) render();      // deja el tablero listo por si se pulsa "Continuar partida"
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
