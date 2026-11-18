/* =====================================================================
   Tutorial — datos de la ruta Killer: capítulos k1–k4 (12 técnicas)
   Se registra solo en window.TUTORIAL_PATHS.killer (ver encabezado de tutorial.js).
   Cada tablero de ejemplo y de práctica (24 en total) cubre las 81 celdas con jaulas
   (`cages: [{ sum, cells }]`, celdas 0–80) y tiene solución única verificada con un solver
   de Killer (Sudoku 9x9 + suma y no repetición de cada jaula). Ningún candidato tachado
   en los pasos pertenece a la solución real.
   El registro se fusiona por id: otro archivo puede aportar capítulos sin pisar estos.
   ===================================================================== */
(function () {
  'use strict';
  window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {};
  var mine = [
    {
      "id": "k1",
      "title": "Fundamentos de sumas",
      "blurb": "Jaulas de una celda y la Regla del 45 en una casa.",
      "lessons": [
        {
          "id": "single-cell-cage",
          "title": "Jaula de una celda (Single Cell Cage)",
          "short": "El total de la jaula es el valor de la celda",
          "theory": {
            "what": "Es una jaula que tiene una sola celda. Su total no es una suma de varios números: es directamente el valor de esa celda.",
            "detect": "Buscá jaulas punteadas con una única celda: tienen un número chico en la esquina y nada más adentro. También se forman solas durante la partida: cuando una jaula grande queda con una sola celda libre, esa celda vale el total menos lo que ya colocaste.",
            "why": "Son pistas gratis: cada una coloca un dígito sin hacer ninguna cuenta, y ese dígito descarta candidatos en su fila, columna y caja. Por eso conviene empezar siempre por ellas.",
            "faq": [{"q":"¿Cuentan como dígitos dados?","a":"Funcionan igual, pero no vienen escritos: tenés que colocarlos vos. Hacelo al principio para despejar el tablero."},{"q":"¿Puede una jaula de una celda valer más de 9?","a":"No. En un tablero válido el total de una jaula de una celda va del 1 al 9."},{"q":"¿Y si una jaula grande tiene todas las celdas colocadas menos una?","a":"Es el mismo razonamiento: la celda libre vale el total menos la suma de las ya colocadas. Así una jaula grande se convierte en una de una celda."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000000600000000000900000000000000000000000000000000000600000000000000000",
            "cages": [{"sum":24,"cells":[0,9,10,18,19]},{"sum":15,"cells":[1,2]},{"sum":11,"cells":[3,4]},{"sum":13,"cells":[5,6]},{"sum":12,"cells":[7,8,16,17]},{"sum":6,"cells":[11,20]},{"sum":14,"cells":[12,21,30]},{"sum":11,"cells":[13,22,31]},{"sum":16,"cells":[14,15,24]},{"sum":16,"cells":[23,32,41]},{"sum":21,"cells":[25,26,34,35]},{"sum":17,"cells":[27,28,29]},{"sum":7,"cells":[33,42]},{"sum":8,"cells":[36,45]},{"sum":15,"cells":[37,38,47]},{"sum":25,"cells":[39,48,49,50]},{"sum":5,"cells":[40]},{"sum":15,"cells":[43,44]},{"sum":8,"cells":[46,55]},{"sum":7,"cells":[51,52]},{"sum":17,"cells":[53,62,71,80]},{"sum":21,"cells":[54,63,72,73]},{"sum":15,"cells":[56,57,58,66]},{"sum":15,"cells":[59,60]},{"sum":26,"cells":[61,69,70,78,79]},{"sum":8,"cells":[64]},{"sum":21,"cells":[65,74,75,76]},{"sum":16,"cells":[67,68,77]}],
            "steps": [{"text":"Mirá las dos jaulas marcadas (F5C5 y F8C2): cada una tiene una sola celda. Son el caso más simple del Killer: no hay nada que repartir.","hl":[40,64]},{"text":"La jaula de F5C5 suma 5. Con una única celda, el único dígito que puede llevar es el 5: cualquier otro daría un total distinto. Tachamos los demás.","hl":[40],"show":{"40":[1,2,3,4,5,6,7,8,9]},"strike":{"40":[1,2,3,4,6,7,8,9]},"keep":{"40":[5]}},{"text":"Colocamos el 5. En una jaula de una celda el total es directamente el valor de la celda.","hl":[40],"place":{"40":5}},{"text":"Lo mismo con F8C2: la jaula suma 8, así que lleva un 8. Son pistas gratis: conviene colocarlas siempre primero.","hl":[64],"place":{"40":5,"64":8}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000000200000000000000000000000000000000000000000000000000000000000000000000000",
            "solution": "497635218265819437318274659174563982589142763623987541842751396951326874736498125",
            "cages": [{"sum":28,"cells":[0,1,2,9,10]},{"sum":22,"cells":[3,4,11,12]},{"sum":7,"cells":[5,6]},{"sum":9,"cells":[7,8]},{"sum":8,"cells":[13,22]},{"sum":24,"cells":[14,15,24,25]},{"sum":3,"cells":[16]},{"sum":16,"cells":[17,26]},{"sum":4,"cells":[18,19]},{"sum":19,"cells":[20,21,29,30]},{"sum":30,"cells":[23,31,32,33,34]},{"sum":6,"cells":[27,36]},{"sum":26,"cells":[28,37,45,46,47]},{"sum":16,"cells":[35,43,44,52,53]},{"sum":9,"cells":[38]},{"sum":5,"cells":[39,40]},{"sum":10,"cells":[41,50,59]},{"sum":24,"cells":[42,51,60,61]},{"sum":18,"cells":[48,56,57]},{"sum":13,"cells":[49,58]},{"sum":28,"cells":[54,55,63,72]},{"sum":10,"cells":[62,71]},{"sum":9,"cells":[64,65,73]},{"sum":13,"cells":[66,74,75]},{"sum":11,"cells":[67,76]},{"sum":6,"cells":[68]},{"sum":15,"cells":[69,70]},{"sum":16,"cells":[77,78,79,80]}],
            "notes": "none",
            "goal": {"text":"Encontrá una jaula de una sola celda y colocá su total.","place":[[16,3],[38,9],[68,6]]},
            "hint": "Buscá los números chicos de las esquinas que están solos en su jaula: ese total es el valor de la celda.",
            "hintCells": [16]
          }
        },
        {
          "id": "rule-45",
          "title": "Regla del 45 en una casa",
          "short": "Fila, columna o caja suman 45",
          "theory": {
            "what": "Cada fila, columna y caja contiene los dígitos del 1 al 9, así que suma siempre 45. Si algunas jaulas quedan enteras dentro de una casa, restando sus totales de 45 sabés cuánto suman las celdas que quedan.",
            "detect": "Elegí una casa y marcá las jaulas que están completamente adentro. Sumá sus totales. Si todas las celdas de la casa quedan cubiertas menos una, esa celda vale 45 menos la suma. Es más fácil cuando la jaula de la celda que queda se sale de la casa.",
            "why": "Es la herramienta más potente del Killer: convierte el tablero en ecuaciones y da dígitos exactos sin mirar combinaciones. Casi todas las técnicas avanzadas son variantes de esta resta.",
            "faq": [{"q":"¿Funciona con cualquier casa?","a":"Sí: filas, columnas y cajas. Siempre suman 45."},{"q":"¿Qué pasa si quedan dos celdas sin cubrir?","a":"Sabés cuánto suman las dos (45 menos la suma de las jaulas). Eso reduce sus combinaciones posibles y, con algún dígito ya colocado, suele resolverlas."},{"q":"¿Tengo que sumar todas las jaulas de la casa?","a":"Solo las que están enteras adentro. Una jaula que se sale de la casa no entra en la suma: es justamente la que deja la celda por resolver."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000000000000000800000000000000000000000000000000200000000000000000004000",
            "cages": [{"sum":20,"cells":[0,9,18,19]},{"sum":25,"cells":[1,2,3,10,11]},{"sum":24,"cells":[4,5,6,7,8]},{"sum":14,"cells":[12,20,21]},{"sum":18,"cells":[13,14,22,23]},{"sum":26,"cells":[15,16,17,24]},{"sum":18,"cells":[25,33,34]},{"sum":8,"cells":[26,35]},{"sum":13,"cells":[27,28,29]},{"sum":14,"cells":[30,31,32]},{"sum":11,"cells":[36,45]},{"sum":7,"cells":[37,46]},{"sum":18,"cells":[38,47,56]},{"sum":5,"cells":[39,40]},{"sum":11,"cells":[41,42]},{"sum":5,"cells":[43,52]},{"sum":21,"cells":[44,53,62]},{"sum":20,"cells":[48,49,50]},{"sum":7,"cells":[51,60]},{"sum":10,"cells":[54,63]},{"sum":12,"cells":[55,64]},{"sum":9,"cells":[57,58]},{"sum":13,"cells":[59,68,69,78]},{"sum":13,"cells":[61,70]},{"sum":12,"cells":[65,66,67]},{"sum":12,"cells":[71,79,80]},{"sum":18,"cells":[72,73,74]},{"sum":21,"cells":[75,76,77]}],
            "steps": [{"text":"La Regla del 45: cada fila, columna y caja contiene los dígitos del 1 al 9, así que suma 45. Probémosla en la caja central (marcada).","rel":[30,31,32,39,40,41,48,49,50]},{"text":"Tres jaulas quedan enteras dentro de la caja: la de 14, la de 5 y la de 20. Entre las tres suman 14 + 5 + 20 = 39.","hl":[30,31,32,39,40,48,49,50],"rel":[30,31,32,39,40,41,48,49,50]},{"text":"De la caja solo queda una celda fuera de esas jaulas: F5C6. Su jaula (la de 11) se sale de la caja.","hl":[41],"rel":[30,31,32,39,40,41,48,49,50],"src":[30,31,32,39,40,48,49,50]},{"text":"Como la caja entera suma 45, esa celda vale 45 − 39 = 6. Sin probar nada: solo con una resta.","hl":[41],"rel":[30,31,32,39,40,41,48,49,50],"src":[30,31,32,39,40,48,49,50]},{"text":"Colocamos el 6 en F5C6.","hl":[41],"place":{"41":6}},{"text":"Y rinde más: la jaula de 11 tiene dos celdas. Si una vale 6, la otra vale 11 − 6 = 5.","hl":[41,42],"place":{"41":6,"42":5}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "010800060000000004000000000006000000000080000000000000000000000000000000000000000",
            "solution": "412859763567123984983764125876432591194587632235916847341695278628371459759248316",
            "cages": [{"sum":18,"cells":[0,9,18]},{"sum":18,"cells":[1,10,19,20]},{"sum":9,"cells":[2,11]},{"sum":16,"cells":[3,12,21]},{"sum":16,"cells":[4,5,13]},{"sum":20,"cells":[6,14,15,24]},{"sum":23,"cells":[7,8,16,17,25]},{"sum":12,"cells":[22,23,32]},{"sum":20,"cells":[26,34,35,43,44]},{"sum":9,"cells":[27,36]},{"sum":22,"cells":[28,29,37]},{"sum":20,"cells":[30,31,39,40]},{"sum":26,"cells":[33,41,42,51]},{"sum":12,"cells":[38,46,47]},{"sum":11,"cells":[45,54,63]},{"sum":16,"cells":[48,49,57]},{"sum":11,"cells":[50,59]},{"sum":18,"cells":[52,60,61,70]},{"sum":24,"cells":[53,62,71]},{"sum":7,"cells":[55,56,64]},{"sum":28,"cells":[58,67,76,77]},{"sum":22,"cells":[65,66,74,75]},{"sum":5,"cells":[68,69]},{"sum":12,"cells":[72,73]},{"sum":10,"cells":[78,79,80]}],
            "notes": "none",
            "goal": {"text":"Usá la Regla del 45 en la columna 1: las jaulas que quedan enteras dentro de la columna dejan una sola celda por resolver. Colocá su valor.","place":[[72,7],[73,5]]},
            "hint": "Sumá los totales de las tres jaulas verticales de la columna 1 y restalos de 45: te da la celda de abajo.",
            "hintCells": [72]
          }
        }
      ]
    },
    {
      "id": "k2",
      "title": "Innies, outies y combinaciones",
      "blurb": "Lo que sobresale de una casa y las sumas con una sola combinación.",
      "lessons": [
        {
          "id": "innies-outies",
          "title": "Innies y outies",
          "short": "Celdas que entran o salen de una casa",
          "theory": {
            "what": "Cuando una jaula cruza el borde de una casa, sus celdas de adentro se llaman innies (entradas) y las de afuera outies (salidas). Si las jaulas que tocan la casa la cubren por completo, la suma de esas jaulas menos 45 es lo que valen los outies.",
            "detect": "Elegí una casa y fijate qué jaulas la cubren por completo aunque se pasen un poco. Sumá sus totales y restá 45: el resultado es lo que suman las celdas que sobresalen. Si sobresale una sola celda, ya tenés su valor. Al revés, si queda sin cubrir una sola celda de la casa, es un innie y vale 45 menos las jaulas enteras.",
            "why": "Los innies y outies convierten jaulas grandes en pistas pequeñas y exactas. Son la forma habitual de abrir un Killer sin ningún dígito dado.",
            "faq": [{"q":"¿Cuál es la diferencia entre innie y outie?","a":"Depende de la casa que mirás. Un innie es una celda de la casa cuya jaula se sale; un outie es una celda de afuera cuya jaula entra en la casa."},{"q":"¿Y si sobresalen dos celdas?","a":"Sabés cuánto suman las dos, no cada una. Combinalo con las combinaciones posibles de la suma para reducir candidatos."},{"q":"¿Hay que contar los dígitos dados?","a":"No hace falta: las jaulas con sus totales ya incluyen todo. Los dígitos dados sirven después, para ubicar valores."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000000000000000000000000000080000000000000000000010000000000000000007000",
            "cages": [{"sum":14,"cells":[0,1,2]},{"sum":15,"cells":[3,4,5]},{"sum":18,"cells":[6,7,8,17]},{"sum":17,"cells":[9,10,11]},{"sum":21,"cells":[12,13,14,23]},{"sum":25,"cells":[15,16,24,25,33]},{"sum":14,"cells":[18,19,20]},{"sum":11,"cells":[21,30]},{"sum":25,"cells":[22,31,32,40,49]},{"sum":14,"cells":[26,34,35]},{"sum":6,"cells":[27,28,36]},{"sum":25,"cells":[29,37,38,39]},{"sum":12,"cells":[41,42]},{"sum":12,"cells":[43,52]},{"sum":16,"cells":[44,53]},{"sum":16,"cells":[45,46,47]},{"sum":16,"cells":[48,57,58]},{"sum":5,"cells":[50,59]},{"sum":24,"cells":[51,60,69,78,79]},{"sum":23,"cells":[54,55,56,64]},{"sum":5,"cells":[61,62]},{"sum":10,"cells":[63,72]},{"sum":9,"cells":[65,66,75]},{"sum":23,"cells":[67,68,76,77]},{"sum":18,"cells":[70,71,80]},{"sum":11,"cells":[73,74]}],
            "steps": [{"text":"Cuando una jaula cruza el borde de una casa, sus celdas de adentro se llaman innies y las de afuera, outies. Veamos un outie en la fila 1 (marcada).","rel":[0,1,2,3,4,5,6,7,8]},{"text":"Las jaulas de 14, 15 y 18 cubren toda la fila 1. Pero la de 18 se sale por una celda: F2C9 es un outie.","hl":[17],"rel":[0,1,2,3,4,5,6,7,8],"src":[0,1,2,3,4,5,6,7,8]},{"text":"Sumemos las tres jaulas: 14 + 15 + 18 = 47. Ese total cuenta la fila entera (45) más el outie, que también está en la jaula.","hl":[17],"rel":[0,1,2,3,4,5,6,7,8]},{"text":"Entonces el outie vale 47 − 45 = 2. La diferencia entre las jaulas y la casa es justo la celda que sobra.","hl":[17],"rel":[0,1,2,3,4,5,6,7,8]},{"text":"Colocamos el 2 en F2C9.","hl":[17],"place":{"17":2}},{"text":"El innie es el caso inverso (lo vimos con la Regla del 45): si una casa tiene una sola celda cuya jaula sale, esa celda vale 45 menos la suma de las jaulas que quedan enteras. Innies y outies son dos caras de la misma resta.","rel":[0,1,2,3,4,5,6,7,8]}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000007000000000000000002000000000004000000000000000300000000000000000000000000",
            "solution": "436912857527834169198765342219356784854179236673248915362591478785423691941687523",
            "cages": [{"sum":10,"cells":[0,9,18]},{"sum":26,"cells":[1,2,3,12]},{"sum":14,"cells":[4,5,6,13]},{"sum":18,"cells":[7,8,16]},{"sum":26,"cells":[10,11,19,20]},{"sum":9,"cells":[14,23]},{"sum":4,"cells":[15,24]},{"sum":15,"cells":[17,25,26]},{"sum":16,"cells":[21,22,30]},{"sum":12,"cells":[27,28,29]},{"sum":25,"cells":[31,40,49,58]},{"sum":24,"cells":[32,33,41,42]},{"sum":18,"cells":[34,35,44]},{"sum":29,"cells":[36,37,45,46,54]},{"sum":15,"cells":[38,47,55,56]},{"sum":3,"cells":[39,48]},{"sum":9,"cells":[43,52,53]},{"sum":17,"cells":[50,51]},{"sum":23,"cells":[57,66,75,76]},{"sum":6,"cells":[59,67,68]},{"sum":19,"cells":[60,61,62]},{"sum":16,"cells":[63,72]},{"sum":12,"cells":[64,73]},{"sum":6,"cells":[65,74]},{"sum":16,"cells":[69,70,71]},{"sum":17,"cells":[77,78,79,80]}],
            "notes": "none",
            "goal": {"text":"Las jaulas de la caja inferior derecha la cubren por completo, pero una se sale. Encontrá la celda outie y colocá su valor.","place":[[77,7]]},
            "hint": "Sumá los totales de las tres jaulas de la caja inferior derecha y restá 45: es el valor de la celda que sobresale en la fila 9.",
            "hintCells": [77]
          }
        },
        {
          "id": "unique-combos",
          "title": "Combinaciones únicas de jaula",
          "short": "Sumas que solo tienen una combinación",
          "theory": {
            "what": "Algunas sumas con pocas celdas solo se pueden lograr con un conjunto de dígitos: 3 en 2 celdas es 1+2, 17 en 2 celdas es 8+9 y 24 en 3 celdas es 7+8+9. Esas jaulas tienen una combinación única.",
            "detect": "Memorizá los extremos. En 2 celdas: 3, 4, 16 y 17. En 3 celdas: 6, 7, 23 y 24. En 4 celdas: 10, 11, 29 y 30. Cualquier jaula con esa suma y esa cantidad de celdas tiene los dígitos fijos.",
            "why": "Convierten jaulas en pares o tríos de candidatos conocidos desde el principio. Con un solo dígito de la fila, columna o caja que coincida, el resto se ordena solo.",
            "faq": [{"q":"¿Tengo que memorizarlas todas?","a":"Las más útiles son las de los extremos (las sumas más chicas y más grandes). Con la práctica se reconocen de un vistazo."},{"q":"¿Y las sumas del medio, como 12 en 2 celdas?","a":"Tienen varias combinaciones (3+9, 4+8, 5+7), así que no son únicas. Se resuelven con las otras técnicas de esta ruta."},{"q":"¿El orden de los dígitos es conocido?","a":"No: sabés qué dígitos hay, no en qué celda. Lo definen los dígitos que ya están en la fila, la columna o la caja."}]
          },
          "example": {
            "mode": "killer",
            "grid": "030009000000000000000000000000000000060000000000000000000005000000000000000000070",
            "cages": [{"sum":17,"cells":[0,9]},{"sum":6,"cells":[1,2,10]},{"sum":23,"cells":[3,4,12,13,14]},{"sum":14,"cells":[5,6]},{"sum":25,"cells":[7,8,15,16]},{"sum":23,"cells":[11,19,20,21]},{"sum":25,"cells":[17,26,34,35,44]},{"sum":10,"cells":[18,27]},{"sum":13,"cells":[22,23,31]},{"sum":16,"cells":[24,25,32,33]},{"sum":18,"cells":[28,37,38]},{"sum":8,"cells":[29,30]},{"sum":5,"cells":[36,45]},{"sum":14,"cells":[39,48]},{"sum":3,"cells":[40,41]},{"sum":15,"cells":[42,43,51]},{"sum":17,"cells":[46,47]},{"sum":10,"cells":[49,50]},{"sum":3,"cells":[52,61]},{"sum":14,"cells":[53,62]},{"sum":18,"cells":[54,63,64,72,73]},{"sum":24,"cells":[55,56,65]},{"sum":18,"cells":[57,58,59,68]},{"sum":12,"cells":[60,69]},{"sum":11,"cells":[66,74,75]},{"sum":11,"cells":[67,76]},{"sum":18,"cells":[70,71,79,80]},{"sum":14,"cells":[77,78]}],
            "steps": [{"text":"Algunas sumas solo se pueden lograr con una combinación de dígitos. Es una de las herramientas que más se usan en Killer. Miremos tres jaulas marcadas.","hl":[40,41,0,9,55,56,65]},{"text":"La jaula de 3 con dos celdas: con dígitos distintos, la única forma es 1 + 2. Tachamos todo lo demás.","hl":[40,41],"show":{"40":[1,2,3,4,5,6,7,8,9],"41":[1,2,3,4,5,6,7,8,9]},"strike":{"40":[3,4,5,6,7,8,9],"41":[3,4,5,6,7,8,9]},"keep":{"40":[1,2],"41":[1,2]}},{"text":"La de 17 con dos celdas: solo 8 + 9 (el máximo posible con dos dígitos distintos).","hl":[0,9],"show":{"0":[1,2,3,4,5,6,7,8,9],"9":[1,2,3,4,5,6,7,8,9]},"strike":{"0":[1,2,3,4,5,6,7],"9":[1,2,3,4,5,6,7]},"keep":{"0":[8,9],"9":[8,9]}},{"text":"La de 24 con tres celdas: solo 7 + 8 + 9, los tres dígitos más altos.","hl":[55,56,65],"show":{"55":[1,2,3,4,5,6,7,8,9],"56":[1,2,3,4,5,6,7,8,9],"65":[1,2,3,4,5,6,7,8,9]},"strike":{"55":[1,2,3,4,5,6],"56":[1,2,3,4,5,6],"65":[1,2,3,4,5,6]},"keep":{"55":[7,8,9],"56":[7,8,9],"65":[7,8,9]}},{"text":"Conviene memorizar las combinaciones únicas. En 2 celdas: 3, 4, 16 y 17. En 3 celdas: 6, 7, 23 y 24. En 4 celdas: 10, 11, 29 y 30.","hl":[40,41,0,9,55,56,65]},{"text":"Ahora usémoslas: la jaula de 17 es 8 + 9. En la fila 1 ya hay un 9 (F1C6), así que F1C1 no puede ser 9: es el 8.","hl":[0],"rel":[0,1,2,3,4,5,6,7,8],"same":[5],"src":[5],"show":{"0":[8,9]},"strike":{"0":[9]},"keep":{"0":[8]}},{"text":"Colocamos el 8 en F1C1 y, por la jaula, el 9 en F2C1.","hl":[0,9],"place":{"0":8,"9":9}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000205000000700000000000007000000200000000000000000030000000000300000000000000",
            "solution": "813679245526413798794582613347826159281935467659741382435268971178394526962157834",
            "cages": [{"sum":29,"cells":[0,9,18,19]},{"sum":3,"cells":[1,10]},{"sum":17,"cells":[2,3,4,13]},{"sum":12,"cells":[5,14]},{"sum":6,"cells":[6,7]},{"sum":13,"cells":[8,17]},{"sum":10,"cells":[11,20]},{"sum":19,"cells":[12,21,22,23]},{"sum":16,"cells":[15,16]},{"sum":15,"cells":[24,25,26,34]},{"sum":23,"cells":[27,28,36,37,45]},{"sum":17,"cells":[29,38,47]},{"sum":22,"cells":[30,31,39,40]},{"sum":7,"cells":[32,33]},{"sum":16,"cells":[35,44]},{"sum":15,"cells":[41,42,43]},{"sum":12,"cells":[46,54,55]},{"sum":15,"cells":[48,49,50,51]},{"sum":10,"cells":[52,53]},{"sum":21,"cells":[56,57,58,65]},{"sum":29,"cells":[59,60,61,62,68]},{"sum":8,"cells":[63,64]},{"sum":12,"cells":[66,67]},{"sum":18,"cells":[69,70,78,79]},{"sum":10,"cells":[71,80]},{"sum":15,"cells":[72,73]},{"sum":3,"cells":[74,75]},{"sum":12,"cells":[76,77]}],
            "notes": "none",
            "goal": {"text":"Hay jaulas con una combinación única. Combinala con los dígitos ya dados para colocar un número.","place":[[35,9],[44,7],[1,1],[10,2]]},
            "hint": "La jaula de 16 en dos celdas solo puede ser 7 + 9, y la de 3 solo 1 + 2. Mirá qué dígito ya está en la fila de cada una.",
            "hintCells": [35,1]
          }
        },
        {
          "id": "rule-45-multi",
          "title": "Regla del 45 multi-casa (90 y 135)",
          "short": "Varias filas, columnas o cajas juntas",
          "theory": {
            "what": "La regla del 45 también vale para varias casas juntas: dos filas suman 90 y tres suman 135; lo mismo con columnas o con tres cajas en fila (una banda). Restando los totales de las jaulas incluidas se obtiene el valor de las celdas sobrantes.",
            "detect": "Tomá dos o tres filas (o columnas, o cajas) vecinas y mirá qué jaulas las cubren. Si todas están enteras adentro salvo una que se sale o que deja una celda suelta, restá la suma de 90 o 135 y obtenés esa celda.",
            "why": "Permite resolver celdas que con una sola casa parecen imposibles, porque las jaulas que cruzan de una fila a la vecina se cancelan en la suma.",
            "faq": [{"q":"¿Qué zonas puedo combinar?","a":"Dos o tres filas seguidas, dos o tres columnas seguidas y bandas de cajas (tres cajas en fila). También sirven combinaciones de cajas no contiguas si las jaulas encajan."},{"q":"¿Cómo sé cuánto vale la zona?","a":"Cada casa vale 45: dos casas son 90, tres son 135."},{"q":"¿Puedo mezclar filas y columnas?","a":"Sí, pero se complica porque las celdas del cruce se cuentan dos veces. Conviene empezar con zonas de un solo tipo."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000008200000000000000000000000300000000000000000000000000000000000000000000",
            "cages": [{"sum":19,"cells":[0,1,9,10]},{"sum":17,"cells":[2,3,11,12]},{"sum":24,"cells":[4,5,13,14]},{"sum":22,"cells":[6,7,15,16]},{"sum":10,"cells":[8,17,26]},{"sum":9,"cells":[18,19,27]},{"sum":21,"cells":[20,28,29,38]},{"sum":27,"cells":[21,30,39,40,49]},{"sum":7,"cells":[22,31]},{"sum":12,"cells":[23,32]},{"sum":13,"cells":[24,25]},{"sum":12,"cells":[33,42]},{"sum":17,"cells":[34,35]},{"sum":8,"cells":[36,37]},{"sum":7,"cells":[41,50]},{"sum":3,"cells":[43,44]},{"sum":13,"cells":[45,54]},{"sum":30,"cells":[46,55,63,64]},{"sum":14,"cells":[47,48,56]},{"sum":14,"cells":[51,52,61]},{"sum":12,"cells":[53,62]},{"sum":10,"cells":[57,58]},{"sum":10,"cells":[59,60]},{"sum":12,"cells":[65,66,67]},{"sum":11,"cells":[68,69,70]},{"sum":13,"cells":[71,80]},{"sum":18,"cells":[72,73,74,75]},{"sum":8,"cells":[76,77]},{"sum":12,"cells":[78,79]}],
            "steps": [{"text":"La Regla del 45 también vale para varias casas juntas: dos filas suman 90 y tres filas (o tres cajas en fila) suman 135. Probémosla con las filas 1 y 2.","rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]},{"text":"Cinco jaulas cubren las dos filas completas. Sus totales son 19, 17, 24, 22 y 10.","hl":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],"rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]},{"text":"Una de ellas, la de 10, se sale por abajo: F3C9 es un outie de las dos filas.","hl":[26],"rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]},{"text":"Las cinco jaulas suman 19 + 17 + 24 + 22 + 10 = 92. Las dos filas valen 90, así que el outie vale 92 − 90 = 2.","hl":[26],"rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]},{"text":"Colocamos el 2 en F3C9. El mismo truco sirve con tres filas (135), con columnas o con una \"banda\" de tres cajas.","hl":[26],"place":{"26":2}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000080000000000000000000060000070000000000020000000000000000000000000000000000",
            "solution": "159273486642918753378654192463892571815367924927541638291435867534786219786129345",
            "cages": [{"sum":6,"cells":[0,1]},{"sum":11,"cells":[2,11]},{"sum":13,"cells":[3,4,5,13]},{"sum":20,"cells":[6,14,15,24]},{"sum":19,"cells":[7,8,17,26]},{"sum":17,"cells":[9,10,19]},{"sum":24,"cells":[12,21,22,23]},{"sum":14,"cells":[16,25]},{"sum":14,"cells":[18,27,28,37]},{"sum":11,"cells":[20,29]},{"sum":31,"cells":[30,31,38,39,40]},{"sum":18,"cells":[32,41,42]},{"sum":19,"cells":[33,34,35,43,44]},{"sum":19,"cells":[36,45,46]},{"sum":12,"cells":[47,48]},{"sum":7,"cells":[49,58]},{"sum":18,"cells":[50,51,52,53]},{"sum":12,"cells":[54,55,56]},{"sum":11,"cells":[57,66]},{"sum":11,"cells":[59,68]},{"sum":21,"cells":[60,61,62]},{"sum":12,"cells":[63,64,65]},{"sum":20,"cells":[67,75,76,77]},{"sum":12,"cells":[69,70,71]},{"sum":21,"cells":[72,73,74]},{"sum":12,"cells":[78,79,80]}],
            "notes": "none",
            "goal": {"text":"Las tres filas de abajo (filas 7 a 9) suman 135. Casi todas sus celdas están en jaulas enteras: encontrá la celda que queda aparte y colocá su valor.","place":[[58,3]]},
            "hint": "Sumá todas las jaulas que están completamente dentro de las filas 7, 8 y 9 y restalas de 135.",
            "hintCells": [58]
          }
        }
      ]
    },
    {
      "id": "k3",
      "title": "Interacción jaula–Sudoku",
      "blurb": "Cómo se ayudan las sumas de las jaulas y las reglas del Sudoku.",
      "lessons": [
        {
          "id": "required-digit",
          "title": "Dígito obligatorio en la jaula",
          "short": "Un dígito presente en todas las combinaciones",
          "theory": {
            "what": "Es un dígito que aparece en todas las combinaciones posibles de una jaula. Como la jaula tiene que usar una de ellas, ese dígito está sí o sí en alguna de sus celdas.",
            "detect": "Listá las combinaciones de la suma y la cantidad de celdas. Si un dígito está en todas, es obligatorio. Después mirá en qué celdas de la jaula puede ir: si las demás están bloqueadas por ese dígito en su fila, columna o caja, queda un solo lugar.",
            "why": "Une la aritmética de la jaula con las reglas del Sudoku: un dígito obligatorio se comporta como un Único oculto dentro de la jaula.",
            "faq": [{"q":"¿Cómo encuentro los dígitos obligatorios?","a":"Escribí todas las combinaciones de la suma. La intersección de todas ellas es el conjunto de dígitos obligatorios."},{"q":"¿Puede haber más de un obligatorio?","a":"Sí. Por ejemplo, 28 en 4 celdas tiene 4+7+8+9 y 5+6+8+9, y los dos comparten el 8 y el 9."},{"q":"¿Y si el dígito obligatorio puede ir en dos celdas?","a":"Entonces no se coloca todavía, pero ya sabés que esa pareja de celdas lleva ese candidato: ayuda para eliminarlo en las demás celdas de esa casa."}]
          },
          "example": {
            "mode": "killer",
            "grid": "010000000000000000000000000000000000000000000000000000000000000000000000100000000",
            "cages": [{"sum":18,"cells":[0,1,2]},{"sum":18,"cells":[3,4,5]},{"sum":9,"cells":[6,7,8]},{"sum":22,"cells":[9,10,18,27]},{"sum":12,"cells":[11,20,29]},{"sum":4,"cells":[12,21]},{"sum":23,"cells":[13,14,22,23]},{"sum":22,"cells":[15,16,17,25]},{"sum":8,"cells":[19,28]},{"sum":13,"cells":[24,33,34]},{"sum":18,"cells":[26,35,44]},{"sum":12,"cells":[30,39,48]},{"sum":18,"cells":[31,40,49]},{"sum":21,"cells":[32,41,42]},{"sum":8,"cells":[36,37,38]},{"sum":13,"cells":[43,52,53]},{"sum":26,"cells":[45,46,47,54]},{"sum":4,"cells":[50,59]},{"sum":10,"cells":[51,60]},{"sum":13,"cells":[55,56]},{"sum":14,"cells":[57,58,67]},{"sum":13,"cells":[61,70]},{"sum":19,"cells":[62,71,79,80]},{"sum":18,"cells":[63,64,65,72]},{"sum":31,"cells":[66,75,76,77,78]},{"sum":8,"cells":[68,69]},{"sum":10,"cells":[73,74]}],
            "steps": [{"text":"Miremos la jaula de 8 con tres celdas (marcada). ¿Qué tríos de dígitos distintos suman 8?","hl":[36,37,38]},{"text":"Solo dos: 1 + 2 + 5 y 1 + 3 + 4. Los dígitos del 6 al 9 no caben en ninguna combinación, así que los tachamos.","hl":[36,37,38],"show":{"36":[1,2,3,4,5,6,7,8,9],"37":[1,2,3,4,5,6,7,8,9],"38":[1,2,3,4,5,6,7,8,9]},"strike":{"36":[6,7,8,9],"37":[6,7,8,9],"38":[6,7,8,9]}},{"text":"Mirá lo que tienen en común las dos combinaciones: el 1 aparece en ambas. Entonces el 1 es obligatorio: está sí o sí en esta jaula.","hl":[36,37,38],"show":{"36":[1,2,3,4,5,6,7,8,9],"37":[1,2,3,4,5,6,7,8,9],"38":[1,2,3,4,5,6,7,8,9]},"strike":{"36":[6,7,8,9],"37":[6,7,8,9],"38":[6,7,8,9]},"keep":{"36":[1],"37":[1],"38":[1]}},{"text":"Dos 1 ya colocados (F9C1 y F1C2) bloquean las celdas F5C1 y F5C2 por columna.","hl":[36,37],"same":[72,1],"src":[72,1],"no":[36,37]},{"text":"El 1 obligatorio de la jaula solo cabe en F5C3. Lo colocamos.","hl":[38],"place":{"38":1}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000000000000000000000000900000000000900000000000000000000000000000000070000000",
            "solution": "759312846384569172621487359918735624465921738237648915192874563846153297573296481",
            "cages": [{"sum":21,"cells":[0,1,2]},{"sum":19,"cells":[3,4,13,14]},{"sum":20,"cells":[5,6,7,8]},{"sum":18,"cells":[9,18,27]},{"sum":13,"cells":[10,11,20]},{"sum":9,"cells":[12,21]},{"sum":19,"cells":[15,16,17,26]},{"sum":20,"cells":[19,28,29,37,46]},{"sum":18,"cells":[22,30,31]},{"sum":15,"cells":[23,24,25]},{"sum":8,"cells":[32,40,41]},{"sum":22,"cells":[33,42,51]},{"sum":18,"cells":[34,35,43,44,52]},{"sum":7,"cells":[36,45,54]},{"sum":12,"cells":[38,47]},{"sum":30,"cells":[39,48,57,58]},{"sum":12,"cells":[49,50]},{"sum":24,"cells":[53,62,71,79,80]},{"sum":23,"cells":[55,56,63,64]},{"sum":9,"cells":[59,60]},{"sum":15,"cells":[61,70]},{"sum":12,"cells":[65,66,67]},{"sum":9,"cells":[68,77]},{"sum":6,"cells":[69,78]},{"sum":12,"cells":[72,73]},{"sum":14,"cells":[74,75,76]}],
            "notes": "none",
            "goal": {"text":"La jaula de 22 con tres celdas tiene un dígito obligatorio. Combinalo con los dígitos dados para colocarlo en su lugar.","place":[[51,9]]},
            "hint": "Los tríos que suman 22 son 5+8+9 y 6+7+9. ¿Qué dígito está en los dos? Mirá en qué filas ya hay uno.",
            "hintCells": [51]
          }
        },
        {
          "id": "sum-elimination",
          "title": "Dígito prohibido por la suma",
          "short": "El total deja afuera a ciertos dígitos",
          "theory": {
            "what": "Una jaula no admite cualquier dígito: si ponés un dígito grande, las demás celdas necesitan sumar poco y quizás no alcanza con números distintos; si ponés uno chico, pueden necesitar sumar demasiado. Esos dígitos quedan prohibidos.",
            "detect": "Para cada celda de la jaula calculá el mínimo y el máximo que pueden sumar las otras celdas con dígitos distintos (por ejemplo, 3 celdas distintas suman al menos 1+2+3 = 6). Si el dígito candidato deja un resto fuera de ese rango, se tacha.",
            "why": "Reduce los candidatos de cada celda de la jaula y, combinado con los que ya descartan la fila, la columna y la caja, termina dejando únicos.",
            "faq": [{"q":"¿Cómo calculo el máximo de un dígito en una jaula?","a":"Restale al total el mínimo que suman las otras celdas. En 3 celdas que suman 9, el máximo es 9 − (1+2) = 6."},{"q":"¿Y el mínimo?","a":"Restale al total el máximo que pueden sumar las otras. En 3 celdas que suman 22, el mínimo es 22 − (9+8) = 5."},{"q":"¿Se hace en todas las jaulas?","a":"Solo hace falta cuando la jaula es chica o muy alta o muy baja: son las que más descartan. Las del medio admiten casi todo."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000100000000200000008000040000007050000060000000000000000000000000300000",
            "cages": [{"sum":20,"cells":[0,1,2,9]},{"sum":8,"cells":[3,12]},{"sum":23,"cells":[4,13,21,22]},{"sum":30,"cells":[5,14,23,32,41]},{"sum":20,"cells":[6,7,8,15]},{"sum":15,"cells":[10,11]},{"sum":18,"cells":[16,17,25,34]},{"sum":9,"cells":[18,19]},{"sum":23,"cells":[20,29,38,47]},{"sum":17,"cells":[24,33,42]},{"sum":4,"cells":[26,35]},{"sum":9,"cells":[27,28]},{"sum":14,"cells":[30,31,39,40]},{"sum":15,"cells":[36,45,54,63]},{"sum":9,"cells":[37,46]},{"sum":29,"cells":[43,44,52,53]},{"sum":14,"cells":[48,49]},{"sum":12,"cells":[50,51,60,69]},{"sum":16,"cells":[55,56,64,65]},{"sum":13,"cells":[57,58]},{"sum":19,"cells":[59,68,76,77]},{"sum":17,"cells":[61,62]},{"sum":10,"cells":[66,67]},{"sum":5,"cells":[70,71]},{"sum":22,"cells":[72,73,74,75]},{"sum":14,"cells":[78,79,80]}],
            "steps": [{"text":"Una jaula de 4 celdas que suma 14 (marcada). Para saber qué dígitos admite, pensemos en lo mínimo que necesitan las otras tres celdas: 1 + 2 + 3 = 6.","hl":[30,31,39,40]},{"text":"En F4C4, mirando su fila, columna y caja, solo quedan dos candidatos posibles: el 5 y el 9.","hl":[30],"rel":[30,31,39,40],"src":[12,21,29,34,41,49,75],"show":{"30":[5,9]}},{"text":"¿Cabe el 9? Con un 9 en la jaula, las otras tres celdas necesitarían sumar 14 − 9 = 5, pero lo mínimo que pueden sumar es 6. Imposible: tachamos el 9.","hl":[30],"show":{"30":[5,9]},"strike":{"30":[9]}},{"text":"Solo sobrevive el 5. Dígito prohibido por la suma: el total de la jaula deja afuera a los números que no pueden completarla.","hl":[30],"show":{"30":[5,9]},"strike":{"30":[9]},"keep":{"30":[5]}},{"text":"Colocamos el 5 en F4C4. Las otras tres celdas suman 9 con dígitos distintos.","hl":[30],"place":{"30":5}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "004103060000000005000000000000000000000000800000000000000000000000000900000000000",
            "solution": "754193268619824375328567419546738192971256834283941657892615743465372981137489526",
            "cages": [{"sum":18,"cells":[0,1,9]},{"sum":27,"cells":[2,11,20,29]},{"sum":26,"cells":[3,4,5,12,21]},{"sum":9,"cells":[6,15,24]},{"sum":13,"cells":[7,16]},{"sum":23,"cells":[8,17,25,26]},{"sum":3,"cells":[10,19]},{"sum":19,"cells":[13,14,22,23]},{"sum":8,"cells":[18,27]},{"sum":20,"cells":[28,36,37]},{"sum":25,"cells":[30,31,40,41,49]},{"sum":9,"cells":[32,33]},{"sum":20,"cells":[34,42,43]},{"sum":13,"cells":[35,44,53]},{"sum":3,"cells":[38,39]},{"sum":19,"cells":[45,46,55]},{"sum":5,"cells":[47,56]},{"sum":16,"cells":[48,57,58]},{"sum":12,"cells":[50,51,52]},{"sum":22,"cells":[54,63,64,72,73]},{"sum":21,"cells":[59,60,61,62,68]},{"sum":8,"cells":[65,66]},{"sum":24,"cells":[67,76,77]},{"sum":22,"cells":[69,70,78]},{"sum":9,"cells":[71,79,80]},{"sum":11,"cells":[74,75]}],
            "notes": "auto",
            "goal": {"text":"Una jaula de 3 celdas que suma 9 no admite todos los dígitos. Descartá el que no puede ir y colocá el número de la celda superior de la jaula.","place":[[6,2]]},
            "hint": "Con tres celdas distintas, las otras dos suman como mínimo 1 + 2 = 3. ¿Cuál es el dígito más alto que entra en una jaula de 9?",
            "hintCells": [6]
          }
        },
        {
          "id": "cage-pairs",
          "title": "Jaulas gemelas (Cage Pairs)",
          "short": "Dos jaulas que reservan dígitos en una casa",
          "theory": {
            "what": "Son dos jaulas enteras dentro de la misma casa cuyas combinaciones están fijas. Juntas ocupan varias celdas y reservan sus dígitos, que no pueden estar en el resto de la casa.",
            "detect": "Buscá una fila, columna o caja con dos jaulas que cumplan una combinación única (por ejemplo 3 y 17 en 2 celdas, o 6 y 24 en 3 celdas). Sumá los dígitos de las combinaciones y tachalos en las demás celdas de la casa.",
            "why": "Es un par o grupo desnudo regalado por las jaulas: elimina muchos candidatos de una sola vez sin mirar la fila celda por celda.",
            "faq": [{"q":"¿Las jaulas tienen que ser de la misma cantidad de celdas?","a":"No. Lo importante es que estén enteras dentro de la casa y que sus dígitos queden determinados."},{"q":"¿Y si una de las jaulas sale de la casa?","a":"Entonces no reserva todos sus dígitos para esa casa. En ese caso solo se aplica a las celdas que están adentro, con otra técnica."},{"q":"¿Es lo mismo que un Par desnudo?","a":"Es parecido: reservar dígitos en un grupo de celdas de una casa. La diferencia es que acá los dígitos los dan las sumas de las jaulas en vez de los candidatos."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000000003000000000000000007000000000000000000001000004000000000000000305",
            "cages": [{"sum":10,"cells":[0,1]},{"sum":14,"cells":[2,3,4,13]},{"sum":17,"cells":[5,14]},{"sum":13,"cells":[6,7,8]},{"sum":13,"cells":[9,10]},{"sum":22,"cells":[11,12,20,29]},{"sum":14,"cells":[15,16,17]},{"sum":11,"cells":[18,27]},{"sum":7,"cells":[19,28]},{"sum":9,"cells":[21,30]},{"sum":12,"cells":[22,23,24,32]},{"sum":18,"cells":[25,33,34]},{"sum":16,"cells":[26,35]},{"sum":11,"cells":[31,40]},{"sum":3,"cells":[36,37]},{"sum":17,"cells":[38,39]},{"sum":5,"cells":[41,50]},{"sum":9,"cells":[42,51,52]},{"sum":10,"cells":[43,44]},{"sum":17,"cells":[45,54,63,72]},{"sum":12,"cells":[46,47]},{"sum":15,"cells":[48,49]},{"sum":19,"cells":[53,62,71,80]},{"sum":12,"cells":[55,56,65]},{"sum":16,"cells":[57,58,66,74,75]},{"sum":33,"cells":[59,67,68,76,77]},{"sum":30,"cells":[60,61,69,70]},{"sum":16,"cells":[64,73]},{"sum":4,"cells":[78,79]}],
            "steps": [{"text":"Miremos la fila 5: dos jaulas de dos celdas quedan enteras dentro de ella, una de 3 y una de 17.","hl":[36,37,38,39],"rel":[36,37,38,39,40,41,42,43,44]},{"text":"La de 3 solo puede ser 1 + 2: sus dos celdas se quedan con el 1 y el 2.","hl":[36,37],"rel":[36,37,38,39,40,41,42,43,44],"show":{"36":[1,2],"37":[1,2]},"keep":{"36":[1,2],"37":[1,2]}},{"text":"La de 17 solo puede ser 8 + 9: sus dos celdas se quedan con el 8 y el 9.","hl":[38,39],"rel":[36,37,38,39,40,41,42,43,44],"show":{"38":[8,9],"39":[8,9]},"keep":{"38":[8,9],"39":[8,9]}},{"text":"Juntas, las dos jaulas forman un par de jaulas: cuatro celdas que reservan 1, 2, 8 y 9. Esos cuatro dígitos ya tienen lugar en la fila 5, así que no pueden ir en ninguna otra celda de la fila.","hl":[36,37,38,39],"rel":[36,37,38,39,40,41,42,43,44]},{"text":"Veamos F5C9: por su columna y su caja le quedan cinco candidatos, el 1, 2, 6, 8 y 9.","hl":[44],"rel":[36,37,38,39,40,41,42,43,44],"src":[17,35,62,80],"show":{"44":[1,2,6,8,9]}},{"text":"Tachamos el 1, 2, 8 y 9, reservados por las jaulas. Solo queda el 6.","hl":[44],"rel":[36,37,38,39,40,41,42,43,44],"show":{"44":[1,2,6,8,9]},"strike":{"44":[1,2,8,9]},"keep":{"44":[6]}},{"text":"Colocamos el 6 en F5C9.","hl":[44],"place":{"44":6}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "800000060000000200004000050000000000000000000000000000000000000000006000000004000",
            "solution": "821395764593467218764812953458729631912653847376148529247581396189236475635974182",
            "cages": [{"sum":22,"cells":[0,1,10,11]},{"sum":18,"cells":[2,3,4,5]},{"sum":17,"cells":[6,7,8]},{"sum":12,"cells":[9,18]},{"sum":19,"cells":[12,13,14,23]},{"sum":25,"cells":[15,16,17,24,25]},{"sum":18,"cells":[19,20,29]},{"sum":9,"cells":[21,22]},{"sum":4,"cells":[26,35]},{"sum":9,"cells":[27,28]},{"sum":18,"cells":[30,31,32]},{"sum":9,"cells":[33,34]},{"sum":10,"cells":[36,37]},{"sum":14,"cells":[38,39,48,57]},{"sum":8,"cells":[40,41]},{"sum":14,"cells":[42,43,52]},{"sum":16,"cells":[44,53]},{"sum":16,"cells":[45,54,55,56]},{"sum":13,"cells":[46,47]},{"sum":13,"cells":[49,58,59]},{"sum":21,"cells":[50,51,60,69,78]},{"sum":27,"cells":[61,62,70,71]},{"sum":18,"cells":[63,64,72,73]},{"sum":16,"cells":[65,66,74]},{"sum":9,"cells":[67,68]},{"sum":20,"cells":[75,76,77]},{"sum":10,"cells":[79,80]}],
            "notes": "auto",
            "goal": {"text":"En la columna 9 hay dos jaulas enteras con combinación única que se reparten cuatro dígitos. Usalas para colocar el número de la celda de arriba (F1C9).","place":[[8,4]]},
            "hint": "La de 4 es 1 + 3 y la de 16 es 7 + 9: esos cuatro dígitos quedan reservados en la columna 9. Mirá cuáles de ellos podría tener F1C9.",
            "hintCells": [8]
          }
        },
        {
          "id": "cage-no-repeat",
          "title": "No repetición dentro de la jaula",
          "short": "Una jaula nunca repite dígitos",
          "theory": {
            "what": "Los dígitos de una jaula no se repiten, aunque sus celdas no se vean entre sí (por ejemplo, las dos puntas de una jaula en L están en distinta fila, columna y caja). Eso descarta candidatos que el Sudoku común dejaría pasar.",
            "detect": "Mirá las jaulas con forma de L, Z o en línea que cruzan cajas. Si una de sus celdas ya tiene un dígito (dado o colocado), ese dígito se tacha en todas las demás celdas de la jaula, aunque no compartan casa.",
            "why": "Es la regla que define al Killer. Usada junto con la suma, ayuda a decidir entre candidatos y a calcular el resto de la jaula por resta.",
            "faq": [{"q":"¿Por qué importa si las celdas no se ven?","a":"Porque el Sudoku normal solo prohíbe repetir en la misma fila, columna o caja. Las jaulas agregan otra prohibición."},{"q":"¿Se aplica también a celdas que sí se ven?","a":"Sí, pero ahí no suma nada nuevo: ya estaban prohibidas por el Sudoku."},{"q":"¿Y para las sumas como 10 en dos celdas?","a":"También: 5+5 no vale. Por eso 10 en 2 celdas son 1+9, 2+8, 3+7 o 4+6, y el 5 queda descartado."}]
          },
          "example": {
            "mode": "killer",
            "grid": "002000000004000600000000000795000000301000000000000000000600000000030000000000000",
            "cages": [{"sum":14,"cells":[0,9]},{"sum":6,"cells":[1,2,3]},{"sum":18,"cells":[4,5,14]},{"sum":14,"cells":[6,15]},{"sum":16,"cells":[7,8]},{"sum":18,"cells":[10,11,12,13]},{"sum":4,"cells":[16,17]},{"sum":15,"cells":[18,19,20]},{"sum":13,"cells":[21,30]},{"sum":10,"cells":[22,23]},{"sum":14,"cells":[24,33,42]},{"sum":17,"cells":[25,34,43]},{"sum":10,"cells":[26,35]},{"sum":19,"cells":[27,28,36]},{"sum":19,"cells":[29,37,38,39]},{"sum":3,"cells":[31,32]},{"sum":13,"cells":[40,41]},{"sum":11,"cells":[44,52,53,62]},{"sum":18,"cells":[45,46,55,56]},{"sum":17,"cells":[47,48,57]},{"sum":27,"cells":[49,50,51,59,60]},{"sum":22,"cells":[54,63,64,65]},{"sum":19,"cells":[58,67,68]},{"sum":8,"cells":[61,70]},{"sum":16,"cells":[66,75,76,77]},{"sum":16,"cells":[69,78,79]},{"sum":17,"cells":[71,80]},{"sum":11,"cells":[72,73,74]}],
            "steps": [{"text":"Los dígitos de una jaula nunca se repiten, aunque las celdas no se vean entre sí. Miremos la jaula de 17 en forma de L (marcada): F6C3 y F7C4 están en distinta fila, columna y caja.","hl":[47,57],"src":[47,48,57]},{"text":"F7C4 ya tiene un 6 dado. Es de la misma jaula que F6C3, así que ese 6 cuenta para toda la jaula.","hl":[57],"same":[57],"src":[57]},{"text":"Por su fila, columna y caja, a F6C3 solo le quedan dos candidatos: el 6 y el 8.","hl":[47],"src":[2,11,27,28,29,36,38],"show":{"47":[6,8]}},{"text":"No puede ser 6: la jaula ya tiene un 6 en F7C4 y no puede repetirse, aunque las dos celdas no se \"vean\". Tachamos el 6.","hl":[47,57],"same":[57],"show":{"47":[6,8]},"strike":{"47":[6]},"keep":{"47":[8]}},{"text":"Colocamos el 8 en F6C3. La tercera celda vale 17 − 8 − 6 = 3.","hl":[47,48],"place":{"47":8,"48":3}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "004006000800000000000000000060000000000000000000000000408967021000003000000000000",
            "solution": "254786139817439256396512748762395814583174692149628375438967521921853467675241983",
            "cages": [{"sum":16,"cells":[0,1,9,10]},{"sum":11,"cells":[2,11]},{"sum":19,"cells":[3,4,12]},{"sum":21,"cells":[5,13,14,22,23]},{"sum":6,"cells":[6,7,15]},{"sum":15,"cells":[8,17]},{"sum":17,"cells":[16,24,25,34]},{"sum":29,"cells":[18,27,28,36,37]},{"sum":15,"cells":[19,20]},{"sum":9,"cells":[21,30,39]},{"sum":12,"cells":[26,35]},{"sum":18,"cells":[29,38,46,47]},{"sum":16,"cells":[31,40]},{"sum":17,"cells":[32,33,41]},{"sum":16,"cells":[42,51,52]},{"sum":11,"cells":[43,44]},{"sum":5,"cells":[45,54]},{"sum":25,"cells":[48,49,50,57]},{"sum":6,"cells":[53,62]},{"sum":13,"cells":[55,56,64]},{"sum":13,"cells":[58,59]},{"sum":12,"cells":[60,68,69]},{"sum":26,"cells":[61,70,71,79,80]},{"sum":22,"cells":[63,72,73]},{"sum":8,"cells":[65,74,75]},{"sum":13,"cells":[66,67]},{"sum":14,"cells":[76,77,78]}],
            "notes": "auto",
            "goal": {"text":"Las celdas de una misma jaula no pueden repetir dígito, aunque no se vean. Usalo para colocar el número de la celda de arriba de la L (F7C7).","place":[[60,5]]},
            "hint": "La jaula de 12 en forma de L tiene un 3 dado en la celda de abajo a la izquierda. ¿Puede repetirse ese 3 en la celda F7C7?",
            "hintCells": [60]
          }
        }
      ]
    },
    {
      "id": "k4",
      "title": "Maestría Killer",
      "blurb": "Dividir jaulas, subconjuntos dentro de jaulas y cruces con líneas y cajas.",
      "lessons": [
        {
          "id": "cage-splitting",
          "title": "División de jaulas (Cage Splitting)",
          "short": "Partir una jaula con la Regla del 45",
          "theory": {
            "what": "Una jaula grande que cruza dos casas se puede dividir en dos partes: lo que está en una casa y lo que está en la otra. Si la Regla del 45 da la suma de una parte, la otra se obtiene por resta.",
            "detect": "Buscá una jaula que ocupa celdas de dos cajas (o de dos filas). Fijate si en una de esas casas las demás celdas quedan en jaulas enteras: entonces conocés la suma de la parte de la jaula que está ahí y, restando, la de la otra parte.",
            "why": "Transforma una jaula grande y difícil en dos pequeñas, a menudo con combinaciones únicas. Es una de las herramientas centrales del Killer avanzado.",
            "faq": [{"q":"¿Siempre se divide en dos partes?","a":"Normalmente sí, pero si la jaula cruza tres casas se puede dividir en más partes, siempre que puedas conocer la suma de todas menos una."},{"q":"¿Las partes tienen que tener las mismas celdas?","a":"No. Cada parte tiene la cantidad de celdas que cae en su casa, y su suma sale de la Regla del 45."},{"q":"¿Qué hago con las partes?","a":"Usalas como jaulas nuevas: calculá sus combinaciones y combinalas con los dígitos de la fila, columna o caja."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000040009000000000000000000080000060000000000000000000000000070000070000",
            "cages": [{"sum":18,"cells":[0,1,9,10]},{"sum":29,"cells":[2,11,12,21]},{"sum":17,"cells":[3,4,5,13,14]},{"sum":14,"cells":[6,15]},{"sum":21,"cells":[7,8,16,17]},{"sum":15,"cells":[18,19,20]},{"sum":12,"cells":[22,23,31]},{"sum":27,"cells":[24,25,26,33,34]},{"sum":17,"cells":[27,36,37,45]},{"sum":9,"cells":[28,29,30]},{"sum":13,"cells":[32,41]},{"sum":20,"cells":[35,44,53,62]},{"sum":15,"cells":[38,47]},{"sum":16,"cells":[39,40,49]},{"sum":16,"cells":[42,43,51,52]},{"sum":12,"cells":[46,55]},{"sum":13,"cells":[48,57,58]},{"sum":23,"cells":[50,59,60,68]},{"sum":32,"cells":[54,63,64,72,73]},{"sum":4,"cells":[56,65]},{"sum":25,"cells":[61,69,70,71]},{"sum":25,"cells":[66,67,74,75,76]},{"sum":3,"cells":[77,78]},{"sum":9,"cells":[79,80]}],
            "steps": [{"text":"La jaula de 29 (marcada) tiene cuatro celdas y cruza dos cajas: dos están en la caja 1 y dos en la caja 2. Vamos a \"dividirla\".","hl":[2,11,12,21]},{"text":"En la caja 1 (arriba a la izquierda) hay dos jaulas enteras: la de 18 y la de 15. Suman 18 + 15 = 33.","hl":[0,1,9,10,18,19,20],"rel":[0,1,2,9,10,11,18,19,20]},{"text":"La caja vale 45, así que las dos celdas restantes (las de la jaula de 29 que están en la caja) suman 45 − 33 = 12.","hl":[2,11],"rel":[0,1,2,9,10,11,18,19,20],"src":[0,1,9,10,18,19,20]},{"text":"Por lo tanto, las otras dos celdas de la jaula suman 29 − 12 = 17. Dividimos la jaula en dos partes con sumas conocidas.","hl":[12,21],"src":[2,11]},{"text":"Y 17 con dos celdas es una combinación única: 8 + 9.","hl":[12,21],"show":{"12":[1,2,3,4,5,6,7,8,9],"21":[1,2,3,4,5,6,7,8,9]},"strike":{"12":[1,2,3,4,5,6,7],"21":[1,2,3,4,5,6,7]},"keep":{"12":[8,9],"21":[8,9]}},{"text":"En la fila 2 ya hay un 9 (F2C9), así que F2C4 es el 8 y F3C4 es el 9.","hl":[12,21],"rel":[9,10,11,12,13,14,15,16,17],"same":[17],"src":[17],"place":{"12":8,"21":9}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000000000000000000000000000000000000000000000000000000500000100000000000000000",
            "solution": "732856194985124637614793285297315846468279351351648972829567413173482569546931728",
            "cages": [{"sum":29,"cells":[0,9,10,11]},{"sum":13,"cells":[1,2,3]},{"sum":11,"cells":[4,5]},{"sum":21,"cells":[6,7,16,25]},{"sum":11,"cells":[8,17]},{"sum":12,"cells":[12,20,21]},{"sum":6,"cells":[13,14]},{"sum":19,"cells":[15,24,33,42]},{"sum":25,"cells":[18,19,27,28,29]},{"sum":13,"cells":[22,30,31]},{"sum":8,"cells":[23,32]},{"sum":11,"cells":[26,35]},{"sum":16,"cells":[34,43,52]},{"sum":21,"cells":[36,37,45,54]},{"sum":10,"cells":[38,39]},{"sum":20,"cells":[40,41,49]},{"sum":3,"cells":[44,53]},{"sum":12,"cells":[46,47,48]},{"sum":30,"cells":[50,51,58,59]},{"sum":11,"cells":[55,56]},{"sum":9,"cells":[57,66]},{"sum":12,"cells":[60,68,69,77]},{"sum":19,"cells":[61,62,70,71]},{"sum":13,"cells":[63,64,72]},{"sum":13,"cells":[65,73,74]},{"sum":20,"cells":[67,75,76]},{"sum":17,"cells":[78,79,80]}],
            "notes": "none",
            "goal": {"text":"Dividí la jaula de 12 con la Regla del 45 en la caja inferior derecha: averiguá cuánto suma cada mitad y colocá un dígito en la parte que cae en la caja de abajo al medio.","place":[[68,2],[77,1]]},
            "hint": "En la caja inferior derecha, restá las dos jaulas enteras (19 y 17) de 45: eso suman las dos celdas de la jaula de 12 que están dentro. El resto cae en la otra caja.",
            "hintCells": [68,77]
          }
        },
        {
          "id": "cage-subsets",
          "title": "Par oculto y desnudo dentro de la jaula",
          "short": "Pares de candidatos que reparten la jaula",
          "theory": {
            "what": "Es un grupo de celdas de una jaula que, entre todas, solo pueden llevar un grupo de dígitos. Si dos celdas solo admiten los mismos dos candidatos (par desnudo), o si dos dígitos solo caben en dos celdas de la jaula (par oculto), la jaula queda repartida.",
            "detect": "Escribí los candidatos de cada celda de la jaula usando su fila, columna y caja y las combinaciones de la suma. Si dos celdas se quedan con los mismos dos candidatos, o si dos dígitos obligatorios solo caben en dos celdas, la celda restante se resuelve por resta.",
            "why": "Convierte la jaula en un problema chico: conocés lo que suman las dos celdas del par y, por lo tanto, lo que vale la celda que falta, o qué dígitos le quedan.",
            "faq": [{"q":"¿En qué se parece a un par desnudo del Sudoku clásico?","a":"Es la misma idea, pero los candidatos salen también de las sumas, y el par queda dentro de una jaula."},{"q":"¿Y el par oculto?","a":"Dos dígitos obligatorios de la jaula que solo caben en dos celdas: esas dos celdas pasan a ser un par y la otra celda se queda con el dígito que falta."},{"q":"¿Sirve con jaulas de 4 o más celdas?","a":"Sí. Con jaulas más grandes el mismo razonamiento deja una pareja resuelta y el resto como una jaula más chica."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000000000000000000000000000001245679000000002000000000000000000000000000",
            "cages": [{"sum":15,"cells":[0,1,10]},{"sum":19,"cells":[2,11,20,21]},{"sum":10,"cells":[3,12]},{"sum":22,"cells":[4,13,14,15,16]},{"sum":19,"cells":[5,6,7]},{"sum":13,"cells":[8,17]},{"sum":23,"cells":[9,18,19,27]},{"sum":24,"cells":[22,23,24,32]},{"sum":5,"cells":[25,26]},{"sum":17,"cells":[28,29,30,31]},{"sum":9,"cells":[33,34]},{"sum":20,"cells":[35,43,44]},{"sum":20,"cells":[36,37,46]},{"sum":18,"cells":[38,39,40,41,42]},{"sum":15,"cells":[45,54]},{"sum":12,"cells":[47,48]},{"sum":13,"cells":[49,57,58]},{"sum":11,"cells":[50,51]},{"sum":5,"cells":[52,53]},{"sum":8,"cells":[55,56]},{"sum":6,"cells":[59,60]},{"sum":11,"cells":[61,70,79,80]},{"sum":13,"cells":[62,71]},{"sum":20,"cells":[63,64,65,72,73]},{"sum":32,"cells":[66,67,74,75,76]},{"sum":10,"cells":[68,69]},{"sum":15,"cells":[77,78]}],
            "steps": [{"text":"Una jaula de 20 con tres celdas (marcada): dos están en la fila 5 y la tercera en la fila 6.","hl":[36,37,46]},{"text":"La fila 5 ya tiene el 1, 2, 4, 5, 6, 7 y 9 dados. A F5C1 y F5C2 solo les quedan dos candidatos: el 3 y el 8.","hl":[36,37],"rel":[36,37,38,39,40,41,42,43,44],"src":[38,39,40,41,42,43,44],"show":{"36":[3,8],"37":[3,8]},"keep":{"36":[3,8],"37":[3,8]}},{"text":"Es un par desnudo dentro de la jaula: esas dos celdas se reparten el 3 y el 8, y juntas suman 3 + 8 = 11, sin importar el orden.","hl":[36,37],"show":{"36":[3,8],"37":[3,8]},"keep":{"36":[3,8],"37":[3,8]}},{"text":"Entonces la tercera celda, F6C2, vale 20 − 11 = 9.","hl":[46],"src":[36,37]},{"text":"Colocamos el 9 en F6C2. Un par dentro de la jaula nos dio la celda restante con una resta.","hl":[46],"place":{"46":9}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000000000800000000020100000000000008010000000000000000000000200000000000000000000",
            "solution": "149263587856947123723158946495712368618534792237896451374689215981325674562471839",
            "cages": [{"sum":25,"cells":[0,1,9,10,18]},{"sum":17,"cells":[2,3,11]},{"sum":14,"cells":[4,5,6]},{"sum":24,"cells":[7,8,17,26]},{"sum":18,"cells":[12,13,22]},{"sum":15,"cells":[14,23]},{"sum":7,"cells":[15,16,25]},{"sum":10,"cells":[19,20,29]},{"sum":8,"cells":[21,30]},{"sum":12,"cells":[24,33]},{"sum":28,"cells":[27,28,36,37,38]},{"sum":21,"cells":[31,40,49,58]},{"sum":12,"cells":[32,41,50]},{"sum":22,"cells":[34,42,43]},{"sum":11,"cells":[35,44,53]},{"sum":24,"cells":[39,47,48,56]},{"sum":5,"cells":[45,54]},{"sum":10,"cells":[46,55]},{"sum":9,"cells":[51,52]},{"sum":20,"cells":[57,64,65,66,74]},{"sum":17,"cells":[59,60,61,62]},{"sum":20,"cells":[63,72,73]},{"sum":13,"cells":[67,75,76]},{"sum":14,"cells":[68,77,78]},{"sum":17,"cells":[69,70,71]},{"sum":12,"cells":[79,80]}],
            "notes": "auto",
            "goal": {"text":"Una jaula de 7 con tres celdas es 1 + 2 + 4. Dos dígitos de esa combinación solo caben en dos celdas de la jaula. Encontrá la celda restante y colocá su número.","place":[[25,4]]},
            "hint": "La jaula necesita 1, 2 y 4. Fijate qué dígitos de la combinación ya \"ven\" a F3C8 en su fila: lo que queda solo puede ser ese número.",
            "hintCells": [25]
          }
        },
        {
          "id": "cage-line-box",
          "title": "Intersección jaula–línea / caja",
          "short": "Un dígito atrapado entre caja y línea",
          "theory": {
            "what": "Si las jaulas de una caja no admiten un dígito en dos de sus tres filas (o columnas), ese dígito solo puede estar en la tercera. Entonces queda fuera del resto de esa línea, igual que en un Apuntador del Sudoku clásico.",
            "detect": "Elegí un dígito alto o bajo (9 o 1) y una caja. Marcá las jaulas con suma tan chica o tan grande que no lo admiten. Si todas las celdas libres para el dígito caen en una misma fila o columna de la caja, tachalo en el resto de esa línea.",
            "why": "Mezcla la aritmética de las jaulas con las intersecciones del Sudoku y elimina candidatos lejos de la jaula, en celdas que parecen no tener relación.",
            "faq": [{"q":"¿Solo sirve con el 9 y el 1?","a":"Son los más comunes porque las jaulas chicas o grandes los descartan fácil. También funciona con el 2 o el 8, o con cualquier dígito que las jaulas impidan."},{"q":"¿Es lo mismo que un Apuntador?","a":"Es la misma deducción. Lo nuevo es que los candidatos se descartan por la suma de las jaulas y no solo por dígitos ya colocados."},{"q":"¿Funciona también al revés (de la línea a la caja)?","a":"Sí: si en una línea el dígito solo cabe dentro de una caja, se tacha en el resto de esa caja."}]
          },
          "example": {
            "mode": "killer",
            "grid": "000000000000004002000600000000008000000001000000000000000007000000003000090002000",
            "cages": [{"sum":21,"cells":[0,1,2]},{"sum":15,"cells":[3,4,5,13]},{"sum":16,"cells":[6,14,15]},{"sum":24,"cells":[7,8,16,17,25]},{"sum":8,"cells":[9,10]},{"sum":7,"cells":[11,20]},{"sum":14,"cells":[12,21]},{"sum":9,"cells":[18,19]},{"sum":16,"cells":[22,23,31]},{"sum":11,"cells":[24,33]},{"sum":24,"cells":[26,34,35,44]},{"sum":16,"cells":[27,28,37,46]},{"sum":8,"cells":[29,38]},{"sum":9,"cells":[30,39]},{"sum":13,"cells":[32,41,42]},{"sum":19,"cells":[36,45,54]},{"sum":22,"cells":[40,49,58]},{"sum":8,"cells":[43,52,53]},{"sum":11,"cells":[47,48]},{"sum":13,"cells":[50,59]},{"sum":15,"cells":[51,60,61,62]},{"sum":23,"cells":[55,56,57,65]},{"sum":9,"cells":[63,64]},{"sum":9,"cells":[66,75]},{"sum":12,"cells":[67,68,76,77]},{"sum":26,"cells":[69,70,78,79]},{"sum":11,"cells":[71,80]},{"sum":16,"cells":[72,73,74]}],
            "steps": [{"text":"Busquemos dónde puede ir el 9 dentro de la caja de arriba a la izquierda (marcada).","rel":[0,1,2,9,10,11,18,19,20]},{"text":"Las jaulas de 8, 7 y 9 tienen dos celdas cada una y quedan en las filas 2 y 3 de la caja. Para llevar un 9 necesitarían sumar al menos 9 + 1 = 10, y ninguna llega. Tachamos el 9 en todas esas celdas.","hl":[9,10,11,20,18,19],"rel":[0,1,2,9,10,11,18,19,20],"show":{"9":[9],"10":[9],"11":[9],"18":[9],"19":[9],"20":[9]},"strike":{"9":[9],"10":[9],"11":[9],"18":[9],"19":[9],"20":[9]}},{"text":"El 9 de la caja solo puede estar en la jaula de arriba, que está en la fila 1.","hl":[0,1,2],"rel":[0,1,2,9,10,11,18,19,20],"show":{"0":[9],"1":[9],"2":[9]},"keep":{"0":[9],"1":[9],"2":[9]}},{"text":"Como el 9 de la caja cae en la fila 1, ningún otro 9 de esa fila puede estar fuera de la caja. Es la intersección entre la caja y la línea.","hl":[0,1,2],"rel":[0,1,2,3,4,5,6,7,8]},{"text":"Veamos F1C6: por su columna y su caja le quedan el 5 y el 9. Tachamos el 9 por la intersección.","hl":[5],"rel":[0,1,2,3,4,5,6,7,8],"src":[14,21,32,41,59,68,77],"show":{"5":[5,9]},"strike":{"5":[9]},"keep":{"5":[5]}},{"text":"Colocamos el 5 en F1C6.","hl":[5],"place":{"5":5}}]
          },
          "practice": {
            "mode": "killer",
            "grid": "000780000000000000000000000000000000528309006000050004000000000000000000000000000",
            "solution": "149786253675293481382415679493167825528349716716852934831674592967521348254938167",
            "cages": [{"sum":18,"cells":[0,9,18,19]},{"sum":27,"cells":[1,2,10,11,20]},{"sum":13,"cells":[3,12,21]},{"sum":17,"cells":[4,13]},{"sum":15,"cells":[5,6,14,15]},{"sum":23,"cells":[7,8,16,25]},{"sum":10,"cells":[17,26]},{"sum":27,"cells":[22,23,24,32,33]},{"sum":16,"cells":[27,36,45]},{"sum":15,"cells":[28,37,46,55]},{"sum":18,"cells":[29,38,47,56]},{"sum":20,"cells":[30,31,40,41]},{"sum":13,"cells":[34,35,44]},{"sum":17,"cells":[39,48,57]},{"sum":24,"cells":[42,43,51,52,53]},{"sum":18,"cells":[49,50,58,59]},{"sum":23,"cells":[54,63,64]},{"sum":9,"cells":[60,69,78]},{"sum":11,"cells":[61,62]},{"sum":21,"cells":[65,66,75]},{"sum":3,"cells":[67,68]},{"sum":12,"cells":[70,71]},{"sum":11,"cells":[72,73,74]},{"sum":11,"cells":[76,77]},{"sum":13,"cells":[79,80]}],
            "notes": "auto",
            "goal": {"text":"En la caja inferior derecha, las jaulas de las columnas 8 y 9 son demasiado altas para llevar un 1. Aplicá la intersección jaula–línea y colocá el número de F5C7.","place":[[42,7]]},
            "hint": "Las jaulas de 11, 12 y 13 con dos celdas no admiten el 1. Entonces el 1 de la caja va en la columna 7 y no puede repetirse más arriba en esa columna.",
            "hintCells": [42]
          }
        }
      ]
    }
  ];
  var reg = window.TUTORIAL_PATHS.killer;
  var prev = Array.isArray(reg) ? reg : (reg && Array.isArray(reg.chapters) ? reg.chapters : []);
  var ids = {};
  mine.forEach(function (c) { ids[c.id] = true; });
  window.TUTORIAL_PATHS.killer = { chapters: prev.filter(function (c) { return !(c && ids[c.id]); }).concat(mine) };
})();
