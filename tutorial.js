/* =====================================================================
   Tutorial y Rutas de Aprendizaje — motor (tutorial.js)  ·  v tut-v4
   ---------------------------------------------------------------------
   Estructura de pantallas:
     hub      Pantalla principal con 2 tarjetas:
                1. Cómo jugar (reglas, rutina segura y errores comunes)
                2. Técnicas (rutas de maestría con mapa SVG)
     guide    Cómo jugar: selector Clásico / Killer / Diagonal / Anti-Caballo /
              Sin Consecutivos / Jigsaw / Duelos y Co-op. Cada guía: encabezado, ejemplo guiado paso a paso,
              "3 reglas", "rutina segura", "errores comunes" y mini-comprobación.
     map      Técnicas: mapa SVG por variante (classic, killer, diagonal, antiknight)
     lesson   Lección (teoría + ejemplo paso a paso)
     practice Tablero de práctica

   Los DATOS masivos de las técnicas viven en archivos aparte que se registran
   solos en el registro global:

     window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {};
     window.TUTORIAL_PATHS.classic = { chapters: [ <capítulo>, ... ] };

   Variantes válidas: classic | killer | diagonal | antiknight
   (el orden de carga de los <script> no importa: el motor lee el
   registro al abrir el tutorial).

   <capítulo>  = { id:'c3', title:'Tríos y cuartetos', blurb:'...', lessons:[ <lección>, ... ] }
     - `id` debe coincidir con una casilla del mapa (ver META más abajo):
       classic c1–c6 (38 técnicas), killer k1–k4 (12 técnicas),
       diagonal d1–d2, antiknight a1–a2.
       Si coincide con un capítulo de muestra, lo reemplaza.
     - Cada capítulo reserva `planned` casillas (técnicas previstas). Mientras
       falten lecciones se muestran como "Próximamente" y el avance se mide
       contra el total previsto (p. ej. 38 en Clásico, 12 en Killer).
   <lección>   = {
       id:'x-wing', title:'X-Wing', short:'Dos líneas, un número',
       theory:{ what:'', detect:'', why:'', faq:[{q:'',a:''}, ...] },
       example:{ mode:'classic', grid:'81 dígitos (0 = vacía)', cages:[{sum:10,cells:[0,1]}],
                 steps:[ <paso>, ... ] },
       practice:{ mode:'classic', grid:'...', solution:'81 dígitos (opcional)', cages:[...],
                  notes:'auto' | 'none',
                  goal:{ text:'', place:[[celda,dígito],...]          // vale cualquiera
                              | elimSets:[ [[celda,dígito],...], ...] },// vale cualquier set completo
                  hint:'', hintCells:[celda,...] }
     }
   <paso>      = { text:'', hl:[celdas clave], rel:[casa o zona], src:[celdas origen],
                   same:[celdas con el mismo dígito], no:[celdas bloqueadas ✕],
                   show:{celda:[candidatos]}, strike:{celda:[tachados en rojo]},
                   keep:{celda:[candidatos resaltados]}, place:{celda:dígito} }
     Las celdas se numeran 0–80 (fila*9 + columna). `place` es acumulativo.
   ===================================================================== */
