/* =====================================================================
   Efectos de sonido sintetizados (sound.js)
   100 % Web Audio API: cero archivos externos, funciona sin conexión.
   API:  Sound.play(nombre)   tap | note | correct | error | line | win | lose | beep
         Sound.enabled()      ¿están activados? (por defecto sí)
         Sound.setEnabled(b)  guarda la preferencia en localStorage (y suena un "bip" de prueba al activar)
   Nunca lanza errores: si el navegador no soporta audio, simplemente calla.

   Desbloqueo: los navegadores (Safari/iOS sobre todo) solo permiten arrancar el audio dentro de un gesto
   del usuario. Por eso el AudioContext se crea y se reanuda (resume) de forma SÍNCRONA en el primer
   pointerdown / touchstart / touchend / click / keydown, y se reproduce un búfer silencioso para "abrir"
   la salida de audio. Los listeners siguen activos hasta que el contexto está realmente en 'running'.
   ===================================================================== */
(function () {
  'use strict';
  var KEY = 'sudoku.sound.v1';
  var on = true;
  try { on = window.localStorage.getItem(KEY) !== '0'; } catch (e) { /* modo privado */ }

  var ctx = null, master = null;

  function create() {
    if (ctx) { return ctx; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return null; }
    try {
      ctx = new AC();
      // Compresor al final de la cadena: permite subir el volumen sin que los acordes saturen.
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  // Abre la salida de audio: reanuda el contexto y reproduce un búfer de 1 muestra (truco de iOS).
  function unlockNow() {
    if (!create()) { return; }
    try { if (ctx.state !== 'running') { ctx.resume(); } } catch (e) { /* ignorar */ }
    try {
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    } catch (e) { /* ignorar */ }
  }

  // Una nota con envolvente suave (ataque de 6 ms, caída exponencial): sin clics ni cortes bruscos.
  function tone(freq, at, dur, opt) {
    opt = opt || {};
    var t0 = ctx.currentTime + 0.01 + at;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) { o.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur); }
    var peak = opt.gain || 0.25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var out = g;
    if (opt.lp) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = opt.lp;
      g.connect(f); out = f;
    }
    o.connect(g);
    out.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  var N = { C4: 261.63, E4: 329.63, G4: 392, C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.5 };

  // Ganancias audibles (0.15 – 0.35 por voz); el compresor se ocupa de que las capas no saturen.
  var SOUNDS = {
    beep:    function () {
      tone(880, 0, 0.1, { gain: 0.3 });
      tone(1175, 0.09, 0.14, { gain: 0.3 });
    },
    tap:     function () { tone(560, 0, 0.06, { gain: 0.2 }); },
    note:    function () { tone(1150, 0, 0.05, { type: 'triangle', gain: 0.2 }); },
    correct: function () {
      tone(N.E5, 0, 0.12, { gain: 0.28 });
      tone(N.G5, 0.07, 0.2, { gain: 0.28 });
    },
    error:   function () { tone(220, 0, 0.3, { type: 'triangle', to: 140, gain: 0.35, lp: 1100 }); },
    line:    function () {
      tone(N.C5, 0, 0.16, { gain: 0.26 });
      tone(N.E5, 0.09, 0.16, { gain: 0.26 });
      tone(N.G5, 0.18, 0.3, { gain: 0.28 });
    },
    win:     function () {
      [N.C5, N.E5, N.G5, N.C6].forEach(function (f, i) { tone(f, i * 0.12, 0.32, { gain: 0.27 }); });
      [N.C5, N.E5, N.G5, N.C6].forEach(function (f) { tone(f, 0.52, 0.9, { gain: 0.15, type: 'triangle' }); });
      tone(N.E6, 0.52, 0.9, { gain: 0.1 });
    },
    lose:    function () {
      tone(N.G4, 0, 0.24, { type: 'triangle', gain: 0.3, lp: 1400 });
      tone(N.E4, 0.2, 0.24, { type: 'triangle', gain: 0.3, lp: 1400 });
      tone(N.C4, 0.4, 0.44, { type: 'triangle', gain: 0.32, lp: 1400 });
    }
  };

  var api = {
    play: function (name) {
      try {
        var fn = SOUNDS[name];
        if (!on || !fn || !create()) { return; }
        if (ctx.state === 'running') { fn(); return; }
        // Contexto aún suspendido: se reanuda y se reproduce en cuanto esté listo.
        var p = ctx.resume();
        if (p && p.then) { p.then(function () { if (on) { fn(); } }, function () { /* sin permiso: calla */ }); }
        else { fn(); }
      } catch (e) { /* el audio nunca debe romper el juego */ }
    },
    enabled: function () { return on; },
    setEnabled: function (v) {
      on = !!v;
      try { window.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* ignorar */ }
      if (on) { unlockNow(); api.play('beep'); }   // bip de prueba: confirma que suena
    }
  };
  window.Sound = api;

  // Primer gesto del usuario: crea y reanuda el contexto de forma síncrona. Los listeners (en captura, para
  // ir antes que cualquier otro) se mantienen hasta que el audio está realmente en marcha.
  var EVENTS = ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
  function unlock() {
    if (on) { unlockNow(); }
    if (ctx && ctx.state === 'running') {
      EVENTS.forEach(function (ev) { document.removeEventListener(ev, unlock, true); });
    }
  }
  EVENTS.forEach(function (ev) { document.addEventListener(ev, unlock, true); });
}());
