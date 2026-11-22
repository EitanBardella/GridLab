// Auditoría automática de GridLab (Etapa 4). Uso:  node tests/audit.mjs
// 1) Sincronización de versión  2) Integridad de las lecciones de Técnicas  3) Generadores de variantes.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const require = createRequire(import.meta.url);
const E = require(path.join(root, 'engine.js'));
const K = require(path.join(root, 'killer-engine.js'));

let failures = 0, warnings = 0;
const section = t => console.log('\n== ' + t);
const ok = m => console.log('  ✓ ' + m);
const fail = m => { failures++; console.log('  ✗ ' + m); return false; };
const warn = m => { warnings++; console.log('  ! ' + m); return false; };

/* ---------- 1. Versión ---------- */
section('1. Sincronización de versión');
{
  const before = failures;
  const sw = read('sw.js'), app = read('app.js'), html = read('index.html');
  const cache = (sw.match(/CACHE_NAME\s*=\s*'([^']+)'/) || [])[1];
  const bSw = (sw.match(/const BUILD\s*=\s*'([^']+)'/) || [])[1];
  const bApp = (app.match(/const BUILD\s*=\s*'([^']+)'/) || [])[1];
  cache && /\d/.test(cache) ? ok('CACHE_NAME = ' + cache) : fail('CACHE_NAME ausente o sin número en sw.js');
  bSw && bSw === bApp ? ok('BUILD coincide en sw.js y app.js (' + bSw + ')') : fail('BUILD distinto: sw.js=' + bSw + ' app.js=' + bApp);
  // Los ?v= de los archivos propios deben usar el BUILD (los de terceros y los datos del tutorial tienen su propia marca).
  const own = ['style.css', 'tutorial.css', 'sound.js', 'engine.js', 'killer-engine.js', 'duel.js', 'coop.js', 'race.js', 'tutorial-transform.js', 'app.js'];
  if (!sw.includes("'./tutorial-transform.js'")) fail('tutorial-transform.js no está en ASSETS de sw.js');
  own.forEach(f => {
    const m = html.match(new RegExp('(?:href|src)="' + f.replace('.', '\\.') + '\\?v=([^"]+)"'));
    if (!m) fail(f + ' no tiene ?v= en index.html');
    else if (m[1] !== bSw) fail(f + '?v=' + m[1] + ' ≠ ' + bSw);
  });
  if (failures === before) ok('?v= de los archivos propios alineado con ' + bSw);
  const cl = (app.match(/const CHANGELOG = \[\s*\{\s*v:\s*'([^']+)'/) || [])[1];
  cl === bSw ? ok('CHANGELOG abre con la versión actual') : fail('la primera entrada del CHANGELOG (' + cl + ') no es ' + bSw);
}

/* ---------- 2. Técnicas ---------- */
section('2. Integridad de Técnicas');
const variantArg = (mode, regions) => mode === 'jigsaw' ? { name: 'jigsaw', regions } : mode;
const toBoard = flat => Array.from({ length: 9 }, (_, r) => flat.slice(r * 9, r * 9 + 9));
const digits = s => Array.from({ length: 81 }, (_, i) => { const c = String(s || '').charAt(i); return c >= '1' && c <= '9' ? +c : 0; });
const engCages = cages => cages.map((c, id) => ({ id, sum: c.sum, cells: c.cells.map(i => [Math.floor(i / 9), i % 9]) }));
function countSolutions(mode, grid, regions, cages) {
  const board = toBoard(grid);
  if (mode === 'killer' && cages && cages.length) return K.countKillerSolutions(engCages(cages), board, 2);
  return E.countSolutions(board, 2, variantArg(mode, regions));
}
function checkBoard(label, o, needUnique) {
  const mode = o.mode || 'classic';
  const grid = digits(o.grid);
  if (String(o.grid || '').length !== 81) return fail(label + ': grid no tiene 81 caracteres');
  if (mode === 'jigsaw' && !(o.regions && o.regions.length === 81)) return fail(label + ': Jigsaw sin regiones');
  if (mode === 'killer') {
    if (!(o.cages && o.cages.length)) return needUnique ? fail(label + ': Killer sin jaulas') : true;
    const seen = new Set(); let bad = false;
    o.cages.forEach(c => c.cells.forEach(i => { if (seen.has(i) || i < 0 || i > 80) bad = true; seen.add(i); }));
    if (bad || seen.size !== 81) return fail(label + ': las jaulas no cubren las 81 celdas exactamente una vez');
  } else {
    const cf = E.getConflicts(toBoard(grid), variantArg(mode, o.regions));
    if (cf && cf.length) return fail(label + ': el tablero inicial tiene conflictos');
  }
  const n = countSolutions(mode, grid, o.regions, o.cages);
  if (n === 0) return fail(label + ': sin solución');
  if (n > 1) return needUnique ? fail(label + ': solución NO única') : (warn(label + ': varias soluciones (ejemplo demostrativo)'), true);
  if (o.solution) {
    const sol = digits(o.solution);
    if (sol.some(v => !v) || grid.some((v, i) => v && v !== sol[i])) return fail(label + ': `solution` incompatible con las pistas');
    const solved = mode === 'killer' ? K.solveKiller(engCages(o.cages), toBoard(grid)) : E.solve(toBoard(grid), variantArg(mode, o.regions));
    if (!solved || solved.flat().join('') !== sol.join('')) return fail(label + ': `solution` ≠ solución del solver');
  }
  return true;
}
function checkSteps(label, steps) {
  if (!Array.isArray(steps) || !steps.length) return fail(label + ': sin pasos');
  const cell = i => Number.isInteger(i) && i >= 0 && i <= 80;
  const cellMap = m => !m || Object.keys(m).every(k => cell(+k) && Array.isArray(m[k]) && m[k].every(d => d >= 1 && d <= 9));
  steps.forEach((s, i) => {
    const L = label + ' paso ' + (i + 1);
    if (!s || typeof s.text !== 'string' || !s.text.trim()) return fail(L + ': sin texto');
    ['hl', 'rel', 'src', 'same', 'no'].forEach(k => { if (s[k] && !(Array.isArray(s[k]) && s[k].every(cell))) fail(L + ': `' + k + '` con celdas inválidas'); });
    ['show', 'strike', 'keep'].forEach(k => { if (!cellMap(s[k])) fail(L + ': `' + k + '` inválido'); });
    if (s.place && !Object.keys(s.place).every(k => cell(+k) && s.place[k] >= 1 && s.place[k] <= 9)) fail(L + ': `place` inválido');
  });
}
function checkGoal(label, pr) {
  const g = pr.goal;
  if (!g) return fail(label + ': sin goal');
  const cellDig = x => Array.isArray(x) && Number.isInteger(x[0]) && x[0] >= 0 && x[0] <= 80 && x[1] >= 1 && x[1] <= 9;
  if (!g.place && !g.elimSets) return fail(label + ': goal sin `place` ni `elimSets`');
  if (g.place && !(g.place.length && g.place.every(cellDig))) fail(label + ': goal.place inválido');
  if (g.elimSets && !(g.elimSets.length && g.elimSets.every(s => s.length && s.every(cellDig)))) fail(label + ': goal.elimSets inválido');
  const grid = digits(pr.grid), sol = pr.solution ? digits(pr.solution) : null;
  if (g.place) g.place.forEach(([i, d]) => {
    if (grid[i]) fail(label + ': goal.place apunta a una celda ya dada (' + i + ')');
    if (sol && sol[i] !== d) fail(label + ': goal.place (' + i + '=' + d + ') contradice la solución');
  });
}
{
  const before = failures;
  const sandbox = { window: { TUTORIAL_PATHS: {} } }; sandbox.self = sandbox.window; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const files = fs.readdirSync(root).filter(f => /^tutorial-data.*\.js$/.test(f)).sort();
  files.forEach(f => { try { vm.runInContext(read(f), sandbox, { filename: f }); } catch (e) { fail(f + ' no se pudo evaluar: ' + e.message); } });
  const paths = sandbox.window.TUTORIAL_PATHS || {};
  const lessons = [];
  Object.keys(paths).forEach(v => ((paths[v] && paths[v].chapters) || []).forEach(ch => (ch.lessons || []).forEach(ls => lessons.push({ v, ch, ls }))));
  // Muestras integradas en tutorial.js (const S = {...}): ejemplos y prácticas de las primeras lecciones.
  const sm = read('tutorial.js').match(/const S = (\{.*\});/);
  const builtin = sm ? JSON.parse(sm[1]) : {};
  console.log('  ' + files.length + ' archivos de datos · ' + lessons.length + ' lecciones · ' + Object.keys(builtin).length + ' muestras integradas');
  const ids = new Set();
  lessons.forEach(({ v, ch, ls }) => {
    const L = v + '/' + ch.id + '/' + ls.id;
    if (ids.has(L)) fail(L + ': ID duplicado');
    ids.add(L);
    if (!ls.id || !ls.title) fail(L + ': falta id o título');
    if (!ls.theory || !ls.theory.what) fail(L + ': teoría incompleta');
    if (ls.example) { if (checkBoard(L + ' [ejemplo]', ls.example, false)) checkSteps(L + ' [ejemplo]', ls.example.steps); }
    else warn(L + ': sin ejemplo');
    if (ls.practice) { if (checkBoard(L + ' [práctica]', ls.practice, true)) checkGoal(L + ' [práctica]', ls.practice); }
    else warn(L + ': sin práctica');
  });
  Object.keys(builtin).forEach(k => {
    if (/_ex$/.test(k)) { if (checkBoard('integrada ' + k, builtin[k], false)) checkSteps('integrada ' + k, builtin[k].steps); }
    else if (/_pr$/.test(k)) { if (checkBoard('integrada ' + k, builtin[k], true)) checkGoal('integrada ' + k, builtin[k]); }
  });
  if (failures === before) ok('todas las lecciones y ejercicios pasan');

  // Entrenamiento: los tableros transformados (8 simetrías × permutación de dígitos cuando se permite) siguen siendo válidos.
  const TT = require(path.join(root, 'tutorial-transform.js'));
  const b2 = failures; let checked = 0, withDigits = 0, withGeom = 0;
  lessons.forEach(({ v, ch, ls }) => {
    if (!ls.practice) return;
    const pr = ls.practice, L = v + '/' + ch.id + '/' + ls.id + ' [transformada]';
    const text = ((pr.goal && pr.goal.text) || '') + ' ' + (pr.hint || '');
    const mode = pr.mode || 'classic';
    const perm = TT.canDigits(mode, text) ? [0, 3, 1, 9, 5, 7, 2, 8, 4, 6] : null;
    if (perm) withDigits++;
    if (TT.canGeom(text)) withGeom++;
    for (let g = 0; g < 8; g++) {
      const t = TT.apply(pr, { geom: g, perm });
      checked++;
      if (checkBoard(L + ' g' + g, t, true)) checkGoal(L + ' g' + g, t);
      if (pr.hintCells && t.hintCells.length !== pr.hintCells.length) fail(L + ': hintCells perdidas');
    }
  });
  if (failures === b2) ok(checked + ' variantes transformadas válidas (' + withGeom + ' lecciones admiten giros/espejos, ' + withDigits + ' permutación de dígitos)');
}

/* ---------- 3. Generadores ---------- */
section('3. Generadores de variantes');
{
  const N = Number(process.env.AUDIT_SAMPLES || 2), before = failures;
  ['classic', 'killer', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw'].forEach(v => {
    const t0 = Date.now();
    for (let s = 1; s <= N; s++) {
      const L = v + ' semilla ' + s;
      try {
        const r = v === 'killer' ? K.generateKillerPuzzle('facil', { seed: 1000 + s }) : E.generatePuzzle('facil', { variant: v, seed: 1000 + s });
        const puzzle = r.puzzle || r.board, sol = r.solution;
        if (!puzzle || !sol) { fail(L + ': resultado sin puzzle/solution'); continue; }
        const va = variantArg(v, r.regions);
        if (v === 'killer') {
          if (!K.hasUniqueKillerSolution(r.cages, puzzle)) fail(L + ': solución no única');
          const solved = K.solveKiller(r.cages, puzzle);
          if (!solved || solved.flat().join('') !== sol.flat().join('')) fail(L + ': la solución no coincide con el solver');
        } else {
          if (E.getConflicts(puzzle, va).length) fail(L + ': el puzzle tiene conflictos');
          if (!E.hasUniqueSolution(puzzle, va)) fail(L + ': solución no única');
          if (E.getConflicts(sol, va).length || sol.flat().some(x => !x)) fail(L + ': la solución es inválida');
        }
        if (puzzle.flat().some((x, i) => x && x !== sol.flat()[i])) fail(L + ': las pistas contradicen la solución');
      } catch (e) { fail(L + ': excepción ' + e.message); }
    }
    console.log('  · ' + v + ': ' + N + ' tableros en ' + (Date.now() - t0) + ' ms');
  });
  if (failures === before) ok('todos los tableros generados son válidos y de solución única');
}

console.log('\n' + (failures ? '✗ ' + failures + ' fallo(s)' : '✓ Auditoría en verde') + (warnings ? ' (' + warnings + ' aviso(s))' : ''));
process.exit(failures ? 1 : 0);
