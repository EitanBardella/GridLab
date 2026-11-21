/* =====================================================================
   Tutorial — técnicas nuevas de las variantes (se cargan después de tutorial-data-variants.js):
     Diagonal    d2  + "Par en diagonal"
     Anti-Caballo a2 + "Esquina que ataca al bloque vecino"
     Sin Consecutivos n1: "Aislamiento del 1 y el 9" y "Par consecutivo"
     Jigsaw      j1: "Región–línea" y "Regla del 45 (innies y outies)"
   Los 12 tableros (6 de ejemplo y 6 de práctica) tienen solución única, verificada con un solver
   que respeta las reglas de cada variante; cada técnica se comprobó sobre los candidatos reales.
   Nota: en Anti-Caballo no existen "triángulos de caballo": el grafo del caballo es bipartito
   (cada salto cambia de color de casilla), así que tres celdas nunca se atacan entre sí.
   ===================================================================== */
(function () {
  'use strict';
  var R = (window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {});
  var A9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  function col(c) { var o = []; for (var r = 0; r < 9; r++) o.push(r * 9 + c); return o; }
  var DIAG2 = [8, 16, 24, 32, 40, 48, 56, 64, 72];

  // Mapas Jigsaw (9 regiones de 9 celdas, conexas)
  function mapOf(s) { return s.split('').map(Number); }
  var JM = mapOf('000111222' + '000111332' + '040111332' + '045555322' + '645455332' + '644455332' + '644677777' + '666688877' + '688888877');
  var M45 = mapOf('000000000' + '111111112' + '333444412' + '334444422' + '335555522' + '366655522' + '366666582' + '777768888' + '777778888');
  var J_R0 = [0, 1, 2, 9, 10, 11, 18, 20, 27];

  /* ---------------- Diagonal: par en diagonal ---------------- */
  var diagPair = {
    id: 'diagonal-pair',
    title: 'Par en diagonal (Diagonal Pair)',
    short: 'Un par desnudo que solo las une la diagonal',
    theory: {
      what: 'Cada diagonal principal es una casa más: tiene sus 9 celdas y los dígitos del 1 al 9 sin repetir. Si dos celdas libres de la diagonal tienen exactamente los mismos dos candidatos, forman un Par desnudo dentro de la diagonal, aunque no compartan fila, columna ni bloque. Y los Tríos funcionan igual: tres celdas con tres candidatos en común.',
      detect: 'Anotá los candidatos de las celdas libres de una diagonal. Si dos tienen los mismos dos números, esos dos números están reservados para ellas: tachalos en las demás celdas de esa diagonal. Con tres celdas y tres números, o con dos números que solo caben en dos celdas (par oculto), pasa lo mismo.',
      why: 'Sin la diagonal, estas dos celdas no se ven y el par es invisible. Es la forma más común de limpiar candidatos y suele dejar nuevos pares y únicos en cadena.',
      faq: [
        { q: '¿Y si las dos celdas ya comparten fila, columna o bloque?', a: 'Entonces es el Par desnudo del clásico, que también elimina en esa casa. Esta lección trata el caso nuevo: celdas lejanas que solo se ven por la diagonal.' },
        { q: '¿Sirven los Tríos y los pares ocultos?', a: 'Sí. Las 9 celdas de cada diagonal se tratan como una región más para cualquier grupo desnudo u oculto.' },
        { q: '¿El bloque central cuenta de forma especial?', a: 'La celda central pertenece a las dos diagonales, así que cualquiera de las dos puede usarla para eliminar.' }
      ]
    },
    example: {
      mode: 'diagonal',
      grid: '075080003300507000040602580003020008809170002000000000512048000000060340000009000',
      steps: [
        { text: 'Miremos la diagonal secundaria (↙, celdas teñidas). Ya tiene el 3, el 5, el 7 y el 2: le faltan el 1, 4, 6, 8 y 9 en sus 5 celdas libres. Mostramos sus candidatos.',
          rel: DIAG2, show: { 16: [1, 6, 9], 32: [4, 6], 48: [4, 8, 9], 64: [8, 9], 72: [4, 6] } },
        { text: 'F4C6 y F9C1 tienen exactamente los mismos candidatos: 4 y 6. No comparten fila, columna ni bloque, pero las une la diagonal: es un Par desnudo en diagonal.',
          hl: [32, 72], rel: DIAG2, show: { 16: [1, 6, 9], 32: [4, 6], 48: [4, 8, 9], 64: [8, 9], 72: [4, 6] }, keep: { 32: [4, 6], 72: [4, 6] } },
        { text: 'Entre las dos se reparten el 4 y el 6 de esta diagonal: ninguna otra celda de la diagonal puede llevarlos. F2C8 tenía un 6 y F6C4 un 4: los tachamos.',
          hl: [32, 72], rel: DIAG2, show: { 16: [1, 6, 9], 32: [4, 6], 48: [4, 8, 9], 64: [8, 9], 72: [4, 6] },
          strike: { 16: [6], 48: [4] }, keep: { 32: [4, 6], 72: [4, 6] } },
        { text: 'Ahora F6C4 y F8C2 quedan con 8 y 9 (otro par en la misma diagonal). Entonces F2C8 no puede ser 9: solo le queda el 1.',
          hl: [48, 64, 16], rel: DIAG2, show: { 16: [1, 6, 9], 32: [4, 6], 48: [4, 8, 9], 64: [8, 9], 72: [4, 6] },
          strike: { 16: [6, 9], 48: [4] }, keep: { 16: [1], 48: [8, 9], 64: [8, 9] } },
        { text: 'Colocamos el 1 en F2C8. Dos pares en una sola diagonal nos dieron un número.', hl: [16], place: { 16: 1 } }
      ]
    },
    practice: {
      mode: 'diagonal',
      grid: '800007005053000040040000000309608000180090002500000893400900000930014078010735004',
      solution: '896427135753861249241359786329648517187593462564172893472986351935214678618735924',
      notes: 'auto',
      goal: { text: 'En la diagonal principal (↘) hay dos celdas libres lejanas con los mismos dos candidatos. Tachá (modo Notas) esos dos números en la otra celda de la diagonal que los tiene.', elimSets: [[[60, 1], [60, 2]]] },
      hint: 'Buscá en la diagonal ↘ dos celdas libres con exactamente los mismos dos candidatos. Después mirá qué otra celda de la diagonal los tiene.',
      hintCells: [20, 50]
    }
  };

  /* ---------------- Anti-Caballo: esquina que ataca al bloque vecino ---------------- */
  var knightCorner = {
    id: 'knight-corner',
    title: 'Esquina que ataca al bloque vecino (Corner Attack)',
    short: 'Un número en la esquina de su bloque',
    theory: {
      what: 'Un número que está en una esquina de su bloque 3×3 manda sus saltos de caballo hacia el bloque vecino: ataca dos celdas justas de ese bloque (una en la fila de la esquina y otra a un paso de ella). Esas dos celdas no pueden llevar ese mismo número, y a veces son las que le faltaban descartar a un Único oculto.',
      detect: 'Mirá un número que ya esté colocado en una esquina de su bloque. En los bloques vecinos (el de al lado y el de arriba o abajo), buscá dónde puede ir ese mismo número: tachá las celdas a salto de caballo de la esquina. Si queda un solo lugar en el bloque, es un Único oculto.',
      why: 'Es una de las eliminaciones más rápidas de esta variante: no hay que anotar candidatos, solo recordar que una esquina "dispara" a dos celdas del bloque vecino.',
      faq: [
        { q: '¿Solo las esquinas?', a: 'Cualquier celda ataca con el caballo. Pero la esquina es especial: sus dos saltos hacia adentro del bloque vecino caen siempre en el mismo bloque, así que descartan dos lugares de una vez.' },
        { q: '¿Qué pasa con la celda central del bloque?', a: 'Dentro de un mismo bloque el caballo no agrega nada: esas celdas ya se ven entre sí. El caballo solo aporta hacia afuera del bloque.' },
        { q: '¿Existen "triángulos" de caballo?', a: 'No: cada salto de caballo cambia el color de la casilla en un tablero de ajedrez, así que tres celdas nunca pueden atacarse entre sí.' }
      ]
    },
    example: {
      mode: 'antiknight',
      grid: '020040000030100000001502704010400000000601000080205100008700400600000000000309861',
      steps: [
        { text: 'Busquemos el 7 en el bloque superior central (marcado).', rel: [3, 4, 5, 12, 13, 14, 21, 22, 23] },
        { text: 'Con fila y columna: el 7 de F3C7 bloquea la celda F3C5 (misma fila) y el 7 de F7C4 bloquea F1C4 (misma columna). Las marcamos con ✕.',
          rel: [3, 4, 5, 12, 13, 14, 21, 22, 23], src: [24, 57], same: [24, 57], no: [3, 22], show: { 5: [7], 13: [7], 14: [7] } },
        { text: 'Quedan tres lugares para el 7: F1C6, F2C5 y F2C6. En un clásico habría que seguir buscando; acá falta mirar el caballo.',
          rel: [3, 4, 5, 12, 13, 14, 21, 22, 23], no: [3, 22], show: { 5: [7], 13: [7], 14: [7] }, hl: [5, 13, 14] },
        { text: 'El 7 de F3C7 está en la esquina de su bloque (abajo a la izquierda). Sus saltos de caballo caen justo en el bloque vecino: ataca a F1C6 y a F2C5. Ahí no puede haber otro 7.',
          hl: [24], rel: [5, 13], src: [24], same: [24], no: [3, 22, 5, 13], show: { 5: [7], 13: [7], 14: [7] } },
        { text: 'Tachamos el 7 de las dos. Solo sobrevive F2C6: Único oculto del bloque.',
          hl: [14], no: [3, 22, 5, 13], show: { 5: [7], 13: [7], 14: [7] }, strike: { 5: [7], 13: [7] }, keep: { 14: [7] } },
        { text: 'Colocamos el 7 en F2C6.', hl: [14], place: { 14: 7 } }
      ]
    },
    practice: {
      mode: 'antiknight',
      grid: '100008200600430000094000600019080000806010950050000810037060004200100000040072008',
      solution: '175698243682431795394257681719586432826314957453729816937865124268143579541972368',
      notes: 'none',
      goal: { text: 'En el bloque superior derecho, el 8 solo puede ir en una celda si tenés en cuenta el salto de caballo desde la esquina de un bloque vecino. Colocalo.', place: [[25, 8]] },
      hint: 'El 8 de F1C6 está en la esquina de su bloque y ataca con el caballo a una celda del bloque de la derecha.',
      hintCells: [5, 16]
    }
  };

  /* ---------------- Sin Consecutivos ---------------- */
  var ncIso = {
    id: 'nc-isolation',
    title: 'Aislamiento del 1 y el 9 (Isolated Ends)',
    short: 'El 1 solo prohíbe al 2; el 9 solo al 8',
    theory: {
      what: 'En Sin Consecutivos, las celdas que comparten lado no pueden llevar números consecutivos. El 1 y el 9 son los extremos: el 1 solo tiene un consecutivo (el 2) y el 9 solo tiene el 8. Entonces, un 1 prohíbe el 2 en sus cuatro celdas vecinas (arriba, abajo, izquierda y derecha) y un 9 prohíbe el 8.',
      detect: 'Cuando una celda tenga un 1 o un 9 a su lado, tachá el 2 (o el 8) además de lo habitual. Con cualquier otro vecino n, se descartan n−1 y n+1 a la vez: el 1 y el 9 son los que descartan uno solo.',
      why: 'Es la eliminación más barata de la variante: un solo vecino alcanza para quitar candidatos y, sumada a la fila, columna y bloque, suele dejar un Único desnudo.',
      faq: [
        { q: '¿Se aplica en diagonal?', a: 'No: solo cuentan los cuatro vecinos que comparten lado (arriba, abajo, izquierda y derecha).' },
        { q: '¿Un 1 también prohíbe otro 1 a su lado?', a: 'Sí, pero eso ya lo prohíbe la fila o la columna: los vecinos ortogonales siempre comparten una de las dos.' },
        { q: '¿Y el 5?', a: 'Un 5 prohíbe 4 y 6. Cuanto más al centro, más candidatos descarta el vecino.' }
      ]
    },
    example: {
      mode: 'nonconsecutive',
      grid: '000006000096800701100000300600057000031080070000001048507490062003720090029100000',
      steps: [
        { text: 'Tomemos F5C4. A la izquierda tiene un 1 (F5C3) y a la derecha un 8 (F5C5). Sus vecinos ortogonales (marcados) no pueden llevar números consecutivos con ella.',
          hl: [39], rel: [30, 48, 38, 40], src: [38, 40] },
        { text: 'Primero lo de siempre: con fila, columna y bloque ya solo quedan el 2, el 6 y el 9.', hl: [39],
          show: { 39: A9 }, strike: { 39: [1, 3, 4, 5, 7, 8] }, keep: { 39: [2, 6, 9] } },
        { text: 'Ahora el 1 de la izquierda: el 1 solo tiene un consecutivo, el 2. Por eso F5C4 no puede ser 2. Tachamos el 2.', hl: [39], src: [38], same: [38],
          show: { 39: A9 }, strike: { 39: [1, 2, 3, 4, 5, 7, 8] }, keep: { 39: [6, 9] } },
        { text: 'Y el 8 de la derecha prohíbe el 7 y el 9 (sus consecutivos). Tachamos el 9. Con un 9 habría pasado lo contrario: solo el 8 desaparece.', hl: [39], src: [40], same: [40],
          show: { 39: A9 }, strike: { 39: [1, 2, 3, 4, 5, 7, 8, 9] }, keep: { 39: [6] } },
        { text: 'Solo queda el 6, Único desnudo. Colocamos el 6 en F5C4.', hl: [39], place: { 39: 6 } }
      ]
    },
    practice: {
      mode: 'nonconsecutive',
      grid: '072809004050000000400003000800007000000080000605001700063704005000538061504060000',
      solution: '372859614958416372416273859841627593297385146635941728163794285729538461584162937',
      notes: 'none',
      goal: { text: 'Hay una celda junto a un 1 (y a otros vecinos) que, con la regla de los consecutivos, queda con un único candidato. Encontrala y colocá su número.', place: [[41, 5]] },
      hint: 'Mirá F5C6: tiene un 1 debajo, un 7 arriba y un 8 a la izquierda. Descartá lo de la fila, columna y bloque y después los consecutivos de cada vecino.',
      hintCells: [41, 50, 32, 40]
    }
  };

  var ncPair = {
    id: 'nc-pair',
    title: 'Par consecutivo (Consecutive Pair)',
    short: 'Dos candidatos seguidos bloquean a los vecinos',
    theory: {
      what: 'Si una celda solo admite dos candidatos consecutivos, por ejemplo {5, 6}, ninguno de sus cuatro vecinos ortogonales puede ser 5 ni 6: si la celda fuera 5, los vecinos no pueden ser 5 (misma línea) ni 6 (consecutivo); si fuera 6, no pueden ser 6 ni 5. En los dos casos, se tachan los dos números en los vecinos.',
      detect: 'Buscá celdas con exactamente dos candidatos que sean n y n+1. Mirá sus cuatro vecinos y tachales ambos números. Aunque no sepas cuál de los dos es el correcto, el resultado es el mismo.',
      why: 'Es una eliminación "a ciegas": no hace falta resolver la celda. Muy frecuente, y suele dejar a un vecino con un único candidato.',
      faq: [
        { q: '¿Y si los candidatos no son consecutivos, como {3, 7}?', a: 'No hay eliminación segura: según cuál sea el valor de la celda, bloquea números distintos en los vecinos. Solo con n y n+1 el bloqueo coincide en los dos casos.' },
        { q: '¿Hay que mirar los cuatro vecinos?', a: 'Sí: arriba, abajo, izquierda y derecha. Los vecinos de la fila y de la columna ya se descartan por la regla del clásico: lo nuevo es que valen los dos números, no solo uno.' },
        { q: '¿Y con tres candidatos consecutivos?', a: 'Con {4, 5, 6} solo el 5 se tacha en los vecinos: el 4 y el 6 dependen de cuál sea la celda. La técnica completa requiere exactamente dos candidatos.' }
      ]
    },
    example: {
      mode: 'nonconsecutive',
      grid: '080900752000057080000084910000800090003000048806010205400093007000700800200008130',
      steps: [
        { text: 'Miremos F5C4: solo admite el 5 y el 6, dos números consecutivos.', hl: [39], show: { 39: [5, 6] }, keep: { 39: [5, 6] } },
        { text: 'Si fuera 5, sus vecinos no podrían ser 4, 5 ni 6. Si fuera 6, no podrían ser 5, 6 ni 7. En cualquiera de los dos casos, ningún vecino puede ser 5 ni 6.',
          hl: [39], rel: [30, 48, 38, 40], show: { 39: [5, 6] }, keep: { 39: [5, 6] } },
        { text: 'Los vecinos libres son F4C4 (arriba, con 2, 3, 4, 5, 6 y 8), F6C4 (abajo, con 3 y 4) y F5C5 (derecha, con 6 y 7). Tachamos el 5 y el 6 de los vecinos que los tengan.',
          hl: [39], rel: [30, 48, 38, 40], show: { 39: [5, 6], 30: [2, 3, 4, 5, 6, 8], 48: [3, 4], 40: [6, 7] },
          strike: { 30: [5, 6], 40: [6] }, keep: { 39: [5, 6] } },
        { text: 'F5C5 se quedó solo con el 7: Único desnudo.', hl: [40], show: { 40: [6, 7] }, strike: { 40: [6] }, keep: { 40: [7] } },
        { text: 'Colocamos el 7 en F5C5.', hl: [40], place: { 40: 7 } }
      ]
    },
    practice: {
      mode: 'nonconsecutive',
      grid: '900000008600827090010003000060000000000080000003740681050074803700030519006000007',
      solution: '972461358635827194418593726861359472247186935593742681159274863724638519386915247',
      notes: 'auto',
      goal: { text: 'F1C5 solo admite dos candidatos consecutivos. Tachá (modo Notas) esos dos números en sus vecinas ortogonales: en una de ellas te quedará un único candidato.', elimSets: [[[3, 5], [3, 6], [5, 5]]] },
      hint: 'F1C5 tiene un 5 y un 6 como candidatos. Sus vecinas libres son F1C4 y F1C6: ninguna de las dos puede ser 5 ni 6.',
      hintCells: [4, 3, 5]
    }
  };

  /* ---------------- Jigsaw ---------------- */
  var jigLine = {
    id: 'jigsaw-region-line',
    title: 'Intersección región–línea (Region-Line Reduction)',
    short: 'Un dígito de una región que cae en una sola fila o columna',
    theory: {
      what: 'Si todos los lugares posibles de un dígito dentro de una región irregular caen en la misma fila o columna, ese dígito de la región tiene que estar en esa línea. Entonces, el resto de la línea (las celdas que no son de esa región) no puede llevarlo.',
      detect: 'Elegí una región y un dígito que todavía no esté. Marcá dónde puede ir. Si todas esas celdas comparten fila o columna, tachá ese dígito en las demás celdas de esa línea que estén fuera de la región.',
      why: 'Es el equivalente de los Apuntadores del clásico, pero con formas libres: como la región no es un cuadrado, las líneas "se salen" de ella en lugares inesperados.',
      faq: [
        { q: '¿Funciona al revés?', a: 'Sí. Si en una fila todos los candidatos de un dígito caen dentro de una misma región, se tacha en el resto de esa región.' },
        { q: '¿Cuántas celdas tienen que ser?', a: 'Dos o tres suelen ser las más útiles; con una sola celda ya es un Único oculto.' },
        { q: '¿Las regiones tienen que ser conexas?', a: 'Sí: las 9 celdas de una región forman una sola pieza unida por lados.' }
      ]
    },
    example: {
      mode: 'jigsaw',
      regions: JM,
      grid: '720180006930006000610070020000009304800400060000000807000062400069000000240005681',
      steps: [
        { text: 'Miremos la región de arriba a la izquierda (borde grueso) y busquemos el 8.', rel: J_R0 },
        { text: 'En la región, el 8 no puede ir en F1C3 (hay un 8 en la fila 1, F1C5) ni en F4C1 (hay un 8 en la columna 1, F5C1). Las marcamos con ✕.',
          rel: J_R0, src: [4, 36], same: [4, 36], no: [2, 27], show: { 11: [8], 20: [8] } },
        { text: 'Solo quedan F2C3 y F3C3, y las dos están en la columna 3. El 8 de la región tiene que caer en esa columna.',
          hl: [11, 20], rel: col(2), no: [2, 27], show: { 11: [8], 20: [8] } },
        { text: 'Entonces el 8 de la columna 3 es de esta región: ninguna celda de C3 fuera de la región puede llevarlo. F4C3 y F7C3 lo tenían como candidato: los tachamos.',
          hl: [11, 20], rel: col(2), show: { 11: [8], 20: [8], 29: [8], 56: [8] }, strike: { 29: [8], 56: [8] } }
      ]
    },
    practice: {
      mode: 'jigsaw',
      regions: JM,
      grid: '015000028080010060040003000000000000300500840002000530038006000004070003000032471',
      solution: '415697328283415769746283195967358214371529846892164537138746952524971683659832471',
      notes: 'auto',
      goal: { text: 'En la región de arriba a la izquierda, el 2 solo puede ir en celdas de una misma columna. Tachá (modo Notas) el 2 en las celdas de esa columna que están fuera de la región.', elimSets: [[[54, 2], [63, 2]]] },
      hint: 'Mirá dónde puede ir el 2 en la región superior izquierda: todos los lugares están en la columna 1. Revisá el resto de esa columna.',
      hintCells: [9, 18, 27]
    }
  };

  var jig45 = {
    id: 'jigsaw-45',
    title: 'Regla del 45: innies y outies (Jigsaw 45)',
    short: 'Comparar filas y regiones que casi coinciden',
    theory: {
      what: 'Cada fila, columna y región suma 45. Si tomás k filas seguidas (k × 45) y las comparás con k regiones que casi cubren las mismas celdas, las celdas que sobran de cada lado tienen que sumar lo mismo. Las celdas de las regiones que sobresalen de las filas son los "outies"; las celdas de las filas que no pertenecen a esas regiones son los "innies".',
      detect: 'Elegí las primeras k filas (o columnas) y buscá k regiones que las ocupen casi por completo. Contá qué celdas se salen (outies) y qué celdas faltan (innies). Si hay una de cada tipo, valen lo mismo; si hay una celda de un lado y dos del otro, la sola vale la suma de las dos.',
      why: 'Permite deducir valores exactos sin anotar candidatos, y es una de las pocas herramientas que cruza filas con regiones de forma libre.',
      faq: [
        { q: '¿Por qué suman lo mismo?', a: 'Las filas suman k × 45 y las regiones también. Lo que comparten se cancela: queda lo que sobra de cada lado.' },
        { q: '¿Tiene que ser siempre una celda por lado?', a: 'No. Con varios innies y outies sigue valiendo que las sumas son iguales; la deducción es más simple cuanto menos celdas haya.' },
        { q: '¿Se puede hacer con columnas?', a: 'Sí, con las primeras o últimas columnas, o con cualquier grupo de filas o columnas que encaje con regiones.' }
      ]
    },
    example: {
      mode: 'jigsaw',
      regions: M45,
      grid: '020003006080740309800000600259300460000000080945000170001020030072009040000000217',
      steps: [
        { text: 'Las filas 1 y 2 tienen 18 celdas: entre las dos suman 2 × 45 = 90.', rel: (function () { var o = []; for (var i = 0; i < 18; i++) o.push(i); return o; }()) },
        { text: 'Ahora las regiones: la de la fila 1 y la que ocupa casi toda la fila 2 (F2C1–F2C8 más F3C8) suman 45 + 45 = 90. Casi son las mismas celdas.',
          rel: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 25] },
        { text: 'Ojo con las dos diferencias: F3C8 pertenece a una de las regiones pero está fuera de las filas 1–2 (outie), y F2C9 está en las filas pero no en esas regiones (innie).',
          hl: [25, 17], rel: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 25, 17] },
        { text: 'Las dos sumas dan 90 y todo lo demás coincide: lo que sobra de un lado vale lo mismo que lo que sobra del otro. Entonces F3C8 = F2C9.',
          hl: [25, 17], src: [17], same: [17] },
        { text: 'F2C9 es un 9, así que F3C8 es 9 (la celda tenía candidatos 2, 5 y 9, pero la suma lo decide sin mirarlos).',
          hl: [25], show: { 25: [2, 5, 9] }, strike: { 25: [2, 5] }, keep: { 25: [9] } },
        { text: 'Colocamos el 9 en F3C8.', hl: [25], place: { 25: 9 } }
      ]
    },
    practice: {
      mode: 'jigsaw',
      regions: M45,
      grid: '020060900000001092100080000000007003009003060075006009000000030081030006030640050',
      solution: '523468971468751392197385624654917283249173865375826419816294537981532746732649158',
      notes: 'none',
      goal: { text: 'Las filas 1 y 2 coinciden con dos regiones salvo por dos celdas: una de las regiones sobresale en F3C8 y una celda de las filas no es de esas regiones. Usá la suma para colocar el número de F3C8.', place: [[25, 2]] },
      hint: 'Las filas 1 y 2 suman 90, igual que las dos regiones de arriba. Lo que sobra de cada lado vale lo mismo: F3C8 iguala a F2C9.',
      hintCells: [25, 17]
    }
  };

  /* =====================================================================
     SEGUNDO BLOQUE (intermedio/avanzado): d3, a3, n2 y j2
     ===================================================================== */
  var DIAG1 = [0, 10, 20, 30, 40, 50, 60, 70, 80];

  var diagTriple = {
    id: 'diagonal-triple',
    title: 'Trío desnudo en diagonal (Diagonal Naked Triple)',
    short: 'Tres celdas de la diagonal, tres candidatos',
    theory: {
      what: 'Si tres celdas libres de una misma diagonal tienen entre todas solo tres candidatos distintos (por ejemplo {1,5}, {1,3,5} y {1,3,5}), esos tres números quedan reservados para ellas. Ningún otro lugar de la diagonal puede llevarlos.',
      detect: 'Anotá los candidatos de las celdas libres de una diagonal. Buscá tres celdas cuya unión sea de exactamente tres dígitos (no hace falta que cada una tenga los tres). Tachá esos dígitos en las demás celdas de la diagonal.',
      why: 'Con 9 celdas por diagonal y varias ya resueltas, los tríos aparecen seguido. Como las celdas suelen estar lejos, ninguna fila ni caja los muestra: solo la diagonal los une.',
      faq: [
        { q: '¿Tienen que compartir los tres dígitos cada una?', a: 'No. Alcanza con que, juntas, usen solo tres dígitos y que cada una tenga al menos dos.' },
        { q: '¿Cómo lo distingo de un par?', a: 'Si dos de las tres celdas ya tienen los mismos dos candidatos, es un par y el trío sobra. Acá ninguna pareja se resuelve sola.' },
        { q: '¿Funciona en la diagonal secundaria?', a: 'Sí, igual. Y la celda central puede pertenecer al trío de cualquiera de las dos diagonales.' }
      ]
    },
    example: {
      mode: 'diagonal',
      grid: '400500090902360007600408003000704061000000900040000005807000006069187020024003079',
      steps: [
        { text: 'Miremos la diagonal principal (↘). Ya tiene el 4, el 7, el 2 y el 9. Mostramos los candidatos de sus cinco celdas libres.',
          rel: DIAG1, show: { 10: [1, 5, 8], 20: [1, 5], 40: [1, 3, 5], 50: [1, 6], 60: [1, 3, 5] } },
        { text: 'F3C3, F5C5 y F7C7 solo usan el 1, el 3 y el 5: tres celdas, tres candidatos. Es un Trío desnudo. Ninguna fila ni caja las une: solo la diagonal.',
          hl: [20, 40, 60], rel: DIAG1, show: { 10: [1, 5, 8], 20: [1, 5], 40: [1, 3, 5], 50: [1, 6], 60: [1, 3, 5] }, keep: { 20: [1, 5], 40: [1, 3, 5], 60: [1, 3, 5] } },
        { text: 'El 1, el 3 y el 5 de esta diagonal tienen que estar en esas tres celdas. Tachamos el 1 y el 5 de F2C2 y el 1 de F6C6.',
          hl: [20, 40, 60], rel: DIAG1, show: { 10: [1, 5, 8], 20: [1, 5], 40: [1, 3, 5], 50: [1, 6], 60: [1, 3, 5] },
          strike: { 10: [1, 5], 50: [1] }, keep: { 20: [1, 5], 40: [1, 3, 5], 60: [1, 3, 5] } },
        { text: 'F2C2 queda solo con el 8 y F6C6 solo con el 6: dos Únicos desnudos de un solo golpe.',
          hl: [10, 50], show: { 10: [1, 5, 8], 50: [1, 6] }, strike: { 10: [1, 5], 50: [1] }, keep: { 10: [8], 50: [6] } },
        { text: 'Colocamos el 8 en F2C2 y el 6 en F6C6.', hl: [10, 50], place: { 10: 8, 50: 6 } }
      ]
    },
    practice: {
      mode: 'diagonal',
      grid: '900014603104300000302580194680000007000040200029070300205061000006000400800030006',
      solution: '978214653154396872362587194683152947517943268429678315235461789796825431841739526',
      notes: 'auto',
      goal: { text: 'En la diagonal principal (↘) hay tres celdas libres que juntas solo usan tres candidatos. Tachá (modo Notas) esos tres números en la otra celda libre de la diagonal que los tiene.', elimSets: [[[70, 5], [70, 7], [70, 8]]] },
      hint: 'Mirá F2C2, F6C6 y F7C7: entre las tres solo aparecen el 5, el 7 y el 8. Revisá F8C8.',
      hintCells: [10, 50, 60]
    }
  };

  var knightBoxElim = {
    id: 'knight-box-elim',
    title: 'Doble salto desde una caja (Knight-Box Elimination)',
    short: 'Todos los lugares de un dígito atacan a la misma celda',
    theory: {
      what: 'Si en una caja un dígito solo puede ir en dos (o tres) celdas y una celda de afuera está a salto de caballo de todas ellas, esa celda no puede llevar el dígito: sea cual sea el lugar elegido en la caja, la celda de afuera quedaría atacada.',
      detect: 'Marcá dónde puede ir un dígito en una caja. Con dos lugares posibles, buscá las celdas que están en L de ambos (suelen ser una o dos). Si alguna tiene ese dígito como candidato, tachalo.',
      why: 'Es la eliminación típica del Anti-Caballo: no se ve con filas, columnas ni cajas, solo con la geometría del caballo.',
      faq: [
        { q: '¿Y si la celda de afuera ataca solo a uno de los dos lugares?', a: 'No hay eliminación segura: el dígito podría ir en el otro lugar y dejar libre a la celda.' },
        { q: '¿Puede haber más de una celda atacada por ambos?', a: 'Sí. Dos celdas separadas por dos columnas comparten dos celdas en L, una arriba y otra abajo.' },
        { q: '¿Se diferencia del bloqueo por caja de la lección anterior?', a: 'Es la misma idea con otro orden: antes partíamos de un dígito ya colocado; acá, de un dígito que todavía no tiene lugar fijo.' }
      ]
    },
    example: {
      mode: 'antiknight',
      grid: '509000601001030020000060070230619000000002050070403060600040300000080000000190000',
      steps: [
        { text: 'Busquemos el 4 en el bloque medio izquierdo (marcado).', rel: [27, 28, 29, 36, 37, 38, 45, 46, 47] },
        { text: 'El 4 de F6C4 bloquea a F6C1 y F6C3 (misma fila) y, con el caballo, a F4C3 y F5C2. Las marcamos con ✕.',
          rel: [27, 28, 29, 36, 37, 38, 45, 46, 47], src: [48], same: [48], no: [29, 37, 45, 47] },
        { text: 'Al 4 de este bloque solo le quedan dos lugares: F5C1 y F5C3.',
          hl: [36, 38], rel: [27, 28, 29, 36, 37, 38, 45, 46, 47], no: [29, 37, 45, 47], show: { 36: [4], 38: [4] } },
        { text: 'Ahora miremos afuera: F3C2 está a un salto de caballo de F5C1 y también de F5C3. Sea cual sea la que lleve el 4, F3C2 queda atacada.',
          hl: [19], rel: [36, 38], src: [36, 38], show: { 36: [4], 38: [4] } },
        { text: 'Tachamos el 4 de F3C2: de {2, 4, 8} pasa a {2, 8}.',
          hl: [19], src: [36, 38], show: { 19: [2, 4, 8], 36: [4], 38: [4] }, strike: { 19: [4] }, keep: { 19: [2, 8] } }
      ]
    },
    practice: {
      mode: 'antiknight',
      grid: '000007600000640000080005000000009102257001008001800004000520000503908010040006000',
      solution: '435187629972643581186295347864759132257431968391862754619524873523978416748316295',
      notes: 'auto',
      goal: { text: 'En el bloque superior central, el 9 solo puede ir en dos celdas, y una celda de afuera está a salto de caballo de las dos. Tachá (modo Notas) el 9 en esa celda.', elimSets: [[[11, 9]]] },
      hint: 'El 9 del bloque de arriba al centro cabe en F1C5 y F3C5. Buscá la celda que está en L de las dos, a la izquierda.',
      hintCells: [4, 22, 11]
    }
  };

  var knightCorridor = {
    id: 'knight-corridor',
    title: 'Pasillo bloqueado por el caballo (Knight Corridor)',
    short: 'Un pasillo de 3 celdas y dos saltos que lo cierran',
    theory: {
      what: 'Si un dígito, dentro de una caja, solo cabe en las tres celdas de una misma fila (o columna) de la caja, forma un pasillo. Si dos de esas tres celdas están a salto de caballo de dígitos iguales ya colocados, el pasillo se cierra y el dígito va en la tercera.',
      detect: 'Marcá los lugares del dígito en la caja y tachá lo que bloquean las filas y columnas. Si quedan tres celdas en línea, revisá si hay un mismo dígito a salto de caballo de alguna de ellas. Tachá esas celdas: la que sobrevive es la solución.',
      why: 'Combina la técnica de Único oculto con el caballo y suele aparecer en la mitad de la partida, cuando ya hay muchos dígitos repartidos.',
      faq: [
        { q: '¿Qué diferencia hay con la esquina que ataca al bloque?', a: 'Allí la fuente del ataque está en la esquina de otro bloque. Acá puede estar en cualquier celda: lo que se mira es el pasillo.' },
        { q: '¿Por qué tiene que haber un pasillo?', a: 'Porque las filas y columnas ya descartaron el resto de la caja. Sin ese paso previo, no hay forma de aislar solo tres celdas.' },
        { q: '¿Y si el caballo ataca solo a una celda del pasillo?', a: 'Entonces quedan dos candidatos y no hay deducción directa: hay que buscar otra técnica.' }
      ]
    },
    example: {
      mode: 'antiknight',
      grid: '700500301010006004020300075040000000800072540275000800007000190004000000080907000',
      steps: [
        { text: 'Busquemos el 4 en el bloque central (marcado).', rel: [30, 31, 32, 39, 40, 41, 48, 49, 50] },
        { text: 'El 4 de F4C2 bloquea la fila 4 y el 4 de F5C8 bloquea la fila 5. Marcamos con ✕ esas celdas: al 4 de este bloque solo le queda la fila 6.',
          rel: [30, 31, 32, 39, 40, 41, 48, 49, 50], src: [28, 43], same: [28, 43], no: [30, 31, 32, 39, 41], show: { 48: [4], 49: [4], 50: [4] } },
        { text: 'F6C4, F6C5 y F6C6 forman un pasillo de tres celdas. Ahora el caballo: el 4 de F8C3 ataca a F6C4 y el 4 de F5C8 ataca a F6C6.',
          hl: [48, 50], src: [65, 43], same: [65, 43], no: [30, 31, 32, 39, 41, 48, 50], show: { 48: [4], 49: [4], 50: [4] } },
        { text: 'Tachamos el 4 de F6C4 y de F6C6. Solo sobrevive F6C5.', hl: [49], no: [30, 31, 32, 39, 41], show: { 48: [4], 49: [4], 50: [4] }, strike: { 48: [4], 50: [4] }, keep: { 49: [4] } },
        { text: 'Colocamos el 4 en F6C5.', hl: [49], place: { 49: 4 } }
      ]
    },
    practice: {
      mode: 'antiknight',
      grid: '801000000020100800045000016030000160508000290690000000000200600004000001000470002',
      solution: '861735429729164835345928716437592168518643297692817543973281654284356971156479382',
      notes: 'none',
      goal: { text: 'En el bloque superior central, el 8 solo cabe en la fila 3, y dos de esas tres celdas están a salto de caballo de otros 8. Colocá el 8 en la que sobrevive.', place: [[23, 8]] },
      hint: 'El 8 de F5C3 ataca a F3C4 y el 8 de F2C7 ataca a F3C5: queda F3C6.',
      hintCells: [21, 22, 23, 38, 15]
    }
  };

  var jigLineRegion = {
    id: 'jigsaw-line-region',
    title: 'Reducción línea–región (Line-Region Reduction)',
    short: 'Un dígito de una fila que cae dentro de una sola región',
    theory: {
      what: 'Si todos los lugares posibles de un dígito en una fila (o columna) pertenecen a la misma región irregular, ese dígito de la región está en esa línea. Por eso el resto de la región, fuera de la línea, no puede llevarlo.',
      detect: 'Elegí una fila o columna y un dígito que le falte. Marcá sus lugares posibles. Si todos están en la misma región, tachá el dígito en las demás celdas de esa región.',
      why: 'Es el camino inverso a la intersección región–línea. Con formas libres, una región se estira sobre varias filas y esta técnica la vacía rápido.',
      faq: [
        { q: '¿Cuántos lugares suelen ser?', a: 'Dos o tres. Con uno solo ya es un Único oculto.' },
        { q: '¿Y si los lugares de la línea están en dos regiones?', a: 'No se puede eliminar nada con esta técnica.' },
        { q: '¿Se parece al clásico?', a: 'Sí: es el Caja–Línea (Box-Line) del clásico, pero con regiones de forma libre.' }
      ]
    },
    example: {
      mode: 'jigsaw',
      regions: JM,
      grid: '027050010030008462100020000053004890005860000064000000090005700701002086080001520',
      steps: [
        { text: 'Miremos la fila 2 y busquemos el 7.', rel: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
        { text: 'En la fila 2, el 7 no cabe en F2C1 (hay un 7 en la columna 1) ni en F2C3 (hay un 7 en F1C3). Las demás celdas ya tienen número. Quedan F2C4 y F2C5.',
          rel: [9, 10, 11, 12, 13, 14, 15, 16, 17], src: [63, 2], same: [63, 2], no: [9, 11], show: { 12: [7], 13: [7] } },
        { text: 'Las dos celdas están en la misma región (arriba al centro, borde grueso). El 7 de esa región tiene que estar en la fila 2.',
          hl: [12, 13], rel: [3, 4, 5, 12, 13, 14, 21, 22, 23], show: { 12: [7], 13: [7] } },
        { text: 'Entonces las demás celdas de la región no pueden llevar el 7. F3C4 y F3C6 lo tenían como candidato: los tachamos.',
          hl: [12, 13], rel: [3, 4, 5, 12, 13, 14, 21, 22, 23], show: { 12: [7], 13: [7], 21: [7], 23: [7] }, strike: { 21: [7], 23: [7] } }
      ]
    },
    practice: {
      mode: 'jigsaw',
      regions: JM,
      grid: '506180730000056020007093060000000890160009570000821300719000000384200000000000400',
      solution: '596182734431756928827493165243675891168349572975821346719564283384217659652938417',
      notes: 'auto',
      goal: { text: 'En la fila 7, el 2 solo puede ir en celdas de una misma región. Tachá (modo Notas) el 2 en la celda de esa región que queda fuera de la fila.', elimSets: [[[80, 2]]] },
      hint: 'En la fila 7, el 2 cabe en F7C6, F7C7 y F7C9, todas de la región de abajo a la derecha. Buscá otra celda de esa región con el 2.',
      hintCells: [59, 60, 62, 80]
    }
  };

  var jigHiddenPair = {
    id: 'jigsaw-hidden-pair',
    title: 'Par oculto en una región (Hidden Pair)',
    short: 'Dos dígitos que solo caben en las mismas dos celdas',
    theory: {
      what: 'Si dos dígitos de una región solo pueden ir en las mismas dos celdas, esas celdas son suyas: se quedan únicamente con esos dos dígitos. Todos los demás candidatos de esas dos celdas se tachan.',
      detect: 'En una región, marcá dónde puede ir cada dígito. Si dos dígitos comparten exactamente las mismas dos celdas (y ningún otro lugar), esas dos celdas están "ocupadas" por ellos: borrá el resto de candidatos que tengan.',
      why: 'Convierte celdas llenas de candidatos en un Par desnudo limpio, y en regiones alargadas es más fácil de ver que mirando celda por celda.',
      faq: [
        { q: '¿En qué se diferencia del Par desnudo?', a: 'El desnudo ya muestra solo dos candidatos por celda. El oculto está "escondido" entre otros candidatos y hay que mirar por dígito.' },
        { q: '¿Sirve en filas y columnas?', a: 'Sí, y en este modo también en las regiones irregulares.' },
        { q: '¿Qué pasa con tres dígitos?', a: 'El Trío oculto funciona igual con tres celdas.' }
      ]
    },
    example: {
      mode: 'jigsaw',
      regions: JM,
      grid: '027050010030008462100020000053004890005860000064000000090005700701002086080001520',
      steps: [
        { text: 'Miremos la región de la derecha (borde grueso) y busquemos dónde van el 1 y el 2.', rel: [15, 16, 24, 25, 33, 42, 43, 51, 52] },
        { text: 'El 1 solo puede ir en F5C7 o F6C7. El 2 también. Ninguna otra celda de la región admite el 1 ni el 2.',
          hl: [42, 51], rel: [15, 16, 24, 25, 33, 42, 43, 51, 52], show: { 42: [1, 2], 51: [1, 2] } },
        { text: 'Dos números que solo caben en las mismas dos celdas: es un Par oculto. Esas dos celdas se quedan con el 1 y el 2.',
          hl: [42, 51], keep: { 42: [1, 2], 51: [1, 2] }, show: { 42: [1, 2, 3, 9], 51: [1, 2, 3, 9] } },
        { text: 'Tachamos el resto de sus candidatos: el 3 y el 9 en las dos celdas.',
          hl: [42, 51], show: { 42: [1, 2, 3, 9], 51: [1, 2, 3, 9] }, strike: { 42: [3, 9], 51: [3, 9] }, keep: { 42: [1, 2], 51: [1, 2] } }
      ]
    },
    practice: {
      mode: 'jigsaw',
      regions: JM,
      grid: '300007802070500039800403000060000510400000000190000680000039058000246000000705300',
      solution: '345197862671582439859463127263978514426851793197324685714639258538246971982715346',
      notes: 'auto',
      goal: { text: 'En la región de abajo a la izquierda, el 3 y el 8 solo caben en dos celdas. Tachá (modo Notas) todos los demás candidatos de esas dos celdas.', elimSets: [[[64, 5], [65, 5], [65, 7], [65, 9]]] },
      hint: 'Buscá en la región de abajo a la izquierda dónde puede ir el 3 y dónde el 8: son las mismas dos celdas de la fila 8.',
      hintCells: [64, 65]
    }
  };

  var ncCross = {
    id: 'nc-cross',
    title: 'Encrucijada ortogonal (Orthogonal Cross)',
    short: 'Tres vecinos conocidos que descartan casi todo',
    theory: {
      what: 'Cuando una celda tiene tres (o cuatro) vecinos ortogonales ya resueltos, cada uno le prohíbe los números inmediatamente anterior y posterior al suyo. Sumadas esas prohibiciones a la fila, columna y caja, la celda suele quedarse con un único candidato.',
      detect: 'Elegí una celda libre con tres vecinos conocidos. Anotá sus candidatos del clásico y, por cada vecino n, tachá n−1 y n+1. Si queda uno, es tuyo.',
      why: 'Es el Único desnudo de esta variante: una celda rodeada casi siempre se resuelve y desbloquea a sus vecinas.',
      faq: [
        { q: '¿Y si un vecino es el 1 o el 9?', a: 'Solo descarta un número (el 2 o el 8). Los vecinos del medio descartan dos, así que rinden más.' },
        { q: '¿Hace falta que los tres vecinos sean distintos?', a: 'No. Dos vecinos iguales descartan los mismos números: en el tablero de práctica hay dos 4.' },
        { q: '¿Cuenta la diagonal?', a: 'No: solo arriba, abajo, izquierda y derecha.' }
      ]
    },
    example: {
      mode: 'nonconsecutive',
      grid: '000000062206001805500000000000200907024709500000005240030800094862097351090103628',
      steps: [
        { text: 'Tomemos F7C3. Tiene tres vecinos resueltos: un 3 a la izquierda, un 8 a la derecha y un 2 abajo. Arriba todavía no hay nada.',
          hl: [56], rel: [47, 55, 57, 65], src: [55, 57, 65] },
        { text: 'Primero lo de siempre: con fila, columna y caja solo quedan el 1, el 5 y el 7.',
          hl: [56], show: { 56: A9 }, strike: { 56: [2, 3, 4, 6, 8, 9] }, keep: { 56: [1, 5, 7] } },
        { text: 'El 2 de abajo prohíbe el 1 y el 3. Tachamos el 1.',
          hl: [56], src: [65], same: [65], show: { 56: A9 }, strike: { 56: [1, 2, 3, 4, 6, 8, 9] }, keep: { 56: [5, 7] } },
        { text: 'El 8 de la derecha prohíbe el 7 y el 9. Tachamos el 7. (El 3 de la izquierda prohíbe el 2 y el 4: ya estaban fuera.)',
          hl: [56], src: [57, 55], same: [57, 55], show: { 56: A9 }, strike: { 56: [1, 2, 3, 4, 6, 7, 8, 9] }, keep: { 56: [5] } },
        { text: 'Solo queda el 5. Colocamos el 5 en F7C3.', hl: [56], place: { 56: 5 } }
      ]
    },
    practice: {
      mode: 'nonconsecutive',
      grid: '500000003360000040809100075690051000000004690000629357750860004184000006036410000',
      solution: '527948163361572849849136275693751428275384691418629357752863914184295736936417582',
      notes: 'none',
      goal: { text: 'Hay una celda con tres vecinos resueltos que, con la regla de los consecutivos, queda con un único candidato. Encontrala y colocá su número.', place: [[66, 2]] },
      hint: 'Mirá F8C4: tiene un 8 arriba, un 4 a la izquierda y un 4 abajo. Descartá lo del clásico y después los consecutivos.',
      hintCells: [66, 57, 65, 75]
    }
  };

  var M135 = mapOf('000000000' + '111111111' + '222222233' + '444442233' + '445555333' + '445555533' + '666677888' + '666777888' + '667777888');
  var ROWS3 = (function () { var o = []; for (var i = 0; i < 27; i++) o.push(i); return o; }());

  var jig135 = {
    id: 'jigsaw-45-pair',
    title: 'Ley del 45 en 3 líneas (Sum of Two)',
    short: 'Tres filas y tres regiones: la suma de dos celdas',
    theory: {
      what: 'Tres filas suman 3 × 45 = 135, igual que tres regiones completas. Si las tres regiones ocupan casi las mismas celdas que las tres filas, lo que sobra de cada lado vale lo mismo: con dos celdas que sobresalen de las filas (outies) y dos celdas de las filas que no pertenecen a esas regiones (innies), la suma de las dos primeras es igual a la suma de las otras dos.',
      detect: 'Tomá k filas seguidas y buscá k regiones que las cubran casi del todo. Anotá qué celdas se salen (outies) y qué celdas faltan (innies). Si conocés tres de las cuatro, la cuarta sale de la igualdad outies = innies.',
      why: 'Permite deducir un número sin anotar candidatos y se apoya en la forma exacta de las regiones, que en Jigsaw cambia de partida en partida.',
      faq: [
        { q: '¿Siempre hay la misma cantidad de innies y de outies?', a: 'Sí: las filas y las regiones tienen las mismas 27 celdas, así que lo que entra y lo que sale se compensa en cantidad.' },
        { q: '¿Y si la suma no cabe en un dígito?', a: 'Entonces lo que sobra tiene que estar repartido de otra forma: usá los candidatos para descartar. Acá la cuenta da un dígito.' },
        { q: '¿Sirve con columnas?', a: 'Sí, con cualquier grupo de filas o columnas que coincida con regiones.' }
      ]
    },
    example: {
      mode: 'jigsaw',
      regions: M135,
      grid: '000700001100004900079000246302006000000000830004680000008000050760000000013000004',
      steps: [
        { text: 'Las filas 1, 2 y 3 tienen 27 celdas: entre las tres suman 3 × 45 = 135.', rel: ROWS3 },
        { text: 'Las tres regiones de arriba (la fila 1, la fila 2 y F3C1–F3C7 con dos celdas de la fila 4) también suman 135. Casi son las mismas celdas.',
          rel: ROWS3.slice(0, 25).concat([32, 33]) },
        { text: 'Las diferencias: la región de la fila 3 se sale en F4C6 y F4C7 (outies), y las filas 1–3 incluyen F3C8 y F3C9 (innies), que son de otra región.',
          hl: [32, 33, 25, 26], rel: ROWS3.slice(0, 25).concat([32, 33]) },
        { text: 'Como las dos sumas son 135, lo que sobra de cada lado vale lo mismo: F4C6 + F4C7 = F3C8 + F3C9.', hl: [32, 33, 25, 26] },
        { text: 'F3C8 es 4 y F3C9 es 6: suman 10. F4C6 es 6, así que F4C7 vale 10 − 6 = 4.', hl: [33], src: [25, 26, 32], same: [25], show: { 33: [1, 4, 5] }, strike: { 33: [1, 5] }, keep: { 33: [4] } },
        { text: 'Colocamos el 4 en F4C7.', hl: [33], place: { 33: 4 } }
      ]
    },
    practice: {
      mode: 'jigsaw',
      regions: M135,
      grid: '714060020040750010000000065020006090008000207050010480690070000000002030080049100',
      solution: '714965328342758619839124765427836591168593247956217483693471852571682934285349176',
      notes: 'none',
      goal: { text: 'Las filas 1–3 y tres regiones de arriba casi coinciden: dos celdas se salen (F4C6 y F4C7) y dos celdas de las filas son de otra región (F3C8 y F3C9). Usá la igualdad de sumas para colocar el número de F4C7.', place: [[33, 5]] },
      hint: 'F4C6 + F4C7 = F3C8 + F3C9. Ya conocés F4C6 (6), F3C8 (6) y F3C9 (5).',
      hintCells: [33, 32, 25, 26]
    }
  };

  /* ---------------- Registro ---------------- */
  function chaptersOf(variant) {
    var reg = R[variant];
    if (Array.isArray(reg)) { reg = R[variant] = { chapters: reg }; }
    if (!reg || !Array.isArray(reg.chapters)) { reg = R[variant] = { chapters: [] }; }
    return reg.chapters;
  }
  function addLessons(variant, id, title, blurb, lessons) {
    var chs = chaptersOf(variant), ch = null, i, j;
    for (i = 0; i < chs.length; i++) if (chs[i] && chs[i].id === id) { ch = chs[i]; break; }
    if (!ch) { ch = { id: id, title: title, blurb: blurb, lessons: [] }; chs.push(ch); }
    ch.lessons = ch.lessons || [];
    for (j = 0; j < lessons.length; j++) {
      var dup = false;
      for (i = 0; i < ch.lessons.length; i++) if (ch.lessons[i].id === lessons[j].id) dup = true;
      if (!dup) ch.lessons.push(lessons[j]);
    }
  }
  addLessons('diagonal', 'd2', 'Diagonales avanzadas', 'Eliminaciones que cruzan diagonales.', [diagPair]);
  addLessons('antiknight', 'a2', 'Eliminaciones a distancia', 'Candidatos que el caballo descarta.', [knightCorner]);
  addLessons('nonconsecutive', 'n1', 'Vecinos que no se tocan', 'El 1 y el 9 aislados y los pares consecutivos.', [ncIso, ncPair]);
  addLessons('jigsaw', 'j1', 'Regiones irregulares', 'Región–línea y la Regla del 45 con formas libres.', [jigLine, jig45]);
  addLessons('diagonal', 'd3', 'Diagonal avanzada', 'Grupos desnudos sobre las diagonales.', [diagTriple]);
  addLessons('antiknight', 'a3', 'Caballo avanzado', 'Cajas y pasillos atacados por el caballo.', [knightBoxElim, knightCorridor]);
  addLessons('nonconsecutive', 'n2', 'Vecinos avanzados', 'Celdas rodeadas de vecinos conocidos.', [ncCross]);
  addLessons('jigsaw', 'j2', 'Jigsaw avanzado', 'Línea–región, pares ocultos y sumas de filas.', [jigLineRegion, jigHiddenPair, jig135]);
}());
