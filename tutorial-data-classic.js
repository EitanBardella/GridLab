/* =====================================================================
   Tutorial — datos de la ruta Clásica: capítulos c1–c6 (38 técnicas)
   Se registra solo en window.TUTORIAL_PATHS.classic (ver encabezado de tutorial.js).
   Cada tablero de ejemplo y de práctica tiene solución única (verificada con un
   solver de Sudoku 9x9) y ningún candidato tachado pertenece a la solución real.
   El registro se fusiona por id: otro archivo puede aportar capítulos sin pisar estos.
   ===================================================================== */
(function () {
  'use strict';
  window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {};
  var mine = [
    {
      id: "c1",
      title: "Fundamentos",
      blurb: "Las dos deducciones que resuelven casi todos los tableros Fáciles y Medios.",
      lessons: [
        {
          id: "full-house",
          title: "Último libre (Full House)",
          short: "Una casa con 8 celdas llenas",
          theory: {
            what: "Es una fila, una columna o un bloque que ya tiene 8 de sus 9 celdas llenas. La celda que queda libre solo puede llevar el único número del 1 al 9 que todavía falta en esa casa.",
            detect: "Repasá las casas casi completas: contá cuántas celdas vacías tiene cada fila, columna y bloque. Si hay una sola, fijate qué número no está escrito en esa casa: ese es el que va. Aparece mucho hacia el final de la partida y cada vez que cerrás una casa.",
            why: "Es la deducción más rápida de todas y no necesita notas: apenas una casa queda con una celda libre, el número cae solo. Además, cada número que colocás así puede dejar otra casa a una celda de cerrarse y encadenar más Últimos libres.",
            faq: [
              {"q":"¿Es lo mismo que un Único desnudo?","a":"Es un caso particular: la celda tiene un solo candidato porque su casa ya tiene los otros ocho números. Se nombra aparte porque se ve de un vistazo, sin mirar columnas ni bloques."},
              {"q":"¿Funciona en filas, columnas y bloques?","a":"Sí, las tres casas se leen igual. Los bloques son los más fáciles de pasar por alto, así que revisalos con calma."},
              {"q":"¿Y si el número que falta ya está en la columna de esa celda?","a":"En un tablero bien llevado no puede pasar. Si ocurre, hay un error previo: revisá los últimos números colocados y usá Deshacer."}
            ]
          },
          example: {
            mode: "classic",
            grid: "201090005846010309075800621007156832068320014020704590784002050359070000602508007",
            steps: [
              {"text":"Miremos el bloque inferior izquierdo (marcado): tiene 8 de sus 9 celdas llenas y solo queda libre F9C2.","hl":[73],"rel":[54,55,56,63,64,65,72,73,74]},
              {"text":"Los números que ya están en el bloque inferior izquierdo son 2, 3, 4, 5, 6, 7, 8 y 9. Esta celda no puede repetir ninguno: los tachamos.","hl":[73],"rel":[54,55,56,63,64,65,72,73,74],"src":[54,55,56,63,64,65,72,74],"show":{"73":[1,2,3,4,5,6,7,8,9]},"strike":{"73":[2,3,4,5,6,7,8,9]}},
              {"text":"Solo sobrevive el 1, el único número del 1 al 9 que falta en esta casa. Cuando una casa tiene una sola celda libre se llama Último libre (Full House).","hl":[73],"rel":[54,55,56,63,64,65,72,73,74],"show":{"73":[1,2,3,4,5,6,7,8,9]},"strike":{"73":[2,3,4,5,6,7,8,9]},"keep":{"73":[1]}},
              {"text":"Colocamos el 1 en F9C2. No hizo falta mirar nada más.","hl":[73],"rel":[54,55,56,63,64,65,72,73,74],"place":{"73":1}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "080004507602301009040805200026009100010407602370106005135708926008003741460910008",
            solution: "983264517652371489741895263826539174519487632374126895135748926298653741467912358",
            notes: "none",
            goal: {
              text: "Encontrá una fila, columna o bloque al que le falte una sola celda y colocá el número que falta.",
              place: [[58,4],[77,2]]
            },
            hint: "Contá los números de una casa casi completa: el único que no está es el que va en la celda libre.",
            hintCells: [58]
          }
        },
        {
          id: "naked-single",
          title: "Único desnudo (Naked Single)",
          short: "Una celda con un solo candidato posible",
          theory: {
            what: "Es una celda vacía donde, después de descartar los números que ya aparecen en su fila, su columna y su bloque, queda un único candidato posible. No hay que adivinar: ese número es el que va.",
            detect: "Buscá celdas con muchos vecinos llenos, por ejemplo una que cruce una fila y una columna casi completas. Fijate qué números faltan después de mirar fila, columna y bloque: si queda uno solo, lo encontraste.",
            why: "Es la base de todo Sudoku: resuelve por completo los tableros Fáciles y, en los difíciles, aparece después de cada eliminación avanzada. Cada número que colocás descarta candidatos en su fila, columna y bloque, y eso encadena nuevos únicos.",
            faq: [
              {"q":"¿Tengo que anotar candidatos para verlo?","a":"No necesariamente. Con práctica alcanza con repasar los números de la fila, la columna y el bloque. Las notas ayudan cuando la celda tiene muchos vecinos y se te mezclan."},
              {"q":"¿En qué se diferencia del Único oculto?","a":"En el desnudo la celda tiene un solo candidato. En el oculto la celda tiene varios, pero un número solo puede ir en esa celda dentro de su bloque, fila o columna."},
              {"q":"¿Y si una celda se queda sin candidatos?","a":"Es señal de que hay un error antes: algún número colocado o tachado estaba mal. Usá Deshacer hasta volver a un estado correcto."}
            ]
          },
          example: {
            mode: "classic",
            grid: "050120000210407005078500002600900237030008509000302600300701000867230000520004790",
            steps: [
              {"text":"Tomemos la celda marcada (F9C3). Para saber qué número lleva, descartamos los que ya aparecen en su fila, su columna y su bloque.","hl":[74],"rel":[72,73,74,75,76,77,78,79,80,2,11,20,29,38,47,56,65,54,55,63,64]},
              {"text":"Arrancamos con la fila 9: ya están el 2, 4, 5, 7 y 9, así que esta celda no puede llevarlos. Los tachamos.","hl":[74],"src":[72,73,77,78,79],"show":{"74":[1,2,3,4,5,6,7,8,9]},"strike":{"74":[2,4,5,7,9]}},
              {"text":"Seguimos con la columna 3: aparecen además el 8 (los que ya habíamos tachado no se repiten), así que también los tachamos.","hl":[74],"src":[20],"show":{"74":[1,2,3,4,5,6,7,8,9]},"strike":{"74":[2,4,5,7,8,9]}},
              {"text":"Por último, miramos el bloque inferior izquierdo: aparecen además el 3 y 6 (los que ya habíamos tachado no se repiten), así que también los tachamos.","hl":[74],"src":[54,64],"show":{"74":[1,2,3,4,5,6,7,8,9]},"strike":{"74":[2,3,4,5,6,7,8,9]}},
              {"text":"Tras descartar fila, columna y bloque, solo sobrevive el 1. Una celda con un único candidato posible se llama Único desnudo (Naked Single).","hl":[74],"show":{"74":[1,2,3,4,5,6,7,8,9]},"strike":{"74":[2,3,4,5,6,7,8,9]},"keep":{"74":[1]}},
              {"text":"Colocamos el 1 en F9C3. Sin adivinar: era la única opción que respetaba las reglas.","hl":[74],"place":{"74":1}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "700506920004000000530000701100700230000400580000090416070600003360048175001350690",
            solution: "718536924624179358539824761146785239293461587857293416975612843362948175481357692",
            notes: "none",
            goal: {
              text: "Encontrá una celda que tenga un único candidato posible y colocá su número.",
              place: [[2,8],[17,8],[32,5],[35,9],[60,8],[61,4]]
            },
            hint: "Elegí una celda con muchos vecinos llenos y descartá los números que ya están en su fila, columna y bloque. Si queda uno solo, es tuyo.",
            hintCells: [2]
          }
        }
      ]
    },
    {
      id: "c2",
      title: "Pares y apuntadores",
      blurb: "Primeras eliminaciones puras: limpian candidatos y abren camino a nuevos únicos.",
      lessons: [
        {
          id: "hidden-single",
          title: "Único oculto (Hidden Single)",
          short: "Un número con un solo lugar posible en su casa",
          theory: {
            what: "Es un número que, dentro de un bloque, una fila o una columna, solo puede ir en una celda, aunque esa celda tenga otros candidatos. Cada casa necesita los números del 1 al 9, así que si el lugar es único, el número va ahí.",
            detect: "Elegí un número y un bloque donde todavía falte. Mirá qué filas y columnas ya contienen ese número: cada una bloquea las celdas que atraviesa. Si todas las celdas libres del bloque quedan bloqueadas menos una, ahí va. Repetí con filas y columnas.",
            why: "Destraba los tableros donde ninguna celda tiene un único candidato. Mirar por número en lugar de por celda es el cambio de mirada más importante a partir del nivel Medio.",
            faq: [
              {"q":"¿Por qué se llama \"oculto\"?","a":"Porque la celda tiene varios candidatos y el número se esconde entre ellos. Recién se ve cuando mirás la casa completa."},
              {"q":"¿Funciona también en filas y columnas?","a":"Sí, el razonamiento es idéntico con las tres casas: bloque, fila y columna."},
              {"q":"¿Por dónde conviene empezar?","a":"Por los números que ya aparecen 6, 7 u 8 veces: dejan pocos lugares libres y suelen dar únicos ocultos enseguida."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000504000009010000251038006000050670562000009710000000000801095000390000070200060",
            steps: [
              {"text":"Ahora no miramos una celda, sino un número. Busquemos dónde puede ir el 9 dentro de el bloque inferior izquierdo (marcado). Resaltamos los 9 ya colocados en el tablero.","rel":[54,55,56,63,64,65,72,73,74],"same":[11,44,61,67]},
              {"text":"Cada 9 resaltado en una fila bloquea a las celdas libres del bloque que comparten esa fila: ahí el 9 no puede ir (las marcamos con ✕).","rel":[54,55,56,63,64,65,72,73,74],"src":[61,67],"same":[11,44,61,67],"no":[54,55,56,63,64,65]},
              {"text":"Lo mismo ocurre con los 9 de las columnas: tachamos también las celdas del bloque que comparten columna con alguno.","rel":[54,55,56,63,64,65,72,73,74],"src":[11],"same":[11,44,61,67],"no":[54,55,56,63,64,65,74]},
              {"text":"Solo queda una celda libre en el bloque: F9C1. Aunque tenga otros candidatos (1, 3, 4, 8 y 9), el 9 del bloque no tiene otro lugar posible. Eso es un Único oculto (Hidden Single).","hl":[72],"rel":[54,55,56,63,64,65,72,73,74],"no":[54,55,56,63,64,65,74],"show":{"72":[1,3,4,8,9]},"keep":{"72":[9]}},
              {"text":"Colocamos el 9 en F9C1.","hl":[72],"place":{"72":9}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000070060004000005207904300500000906400680003360000400900015007800090021000003000",
            solution: "139578264684231795257964318571342986492687153368159472926415837843796521715823649",
            notes: "none",
            goal: {
              text: "Encontrá un número que solo pueda ir en una celda de su bloque, fila o columna, y colocalo.",
              place: [[8,4],[22,6],[72,7],[61,3],[9,6]]
            },
            hint: "Elegí un número y buscá un bloque, fila o columna donde todas las celdas libres menos una estén bloqueadas por ese mismo número.",
            hintCells: [8]
          }
        },
        {
          id: "naked-pair",
          title: "Par desnudo (Naked Pair)",
          short: "Dos celdas, los mismos dos candidatos",
          theory: {
            what: "Son dos celdas de una misma casa (fila, columna o bloque) que tienen exactamente los mismos dos candidatos. Esos dos números se reparten entre esas dos celdas, así que no pueden aparecer en ninguna otra celda de esa casa.",
            detect: "Con las notas puestas, buscá celdas con solo dos candidatos y fijate si otra celda de la misma casa tiene el mismo par (por ejemplo 3-7 y 3-7). Después revisá el resto de la casa: si alguna otra celda tiene el 3 o el 7, ahí hay eliminaciones.",
            why: "Limpia candidatos sin colocar números, y esa limpieza suele dejar únicos desnudos u ocultos. Es la primera técnica de eliminación pura y es clave desde el nivel Difícil.",
            faq: [
              {"q":"¿Las dos celdas deben tener solo esos dos candidatos?","a":"Sí. Si una de ellas tuviera un tercer candidato, el razonamiento ya no vale."},
              {"q":"¿Y si son tres celdas con tres números?","a":"Es la misma idea ampliada: el Trío desnudo, que verás en el capítulo 3."},
              {"q":"¿Sirve también en bloques?","a":"Sí, en filas, columnas y bloques por igual."}
            ]
          },
          example: {
            mode: "classic",
            grid: "030120000200038010000000000000409008090201070080070000310700400400090001900600507",
            steps: [
              {"text":"Trabajemos en el bloque superior central. Mostramos los candidatos de cada celda libre.","rel":[3,4,5,12,13,14,21,22,23],"show":{"5":[4,5,6,7],"12":[5,9],"21":[5,9],"22":[4,5,6],"23":[4,5,6,7]}},
              {"text":"Mirá F2C4 y F3C4: entre dos celdas solo aparecen los números 5 y 9. Es un Par desnudo (Naked Pair).","hl":[12,21],"rel":[3,4,5,12,13,14,21,22,23],"show":{"5":[4,5,6,7],"12":[5,9],"21":[5,9],"22":[4,5,6],"23":[4,5,6,7]},"keep":{"12":[5,9],"21":[5,9]}},
              {"text":"Si una de las dos celdas es 5, la otra tiene que ser 9 (y viceversa). Todavía no sabemos cuál es cuál, pero sí que el 5 y el 9 de el bloque superior central están reservados para esas dos celdas.","hl":[12,21],"rel":[3,4,5,12,13,14,21,22,23],"show":{"5":[4,5,6,7],"12":[5,9],"21":[5,9],"22":[4,5,6],"23":[4,5,6,7]},"keep":{"12":[5,9],"21":[5,9]}},
              {"text":"Por eso ninguna otra celda de el bloque superior central puede llevar 5 y 9: los tachamos en rojo (3 candidatos).","hl":[12,21],"rel":[3,4,5,12,13,14,21,22,23],"show":{"5":[4,5,6,7],"12":[5,9],"21":[5,9],"22":[4,5,6],"23":[4,5,6,7]},"strike":{"5":[5],"22":[5],"23":[5]},"keep":{"12":[5,9],"21":[5,9]}},
              {"text":"Así quedan los candidatos de el bloque superior central tras la limpieza, sin haber colocado nada todavía.","hl":[12,21,5,22,23],"rel":[3,4,5,12,13,14,21,22,23],"show":{"5":[4,6,7],"12":[5,9],"21":[5,9],"22":[4,6],"23":[4,6,7]},"keep":{"12":[5,9],"21":[5,9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "001000006400000700900030040023600090600307400000001500100046070000010000706000080",
            solution: "281475936435869712967132845523684197619357428874921563158246379392718654746593281",
            notes: "auto",
            goal: {
              text: "Hay un par desnudo en el tablero: tachá (en modo Notas) los candidatos que sobran en las demás celdas de su fila, columna o bloque.",
              elimSets: [[[32,5],[32,8],[33,8],[35,8]]]
            },
            hint: "Buscá dos celdas de la misma fila, columna o bloque que tengan solo los mismos dos candidatos. Esos dos números no pueden estar en el resto de esa casa.",
            hintCells: [27,31]
          }
        },
        {
          id: "hidden-pair",
          title: "Par oculto (Hidden Pair)",
          short: "Dos números que solo caben en dos celdas",
          theory: {
            what: "Son dos números que, dentro de una casa, solo pueden ir en las mismas dos celdas. Esas celdas pueden tener otros candidatos, pero como deben alojar a esos dos números, todo lo demás sobra.",
            detect: "Con las notas puestas, elegí una casa y mirá por número: buscá dos números que aparezcan únicamente en dos celdas, las mismas para los dos. Si esas celdas tienen más candidatos, tachalos: quedan solo los dos del par.",
            why: "Es la versión \"por número\" del Par desnudo. Convierte celdas con muchos candidatos en celdas con solo dos, y eso suele dejar nuevos pares desnudos, únicos y otras eliminaciones.",
            faq: [
              {"q":"¿Por qué se llama \"oculto\"?","a":"Porque el par se esconde entre otros candidatos. Recién se ve cuando mirás dónde puede ir cada número en la casa."},
              {"q":"¿Cuál es la relación con el Par desnudo?","a":"Son complementarios: en una casa, un par oculto de dos números coincide con un conjunto desnudo formado por las celdas restantes. Se ven distinto, pero limpian lo mismo."},
              {"q":"¿Cómo lo distingo de un Único oculto?","a":"En el Único oculto un número tiene un solo lugar. En el Par oculto dos números comparten exactamente dos lugares."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000000703610000020000652000006530008100047300270060140080000000000098000000020039",
            steps: [
              {"text":"Trabajemos en la columna 6. Miremos solo los números 5 y 6: mostramos únicamente dónde puede ir cada uno.","rel":[5,14,23,32,41,50,59,68,77],"show":{"59":[5,6],"77":[5,6]}},
              {"text":"Fijate: el 5 solo cabe en F7C6 y F9C6; el 6 solo cabe en F7C6 y F9C6. En la columna 6 esos 2 números solo tienen 2 celdas posibles: F7C6 y F9C6. Es un Par oculto (Hidden Pair).","hl":[59,77],"rel":[5,14,23,32,41,50,59,68,77],"show":{"59":[5,6],"77":[5,6]}},
              {"text":"Esos 2 números tienen que ir sí o sí en esas 2 celdas, así que ninguna de ellas puede llevar otro número. Mostramos todos los candidatos de esas celdas.","hl":[59,77],"rel":[5,14,23,32,41,50,59,68,77],"show":{"59":[1,3,4,5,6],"77":[1,4,5,6]},"keep":{"59":[5,6],"77":[5,6]}},
              {"text":"Los demás candidatos de esas celdas sobran: los tachamos en rojo (5 candidatos).","hl":[59,77],"rel":[5,14,23,32,41,50,59,68,77],"show":{"59":[1,3,4,5,6],"77":[1,4,5,6]},"strike":{"59":[1,3,4],"77":[1,4]},"keep":{"59":[5,6],"77":[5,6]}},
              {"text":"Cada celda quedó solo con los dos números del par oculto. No colocamos nada, pero el tablero quedó mucho más limpio.","hl":[59,77],"rel":[5,14,23,32,41,50,59,68,77],"show":{"59":[5,6],"77":[5,6]},"keep":{"59":[5,6],"77":[5,6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "200000005000005296000600043080002500720009400004310602000780000000000060049000100",
            solution: "267943815438175296915628743381462579726859431594317682653781924172594368849236157",
            notes: "auto",
            goal: {
              text: "Hay un par oculto en el tablero: tachá (en modo Notas) los candidatos que sobran dentro de las dos celdas del par.",
              elimSets: [[[61,3],[79,3],[79,7],[79,8]]]
            },
            hint: "Elegí una casa y mirá por número: buscá dos números que solo puedan ir en las mismas dos celdas. Todo lo demás en esas celdas sobra.",
            hintCells: [61,79]
          }
        },
        {
          id: "pointing",
          title: "Apuntadores (Pointing Pair / Triple)",
          short: "Un número en un bloque que apunta a una línea",
          theory: {
            what: "Cuando, dentro de un bloque, todos los lugares posibles de un número están en la misma fila (o columna), ese número \"apunta\" a esa línea: tiene que estar en el bloque y en esa línea a la vez. Por eso se puede eliminar del resto de la línea, fuera del bloque.",
            detect: "Mirá un bloque y un número a la vez, marcando solo ese candidato. Si todos los candidatos caen en una misma fila o columna (2 o 3 celdas), revisá esa línea fuera del bloque: ahí ese número se puede tachar.",
            why: "Es la puerta a las técnicas de líneas: elimina candidatos a distancia y a menudo deja un Único oculto en otro bloque. Obliga a mirar el tablero por números, no por celdas.",
            faq: [
              {"q":"¿En qué se diferencia del Par desnudo?","a":"El par desnudo usa dos celdas y dos números dentro de una casa. Apuntadores usa un solo número y la intersección entre un bloque y una línea."},
              {"q":"¿Funciona al revés?","a":"Sí: es la Reducción Caja-Línea, que verás en el capítulo 3. Si en una línea todos los candidatos de un número caen dentro de un bloque, se tacha del resto del bloque."},
              {"q":"¿Cuántas celdas pueden apuntar?","a":"Dos (Pointing Pair) o tres (Pointing Triple). Con una sola celda sería directamente un Único oculto."}
            ]
          },
          example: {
            mode: "classic",
            grid: "850030040000508000100200000001000090004800106900307450600402007300050004405060200",
            steps: [
              {"text":"Miremos el bloque central izquierdo (marcado) y solo un número: el 3. Mostramos únicamente dónde puede ir el 3 dentro del bloque.","rel":[27,28,29,36,37,38,45,46,47],"show":{"28":[3],"37":[3]}},
              {"text":"Todos los lugares posibles del 3 en este bloque están en la columna 2: F4C2 y F5C2. El 3 del bloque tiene que caer sí o sí en esa columna.","hl":[28,37],"rel":[27,28,29,36,37,38,45,46,47,1,10,19,55,64,73],"show":{"28":[3],"37":[3]}},
              {"text":"Como el 3 del bloque está en la columna 2, ningún otro 3 de esa columna puede estar fuera del bloque. Los candidatos 3 que había en el resto de la columna 2 (en rojo) sobran.","hl":[28,37],"rel":[27,28,29,36,37,38,45,46,47,1,10,19,55,64,73],"show":{"10":[3],"19":[3],"28":[3],"37":[3]},"strike":{"10":[3],"19":[3]}},
              {"text":"Eliminamos el 3 de 2 celdas sin colocar nada todavía. Esta técnica se llama Apuntadores (Pointing Pair, con dos celdas).","hl":[28,37],"rel":[27,28,29,36,37,38,45,46,47,1,10,19,55,64,73],"show":{"28":[3],"37":[3]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000040020000000083071002050950078000206400000007250000000910030100800009693500000",
            solution: "839645721562791483471382956954178362286439517317256894728914635145863279693527148",
            notes: "auto",
            goal: {
              text: "Buscá un número cuyos candidatos en un bloque estén todos en una misma fila o columna, y tachá ese número en el resto de la línea (modo Notas).",
              elimSets: [[[42,9],[51,9]],[[60,8],[62,8]],[[5,7],[14,7]]]
            },
            hint: "Mirá un bloque y un número: si sus candidatos caen todos en una sola fila o columna, el resto de esa línea no puede llevarlo.",
            hintCells: [6,15,24]
          }
        }
      ]
    },
    {
      id: "c3",
      title: "Tríos y cuartetos",
      blurb: "Grupos desnudos y ocultos, reducción caja-línea y el primer patrón en X.",
      lessons: [
        {
          id: "box-line",
          title: "Reducción Caja-Línea (Box/Line Reduction)",
          short: "Un número en una línea que se esconde en un bloque",
          theory: {
            what: "Es la inversa de los Apuntadores. Si en una fila (o columna) todos los lugares posibles de un número están dentro del mismo bloque, ese número de la línea tiene que ir en el bloque. Entonces se puede eliminar de las demás celdas del bloque, las que no están en la línea.",
            detect: "Elegí una fila o columna y un número. Marcá solo sus candidatos: si caen todos dentro de un mismo bloque (2 o 3 celdas), mirá el resto de ese bloque. Cualquier candidato de ese número fuera de la línea se puede tachar.",
            why: "Completa el par de técnicas de intersección entre líneas y bloques. Aparece mucho cuando una fila o columna está casi resuelta y suele destrabar únicos ocultos dentro del bloque.",
            faq: [
              {"q":"¿En qué se diferencia de los Apuntadores?","a":"En Apuntadores se parte del bloque y se eliminan candidatos en la línea. Acá se parte de la línea y se eliminan candidatos en el bloque."},
              {"q":"¿Por qué se llama Caja-Línea?","a":"\"Caja\" es el bloque (box) y \"Línea\" es la fila o columna. La técnica relaciona las dos casas que se cruzan."},
              {"q":"¿Cuántas celdas deben formar el patrón?","a":"Dos o tres. Si el número tuviera un solo candidato en la línea, sería un Único oculto."}
            ]
          },
          example: {
            mode: "classic",
            grid: "700009010000000725003200800000002000020003000400000008010005607005697000009840000",
            steps: [
              {"text":"Miremos la fila 2 (marcada) y solo un número: el 3. Mostramos dónde puede ir el 3 en esa fila.","rel":[9,10,11,12,13,14,15,16,17],"show":{"12":[3],"13":[3]}},
              {"text":"Todos los lugares posibles del 3 en la fila 2 están dentro de el bloque superior central: F2C4 y F2C5. El 3 de la fila tiene que estar sí o sí en ese bloque.","hl":[12,13],"rel":[3,4,5,12,13,14,21,22,23,9,10,11,15,16,17],"show":{"12":[3],"13":[3]}},
              {"text":"Como el 3 de la fila 2 cae dentro de ese bloque, el 3 del bloque ya está \"usado\" por la fila. Los demás candidatos 3 del bloque (en rojo) sobran.","hl":[12,13],"rel":[3,4,5,12,13,14,21,22,23,9,10,11,15,16,17],"show":{"3":[3],"4":[3],"12":[3],"13":[3]},"strike":{"3":[3],"4":[3]}},
              {"text":"Eliminamos el 3 de 2 celdas del bloque. Esta técnica se llama Reducción Caja-Línea (Box/Line Reduction) y es la inversa de los Apuntadores.","hl":[12,13],"rel":[3,4,5,12,13,14,21,22,23,9,10,11,15,16,17],"show":{"12":[3],"13":[3]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000708060072060300008000970000005000005080090010000403280000049006302000090814002",
            solution: "931748265472569318658123974764935821325481796819276453283657149146392587597814632",
            notes: "auto",
            goal: {
              text: "Buscá un número cuyos candidatos en una fila o columna estén todos dentro de un mismo bloque, y tachá ese número en el resto del bloque (modo Notas).",
              elimSets: [[[4,2]],[[33,2],[42,2]],[[33,6],[42,6]]]
            },
            hint: "Mirá una fila o columna y un número: si todos sus candidatos caen dentro de un solo bloque, las demás celdas de ese bloque no pueden llevarlo.",
            hintCells: [21,22]
          }
        },
        {
          id: "naked-triple",
          title: "Trío desnudo (Naked Triple)",
          short: "Tres celdas que solo usan tres números",
          theory: {
            what: "Son tres celdas de una misma casa que, entre todas, solo usan tres números distintos. No hace falta que cada una tenga los tres: pueden ser combinaciones como 1-2, 2-3 y 1-3, o 1-2-3, 1-2 y 2-3. Esos tres números quedan reservados y se tachan del resto de la casa.",
            detect: "Buscá celdas con 2 o 3 candidatos en una misma casa. Si tres de ellas juntas suman exactamente tres números distintos, tenés un trío. Después revisá las demás celdas de la casa: cualquier candidato de esos números sobra.",
            why: "Extiende el Par desnudo a casos más escondidos. Aparece en tableros Difíciles y Expertos, donde ya no quedan pares limpios, y suele limpiar bastantes candidatos de una sola vez.",
            faq: [
              {"q":"¿Cada celda debe tener los tres candidatos?","a":"No. Alcanza con que la unión de los candidatos de las tres celdas sea de solo tres números."},
              {"q":"¿Qué pasa si dos de las tres celdas ya forman un par desnudo?","a":"Entonces ya tenés un Par desnudo y la técnica más simple se aplica primero. El trío \"de verdad\" es el que no se reduce a un par."},
              {"q":"¿Sirve en bloques?","a":"Sí: en filas, columnas y bloques por igual."}
            ]
          },
          example: {
            mode: "classic",
            grid: "100000000000300007000008253607503010000802000005090640860070000002000000000009420",
            steps: [
              {"text":"Trabajemos en el bloque central derecho. Mostramos los candidatos de cada celda libre.","rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[8,9],"35":[2,8,9],"42":[3,5,7,9],"43":[3,7,9],"44":[5,9],"53":[2,8]}},
              {"text":"Mirá F4C7, F4C9 y F6C9: entre tres celdas solo aparecen los números 2, 8 y 9. Es un Trío desnudo (Naked Triple).","hl":[33,35,53],"rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[8,9],"35":[2,8,9],"42":[3,5,7,9],"43":[3,7,9],"44":[5,9],"53":[2,8]},"keep":{"33":[8,9],"35":[2,8,9],"53":[2,8]}},
              {"text":"Las 3 celdas tienen que repartirse los números 2, 8 y 9, uno para cada una. No hace falta que cada celda tenga los 3 candidatos: alcanza con que, entre todas, no usen ninguno más. Todavía no sabemos cuál va dónde, pero esos 3 números de el bloque central derecho están reservados para esas 3 celdas.","hl":[33,35,53],"rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[8,9],"35":[2,8,9],"42":[3,5,7,9],"43":[3,7,9],"44":[5,9],"53":[2,8]},"keep":{"33":[8,9],"35":[2,8,9],"53":[2,8]}},
              {"text":"Por eso ninguna otra celda de el bloque central derecho puede llevar 2, 8 y 9: los tachamos en rojo (3 candidatos).","hl":[33,35,53],"rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[8,9],"35":[2,8,9],"42":[3,5,7,9],"43":[3,7,9],"44":[5,9],"53":[2,8]},"strike":{"42":[9],"43":[9],"44":[9]},"keep":{"33":[8,9],"35":[2,8,9],"53":[2,8]}},
              {"text":"Así quedan los candidatos de el bloque central derecho tras la limpieza, sin haber colocado nada todavía. Además, F5C9 quedó con un solo candidato, el 5 (Único desnudo).","hl":[33,35,53,42,43,44],"rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[8,9],"35":[2,8,9],"42":[3,5,7],"43":[3,7],"44":[5],"53":[2,8]},"keep":{"33":[8,9],"35":[2,8,9],"53":[2,8]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000903500890600002100200000030400000000002050020065009002380000001020000040000090",
            solution: "276943581894651372153278964538497126619832457427165839962384715781529643345716298",
            notes: "auto",
            goal: {
              text: "Hay un trío desnudo en el tablero: tachá (en modo Notas) los candidatos del trío en las demás celdas de su casa.",
              elimSets: [[[59,1],[59,7],[68,7],[77,1],[77,7]]]
            },
            hint: "Buscá tres celdas de una misma casa cuyos candidatos, juntos, sean solo tres números. Esos números no pueden estar en el resto de la casa.",
            hintCells: [66,75,76]
          }
        },
        {
          id: "hidden-triple",
          title: "Trío oculto (Hidden Triple)",
          short: "Tres números que solo caben en tres celdas",
          theory: {
            what: "Son tres números que, dentro de una casa, solo pueden ir en las mismas tres celdas. Esas celdas pueden tener otros candidatos, pero deben alojar a esos tres números, así que todo lo demás sobra.",
            detect: "Con las notas puestas, elegí una casa y mirá por número. Buscá tres números cuyos lugares posibles se concentren, entre todos, en solo tres celdas. Después tachá de esas celdas los candidatos que no sean parte del trío.",
            why: "Es la versión \"por número\" del Trío desnudo. Cuando ninguna otra técnica funciona, un trío oculto limpia varios candidatos de golpe y deja celdas con solo dos o tres opciones.",
            faq: [
              {"q":"¿Cada número debe aparecer en las tres celdas?","a":"No. Alcanza con que cada número aparezca en al menos dos de las tres celdas y que ninguno esté fuera de ellas."},
              {"q":"¿Cómo lo diferencio de un Par oculto?","a":"Contá las celdas que usan los números: si dos números comparten dos celdas es un par; si tres números comparten tres celdas, es un trío."},
              {"q":"¿Es muy común?","a":"Es más raro que el trío desnudo. Se busca cuando ya probaste con pares, tríos desnudos y líneas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "082000000010004600400108000007000530000016000300070902000050070000437800000000205",
            steps: [
              {"text":"Trabajemos en el bloque superior central. Miremos solo los números 3, 5 y 7: mostramos únicamente dónde puede ir cada uno.","rel":[3,4,5,12,13,14,21,22,23],"show":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]}},
              {"text":"Fijate: el 3 solo cabe en F1C4, F1C6 y F2C4; el 5 solo cabe en F1C4, F1C6 y F2C4; el 7 solo cabe en F1C4 y F2C4. En el bloque superior central esos 3 números solo tienen 3 celdas posibles: F1C4, F1C6 y F2C4. Es un Trío oculto (Hidden Triple).","hl":[3,5,12],"rel":[3,4,5,12,13,14,21,22,23],"show":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]}},
              {"text":"Esos 3 números tienen que ir sí o sí en esas 3 celdas, así que ninguna de ellas puede llevar otro número. Mostramos todos los candidatos de esas celdas.","hl":[3,5,12],"rel":[3,4,5,12,13,14,21,22,23],"show":{"3":[3,5,6,7,9],"5":[3,5,9],"12":[2,3,5,7,9]},"keep":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]}},
              {"text":"Los demás candidatos de esas celdas sobran: los tachamos en rojo (5 candidatos).","hl":[3,5,12],"rel":[3,4,5,12,13,14,21,22,23],"show":{"3":[3,5,6,7,9],"5":[3,5,9],"12":[2,3,5,7,9]},"strike":{"3":[6,9],"5":[9],"12":[2,9]},"keep":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]}},
              {"text":"Cada celda quedó solo con los 3 números del trío oculto. No colocamos nada, pero el tablero quedó mucho más limpio.","hl":[3,5,12],"rel":[3,4,5,12,13,14,21,22,23],"show":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]},"keep":{"3":[3,5,7],"5":[3,5],"12":[3,5,7]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000000000070520030400000605004001370607800000009006510035079062000002000000030400",
            solution: "253968741176524839498317625584291376617853294329746518835479162741682953962135487",
            notes: "auto",
            goal: {
              text: "Hay un trío oculto en el tablero: tachá (en modo Notas) los candidatos ajenos al trío dentro de sus tres celdas.",
              elimSets: [[[4,4],[4,9],[22,9],[67,4],[67,5]]]
            },
            hint: "Elegí una casa y mirá por número: buscá tres números que, entre todos, solo puedan ir en tres celdas. Todo lo demás en esas celdas sobra.",
            hintCells: [4,22,67]
          }
        },
        {
          id: "naked-quad",
          title: "Cuarteto desnudo (Naked Quad)",
          short: "Cuatro celdas que solo usan cuatro números",
          theory: {
            what: "Son cuatro celdas de una misma casa que, entre todas, solo usan cuatro números distintos. Esos cuatro números se reparten entre las cuatro celdas, así que se pueden tachar del resto de la casa.",
            detect: "Buscá cuatro celdas de una casa con 2, 3 o 4 candidatos cuya unión sea de exactamente cuatro números. Después mirá las otras celdas de la casa: cualquier candidato de esos cuatro números sobra.",
            why: "Es la extensión natural de pares y tríos. Es poco frecuente, pero en tableros Expertos puede ser la única forma de avanzar sin recurrir a patrones más complejos.",
            faq: [
              {"q":"¿Cómo se diferencia de un Trío o un Par?","a":"Si un subconjunto de esas celdas ya forma un par o un trío, aplicá primero esa técnica. El cuarteto \"de verdad\" necesita las cuatro celdas."},
              {"q":"¿Es necesario buscarlo siempre?","a":"No. Se busca cuando se agotaron las técnicas más simples. Con casas que tienen pocas celdas libres, el cuarteto equivale a mirar el resto como un grupo oculto."},
              {"q":"¿Puede aparecer en una casa con muchas celdas libres?","a":"Sí, pero el patrón útil suele darse en casas con 7 o más celdas libres, donde hay candidatos \"de sobra\" para tachar."}
            ]
          },
          example: {
            mode: "classic",
            grid: "600800007070000800100003000080200031950080002020030700000509000500006200034000000",
            steps: [
              {"text":"Trabajemos en la fila 9. Mostramos los candidatos de cada celda libre.","rel":[72,73,74,75,76,77,78,79,80],"show":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8],"78":[1,5,6,9],"79":[1,5,6,7,8,9],"80":[5,6,8,9]}},
              {"text":"Mirá F9C1, F9C4, F9C5 y F9C6: entre cuatro celdas solo aparecen los números 1, 2, 7 y 8. Es un Cuarteto desnudo (Naked Quad).","hl":[72,75,76,77],"rel":[72,73,74,75,76,77,78,79,80],"show":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8],"78":[1,5,6,9],"79":[1,5,6,7,8,9],"80":[5,6,8,9]},"keep":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8]}},
              {"text":"Las 4 celdas tienen que repartirse los números 1, 2, 7 y 8, uno para cada una. No hace falta que cada celda tenga los 4 candidatos: alcanza con que, entre todas, no usen ninguno más. Todavía no sabemos cuál va dónde, pero esos 4 números de la fila 9 están reservados para esas 4 celdas.","hl":[72,75,76,77],"rel":[72,73,74,75,76,77,78,79,80],"show":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8],"78":[1,5,6,9],"79":[1,5,6,7,8,9],"80":[5,6,8,9]},"keep":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8]}},
              {"text":"Por eso ninguna otra celda de la fila 9 puede llevar 1, 2, 7 y 8: los tachamos en rojo (5 candidatos).","hl":[72,75,76,77],"rel":[72,73,74,75,76,77,78,79,80],"show":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8],"78":[1,5,6,9],"79":[1,5,6,7,8,9],"80":[5,6,8,9]},"strike":{"78":[1],"79":[1,7,8],"80":[8]},"keep":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8]}},
              {"text":"Así quedan los candidatos de la fila 9 tras la limpieza, sin haber colocado nada todavía.","hl":[72,75,76,77,78,79,80],"rel":[72,73,74,75,76,77,78,79,80],"show":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8],"78":[5,6,9],"79":[5,6,9],"80":[5,6,9]},"keep":{"72":[2,7,8],"75":[1,7],"76":[1,2,7],"77":[1,2,7,8]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000030002700810300005000001039005040050007000000000035840070000000900010000140820",
            solution: "918536472724819356365724981139265748452387169687491235841672593273958614596143827",
            notes: "auto",
            goal: {
              text: "Hay un cuarteto desnudo en el tablero: tachá (en modo Notas) los candidatos del cuarteto en las demás celdas de su casa.",
              elimSets: [[[39,2],[39,6],[48,2],[48,6],[50,2],[50,6],[50,8],[50,9]]]
            },
            hint: "Buscá cuatro celdas de una misma casa cuyos candidatos, juntos, sean solo cuatro números. Esos números no pueden estar en el resto de la casa.",
            hintCells: [30,31,40,49]
          }
        },
        {
          id: "hidden-quad",
          title: "Cuarteto oculto (Hidden Quad)",
          short: "Cuatro números que solo caben en cuatro celdas",
          theory: {
            what: "Son cuatro números que, dentro de una casa, solo pueden ir en las mismas cuatro celdas. Esas celdas deben alojar a esos cuatro números, así que cualquier otro candidato de ellas se puede tachar.",
            detect: "Con las notas puestas, elegí una casa con varias celdas libres y mirá por número. Buscá cuatro números cuyos lugares posibles, juntos, ocupen solo cuatro celdas. Después tachá de esas celdas los candidatos ajenos al cuarteto.",
            why: "Es la técnica de grupo más difícil de ver, y por eso casi nadie la busca a ojo. Conocerla ayuda a entender que cualquier grupo oculto es el espejo de un grupo desnudo en el resto de la casa.",
            faq: [
              {"q":"¿Se parece a un Cuarteto desnudo?","a":"Sí: en una casa, un cuarteto oculto va de la mano de un conjunto desnudo formado por las demás celdas libres. Elegí el que te resulte más fácil de ver."},
              {"q":"¿Cada número debe aparecer en las cuatro celdas?","a":"No. Alcanza con que cada número esté en al menos dos de ellas y ninguno aparezca fuera."},
              {"q":"¿Cuándo conviene buscarlo?","a":"Solo cuando se acabaron las técnicas más simples. Si una casa tiene siete o más celdas libres con muchos candidatos, es el mejor lugar para mirar."}
            ]
          },
          example: {
            mode: "classic",
            grid: "070000060000359000409200000300500080096000400000002100081600003020090000000000006",
            steps: [
              {"text":"Trabajemos en la fila 1. Miremos solo los números 2, 3, 5 y 9: mostramos únicamente dónde puede ir cada uno.","rel":[0,1,2,3,4,5,6,7,8],"show":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]}},
              {"text":"Fijate: el 2 solo cabe en F1C1, F1C3, F1C7 y F1C9; el 3 solo cabe en F1C3 y F1C7; el 5 solo cabe en F1C1, F1C3, F1C7 y F1C9; el 9 solo cabe en F1C7 y F1C9. En la fila 1 esos 4 números solo tienen 4 celdas posibles: F1C1, F1C3, F1C7 y F1C9. Es un Cuarteto oculto (Hidden Quad).","hl":[0,2,6,8],"rel":[0,1,2,3,4,5,6,7,8],"show":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]}},
              {"text":"Esos 4 números tienen que ir sí o sí en esas 4 celdas, así que ninguna de ellas puede llevar otro número. Mostramos todos los candidatos de esas celdas.","hl":[0,2,6,8],"rel":[0,1,2,3,4,5,6,7,8],"show":{"0":[1,2,5,8],"2":[2,3,5,8],"6":[2,3,5,8,9],"8":[1,2,4,5,8,9]},"keep":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]}},
              {"text":"Los demás candidatos de esas celdas sobran: los tachamos en rojo (7 candidatos).","hl":[0,2,6,8],"rel":[0,1,2,3,4,5,6,7,8],"show":{"0":[1,2,5,8],"2":[2,3,5,8],"6":[2,3,5,8,9],"8":[1,2,4,5,8,9]},"strike":{"0":[1,8],"2":[8],"6":[8],"8":[1,4,8]},"keep":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]}},
              {"text":"Cada celda quedó solo con los 4 números del cuarteto oculto. No colocamos nada, pero el tablero quedó mucho más limpio.","hl":[0,2,6,8],"rel":[0,1,2,3,4,5,6,7,8],"show":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]},"keep":{"0":[2,5],"2":[2,3,5],"6":[2,3,5,9],"8":[2,5,9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000000050500100003030000201068700000001080094090600070006005000320009700005000400",
            solution: "142936857587142963639578241468791532751283694293654178876415329324869715915327486",
            notes: "auto",
            goal: {
              text: "Hay un cuarteto oculto en el tablero: tachá (en modo Notas) los candidatos ajenos al cuarteto dentro de sus cuatro celdas.",
              elimSets: [[[0,2],[0,4],[0,7],[18,4],[18,7],[54,4],[54,7],[72,7]]]
            },
            hint: "Elegí una casa con muchas celdas libres y mirá por número: buscá cuatro números que, entre todos, solo puedan ir en cuatro celdas. Todo lo demás en esas celdas sobra.",
            hintCells: [0,18,54,72]
          }
        },
        {
          id: "x-wing",
          title: "X-Wing",
          short: "Dos líneas, un número, un rectángulo",
          theory: {
            what: "Si un número solo puede ir en las mismas dos columnas en dos filas distintas (o al revés), esas cuatro celdas forman un rectángulo. El número ocupará dos esquinas opuestas, así que esas dos columnas ya tienen su número y se puede eliminar de sus otras celdas.",
            detect: "Elegí un número y marcá sus candidatos. Buscá dos filas donde aparezca exactamente en dos celdas y en las mismas columnas. Después revisá esas dos columnas: cualquier otro candidato de ese número se puede tachar. También funciona intercambiando filas y columnas.",
            why: "Es la primera técnica de patrones: elimina candidatos lejos de donde se ve el patrón. Es el paso previo a Swordfish y a las cadenas, y resuelve muchos tableros Expertos.",
            faq: [
              {"q":"¿Por qué se llama X-Wing?","a":"Porque las dos diagonales del rectángulo forman una X: el número va en una diagonal o en la otra."},
              {"q":"¿Tiene que ser un rectángulo perfecto?","a":"Sí: las dos líneas deben tener solo dos candidatos del número y coincidir en las dos columnas (o filas)."},
              {"q":"¿Qué pasa si las líneas tienen más de dos candidatos?","a":"Entonces no es un X-Wing. Con tres líneas y tres columnas, la idea se extiende al Swordfish."}
            ]
          },
          example: {
            mode: "classic",
            grid: "800002070023000900004000300700054100300100080600003092080010000050047000000006800",
            steps: [
              {"text":"Miremos solo el número 8: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"12":[8],"13":[8],"14":[8],"17":[8],"21":[8],"22":[8],"23":[8],"26":[8],"29":[8],"30":[8],"47":[8],"48":[8],"49":[8],"66":[8]}},
              {"text":"Fijate en las columnas 6 y 9: en la columna 6 el 8 solo cabe en F2C6 y F3C6; en la columna 9 el 8 solo cabe en F2C9 y F3C9. Las 4 celdas forman un rectángulo y comparten las mismas dos filas (2 y 3).","hl":[14,23,17,26],"rel":[5,14,23,32,41,50,59,68,77,8,17,26,35,44,53,62,71,80],"show":{"12":[8],"13":[8],"14":[8],"17":[8],"21":[8],"22":[8],"23":[8],"26":[8],"29":[8],"30":[8],"47":[8],"48":[8],"49":[8],"66":[8]}},
              {"text":"Cada una de las dos columnas necesita su 8, y solo tiene esas dos filas disponibles. Hay solo dos formas de repartirlo: 8 en F2C6 y F3C9, o 8 en F3C6 y F2C9 (las dos diagonales del rectángulo). En cualquiera de los dos casos, las filas 2 y 3 reciben su 8 dentro del rectángulo.","hl":[14,23,17,26],"rel":[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26],"show":{"12":[8],"13":[8],"14":[8],"17":[8],"21":[8],"22":[8],"23":[8],"26":[8],"29":[8],"30":[8],"47":[8],"48":[8],"49":[8],"66":[8]}},
              {"text":"Por eso ningún otro 8 de las filas 2 y 3 puede existir fuera del rectángulo: los tachamos en rojo (4 candidatos). Esto es un X-Wing.","hl":[14,23,17,26],"rel":[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26],"show":{"12":[8],"13":[8],"14":[8],"17":[8],"21":[8],"22":[8],"23":[8],"26":[8],"29":[8],"30":[8],"47":[8],"48":[8],"49":[8],"66":[8]},"strike":{"12":[8],"13":[8],"21":[8],"22":[8]}},
              {"text":"Así quedan los candidatos del 8 tras el X-Wing, sin haber colocado nada todavía.","hl":[14,23,17,26],"rel":[5,14,23,32,41,50,59,68,77,8,17,26,35,44,53,62,71,80],"show":{"14":[8],"17":[8],"23":[8],"26":[8],"29":[8],"30":[8],"47":[8],"48":[8],"49":[8],"66":[8]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "706300002090070005105004000009020040000000703001000800000009000902037000300100259",
            solution: "746351982893672415125984637679823541258416793431795826514269378982537164367148259",
            notes: "auto",
            goal: {
              text: "Hay un X-Wing en el tablero: tachá (en modo Notas) el número del patrón en las demás celdas de las dos columnas (o filas) del rectángulo.",
              elimSets: [[[19,3]],[[55,7],[73,7]],[[55,7],[56,7]]]
            },
            hint: "Elegí un número y buscá dos filas donde solo pueda ir en dos celdas, en las mismas dos columnas. Esas columnas ya tienen su número en el rectángulo.",
            hintCells: [28,32,46,50]
          }
        }
      ]
    },
    {
      id: "c4",
      title: "Peces y alas",
      blurb: "Peces avanzados y alas: Swordfish, Jellyfish, rascacielos, cometa, rectángulo vacío, XY-Wing y XYZ-Wing.",
      lessons: [
        {
          id: "swordfish",
          title: "Swordfish (pez espada)",
          short: "Tres filas, tres columnas, un número",
          theory: {
            what: "Es la versión de tres líneas del X-Wing. Si un número solo puede ir en las mismas tres columnas dentro de tres filas distintas (cada fila usa dos o tres de esas columnas), esas tres filas ocuparán esas tres columnas. Entonces el número se puede eliminar del resto de esas columnas.",
            detect: "Elegí un número y marcá sus candidatos. Buscá tres filas donde aparezca en dos o tres celdas y, entre todas, solo toquen tres columnas. Después tachá el número en las demás celdas de esas columnas. También funciona con columnas y filas intercambiadas.",
            why: "Cuando ya no quedan X-Wings, un Swordfish suele ser el siguiente patrón que destraba un tablero Experto. Es el primer \"pez\" de tres líneas y sirve de base para entender Jellyfish y los peces con aleta.",
            faq: [
              {"q":"¿Tiene que haber candidatos en las nueve celdas del patrón?","a":"No. Cada fila puede tener solo dos o tres de las tres columnas. Lo importante es que ninguna fila use una columna fuera de las tres."},
              {"q":"¿En qué se diferencia de un X-Wing?","a":"El X-Wing usa dos líneas y dos columnas. El Swordfish usa tres y tres. La lógica es idéntica: tantas líneas como columnas, y cada columna recibe un número."},
              {"q":"¿Y si una de las filas tuviera solo una celda?","a":"Esa celda sería un Único oculto, y no hace falta ningún pez para resolverla."}
            ]
          },
          example: {
            mode: "classic",
            grid: "180040070570108020294007831008000153957413080301800947805001090712900068039080010",
            steps: [
              {"text":"Miremos solo el número 6: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"2":[6],"3":[6],"5":[6],"6":[6],"8":[6],"11":[6],"13":[6],"15":[6],"17":[6],"21":[6],"22":[6],"27":[6],"28":[6],"30":[6],"31":[6],"32":[6],"42":[6],"44":[6],"46":[6],"49":[6],"50":[6],"55":[6],"57":[6],"58":[6],"72":[6],"75":[6],"77":[6]}},
              {"text":"Fijate en las columnas 3, 7 y 9: el 6 en la columna 3 solo en F1C3 y F2C3; en la columna 7 solo en F1C7, F2C7 y F5C7; en la columna 9 solo en F1C9, F2C9 y F5C9. Entre las tres columnas solo usan tres filas: las filas 1, 2 y 5.","hl":[2,11,6,15,42,8,17,44],"rel":[2,11,20,29,38,47,56,65,74,6,15,24,33,42,51,60,69,78,8,17,26,35,44,53,62,71,80],"show":{"2":[6],"3":[6],"5":[6],"6":[6],"8":[6],"11":[6],"13":[6],"15":[6],"17":[6],"21":[6],"22":[6],"27":[6],"28":[6],"30":[6],"31":[6],"32":[6],"42":[6],"44":[6],"46":[6],"49":[6],"50":[6],"55":[6],"57":[6],"58":[6],"72":[6],"75":[6],"77":[6]}},
              {"text":"Cada una de las tres columnas necesita su 6, y solo puede ponerlo en esas tres filas. Tres 6 en tres filas: cada fila recibe exactamente uno de ellos, aunque todavía no sepamos cuál va dónde.","hl":[2,11,6,15,42,8,17,44],"rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,36,37,38,39,40,41,42,43,44],"show":{"2":[6],"3":[6],"5":[6],"6":[6],"8":[6],"11":[6],"13":[6],"15":[6],"17":[6],"21":[6],"22":[6],"27":[6],"28":[6],"30":[6],"31":[6],"32":[6],"42":[6],"44":[6],"46":[6],"49":[6],"50":[6],"55":[6],"57":[6],"58":[6],"72":[6],"75":[6],"77":[6]}},
              {"text":"Entonces las filas 1, 2 y 5 ya tienen su 6 dentro de las columnas del patrón. Cualquier otro 6 en ellas (en rojo) sobra: 3 candidatos. Es un Swordfish (pez espada).","hl":[2,11,6,15,42,8,17,44],"rel":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,36,37,38,39,40,41,42,43,44],"show":{"2":[6],"3":[6],"5":[6],"6":[6],"8":[6],"11":[6],"13":[6],"15":[6],"17":[6],"21":[6],"22":[6],"27":[6],"28":[6],"30":[6],"31":[6],"32":[6],"42":[6],"44":[6],"46":[6],"49":[6],"50":[6],"55":[6],"57":[6],"58":[6],"72":[6],"75":[6],"77":[6]},"strike":{"3":[6],"5":[6],"13":[6]}},
              {"text":"Así quedan los candidatos del 6 tras el Swordfish, sin haber colocado nada todavía.","hl":[2,11,6,15,42,8,17,44],"rel":[2,11,20,29,38,47,56,65,74,6,15,24,33,42,51,60,69,78,8,17,26,35,44,53,62,71,80],"show":{"2":[6],"6":[6],"8":[6],"11":[6],"15":[6],"17":[6],"21":[6],"22":[6],"27":[6],"28":[6],"30":[6],"31":[6],"32":[6],"42":[6],"44":[6],"46":[6],"49":[6],"50":[6],"55":[6],"57":[6],"58":[6],"72":[6],"75":[6],"77":[6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "300000490019004860002098005800010009197436258000080006004070680000260904001840520",
            solution: "385627491719354862462198735856712349197436258243985176924571683578263914631849527",
            notes: "auto",
            goal: {
              text: "Hay un Swordfish en el tablero: tachá (en modo Notas) el número del patrón en las demás celdas de las tres columnas (o filas).",
              elimSets: [[[5,2]]]
            },
            hint: "Elegí un número y buscá tres filas donde solo pueda ir en 2 o 3 celdas, todas dentro de las mismas tres columnas. Esas columnas ya tienen su número en el patrón.",
            hintCells: [28,32,45,46,50,54,55]
          }
        },
        {
          id: "jellyfish",
          title: "Jellyfish (medusa)",
          short: "Cuatro filas, cuatro columnas, un número",
          theory: {
            what: "Es el pez de cuatro líneas. Si un número solo puede ir en las mismas cuatro columnas dentro de cuatro filas distintas, esas cuatro filas ocuparán esas cuatro columnas, y el número se puede eliminar del resto de ellas.",
            detect: "Elegí un número con pocos candidatos y buscá cuatro filas donde aparezca en 2 a 4 celdas, todas dentro de solo cuatro columnas. Es más fácil verlo cuando el número ya está colocado varias veces. Tachá el número en las demás celdas de esas cuatro columnas.",
            why: "Es raro y casi nunca hace falta a ojo, pero completa la familia de los peces y ayuda a entender que son una sola idea: n líneas, n columnas.",
            faq: [
              {"q":"¿Por qué casi nadie lo usa?","a":"Porque con un patrón tan grande suele haber antes una técnica más simple. Se busca cuando todo lo demás falla."},
              {"q":"¿Se puede encontrar un Jellyfish \"mirando\" el tablero complementario?","a":"Sí: todo pez de n líneas tiene un pez \"espejo\" de 9-n líneas en las otras direcciones, así que a veces es más fácil ver el complemento."},
              {"q":"¿Importa si las líneas son filas o columnas?","a":"No. El patrón es simétrico: podés usar filas como base y columnas como cobertura, o al revés."}
            ]
          },
          example: {
            mode: "classic",
            grid: "900030102130062507500070004690014050805000040403800070250040600700080405340000700",
            steps: [
              {"text":"Miremos solo el número 1: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"21":[1],"23":[1],"37":[1],"44":[1],"46":[1],"53":[1],"56":[1],"57":[1],"59":[1],"61":[1],"62":[1],"64":[1],"65":[1],"66":[1],"68":[1],"70":[1],"74":[1],"75":[1],"77":[1],"79":[1],"80":[1]}},
              {"text":"Fijate en las columnas 3, 4, 6 y 8: el 1 en la columna 3 solo en F7C3, F8C3 y F9C3; en la columna 4 solo en F3C4, F7C4, F8C4 y F9C4; en la columna 6 solo en F3C6, F7C6, F8C6 y F9C6; en la columna 8 solo en F7C8, F8C8 y F9C8. Entre las cuatro columnas solo usan cuatro filas: las filas 7, 8, 9 y 3.","hl":[56,65,74,21,57,66,75,23,59,68,77,61,70,79],"rel":[2,11,20,29,38,47,56,65,74,3,12,21,30,39,48,57,66,75,5,14,23,32,41,50,59,68,77,7,16,25,34,43,52,61,70,79],"show":{"21":[1],"23":[1],"37":[1],"44":[1],"46":[1],"53":[1],"56":[1],"57":[1],"59":[1],"61":[1],"62":[1],"64":[1],"65":[1],"66":[1],"68":[1],"70":[1],"74":[1],"75":[1],"77":[1],"79":[1],"80":[1]}},
              {"text":"Cada una de las cuatro columnas necesita su 1, y solo puede ponerlo en esas cuatro filas. Cuatro 1 en cuatro filas: cada fila recibe exactamente uno de ellos, aunque todavía no sepamos cuál va dónde.","hl":[56,65,74,21,57,66,75,23,59,68,77,61,70,79],"rel":[54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,18,19,20,21,22,23,24,25,26],"show":{"21":[1],"23":[1],"37":[1],"44":[1],"46":[1],"53":[1],"56":[1],"57":[1],"59":[1],"61":[1],"62":[1],"64":[1],"65":[1],"66":[1],"68":[1],"70":[1],"74":[1],"75":[1],"77":[1],"79":[1],"80":[1]}},
              {"text":"Entonces las filas 7, 8, 9 y 3 ya tienen su 1 dentro de las columnas del patrón. Cualquier otro 1 en ellas (en rojo) sobra: 3 candidatos. Es un Jellyfish (medusa).","hl":[56,65,74,21,57,66,75,23,59,68,77,61,70,79],"rel":[54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,18,19,20,21,22,23,24,25,26],"show":{"21":[1],"23":[1],"37":[1],"44":[1],"46":[1],"53":[1],"56":[1],"57":[1],"59":[1],"61":[1],"62":[1],"64":[1],"65":[1],"66":[1],"68":[1],"70":[1],"74":[1],"75":[1],"77":[1],"79":[1],"80":[1]},"strike":{"62":[1],"64":[1],"80":[1]}},
              {"text":"Así quedan los candidatos del 1 tras el Jellyfish, sin haber colocado nada todavía. Además, F8C2 quedó con un solo candidato, el 6 (Único desnudo).","hl":[56,65,74,21,57,66,75,23,59,68,77,61,70,79],"rel":[2,11,20,29,38,47,56,65,74,3,12,21,30,39,48,57,66,75,5,14,23,32,41,50,59,68,77,7,16,25,34,43,52,61,70,79],"show":{"21":[1],"23":[1],"37":[1],"44":[1],"46":[1],"53":[1],"56":[1],"57":[1],"59":[1],"61":[1],"65":[1],"66":[1],"68":[1],"70":[1],"74":[1],"75":[1],"77":[1],"79":[1]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "040000000803704500270901003600030004450090006312040000020080070530279108700410200",
            solution: "941853762863724591275961483697532814458197326312648957124385679536279148789416235",
            notes: "auto",
            goal: {
              text: "Hay un Jellyfish en el tablero: tachá (en modo Notas) el número del patrón en las demás celdas de las cuatro columnas (o filas).",
              elimSets: [[[3,5],[5,5]]]
            },
            hint: "Buscá cuatro filas donde un número solo pueda ir en 2 a 4 celdas, todas dentro de las mismas cuatro columnas. Esas columnas ya tienen su número en el patrón.",
            hintCells: [30,32,34,48,50,52,53,57,59,62,77,79,80]
          }
        },
        {
          id: "skyscraper",
          title: "Skyscraper (Rascacielos)",
          short: "Dos enlaces fuertes con una base común",
          theory: {
            what: "Si un número tiene solo dos lugares en dos filas (o columnas) y esos dos pares comparten una columna, forman dos \"torres\". Las bases comparten línea, así que no pueden ser el número a la vez, y por eso uno de los dos extremos (el techo) tiene que serlo. Se elimina de las celdas que ven ambos extremos.",
            detect: "Elegí un número y buscá dos filas donde aparezca exactamente en dos celdas. Si en una de las columnas coinciden y en la otra no, tenés un rascacielos. Las celdas que ven los dos extremos del techo no pueden ser ese número.",
            why: "Es una cadena corta y muy visual. Aparece con frecuencia en tableros Difíciles y es la antesala de las X-Chains y las cadenas AIC.",
            faq: [
              {"q":"¿Por qué se llama \"rascacielos\"?","a":"Porque las dos filas con enlace fuerte parecen dos edificios con la misma base y techos a distinta altura."},
              {"q":"¿Qué pasa si los dos techos también están en la misma columna?","a":"Entonces sería un X-Wing, que elimina de las dos columnas completas."},
              {"q":"¿Funciona con columnas?","a":"Sí, intercambiando filas por columnas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000200700060400028742813600215300070000502103800190502000920000620730000059601207",
            steps: [
              {"text":"Miremos solo el número 9: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"15":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"43":[9],"69":[9],"70":[9],"71":[9]}},
              {"text":"En la fila 3 el 9 solo cabe en F3C9 y F3C8; en la fila 4, solo en F4C9 y F4C7. Son dos enlaces fuertes: en cada fila uno de los dos tiene que ser 9.","hl":[26,35,25,33],"rel":[18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35],"show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"15":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"43":[9],"69":[9],"70":[9],"71":[9]}},
              {"text":"F3C9 y F4C9 están en la misma columna 9 (la base del rascacielos): no pueden ser 9 los dos a la vez. Los extremos son F3C8 y F4C7 (el techo).","hl":[26,35],"src":[25,33],"rel":[8,17,26,35,44,53,62,71,80],"show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"15":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"43":[9],"69":[9],"70":[9],"71":[9]}},
              {"text":"Si F3C9 no es 9, entonces F3C8 lo es; si F4C9 no es 9, entonces F4C7 lo es. Como al menos una de las dos bases no es 9, al menos uno de los extremos es 9.","hl":[26,35,25,33],"src":[25,33],"show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"15":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"43":[9],"69":[9],"70":[9],"71":[9]}},
              {"text":"Cualquier celda que vea a la vez F3C8 y F4C7 queda con un 9 vecino sí o sí: lo tachamos en rojo (2 candidatos). Esto es un Skyscraper (rascacielos).","hl":[26,35,25,33],"src":[25,33],"show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"15":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"43":[9],"69":[9],"70":[9],"71":[9]},"strike":{"15":[9],"43":[9]}},
              {"text":"Así quedan los candidatos del 9 tras el rascacielos, sin haber colocado nada todavía. Además, F2C7 quedó con un solo candidato, el 3 (Único desnudo).","hl":[26,35,25,33],"show":{"0":[9],"1":[9],"5":[9],"7":[9],"8":[9],"9":[9],"14":[9],"25":[9],"26":[9],"33":[9],"35":[9],"36":[9],"37":[9],"69":[9],"70":[9],"71":[9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "004985001735000968918763524490000000850002093006000010500800000180000000002570089",
            solution: "264985731735124968918763524491358276857612493326497815579836142183249657642571389",
            notes: "auto",
            goal: {
              text: "Hay un Skyscraper en el tablero: tachá (en modo Notas) el número del patrón en las celdas que ven a la vez los dos extremos del techo.",
              elimSets: [[[78,4]]]
            },
            hint: "Elegí un número y buscá dos filas donde solo pueda ir en dos celdas cada una, con una columna en común. Mirá qué celdas ven los dos extremos libres.",
            hintCells: [55,61,73,70]
          }
        },
        {
          id: "kite",
          title: "Two-String Kite (Cometa de dos cuerdas)",
          short: "Una fila y una columna que se tocan en un bloque",
          theory: {
            what: "Si un número tiene solo dos lugares en una fila y solo dos lugares en una columna, y una celda de cada enlace cae en el mismo bloque, forman una cometa con dos cuerdas. Una de las dos celdas del bloque no es el número, así que uno de los extremos libres sí lo es. Se elimina de las celdas que ven ambos extremos.",
            detect: "Elegí un número y buscá una fila con exactamente dos candidatos y una columna con exactamente dos. Si una celda de la fila y una de la columna están en el mismo bloque (sin estar en la misma línea), tenés una cometa. Revisá qué celdas ven los dos extremos.",
            why: "Es una de las cadenas más cortas y comunes. A menudo resuelve el tablero cuando fallan Apuntadores y Caja-Línea.",
            faq: [
              {"q":"¿En qué se diferencia del Skyscraper?","a":"El Skyscraper usa dos enlaces paralelos (dos filas o dos columnas). La cometa usa uno por fila y otro por columna, unidos dentro de un bloque."},
              {"q":"¿Por qué se llama \"de dos cuerdas\"?","a":"Porque son dos enlaces fuertes (cuerdas) de una cometa, una horizontal y una vertical."},
              {"q":"¿Las celdas del bloque pueden estar en la misma fila?","a":"No: si estuvieran en la misma línea la lógica cambia. Tienen que estar en el mismo bloque pero en fila y columna distintas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000000186800094073030000049400109837390840602000030904000070025003000761006500098",
            steps: [
              {"text":"Miremos solo el número 6: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"48":[6],"50":[6],"57":[6],"59":[6]}},
              {"text":"En la fila 2 el 6 solo cabe en F2C2 y F2C4 (enlace fuerte). En la columna 1 solo cabe en F3C1 y F6C1 (otro enlace fuerte). Son las dos \"cuerdas\" de la cometa.","hl":[10,18,12,45],"rel":[9,10,11,12,13,14,15,16,17,0,18,27,36,45,54,63,72],"show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"48":[6],"50":[6],"57":[6],"59":[6]}},
              {"text":"F2C2 y F3C1 están en el mismo bloque (el \"nudo\" de la cometa): no pueden ser 6 los dos a la vez.","hl":[10,18],"src":[12,45],"rel":[0,1,2,9,10,11,18,19,20],"show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"48":[6],"50":[6],"57":[6],"59":[6]}},
              {"text":"Si F2C2 no es 6, F2C4 lo es; si F3C1 no es 6, F6C1 lo es. Como una de las dos no es 6, al menos uno de los extremos F2C4 y F6C1 es 6.","hl":[10,18,12,45],"src":[12,45],"show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"48":[6],"50":[6],"57":[6],"59":[6]}},
              {"text":"Cualquier celda que vea a la vez F2C4 y F6C1 no puede ser 6: la tachamos (1 candidato). Esto es un Two-String Kite (cometa de dos cuerdas).","hl":[10,18,12,45],"src":[12,45],"show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"48":[6],"50":[6],"57":[6],"59":[6]},"strike":{"48":[6]}},
              {"text":"Así quedan los candidatos del 6 tras la cometa, sin haber colocado nada todavía.","hl":[10,18,12,45],"show":{"10":[6],"12":[6],"18":[6],"21":[6],"22":[6],"23":[6],"28":[6],"31":[6],"45":[6],"46":[6],"50":[6],"57":[6],"59":[6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "957000002200750060040020000004070320000002005020000810013247000492586000075090200",
            solution: "957618432238754961146329758564871329781932645329465817813247596492586173675193284",
            notes: "auto",
            goal: {
              text: "Hay una cometa de dos cuerdas en el tablero: tachá (en modo Notas) el número del patrón en las celdas que ven los dos extremos libres.",
              elimSets: [[[36,6]]]
            },
            hint: "Elegí un número y buscá una fila y una columna donde solo tenga dos candidatos cada una, con una celda de cada una en el mismo bloque.",
            hintCells: [80,60,72,42]
          }
        },
        {
          id: "empty-rectangle",
          title: "Empty Rectangle (Rectángulo vacío)",
          short: "Una cruz en un bloque y un enlace fuerte afuera",
          theory: {
            what: "Si en un bloque todos los candidatos de un número están en una fila y una columna (forman una cruz), queda un rectángulo vacío dentro del bloque. Combinado con un enlace fuerte de ese número en otra línea que pasa por la cruz, se puede eliminar un candidato en la intersección de la otra línea con la fila (o columna) de la cruz.",
            detect: "Elegí un bloque y un número cuyos candidatos formen una cruz (una fila y una columna del bloque). Buscá una fila o columna fuera del bloque con solo dos candidatos de ese número, donde uno esté en la línea de la cruz. El otro extremo apunta a la celda a eliminar.",
            why: "Es una de las técnicas más potentes de un solo número. Resuelve situaciones donde Apuntadores y Caja-Línea no encuentran nada.",
            faq: [
              {"q":"¿Por qué se llama \"rectángulo vacío\"?","a":"Porque las celdas del bloque que no están en la cruz quedan libres del número: forman un rectángulo sin candidatos."},
              {"q":"¿Siempre tiene que ser una cruz completa?","a":"No: alcanza con que todos los candidatos estén en una fila y una columna del bloque, aunque falten algunas celdas."},
              {"q":"¿Es una cadena?","a":"Sí, es una X-Chain muy corta: un enlace fuerte, un enlace débil dentro del bloque y otro enlace fuerte."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000900185092080000085000040500000007000000820800093560958670310040100050261000000",
            steps: [
              {"text":"Miremos el bloque central derecho (marcado) y solo el número 4. Mostramos dónde puede ir el 4 dentro del bloque.","rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[4],"44":[4],"53":[4]}},
              {"text":"Todos los 4 del bloque están en la fila 4 o en la columna 9: forman una cruz y dejan un rectángulo vacío (sin 4) dentro del bloque. Es la forma de un Empty Rectangle (rectángulo vacío).","hl":[33,44,53],"rel":[33,34,35,42,43,44,51,52,53],"show":{"33":[4],"44":[4],"53":[4]}},
              {"text":"Ahora buscamos un enlace fuerte del 4 en la fila 7: solo cabe en F7C9 y F7C6. Uno de los dos tiene que ser 4. F7C9 está en la columna 9, la de la cruz.","hl":[62,59],"rel":[54,55,56,57,58,59,60,61,62],"show":{"33":[4],"44":[4],"53":[4],"59":[4],"62":[4]}},
              {"text":"Si F7C9 es 4, la columna 9 del bloque queda sin 4, así que el 4 del bloque está en la fila 4 y F4C6 (en esa línea) no puede serlo. Si F7C9 no es 4, entonces F7C6 sí, y F4C6 lo ve.","hl":[62,59,32],"show":{"32":[4],"33":[4],"44":[4],"53":[4],"59":[4],"62":[4]}},
              {"text":"En los dos casos F4C6 no puede ser 4: lo tachamos. Esto es un Empty Rectangle (rectángulo vacío).","hl":[62,59,32],"show":{"32":[4],"33":[4],"44":[4],"53":[4],"59":[4],"62":[4]},"strike":{"32":[4]}},
              {"text":"Así queda el 4 tras el Empty Rectangle, sin haber colocado nada todavía.","hl":[32],"show":{"33":[4],"44":[4],"53":[4],"59":[4],"62":[4]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000890475480701239907043861000000708700085304048937106872619543391000687004378912",
            solution: "136892475485761239927543861513426798769185324248937156872619543391254687654378912",
            notes: "auto",
            goal: {
              text: "Hay un Empty Rectangle en el tablero: tachá (en modo Notas) el candidato que el patrón descarta.",
              elimSets: [[[29,6]],[[28,2]]]
            },
            hint: "Buscá un bloque donde un número forme una cruz y una fila o columna fuera del bloque con solo dos candidatos. Mirá dónde se cruzan las líneas.",
            hintCells: [0,1,2,11,5,32]
          }
        },
        {
          id: "xy-wing",
          title: "XY-Wing",
          short: "Un pivote con dos alas",
          theory: {
            what: "Son tres celdas con dos candidatos cada una: un pivote XY y dos alas XZ e YZ que lo ven. Sea cual sea el valor del pivote, una de las alas termina siendo Z. Entonces Z se puede eliminar de las celdas que ven a las dos alas.",
            detect: "Buscá una celda con dos candidatos (el pivote, por ejemplo 3-7). Buscá en su fila, columna o bloque dos celdas con dos candidatos: una 3-Z y otra 7-Z, con el mismo Z. Tachá Z de las celdas que ven las dos alas.",
            why: "Es la primera técnica \"de alas\" y una de las más conocidas. Resuelve gran parte de los tableros Difíciles que no cedieron con pares y líneas.",
            faq: [
              {"q":"¿Las alas deben verse entre sí?","a":"No es necesario. Lo importante es que cada ala vea al pivote y que compartan Z."},
              {"q":"¿Por qué siempre hay un Z en las alas?","a":"Porque si el pivote es X, el ala XZ debe ser Z; y si el pivote es Y, el ala YZ debe ser Z."},
              {"q":"¿En qué se diferencia del XYZ-Wing?","a":"El XYZ-Wing tiene un pivote con tres candidatos X, Y y Z, y elimina de las celdas que ven las tres celdas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "200070165710503208850002007507004613300007584100350729470200050905700000600045070",
            steps: [
              {"text":"Miremos tres celdas con pocos candidatos: el pivote F1C6 (8 y 9) y dos alas, F6C6 (6 y 8) y F2C5 (6 y 9). Las dos alas ven al pivote.","hl":[5,50,13],"show":{"5":[8,9],"13":[6,9],"50":[6,8]}},
              {"text":"Fijate en el patrón: el pivote tiene 8-9, un ala tiene 8-6 y la otra 9-6. El 6 aparece en las dos alas pero no en el pivote.","hl":[5,50,13],"show":{"5":[8,9],"13":[6,9],"50":[6,8]},"keep":{"13":[6],"50":[6]}},
              {"text":"Si el pivote es 8, F6C6 (que ve al pivote) no puede ser 8 y tiene que ser 6. Si el pivote es 9, F2C5 no puede ser 9 y tiene que ser 6. El pivote solo puede ser 8 o 9, así que en cualquier caso hay un 6 en F6C6 o en F2C5.","hl":[5,50,13],"show":{"5":[8,9],"13":[6,9],"50":[6,8]},"keep":{"13":[6],"50":[6]}},
              {"text":"Cualquier celda que vea a la vez F6C6 y F2C5 ve un 6 seguro: no puede ser 6. Tachamos 1 candidato. Esto es un XY-Wing.","hl":[5,50,13],"show":{"5":[8,9],"13":[6,9],"40":[6],"50":[6,8]},"keep":{"13":[6],"50":[6]},"strike":{"40":[6]}},
              {"text":"Así quedan los candidatos tras el XY-Wing, sin haber colocado nada todavía.","hl":[5,50,13,40],"show":{"5":[8,9],"13":[6,9],"50":[6,8]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "800000090957283614060000058000047800080000041024800500000308100208471065001960480",
            solution: "812654793957283614463719258539147826786532941124896537645328179298471365371965482",
            notes: "auto",
            goal: {
              text: "Hay un XY-Wing en el tablero: tachá (en modo Notas) el candidato que comparten las dos alas en las celdas que las ven.",
              elimSets: [[[35,3],[42,3],[53,3]]]
            },
            hint: "Buscá una celda con dos candidatos y dos celdas que la vean, con un candidato en común cada una con el pivote y el otro igual entre ellas.",
            hintCells: [61,34,52]
          }
        },
        {
          id: "xyz-wing",
          title: "XYZ-Wing",
          short: "Un pivote de tres candidatos y dos alas",
          theory: {
            what: "Es un XY-Wing donde el pivote tiene tres candidatos (X, Y, Z) y las alas son XZ e YZ. Z está en las tres celdas, y en cualquier caso aparece en el pivote o en una de las alas. Se elimina Z de las celdas que ven a las tres.",
            detect: "Buscá una celda con tres candidatos y dos celdas con dos candidatos que la vean, cuyos candidatos sean subconjuntos del pivote y compartan solo un número (Z). Revisá las celdas que ven las tres: no pueden ser Z.",
            why: "Extiende el XY-Wing a casos con un pivote más cargado. Es más restrictivo (las celdas a eliminar deben ver las tres celdas), pero aparece bastante en tableros Difíciles.",
            faq: [
              {"q":"¿Por qué hay que ver las tres celdas?","a":"Porque Z puede estar en el pivote o en cualquiera de las alas. Solo las celdas que ven a las tres están seguras de ver un Z."},
              {"q":"¿Las celdas a eliminar suelen estar en el mismo bloque?","a":"Sí: como deben ver a las tres, es habitual que sean del bloque donde están las alas y el pivote."},
              {"q":"¿Y si el pivote tuviera cuatro candidatos?","a":"Entonces el razonamiento ya no funciona."}
            ]
          },
          example: {
            mode: "classic",
            grid: "002000004100000003046000010000703400000926031000000090000005128283491675561287349",
            steps: [
              {"text":"Miremos tres celdas: el pivote F2C2 tiene tres candidatos (5, 7, 9) y las alas F5C2 (5 y 7) y F7C2 (7 y 9) lo ven.","hl":[10,37,55],"show":{"10":[5,7,9],"37":[5,7],"55":[7,9]}},
              {"text":"El 7 está en las tres celdas. Cada ala comparte con el pivote su otro candidato.","hl":[10,37,55],"show":{"10":[5,7,9],"37":[5,7],"55":[7,9]},"keep":{"10":[7],"37":[7],"55":[7]}},
              {"text":"Si el pivote es 7, ya hay un 7. Si el pivote es otro de sus números, entonces el ala que lo comparte pierde ese candidato y se queda con 7. En cualquier caso, 7 está en el pivote o en una de las alas.","hl":[10,37,55],"show":{"10":[5,7,9],"37":[5,7],"55":[7,9]},"keep":{"10":[7],"37":[7],"55":[7]}},
              {"text":"Cualquier celda que vea a la vez al pivote y a las dos alas ve un 7 seguro: lo tachamos (2 candidatos). Esto es un XYZ-Wing.","hl":[10,37,55],"show":{"1":[7],"10":[5,7,9],"37":[5,7],"46":[7],"55":[7,9]},"keep":{"10":[7],"37":[7],"55":[7]},"strike":{"1":[7],"46":[7]}},
              {"text":"Así quedan los candidatos tras el XYZ-Wing, sin haber colocado nada todavía.","hl":[10,37,55,1,46],"show":{"10":[5,7,9],"37":[5,7],"55":[7,9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000000000005000430004080002000100240002056013000400576106009704027000300900007100",
            solution: "231594687895762431674381952568173249742956813319428576156839724427615398983247165",
            notes: "auto",
            goal: {
              text: "Hay un XYZ-Wing en el tablero: tachá (en modo Notas) el candidato Z en las celdas que ven el pivote y las dos alas.",
              elimSets: [[[27,8],[28,8]],[[8,8],[17,8]]]
            },
            hint: "Buscá una celda con tres candidatos y dos celdas con dos que la vean y compartan un número en común con ella y entre sí. Ese número no puede estar en las celdas que ven las tres.",
            hintCells: [29,32,35]
          }
        }
      ]
    },
    {
      id: "c5",
      title: "Alas, unicidad y color",
      blurb: "W-Wing, rectángulos únicos, BUG+1 y coloración simple, multi-dígito y pares remotos.",
      lessons: [
        {
          id: "w-wing",
          title: "W-Wing",
          short: "Dos celdas iguales unidas por un enlace fuerte",
          theory: {
            what: "Son dos celdas con los mismos dos candidatos (X e Y) que no se ven entre sí, y un enlace fuerte de Y entre dos celdas, cada una vista por una de las dos celdas iguales. Siempre una de las dos celdas iguales termina siendo X, así que X se elimina de las celdas que ven a ambas.",
            detect: "Buscá dos celdas con el mismo par (por ejemplo 2-8) que no se vean. Buscá una casa donde el 8 solo tenga dos lugares, cada uno visto por una de las dos celdas. Tachá el 2 de las celdas que ven las dos celdas iguales.",
            why: "Es una técnica de cadenas con tres eslabones que se ve fácil si buscás pares iguales. Resuelve tableros Expertos que no ceden con alas simples.",
            faq: [
              {"q":"¿Es lo mismo que un Par desnudo?","a":"No. En un Par desnudo las dos celdas se ven. Acá no se ven y el enlace fuerte las conecta indirectamente."},
              {"q":"¿El enlace fuerte tiene que ser de Y?","a":"Sí: es del número que no se elimina. El número eliminado es el otro del par."},
              {"q":"¿Las celdas del enlace pueden ser las mismas que las alas?","a":"No. Tienen que ser celdas distintas de las dos celdas iguales."}
            ]
          },
          example: {
            mode: "classic",
            grid: "802503761000010825150820439385170000700205318001368500000650180004781053518032000",
            steps: [
              {"text":"Fijate en F1C5 y F7C6: las dos tienen exactamente los mismos candidatos, 4 y 9, y no se ven entre sí.","hl":[4,59],"show":{"4":[4,9],"59":[4,9]}},
              {"text":"Ahora miramos el 9 en la columna 4: solo cabe en F2C4 y F9C4 (enlace fuerte). F1C5 ve a F2C4 y F7C6 ve a F9C4.","hl":[4,59],"src":[12,75],"rel":[3,12,21,30,39,48,57,66,75],"show":{"4":[4,9],"12":[9],"59":[4,9],"75":[9]}},
              {"text":"Si F1C5 fuera 9, F2C4 no podría serlo, así que F9C4 sería 9 y F7C6 (que lo ve) tendría que ser 4. Y si F1C5 no es 9, es 4. En los dos casos, al menos una de las dos alas es 4.","hl":[4,59],"src":[12,75],"show":{"4":[4,9],"12":[9],"59":[4,9],"75":[9]}},
              {"text":"Cualquier celda que vea a la vez F1C5 y F7C6 no puede ser 4: lo tachamos (1 candidato). Esto es un W-Wing.","hl":[4,59],"src":[12,75],"show":{"4":[4,9],"12":[9],"14":[4],"59":[4,9],"75":[9]},"strike":{"14":[4]}},
              {"text":"Así quedan los candidatos tras el W-Wing, sin haber colocado nada todavía.","hl":[4,59,14],"show":{"4":[4,9],"12":[9],"59":[4,9],"75":[9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "873192500192645387050873000000739005030286001900451038340960052000314800000520403",
            solution: "873192564192645387456873129218739645534286971967451238341968752725314896689527413",
            notes: "auto",
            goal: {
              text: "Hay un W-Wing en el tablero: tachá (en modo Notas) el candidato que comparten las dos celdas iguales en las celdas que ven a ambas.",
              elimSets: [[[28,6]],[[24,6],[25,6],[26,6]],[[36,7],[56,7],[65,7],[74,7]]]
            },
            hint: "Buscá dos celdas con el mismo par que no se vean y una casa donde uno de los dos números solo tenga dos lugares, cada uno visto por una de ellas.",
            hintCells: [33,64,51,46]
          }
        },
        {
          id: "ur1",
          title: "Unique Rectangle Tipo 1",
          short: "Tres celdas con un par y una celda con extras",
          theory: {
            what: "Los Rectángulos únicos (Unique Rectangle) se basan en que un Sudoku bien formado tiene una sola solución. Si cuatro celdas en dos bloques y dos filas o columnas pudieran quedar solo con los mismos dos números, el tablero tendría dos soluciones, así que algo en el rectángulo tiene que impedirlo. En el Tipo 1, tres de las cuatro celdas tienen solo los dos números A y B, y la cuarta tiene además otros candidatos. Esa celda no puede ser A ni B.",
            detect: "Buscá cuatro celdas que formen un rectángulo en dos bloques con dos candidatos en común. Si tres tienen exactamente ese par y la cuarta tiene más, tachá el par de la cuarta.",
            why: "Es el tipo más simple y frecuente. Se aplica solo en tableros con solución única, que es el caso de todos los Sudokus bien formados.",
            faq: [
              {"q":"¿Funciona si el tablero tuviera más de una solución?","a":"No. Por eso solo se usa en Sudokus que se sabe que tienen solución única."},
              {"q":"¿Las cuatro celdas deben estar en dos bloques?","a":"Sí. Si estuvieran en cuatro bloques o en uno solo, el patrón no sería un rectángulo mortal."},
              {"q":"¿Cuáles celdas se eliminan?","a":"Solo A y B de la celda con candidatos extra."}
            ]
          },
          example: {
            mode: "classic",
            grid: "210039476703010509094007103100902634932005718406301295001703962309120857027098341",
            steps: [
              {"text":"Miremos el rectángulo de las filas 4 y 6 y columnas 2 y 5: cuatro celdas que ocupan solo dos bloques y que comparten los candidatos 7 y 8.","hl":[28,31,46,49],"rel":[27,28,29,30,31,32,33,34,35,1,10,19,37,46,55,64,73,4,13,22,40,49,58,67,76,45,47,48,50,51,52,53],"show":{"28":[5,7,8],"31":[7,8],"46":[7,8],"49":[7,8]}},
              {"text":"Si las cuatro celdas terminaran siendo solo 7 y 8, se podrían intercambiar todos los 7 por 8 y el Sudoku tendría dos soluciones. Como el tablero tiene una única solución, ese patrón no puede completarse: es un Rectángulo único (Unique Rectangle).","hl":[28,31,46,49],"show":{"28":[5,7,8],"31":[7,8],"46":[7,8],"49":[7,8]},"keep":{"28":[7,8],"31":[7,8],"46":[7,8],"49":[7,8]}},
              {"text":"Tres celdas tienen solo 7-8 y la cuarta, F4C2, tiene además 5. Si F4C2 fuera 7 o 8, el rectángulo quedaría como el patrón prohibido.","hl":[28,31,46,49],"src":[28],"show":{"28":[5,7,8],"31":[7,8],"46":[7,8],"49":[7,8]},"keep":{"28":[7,8],"31":[7,8],"46":[7,8],"49":[7,8]}},
              {"text":"Por eso F4C2 no puede ser 7 ni 8: los tachamos. Es un Unique Rectangle Tipo 1.","hl":[28,31,46,49],"src":[28],"show":{"28":[5,7,8],"31":[7,8],"46":[7,8],"49":[7,8]},"keep":{"28":[7,8],"31":[7,8],"46":[7,8],"49":[7,8]},"strike":{"28":[7,8]}},
              {"text":"Así quedan los candidatos tras el Unique Rectangle, sin haber colocado nada todavía. Además, F4C2 quedó con un solo candidato, el 5 (Único desnudo).","hl":[28,31,46,49],"show":{"28":[5],"31":[7,8],"46":[7,8],"49":[7,8]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "020000089100830065800000037009180653030700812018063974080010726052678301001300508",
            solution: "327456189194837265865291437749182653536749812218563974483915726952678341671324598",
            notes: "auto",
            goal: {
              text: "Hay un Unique Rectangle Tipo 1 en el tablero: tachá (en modo Notas) los dos números del par en la celda con candidatos extra.",
              elimSets: [[[72,4],[72,9]]]
            },
            hint: "Buscá cuatro celdas que formen un rectángulo en dos bloques. Tres con solo los mismos dos candidatos: tachá esos dos de la cuarta.",
            hintCells: [63,70,72,79]
          }
        },
        {
          id: "ur2",
          title: "Unique Rectangle Tipo 2",
          short: "Dos celdas con un extra común",
          theory: {
            what: "Los Rectángulos únicos (Unique Rectangle) se basan en que un Sudoku bien formado tiene una sola solución. Si cuatro celdas en dos bloques y dos filas o columnas pudieran quedar solo con los mismos dos números, el tablero tendría dos soluciones, así que algo en el rectángulo tiene que impedirlo. En el Tipo 2, dos celdas (el suelo) tienen solo A y B, y las otras dos (el techo) tienen A, B y el mismo candidato extra X. Al menos uno de los techos es X, así que X se elimina de las celdas que ven a los dos techos.",
            detect: "Buscá un rectángulo en dos bloques con dos celdas con solo el par A-B y otras dos con A-B-X (el mismo X). Tachá X de las celdas que ven los dos techos.",
            why: "Es muy útil porque elimina un candidato a distancia sin necesidad de cadenas. Aparece mucho en tableros Difíciles.",
            faq: [
              {"q":"¿Los techos deben estar en la misma línea?","a":"Sí. Comparten fila o columna, y por eso las celdas a eliminar suelen estar en esa línea."},
              {"q":"¿Qué pasa si los extras son distintos?","a":"Entonces es un Tipo 3 o un Tipo 4, según los candidatos."},
              {"q":"¿Se puede eliminar A o B?","a":"No en este tipo: solo se elimina el candidato extra X."}
            ]
          },
          example: {
            mode: "classic",
            grid: "039140876416090352007000491105374000072050143040010000700420010091000004004081630",
            steps: [
              {"text":"Miremos el rectángulo de las filas 3 y 9 y columnas 1 y 2: cuatro celdas que ocupan solo dos bloques y que comparten los candidatos 2 y 5.","hl":[18,19,72,73],"rel":[18,19,20,21,22,23,24,25,26,0,9,27,36,45,54,63,72,1,10,28,37,46,55,64,73,74,75,76,77,78,79,80],"show":{"18":[2,5,8],"19":[2,5,8],"72":[2,5],"73":[2,5]}},
              {"text":"Si las cuatro celdas terminaran siendo solo 2 y 5, se podrían intercambiar todos los 2 por 5 y el Sudoku tendría dos soluciones. Como el tablero tiene una única solución, ese patrón no puede completarse: es un Rectángulo único (Unique Rectangle).","hl":[18,19,72,73],"show":{"18":[2,5,8],"19":[2,5,8],"72":[2,5],"73":[2,5]},"keep":{"18":[2,5],"19":[2,5],"72":[2,5],"73":[2,5]}},
              {"text":"Las celdas F9C1 y F9C2 (el suelo) tienen solo 2-5. Las otras dos (el techo), F3C1 y F3C2, tienen ambas el mismo candidato extra, el 8.","hl":[18,19,72,73],"src":[18,19],"show":{"18":[2,5,8],"19":[2,5,8],"72":[2,5],"73":[2,5]},"keep":{"18":[2,5],"19":[2,5],"72":[2,5],"73":[2,5]}},
              {"text":"Si ninguno de los dos techos fuera 8, serían solo 2 y 5 y se formaría el patrón prohibido. Entonces al menos uno de los techos es 8.","hl":[18,19,72,73],"src":[18,19],"show":{"18":[2,5,8],"19":[2,5,8],"72":[2,5],"73":[2,5]},"keep":{"18":[2,5],"19":[2,5],"72":[2,5],"73":[2,5]}},
              {"text":"Cualquier celda que vea a la vez los dos techos ve un 8 seguro: lo tachamos (2 candidatos). Es un Unique Rectangle Tipo 2.","hl":[18,19,72,73],"src":[18,19],"show":{"18":[2,5,8],"19":[2,5,8],"21":[8],"23":[8],"72":[2,5],"73":[2,5]},"keep":{"18":[2,5],"19":[2,5],"72":[2,5],"73":[2,5]},"strike":{"21":[8],"23":[8]}},
              {"text":"Así quedan los candidatos tras el Unique Rectangle, sin haber colocado nada todavía.","hl":[18,19,72,73,21,23],"show":{"18":[2,5,8],"19":[2,5,8],"72":[2,5],"73":[2,5]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "506814020300506418418000605264185090759463182831002564100650040640000051905041006",
            solution: "576814923392576418418329675264185397759463182831792564123657849647938251985241736",
            notes: "auto",
            goal: {
              text: "Hay un Unique Rectangle Tipo 2 en el tablero: tachá (en modo Notas) el candidato extra en las celdas que ven los dos techos.",
              elimSets: [[[1,9]]]
            },
            hint: "Buscá un rectángulo en dos bloques con dos celdas con solo el par y otras dos con el par más el mismo candidato extra.",
            hintCells: [6,8,33,35]
          }
        },
        {
          id: "ur3",
          title: "Unique Rectangle Tipo 3",
          short: "El techo actúa como una celda virtual",
          theory: {
            what: "Los Rectángulos únicos (Unique Rectangle) se basan en que un Sudoku bien formado tiene una sola solución. Si cuatro celdas en dos bloques y dos filas o columnas pudieran quedar solo con los mismos dos números, el tablero tendría dos soluciones, así que algo en el rectángulo tiene que impedirlo. En el Tipo 3, el suelo tiene solo A y B y los techos tienen candidatos extra distintos. Esos extras se comportan como una celda virtual que forma un par desnudo con otra celda de la casa.",
            detect: "Buscá un rectángulo con dos celdas con el par y dos con extras (por ejemplo X e Y). Si en la casa de los techos hay otra celda con exactamente X e Y, tachá X e Y del resto de esa casa.",
            why: "Combina el rectángulo con la idea del Par desnudo. Resuelve tableros Expertos que no ceden con técnicas más básicas.",
            faq: [
              {"q":"¿Por qué la celda virtual?","a":"Porque al menos un techo tiene que ser un extra, y los dos juntos solo pueden usar X e Y, igual que una sola celda con esos dos candidatos."},
              {"q":"¿Se puede hacer con tres extras?","a":"Sí, con tríos virtuales, pero es mucho más raro."},
              {"q":"¿Dónde se eliminan los candidatos?","a":"En la casa que comparten los techos (fila, columna o bloque), en las celdas que no son parte del patrón."}
            ]
          },
          example: {
            mode: "classic",
            grid: "758020600000500728024687050067258030002306507500070206279800365810905472045702819",
            steps: [
              {"text":"Miremos el rectángulo de las filas 2 y 7 y columnas 5 y 6: cuatro celdas que ocupan solo dos bloques y que comparten los candidatos 1 y 4.","hl":[13,14,58,59],"rel":[9,10,11,12,13,14,15,16,17,4,22,31,40,49,58,67,76,5,23,32,41,50,59,68,77,54,55,56,57,60,61,62],"show":{"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]}},
              {"text":"Si las cuatro celdas terminaran siendo solo 1 y 4, se podrían intercambiar todos los 1 por 4 y el Sudoku tendría dos soluciones. Como el tablero tiene una única solución, ese patrón no puede completarse: es un Rectángulo único (Unique Rectangle).","hl":[13,14,58,59],"show":{"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]},"keep":{"13":[1,4],"14":[1,4],"58":[1,4],"59":[1,4]}},
              {"text":"Las celdas F7C5 y F7C6 (el suelo) tienen solo 1-4. En el techo, F2C5 y F2C6, los candidatos extra son 3 y 9.","hl":[13,14,58,59],"src":[13,14],"show":{"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]},"keep":{"13":[1,4],"14":[1,4],"58":[1,4],"59":[1,4]}},
              {"text":"Al menos uno de los techos tiene que ser uno de esos extras (si no, se formaría el patrón prohibido). Es como si el techo fuera una sola celda con los candidatos 3 y 9. Y F2C2, que está en la fila 2, tiene exactamente 3 y 9.","hl":[13,14,10],"show":{"10":[3,9],"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]},"keep":{"13":[1,4],"14":[1,4],"58":[1,4],"59":[1,4]}},
              {"text":"Ese \"techo virtual\" y F2C2 forman un par desnudo: 3 y 9 quedan reservados para ellos en la fila 2. Tachamos esos números del resto de la casa (3 candidatos). Es un Unique Rectangle Tipo 3.","hl":[13,14,10],"show":{"9":[3,9],"10":[3,9],"11":[3],"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]},"keep":{"13":[1,4],"14":[1,4],"58":[1,4],"59":[1,4]},"strike":{"9":[3,9],"11":[3]}},
              {"text":"Así quedan los candidatos tras el Unique Rectangle, sin haber colocado nada todavía.","hl":[13,14,58,59,9,11],"show":{"13":[1,3,4,9],"14":[1,3,4,9],"58":[1,4],"59":[1,4]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "180040300307801240402036801641008739729613584538479612214367958003004107070100403",
            solution: "185742396367891245492536871641258739729613584538479612214367958853924167976185423",
            notes: "auto",
            goal: {
              text: "Hay un Unique Rectangle Tipo 3 en el tablero: tachá (en modo Notas) los candidatos del par virtual en el resto de la casa.",
              elimSets: [[[64,9]],[[13,5]],[[66,2],[66,5]]]
            },
            hint: "Buscá un rectángulo con dos techos con candidatos extra distintos y una celda en su casa con exactamente esos extras.",
            hintCells: [30,31,66,67]
          }
        },
        {
          id: "ur4",
          title: "Unique Rectangle Tipo 4",
          short: "Un enlace fuerte en el techo",
          theory: {
            what: "Los Rectángulos únicos (Unique Rectangle) se basan en que un Sudoku bien formado tiene una sola solución. Si cuatro celdas en dos bloques y dos filas o columnas pudieran quedar solo con los mismos dos números, el tablero tendría dos soluciones, así que algo en el rectángulo tiene que impedirlo. En el Tipo 4, el suelo tiene solo A y B y los techos tienen extras. Si en la casa de los techos el número A solo puede ir en esos dos techos, uno de ellos es A y el otro no puede ser B (si no, se formaría el patrón mortal). Se elimina B de ambos techos.",
            detect: "Buscá un rectángulo con dos celdas con el par y dos con extras. Si en la casa de los techos el número A (o B) solo tiene esas dos celdas, tachá el otro número del par en los dos techos.",
            why: "Convierte el enlace fuerte del rectángulo en una eliminación directa. Es de las variantes más potentes y limpia dos candidatos de una vez.",
            faq: [
              {"q":"¿Cuál de los dos números se elimina?","a":"El que no tiene enlace fuerte en la casa. Si el A solo cabe en los techos, se elimina B de ellos."},
              {"q":"¿Los techos deben tener otros candidatos?","a":"Sí, si no serían un par puro y el patrón no sería un Tipo 4."},
              {"q":"¿Se puede hacer con filas y columnas?","a":"Sí: la casa de los techos puede ser fila, columna o bloque."}
            ]
          },
          example: {
            mode: "classic",
            grid: "382691457179485200000732189037008001001073800800100700753820014698314572214007308",
            steps: [
              {"text":"Miremos el rectángulo de las filas 2 y 6 y columnas 8 y 9: cuatro celdas que ocupan solo dos bloques y que comparten los candidatos 3 y 6.","hl":[16,17,52,53],"rel":[9,10,11,12,13,14,15,16,17,7,25,34,43,52,61,70,79,8,26,35,44,53,62,71,80,45,46,47,48,49,50,51],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,6,9],"53":[3,5,6]}},
              {"text":"Si las cuatro celdas terminaran siendo solo 3 y 6, se podrían intercambiar todos los 3 por 6 y el Sudoku tendría dos soluciones. Como el tablero tiene una única solución, ese patrón no puede completarse: es un Rectángulo único (Unique Rectangle).","hl":[16,17,52,53],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,6,9],"53":[3,5,6]},"keep":{"16":[3,6],"17":[3,6],"52":[3,6],"53":[3,6]}},
              {"text":"Las celdas F2C8 y F2C9 (el suelo) tienen solo 3-6. El techo, F6C8 y F6C9, tiene candidatos extra, y comparte la fila 6.","hl":[16,17,52,53],"src":[52,53],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,6,9],"53":[3,5,6]},"keep":{"16":[3,6],"17":[3,6],"52":[3,6],"53":[3,6]}},
              {"text":"En la fila 6 el 3 solo puede ir en esas dos celdas del techo (enlace fuerte): una de las dos es 3. Si la otra fuera 6, se formaría el patrón prohibido.","hl":[52,53],"rel":[45,46,47,48,49,50,51,52,53],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,6,9],"53":[3,5,6]},"keep":{"52":[3],"53":[3]}},
              {"text":"Por eso ninguno de los dos techos puede ser 6: lo tachamos de ambos. Es un Unique Rectangle Tipo 4.","hl":[52,53],"src":[16,17],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,6,9],"53":[3,5,6]},"keep":{"16":[3,6],"17":[3,6],"52":[3,6],"53":[3,6]},"strike":{"52":[6],"53":[6]}},
              {"text":"Así quedan los candidatos tras el Unique Rectangle, sin haber colocado nada todavía.","hl":[16,17,52,53],"show":{"16":[3,6],"17":[3,6],"52":[2,3,4,9],"53":[3,5]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "046003952000950004005240008000004000004509830007000049218465793459730006003092405",
            solution: "746813952821956374395247618982374561164529837537681249218465793459738126673192485",
            notes: "auto",
            goal: {
              text: "Hay un Unique Rectangle Tipo 4 en el tablero: tachá (en modo Notas) el número del par que el techo no puede tener.",
              elimSets: [[[31,1],[40,1]]]
            },
            hint: "Buscá un rectángulo con dos celdas con el par y dos con extras. Fijate si uno de los dos números del par solo cabe en los techos de su casa.",
            hintCells: [31,35,40,44]
          }
        },
        {
          id: "bug1",
          title: "BUG+1 (Bivalue Universal Grave +1)",
          short: "Todas las celdas con dos candidatos menos una",
          theory: {
            what: "Si todas las celdas vacías tuvieran exactamente dos candidatos y cada número apareciera dos veces en cada casa, el tablero tendría varias soluciones. Si todas lo cumplen menos una celda con tres candidatos, esa celda tiene que ser el candidato que aparece tres veces en su fila, columna y bloque.",
            detect: "Revisá si todas las celdas vacías tienen exactamente dos candidatos salvo una con tres. En esa celda, contá cuántas veces aparece cada candidato en su fila, columna y bloque: el que aparece tres veces es la respuesta.",
            why: "Es una técnica de final de partida que resuelve la última celda problemática. No se usa para avanzar, sino para terminar tableros muy difíciles.",
            faq: [
              {"q":"¿Qué es un BUG?","a":"Es un estado donde todas las celdas tienen dos candidatos y cada número aparece exactamente dos veces en cada casa. Siempre tiene al menos dos soluciones."},
              {"q":"¿Por qué la celda tiene que ser el número que aparece tres veces?","a":"Para romper el patrón: es el candidato que \"sobra\" y, si no fuera verdadero, el tablero caería en el BUG."},
              {"q":"¿Puedo usarla en cualquier tablero?","a":"Solo cuando el tablero tiene solución única y está casi todo con dos candidatos, es decir, en la recta final de un tablero Experto."}
            ]
          },
          example: {
            mode: "classic",
            grid: "138090070047312500020784013400278139200030745379041002014007390700450021800103450",
            steps: [
              {"text":"Mirá las celdas vacías: todas tienen exactamente dos candidatos, salvo F3C1, que tiene tres (5, 6, 9).","hl":[18],"show":{"3":[5,6],"5":[5,6],"6":[2,6],"8":[4,6],"9":[6,9],"16":[6,8],"17":[6,8],"18":[5,6,9],"20":[5,6],"24":[6,9],"28":[5,6],"29":[5,6],"37":[6,8],"38":[1,6],"39":[6,9],"41":[6,9],"48":[5,6],"51":[6,8],"52":[6,8],"54":[5,6],"57":[6,8],"58":[2,6],"62":[6,8],"64":[6,9],"65":[3,6],"68":[6,9],"69":[6,8],"73":[6,9],"74":[2,6],"76":[2,6],"80":[6,7]}},
              {"text":"Si F3C1 también tuviera solo dos candidatos, todas las celdas serían bivalor: cada número aparecería exactamente dos veces en cada fila, columna y bloque. Ese tablero es un BUG (Bivalue Universal Grave) y siempre tiene dos o más soluciones. Un Sudoku bien formado tiene una sola, así que el tablero no puede quedar en ese estado.","hl":[18],"show":{"3":[5,6],"5":[5,6],"6":[2,6],"8":[4,6],"9":[6,9],"16":[6,8],"17":[6,8],"18":[5,6,9],"20":[5,6],"24":[6,9],"28":[5,6],"29":[5,6],"37":[6,8],"38":[1,6],"39":[6,9],"41":[6,9],"48":[5,6],"51":[6,8],"52":[6,8],"54":[5,6],"57":[6,8],"58":[2,6],"62":[6,8],"64":[6,9],"65":[3,6],"68":[6,9],"69":[6,8],"73":[6,9],"74":[2,6],"76":[2,6],"80":[6,7]}},
              {"text":"Contemos cuántas veces aparece cada candidato de F3C1 en su fila, columna y bloque. El 6 aparece 3 veces en las tres casas (la fila 3: 3 veces; la columna 1: 3 veces; el bloque superior izquierdo: 3 veces), mientras que los otros dos candidatos aparecen 2. Marcamos las celdas con 6.","hl":[18],"rel":[18,19,20,21,22,23,24,25,26,0,9,27,36,45,54,63,72,1,2,10,11],"same":[18,20,24,9,54],"show":{"3":[5,6],"5":[5,6],"6":[2,6],"8":[4,6],"9":[6,9],"16":[6,8],"17":[6,8],"18":[5,6,9],"20":[5,6],"24":[6,9],"28":[5,6],"29":[5,6],"37":[6,8],"38":[1,6],"39":[6,9],"41":[6,9],"48":[5,6],"51":[6,8],"52":[6,8],"54":[5,6],"57":[6,8],"58":[2,6],"62":[6,8],"64":[6,9],"65":[3,6],"68":[6,9],"69":[6,8],"73":[6,9],"74":[2,6],"76":[2,6],"80":[6,7]}},
              {"text":"Para evitar el BUG, el candidato \"de más\" tiene que ser verdadero: F3C1 es 6. Eso es BUG+1.","hl":[18],"rel":[18,19,20,21,22,23,24,25,26,0,9,27,36,45,54,63,72,1,2,10,11],"same":[18,20,24,9,54],"show":{"3":[5,6],"5":[5,6],"6":[2,6],"8":[4,6],"9":[6,9],"16":[6,8],"17":[6,8],"18":[5,6,9],"20":[5,6],"24":[6,9],"28":[5,6],"29":[5,6],"37":[6,8],"38":[1,6],"39":[6,9],"41":[6,9],"48":[5,6],"51":[6,8],"52":[6,8],"54":[5,6],"57":[6,8],"58":[2,6],"62":[6,8],"64":[6,9],"65":[3,6],"68":[6,9],"69":[6,8],"73":[6,9],"74":[2,6],"76":[2,6],"80":[6,7]},"keep":{"18":[6]}},
              {"text":"Colocamos el 6 en F3C1.","hl":[18],"place":{"18":6}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "750601320960230150201075600072056093346020071095307200507460900600510034013702060",
            solution: "754681329968234157231975648872156493346829571195347286587463912629518734413792865",
            notes: "auto",
            goal: {
              text: "Hay un BUG+1 en el tablero: encontrá la celda con tres candidatos y colocá el número que aparece tres veces en su fila, columna y bloque.",
              place: [[4,8]]
            },
            hint: "Buscá la única celda con tres candidatos y contá cuántas veces aparece cada uno de ellos en su fila, columna y bloque. El que aparece tres veces es el que va.",
            hintCells: [4]
          }
        },
        {
          id: "simple-coloring",
          title: "Coloración simple (Simple Coloring)",
          short: "Dos colores para los enlaces fuertes de un número",
          theory: {
            what: "Se colorea con dos colores alternados una cadena de enlaces fuertes de un solo número: en cada enlace, una celda es el número y la otra no. Por eso o todas las celdas de un color son el número, o lo son todas las del otro. Regla 2: si dos celdas del mismo color se ven, ese color es falso. Regla 4: una celda que ve a los dos colores no puede ser el número.",
            detect: "Elegí un número y marcá los enlaces fuertes (casas con solo dos candidatos). Coloreá cada cadena alternando A y B. Buscá dos celdas del mismo color que se vean (Regla 2) o una celda que vea una de cada color (Regla 4).",
            why: "Es la puerta a las técnicas de colores. Resuelve muchos tableros Expertos y es la base de la 3D Medusa y las cadenas AIC.",
            faq: [
              {"q":"¿Qué hago si dos colores aparecen en la misma casa?","a":"Si dos celdas del mismo color se ven, ese color es falso y se puede eliminar todo. Es la Regla 2 (color repetido)."},
              {"q":"¿Cuál es la diferencia entre las reglas?","a":"La Regla 2 elimina un color completo cuando se contradice. La Regla 4 (trampa) elimina el candidato de una celda que ve a los dos colores."},
              {"q":"¿Con cuántos números se puede aplicar?","a":"Con uno solo a la vez. Para varios números juntos se usa la 3D Medusa."}
            ]
          },
          example: {
            mode: "classic",
            grid: "190060005754001096602905104900600321006003947307009568201096403069000712400100609",
            steps: [
              {"text":"Miremos solo el número 3: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"2":[3],"3":[3],"7":[3],"12":[3],"13":[3],"19":[3],"22":[3],"25":[3],"66":[3],"67":[3],"73":[3],"74":[3],"76":[3]}},
              {"text":"Buscamos enlaces fuertes (casas donde el 3 tiene solo dos lugares): F3C2–F9C2 (columna 2), F1C3–F9C3 (columna 3), F1C3–F3C2 (bloque superior izquierdo), F9C2–F9C3 (bloque inferior izquierdo). En cada uno, una de las dos celdas es 3 y la otra no. Los enlaces forman una cadena conectada.","hl":[19,74,73,2],"show":{"2":[3],"3":[3],"7":[3],"12":[3],"13":[3],"19":[3],"22":[3],"25":[3],"66":[3],"67":[3],"73":[3],"74":[3],"76":[3]}},
              {"text":"Coloreamos la cadena alternando: color A (borde grueso) para F3C2 y F9C3 y color B (fondo sombreado) para F9C2 y F1C3. En cada enlace una celda es A y la otra B, así que o todas las A son 3 o todas las B lo son.","hl":[19,74],"same":[73,2],"show":{"2":[3],"3":[3],"7":[3],"12":[3],"13":[3],"19":[3],"22":[3],"25":[3],"66":[3],"67":[3],"73":[3],"74":[3],"76":[3]}},
              {"text":"Regla 4 (trampa de color): F9C5 ve a la vez una celda A y una celda B. Sea cual sea el color verdadero, esa celda ve un 3 verdadero: no puede ser 3. La tachamos (1 candidato).","hl":[19,74],"same":[73,2],"src":[76],"show":{"2":[3],"3":[3],"7":[3],"12":[3],"13":[3],"19":[3],"22":[3],"25":[3],"66":[3],"67":[3],"73":[3],"74":[3],"76":[3]},"strike":{"76":[3]}},
              {"text":"Así quedan los candidatos del 3 tras la coloración, sin haber colocado nada todavía. La Regla 2 funciona al revés: si dos celdas del mismo color se ven, ese color completo es falso.","hl":[19,74,73,2],"show":{"2":[3],"3":[3],"7":[3],"12":[3],"13":[3],"19":[3],"22":[3],"25":[3],"66":[3],"67":[3],"73":[3],"74":[3]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "609271038000894000008635009276148953001903607003060010000010000005406001004300200",
            solution: "659271438317894562428635179276148953841953627593762814782519346935426781164387295",
            notes: "auto",
            goal: {
              text: "Hay una Coloración simple en el tablero: tachá (en modo Notas) el candidato que descarta la Regla 2 o la Regla 4.",
              elimSets: [[[10,2]]]
            },
            hint: "Elegí un número, marcá sus enlaces fuertes y coloreá la cadena. Buscá una celda que vea a los dos colores, o dos celdas del mismo color que se vean.",
            hintCells: [40,53,64,59,43,67,50,17]
          }
        },
        {
          id: "medusa",
          title: "Coloración multi-dígito (3D Medusa)",
          short: "Colores que saltan de un número a otro",
          theory: {
            what: "Es la coloración simple extendida a todos los números a la vez. Los enlaces fuertes son tanto los de un número en una casa como los de una celda con solo dos candidatos. Se colorean candidatos (celda y número) alternando. Se elimina un candidato que ve a los dos colores, o todo un color que se contradice.",
            detect: "Armá una cadena de enlaces fuertes pasando de un número a otro dentro de las celdas con dos candidatos. Coloreá alternando A y B. Buscá candidatos que vean a ambos colores o dos candidatos del mismo color que se contradigan.",
            why: "Es una de las técnicas más generales y potentes: incluye como casos particulares a la coloración simple y a varias cadenas. Resuelve muchos tableros extremos.",
            faq: [
              {"q":"¿En qué se diferencia de la coloración simple?","a":"La coloración simple usa un solo número. La 3D Medusa colorea candidatos de varios números, y puede saltar entre ellos en las celdas bivalor."},
              {"q":"¿Cuándo un candidato \"ve\" a otro?","a":"Cuando están en la misma celda (números distintos) o son el mismo número en celdas que se ven."},
              {"q":"¿Es una cadena AIC?","a":"Es una generalización: una cadena AIC es un caso en el que solo usás un camino y una conclusión."}
            ]
          },
          example: {
            mode: "classic",
            grid: "001080000000100006090000817000804750000371400478500000300052000007618230060043000",
            steps: [
              {"text":"Esta técnica colorea candidatos de varios números a la vez. Los enlaces fuertes son dos: una celda con solo dos candidatos (uno es verdadero y el otro falso) y un número con solo dos lugares en una casa. Mostramos los candidatos de la cadena.","hl":[57,75,79,57,61,75],"show":{"57":[7,9],"61":[7],"75":[7,9],"79":[7]}},
              {"text":"Coloreamos alternando. Color A (borde grueso): 7 en F7C4, 9 en F9C4 y 7 en F9C8. Color B (fondo sombreado): 9 en F7C4, 7 en F7C8 y 7 en F9C4. O todos los candidatos A son verdaderos o lo son todos los B.","hl":[57,75,79],"same":[57,61,75],"show":{"57":[7,9],"61":[7],"75":[7,9],"79":[7]}},
              {"text":"Fijate en el 7 de F1C4, el 9 de F1C4: esos candidatos \"ven\" (misma celda o mismo número en la misma casa) un candidato de color A y uno de color B. Como uno de los dos colores es verdadero, esos candidatos quedan descartados. Los tachamos (2 candidatos).","hl":[57,75,79],"same":[57,61,75],"src":[3],"show":{"3":[7,9],"57":[7,9],"61":[7],"75":[7,9],"79":[7]},"strike":{"3":[7,9]}},
              {"text":"Así quedan los candidatos tras la 3D Medusa, sin haber colocado nada todavía.","hl":[57,75,79,61,3],"show":{"57":[7,9],"61":[7],"75":[7,9],"79":[7]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "302000841094000300001430005400000000019040523000003409008070100040125000160090000",
            solution: "352967841694581372871432965435219786719648523286753419528376194947125638163894257",
            notes: "auto",
            goal: {
              text: "Hay una 3D Medusa en el tablero: tachá (en modo Notas) un candidato que ve a los dos colores o que pertenece a un color contradictorio.",
              elimSets: [[[61,6]],[[62,6]],[[79,8]],[[80,8]],[[62,2]]]
            },
            hint: "Coloreá una cadena de enlaces fuertes pasando por celdas con dos candidatos. Buscá un candidato que vea a los dos colores.",
            hintCells: [78,23,17,80,24]
          }
        },
        {
          id: "remote-pairs",
          title: "Pares remotos (Remote Pairs)",
          short: "Una cadena de celdas con el mismo par",
          theory: {
            what: "Es una cadena de celdas con exactamente los mismos dos candidatos, cada una viendo a la siguiente. Los valores se alternan a lo largo de la cadena. Una celda que ve a dos celdas de distinto color ve a la vez los dos números, así que no puede ser ninguno.",
            detect: "Buscá celdas con el mismo par (por ejemplo 4-9) y seguí la cadena de celdas que se ven. Coloreá A y B alternando. Una celda fuera de la cadena que vea una A y una B no puede ser ni 4 ni 9.",
            why: "Es una cadena especial: usa solo un par y se ve a simple vista cuando hay muchos pares iguales. Ahorra mirar candidatos de uno en uno.",
            faq: [
              {"q":"¿Cuántas celdas hacen falta?","a":"Al menos cuatro, con colores alternados en los extremos. Con tres, los dos extremos tienen el mismo color y no se elimina nada."},
              {"q":"¿Todas las celdas deben verse entre sí?","a":"No: cada una ve a la siguiente, formando una cadena."},
              {"q":"¿Es una XY-Chain?","a":"Sí, un caso particular donde todas las celdas tienen el mismo par."}
            ]
          },
          example: {
            mode: "classic",
            grid: "485136792000789504709245810973412658614598327258673941507804109890301475040957280",
            steps: [
              {"text":"Fijate en estas 5 celdas: todas tienen exactamente los mismos dos candidatos, 3 y 6, y forman una cadena (cada una ve a alguna otra de ellas): F2C8, F3C9, F7C8, F3C2 y F9C9.","hl":[16,19,80,26,61],"show":{"16":[3,6],"19":[3,6],"26":[3,6],"61":[3,6],"80":[3,6]}},
              {"text":"Dos celdas que se ven y tienen el mismo par 3-6 tienen que ser una 3 y la otra 6. Por eso en la cadena los valores se alternan. Coloreamos: color A (borde grueso) F2C8, F3C2 y F9C9 y color B (fondo sombreado) F3C9 y F7C8. Todavía no sabemos cuál color es 3 y cuál 6.","hl":[16,19,80],"same":[26,61],"show":{"16":[3,6],"19":[3,6],"26":[3,6],"61":[3,6],"80":[3,6]}},
              {"text":"Una celda que vea a la vez una A y una B ve un 3 y un 6 seguros: no puede ser ninguno de los dos. Tachamos 2 candidatos: el 3 de F7C2 y el 6 de F7C2.","hl":[16,19,80],"same":[26,61],"src":[55],"show":{"16":[3,6],"19":[3,6],"26":[3,6],"55":[3,6],"61":[3,6],"80":[3,6]},"strike":{"55":[3,6]}},
              {"text":"Así quedan los candidatos tras los Pares remotos (Remote Pairs), sin haber colocado nada todavía. Además, F7C2 quedó con un solo candidato, el 2 (Único desnudo).","hl":[16,19,80,26,61],"show":{"16":[3,6],"19":[3,6],"26":[3,6],"61":[3,6],"80":[3,6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "631040005724305690598007300000400002407001063102003500270004056045006200816502409",
            solution: "631849725724315698598627341953468172487251963162793584279134856345986217816572439",
            notes: "auto",
            goal: {
              text: "Hay Pares remotos en el tablero: tachá (en modo Notas) los dos números del par en las celdas que ven a dos celdas de la cadena con colores distintos.",
              elimSets: [[[31,9]],[[32,9]],[[33,9]]]
            },
            hint: "Buscá varias celdas con el mismo par encadenadas y mirá qué celda ve a dos de ellas en posiciones de distinta paridad.",
            hintCells: [27,56,29,63]
          }
        }
      ]
    },
    {
      id: "c6",
      title: "Cadenas y maestría",
      blurb: "Peces con aleta, Sue de Coq y cadenas hasta la deducción forzada.",
      lessons: [
        {
          id: "finned-xwing",
          title: "Finned X-Wing",
          short: "Un X-Wing con una celda de más",
          theory: {
            what: "Es un X-Wing al que le sobra una celda (la aleta o fin) en el mismo bloque que una esquina. Si la aleta no es el número, queda un X-Wing completo; si lo es, elimina el número de su bloque. En los dos casos, las celdas de las columnas del patrón dentro del bloque de la aleta no pueden ser el número.",
            detect: "Buscá un X-Wing \"casi\" completo: dos filas con el número casi solo en dos columnas. Si sobra una celda extra (la aleta) en el mismo bloque que una esquina, tachá el número en las celdas de la columna del patrón dentro de ese bloque.",
            why: "Hace falta cuando el X-Wing perfecto no aparece. Amplía el patrón: el que no cumple por una sola celda también sirve.",
            faq: [
              {"q":"¿Dónde tiene que estar la aleta?","a":"En el mismo bloque que una de las esquinas del X-Wing, en una de las dos filas base."},
              {"q":"¿Y si la aleta es el número?","a":"Entonces ese número elimina el candidato de las celdas que ve en su bloque, que coinciden con las que elimina el patrón."},
              {"q":"¿Qué celdas se eliminan?","a":"Solo las celdas de las columnas del patrón que están dentro del bloque de la aleta."}
            ]
          },
          example: {
            mode: "classic",
            grid: "178624000934500276256397148423009000617253489589040020362975814805002037701030002",
            steps: [
              {"text":"Miremos solo el número 6: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"31":[6],"33":[6],"34":[6],"50":[6],"51":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]}},
              {"text":"Las filas 4 y 8 casi forman un X-Wing: casi todos sus 6 caen en las columnas 5 y 7 (bordes gruesos en las celdas del patrón). Pero sobra la aleta (fin) F4C8, fuera de esas columnas (con borde de color).","hl":[31,33,67,69],"src":[34],"rel":[27,28,29,30,31,32,33,34,35,63,64,65,66,67,68,69,70,71],"show":{"31":[6],"33":[6],"34":[6],"50":[6],"51":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]}},
              {"text":"Caso 1: si la aleta no es 6, queda un X-Wing completo y normal. Los 6 de las dos filas ocupan las dos columnas, así que ningún otro 6 de esas columnas puede existir.","hl":[31,33,67,69],"rel":[4,13,22,31,40,49,58,67,76,6,15,24,33,42,51,60,69,78],"show":{"31":[6],"33":[6],"34":[6],"50":[6],"51":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]}},
              {"text":"Caso 2: si la aleta es 6, ese 6 elimina el 6 de todo el bloque central derecho (la aleta está ahí). Las celdas de esas columnas que están en el bloque central derecho tampoco pueden ser 6.","hl":[34],"rel":[33,34,35,42,43,44,51,52,53],"show":{"31":[6],"33":[6],"34":[6],"50":[6],"51":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]}},
              {"text":"Los dos casos coinciden en algo: las celdas marcadas en rojo (1 candidato) no pueden ser 6. Esta técnica es un Finned X-Wing.","hl":[31,33,67,69,34],"rel":[4,13,22,31,40,49,58,67,76,6,15,24,33,42,51,60,69,78],"show":{"31":[6],"33":[6],"34":[6],"50":[6],"51":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]},"strike":{"51":[6]}},
              {"text":"Así quedan los candidatos del 6 tras eliminar, sin haber colocado nada todavía.","hl":[31,33,67,69,34],"rel":[27,28,29,30,31,32,33,34,35,63,64,65,66,67,68,69,70,71],"show":{"31":[6],"33":[6],"34":[6],"50":[6],"67":[6],"69":[6],"77":[6],"78":[6],"79":[6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "040061508500200609860075124407002016100000002920000453600020300000030060300506040",
            solution: "742961538513248679869375124437852916156493782928617453685724391274139865391586247",
            notes: "auto",
            goal: {
              text: "Hay un Finned X-Wing en el tablero: tachá (en modo Notas) el número en las celdas de las columnas del patrón dentro del bloque de la aleta.",
              elimSets: [[[38,3]],[[10,3]],[[57,9]]]
            },
            hint: "Buscá dos filas donde un número casi solo pueda ir en dos columnas, con una celda extra en el mismo bloque que una esquina.",
            hintCells: [10,28,37,14,41]
          }
        },
        {
          id: "sashimi-xwing",
          title: "Sashimi X-Wing",
          short: "Un X-Wing al que le falta una esquina",
          theory: {
            what: "Es un Finned X-Wing en el que a una de las dos filas le falta una esquina: solo tiene una celda en las columnas del patrón y el resto son aletas. La lógica es la misma: o la aleta es el número o el patrón se completa sin ella, y en ambos casos se elimina de las celdas del bloque de la aleta en las columnas del patrón.",
            detect: "Buscá dos filas donde una tenga el número solo en las dos columnas y la otra tenga una esquina más una celda extra en el mismo bloque. Las celdas de las columnas del patrón dentro de ese bloque no pueden ser el número.",
            why: "Cubre casos en los que el patrón parece incompleto. Con el nombre en japonés, \"sashimi\" indica que falta una pieza del pez.",
            faq: [
              {"q":"¿En qué se diferencia del Finned?","a":"En el Finned las dos filas tienen sus dos esquinas. En el Sashimi una fila tiene una esquina menos y una aleta ocupa su lugar."},
              {"q":"¿Es válido aunque falte una esquina?","a":"Sí: si la aleta no es el número, la fila se queda sin candidato en las columnas y la otra completa el patrón. El razonamiento sigue valiendo."},
              {"q":"¿Cuándo conviene buscarlo?","a":"Cuando tengas un X-Wing que \"parece\" correcto pero falta una celda."}
            ]
          },
          example: {
            mode: "classic",
            grid: "832471596549006000617259384378604905056708403104500867000940008000067000003005000",
            steps: [
              {"text":"Miremos solo el número 1: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"61":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]}},
              {"text":"Las columnas 7 y 9 casi forman un X-Wing: casi todos sus 1 caen en las filas 2 y 7 (bordes gruesos en las celdas del patrón). Pero sobran las aletas (fins) F8C7, F9C7, F8C9 y F9C9, fuera de esas filas (con borde de color). Además, a una de las columnas le falta una esquina: el patrón solo se completa gracias a la aleta. Eso lo hace un Sashimi.","hl":[15,60,17],"src":[69,78,71,80],"rel":[6,15,24,33,42,51,60,69,78,8,17,26,35,44,53,62,71,80],"show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"61":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]}},
              {"text":"Caso 1: si ninguna aleta es 1, queda un X-Wing completo y normal. Los 1 de las dos columnas ocupan las dos filas, así que ningún otro 1 de esas filas puede existir.","hl":[15,60,17],"rel":[9,10,11,12,13,14,15,16,17,54,55,56,57,58,59,60,61,62],"show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"61":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]}},
              {"text":"Caso 2: si alguna aleta es 1, ese 1 elimina el 1 de todo el bloque inferior derecho (la aleta está ahí). Las celdas de esas filas que están en el bloque inferior derecho tampoco pueden ser 1.","hl":[69,78,71,80],"rel":[60,61,62,69,70,71,78,79,80],"show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"61":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]}},
              {"text":"Los dos casos coinciden en algo: las celdas marcadas en rojo (1 candidato) no pueden ser 1. Esta técnica es un Sashimi X-Wing.","hl":[15,60,17,69,78,71,80],"rel":[9,10,11,12,13,14,15,16,17,54,55,56,57,58,59,60,61,62],"show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"61":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]},"strike":{"61":[1]}},
              {"text":"Así quedan los candidatos del 1 tras eliminar, sin haber colocado nada todavía.","hl":[15,60,17,69,78,71,80],"rel":[6,15,24,33,42,51,60,69,78,8,17,26,35,44,53,62,71,80],"show":{"15":[1],"16":[1],"17":[1],"31":[1],"34":[1],"40":[1],"43":[1],"56":[1],"60":[1],"65":[1],"66":[1],"69":[1],"70":[1],"71":[1],"75":[1],"76":[1],"78":[1],"79":[1],"80":[1]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "104005063600009401007614020040500016815062340076143008400006100501000634760401000",
            solution: "194825763652379481387614925943587216815962347276143598438256179521798634769431852",
            notes: "auto",
            goal: {
              text: "Hay un Sashimi X-Wing en el tablero: tachá (en modo Notas) el número en las celdas de las columnas del patrón dentro del bloque de la aleta.",
              elimSets: [[[11,3]],[[57,7]]]
            },
            hint: "Buscá dos filas donde una tenga solo una celda en las columnas del patrón y el resto de sus candidatos estén en un solo bloque.",
            hintCells: [18,19,27,29]
          }
        },
        {
          id: "finned-swordfish",
          title: "Finned Swordfish",
          short: "Un Swordfish con una celda de más",
          theory: {
            what: "Es un Swordfish al que le sobra una celda (la aleta o fin) en el mismo bloque que una esquina. Si la aleta no es el número, queda un Swordfish completo; si lo es, elimina el número de su bloque. En los dos casos, las celdas de las columnas del patrón dentro del bloque de la aleta no pueden ser el número.",
            detect: "Buscá un Swordfish casi completo con una celda extra en un bloque. Tachá el número en las celdas de las columnas del patrón dentro de ese bloque.",
            why: "Aparece en tableros Expertos donde un Swordfish normal no da resultado. Es más raro, pero la lógica es la misma del X-Wing con aleta.",
            faq: [
              {"q":"¿Cuántas aletas puede tener?","a":"Una o varias, siempre que estén todas en el mismo bloque."},
              {"q":"¿Cómo se diferencia del Swordfish normal?","a":"Tiene al menos una celda candidata fuera de las tres columnas del patrón."},
              {"q":"¿Se puede hacer con columnas?","a":"Sí, intercambiando filas por columnas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "701200390900300020300906700109000000600008930034090001090000000216759483000820609",
            steps: [
              {"text":"Miremos solo el número 1: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"13":[1],"14":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]}},
              {"text":"Las columnas 4, 5 y 7 casi forman un Swordfish: casi todos sus 1 caen en las filas 5, 7 y 2 (bordes gruesos en las celdas del patrón). Pero sobra la aleta (fin) F3C5, fuera de esas filas (con borde de color).","hl":[39,57,13,40,58,15,60],"src":[22],"rel":[3,12,21,30,39,48,57,66,75,4,13,22,31,40,49,58,67,76,6,15,24,33,42,51,60,69,78],"show":{"13":[1],"14":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]}},
              {"text":"Caso 1: si la aleta no es 1, queda un Swordfish completo y normal. Los 1 de las tres columnas ocupan las tres filas, así que ningún otro 1 de esas filas puede existir.","hl":[39,57,13,40,58,15,60],"rel":[36,37,38,39,40,41,42,43,44,54,55,56,57,58,59,60,61,62,9,10,11,12,13,14,15,16,17],"show":{"13":[1],"14":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]}},
              {"text":"Caso 2: si la aleta es 1, ese 1 elimina el 1 de todo el bloque superior central (la aleta está ahí). Las celdas de esas filas que están en el bloque superior central tampoco pueden ser 1.","hl":[22],"rel":[3,4,5,12,13,14,21,22,23],"show":{"13":[1],"14":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]}},
              {"text":"Los dos casos coinciden en algo: las celdas marcadas en rojo (1 candidato) no pueden ser 1. Esta técnica es un Finned Swordfish.","hl":[39,57,13,40,58,15,60,22],"rel":[36,37,38,39,40,41,42,43,44,54,55,56,57,58,59,60,61,62,9,10,11,12,13,14,15,16,17],"show":{"13":[1],"14":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]},"strike":{"14":[1]}},
              {"text":"Así quedan los candidatos del 1 tras eliminar, sin haber colocado nada todavía.","hl":[39,57,13,40,58,15,60,22],"rel":[3,12,21,30,39,48,57,66,75,4,13,22,31,40,49,58,67,76,6,15,24,33,42,51,60,69,78],"show":{"13":[1],"15":[1],"22":[1],"25":[1],"39":[1],"40":[1],"57":[1],"58":[1],"59":[1],"60":[1],"61":[1],"77":[1],"79":[1]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "800215476014000030000090010140020085650840300000500004900070250405102000000956043",
            solution: "893215476514687932267394518149723685652841397378569124936478251485132769721956843",
            notes: "auto",
            goal: {
              text: "Hay un Finned Swordfish en el tablero: tachá (en modo Notas) el número en las celdas de las columnas del patrón dentro del bloque de la aleta.",
              elimSets: [[[49,3]]]
            },
            hint: "Buscá tres filas donde un número casi solo pueda ir en tres columnas, con una celda extra en un bloque.",
            hintCells: [18,45,21,30,57,23,32,50,59]
          }
        },
        {
          id: "sashimi-swordfish",
          title: "Sashimi Swordfish",
          short: "Un Swordfish al que le falta una esquina",
          theory: {
            what: "Es un Finned Swordfish donde a alguna de las tres filas le falta una de las celdas en las columnas del patrón y la aleta ocupa su lugar. El razonamiento es el mismo: o la aleta es el número, o el patrón completo vale, y en ambos casos se elimina de las celdas del bloque de la aleta.",
            detect: "Buscá un Swordfish con una fila que solo tenga una celda en las tres columnas y las demás celdas de esa fila en un solo bloque. Las celdas de las columnas del patrón dentro de ese bloque no pueden ser el número.",
            why: "Es el pez con aleta más sutil. Conviene buscarlo después de agotar los peces simples y con aleta.",
            faq: [
              {"q":"¿Por qué sigue valiendo si falta una celda?","a":"Porque aunque la fila solo tenga una celda en las columnas, la aleta cubre el otro caso. Las dos opciones llevan a la misma eliminación."},
              {"q":"¿Cuántas celdas puede perder el patrón?","a":"Una o más, siempre que haya una aleta que lo respalde dentro de un solo bloque."},
              {"q":"¿Es común?","a":"No. Se ve sobre todo en tableros extremos."}
            ]
          },
          example: {
            mode: "classic",
            grid: "246590830010000040807024060328970604004203708751468923079002486000700090002009370",
            steps: [
              {"text":"Miremos solo el número 1: mostramos todos los lugares donde todavía puede ir en el tablero.","show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"68":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]}},
              {"text":"Las filas 1, 7 y 9 casi forman un Swordfish: casi todos sus 1 caen en las columnas 6, 9 y 1 (bordes gruesos en las celdas del patrón). Pero sobran las aletas (fins) F7C4, F7C5, F9C4 y F9C5, fuera de esas columnas (con borde de color). Además, a una de las filas le falta una esquina: el patrón solo se completa gracias a la aleta. Eso lo hace un Sashimi.","hl":[5,8,54,72,80],"src":[57,58,75,76],"rel":[0,1,2,3,4,5,6,7,8,54,55,56,57,58,59,60,61,62,72,73,74,75,76,77,78,79,80],"show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"68":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]}},
              {"text":"Caso 1: si ninguna aleta es 1, queda un Swordfish completo y normal. Los 1 de las tres filas ocupan las tres columnas, así que ningún otro 1 de esas columnas puede existir.","hl":[5,8,54,72,80],"rel":[5,14,23,32,41,50,59,68,77,8,17,26,35,44,53,62,71,80,0,9,18,27,36,45,54,63,72],"show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"68":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]}},
              {"text":"Caso 2: si alguna aleta es 1, ese 1 elimina el 1 de todo el bloque inferior central (la aleta está ahí). Las celdas de esas columnas que están en el bloque inferior central tampoco pueden ser 1.","hl":[57,58,75,76],"rel":[57,58,59,66,67,68,75,76,77],"show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"68":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]}},
              {"text":"Los dos casos coinciden en algo: las celdas marcadas en rojo (1 candidato) no pueden ser 1. Esta técnica es un Sashimi Swordfish.","hl":[5,8,54,72,80,57,58,75,76],"rel":[5,14,23,32,41,50,59,68,77,8,17,26,35,44,53,62,71,80,0,9,18,27,36,45,54,63,72],"show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"68":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]},"strike":{"68":[1]}},
              {"text":"Así quedan los candidatos del 1 tras eliminar, sin haber colocado nada todavía.","hl":[5,8,54,72,80,57,58,75,76],"rel":[0,1,2,3,4,5,6,7,8,54,55,56,57,58,59,60,61,62,72,73,74,75,76,77,78,79,80],"show":{"5":[1],"8":[1],"21":[1],"24":[1],"26":[1],"32":[1],"34":[1],"40":[1],"43":[1],"54":[1],"57":[1],"58":[1],"63":[1],"67":[1],"69":[1],"71":[1],"72":[1],"75":[1],"76":[1],"80":[1]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000005904540600000987040000720504039350900040694000020075400003400350090039076451",
            solution: "163825974542697318987143562728564139351982746694731825275419683416358297839276451",
            notes: "auto",
            goal: {
              text: "Hay un Sashimi Swordfish en el tablero: tachá (en modo Notas) el número en las celdas de las columnas del patrón dentro del bloque de la aleta.",
              elimSets: [[[69,6],[71,6]]]
            },
            hint: "Buscá tres filas donde una tenga solo una celda en las columnas del patrón y el resto de sus candidatos estén en un solo bloque.",
            hintCells: [31,33,40,42,44,60,61]
          }
        },
        {
          id: "sue-de-coq",
          title: "Sue de Coq",
          short: "Una intersección que reparte números entre línea y bloque",
          theory: {
            what: "Mirá la intersección de una fila (o columna) con un bloque: 2 o 3 celdas con varios candidatos. Si hay una celda en la línea con candidatos de un grupo A y otra en el bloque con candidatos de un grupo B (sin números en común), y el total de celdas coincide con el total de números, esas celdas contienen exactamente esos números. Se tachan los números A del resto de la línea y los números B del resto del bloque.",
            detect: "Buscá una intersección con 2 o 3 celdas libres y muchos candidatos. Contá los números distintos. Buscá en la línea y en el bloque celdas cuyos candidatos sean parte de ese conjunto y no se solapen. Si las celdas igualan a los números, tachá.",
            why: "Es una de las técnicas de conjuntos más potentes. Resuelve muchos tableros Extremos y generaliza los pares y tríos.",
            faq: [
              {"q":"¿Por qué hay que contar?","a":"Porque el truco es que haya tantas celdas como números: así cada celda toma un número distinto y ninguno sobra."},
              {"q":"¿Por qué ese nombre?","a":"Es el nombre con el que se conoce internacionalmente a la técnica y no describe su lógica. Conviene recordar el patrón: una intersección de línea y bloque más celdas auxiliares en cada casa."},
              {"q":"¿Qué se elimina?","a":"Los números del grupo A en el resto de la fila o columna y los del grupo B en el resto del bloque."}
            ]
          },
          example: {
            mode: "classic",
            grid: "410600070903058040080940000026000405541006000097405261038060004254009000009004300",
            steps: [
              {"text":"Miremos la intersección entre la fila 3 y el bloque superior derecho: F3C7, F3C8 y F3C9. Entre las 3 celdas tienen 5 candidatos distintos: 1, 2, 3, 5 y 6.","hl":[24,25,26],"rel":[18,19,20,21,22,23,24,25,26,6,7,8,15,16,17],"show":{"24":[1,5,6],"25":[1,2,3,5],"26":[2,3,6]}},
              {"text":"En la fila 3 (fuera del bloque) F3C3 solo usa números de ese conjunto: 2 y 5. En el bloque superior derecho (fuera de la fila) F2C7 solo usa: 1 y 6. Los dos grupos no comparten ningún número.","hl":[24,25,26],"src":[20,15],"rel":[18,19,20,21,22,23,24,25,26,6,7,8,15,16,17],"show":{"15":[1,6],"20":[2,5],"24":[1,5,6],"25":[1,2,3,5],"26":[2,3,6]}},
              {"text":"Contamos: 3 celdas de la intersección + 1 de la línea + 1 del bloque = 5 celdas para 5 números. Las 5 celdas tienen que contener exactamente los números 1, 2, 3, 5 y 6, uno cada una.","hl":[24,25,26,20,15],"rel":[18,19,20,21,22,23,24,25,26,6,7,8,15,16,17],"show":{"15":[1,6],"20":[2,5],"24":[1,5,6],"25":[1,2,3,5],"26":[2,3,6]}},
              {"text":"Los números 2 y 5 solo pueden estar en la intersección o en F3C3, todas en la fila 3. Los números 1 y 6 solo en la intersección o en F2C7, todas en el bloque superior derecho. Entonces se pueden tachar 2 y 5 del resto de la fila y 1 y 6 del resto del bloque (2 candidatos). Es un Sue de Coq.","hl":[24,25,26,20,15],"rel":[18,19,20,21,22,23,24,25,26,6,7,8,15,16,17],"show":{"15":[1,6],"17":[6],"20":[2,5],"23":[2],"24":[1,5,6],"25":[1,2,3,5],"26":[2,3,6]},"strike":{"17":[6],"23":[2]}},
              {"text":"Así quedan los candidatos tras el Sue de Coq, sin haber colocado nada todavía. Además, F2C9 quedó con un solo candidato, el 2 (Único desnudo).","hl":[24,25,26,20,15,23,17],"show":{"15":[1,6],"20":[2,5],"24":[1,5,6],"25":[1,2,3,5],"26":[2,3,6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "460100000920800030780260000608700520107582060259306007392678145576421398814900070",
            solution: "465193782921857634783264951648719523137582469259346817392678145576421398814935276",
            notes: "auto",
            goal: {
              text: "Hay un Sue de Coq en el tablero: tachá (en modo Notas) los candidatos que el patrón descarta en el resto de la línea y del bloque.",
              elimSets: [[[6,9]],[[15,4]]]
            },
            hint: "Buscá una intersección de fila y bloque con 2 o 3 celdas libres y mirá si una celda de la línea y otra del bloque usan, sin solaparse, los números de la intersección.",
            hintCells: [8,17,26,80,24]
          }
        },
        {
          id: "x-chain",
          title: "X-Chain",
          short: "Una cadena larga de enlaces de un solo número",
          theory: {
            what: "Es una cadena de enlaces fuertes y débiles de un solo número: fuerte, débil, fuerte, débil, fuerte. Si el primer extremo es falso, la cadena obliga a que el último sea verdadero, así que al menos uno de los extremos lo es. Se elimina el número de las celdas que ven a los dos extremos.",
            detect: "Elegí un número y marcá sus enlaces fuertes. Buscá una cadena que alterne con enlaces débiles (celdas que se ven) y que empiece y termine con enlaces fuertes. Tachá el número en las celdas que ven los dos extremos.",
            why: "Generaliza Skyscraper, Cometa y Empty Rectangle (que son cadenas de 3 enlaces). Aparece mucho en tableros Extremos.",
            faq: [
              {"q":"¿En qué se diferencia de una cadena AIC?","a":"La X-Chain usa un solo número. La AIC puede saltar entre números."},
              {"q":"¿Cuántos enlaces tiene?","a":"Un número impar, con fuertes en los extremos: 3 (Skyscraper o Cometa), 5, 7..."},
              {"q":"¿Qué pasa con las celdas del medio?","a":"No se eliminan: solo las que ven los dos extremos."}
            ]
          },
          example: {
            mode: "classic",
            grid: "009352600030017592052049301085760020060920805000580063500078030040196258008035000",
            steps: [
              {"text":"Miremos solo el número 7: mostramos los enlaces fuertes (casas donde tiene solo dos lugares) y débiles (celdas que se ven). Va desde el 7 de F3C1 hasta el 7 de F6C7: 7·F3C1 → 7·F3C8 → 7·F1C9 → 7·F9C9 → 7·F9C7 → 7·F6C7.","hl":[18,25,8,80,78,51],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}},
              {"text":"En la fila 3 el 7 solo puede ir en F3C1 o en F3C8: si el 7 de F3C1 es falso, el 7 de F3C8 es verdadero. Ahora, el 7 de F3C8 y el 7 de F1C9 comparten el bloque superior derecho: si el 7 de F3C8 es verdadero, el 7 de F1C9 es falso.","hl":[18,25,8],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}},
              {"text":"En la columna 9 el 7 solo puede ir en F1C9 o en F9C9: si el 7 de F1C9 es falso, el 7 de F9C9 es verdadero. Ahora, el 7 de F9C9 y el 7 de F9C7 comparten la fila 9: si el 7 de F9C9 es verdadero, el 7 de F9C7 es falso.","hl":[18,25,8,80,78],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}},
              {"text":"En la columna 7 el 7 solo puede ir en F9C7 o en F6C7: si el 7 de F9C7 es falso, el 7 de F6C7 es verdadero.","hl":[18,25,8,80,78,51],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}},
              {"text":"Si el 7 de F3C1 es falso, los enlaces fuertes y débiles se encadenan hasta que el 7 de F6C7 es verdadero. Por lo tanto, al menos uno de los dos extremos es verdadero: el 7 de F3C1 o el 7 de F6C7.","hl":[18,25,8,80,78,51],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}},
              {"text":"Cualquier candidato que vea a los dos extremos queda descartado: el 7 de F6C1 (1 candidato). Es una X-Chain.","hl":[18,25,8,80,78,51],"src":[18,51],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"45":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]},"strike":{"45":[7]}},
              {"text":"Así quedan los candidatos tras la cadena, sin haber colocado nada todavía.","hl":[18,25,8,80,78,51,45],"show":{"0":[7],"1":[7],"7":[7],"8":[7],"18":[7],"25":[7],"36":[7],"38":[7],"43":[7],"46":[7],"47":[7],"51":[7],"63":[7],"65":[7],"72":[7],"73":[7],"78":[7],"79":[7],"80":[7]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000001030300007001070329000080000005400000300036490000063000080748916523200700600",
            solution: "694581732325647891871329456987163245412875369536492178163254987748916523259738614",
            notes: "auto",
            goal: {
              text: "Hay una X-Chain en el tablero: tachá (en modo Notas) el número de la cadena en las celdas que ven a los dos extremos.",
              elimSets: [[[33,1]]]
            },
            hint: "Elegí un número y seguí una cadena de enlaces fuertes y débiles que alterne. Mirá qué celdas ven los dos extremos.",
            hintCells: [30,39,37,73,54,60]
          }
        },
        {
          id: "xy-chain",
          title: "XY-Chain",
          short: "Una cadena de celdas con dos candidatos",
          theory: {
            what: "Es una cadena de celdas con dos candidatos donde cada una ve a la siguiente y comparte un número con ella. Los extremos terminan con el mismo candidato X, que está sí o sí en uno de los dos extremos. Se elimina X de las celdas que ven a ambos extremos.",
            detect: "Empezá en una celda con dos candidatos y avanzá a una celda que la vea y tenga uno de sus candidatos. Pasá el otro candidato a la siguiente. Si el último extremo tiene de nuevo X, tachá X de las celdas que ven a los dos extremos.",
            why: "Es la generalización del XY-Wing y del W-Wing a cadenas más largas. Resuelve tableros Expertos con muchos pares.",
            faq: [
              {"q":"¿El XY-Wing es una XY-Chain?","a":"Sí: una de tres celdas. La XY-Chain extiende la idea a cuatro o más celdas."},
              {"q":"¿Se puede pasar dos veces por la misma celda?","a":"No. Cada celda aparece una sola vez."},
              {"q":"¿Cómo la distingo de los Pares remotos?","a":"Los Pares remotos usan celdas con exactamente el mismo par. La XY-Chain usa pares distintos que comparten un número con la siguiente."}
            ]
          },
          example: {
            mode: "classic",
            grid: "246915837935867412817324956304281095581049203029053148092036080403178029008092300",
            steps: [
              {"text":"Todas estas celdas tienen exactamente dos candidatos y cada una ve a la siguiente: F4C7 (6-7) → F7C7 (5-7) → F7C4 (4-5) → F7C9 (1-4) → F7C1 (1-7) → F6C1 (6-7). Es una cadena de pares (XY-Chain).","hl":[33,60,57,62,54,45],"show":{"33":[6,7],"45":[6,7],"54":[1,7],"57":[4,5],"60":[5,7],"62":[1,4]}},
              {"text":"Los extremos F4C7 y F6C1 tienen ambos el 6. Cada eslabón comparte un número con el siguiente: F4C7–F7C7 comparten el 7; F7C7–F7C4 comparten el 5; F7C4–F7C9 comparten el 4; F7C9–F7C1 comparten el 1; F7C1–F6C1 comparten el 7.","hl":[33,60,57,62,54,45],"src":[33,45],"show":{"33":[6,7],"45":[6,7],"54":[1,7],"57":[4,5],"60":[5,7],"62":[1,4]}},
              {"text":"Si F4C7 no es 6, es 7; F7C7 no puede ser 7 y es 5; F7C4 no puede ser 5 y es 4; F7C9 no puede ser 4 y es 1; F7C1 no puede ser 1 y es 7; F6C1 no puede ser 7 y es 6.","hl":[33,60,57,62,54,45],"src":[33,45],"show":{"33":[6,7],"45":[6,7],"54":[1,7],"57":[4,5],"60":[5,7],"62":[1,4]}},
              {"text":"Entonces, o F4C7 es 6, o F6C1 es 6: al menos un extremo. Cualquier celda que vea a ambos extremos no puede ser 6: la tachamos (1 candidato).","hl":[33,60,57,62,54,45],"src":[33,45],"show":{"28":[6],"33":[6,7],"45":[6,7],"54":[1,7],"57":[4,5],"60":[5,7],"62":[1,4]},"strike":{"28":[6]}},
              {"text":"Así quedan los candidatos tras la XY-Chain, sin haber colocado nada todavía. Además, F4C2 quedó con un solo candidato, el 7 (Único desnudo).","hl":[33,60,57,62,54,45,28],"show":{"33":[6,7],"45":[6,7],"54":[1,7],"57":[4,5],"60":[5,7],"62":[1,4]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "694100000000356940050040601025064310469831725000502060587613090946000100132400076",
            solution: "694128537871356942253749681725964318469831725318572469587613294946287153132495876",
            notes: "auto",
            goal: {
              text: "Hay una XY-Chain en el tablero: tachá (en modo Notas) el candidato X en las celdas que ven a los dos extremos de la cadena.",
              elimSets: [[[71,2]]]
            },
            hint: "Seguí una cadena de celdas con dos candidatos donde cada una comparte un número con la siguiente, hasta que el último extremo vuelva a tener el número del primero.",
            hintCells: [60,51,35,30,66]
          }
        },
        {
          id: "aic",
          title: "AIC (Alternating Inference Chain)",
          short: "Una cadena de inferencias alternadas",
          theory: {
            what: "Es una cadena que alterna enlaces fuertes (si uno es falso, el otro es verdadero) y enlaces débiles (si uno es verdadero, el otro es falso) entre candidatos de cualquier número. Si el primer extremo es falso, el último es verdadero. Se elimina cualquier candidato que vea a los dos extremos.",
            detect: "Armá la cadena paso a paso: usá enlaces fuertes de una celda con dos candidatos o de un número con dos lugares en una casa, y enlaces débiles de candidatos que se ven. Si los extremos coinciden en algún candidato que ven en común, ese candidato se descarta.",
            why: "Es la técnica más general: incluye X-Chain, XY-Chain, Skyscraper, XY-Wing y W-Wing como casos particulares. Con ella se resuelve casi cualquier tablero Extremo.",
            faq: [
              {"q":"¿Qué es un enlace fuerte y uno débil?","a":"Fuerte: dos candidatos de los que al menos uno es verdadero. Débil: dos candidatos que no pueden ser verdaderos a la vez. Un enlace fuerte también sirve como débil."},
              {"q":"¿Cuántos eslabones puede tener?","a":"Los que hagan falta, pero en la práctica se buscan cadenas cortas. Cuanto más larga, más difícil de seguir."},
              {"q":"¿Siempre conviene usar AIC?","a":"No. Primero probá técnicas más simples. Las AIC son el recurso cuando todo lo demás falla."}
            ]
          },
          example: {
            mode: "classic",
            grid: "982743516346100200157600483608000040019000650405000000000000005860500900503017864",
            steps: [
              {"text":"Armamos una cadena de inferencias alternadas, que alterna enlaces fuertes (si uno es falso, el otro es verdadero) y enlaces débiles (si uno es verdadero, el otro es falso). Va desde el 7 de F2C8 hasta el 7 de F8C8: 7·F2C8 → 9·F2C8 → 9·F2C9 → 7·F2C9 → 7·F8C9 → 7·F8C8.","hl":[16,17,71,70],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}},
              {"text":"En F2C8 solo quedan dos candidatos (7 y 9): si el 7 de F2C8 es falso, el 9 de F2C8 es verdadero. Ahora, el 9 de F2C8 y el 9 de F2C9 comparten la fila 2: si el 9 de F2C8 es verdadero, el 9 de F2C9 es falso.","hl":[16,17],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}},
              {"text":"En F2C9 solo quedan dos candidatos (7 y 9): si el 9 de F2C9 es falso, el 7 de F2C9 es verdadero. Ahora, el 7 de F2C9 y el 7 de F8C9 comparten la columna 9: si el 7 de F2C9 es verdadero, el 7 de F8C9 es falso.","hl":[16,17,71],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}},
              {"text":"En la fila 8 el 7 solo puede ir en F8C9 o en F8C8: si el 7 de F8C9 es falso, el 7 de F8C8 es verdadero.","hl":[16,17,71,70],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}},
              {"text":"Si el 7 de F2C8 es falso, los enlaces fuertes y débiles se encadenan hasta que el 7 de F8C8 es verdadero. Por lo tanto, al menos uno de los dos extremos es verdadero: el 7 de F2C8 o el 7 de F8C8.","hl":[16,17,71,70],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}},
              {"text":"Cualquier candidato que vea a los dos extremos queda descartado: el 7 de F6C8 y el 7 de F7C8 (2 candidatos). Es una cadena AIC.","hl":[16,17,71,70],"src":[16,70],"show":{"16":[7,9],"17":[7,9],"52":[7],"61":[7],"70":[7],"71":[7]},"strike":{"52":[7],"61":[7]}},
              {"text":"Así quedan los candidatos tras la cadena, sin haber colocado nada todavía.","hl":[16,17,71,70,52,61],"show":{"16":[7,9],"17":[7,9],"70":[7],"71":[7]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "354009000709500430108007950675900000903605021201003000802000070507090600406000200",
            solution: "354289167729516438168437952675921843983645721241873596892164375517392684436758219",
            notes: "auto",
            goal: {
              text: "Hay una cadena AIC en el tablero: tachá (en modo Notas) un candidato que vea a los dos extremos de la cadena.",
              elimSets: [[[14,8]],[[21,2]],[[22,2]],[[22,6]],[[32,8]]]
            },
            hint: "Empezá con un enlace fuerte (una celda con dos candidatos o un número con dos lugares en una casa) y seguí alternando con enlaces débiles hasta cerrar la cadena.",
            hintCells: [14,13,31,32,77]
          }
        },
        {
          id: "grouped-aic",
          title: "Grouped AIC (AIC agrupada)",
          short: "Una AIC con grupos de celdas",
          theory: {
            what: "Es una AIC en la que un nodo puede ser un grupo de celdas del mismo número en una intersección de bloque y línea (por ejemplo, 2 o 3 celdas en una fila dentro de un bloque). El grupo es verdadero si el número está en alguna de sus celdas. Con grupos se forman enlaces fuertes y débiles que no existen con celdas sueltas.",
            detect: "Buscá un número cuyos candidatos en una casa se repartan entre un grupo (2 o 3 celdas de un bloque y una línea) y una o más celdas. Usá ese grupo como nodo y seguí alternando enlaces como en una AIC.",
            why: "Extiende las cadenas a casos con varias celdas juntas. Resuelve tableros extremos donde las cadenas con celdas sueltas no alcanzan.",
            faq: [
              {"q":"¿Qué es un grupo?","a":"Dos o tres celdas del mismo número dentro de la intersección de un bloque con una fila o columna."},
              {"q":"¿Cuándo es verdadero un grupo?","a":"Cuando el número está en alguna de sus celdas. Es falso cuando ninguna de sus celdas lo es."},
              {"q":"¿En qué se diferencia de una AIC?","a":"En que algún nodo es un grupo de celdas. Los enlaces son más ricos, pero hay que cuidar que el grupo se vea con las demás celdas."}
            ]
          },
          example: {
            mode: "classic",
            grid: "900710804178400602000680017701308069890067001020194078210876005080041720407000180",
            steps: [
              {"text":"Armamos una cadena de inferencias alternadas, que alterna enlaces fuertes (si uno es falso, el otro es verdadero) y enlaces débiles (si uno es verdadero, el otro es falso). Va desde el 6 de F1C2 hasta el 5 de F3C1: 6·F1C2 → 6·F9C2 → 3·F9C2 → 3·[F1C2 y F3C2] → 3·F3C1 → 5·F3C1.","hl":[1,73,19,18],"src":[1,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}},
              {"text":"En la columna 2 el 6 solo puede ir en F1C2 o en F9C2: si el 6 de F1C2 es falso, el 6 de F9C2 es verdadero. Ahora, el 6 de F9C2 y el 3 de F9C2 están en la misma celda: si el 6 de F9C2 es verdadero, el 3 de F9C2 es falso.","hl":[1,73],"src":[1,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}},
              {"text":"En la columna 2 el 3 solo puede ir en F9C2 o en el grupo F1C2 y F3C2: si el 3 de F9C2 es falso, el 3 del grupo F1C2 y F3C2 es verdadero. Ahora, el 3 del grupo F1C2 y F3C2 y el 3 de F3C1 comparten el bloque superior izquierdo: si el 3 del grupo F1C2 y F3C2 es verdadero, el 3 de F3C1 es falso.","hl":[1,73,19,18],"src":[1,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}},
              {"text":"En F3C1 solo quedan dos candidatos (3 y 5): si el 3 de F3C1 es falso, el 5 de F3C1 es verdadero.","hl":[1,73,19,18],"src":[1,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}},
              {"text":"Si el 6 de F1C2 es falso, los enlaces fuertes y débiles se encadenan hasta que el 5 de F3C1 es verdadero. Por lo tanto, al menos uno de los dos extremos es verdadero: el 6 de F1C2 o el 5 de F3C1.","hl":[1,73,19,18],"src":[1,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}},
              {"text":"Cualquier candidato que vea a los dos extremos queda descartado: el 5 de F1C2 (1 candidato). Es una AIC agrupada (Grouped AIC): uno de los nodos es un grupo de celdas.","hl":[1,73,19,18],"src":[1,18],"show":{"1":[3,5,6],"18":[3,5],"19":[3],"73":[3,6]},"strike":{"1":[5]}},
              {"text":"Así quedan los candidatos tras la cadena, sin haber colocado nada todavía.","hl":[1,73,19,18],"show":{"1":[3,6],"18":[3,5],"19":[3],"73":[3,6]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "000875000048621305000439100071008039050000000689340501006004810090086050800003960",
            solution: "913875426748621395265439187471568239352917648689342571536794812194286753827153964",
            notes: "auto",
            goal: {
              text: "Hay una AIC agrupada en el tablero: tachá (en modo Notas) un candidato que vea a los dos extremos de la cadena.",
              elimSets: [[[25,2]],[[30,2]],[[39,2]],[[39,7]],[[40,6]],[[44,2]]]
            },
            hint: "Buscá una cadena AIC donde uno de los nodos sea un grupo de 2 o 3 celdas del mismo número. Mirá qué candidatos ven a los dos extremos.",
            hintCells: [25,26,16,52]
          }
        },
        {
          id: "forcing-chain",
          title: "Cadena de forzado (Forcing Chain)",
          short: "Probar las dos opciones y ver qué coincide",
          theory: {
            what: "Se parte de una celda con dos candidatos. Se supone que cada uno es verdadero y se siguen las consecuencias con deducciones simples (únicos desnudos y ocultos). Si en las dos ramas aparece la misma conclusión, esa conclusión es verdadera sin importar cuál rama sea la correcta.",
            detect: "Elegí una celda con dos candidatos. Probá cada uno y seguí las deducciones. Si en las dos ramas aparece la misma colocación o desaparece el mismo candidato, tenés una cadena de forzado.",
            why: "Es un método general de fuerza lógica: sirve cuando ninguna técnica con nombre aplica. Permite resolver tableros muy duros sin adivinar, porque considera los dos casos posibles.",
            faq: [
              {"q":"¿Es lo mismo que adivinar?","a":"No. Adivinar prueba un valor y esperar. Acá se prueban las dos opciones y solo vale la conclusión que coincide en ambas."},
              {"q":"¿Qué pasa si una rama llega a una contradicción?","a":"Entonces esa opción es falsa y la otra es verdadera. Es la versión de reducción al absurdo."},
              {"q":"¿Cuántos pasos puede tener?","a":"Los que hagan falta, pero cuanto más cortas, más fáciles de seguir."}
            ]
          },
          example: {
            mode: "classic",
            grid: "000015360000900150751600009174306000000100700385007016010500670907001000508004001",
            steps: [
              {"text":"F9C7 tiene solo dos candidatos: 2 y 9. Una de las dos opciones es verdadera. Vamos a probar cada una y ver qué consecuencias tiene.","hl":[78],"show":{"78":[2,9]}},
              {"text":"Rama 1: si F9C7 = 2, entonces F9C4 = 7 (único desnudo) → F1C9 = 7 (único oculto) → F2C5 = 7 (único oculto) → F9C8 = 9 (único oculto). Las celdas de la cadena muestran el número que quedaría.","hl":[78,75,8,13,79],"src":[78],"show":{"8":[7],"13":[7],"75":[7],"78":[2,9],"79":[9]}},
              {"text":"Rama 2: si F9C7 = 9, entonces F6C5 = 9 (único oculto) → F4C8 = 9 (único oculto) → F7C6 = 9 (único oculto).","hl":[78,49,34,59],"src":[78],"show":{"34":[9],"49":[9],"59":[9],"78":[2,9]}},
              {"text":"En la rama 1 F9C8 = 9 (que ve a F9C5) y en la rama 2 F9C7 = 9 (que ve a F9C5): en las dos ramas el 9 de F9C5 desaparece. Como una de las dos ramas es verdadera, F9C5 no puede ser 9: lo tachamos. Es una cadena de forzado (Forcing Chain).","hl":[76,78],"show":{"76":[2,3,6,7,9],"78":[2,9]},"strike":{"76":[9]}},
              {"text":"Así queda F9C5 tras la cadena de forzado, sin haber colocado nada todavía.","hl":[76],"show":{"76":[2,3,6,7],"78":[2,9]}}
            ]
          },
          practice: {
            mode: "classic",
            grid: "006000003090000628700600000000060004004300096960541830610002080080736000200810060",
            solution: "846125973591473628732698145358269714124387596967541832613952487489736251275814369",
            notes: "auto",
            goal: {
              text: "Hay una cadena de forzado en el tablero: colocá el número (o tachá en modo Notas el candidato) que las dos ramas de la celda con dos candidatos obligan.",
              elimSets: [[[80,7]]]
            },
            hint: "Elegí una celda con dos candidatos y seguí las consecuencias de cada uno. Buscá la celda o el candidato que coincide en las dos ramas.",
            hintCells: [47]
          }
        }
      ]
    }
  ];
  var reg = window.TUTORIAL_PATHS.classic;
  var prev = Array.isArray(reg) ? reg : (reg && Array.isArray(reg.chapters) ? reg.chapters : []);
  var ids = {};
  mine.forEach(function (c) { ids[c.id] = true; });
  window.TUTORIAL_PATHS.classic = { chapters: prev.filter(function (c) { return !(c && ids[c.id]); }).concat(mine) };
})();
