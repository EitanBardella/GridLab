/*!
 * race.js — Carrera grupal (todos contra todos, 3 a 8 jugadores) para la PWA de Sudoku
 * -----------------------------------------------------------------------------
 * Solo transporte y reglas de ranking; no toca el DOM ni el estado del juego. Reutiliza de `SudokuCoop` el código de sala,
 * el alias, el enlace compartible (`#coop=XXXX&k=r`) y la lista de servidores ICE, y usa PeerJS directamente porque el Host
 * necesita VARIAS conexiones a la vez (topología en estrella: el Host recibe el avance de cada invitado y retransmite la tabla).
 * El Host también es un jugador: su avance lo informa la app llamando a su propio registro, no por red.
 *
 * Mensajes del Invitado al Host:
 *   rhello { alias, sid }                 alta en la sala (sid = identidad estable entre reconexiones)
 *   rprog  { filled, mistakes, time, eliminated, left }
 *   rwin   { time }                       llegó a 81/81
 *   rleave {}                             sale a propósito
 * Mensajes del Host a los Invitados:
 *   race-lobby       { you, players:[{id, alias, host}] }
 *   race-start       { seed, mode, difficulty, players:[{id, alias}], state }   state = mensaje `state` de Co-op (tablero)
 *   race-leaderboard { rankings }
 *   race-finish      { rankings, finalTime, winnerId }
 *   race-full        {}                   la sala ya tiene 8 jugadores
 *   race-closed      { reason }           'started' (ya empezó) | 'host-quit'
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) { module.exports = factory(root); } else { root.SudokuRace = factory(root); }
}(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var MAX_PLAYERS = 8, MIN_PLAYERS = 3;
  var MAX_SECS = 359999;
  var DROP_MS = 5000;         // un invitado sin conexión más de este tiempo durante la carrera cuenta como "Abandonó"
  var HB_LOBBY_MS = 4000, HB_RACE_MS = 3000;   // latido del Host (ping / pong): 4 s en el lobby, 3 s en carrera
  var SILENT_LOBBY = 10000, SILENT_RACE = 6000;   // sin ninguna señal durante tanto tiempo = conexión muerta
  var GUEST_TRIES = 6;

  function C() { return root && root.SudokuCoop; }
  function Ctor() { return root && root.Peer; }
  function prefix() { return (C() && C().ID_PREFIX) || 'sudoku-'; }
  function isInt(n, lo, hi) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi; }
  function rnd() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  /* ----- Ranking ----- */
  function group(p) { return p.done ? 0 : ((p.eliminated || p.left) ? 2 : 1); }
  /** Ordena: primero quien terminó (menor tiempo), luego los activos y al final eliminados/abandonos; dentro de cada grupo,
   *  más celdas completas y menos errores. Devuelve copias con `pos` (1..n). */
  function rank(list) {
    var a = list.map(function (p) { var o = {}; for (var k in p) { o[k] = p[k]; } return o; });
    a.sort(function (x, y) {
      var gx = group(x), gy = group(y);
      if (gx !== gy) { return gx - gy; }
      if (gx === 0) { return x.time - y.time; }
      if (y.filled !== x.filled) { return y.filled - x.filled; }
      if (x.mistakes !== y.mistakes) { return x.mistakes - y.mistakes; }
      return x.time - y.time;
    });
    a.forEach(function (p, i) { p.pos = i + 1; });
    return a;
  }

  /* ----- Validación de mensajes ----- */
  function cleanRows(rows) {
    if (!Array.isArray(rows) || rows.length > MAX_PLAYERS) { return null; }
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !isInt(r.id, 0, 15)) { return null; }
      out.push({
        id: r.id, alias: (C() ? C().sanitizeAlias(r.alias) : String(r.alias || '').slice(0, 12)) || 'Jugador',
        filled: isInt(r.filled, 0, 81) ? r.filled : 0, mistakes: isInt(r.mistakes, 0, 255) ? r.mistakes : 0,
        time: isInt(r.time, 0, MAX_SECS) ? r.time : 0, eliminated: !!r.eliminated, left: !!r.left, done: !!r.done, host: !!r.host
      });
    }
    return out;
  }

  function sanitize(m, role) {
    try {
      if (!m || typeof m !== 'object' || typeof m.type !== 'string') { return null; }
      var rows;
      if (role === 'host') {
        switch (m.type) {
          case 'rhello': return { type: 'rhello', alias: (C() && C().sanitizeAlias(m.alias)) || 'Jugador', sid: String(m.sid || '').slice(0, 40) };
          case 'rprog':
            if (!isInt(m.filled, 0, 81)) { return null; }
            return {
              type: 'rprog', filled: m.filled, mistakes: isInt(m.mistakes, 0, 255) ? m.mistakes : 0,
              time: isInt(m.time, 0, MAX_SECS) ? m.time : 0, eliminated: !!m.eliminated, left: !!m.left
            };
          case 'rwin': return isInt(m.time, 0, MAX_SECS) ? { type: 'rwin', time: m.time } : null;
          case 'rleave': return { type: 'rleave' };                        // "Salir de la carrera" (definitivo)
          case 'race-leave': return { type: 'rleave', soft: true };        // cerró la pestaña / la app: puede reingresar con su token
          case 'pong': return { type: 'pong' };
          default: return null;
        }
      }
      switch (m.type) {
        case 'race-lobby': {
          if (!isInt(m.you, 0, 15) || !Array.isArray(m.players) || m.players.length > MAX_PLAYERS) { return null; }
          var pl = [];
          for (var i = 0; i < m.players.length; i++) {
            var p = m.players[i];
            if (!p || !isInt(p.id, 0, 15)) { return null; }
            pl.push({ id: p.id, alias: C().sanitizeAlias(p.alias) || 'Jugador', host: !!p.host });
          }
          return { type: 'race-lobby', you: m.you, players: pl };
        }
        case 'race-start': {
          var st = C() && C().sanitizeMessage(m.state);
          if (!st || st.type !== 'state' || !isInt(m.seed, 0, 4294967295) || !Array.isArray(m.players) || m.players.length > MAX_PLAYERS) { return null; }
          var ps = [];
          for (var j = 0; j < m.players.length; j++) {
            var q = m.players[j];
            if (!q || !isInt(q.id, 0, 15)) { return null; }
            ps.push({ id: q.id, alias: C().sanitizeAlias(q.alias) || 'Jugador', host: !!q.host });
          }
          return { type: 'race-start', seed: m.seed, mode: st.mode, difficulty: st.req, players: ps, state: st, elapsed: isInt(m.elapsed, 0, MAX_SECS) ? m.elapsed : 0 };
        }
        case 'race-leaderboard':
          rows = cleanRows(m.rankings);
          return rows ? { type: 'race-leaderboard', rankings: rows } : null;
        case 'race-finish':
          rows = cleanRows(m.rankings);
          if (!rows) { return null; }
          return { type: 'race-finish', rankings: rows, finalTime: isInt(m.finalTime, 0, MAX_SECS) ? m.finalTime : 0, winnerId: isInt(m.winnerId, -1, 15) ? m.winnerId : -1 };
        case 'ping': return { type: 'ping' };
        case 'race-milestone':
          if ((m.milestone !== 50 && m.milestone !== 80) || !isInt(m.playerId, 0, 15)) { return null; }
          return { type: 'race-milestone', milestone: m.milestone, playerId: m.playerId, playerName: (C() && C().sanitizeAlias(m.playerName)) || 'Jugador' };
        case 'race-full': return { type: 'race-full' };
        case 'race-closed': return { type: 'race-closed', reason: m.reason === 'started' ? 'started' : 'host-quit' };
        default: return null;
      }
    } catch (e) { return null; }
  }

  /* ----- Sesión de red ----- */
  function Net(role, opts) {
    opts = opts || {};
    this.role = role;
    this.alias = (C() && C().sanitizeAlias(opts.alias)) || 'Jugador';
    this.code = opts.code || null;
    this.sid = (opts.sid && String(opts.sid).slice(0, 40)) || rnd();
    this.listeners = {};
    this.closed = false;
    this.locked = false;           // Host: la carrera ya empezó, no entra nadie más
    this.peer = null; this.conn = null;
    this.players = {};             // Host: id → { id, alias, sid, conn, host, disc, timer }
    this.nextId = 1;
    this.pending = [];
    this._tries = 0; this._conns = 0;
    this._timers = {};
    if (role === 'host') { this.players[0] = { id: 0, alias: this.alias, sid: this.sid, conn: null, host: true, disc: false }; }
  }

  Net.prototype.on = function (ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); return this; };
  Net.prototype.emit = function (ev, a, b) {
    var l = (this.listeners[ev] || []).slice();
    for (var i = 0; i < l.length; i++) { try { l[i](a, b); } catch (e) { if (root.console) { root.console.error('[Race]', e); } } }
  };
  Net.prototype.link = function () { return C().buildLink(this.code, 'race'); };
  Net.prototype.share = function (opts) {
    return C().shareLink({ title: 'Carrera de Sudoku', text: (opts && opts.text) || (this.alias + ' te invita a una carrera de Sudoku.'), url: this.link() });
  };
  Net.prototype.copy = function () { return C().copyText(this.link()); };

  Net.prototype.start = function () {
    var self = this;
    if (!Ctor()) { setTimeout(function () { self.emit('error', 'no-peerjs'); }, 0); return this; }
    if (this.role === 'host') { this._openHost(); } else { this._openGuest(); }
    return this;
  };

  Net.prototype._mkPeer = function (id) {
    return new (Ctor())(id, { debug: 0, config: { iceServers: (C() && C().ICE_SERVERS) || [] } });
  };

  /* --- Host --- */
  Net.prototype._openHost = function () {
    var self = this, peer;
    if (!this.code) { this.code = C().generateCode(); }
    try { peer = this._mkPeer(prefix() + this.code); } catch (e) { this.emit('error', 'unsupported'); return; }
    this.peer = peer;
    peer.on('open', function () {
      if (self.peer !== peer || self.closed) { return; }
      if (!self._hb) { self._hb = true; self._tick(); self._bindUnload(); }
      self.emit('ready', self.code);
    });
    peer.on('connection', function (c) { if (self.peer === peer && !self.closed) { self._onIncoming(c); } });
    peer.on('disconnected', function () { if (self.peer === peer && !self.closed) { try { peer.reconnect(); } catch (e) { /* ignorar */ } } });
    peer.on('error', function (err) {
      if (self.peer !== peer || self.closed) { return; }
      var t = err && err.type;
      if (t === 'unavailable-id' && ++self._tries < 6) {
        try { peer.destroy(); } catch (e) { /* ignorar */ }
        self.peer = null; self.code = null; self._openHost(); return;
      }
      if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') { return; }   // transitorio
      self.emit('error', 'network');
    });
  };

  Net.prototype._count = function () { return Object.keys(this.players).length; };

  Net.prototype.lobby = function () {
    var self = this;
    return Object.keys(this.players).map(function (k) { var p = self.players[k]; return { id: p.id, alias: p.alias, host: !!p.host }; });
  };

  Net.prototype._pushLobby = function () {
    var self = this, list = this.lobby();
    Object.keys(this.players).forEach(function (k) {
      var p = self.players[k];
      if (p.conn) { self._send(p.conn, { type: 'race-lobby', you: p.id, players: list }); }
    });
    this.emit('lobby', list);
  };

  Net.prototype._send = function (conn, msg) { try { if (conn && conn.open) { conn.send(msg); return true; } } catch (e) { /* ignorar */ } return false; };

  Net.prototype._onIncoming = function (c) {
    var self = this, bound = false;
    var kill = setTimeout(function () { if (!bound) { try { c.close(); } catch (e) { /* ignorar */ } } }, 8000);   // sin 'rhello' a tiempo
    c.on('data', function (raw) {
      var m = sanitize(raw, 'host');
      if (!m) { return; }
      var p = c._pid !== undefined ? self.players[c._pid] : null;
      if (p) { p.lastSeen = Date.now(); }
      if (m.type === 'pong') { return; }
      if (m.type === 'rleave' && p && !self.locked) { self._remove(p); return; }   // salió del lobby: libera su lugar de inmediato
      if (m.type === 'rhello') {
        if (p) { return; }
        bound = true; clearTimeout(kill);
        self._onHello(c, m);
        return;
      }
      if (p && p.conn === c) { self.emit('message', m, p.id); }
    });
    var lost = function () { clearTimeout(kill); self._onConnClose(c); };
    c.on('close', lost); c.on('error', lost);
  };

  Net.prototype._onHello = function (c, m) {
    var self = this, k, ex = null;
    for (k in this.players) { if (this.players[k].sid === m.sid && !this.players[k].host) { ex = this.players[k]; } }
    if (!ex && this.locked) {                      // sin token conocido: coincidencia de nombre con alguien desconectado
      for (k in this.players) {
        var q = this.players[k];
        if (!q.host && (q.disc || !q.conn) && String(q.alias).toLowerCase() === String(m.alias).toLowerCase()) { ex = q; ex.sid = m.sid; break; }
      }
    }
    if (ex) {                                       // reconexión del mismo invitado
      if (ex.timer) { clearTimeout(ex.timer); ex.timer = null; }
      if (ex.conn && ex.conn !== c) { try { ex.conn.close(); } catch (e) { /* ignorar */ } }
      ex.conn = c; ex.disc = false; ex.lastSeen = Date.now(); c._pid = ex.id;
      this._send(c, { type: 'race-lobby', you: ex.id, players: this.lobby() });
      this.emit('rejoin', ex.id);
      return;
    }
    if (this.locked) {
      this._send(c, { type: 'race-closed', reason: 'started' });
      setTimeout(function () { try { c.close(); } catch (e) { /* ignorar */ } }, 300);
      return;
    }
    if (this._count() >= MAX_PLAYERS) {
      this._send(c, { type: 'race-full' });
      setTimeout(function () { try { c.close(); } catch (e) { /* ignorar */ } }, 300);
      return;
    }
    var p = { id: this.nextId++, alias: this._uniqueAlias(m.alias), sid: m.sid, conn: c, host: false, disc: false, timer: null, lastSeen: Date.now() };
    this.players[p.id] = p; c._pid = p.id;
    this._pushLobby();
    self.emit('joined', p.id);
  };

  Net.prototype._onConnClose = function (c) {
    var self = this;
    if (this.closed || c._pid === undefined) { return; }
    var p = this.players[c._pid];
    if (!p || p.conn !== c) { return; }
    p.conn = null;
    if (!this.locked) { delete this.players[p.id]; this._pushLobby(); return; }   // en el lobby: simplemente se va
    p.disc = true;
    this.emit('disc', p.id);
    p.timer = setTimeout(function () { if (p.disc) { self.emit('dropped', p.id); } }, DROP_MS);
  };

  // Nombre único dentro de la sala: si ya existe "AAA", el nuevo pasa a "AAA (2)", "AAA (3)"…
  Net.prototype._uniqueAlias = function (alias) {
    var self = this;
    function taken(a) {
      return Object.keys(self.players).some(function (k) { return String(self.players[k].alias).toLowerCase() === a.toLowerCase(); });
    }
    if (!taken(alias)) { return alias; }
    for (var n = 2; n < 20; n++) {
      var suf = ' (' + n + ')', cand = alias.slice(0, Math.max(1, 12 - suf.length)).replace(/\s+$/, '') + suf;
      if (!taken(cand)) { return cand; }
    }
    return alias;
  };

  // Quita a un jugador del lobby (salió o se cayó): libera su cupo y actualiza la lista de todos.
  Net.prototype._remove = function (p) {
    if (!this.players[p.id] || p.host) { return; }
    delete this.players[p.id];
    if (p.timer) { clearTimeout(p.timer); }
    var c = p.conn; p.conn = null;
    if (c) { setTimeout(function () { try { c.close(); } catch (e) { /* ignorar */ } }, 200); }
    this._pushLobby();
  };

  // Latido del Host: ping a todos los conectados; sin ninguna señal durante demasiado tiempo = conexión muerta
  // (un navegador cerrado de golpe no siempre dispara 'close').
  Net.prototype._beat = function () {
    var self = this, now = Date.now();
    if (this.closed) { return; }
    Object.keys(this.players).forEach(function (k) {
      var p = self.players[k];
      if (p.host || !p.conn) { return; }
      if (now - (p.lastSeen || now) > (self.locked ? SILENT_RACE : SILENT_LOBBY)) {
        var c = p.conn;
        try { c.close(); } catch (e) { /* ignorar */ }
        self._onConnClose(c);
        return;
      }
      self._send(p.conn, { type: 'ping' });
    });
  };

  Net.prototype._tick = function () {
    var self = this;
    if (this.closed) { return; }
    this._hbT = setTimeout(function () { self._beat(); self._tick(); }, this.locked ? HB_RACE_MS : HB_LOBBY_MS);
  };

  // Cerrar la pestaña avisa a los demás: el invitado sale de la lista; si es el Host, la sala se cierra.
  Net.prototype._bindUnload = function () {
    var self = this;
    if (typeof root.addEventListener !== 'function' || this._onUnload) { return; }
    this._onUnload = function (ev) {
      if (ev && ev.type === 'pagehide' && ev.persisted) { return; }   // la página solo pasó a caché (segundo plano): no es un cierre
      if (self.closed) { return; }
      if (self.role === 'host') { self.broadcast({ type: 'race-closed', reason: 'host-quit' }); }
      else { self._send(self.conn, { type: 'race-leave' }); }
    };
    root.addEventListener('beforeunload', this._onUnload);
    root.addEventListener('pagehide', this._onUnload);   // navegadores móviles: cerrar Chrome / Safari dispara pagehide, no beforeunload
  };

  /** Host: cierra el lobby (empezó la carrera). */
  Net.prototype.lock = function () { this.locked = true; };
  Net.prototype.send = function (id, msg) { var p = this.players[id]; return !!(p && this._send(p.conn, msg)); };
  Net.prototype.broadcast = function (msg) {
    var self = this;
    Object.keys(this.players).forEach(function (k) { var p = self.players[k]; if (p.conn) { self._send(p.conn, msg); } });
  };
  /** Host: envía un mensaje final a todos y cierra 150 ms después. */
  Net.prototype.finish = function (msg) {
    var self = this;
    this.broadcast(msg);
    setTimeout(function () { self.close(); }, 150);
  };

  /* --- Invitado --- */
  Net.prototype._openGuest = function () {
    var self = this, peer;
    try { peer = this._mkPeer(undefined); } catch (e) { this.emit('error', 'unsupported'); return; }
    this.peer = peer;
    this._bindUnload();
    peer.on('open', function () { if (self.peer === peer && !self.closed) { self._connect(); } });
    peer.on('disconnected', function () { if (self.peer === peer && !self.closed) { try { peer.reconnect(); } catch (e) { /* ignorar */ } } });
    peer.on('error', function (err) {
      if (self.peer !== peer || self.closed) { return; }
      var t = err && err.type;
      if (t === 'peer-unavailable') { self.emit('error', 'not-found'); return; }
      if (t === 'browser-incompatible' || t === 'invalid-id') { self.emit('error', 'unsupported'); }
    });
    this._timers.connect = setTimeout(function () { if (!self._gotLobby && !self.closed) { self.emit('error', 'timeout'); } }, 20000);
  };

  Net.prototype._connect = function () {
    var self = this, conn;
    if (this.closed || !this.peer) { return; }
    try { conn = this.peer.connect(prefix() + this.code, { reliable: true }); } catch (e) { this.emit('error', 'network'); return; }
    this.conn = conn;
    conn.on('open', function () {
      if (self.conn !== conn || self.closed) { return; }
      self._send(conn, { type: 'rhello', alias: self.alias, sid: self.sid });
    });
    conn.on('data', function (raw) {
      if (self.conn !== conn || self.closed) { return; }
      var m = sanitize(raw, 'guest');
      if (!m) { return; }
      self._conns = 0;
      if (m.type === 'ping') { self._send(conn, { type: 'pong' }); return; }
      if (m.type === 'race-lobby') { self._gotLobby = true; clearTimeout(self._timers.connect); }
      if (m.type === 'race-finish' || m.type === 'race-closed' || m.type === 'race-full') { self.ended = true; }
      self.emit('message', m);
    });
    var lost = function () {
      if (self.conn !== conn || self.closed || self.ended) { return; }
      self.conn = null;
      if (++self._conns > GUEST_TRIES) { self.emit('closed', 'lost'); return; }
      self.emit('reconnecting');
      if (self.peer && self.peer.disconnected) { try { self.peer.reconnect(); } catch (e) { /* ignorar */ } }
      setTimeout(function () { self._connect(); }, 1500);
    };
    conn.on('close', lost); conn.on('error', lost);
  };

  /** Invitado: envía un mensaje al Host. */
  Net.prototype.sendHost = function (msg) { return this._send(this.conn, msg); };
  Net.prototype.isOnline = function () { return !!(this.conn && this.conn.open); };

  Net.prototype.close = function () {
    if (this.closed) { return; }
    this.closed = true;
    var self = this;
    Object.keys(this._timers).forEach(function (k) { clearTimeout(self._timers[k]); });
    if (this._hbT) { clearTimeout(this._hbT); this._hbT = null; }
    this._hb = false;
    if (this._onUnload && typeof root.removeEventListener === 'function') { try { root.removeEventListener('beforeunload', this._onUnload); root.removeEventListener('pagehide', this._onUnload); } catch (e) { /* ignorar */ } }
    Object.keys(this.players).forEach(function (k) {
      var p = self.players[k];
      if (p.timer) { clearTimeout(p.timer); }
      if (p.conn) { try { p.conn.close(); } catch (e) { /* ignorar */ } }
    });
    if (this.conn) { try { this.conn.close(); } catch (e) { /* ignorar */ } }
    var peer = this.peer;
    this.peer = null; this.conn = null;
    setTimeout(function () { if (peer) { try { peer.destroy(); } catch (e) { /* ignorar */ } } }, 300);
  };

  return {
    MAX_PLAYERS: MAX_PLAYERS, MIN_PLAYERS: MIN_PLAYERS,
    available: function () { return !!Ctor() && !!C(); },
    createHost: function (opts) { return new Net('host', opts); },
    join: function (code, opts) {
      var c = C() && C().normalizeCode(code);
      if (!c || !C().isValidCode(c)) { throw new RangeError('Código de sala inválido.'); }
      opts = opts || {};
      return new Net('guest', { alias: opts.alias, code: c, sid: opts.sid });
    },
    rank: rank,
    sanitize: sanitize
  };
}));