(function () {
  'use strict';

  window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {};

  /* =====================================================================
     0. AYUDAS PARA ARMAR CASILLAS (filas, columnas, bloques, diagonales, caballo)
     ===================================================================== */
  const A9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const range9 = f => Array.from({ length: 9 }, (_, k) => f(k));
  const rowCells = r => range9(k => r * 9 + k);
  const colCells = c => range9(k => k * 9 + c);
  const boxCells = b => {
    const r0 = Math.floor(b / 3) * 3, c0 = (b % 3) * 3, out = [];
    for (let a = 0; a < 3; a++) for (let d = 0; d < 3; d++) out.push((r0 + a) * 9 + c0 + d);
    return out;
  };
  const DIAG1 = range9(k => k * 10);        // diagonal principal ↘
  const DIAG2 = range9(k => k * 8 + 8);     // diagonal secundaria ↙
  const uniq = arrs => Array.from(new Set([].concat.apply([], arrs)));
  const KMOVES = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  function knightCells(i) {
    const r = Math.floor(i / 9), c = i % 9, out = [];
    KMOVES.forEach(m => { const rr = r + m[0], cc = c + m[1]; if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) out.push(rr * 9 + cc); });
    return out.sort((a, b) => a - b);
  }
  const strikeOf = (cell, list) => { const o = {}; o[cell] = list; return o; };

  /* =====================================================================
     1. DATOS DE MUESTRA (2 capítulos reales para la ruta Clásica)
     ===================================================================== */
  const S = {"ns_ex":{"mode":"classic","grid":"080005002300402000602870040000260153020090080006008000800050600003020008265004700","steps":[{"text":"Tomemos la celda marcada (F5C7). Para saber qué número lleva, descartamos los que ya aparecen en su fila, su columna y su bloque.","hl":[42],"rel":[6,15,24,33,34,35,36,37,38,39,40,41,42,43,44,51,52,53,60,69,78]},{"text":"Arrancamos con la fila 5: ya están el 2, 8 y 9, así que esta celda no puede llevarlos. Los tachamos.","hl":[42],"src":[37,40,43],"show":{"42":[1,2,3,4,5,6,7,8,9]},"strike":{"42":[2,8,9]}},{"text":"Seguimos con la columna 7: ya están el 1, 6 y 7, así que esta celda no puede llevarlos. Los tachamos.","hl":[42],"src":[33,60,78],"show":{"42":[1,2,3,4,5,6,7,8,9]},"strike":{"42":[1,2,6,7,8,9]}},{"text":"Por último, miramos el bloque central derecho: ya están el 3 y 5, así que esta celda no puede llevarlos. Los tachamos.","hl":[42],"src":[34,35],"show":{"42":[1,2,3,4,5,6,7,8,9]},"strike":{"42":[1,2,3,5,6,7,8,9]}},{"text":"Tras descartar fila, columna y bloque, solo sobrevive el 4. Una celda con un único candidato posible se llama Único desnudo (Naked Single).","hl":[42],"show":{"42":[1,2,3,4,5,6,7,8,9]},"strike":{"42":[1,2,3,5,6,7,8,9]},"keep":{"42":[4]}},{"text":"Colocamos el 4 en F5C7. Sin adivinar: era la única opción que respetaba las reglas.","hl":[42],"place":{"42":4}}]},"hs_ex":{"mode":"classic","grid":"607198004000500009000430006020000070001000002000010403083001065100680900046905080","steps":[{"text":"Ahora no miramos una celda, sino un número. Busquemos dónde puede ir el 4 dentro del bloque inferior derecho (marcado). Resaltamos los 4 ya colocados en el tablero.","rel":[60,61,62,69,70,71,78,79,80],"same":[8,21,51,73]},{"text":"Cada 4 resaltado en una fila bloquea a las celdas libres del bloque que comparten esa fila: ahí el 4 no puede ir (las marcamos con ✕).","rel":[60,61,62,69,70,71,78,79,80],"src":[73,73],"same":[8,21,51,73],"no":[78,80]},{"text":"Lo mismo ocurre con los 4 de las columnas: tachamos también las celdas del bloque que comparten columna con alguno.","rel":[60,61,62,69,70,71,78,79,80],"src":[8,51],"same":[8,21,51,73],"no":[60,71,78,80]},{"text":"Solo queda una celda libre en el bloque: F8C8. Aunque tenga otros candidatos (2, 3 y 4), el 4 del bloque no tiene otro lugar posible. Eso es un Único oculto (Hidden Single).","hl":[70],"rel":[60,61,62,69,70,71,78,79,80],"no":[60,71,78,80],"show":{"70":[2,3,4]},"keep":{"70":[4]}},{"text":"Colocamos el 4 en F8C8.","hl":[70],"place":{"70":4}}]},"np_ex":{"mode":"classic","grid":"659140070007080953300000460800050712000010000060009530000004000500270340002000005","steps":[{"text":"Trabajemos en la fila 3. Mostramos los candidatos de cada celda libre.","rel":[18,19,20,21,22,23,24,25,26],"show":{"19":[1,2,8],"20":[1,8],"21":[5,7,9],"22":[2,9],"23":[2,5,7],"26":[1,8]}},{"text":"Mirá F3C3 y F3C9: las dos tienen exactamente los mismos candidatos, el 1 y el 8. Es un Par desnudo (Naked Pair).","hl":[20,26],"rel":[18,19,20,21,22,23,24,25,26],"show":{"19":[1,2,8],"20":[1,8],"21":[5,7,9],"22":[2,9],"23":[2,5,7],"26":[1,8]},"keep":{"20":[1,8],"26":[1,8]}},{"text":"Si una de las dos celdas es 1, la otra tiene que ser 8 (y viceversa). Todavía no sabemos cuál es cuál, pero sí que el 1 y el 8 de la fila 3 están reservados para esas dos celdas.","hl":[20,26],"rel":[18,19,20,21,22,23,24,25,26],"show":{"19":[1,2,8],"20":[1,8],"21":[5,7,9],"22":[2,9],"23":[2,5,7],"26":[1,8]},"keep":{"20":[1,8],"26":[1,8]}},{"text":"Por eso ninguna otra celda de la fila 3 puede ser 1 ni 8: los tachamos en rojo (2 candidatos).","hl":[20,26],"rel":[18,19,20,21,22,23,24,25,26],"show":{"19":[1,2,8],"20":[1,8],"21":[5,7,9],"22":[2,9],"23":[2,5,7],"26":[1,8]},"strike":{"19":[1,8]},"keep":{"20":[1,8],"26":[1,8]}},{"text":"Mirá F3C2: después de la limpieza le queda un solo candidato, el 2. El par desnudo destrabó el tablero.","hl":[19,20,26],"rel":[18,19,20,21,22,23,24,25,26],"show":{"19":[2],"20":[1,8],"21":[5,7,9],"22":[2,9],"23":[2,5,7],"26":[1,8]},"keep":{"20":[1,8],"26":[1,8]}}]},"pp_ex":{"mode":"classic","grid":"000700000830004000001000098503000409090003010170940563004500020000610800900020000","steps":[{"text":"Miremos el bloque superior derecho (marcado) y solo un número: el 4. Mostramos únicamente dónde puede ir el 4 dentro del bloque.","rel":[6,7,8,15,16,17,24,25,26],"show":{"7":[4],"8":[4]}},{"text":"Todos los lugares posibles del 4 en este bloque están en la fila 1: F1C8 y F1C9. El 4 del bloque tiene que caer sí o sí en esa línea.","hl":[7,8],"rel":[0,1,2,3,4,5,6,7,8,15,16,17,24,25,26],"show":{"7":[4],"8":[4]}},{"text":"Como el 4 del bloque está en la fila 1, ningún otro 4 de esa línea puede estar fuera del bloque. Los candidatos 4 que había en el resto de la fila 1 (en rojo) sobran.","hl":[7,8],"rel":[0,1,2,3,4,5,6,7,8,15,16,17,24,25,26],"show":{"7":[4],"8":[4],"0":[4],"1":[4]},"strike":{"0":[4],"1":[4]}},{"text":"Eliminamos el 4 de 2 celdas sin colocar nada todavía. Esta técnica se llama Pares apuntadores (Pointing Pairs; con tres celdas, Pointing Triples).","hl":[7,8],"rel":[0,1,2,3,4,5,6,7,8,15,16,17,24,25,26],"show":{"7":[4],"8":[4]}}]},"ns_pr":{"mode":"classic","grid":"040070005620105000090064070005087200069000030080019040000000000006400000008020710","solution":"841273965627195483593864172435687291169542837782319546214738659976451328358926714","notes":"none","goal":{"text":"Encontrá una celda que tenga un único candidato posible y colocá su número.","place":[[41,2]]},"hint":"Elegí una celda vacía y descartá los números que ya están en su fila, columna y bloque. Si queda uno solo, es tuyo.","hintCells":[41]},"hs_pr":{"mode":"classic","grid":"508401700090580004060000000910020008000900007000804900009700103106040579080100400","solution":"528491736397586214461372895914627358852913647673854921249765183136248579785139462","notes":"none","goal":{"text":"Encontrá un número que solo pueda ir en una celda de su bloque, fila o columna, y colocalo.","place":[[24,8],[30,6],[36,8],[46,7],[61,8],[68,8]]},"hint":"Elegí un número y buscá un bloque, fila o columna donde todas las celdas libres menos una estén bloqueadas por ese mismo número.","hintCells":[24]},"np_pr":{"mode":"classic","grid":"030128040060000700810070200100309400900200800006407010000001020698700000070000030","solution":"739128546462593781815674293187359462943216875526487319354861927698732154271945638","notes":"auto","goal":{"text":"Hay un par desnudo en el tablero: tachá (en modo Notas) los candidatos que sobran en las demás celdas de su fila, columna o bloque.","elimSets":[[[28,5],[46,5]]]},"hint":"Buscá dos celdas de la misma fila, columna o bloque que tengan solo los mismos dos candidatos. Esos dos números no pueden estar en el resto de esa línea.","hintCells":[37,55]},"pp_pr":{"mode":"classic","grid":"670089000000034500000000000096002007500070109730000046000405002300020000004068070","solution":"673589214921734568485216793196842357548673129732951846817495632369127485254368971","notes":"auto","goal":{"text":"Buscá un número cuyos candidatos en un bloque estén todos en una misma fila o columna, y tachá ese número en el resto de la línea (modo Notas).","elimSets":[[[24,4],[26,4]],[[65,7]]]},"hint":"Mirá un bloque y un número: si sus candidatos caen todos en una sola fila o columna, el resto de esa línea no puede llevarlo.","hintCells":[18,19]}};

  const BUILTIN = {
    classic: [
      {
        id: 'c1', title: 'Fundamentos',
        blurb: 'Las dos deducciones que resuelven casi todos los tableros Fáciles y Medios.',
        lessons: [
          {
            id: 'naked-single', title: 'Único desnudo (Naked Single)', short: 'Una celda con un solo candidato posible',
            theory: {
              what: 'Es una celda vacía donde, después de descartar los números que ya aparecen en su fila, su columna y su bloque, queda un único candidato posible. No hay que adivinar: ese número es el que va.',
              detect: 'Buscá celdas con muchos vecinos llenos, por ejemplo una que cruce una fila y una columna casi completas. Fijate qué números faltan después de mirar fila, columna y bloque: si queda uno solo, lo encontraste.',
              why: 'Es la base de todo Sudoku: resuelve por completo los tableros Fáciles y, en los difíciles, aparece después de cada eliminación avanzada. Cada número que colocás descarta candidatos en su fila, columna y bloque, y eso encadena nuevos únicos.',
              faq: [
                { q: '¿Tengo que anotar candidatos para verlo?', a: 'No necesariamente. Con práctica alcanza con repasar los números de la fila, la columna y el bloque. Las notas ayudan cuando la celda tiene muchos vecinos y se te mezclan.' },
                { q: '¿En qué se diferencia del Único oculto?', a: 'En el desnudo la celda tiene un solo candidato. En el oculto la celda tiene varios, pero un número solo puede ir en esa celda dentro de su bloque, fila o columna.' },
                { q: '¿Y si una celda se queda sin candidatos?', a: 'Es señal de que hay un error antes: algún número colocado o tachado estaba mal. Usá Deshacer hasta volver a un estado correcto.' }
              ]
            },
            example: S.ns_ex, practice: S.ns_pr
          },
          {
            id: 'hidden-single', title: 'Único oculto (Hidden Single)', short: 'Un número con un solo lugar posible en su casa',
            theory: {
              what: 'Es un número que, dentro de un bloque, una fila o una columna, solo puede ir en una celda, aunque esa celda tenga otros candidatos. Cada casa necesita llevar los números del 1 al 9, así que si el lugar es único, el número va ahí.',
              detect: 'Elegí un número y un bloque donde todavía falte. Mirá qué filas y columnas ya contienen ese número: cada una bloquea las celdas que atraviesa. Si todas las celdas libres del bloque quedan bloqueadas menos una, ahí va. Repetí con filas y columnas.',
              why: 'Destraba los tableros donde ninguna celda tiene un único candidato. Mirar por número en lugar de por celda es el cambio de mirada más importante a partir del nivel Medio.',
              faq: [
                { q: '¿Por qué se llama "oculto"?', a: 'Porque la celda tiene varios candidatos y el número se esconde entre ellos. Recién se ve cuando mirás la casa completa.' },
                { q: '¿Funciona también en filas y columnas?', a: 'Sí, el razonamiento es idéntico con las tres casas: bloque, fila y columna.' },
                { q: '¿Por dónde conviene empezar?', a: 'Por los números que ya aparecen 6, 7 u 8 veces: dejan pocos lugares libres y suelen dar únicos ocultos enseguida.' }
              ]
            },
            example: S.hs_ex, practice: S.hs_pr
          }
        ]
      },
      {
        id: 'c2', title: 'Pares y apuntadores',
        blurb: 'Primeras eliminaciones puras: limpian candidatos y abren camino a nuevos únicos.',
        lessons: [
          {
            id: 'naked-pair', title: 'Par desnudo (Naked Pair)', short: 'Dos celdas, los mismos dos candidatos',
            theory: {
              what: 'Son dos celdas de una misma casa (fila, columna o bloque) que tienen exactamente los mismos dos candidatos. Esos dos números se reparten entre esas dos celdas, así que no pueden aparecer en ninguna otra celda de esa casa.',
              detect: 'Con las notas puestas, buscá celdas con solo dos candidatos y fijate si otra celda de la misma casa tiene el mismo par (por ejemplo 3-7 y 3-7). Después revisá el resto de la casa: si alguna otra celda tiene el 3 o el 7, ahí hay eliminaciones.',
              why: 'Limpia candidatos sin colocar números, y esa limpieza suele dejar únicos desnudos u ocultos. Es la primera técnica de eliminación pura y es clave desde el nivel Difícil.',
              faq: [
                { q: '¿Las dos celdas deben tener solo esos dos candidatos?', a: 'Sí. Si una de ellas tuviera un tercer candidato, el razonamiento ya no vale.' },
                { q: '¿Y si son tres celdas con tres números?', a: 'Es una extensión de la misma idea (trío desnudo): tres celdas que, entre todas, solo usan tres números.' },
                { q: '¿Sirve también en bloques?', a: 'Sí, en filas, columnas y bloques por igual.' }
              ]
            },
            example: S.np_ex, practice: S.np_pr
          },
          {
            id: 'pointing', title: 'Pares apuntadores (Pointing)', short: 'Un número en un bloque que apunta a una línea',
            theory: {
              what: 'Cuando, dentro de un bloque, todos los lugares posibles de un número están en la misma fila (o columna), ese número ya "apunta" a esa línea: tiene que estar en el bloque y en esa línea a la vez. Por eso se puede eliminar del resto de la línea, fuera del bloque.',
              detect: 'Mirá un bloque y un número a la vez, marcando solo ese candidato. Si todos los candidatos caen en una misma fila o columna (2 o 3 celdas), revisá esa línea fuera del bloque: ahí ese número se puede tachar.',
              why: 'Es la puerta a las técnicas de líneas: elimina candidatos a distancia y a menudo deja un Único oculto en otro bloque. Obliga a mirar el tablero por números, no por celdas.',
              faq: [
                { q: '¿En qué se diferencia del Par desnudo?', a: 'El par desnudo usa dos celdas y dos números dentro de una casa. Pointing usa un solo número y la intersección entre un bloque y una línea.' },
                { q: '¿Funciona al revés?', a: 'Sí: si en una fila todos los candidatos de un número caen dentro de un solo bloque, se tacha del resto del bloque. Eso se ve más adelante en la ruta.' },
                { q: '¿Cuántas celdas pueden apuntar?', a: 'Dos (Pointing Pair) o tres (Pointing Triple). Con una sola celda sería directamente un Único oculto.' }
              ]
            },
            example: S.pp_ex, practice: S.pp_pr
          }
        ]
      }
    ]
  };

  /* =====================================================================
     2. METADATOS DE LAS RUTAS (casillas del mapa por variante)
        `planned` = técnicas reservadas en cada capítulo (slots).
        Clásico: 2+4+6+7+9+10 = 38 · Killer: 2+3+4+3 = 12.
     ===================================================================== */
  const VARIANTS = ['classic', 'killer', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw'];           // mapas de técnicas
  const GUIDE_VARIANTS = ['classic', 'killer', 'diagonal', 'antiknight', 'nonconsecutive', 'jigsaw', 'duels']; // guías "Cómo jugar"
  const META = {
    classic: { label: 'Clásico', mode: 'classic', chapters: [
      { id: 'c1', title: 'Fundamentos', blurb: 'Último libre y Único desnudo.', planned: 2 },
      { id: 'c2', title: 'Pares y apuntadores', blurb: 'Único oculto, pares y Apuntadores.', planned: 4 },
      { id: 'c3', title: 'Tríos y cuartetos', blurb: 'Grupos desnudos y ocultos, Caja-Línea y X-Wing.', planned: 6 },
      { id: 'c4', title: 'Peces y alas', blurb: 'Peces avanzados y alas.', planned: 7 },
      { id: 'c5', title: 'Alas, unicidad y color', blurb: 'W-Wing, rectángulos únicos, BUG+1 y coloración.', planned: 9 },
      { id: 'c6', title: 'Cadenas y maestría', blurb: 'Peces con aleta, Sue de Coq y cadenas.', planned: 10 }
    ] },
    killer: { label: 'Killer', mode: 'killer', chapters: [
      { id: 'k1', title: 'Reglas de las jaulas', blurb: 'Sumas y dígitos sin repetir.', planned: 2 },
      { id: 'k2', title: 'Combinaciones únicas', blurb: 'Jaulas con una sola combinación.', planned: 3 },
      { id: 'k3', title: 'Innies y outies', blurb: 'Diferencias entre jaulas y casas.', planned: 4 },
      { id: 'k4', title: 'Maestría Killer', blurb: 'Regla del 45 y jaulas encadenadas.', planned: 3 }
    ] },
    diagonal: { label: 'Diagonal', mode: 'diagonal', chapters: [
      { id: 'd1', title: 'Las dos diagonales', blurb: 'Cómo cambian las reglas.' },
      { id: 'd2', title: 'Diagonales avanzadas', blurb: 'Eliminaciones que cruzan diagonales.' }
    ] },
    antiknight: { label: 'Anti-Caballo', mode: 'antiknight', chapters: [
      { id: 'a1', title: 'El salto del caballo', blurb: 'Qué celdas se "ven" entre sí.' },
      { id: 'a2', title: 'Eliminaciones a distancia', blurb: 'Candidatos que el caballo descarta.' }
    ] },
    nonconsecutive: { label: 'Sin Consecutivos', mode: 'nonconsecutive', chapters: [
      { id: 'n1', title: 'Vecinos que no se tocan', blurb: 'El 1 y el 9 aislados y los pares consecutivos.' }
    ] },
    jigsaw: { label: 'Jigsaw', mode: 'jigsaw', chapters: [
      { id: 'j1', title: 'Regiones irregulares', blurb: 'Región–línea y la Regla del 45 con formas libres.' }
    ] }
  };

  /* =====================================================================
     3. GUÍAS "CÓMO JUGAR" (una por variante + Duelos y Co-op)
     ===================================================================== */
  // --- Killer: jaula chica + Regla del 45 en la fila 1 (todo el ejemplo es coherente con una solución válida de la fila) ---
  const KILLER_EX = {
    mode: 'killer',
    grid: '0'.repeat(81),
    cages: [
      { sum: 14, cells: [0, 1, 2] }, { sum: 17, cells: [3, 4, 5] }, { sum: 11, cells: [6, 7] },
      { sum: 9, cells: [8, 17] }, { sum: 17, cells: [45, 46] }
    ],
    steps: [
      { text: 'En el Killer rigen las reglas del clásico y, además, cada jaula (contorno punteado) tiene un total en su esquina y no repite dígitos. Veamos dos formas de usar esos totales. Empecemos por la jaula de 2 celdas marcada: suma 17.', hl: [45, 46] },
      { text: 'Anotamos los candidatos de las dos celdas: en principio, cualquier dígito del 1 al 9.', hl: [45, 46], show: { 45: A9, 46: A9 } },
      { text: 'Con dígitos distintos, la suma más alta posible de dos celdas es 9 + 8 = 17. Entonces el 1, 2, 3, 4, 5, 6 y 7 no pueden estar en esta jaula: los tachamos.', hl: [45, 46],
        show: { 45: A9, 46: A9 }, strike: { 45: [1, 2, 3, 4, 5, 6, 7], 46: [1, 2, 3, 4, 5, 6, 7] } },
      { text: 'Solo la combinación 8 + 9 suma 17. Todavía no sabemos cuál va en cada celda, pero ya descartamos todo lo demás: una sola jaula nos dio dos celdas casi resueltas.', hl: [45, 46],
        show: { 45: A9, 46: A9 }, strike: { 45: [1, 2, 3, 4, 5, 6, 7], 46: [1, 2, 3, 4, 5, 6, 7] }, keep: { 45: [8, 9], 46: [8, 9] } },
      { text: 'Ahora la Regla del 45: toda fila, columna y bloque suma 45 (1 + 2 + … + 9). Miremos la fila 1.', rel: rowCells(0) },
      { text: 'Tres jaulas quedan completamente dentro de la fila 1: la de 14, la de 17 y la de 11. Entre las tres suman 14 + 17 + 11 = 42.', hl: [0, 1, 2, 3, 4, 5, 6, 7], rel: rowCells(0) },
      { text: 'Solo queda una celda de la fila fuera de esas jaulas: F1C9. Como la fila entera suma 45, esta celda vale 45 − 42 = 3.', hl: [8], rel: rowCells(0), src: [0, 1, 2, 3, 4, 5, 6, 7] },
      { text: 'Colocamos el 3 en F1C9. Sin probar nada: solo con una resta.', hl: [8], place: { 8: 3 } },
      { text: 'Y todavía rinde más: la jaula de 9 incluye F1C9 y F2C9. Si una celda vale 3, la otra vale 9 − 3 = 6.', hl: [8, 17], place: { 8: 3, 17: 6 } }
    ]
  };

  // --- Diagonal: una celda central que "ve" ambas diagonales ---
  const DIAG_EX = {
    mode: 'diagonal',
    grid: '000040000' + '090000000' + '000000200' + '000060000' + '120300000' + '000080000' + '000000000' + '000070000' + '000000000',
    steps: [
      { text: 'Tomemos la celda central (F5C5). Está sobre las dos diagonales (las celdas teñidas), así que "ve" su fila, su columna, su bloque y además las dos diagonales completas.',
        hl: [40], rel: uniq([rowCells(4), colCells(4), boxCells(4), DIAG1, DIAG2]) },
      { text: 'Fila 5: ya están el 1, 2 y 3. Los tachamos de esta celda.', hl: [40], rel: rowCells(4), src: [36, 37, 39],
        show: { 40: A9 }, strike: { 40: [1, 2, 3] } },
      { text: 'Columna 5: ya están el 4, 6 y 8 (y el 7). Los tachamos también.', hl: [40], rel: colCells(4), src: [4, 31, 49, 67],
        show: { 40: A9 }, strike: { 40: [1, 2, 3, 4, 6, 7, 8] } },
      { text: 'El bloque central aporta el 3, el 6 y el 8: ya estaban tachados, no cambia nada.', hl: [40], rel: boxCells(4), src: [31, 39, 49],
        show: { 40: A9 }, strike: { 40: [1, 2, 3, 4, 6, 7, 8] } },
      { text: 'Quedan el 5 y el 9. En un Sudoku clásico habría que seguir buscando por otro lado: acá todavía nos falta una regla.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 2, 3, 4, 6, 7, 8] }, keep: { 40: [5, 9] } },
      { text: 'Las diagonales cuentan como una casa más. En la diagonal principal ya hay un 9 (F2C2), así que esta celda no puede llevar 9.', hl: [40], rel: DIAG1, src: [10], same: [10],
        show: { 40: A9 }, strike: { 40: [1, 2, 3, 4, 6, 7, 8, 9] }, keep: { 40: [5] } },
      { text: 'Solo sobrevive el 5: es un Único desnudo que sin la diagonal no habríamos podido ver.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 2, 3, 4, 6, 7, 8, 9] }, keep: { 40: [5] } },
      { text: 'Colocamos el 5 en F5C5.', hl: [40], place: { 40: 5 } }
    ]
  };

  // --- Anti-Caballo: una celda bloqueada por un 7 a salto de caballo ---
  const AK_EX = {
    mode: 'antiknight',
    grid: '000050000' + '000000000' + '000700000' + '000900000' + '103000004' + '000000000' + '000080000' + '000000000' + '000060000',
    steps: [
      { text: 'Tomemos la celda central (F5C5). Además de su fila, columna y bloque, en Anti-Caballo "ve" las celdas a un salto de caballo de ajedrez: dos casillas en una dirección y una hacia el costado (una L).',
        hl: [40], rel: uniq([rowCells(4), colCells(4), boxCells(4), knightCells(40)]) },
      { text: 'Fila 5: ya están el 1, 3 y 4. Los tachamos.', hl: [40], rel: rowCells(4), src: [36, 38, 44],
        show: { 40: A9 }, strike: { 40: [1, 3, 4] } },
      { text: 'Columna 5: ya están el 5, 6 y 8. Los tachamos.', hl: [40], rel: colCells(4), src: [4, 58, 76],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 8] } },
      { text: 'Bloque central: ya está el 9. Lo tachamos.', hl: [40], rel: boxCells(4), src: [30],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 8, 9] } },
      { text: 'Quedan el 2 y el 7. Con las reglas del clásico no alcanza para decidir.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 8, 9] }, keep: { 40: [2, 7] } },
      { text: 'Ahora el caballo: estas 8 celdas en L (resaltadas) también "ven" a F5C5. Una de ellas, F3C4, tiene un 7: ese 7 está a salto de caballo, así que no puede repetirse acá.',
        hl: [40], rel: knightCells(40), src: [21], same: [21],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 8, 9] }, keep: { 40: [2, 7] } },
      { text: 'Tachamos el 7. Solo sobrevive el 2: Único desnudo, gracias al salto de caballo.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 7, 8, 9] }, keep: { 40: [2] } },
      { text: 'Colocamos el 2 en F5C5.', hl: [40], place: { 40: 2 } }
    ]
  };

  // --- Sin Consecutivos: una celda se resuelve con la regla de los vecinos ortogonales ---
  // Datos: F5C1=1, F5C2=3, F5C4=8 (fila) · F2C5=4, F4C5=6 (columna). Arriba de F5C5 hay un 6 y a la izquierda un 8.
  const gridLate = fn => { const g = new Array(81).fill(0); fn(g); return g.join(''); };
  const NC_EX = {
    mode: 'nonconsecutive',
    grid: gridLate(g => { g[36] = 1; g[37] = 3; g[39] = 8; g[13] = 4; g[31] = 6; }),
    steps: [
      { text: 'Tomemos la celda central (F5C5). En Sin Consecutivos, además de las reglas del clásico, las celdas que comparten lado con ella (arriba, abajo, izquierda y derecha) no pueden llevar un número consecutivo: ni uno más ni uno menos.',
        hl: [40], rel: [31, 49, 39, 41] },
      { text: 'Primero lo de siempre. Fila 5: ya están el 1, el 3 y el 8. Los tachamos.', hl: [40], rel: rowCells(4), src: [36, 37, 39],
        show: { 40: A9 }, strike: { 40: [1, 3, 8] } },
      { text: 'Columna 5: ya están el 4 y el 6. Los tachamos.', hl: [40], rel: colCells(4), src: [13, 31],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 6, 8] } },
      { text: 'Bloque central: solo están el 6 y el 8, que ya estaban tachados. No cambia nada.', hl: [40], rel: boxCells(4), src: [31, 39],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 6, 8] } },
      { text: 'Quedan el 2, el 5, el 7 y el 9. Con las reglas del clásico todavía no alcanza para decidir.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 6, 8] }, keep: { 40: [2, 5, 7, 9] } },
      { text: 'Ahora los vecinos. Justo arriba hay un 6 (F4C5): al compartir lado, esta celda no puede ser 5 ni 7. Tachamos los dos.', hl: [40], rel: [31], src: [31], same: [31],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 7, 8] }, keep: { 40: [2, 9] } },
      { text: 'A la izquierda hay un 8 (F5C4): tampoco puede ser 7 ni 9. Tachamos el 9.', hl: [40], rel: [39], src: [39], same: [39],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 7, 8, 9] }, keep: { 40: [2] } },
      { text: 'Solo sobrevive el 2: es un Único desnudo que sin la regla de los consecutivos no habríamos podido ver. Y respeta todo: 2 y 6 no son consecutivos, 2 y 8 tampoco.', hl: [40],
        show: { 40: A9 }, strike: { 40: [1, 3, 4, 5, 6, 7, 8, 9] }, keep: { 40: [2] } },
      { text: 'Colocamos el 2 en F5C5.', hl: [40], place: { 40: 2 } }
    ]
  };

  // --- Jigsaw (Irregular): mapa de 9 regiones de forma libre y un Único oculto dentro de una región ---
  const JIG_MAP = '000111222' + '000111332' + '040111332' + '045555322' + '645455332' + '644455332' + '644677777' + '666688877' + '688888877';
  const JIG_REGIONS = JIG_MAP.split('').map(Number);
  const JIG_R5 = [29, 30, 31, 32, 38, 40, 41, 49, 50];   // región 6: F4C3, F4C4, F4C5, F4C6, F5C3, F5C5, F5C6, F6C5, F6C6
  const JIG_EX = {
    mode: 'jigsaw',
    regions: JIG_REGIONS,
    grid: '000400030' + '000800097' + '506302000' + '902030000' + '075908320' + '000090806' + '000504908' + '840006000' + '090003000',
    steps: [
      { text: 'En Jigsaw no hay cuadros de 3×3: el tablero se divide en 9 regiones de forma libre, marcadas con bordes gruesos. Cada región tiene 9 celdas y debe llevar del 1 al 9, igual que un cuadro. Miremos la que tiene el centro del tablero.',
        hl: [40], rel: JIG_R5 },
      { text: 'Busquemos el 4 en esta región. Todavía no está, y las celdas vacías son F4C4, F4C6, F5C5 y F6C6. ¿En cuál puede ir? Las demás casas siguen valiendo: fila y columna.',
        hl: [30, 32, 40, 50], rel: JIG_R5 },
      { text: 'Hay un 4 en F1C4: está en la columna 4, así que F4C4 no puede ser 4. La marcamos con ✕.',
        hl: [30], rel: colCells(3), src: [3], same: [3], no: [30] },
      { text: 'Hay otro 4 en F7C6, en la columna 6: bloquea F4C6 y F6C6, las dos celdas de esa columna dentro de la región.',
        hl: [32, 50], rel: colCells(5), src: [59], same: [59], no: [30, 32, 50] },
      { text: 'De las cuatro celdas libres de la región, solo queda F5C5 sin bloquear: el 4 de esta región tiene un único lugar. Es un Único oculto, ¡pero dentro de una región irregular!',
        hl: [40], rel: JIG_R5, no: [30, 32, 50] },
      { text: 'Colocamos el 4 en F5C5.', hl: [40], place: { 40: 4 } }
    ]
  };

  // Micro-grillas de las mini-comprobaciones
  const gridOf = fn => { const g = new Array(81).fill(0); fn(g); return g.join(''); };

  const DUEL_GUIDE = [
    { tag: 'En vivo', title: 'Duelo 1v1 en vivo', steps: [
      'En el inicio tocá "Jugar con amigos" y elegí "Duelo 1v1 en vivo". Elegí modo y dificultad y tocá "Crear sala y compartir enlace".',
      'Tu rival abre el enlace: en cuanto se conecta, los dos reciben el mismo tablero y el reloj arranca en 00:00 al mismo tiempo.',
      'Cada uno resuelve su copia, con 3 vidas y sin pistas. Arriba ves tu avance (Vos) y el de tu rival en tiempo real: celdas, barra y vidas.',
      'Gana quien completa primero las 81 celdas. Si alguien agota sus 3 vidas, el otro gana al instante.',
      'Con "Salir del duelo" abandonás (te pide confirmación) y tu rival se lleva la victoria. Un micro-corte de conexión no te elimina: la app reconecta sola.'
    ], tip: 'Mirá la barra del rival de reojo: si va muy adelantada, priorizá la velocidad sin arriesgar vidas.' },
    { tag: 'Fantasma', title: 'Duelo fantasma (asíncrono)', steps: [
      'En "Jugar con amigos" elegí "Duelo fantasma (asíncrono)", el modo y la dificultad, y tocá "Compartir enlace y jugar".',
      'Jugás tu tablero a tu ritmo, con 3 vidas y 2 pistas (+30 s cada una). Tu recorrido celda a celda queda grabado como un fantasma.',
      'Al terminar compartís el enlace con tu resultado. Tu amigo lo abre cuando quiera y compite contra tu tiempo y tu fantasma.',
      'En su pantalla ve "Vos" contra "Obj. mm:ss" y los destellos de las celdas que tu fantasma ya resolvió. Al final se comparan los tiempos.'
    ], tip: 'Después podés "Devolver desafío" para una revancha o "Desafiar a un amigo" con otro tablero.' },
    { tag: 'Co-op', title: 'Resolver juntos', steps: [
      'En "Jugar con amigos" elegí "Resolver juntos (Co-op)", el modo y la dificultad, y tocá "Crear sala y compartir enlace".',
      'Tu amigo entra con el enlace: ven el mismo tablero y cada uno ve al instante lo que escribe el otro, en tiempo real.',
      'Comparten 3 vidas y 3 pistas. Vos siempre te ves con tu color y a tu compañero con el suyo (cursor, insignia con su inicial y números).',
      'Si el anfitrión termina la partida, o alguien sale de la sala, la app te deja elegir si seguir en solitario o volver al inicio.',
      'Mientras esperan al invitado podés volver a tocar "Compartir" para reenviar el enlace de la sala.'
    ], tip: 'Una buena división: uno busca únicos ocultos por números y el otro únicos desnudos por celdas.' },
    { tag: 'Carrera', title: 'Carrera grupal (3–8 jugadores)', steps: [
      'En "Jugar con amigos" elegí "Carrera grupal", el modo y la dificultad, y tocá "Crear sala y compartir enlace". Vos sos el anfitrión y también corrés.',
      'Tus amigos entran con el enlace y ven la lista de participantes. Hacen falta entre 3 y 8 jugadores contándote a vos; con 8 la sala se llena y a un noveno se le avisa.',
      'Cuando estén todos, tocá "Iniciar carrera": cada uno recibe el mismo tablero y el reloj arranca en 00:00 para todos a la vez. Nadie puede entrar después.',
      'Arriba ves tu puesto (#1, #2…), tu avance y tu barra. "Tabla" despliega el ranking en vivo, ordenado por celdas completas y, a igualdad, por menos errores.',
      'Tenés 3 vidas y no hay pistas: al tercer error quedás eliminado, tu tablero se bloquea y seguís mirando la tabla hasta el final. "Salir de la carrera" te marca como abandonado sin frenar a los demás.',
      'La carrera termina cuando alguien completa las 81 celdas, o cuando queda un solo jugador activo. Todos ven el podio con el 1.º, 2.º y 3.º y el resto de los participantes.'
    ], tip: 'No mires solo el primer puesto: si vas segundo con cero errores, un error ajeno puede darte la ventaja.' },
    { tag: 'Consejos', title: 'Antes de empezar', steps: [
      'Los dos necesitan conexión a internet para crear o unirse a la sala; el resto de la app funciona sin conexión.',
      'Si estás en una partida, aceptar un duelo o unirte a una sala te avisa que se perderá la partida en curso.',
      'Si el enlace no abre la invitación, pedí que lo reenvíen y abrilo desde la app instalada o el navegador.'
    ] }
  ];

  const GUIDES = {
    classic: {
      label: 'Clásico', map: 'classic',
      title: 'Sudoku Clásico',
      tagline: '9×9 • Filas, columnas y cuadros • Sin matemáticas, sin adivinar',
      intro: 'Completá la grilla para que cada fila, cada columna y cada cuadro de 3×3 lleven los números del 1 al 9, sin repetir. Cada tablero tiene una única solución y siempre se puede llegar a ella razonando: nunca hace falta probar a ver qué pasa.',
      exTitle: 'Ejemplo guiado: deducir una celda',
      example: S.ns_ex,
      rules: [
        'Cada fila lleva los números del 1 al 9, sin repetir.',
        'Cada columna lleva los números del 1 al 9, sin repetir.',
        'Cada cuadro de 3×3 lleva los números del 1 al 9, sin repetir.'
      ],
      routine: [
        { t: 'Elegí dónde mirar', d: 'Empezá por una celda con muchos vecinos llenos o por un número que ya aparece varias veces.' },
        { t: 'Descartá candidatos', d: 'Tachá los números que ya están en su fila, su columna y su cuadro. Usá Notas para no hacerlo de memoria.' },
        { t: 'Colocá solo con certeza', d: 'Si queda un único candidato (o un número tiene un solo lugar posible en su casa), colocalo. Si dudás, seguí descartando.' }
      ],
      errors: [
        'Adivinar: un número que "parece" no es una deducción y te puede costar una vida.',
        'Mirar solo la fila o solo la columna y olvidarte del cuadro.',
        'Tachar un candidato sin estar seguro: un descarte erróneo arruina todo lo que sigue.',
        'Buscar siempre por celdas: mirar también por números (¿dónde cabe el 7 en este cuadro?) destraba muchos tableros.'
      ],
      check: {
        mode: 'classic', grid: S.ns_pr.grid, hl: [41],
        q: '¿Qué número va en la celda marcada? Descartá lo que ya aparece en su fila, su columna y su cuadro.',
        options: ['5', '1', '2', '6'], answer: 2,
        wrong: ['El 5 ya está en su columna.', 'El 1 ya está en su cuadro.', null, 'El 6 ya está en su fila.'],
        why: 'La fila tiene 3, 6 y 9; la columna, 4, 5, 7 y 9; el cuadro, 1, 7, 8 y 9. De todos los números solo falta el 2.'
      }
    },
    killer: {
      label: 'Killer', map: 'killer',
      title: 'Sudoku Killer',
      tagline: 'Jaulas, totales y combinaciones • Lógica, no conjeturas',
      intro: 'Es un Sudoku clásico con una capa extra: el tablero está dividido en jaulas de contorno punteado. El número de la esquina indica cuánto suman sus celdas y ningún dígito se repite dentro de una jaula. Se resuelve combinando esas sumas con las reglas de siempre.',
      exTitle: 'Ejemplo guiado: sumas y Regla del 45',
      example: KILLER_EX,
      rules: [
        'Se mantienen las reglas del clásico: filas, columnas y cuadros llevan del 1 al 9.',
        'Los dígitos de una jaula suman exactamente el total de su esquina.',
        'Dentro de una jaula no se puede repetir ningún dígito.'
      ],
      routine: [
        { t: 'Empezá por las jaulas chicas', d: 'Una jaula de 2 o 3 celdas tiene pocas combinaciones posibles (por ejemplo, un total de 3 en 2 celdas solo puede ser 1 + 2).' },
        { t: 'Aplicá la Regla del 45', d: 'Cada fila, columna y cuadro suma 45. Si las jaulas completas dentro de una casa dejan una sola celda suelta, su valor sale de una resta.' },
        { t: 'Cruzá sumas y candidatos', d: 'Descartá con fila, columna y cuadro, y después con las combinaciones que permite cada jaula. Colocá cuando todo coincida.' }
      ],
      errors: [
        'Repetir un dígito dentro de una jaula, aunque las celdas queden separadas.',
        'Olvidar que toda fila, columna y cuadro suma 45.',
        'Dar por buena una combinación sin revisar que cuadre con su fila, columna y cuadro.',
        'Ignorar las jaulas que salen del cuadro: son justo las que aprovecha la Regla del 45.'
      ],
      check: {
        mode: 'killer', grid: '0'.repeat(81), hl: [8],
        cages: [{ sum: 12, cells: [0, 1, 2] }, { sum: 15, cells: [3, 4, 5] }, { sum: 13, cells: [6, 7] }, { sum: 11, cells: [8, 17] }],
        q: 'Las tres jaulas completas de la fila 1 suman 12 + 15 + 13 = 40. ¿Qué número va en la celda marcada (la última de la fila 1)?',
        options: ['4', '5', '6', '11'], answer: 1,
        wrong: ['La fila suma 45, no 44: 45 − 40 = 5.', null, 'El 6 es el valor de la otra celda de esa jaula (11 − 5), no el de esta.', '11 es el total de su jaula, no el valor de la celda: acá la que manda es la fila, que suma 45.'],
        why: '45 − 40 = 5. Y de paso, la otra celda de esa jaula vale 11 − 5 = 6.'
      }
    },
    diagonal: {
      label: 'Diagonal', map: 'diagonal',
      title: 'Sudoku Diagonal',
      tagline: 'Dos diagonales extra • Más vecinos, más descartes',
      intro: 'Las reglas del clásico, más una: las dos diagonales principales (las celdas teñidas del tablero) también llevan del 1 al 9 sin repetir. Cada celda sobre una diagonal "ve" más números, y eso te da descartes extra.',
      exTitle: 'Ejemplo guiado: descartar con la diagonal',
      example: DIAG_EX,
      rules: [
        'Se mantienen las reglas del clásico: filas, columnas y cuadros.',
        'La diagonal principal (↘) lleva del 1 al 9, sin repetir.',
        'La diagonal secundaria (↙) lleva del 1 al 9, sin repetir. La celda central pertenece a las dos.'
      ],
      routine: [
        { t: 'Ubicá la diagonal', d: 'Fijate si la celda está sobre una diagonal (celdas teñidas). Si está, tiene más vecinos que el resto.' },
        { t: 'Descartá en todas las casas', d: 'Además de fila, columna y cuadro, tachá lo que ya aparece en su diagonal (o en las dos, si es la del centro).' },
        { t: 'Mirá la diagonal como una casa más', d: 'Un número que solo cabe en una celda de la diagonal es un Único oculto, igual que en una fila.' }
      ],
      errors: [
        'Olvidarte de la diagonal al descartar candidatos.',
        'No recordar que la celda central está en las dos diagonales a la vez.',
        'Aplicar la regla en celdas que no están teñidas: solo cuentan las 9 celdas de cada diagonal.',
        'Colocar sin chequear: un número repetido en la diagonal también cuenta como error.'
      ],
      check: {
        mode: 'diagonal', hl: [80],
        grid: gridOf(g => { for (let k = 0; k < 8; k++) g[k * 10] = k + 1; }),
        q: 'La diagonal principal ya tiene del 1 al 8. ¿Qué número va en la celda marcada, la última de esa diagonal?',
        options: ['7', '9', '3', '8'], answer: 1,
        wrong: ['El 7 ya está en esa diagonal (y en su cuadro).', null, 'El 3 ya está en esa diagonal.', 'El 8 ya está en esa diagonal (y en su cuadro).'],
        why: 'La diagonal necesita el 1 al 9 sin repetir: faltando solo el 9, esa celda lo lleva.'
      }
    },
    antiknight: {
      label: 'Anti-Caballo', map: 'antiknight',
      title: 'Sudoku Anti-Caballo',
      tagline: 'Saltos en L prohibidos • Ningún dígito se repite a un salto de caballo',
      intro: 'Las reglas del clásico, más una: dos celdas separadas por un salto de caballo de ajedrez (dos casillas en una dirección y una hacia el costado) no pueden llevar el mismo número. Cada celda tiene hasta 8 vecinos extra con forma de L.',
      exTitle: 'Ejemplo guiado: bloquear con el caballo',
      example: AK_EX,
      rules: [
        'Se mantienen las reglas del clásico: filas, columnas y cuadros.',
        'Un dígito no puede repetirse a un salto de caballo: 2 casillas en una dirección y 1 hacia el costado.',
        'Las celdas pegadas en diagonal no se bloquean por esta regla (salvo que compartan cuadro). Solo cuenta la L: hasta 8 celdas, menos cerca de los bordes.'
      ],
      routine: [
        { t: 'Dibujá la L', d: 'Desde la celda, contá 2 casillas en una dirección y 1 hacia el costado, en las 4 direcciones: hasta 8 posiciones.' },
        { t: 'Descartá en todas las casas', d: 'Tachá lo que ya aparece en su fila, columna, cuadro y en esas posiciones de caballo.' },
        { t: 'Usá la L a distancia', d: 'Cuando coloques un número, borrá ese candidato también en sus celdas de caballo.' }
      ],
      errors: [
        'Contar solo 4 de los 8 saltos posibles.',
        'Confundir el salto de caballo con la diagonal pegada.',
        'Olvidar los saltos que cruzan de un cuadro a otro: son los más útiles.',
        'Contar saltos que se salen del tablero cerca de los bordes.'
      ],
      check: {
        mode: 'antiknight', hl: [40],
        grid: gridOf(g => { g[40] = 5; }),
        q: 'Hay un 5 en la celda central (F5C5). ¿En cuál de estas celdas NO puede ir otro 5, aunque no comparta fila, columna ni cuadro con él?',
        options: ['F3C7', 'F3C6', 'F2C6', 'F7C7'], answer: 1,
        wrong: ['F3C7 está 2 filas arriba y 2 columnas al costado: eso no es un salto de caballo.', null, 'F2C6 está 3 filas arriba y 1 al costado: demasiado lejos para el caballo.', 'F7C7 está 2 filas abajo y 2 al costado: tampoco es una L.'],
        why: 'F3C6 está 2 filas arriba y 1 columna al costado: un salto de caballo. Por eso ve al 5 central.'
      }
    },
    nonconsecutive: {
      label: 'Sin Consecutivos', map: null,
      title: 'Sudoku Sin Consecutivos',
      tagline: 'Vecinos sin números seguidos • Un 4 nunca pega con un 3 ni con un 5',
      intro: 'Las reglas del clásico, más una: dos celdas que comparten lado (arriba, abajo, izquierda o derecha) no pueden llevar números consecutivos. Cada celda mira a sus vecinos y descarta los números que quedarían pegados a ellos.',
      exTitle: 'Ejemplo guiado: descartar con los vecinos',
      example: NC_EX,
      rules: [
        'Se mantienen las reglas del clásico: filas, columnas y cuadros llevan del 1 al 9.',
        'Dos celdas que comparten lado no pueden tener números consecutivos (4 y 5, 7 y 8…).',
        'Las celdas pegadas en diagonal no cuentan, y el 9 y el 1 no son consecutivos: pueden ir juntos.'
      ],
      routine: [
        { t: 'Mirá a los cuatro vecinos', d: 'Para cada celda, fijate qué hay arriba, abajo, a la izquierda y a la derecha.' },
        { t: 'Tachá el anterior y el siguiente', d: 'Si un vecino tiene un 5, esta celda no puede ser 4 ni 5 (ni 6). Anotalo en las Notas; la app también lo borra al colocar un número.' },
        { t: 'Combiná con lo clásico', d: 'Sumá los descartes de fila, columna y cuadro. Los números del medio (3 a 7) tienen dos consecutivos que bloquear: son los más fáciles de descartar.' }
      ],
      errors: [
        'Olvidar que el vecino bloquea dos números (el anterior y el siguiente), no solo uno.',
        'Contar también las celdas en diagonal: solo cuentan las que comparten lado.',
        'Pensar que el 9 y el 1 son consecutivos: no lo son.',
        'Tachar solo el consecutivo y olvidar que el mismo número tampoco puede repetirse en la fila, columna o cuadro.'
      ],
      check: {
        mode: 'nonconsecutive', hl: [40],
        grid: gridOf(g => { g[31] = 5; }),
        q: 'La celda marcada está justo debajo de un 5. ¿Cuál de estos números puede ir ahí?',
        options: ['4', '5', '6', '8'], answer: 3,
        wrong: ['El 4 es consecutivo del 5 y comparten lado: no puede ser.', 'El 5 se repetiría en la misma columna.', 'El 6 es consecutivo del 5 y comparten lado: no puede ser.', null],
        why: 'Pegado a un 5 no pueden ir el 4 ni el 6 (consecutivos) ni otro 5. El 8 no es vecino numérico del 5, así que sí puede ir.'
      }
    },
    jigsaw: {
      label: 'Jigsaw (Irregular)', map: null,
      title: 'Sudoku Jigsaw (Irregular)',
      tagline: 'Regiones de forma libre • 9 celdas cada una • Sin cuadros de 3×3',
      intro: 'Las filas y las columnas funcionan igual que siempre, pero los cuadros de 3×3 se reemplazan por 9 regiones irregulares de 9 celdas cada una (los bordes gruesos las separan). Cada región debe llevar del 1 al 9 sin repetir, aunque su forma sea una escalera, una L o una serpiente.',
      exTitle: 'Ejemplo guiado: Único oculto en una región',
      example: JIG_EX,
      rules: [
        'Cada fila lleva los números del 1 al 9, sin repetir; y cada columna también.',
        'Cada región irregular (la limitan los bordes gruesos) tiene 9 celdas y lleva del 1 al 9, sin repetir.',
        'Las regiones no tienen por qué coincidir con los cuadros de 3×3: una región puede cruzar varias filas y columnas, y una celda solo pertenece a una región.'
      ],
      routine: [
        { t: 'Reconocé la región', d: 'Seguí con la vista los bordes gruesos y fijate qué 9 celdas forman la región de la celda que analizás. Al elegir una celda, la app resalta su región.' },
        { t: 'Descartá en fila, columna y región', d: 'Tachá lo que ya aparece en la fila, la columna y la región de la celda. Usá Notas: las formas raras hacen fácil olvidarse de una celda.' },
        { t: 'Buscá también por números', d: 'Elegí una región y un dígito que falte: si en todas las celdas libres menos una ya hay ese dígito en su fila o columna, ahí va (Único oculto).' }
      ],
      errors: [
        'Seguir mirando el cuadro de 3×3 de siempre: en Jigsaw no cuenta, lo que vale es la región.',
        'Perder de vista una celda lejana de la misma región (las formas largas se estiran por todo el tablero).',
        'Dar por sentado que una región tiene tres celdas por fila: puede tener una sola en una fila y cinco en otra.',
        'No contar la región al tachar candidatos: es la casa que más descartes extra da.'
      ],
      check: {
        mode: 'jigsaw', regions: JIG_REGIONS, hl: [39],
        grid: gridOf(g => { g[19] = 1; g[28] = 2; g[37] = 3; g[46] = 4; g[47] = 5; g[48] = 6; g[55] = 7; g[56] = 8; }),
        q: 'La región irregular de la celda marcada (F5C4) ya tiene del 1 al 8 en sus otras celdas. ¿Qué número va en la marcada?',
        options: ['8', '9', '4', '6'], answer: 1,
        wrong: ['El 8 ya está en la región (F7C3), aunque esa celda quede en otro cuadro de 3×3.', null, 'El 4 ya está en la región (F6C2).', 'El 6 ya está en la región (F6C4).'],
        why: 'La región tiene 9 celdas y ya están el 1 al 8: solo falta el 9, aunque la celda quede en un cuadro de 3×3 distinto al de las demás.'
      }
    },
    duels: {
      label: 'Jugar con amigos', map: null,
      title: 'Jugar con amigos (Multijugador)',
      tagline: 'Duelo en vivo • Duelo fantasma • Co-op • Carrera grupal',
      intro: 'Cuatro formas de jugar con amigos, sin cuentas: el Duelo 1v1 en vivo (los dos a la vez, ven el avance del otro y gana el más rápido), el Duelo fantasma (jugás a tu ritmo y tu amigo compite después contra tu recorrido grabado) y el Co-op (resuelven juntos un único tablero) y la Carrera grupal (de 3 a 8 jugadores, todos contra todos, con ranking en vivo y podio).',
      exTitle: 'Paso a paso',
      example: null, steps: DUEL_GUIDE,
      rules: [
        'Duelo en vivo: gana quien completa primero las 81 celdas, o quien sobrevive si el otro agota sus 3 vidas o abandona.',
        'Carrera grupal: 3 a 8 jugadores a la vez; gana quien completa primero el tablero y con 3 errores quedás eliminado.',
        'Hay 3 vidas: en los duelos cada uno tiene las suyas; en el Co-op son compartidas entre los dos.',
        'Pistas: ninguna en el duelo en vivo, 2 en el fantasma (+30 s cada una) y 3 compartidas en el Co-op.'
      ],
      routine: [
        { t: 'Elegí la variante', d: 'En vivo (2) o carrera (3 a 8) si juegan a la vez, fantasma si no coinciden en horario, Co-op si prefieren colaborar. Creá el enlace o la sala y compartilo.' },
        { t: 'Coordiná la estrategia', d: 'En Duelo, concentrate en tu tablero y ganá por tiempo. En Co-op, repartan el trabajo: uno por números y otro por celdas.' },
        { t: 'Confirmá antes de colocar', d: 'Un error cuesta una vida: en Co-op la pierden los dos. Dudá, comentá y recién después poné el número.' }
      ],
      errors: [
        'Abrir un enlace con una partida en curso: se pierde la partida actual.',
        'Colocar a toda velocidad sin chequear: las vidas se acaban y perdés.',
        'Olvidar que los dos necesitan internet para crear o unirse a la sala.',
        'En Co-op, pisar la celda del compañero: mirá su aro de color antes de escribir.'
      ],
      check: {
        q: '¿Qué comparten los dos jugadores en el modo Co-op?',
        options: ['3 vidas y 3 pistas, en conjunto', 'Cada uno tiene 3 vidas propias', 'Vidas infinitas y 2 pistas cada uno', 'Solo el tiempo, nada más'], answer: 0,
        wrong: [null, 'Eso pasa en el Duelo. En el Co-op las vidas son del equipo.', 'Las vidas no son infinitas: son 3 para los dos.', 'También comparten vidas y pistas, no solo el tiempo.'],
        why: 'En Co-op las 3 vidas y las 3 pistas son del equipo; en los duelos, en cambio, cada jugador usa las suyas.'
      }
    }
  };

  /* =====================================================================
     4. UTILIDADES
     ===================================================================== */
  const KEY_PROG = 'sudoku_tutorial_progress';
  const KEY_VAR = 'sudoku_tutorial_variant';
  const KEY_GVAR = 'sudoku_tutorial_guide_variant';
  const KEY_INPUT = 'sudoku_tutorial_input';
  const mem = {};
  const store = {
    get(k) { try { const v = window.localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* restringido */ } return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    set(k, v) { mem[k] = v; try { window.localStorage.setItem(k, v); } catch (e) { /* cuota o modo privado */ } }
  };

  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      (Array.isArray(c) ? c : [c]).forEach(x => { if (x == null || x === false) return; e.append(x.nodeType ? x : document.createTextNode(String(x))); });
    }
    return e;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) { if (attrs[k] != null) e.setAttribute(k, attrs[k]); }
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c == null) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return e;
  }
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  const pad2 = n => String(n).padStart(2, '0');
  const digits81 = str => { const a = []; for (let i = 0; i < 81; i++) { const c = String(str || '').charAt(i); a.push(c >= '1' && c <= '9' ? +c : 0); } return a; };

  /* Vecinos por modo (para las notas automáticas y la validación sin solución). */
  const PEERS = [];
  (function () {
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, s = new Set();
      for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); }
      const br = r - r % 3, bc = c - c % 3;
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s.add((br + a) * 9 + bc + b);
      s.delete(i); PEERS.push(s);
    }
  }());
  function peersFor(mode, regions) {
    const P = PEERS.map(s => new Set(s));
    if (mode === 'jigsaw' && regions) {   // en Jigsaw la región reemplaza al bloque 3×3
      for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9), c = i % 9, s = new Set();
        for (let k = 0; k < 9; k++) { s.add(r * 9 + k); s.add(k * 9 + c); }
        for (let j = 0; j < 81; j++) if (regions[j] === regions[i]) s.add(j);
        s.delete(i); P[i] = s;
      }
    } else if (mode === 'diagonal') {
      [DIAG1, DIAG2].forEach(d => d.forEach(a => d.forEach(b => { if (a !== b) P[a].add(b); })));
    } else if (mode === 'antiknight') {
      for (let i = 0; i < 81; i++) knightCells(i).forEach(q => P[i].add(q));
    }
    return P;
  }

  // Sin Consecutivos: ¿algún vecino ortogonal de la celda i vale d−1 o d+1?
  function ncBlocked(vals, i, d) {
    const r = Math.floor(i / 9), c = i % 9;
    const n = [];
    if (r > 0) n.push(i - 9); if (r < 8) n.push(i + 9); if (c > 0) n.push(i - 1); if (c < 8) n.push(i + 1);
    return n.some(p => vals[p] && Math.abs(vals[p] - d) === 1);
  }

  // Centra la pestaña activa dentro de su fila desplazable.
  function centerTab(tabs) {
    requestAnimationFrame(() => {
      const t = tabs.querySelector('[aria-selected="true"]');
      if (t) tabs.scrollLeft = t.offsetLeft - (tabs.clientWidth - t.offsetWidth) / 2;
    });
  }

  /* =====================================================================
     5. REGISTRO Y PROGRESO
     ===================================================================== */
  function validLesson(l) { return l && typeof l === 'object' && l.id && l.title && l.theory && l.example && Array.isArray(l.example.steps) && l.example.steps.length && typeof l.example.grid === 'string'; }

  // Une las muestras integradas con lo registrado por los archivos de datos (los registrados ganan por id).
  function getChapters(variant) {
    const meta = META[variant].chapters;
    const byId = {};
    (BUILTIN[variant] || []).forEach(c => { byId[c.id] = c; });
    const reg = window.TUTORIAL_PATHS[variant];
    const list = Array.isArray(reg) ? reg : (reg && Array.isArray(reg.chapters) ? reg.chapters : []);
    list.forEach(c => { if (c && c.id) byId[c.id] = c; });
    const out = meta.map(m => {
      const c = byId[m.id] || {};
      delete byId[m.id];
      return {
        id: m.id, title: c.title || m.title, blurb: c.blurb || m.blurb,
        planned: Math.max(m.planned | 0, c.planned | 0),
        lessons: (c.lessons || []).filter(validLesson)
      };
    });
    Object.keys(byId).forEach(id => {
      const c = byId[id];
      out.push({ id: id, title: c.title || id, blurb: c.blurb || '', planned: c.planned | 0, lessons: (c.lessons || []).filter(validLesson) });
    });
    return out;
  }
  // Casillas del capítulo: lecciones cargadas o, si faltan, las técnicas reservadas.
  const chTotal = ch => Math.max(ch.lessons.length, ch.planned | 0);

  let prog = null;
  function loadProg() {
    try {
      const o = JSON.parse(store.get(KEY_PROG));
      if (o && o.v === 1 && o.lessons && typeof o.lessons === 'object') {
        if (!o.guides || typeof o.guides !== 'object') o.guides = {};
        return o;
      }
    } catch (e) { /* vacío o corrupto */ }
    return { v: 1, lessons: {}, guides: {} };
  }
  function saveProg() { store.set(KEY_PROG, JSON.stringify(prog)); }
  const lkey = (variant, ch, ls) => variant + '/' + ch.id + '/' + ls.id;
  function lstate(variant, ch, ls) {
    const e = prog.lessons[lkey(variant, ch, ls)];
    return e && e.done ? 'done' : (e && e.seen ? 'seen' : 'new');
  }
  function markSeen(variant, ch, ls) {
    const k = lkey(variant, ch, ls);
    if (!prog.lessons[k]) { prog.lessons[k] = { seen: Date.now() }; saveProg(); }
  }
  function markDone(variant, ch, ls) {
    const k = lkey(variant, ch, ls);
    const e = prog.lessons[k] || (prog.lessons[k] = { seen: Date.now() });
    if (!e.done) { e.done = Date.now(); saveProg(); }
  }
  const gdone = v => !!(prog && prog.guides && prog.guides[v]);
  function markGuide(v) {
    if (!prog.guides) prog.guides = {};
    if (!prog.guides[v]) { prog.guides[v] = Date.now(); saveProg(); }
  }
  function guideStats() {
    let d = 0;
    GUIDE_VARIANTS.forEach(v => { if (gdone(v)) d++; });
    return { n: GUIDE_VARIANTS.length, done: d, pct: Math.round(d / GUIDE_VARIANTS.length * 100) };
  }
  function chStats(variant, ch) {
    const n = chTotal(ch);
    let d = 0, seen = 0;
    ch.lessons.forEach(l => { const s = lstate(variant, ch, l); if (s === 'done') d++; if (s !== 'new') seen++; });
    return { n: n, done: d, seen: seen, pct: n ? Math.round(d / n * 100) : 0, complete: n > 0 && d === n };
  }
  function varStats(variant) {
    let n = 0, d = 0;
    getChapters(variant).forEach(c => { const s = chStats(variant, c); n += s.n; d += s.done; });
    return { n: n, done: d, pct: n ? Math.round(d / n * 100) : 0 };
  }
  function allTechStats() {
    let n = 0, d = 0;
    VARIANTS.forEach(v => { const s = varStats(v); n += s.n; d += s.done; });
    return { n: n, done: d, pct: n ? Math.round(d / n * 100) : 0 };
  }
  // Lista plana de (capítulo, lección) para "Siguiente lección".
  function nextLesson(variant, ch, ls) {
    const chs = getChapters(variant);
    let found = false;
    for (let i = 0; i < chs.length; i++) {
      for (let j = 0; j < chs[i].lessons.length; j++) {
        if (found) return { ch: chs[i], ls: chs[i].lessons[j] };
        if (chs[i].id === ch.id && chs[i].lessons[j].id === ls.id) found = true;
      }
    }
    return null;
  }

  /* =====================================================================
     6. TABLERO REUTILIZABLE (usa las clases .board/.cell/.nt de la app)
     ===================================================================== */
  function makeBoard(mode, cages, regions) {
    const el = h('div', { class: 'board tut-board', 'data-mode': mode || 'classic', role: 'grid', 'aria-label': 'Mini tablero de Sudoku' });
    const cageOf = new Array(81).fill(-1);
    (cages || []).forEach((cg, k) => (cg.cells || []).forEach(i => { cageOf[i] = k; }));
    const cells = [];
    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, cls = ['cell'];
      if (mode === 'jigsaw' && regions) {   // bordes gruesos solo entre celdas de distinta región
        if (c < 8 && regions[i] !== regions[i + 1]) cls.push('br');
        if (r < 8 && regions[i] !== regions[i + 9]) cls.push('bb');
      } else {
        if (c % 3 === 2 && c < 8) cls.push('br');
        if (r % 3 === 2 && r < 8) cls.push('bb');
      }
      if (mode === 'diagonal' && (r === c || r + c === 8)) cls.push('diagonal-cell');
      const cg = cageOf[i];
      if (cg >= 0) {
        if (!(r > 0 && cageOf[i - 9] === cg)) cls.push('cage-top');
        if (!(r < 8 && cageOf[i + 9] === cg)) cls.push('cage-bottom');
        if (!(c > 0 && cageOf[i - 1] === cg)) cls.push('cage-left');
        if (!(c < 8 && cageOf[i + 1] === cg)) cls.push('cage-right');
      }
      const nt = h('div', { class: 'nt' });
      for (let d = 0; d < 9; d++) nt.append(h('i'));
      const cell = h('div', { class: cls.join(' '), 'data-i': i, role: 'gridcell' }, h('span', { class: 'tv' }), nt);
      if (cg >= 0 && i === Math.min.apply(null, cages[cg].cells)) cell.append(h('span', { class: 'cage-sum', text: String(cages[cg].sum) }));
      cell._base = cls.join(' ');
      cells.push(cell); el.append(cell);
    }
    return { el: el, cells: cells };
  }
  // st: { v, cls, notes:Set, strike:Set, keep:Set }
  function paintCell(cell, st) {
    cell.className = cell._base + (st.cls ? ' ' + st.cls : '');
    const tv = cell.children[0], nt = cell.children[1];
    tv.textContent = st.v ? String(st.v) : '';
    nt.style.display = st.v ? 'none' : '';
    for (let d = 1; d <= 9; d++) {
      const it = nt.children[d - 1];
      const on = !st.v && st.notes && st.notes.has(d);
      it.textContent = on ? String(d) : '';
      it.className = on ? ((st.strike && st.strike.has(d) ? 'x ' : '') + (st.keep && st.keep.has(d) ? 'k' : '')).trim() : '';
    }
  }

  /* =====================================================================
     7. ESTADO DE LA INTERFAZ Y RENDER
     ===================================================================== */
  let root = null, body = null, topTitle = null, topBtn = null;
  const ui = { variant: 'classic', gv: 'classic', screen: 'hub', ch: null, ls: null, selCh: null, cleanup: null, train: null };

  function exitTutorial() {
    if (root) root.dispatchEvent(new CustomEvent('tutorial:exit', { bubbles: true }));
  }

  function build() {
    clear(root);
    root.classList.add('tut-app');
    topBtn = h('button', { class: 'chip', type: 'button', onclick: onBack, text: 'Inicio' });
    topTitle = h('b', { class: 'tut-title', text: 'Tutorial' });
    body = h('div', { class: 'tut-body' });
    const gear = document.querySelector('#btnSet .gear');
    const setBtn = h('button', { class: 'chip set-btn', type: 'button', 'aria-label': 'Ajustes', 'data-open-settings': true });
    if (gear) setBtn.appendChild(gear.cloneNode(true));
    root.append(h('header', { class: 'tut-top' }, topBtn, topTitle, setBtn), body);
  }

  function setTop(title, backLabel) { topTitle.textContent = title; topBtn.textContent = '← ' + backLabel; }

  function runCleanup() { if (ui.cleanup) { const f = ui.cleanup; ui.cleanup = null; try { f(); } catch (e) { /* ignorar */ } } }

  function onBack() {
    closeSheet(); closeCelebrate();
    switch (ui.screen) {
      case 'practice': if (ui.train) { showHub(); return; } showLesson(ui.ch, ui.ls); return;
      case 'trainSum': showHub(); return;
      case 'lesson': showMap(); return;
      case 'map': showMapList(); return;
      case 'guide': showGuideList(); return;
      case 'mapList':
      case 'guideList': showHub(); return;
      default: exitTutorial();
    }
  }

  /* ---------- Pantalla principal: dos secciones ---------- */
  function showHub() {
    runCleanup(); closeSheet(); closeCelebrate(); hideBanner();
    ui.screen = 'hub'; ui.ch = null; ui.ls = null; ui.selCh = null; ui.train = null;
    setTop('Tutorial', 'Inicio');
    clear(body); body.classList.remove('tut-fixed');
    body.scrollTop = 0;

    const gs = guideStats(), ts = allTechStats(), pend = Math.max(0, ts.n - ts.done);
    body.append(h('div', { class: 'vlist tut-hub' },
      h('p', { class: 'tut-hub-intro', text: 'Elegí por dónde empezar.' }),
      vcard('Cómo jugar', 'Reglas, rutina segura y errores comunes', gs.done + ' / ' + gs.n + ' completadas',
        gs.n > 0 && gs.done === gs.n, () => showGuideList(), gs.pct, true),
      vcard('Técnicas', 'Rutas de maestría, técnica por técnica', ts.done + ' / ' + ts.n + ' técnicas',
        ts.n > 0 && ts.done === ts.n, () => showMapList(), ts.pct, true),
      vcard('Entrenamiento', 'Una tanda de 5 ejercicios a tu medida', pend ? pend + ' por hacer' : 'Repaso libre',
        false, () => startTraining(), undefined, true)));
  }

  /* ---------- Banner flotante (mismo componente .errx con barra de tiempo que las alertas de error de la partida) ---------- */
  let bannerEl = null, bannerTxt = null, bannerT = 0;
  function hideBanner() { clearTimeout(bannerT); if (bannerEl) bannerEl.hidden = true; }
  function banner(msg) {
    if (!root) return;
    if (!bannerEl || !bannerEl.isConnected) {
      bannerTxt = h('p');
      bannerEl = h('section', { class: 'errx', role: 'status', 'aria-live': 'polite', hidden: true }, bannerTxt,
        h('button', { class: 'chip', type: 'button', 'aria-label': 'Cerrar aviso', onclick: hideBanner, text: '✕' }),
        h('i', { class: 'errx-bar', 'aria-hidden': 'true' }));
      root.append(bannerEl);
    }
    bannerTxt.textContent = msg; bannerEl.hidden = false;
    const bar = bannerEl.querySelector('.errx-bar');   // reinicia la barra desde cero
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    clearTimeout(bannerT);
    bannerT = setTimeout(hideBanner, 4000);
  }

  /* ---------- Entrenamiento: tanda de 5 ejercicios ---------- */
  const TRAIN_N = 5;
  const lstat = (variant, ch, ls) => { const s = prog && prog.stats && prog.stats[lkey(variant, ch, ls)]; return { f: s ? s.f | 0 : 0, h: s ? s.h | 0 : 0 }; };
  function bumpStat(variant, ch, ls, what) {
    if (!prog.stats) prog.stats = {};
    const k = lkey(variant, ch, ls), s = prog.stats[k] || (prog.stats[k] = { f: 0, h: 0 });
    s[what] = (s[what] | 0) + 1; saveProg();
  }
  // Prioriza lecciones sin completar y las de más fallos/pistas; si no hay, sortea de variantes distintas.
  function pickTraining() {
    const pool = [];
    VARIANTS.forEach(v => getChapters(v).forEach(ch => ch.lessons.forEach(ls => {
      if (!ls.practice) return;
      const st = lstat(v, ch, ls);
      pool.push({ variant: v, ch: ch, ls: ls, base: (lstate(v, ch, ls) === 'done' ? 0 : 100) + 4 * st.f + 2 * st.h });
    })));
    const out = [], used = {};
    while (out.length < TRAIN_N && pool.length) {
      let bi = 0, bs = -1e9;
      pool.forEach((p, i) => { const s = p.base - 3 * (used[p.variant] | 0) + Math.random() * 5; if (s > bs) { bs = s; bi = i; } });
      const p = pool.splice(bi, 1)[0]; used[p.variant] = (used[p.variant] | 0) + 1; out.push(p);
    }
    return out;
  }
  function startTraining() {
    prog = loadProg();
    const items = pickTraining();
    if (!items.length) { toast('Todavía no hay ejercicios disponibles.'); return; }
    ui.train = { items: items, idx: 0, res: [] };
    openTrainItem();
  }
  function openTrainItem() {
    const t = ui.train, it = t.items[t.idx];
    ui.variant = it.variant;
    showPractice(it.ch, it.ls);
  }
  function trainAdvance(entry) {
    const t = ui.train; if (!t) return;
    t.res.push(entry);
    t.idx++;
    if (t.idx < t.items.length) openTrainItem(); else showTrainSummary();
  }
  function showTrainSummary() {
    runCleanup(); closeSheet(); closeCelebrate(); hideBanner();
    const t = ui.train; ui.screen = 'trainSum';
    setTop('Entrenamiento', 'Tutorial');
    clear(body); body.classList.remove('tut-fixed'); body.scrollTop = 0;
    const done = t.res.filter(r => !r.skipped).length;
    const fails = t.res.reduce((n, r) => n + r.f, 0), hints = t.res.reduce((n, r) => n + r.h, 0);
    const list = h('div', { class: 'vlist tut-trainsum' },
      h('h2', { class: 'tut-hub-intro', text: '¡Tanda terminada!' }),
      h('p', { class: 'tut-hub-intro', text: done + ' de ' + t.res.length + ' ejercicios resueltos · ' + fails + (fails === 1 ? ' error' : ' errores') + ' · ' + hints + (hints === 1 ? ' pista' : ' pistas') }));
    t.res.forEach((r, i) => list.append(h('div', { class: 'vcard tut-trow' + (r.skipped ? '' : ' done') },
      h('span', { class: 'vc-main' }, h('b', { class: 'vc-t', text: (i + 1) + '. ' + r.title }),
        h('small', { class: 'vc-s', text: r.skipped ? 'Saltado' : (r.f + ' errores · ' + r.h + ' pistas') })),
      h('span', { class: 'vc-r', text: r.skipped ? '—' : '✓' }))));
    list.append(h('div', { class: 'tut-cta' },
      h('button', { class: 'chip primary', type: 'button', text: 'Otra tanda', onclick: () => startTraining() }),
      h('button', { class: 'chip', type: 'button', text: 'Volver al menú', onclick: () => showHub() })));
    body.append(list);
  }

  /* ---------- Cómo jugar ---------- */
  const GUIDE_SUB = { classic: 'Filas, columnas y bloques', killer: 'Jaulas con suma', diagonal: 'Las dos diagonales',
    antiknight: 'Sin saltos de caballo', nonconsecutive: 'Sin números seguidos pegados', jigsaw: 'Regiones irregulares de 9 celdas', duels: 'Duelo en vivo, fantasma, Co-op y carrera' };

  // Tarjeta vertical de ancho completo (mismo estilo que el submenú Jugar).
  function vcard(title, sub, right, done, onclick, pct, big) {
    const card = h('button', { class: 'vcard' + (done ? ' done' : '') + (big ? ' big' : ''), type: 'button', onclick: onclick },
      h('span', { class: 'vc-main' }, h('b', { class: 'vc-t', text: title }), h('small', { class: 'vc-s', text: sub })),
      h('span', { class: 'vc-r', text: right }));
    if (typeof pct === 'number') card.append(h('span', { class: 'vc-bar', 'aria-hidden': 'true' }, h('i', { style: 'width:' + pct + '%' })));
    return card;
  }

  function showGuideList() {
    runCleanup(); closeSheet(); closeCelebrate();
    ui.screen = 'guideList'; ui.ch = null; ui.ls = null;
    setTop('Cómo jugar', 'Tutorial');
    clear(body); body.classList.remove('tut-fixed');
    body.scrollTop = 0;
    const gs = guideStats();
    const list = h('div', { class: 'vlist' }, h('p', { class: 'tut-hub-intro', text: gs.done + ' de ' + gs.n + ' guías completadas' }));
    GUIDE_VARIANTS.forEach(k => {
      const d = gdone(k);
      list.append(vcard(GUIDES[k].label, GUIDE_SUB[k] || '', d ? 'Completada ✓' : 'Pendiente', d, () => showGuide(k)));
    });
    body.append(list);
  }

  function showGuide(v) {
    runCleanup(); closeSheet(); closeCelebrate();
    if (!(v && GUIDES[v])) v = ui.gv;
    ui.gv = v; store.set(KEY_GVAR, v);
    ui.screen = 'guide'; ui.ch = null; ui.ls = null;
    setTop(GUIDES[v].label, 'Cómo jugar');
    clear(body); body.classList.remove('tut-fixed');
    body.scrollTop = 0;
    body.append(renderGuideBody(ui.gv));
  }

  function renderGuideBody(v) {
    const g = GUIDES[v];
    const wrap = h('div', { class: 'tut-guide' });
    wrap.append(h('section', { class: 'tut-hero' },
      h('p', { class: 'tut-kicker', text: 'Cómo jugar' }),
      h('h2', { text: g.title }),
      h('p', { class: 'tagline', text: g.tagline }),
      h('p', { class: 'intro', text: g.intro })));

    // Ejemplo guiado (visor interactivo) o, en Duelos / Co-op, los pasos de cada modo.
    if (g.example) {
      wrap.append(renderExample(g.example, g.exTitle));
    } else if (g.steps) {
      g.steps.forEach(s => {
        const card = h('section', { class: 'tut-card' }, h('span', { class: 'tag', text: s.tag }), h('h2', { style: 'margin:0 0 2px;font-size:1.1rem', text: s.title }),
          h('ol', null, s.steps.map(t => h('li', { text: t }))));
        if (s.tip) card.append(h('div', { class: 'tip', text: s.tip }));
        wrap.append(card);
      });
    }

    wrap.append(h('section', { class: 'tut-card' }, h('h3', { text: 'Las 3 reglas que siempre se aplican' }),
      h('ol', { class: 'tut-rules' }, g.rules.map(t => h('li', { text: t })))));
    wrap.append(h('section', { class: 'tut-card why' }, h('h3', { text: 'Tu rutina de resolución segura' }),
      h('ol', { class: 'tut-routine' }, g.routine.map((r, k) => h('li', null,
        h('span', { class: 'rn', 'aria-hidden': 'true', text: pad2(k + 1) }),
        h('div', { class: 'rt' }, h('b', { text: r.t }), h('span', { text: r.d })))))));
    wrap.append(h('section', { class: 'tut-card errs' }, h('h3', { text: 'Errores comunes a evitar' }),
      h('ul', { class: 'tut-rules tut-errors' }, g.errors.map(t => h('li', { text: t })))));

    wrap.append(renderCheck(v, g.check));

    const cta = h('div', { class: 'tut-cta' });
    if (g.map) {
      cta.append(h('button', { class: 'chip primary', type: 'button', text: 'Ir a las técnicas de ' + GUIDES[v].label,
        onclick: () => { ui.variant = g.map; store.set(KEY_VAR, g.map); showMap(); } }));
    }
    cta.append(h('button', { class: g.map ? 'chip' : 'chip primary', type: 'button', text: 'Volver al Tutorial', onclick: showHub }));
    wrap.append(cta);
    return wrap;
  }

  /* ---------- Mini-comprobación (una pregunta de 1 paso, con micro-grilla opcional) ---------- */
  function renderCheck(variant, chk) {
    const sec = h('section', { class: 'tut-check' }, h('h3', { text: 'Mini-comprobación' }));
    if (chk.grid) {
      const bd = makeBoard(chk.mode || 'classic', chk.cages, chk.regions);
      const given = digits81(chk.grid), hl = new Set(chk.hl || []);
      for (let i = 0; i < 81; i++) paintCell(bd.cells[i], { v: given[i], cls: (given[i] ? 'given' : '') + (hl.has(i) ? ' tut-hl' : '') });
      sec.append(h('div', { class: 'tut-cwrap' }, bd.el));
    }
    sec.append(h('p', { class: 'tut-cq', text: chk.q }));
    const fb = h('p', { class: 'tut-cfb', role: 'status', 'aria-live': 'polite', text: gdone(variant) ? 'Ya completaste esta guía. Podés repetir la comprobación cuando quieras.' : '' });
    const opts = h('div', { class: 'tut-opts' + (chk.options.some(o => o.length > 22) ? ' one' : ''), role: 'group', 'aria-label': 'Opciones de respuesta' });
    const btns = [];
    let solved = false;
    chk.options.forEach((o, k) => {
      const b = h('button', { class: 'tut-opt', type: 'button', text: o, onclick: () => {
        if (solved) return;
        if (k === chk.answer) {
          solved = true;
          b.classList.add('ok');
          btns.forEach(x => { x.disabled = true; });
          fb.className = 'tut-cfb ok';
          fb.textContent = '¡Correcto! ' + chk.why;
          markGuide(variant);
          const tab = body.querySelector('.tut-tab[aria-selected="true"] small');
          if (tab) tab.textContent = '✓ completada';
        } else {
          b.classList.add('bad'); b.disabled = true;
          fb.className = 'tut-cfb bad';
          fb.textContent = (chk.wrong && chk.wrong[k]) || 'Todavía no. Volvé a mirar la regla e intentá con otra opción.';
        }
      } });
      btns.push(b); opts.append(b);
    });
    sec.append(opts, fb);
    return sec;
  }

  /* ---------- Mapa de técnicas ---------- */
  function tierOf(i, n) { if (n <= 1) return 'beg'; const t = i / (n - 1); return t < 0.34 ? 'beg' : (t < 0.67 ? 'mid' : 'exp'); }

  function showMapList() {
    runCleanup(); closeSheet(); closeCelebrate();
    ui.screen = 'mapList'; ui.ch = null; ui.ls = null; ui.selCh = null;
    setTop('Técnicas', 'Tutorial');
    clear(body); body.classList.remove('tut-fixed');
    body.scrollTop = 0;
    const ts = allTechStats();
    const list = h('div', { class: 'vlist' }, h('p', { class: 'tut-hub-intro', text: ts.done + ' de ' + ts.n + ' técnicas completadas' }));
    VARIANTS.forEach(v => {
      const vs = varStats(v), nCh = getChapters(v).length;
      list.append(vcard(META[v].label, nCh + (nCh === 1 ? ' capítulo' : ' capítulos'),
        vs.n ? vs.done + '/' + vs.n + ' · ' + vs.pct + '%' : 'Próximamente', vs.n > 0 && vs.done === vs.n,
        () => { ui.variant = v; store.set(KEY_VAR, v); ui.selCh = null; showMap(); }, vs.pct));
    });
    body.append(list);
  }

  function showMap() {
    runCleanup(); closeSheet(); closeCelebrate();
    ui.screen = 'map'; ui.ch = null; ui.ls = null;
    if (VARIANTS.indexOf(ui.variant) < 0) ui.variant = 'classic';
    setTop(META[ui.variant].label, 'Técnicas');
    clear(body); body.classList.remove('tut-fixed');
    body.scrollTop = 0;

    const chs = getChapters(ui.variant);
    const vs = varStats(ui.variant);
    body.append(h('p', { class: 'tut-summary' },
      h('b', { text: 'Ruta ' + META[ui.variant].label }), ' · ' + chs.length + ' capítulos · ',
      vs.n ? vs.done + ' de ' + vs.n + ' técnicas completadas' : 'técnicas por cargar'));
    body.append(buildMap(chs));
  }

  function buildMap(chs) {
    const N = chs.length, W = 360, top = 56, gap = 132;
    const H = top * 2 + (N - 1) * gap;
    const off = [0, 70, 0, -70];
    const pts = chs.map((c, i) => ({ x: 180 + off[i % 4], y: top + i * gap }));
    const svg = sv('svg', { class: 'tut-map', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Mapa de capítulos' });

    // Camino continuo: tramo base + tramo iluminado si el capítulo de origen está completo
    for (let i = 0; i < N - 1; i++) {
      const a = pts[i], b = pts[i + 1], dy = (b.y - a.y) * 0.55;
      const d = 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + (a.y + dy) + ' ' + b.x + ' ' + (b.y - dy) + ' ' + b.x + ' ' + b.y;
      svg.append(sv('path', { class: 'tut-track', d: d }));
      if (chStats(ui.variant, chs[i]).complete) svg.append(sv('path', { class: 'tut-track lit tut-seg-' + tierOf(i, N), d: d }));
    }

    chs.forEach((c, i) => {
      const st = chStats(ui.variant, c), tier = tierOf(i, N), p = pts[i];
      const master = N > 1 && i === N - 1;
      const cls = ['tut-node', 'tier-' + tier];
      if (master) cls.push('master');
      if (st.complete) cls.push('done');
      if (!c.lessons.length) cls.push('empty');
      if (ui.selCh === c.id) cls.push('sel');
      const soonTxt = c.planned ? 'Próximamente · ' + c.planned + (c.planned === 1 ? ' técnica' : ' técnicas') : 'Próximamente';
      const g = sv('g', { class: cls.join(' '), transform: 'translate(' + p.x + ' ' + p.y + ')', role: 'button', tabindex: '0',
        'aria-label': 'Capítulo ' + (i + 1) + ': ' + c.title + (c.lessons.length ? ', ' + st.pct + '% completado' : ', ' + soonTxt.toLowerCase()) });
      g.append(sv('circle', { class: 'ring-bg', r: 42 }));
      if (st.pct > 0) g.append(sv('circle', { class: 'ring', r: 42, transform: 'rotate(-90)', pathLength: 100, 'stroke-dasharray': st.pct + ' 100' }));
      if (tier === 'beg') g.append(sv('circle', { class: 'shape', r: 30 }));
      else if (tier === 'mid') g.append(sv('rect', { class: 'shape', x: -29, y: -29, width: 58, height: 58, rx: 12 }));
      else {
        const hex = r => { const a = []; for (let k = 0; k < 6; k++) { const t = (60 * k - 90) * Math.PI / 180; a.push((r * Math.cos(t)).toFixed(1) + ',' + (r * Math.sin(t)).toFixed(1)); } return a.join(' '); };
        g.append(sv('polygon', { class: 'shape', points: hex(34) }));
        if (master) g.append(sv('polygon', { class: 'shape2', points: hex(26) }));
        g.append(sv('rect', { class: 'badge', x: 25, y: -37, width: 11, height: 11, transform: 'rotate(45 30.5 -31.5)' }));
      }
      g.append(sv('text', { class: 'num', x: 0, y: 1 }, pad2(i + 1)));
      // Etiqueta: del lado contrario al desvío del camino
      const right = p.x <= 180, tx = right ? 56 : -56, anchor = right ? 'start' : 'end';
      const words = c.title.split(' '), lines = [''];
      words.forEach(w => { const l = lines[lines.length - 1]; if ((l + ' ' + w).trim().length > 15 && l) lines.push(w); else lines[lines.length - 1] = (l + ' ' + w).trim(); });
      const shown = lines.slice(0, 2);
      shown.forEach((ln, k) => g.append(sv('text', { class: 'lbl', x: tx, y: -6 + k * 16 - (shown.length - 1) * 8, 'text-anchor': anchor }, ln)));
      const sub = c.lessons.length ? st.done + '/' + st.n + ' técnicas · ' + st.pct + '%' : soonTxt;
      g.append(sv('text', { class: 'lbl-sub', x: tx, y: 12 + (shown.length - 1) * 8 + 6, 'text-anchor': anchor }, sub));
      const open = () => openSheet(c, i);
      g.addEventListener('click', open);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      svg.append(g);
    });
    return svg;
  }

  /* ---------- Hoja de lecciones ---------- */
  let sheetEl = null;
  function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
  function openSheet(ch, idx) {
    closeSheet();
    ui.selCh = ch.id;
    const st = chStats(ui.variant, ch);
    const total = chTotal(ch);
    const list = h('ul', { class: 'tut-lessons' });
    ch.lessons.forEach(ls => {
      const s = lstate(ui.variant, ch, ls);
      list.append(h('li', null, h('button', { class: 'tut-lesson ' + s, type: 'button', onclick: () => { closeSheet(); showLesson(ch, ls); } },
        h('span', { class: 'st', 'aria-hidden': 'true', text: s === 'done' ? '✓' : (s === 'seen' ? '•' : '') }),
        h('span', null, h('b', { text: ls.title }), h('small', { text: ls.short || (s === 'done' ? 'Completada' : s === 'seen' ? 'Vista, falta practicar' : 'Nueva') })),
        h('span', { class: 'go', 'aria-hidden': 'true', text: '›' }))));
    });
    // Casillas reservadas para las técnicas que todavía no se cargaron
    for (let k = ch.lessons.length; k < total; k++) {
      list.append(h('li', null, h('button', { class: 'tut-lesson soon', type: 'button', disabled: true },
        h('span', { class: 'st', 'aria-hidden': 'true', text: String(k + 1) }),
        h('span', null, h('b', { text: 'Técnica ' + (k + 1) }), h('small', { text: 'Próximamente' })))));
    }
    const note = ch.planned
      ? 'Este capítulo reserva ' + ch.planned + (ch.planned === 1 ? ' técnica' : ' técnicas') + ' que aparecerán acá cuando se agregue su archivo de datos (tutorial-data-*.js).'
      : 'Este capítulo todavía no tiene lecciones cargadas. Aparecerán acá cuando se agregue su archivo de datos (tutorial-data-*.js).';
    const bar = h('div', { class: 'tut-bar', 'aria-hidden': 'true' }, h('i'));
    sheetEl = h('div', { class: 'tut-sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Lecciones del capítulo',
      onclick: e => { if (e.target === sheetEl) { closeSheet(); ui.selCh = null; showMapKeepScroll(); } } },
      h('div', { class: 'tut-sheet' },
        h('p', { class: 'tut-kicker', text: 'Capítulo ' + pad2(idx + 1) }),
        h('h2', { text: ch.title }),
        h('p', { class: 'tut-blurb', text: ch.blurb }),
        bar,
        ch.lessons.length ? list : h('p', { class: 'tut-empty-note', text: note }),
        h('button', { class: 'chip wide', type: 'button', onclick: () => { closeSheet(); ui.selCh = null; showMapKeepScroll(); }, text: 'Cerrar' })));
    root.append(sheetEl);
    requestAnimationFrame(() => { const i = bar.firstChild; if (i) i.style.width = st.pct + '%'; });
  }
  function showMapKeepScroll() { const y = body ? body.scrollTop : 0; showMap(); if (body) body.scrollTop = y; }

  /* ---------- Lección ---------- */
  function showLesson(ch, ls) {
    runCleanup(); closeSheet(); closeCelebrate();
    ui.screen = 'lesson'; ui.ch = ch; ui.ls = ls; ui.selCh = null;
    markSeen(ui.variant, ch, ls);
    setTop(ch.title, 'Mapa');
    clear(body); body.classList.remove('tut-fixed'); body.scrollTop = 0;
    const th = ls.theory || {};
    body.append(h('div', { class: 'tut-lhead' }, h('p', { class: 'tut-kicker', text: 'Lección' }), h('h2', { text: ls.title }), ls.short ? h('p', { text: ls.short }) : null));
    body.append(h('section', { class: 'tut-card' }, h('h3', { text: '¿Qué es?' }), h('p', { text: th.what || '' })));
    body.append(h('section', { class: 'tut-card' }, h('h3', { text: '¿Cómo detectarlo?' }), h('p', { text: th.detect || '' })));
    body.append(h('section', { class: 'tut-card why' }, h('h3', { text: '¿Por qué importa?' }), h('p', { text: th.why || '' })));
    if (th.faq && th.faq.length) {
      const faq = h('section', { class: 'tut-faq' }, h('h3', { text: 'Preguntas frecuentes' }));
      th.faq.forEach((f, k) => {
        const ans = h('div', { id: 'tutfaq' + k, hidden: true, text: f.a });
        const btn = h('button', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'tutfaq' + k, text: f.q,
          onclick: () => { const open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', open ? 'false' : 'true'); ans.hidden = open; } });
        faq.append(h('div', { class: 'tut-q' }, btn, ans));
      });
      body.append(faq);
    }
    body.append(renderExample(ls.example));
    if (ls.practice) {
      body.append(h('div', { class: 'tut-cta' }, h('button', { class: 'chip primary', type: 'button', onclick: () => { ui.train = null; showPractice(ch, ls); }, text: 'Practicar ahora' })));
    }
  }

  /* ---------- Ejemplo paso a paso ---------- */
  function renderExample(ex, title) {
    const mode = ex.mode || 'classic';
    const b = makeBoard(mode, ex.cages, ex.regions);
    const given = digits81(ex.grid);
    const steps = ex.steps, total = steps.length;
    let k = 0;
    const cap = h('p', { class: 'tut-cap', role: 'status', 'aria-live': 'polite' });
    const stepLbl = h('span', { class: 'tut-step' });
    const prev = h('button', { class: 'chip', type: 'button', text: '‹ Anterior', onclick: () => go(k - 1) });
    const next = h('button', { class: 'chip', type: 'button', text: 'Siguiente ›', onclick: () => go(k + 1) });
    const dots = h('div', { class: 'tut-dots', 'aria-hidden': 'true' });
    steps.forEach(() => dots.append(h('i')));

    const toSet = arr => new Set(arr || []);
    function paint(popNew) {
      const st = steps[k], placed = {};
      for (let j = 0; j <= k; j++) { const p = steps[j].place; if (p) for (const key in p) placed[key] = p[key]; }
      const hl = toSet(st.hl), rel = toSet(st.rel), src = toSet(st.src), same = toSet(st.same), no = toSet(st.no);
      for (let i = 0; i < 81; i++) {
        const cls = [];
        let v = given[i];
        if (v) cls.push('given');
        else if (placed[i]) { v = placed[i]; cls.push('user'); if (popNew && st.place && st.place[i]) cls.push('tut-pop'); }
        if (rel.has(i)) cls.push('tut-rel');
        if (same.has(i)) cls.push('same');
        if (src.has(i)) cls.push('tut-src');
        if (hl.has(i)) cls.push('tut-hl');
        if (no.has(i)) cls.push('tut-no');
        paintCell(b.cells[i], {
          v: v, cls: cls.join(' '),
          notes: st.show && st.show[i] ? new Set(st.show[i]) : null,
          strike: st.strike && st.strike[i] ? new Set(st.strike[i]) : null,
          keep: st.keep && st.keep[i] ? new Set(st.keep[i]) : null
        });
      }
      cap.textContent = st.text || '';
      stepLbl.textContent = 'Paso ' + (k + 1) + ' / ' + total;
      prev.disabled = k === 0; next.disabled = k === total - 1;
      Array.prototype.forEach.call(dots.children, (d, j) => { d.className = j === k ? 'on' : (j < k ? 'past' : ''); });
    }
    function go(n) { if (n < 0 || n >= total) return; k = n; paint(true); }
    paint(false);
    const card = h('section', { class: 'tut-ex', tabindex: '0', 'aria-label': 'Ejemplo práctico paso a paso',
      onkeydown: e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(k - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(k + 1); } } },
      h('h3', { text: title || 'Ejemplo práctico' }), b.el, cap, h('div', { class: 'tut-ctrl' }, prev, stepLbl, next), dots);
    return card;
  }

  /* ---------- Práctica ---------- */
  function showPractice(ch, ls) {
    runCleanup(); closeSheet(); closeCelebrate(); hideBanner();
    ui.screen = 'practice'; ui.ch = ch; ui.ls = ls;
    const pr = ls.practice;
    const T = ui.train, tv = ui.variant, run = { f: 0, h: 0 };   // run: errores y pistas de este intento (para el resumen)
    if (T) setTop('Ejercicio ' + (T.idx + 1) + ' / ' + T.items.length, 'Tutorial'); else setTop(ls.title, 'Lección');
    clear(body); body.classList.add('tut-fixed'); body.scrollTop = 0;

    const mode = pr.mode || 'classic';
    const given = digits81(pr.grid);
    const sol = pr.solution ? digits81(pr.solution) : null;
    const peers = peersFor(mode, pr.regions);
    const isNC = mode === 'nonconsecutive';
    const P = {
      val: given.slice(), notes: [], hist: [], sel: -1, digit: null, pencil: false, won: false, hintOn: false,
      inputMode: store.get(KEY_INPUT) === 'cell-first' ? 'cell-first' : 'digit-first'
    };
    for (let i = 0; i < 81; i++) {
      const s = new Set();
      if (pr.notes === 'auto' && !given[i]) for (let d = 1; d <= 9; d++) { let ok = true; peers[i].forEach(p => { if (given[p] === d) ok = false; }); if (ok && isNC && ncBlocked(given, i, d)) ok = false; if (ok) s.add(d); }
      P.notes.push(s);
    }
    const goal = pr.goal || {};
    const hintCells = new Set(pr.hintCells || []);

    const b = makeBoard(mode, pr.cages, pr.regions);
    const goalTxt = h('span', { text: goal.text || 'Aplicá la técnica de esta lección.' });
    const progTxt = h('span', { class: 'tut-prog', hidden: true });
    const hintTxt = h('span', { class: 'tut-hint-txt', hidden: true, text: pr.hint || '' });
    const goalBox = h('div', { class: 'tut-goal', role: 'status', 'aria-live': 'polite' }, h('b', { text: 'Objetivo' }),
      T ? h('em', { class: 'tut-train-lbl', text: ls.title + ' · ' }) : null, goalTxt, progTxt, hintTxt,
      T ? h('button', { class: 'chip tut-skip', type: 'button', text: 'Saltar', onclick: () => trainAdvance({ title: ls.title, f: run.f, h: run.h, skipped: true }) }) : null);

    const tools = h('nav', { class: 'tools tut-ptools', 'aria-label': 'Herramientas de práctica' });
    const mkTool = (act, ic, label) => h('button', { type: 'button', 'data-act': act }, h('span', { class: 'ic', text: ic }), h('span', { class: 'lbl', text: label }));
    const bUndo = mkTool('undo', '↶', 'Deshacer'), bErase = mkTool('erase', '⌫', 'Borrar'), bPencil = mkTool('pencil', '✎', 'Notas'),
      bHint = mkTool('hint', '✦', 'Pista'), bMode = mkTool('inputmode', '⇄', '');
    tools.append(bUndo, bErase, bPencil, bHint, bMode);
    const keypad = h('div', { class: 'keypad tut-pkeys', 'aria-label': 'Teclado numérico' });
    const keys = [];
    for (let d = 1; d <= 9; d++) { const kb = h('button', { type: 'button', 'data-n': d }, String(d), h('span', { class: 'rem' })); keys.push(kb); keypad.append(kb); }

    body.append(goalBox, h('div', { class: 'tut-pstage' }, b.el), tools, keypad);

    function setProg() {
      if (goal.elimSets && goal.elimSets.length) {
        let best = null;
        goal.elimSets.forEach(set => {
          const done = set.filter(x => P.val[x[0]] === 0 && !P.notes[x[0]].has(x[1])).length;
          if (!best || done / set.length > best.done / best.total) best = { done: done, total: set.length };
        });
        progTxt.hidden = false; progTxt.textContent = 'Candidatos eliminados: ' + best.done + ' / ' + best.total;
      }
    }
    function refreshKeys() {
      const cnt = new Array(10).fill(0);
      P.val.forEach(v => { if (v) cnt[v]++; });
      keys.forEach((kb, i) => {
        const d = i + 1, left = 9 - cnt[d];
        kb.querySelector('.rem').textContent = left > 0 ? String(left) : '';
        kb.classList.toggle('done', left <= 0);
        kb.classList.toggle('active', P.inputMode === 'digit-first' && P.digit === d);
      });
      bPencil.classList.toggle('on', P.pencil);
      bPencil.setAttribute('aria-pressed', P.pencil ? 'true' : 'false');
      bMode.classList.toggle('dfirst', P.inputMode === 'digit-first');
      bMode.setAttribute('aria-pressed', P.inputMode === 'digit-first' ? 'true' : 'false');
      bMode.querySelector('.lbl').textContent = P.inputMode === 'digit-first' ? 'Nº→Celda' : 'Celda→Nº';
      bUndo.disabled = !P.hist.length || P.won;
      b.el.classList.toggle('pencil', P.pencil);
    }
    function paintAll() {
      const activeD = P.inputMode === 'digit-first' ? P.digit : (P.sel >= 0 ? P.val[P.sel] : 0);
      for (let i = 0; i < 81; i++) {
        const cls = [];
        if (given[i]) cls.push('given'); else if (P.val[i]) cls.push('user');
        if (activeD && P.val[i] === activeD) cls.push('same');
        if (i === P.sel) cls.push('sel');
        if (P.hintOn && hintCells.has(i)) cls.push('hint');
        paintCell(b.cells[i], { v: P.val[i], cls: cls.join(' '), notes: P.notes[i] });
      }
      refreshKeys(); setProg();
    }
    const sfx = n => { try { if (window.Sound) window.Sound.play(n); } catch (e) { /* ignorar */ } };
    const flash = (i, msg) => {
      sfx('error'); run.f++; bumpStat(tv, ch, ls, 'f');
      const c = b.cells[i];
      c.classList.add('tut-shake', 'err');
      setTimeout(() => { c.classList.remove('tut-shake', 'err'); }, 420);
      toast(msg);
    };
    function snap(i) { return { i: i, v: P.val[i], n: Array.from(P.notes[i]) }; }
    function pushHist(i) { P.hist.push(snap(i)); }

    function checkWin() {
      if (P.won) return;
      let ok = false;
      if (goal.place) ok = goal.place.some(x => P.val[x[0]] === x[1] && !given[x[0]]);
      if (!ok && goal.elimSets) ok = goal.elimSets.some(set => set.every(x => P.val[x[0]] === 0 && !P.notes[x[0]].has(x[1])));
      if (ok) {
        P.won = true; sfx('win'); markDone(ui.variant, ch, ls); paintAll();
        if (T) setTimeout(() => { if (ui.train === T && ui.screen === 'practice') trainAdvance({ title: ls.title, f: run.f, h: run.h, skipped: false }); }, 900);
        else setTimeout(() => celebrate(ch, ls), 350);
      }
    }

    function applyToCell(i, d) {
      if (P.won || given[i]) return;
      if (P.pencil) {
        if (P.val[i]) return;
        const has = P.notes[i].has(d);
        if (has && sol && sol[i] === d) { flash(i, 'Ese candidato sí puede ser el correcto: no lo tachés.'); return; }
        pushHist(i);
        sfx('note');
        if (has) P.notes[i].delete(d); else P.notes[i].add(d);
      } else {
        if (P.val[i] === d) return;
        let ok;
        if (sol) ok = sol[i] === d;
        else { ok = true; peers[i].forEach(p => { if (P.val[p] === d) ok = false; }); if (ok && isNC && ncBlocked(P.val, i, d)) ok = false; }
        if (!ok) { flash(i, 'Ese número no encaja ahí. Probá otra deducción.'); return; }
        // Validación estricta: una jugada correcta que no es la de la técnica no se coloca ni hace avanzar la lección.
        const inGoal = goal.place && goal.place.some(x => x[0] === i && x[1] === d);
        if (goal.place ? !inGoal : !!goal.elimSets) {
          sfx('tap');
          banner('Esa celda es correcta, pero primero encontrá dónde aplicar ' + ls.title + '.');
          return;
        }
        pushHist(i);
        sfx('correct');
        P.val[i] = d; P.notes[i].clear();
      }
      paintAll(); checkWin();
    }

    b.el.addEventListener('click', e => {
      const t = e.target.closest('.cell'); if (!t) return;
      const i = +t.dataset.i;
      P.sel = i; P.hintOn = false; hintTxt.hidden = true;
      if (!(P.inputMode === 'digit-first' && P.digit && !given[i])) sfx('tap');
      if (P.inputMode === 'digit-first' && P.digit && !given[i]) { applyToCell(i, P.digit); if (P.won) return; }
      paintAll();
    });
    keypad.addEventListener('click', e => {
      const kb = e.target.closest('button'); if (!kb || P.won) return;
      const d = +kb.dataset.n;
      if (P.inputMode === 'digit-first') { P.digit = P.digit === d ? null : d; paintAll(); }
      else if (P.sel >= 0) applyToCell(P.sel, d);
      else toast('Tocá primero una celda.');
    });
    tools.addEventListener('click', e => {
      const bt = e.target.closest('button'); if (!bt || bt.disabled) return;
      const a = bt.dataset.act;
      if (a === 'undo') {
        const h0 = P.hist.pop(); if (!h0) return;
        P.val[h0.i] = h0.v; P.notes[h0.i] = new Set(h0.n); paintAll();
      } else if (a === 'erase') {
        const i = P.sel; if (i < 0 || given[i] || P.won) return;
        if (!P.val[i] && !P.notes[i].size) return;
        pushHist(i); P.val[i] = 0; P.notes[i].clear(); paintAll();
      } else if (a === 'pencil') { P.pencil = !P.pencil; paintAll(); }
      else if (a === 'hint') { P.hintOn = !P.hintOn; if (P.hintOn) { run.h++; bumpStat(tv, ch, ls, 'h'); } hintTxt.hidden = !P.hintOn || !pr.hint; paintAll(); }
      else if (a === 'inputmode') {
        P.inputMode = P.inputMode === 'digit-first' ? 'cell-first' : 'digit-first';
        store.set(KEY_INPUT, P.inputMode); P.digit = null; paintAll();
      }
    });
    const onKey = e => {
      if (ui.screen !== 'practice' || P.won || sheetEl || celebEl) return;
      if (e.key >= '1' && e.key <= '9') {
        const d = +e.key;
        if (P.inputMode === 'digit-first') { P.digit = P.digit === d ? null : d; paintAll(); }
        else if (P.sel >= 0) applyToCell(P.sel, d);
      } else if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') && P.sel >= 0 && !given[P.sel]) {
        if (P.val[P.sel] || P.notes[P.sel].size) { pushHist(P.sel); P.val[P.sel] = 0; P.notes[P.sel].clear(); paintAll(); }
      } else if (e.key === 'n' || e.key === 'N') { P.pencil = !P.pencil; paintAll(); }
      else if (e.key.indexOf('Arrow') === 0) {
        e.preventDefault();
        let r = P.sel < 0 ? 0 : Math.floor(P.sel / 9), c = P.sel < 0 ? 0 : P.sel % 9;
        if (P.sel >= 0) {
          if (e.key === 'ArrowUp') r = Math.max(0, r - 1); else if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
          else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1); else c = Math.min(8, c + 1);
        }
        P.sel = r * 9 + c; paintAll();
      }
    };
    document.addEventListener('keydown', onKey);
    ui.cleanup = () => document.removeEventListener('keydown', onKey);
    paintAll();
  }

  /* ---------- Aviso breve ---------- */
  let toastT = null;
  function toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 2400);
  }

  /* ---------- Celebración ---------- */
  let celebEl = null;
  function closeCelebrate() { if (celebEl) { celebEl.remove(); celebEl = null; } }
  function celebrate(ch, ls) {
    closeCelebrate();
    const nx = nextLesson(ui.variant, ch, ls);
    const conf = h('div', { 'aria-hidden': 'true' });
    const colors = ['var(--t-beg)', 'var(--user)', 'var(--t-exp)', 'var(--t-master)', 'var(--accent)'];
    for (let i = 0; i < 28; i++) {
      conf.append(h('i', { class: 'tut-conf', style: 'left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colors[i % colors.length] +
        ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's;animation-duration:' + (1.7 + Math.random() * 1.2).toFixed(2) + 's;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg' }));
    }
    const hexPts = (() => { const a = []; for (let k = 0; k < 6; k++) { const t = (60 * k - 90) * Math.PI / 180; a.push((40 + 34 * Math.cos(t)).toFixed(1) + ',' + (40 + 34 * Math.sin(t)).toFixed(1)); } return a.join(' '); })();
    const medal = sv('svg', { class: 'tut-medal', viewBox: '0 0 80 80', 'aria-hidden': 'true' },
      sv('polygon', { class: 'hexa', points: hexPts }),
      sv('polygon', { class: 'hexb', points: hexPts.split(' ').map(p => { const q = p.split(','); return (40 + (q[0] - 40) * 0.78).toFixed(1) + ',' + (40 + (q[1] - 40) * 0.78).toFixed(1); }).join(' ') }),
      sv('path', { class: 'chk', d: 'M26 41 L36 51 L55 29' }));
    const st = chStats(ui.variant, ch);
    const card = h('div', { class: 'tut-ccard' }, medal,
      h('h2', { text: '¡Técnica superada!' }),
      h('p', { text: ls.title + (st.complete ? ' · ¡Capítulo "' + ch.title + '" completo!' : '') }),
      nx ? h('button', { class: 'chip primary', type: 'button', text: 'Siguiente lección: ' + nx.ls.title, onclick: () => { closeCelebrate(); showLesson(nx.ch, nx.ls); } }) : null,
      h('button', { class: 'chip', type: 'button', text: 'Volver al mapa', onclick: () => { closeCelebrate(); showMap(); } }),
      h('button', { class: 'chip', type: 'button', text: 'Repasar la lección', onclick: () => { closeCelebrate(); showLesson(ch, ls); } }));
    celebEl = h('div', { class: 'tut-celebrate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Técnica superada' }, conf, card);
    root.append(celebEl);
    const first = card.querySelector('button'); if (first) first.focus();
  }

  /* =====================================================================
     8. API PÚBLICA
     ===================================================================== */
  const Tutorial = {
    open(el) {
      root = el || document.getElementById('tutorial-view');
      if (!root) return;
      prog = loadProg();
      const v = store.get(KEY_VAR);
      if (VARIANTS.indexOf(v) >= 0) ui.variant = v;
      const gv = store.get(KEY_GVAR);
      if (GUIDE_VARIANTS.indexOf(gv) >= 0) ui.gv = gv;
      ui.selCh = null;
      build();
      showHub();
    },
    close() { runCleanup(); closeSheet(); closeCelebrate(); hideBanner(); ui.train = null; },
    back: onBack,
    progress() { return prog || loadProg(); }
  };
  window.Tutorial = Tutorial;

  // Escape: cierra hoja/celebración o retrocede una pantalla (solo con el tutorial visible).
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !root || root.hidden) return;
    if (sheetEl) { closeSheet(); ui.selCh = null; showMapKeepScroll(); }
    else if (celebEl) closeCelebrate();
    else onBack();
  });
}());
