/* =====================================================================
   Tutorial — datos de las rutas Diagonal (d1–d2) y Anti-Caballo (a1–a2): 8 técnicas
   Se registran solas en window.TUTORIAL_PATHS.diagonal y window.TUTORIAL_PATHS.antiknight
   (ver encabezado de tutorial.js). Los 16 tableros (8 de ejemplo y 8 de práctica) tienen
   solución única verificada con un solver que respeta las reglas del clásico más las
   diagonales (Diagonal) o la no repetición a salto de caballo (Anti-Caballo). Ningún
   candidato tachado en los pasos pertenece a la solución real.
   El registro se fusiona por id: otro archivo puede aportar capítulos sin pisar estos.
   ===================================================================== */
(function () {
  'use strict';
  window.TUTORIAL_PATHS = window.TUTORIAL_PATHS || {};
  var dg = [
    {
      "id": "d1",
      "title": "Fundamentos de Diagonales",
      "blurb": "El Único en Diagonal y la intersección entre diagonal y caja.",
      "lessons": [
        {
          "id": "diagonal-single",
          "title": "Único en Diagonal (Diagonal Single)",
          "short": "Una diagonal con 8 celdas llenas",
          "theory": {
            "what": "En el modo Diagonal, cada una de las dos diagonales principales también lleva los dígitos del 1 al 9 sin repetir. Si una diagonal tiene 8 celdas llenas, la que queda libre solo puede llevar el dígito que falta en esa diagonal.",
            "detect": "Contá las celdas llenas de cada diagonal (las celdas teñidas). Si hay ocho, fijate qué dígito no está escrito en ella: ese es el que va en la celda libre. Es una buena idea revisarlo cada vez que colocás un número sobre una diagonal.",
            "why": "La celda libre suele tener varios candidatos según su fila, columna y bloque. La diagonal es la casa que los reduce a uno, así que esta deducción es invisible si te olvidás de las diagonales.",
            "faq": [{"q":"¿Es lo mismo que un Último libre?","a":"Es el mismo razonamiento pero sobre una diagonal, que en este modo es una casa más. Por eso conviene mirar las diagonales igual que las filas, columnas y bloques."},{"q":"¿Sirve para las dos diagonales?","a":"Sí. La principal (↘) y la secundaria (↙) tienen 9 celdas cada una y se tratan igual."},{"q":"¿Y si la celda libre es la central?","a":"La central pertenece a las dos diagonales: tiene que cumplir con ambas, así que el dígito que falta debe estar libre en las dos."}]
          },
          "example": {
            "mode": "diagonal",
            "grid": "690050400524000908700980000000160000006073100000425390400607831300000047070000009",
            "steps": [{"text":"En Diagonal, cada una de las dos diagonales principales (las celdas teñidas) también lleva los dígitos del 1 al 9 sin repetir. Miremos la diagonal principal (↘): tiene 8 celdas llenas y solo queda libre F3C3.","hl":[20],"rel":[0,10,20,30,40,50,60,70,80]},{"text":"Empecemos como siempre, con la fila, la columna y el bloque de F3C3: le quedan 1 y 3. Todavía no alcanza para decidir.","hl":[20],"rel":[18,19,20,21,22,23,24,25,26,2,11,29,38,47,56,65,74,0,1,9,10],"src":[0,1,9,10,11,18,21,22,38],"show":{"20":[1,2,3,4,5,6,7,8,9]},"strike":{"20":[2,4,5,6,7,8,9]},"keep":{"20":[1,3]}},{"text":"Ahora la diagonal: ya tiene 1, 2, 4, 5, 6, 7, 8 y 9. Solo le falta el 3, así que F3C3 no puede llevar ningún otro.","hl":[20],"rel":[0,10,20,30,40,50,60,70,80],"src":[0,10,30,40,50,60,70,80],"show":{"20":[1,2,3,4,5,6,7,8,9]},"strike":{"20":[1,2,4,5,6,7,8,9]},"keep":{"20":[3]}},{"text":"Colocamos el 3 en F3C3. Es un Único en Diagonal (Diagonal Single): una diagonal con 8 celdas llenas, igual que un Último libre.","hl":[20],"rel":[0,10,20,30,40,50,60,70,80],"place":{"20":3}}]
          },
          "practice": {
            "mode": "diagonal",
            "grid": "390006024500390060080400305600000003140050607900804500009705801020009006730040000",
            "solution": "397586124514392768286417395658271943142953687973864512469725831825139476731648259",
            "notes": "none",
            "goal": {"text":"Una de las dos diagonales (celdas teñidas) tiene 8 celdas llenas. Colocá el dígito que falta en la celda libre.","place":[[32,1]]},
            "hint": "Contá los números de la diagonal secundaria (↙): hay ocho. El que no está escrito va en la celda libre.",
            "hintCells": [32]
          }
        },
        {
          "id": "diagonal-box",
          "title": "Intersección diagonal–caja (Diagonal-Box Reduction)",
          "short": "Un dígito atrapado entre diagonal y caja",
          "theory": {
            "what": "Si todos los lugares posibles de un dígito en una diagonal caen dentro de un mismo bloque, ese dígito de la diagonal está en el bloque, y no puede estar en las celdas del bloque fuera de la diagonal. También funciona al revés: si en un bloque el dígito solo cabe sobre la diagonal, se elimina del resto de la diagonal.",
            "detect": "Elegí un dígito que todavía no esté en una diagonal y marcá dónde puede ir. Si todas esas celdas están en el mismo bloque, tachalo en las demás celdas del bloque. Al revés: si en un bloque el dígito solo puede ir en celdas de la diagonal, tachalo en el resto de la diagonal.",
            "why": "Es el equivalente de los Apuntadores del clásico: la diagonal funciona como una línea más. Elimina candidatos que ninguna fila ni columna descartarían.",
            "faq": [{"q":"¿Qué bloques sirven?","a":"Los cuatro de las esquinas, porque cada uno tiene tres celdas de una diagonal. El bloque central tiene las dos diagonales cruzadas y se analiza con más cuidado."},{"q":"¿Hace falta que sean tres celdas?","a":"No, alcanza con dos o más: si solo queda una, ya es un Único oculto de diagonal."},{"q":"¿Funciona igual con la otra diagonal?","a":"Sí, con los bloques de las otras dos esquinas."}]
          },
          "example": {
            "mode": "diagonal",
            "grid": "070390005092460803000020064007004591000030007060000308750902030210006489000813000",
            "steps": [{"text":"Busquemos dónde puede ir el 6 en la diagonal secundaria (↙) (celdas teñidas). Mostramos solo ese candidato en la diagonal.","rel":[8,16,24,32,40,48,56,64,72],"show":{"56":[6],"72":[6]}},{"text":"En la diagonal el 6 solo cabe en F7C3 y F9C1, y las 2 celdas están dentro del mismo bloque (inferior izquierdo).","hl":[56,72],"rel":[54,55,56,63,64,65,72,73,74],"show":{"56":[6],"72":[6]}},{"text":"Entonces el 6 de la diagonal está en el bloque inferior izquierdo, sobre la diagonal. Ese bloque ya tiene su 6: ninguna celda del bloque fuera de la diagonal puede llevarlo.","hl":[56,72],"rel":[54,55,56,63,64,65,72,73,74],"show":{"56":[6],"72":[6],"74":[6]},"keep":{"56":[6],"72":[6]}},{"text":"Eliminamos el 6 de 1 celda (F9C3) sin colocar nada todavía. Es una Intersección diagonal–caja.","hl":[56,72],"rel":[54,55,56,63,64,65,72,73,74],"show":{"56":[6],"72":[6],"74":[6]},"strike":{"74":[6]},"keep":{"56":[6],"72":[6]}}]
          },
          "practice": {
            "mode": "diagonal",
            "grid": "608170090005600087090050060800000601000400000360708000106000000039041076002360500",
            "solution": "648173295215694387793852164827539641951426738364718952176985423539241876482367519",
            "notes": "auto",
            "goal": {"text":"En un bloque de esquina, un dígito solo cabe en celdas de una diagonal. Tachá (modo Notas) ese candidato en el resto de la diagonal.","elimSets":[[[40,1]]]},
            "hint": "Mirá el bloque superior izquierdo y el 1: todos sus lugares posibles están sobre la diagonal. Entonces el 1 de la diagonal queda en ese bloque.",
            "hintCells": [10,20]
          }
        }
      ]
    },
    {
      "id": "d2",
      "title": "Interacción cruzada",
      "blurb": "El centro del tablero y cómo cruzan las diagonales con filas y columnas.",
      "lessons": [
        {
          "id": "center-bottleneck",
          "title": "Cuello de botella central (F5C5)",
          "short": "La celda que ve más vecinos del tablero",
          "theory": {
            "what": "La celda central F5C5 está en su fila, su columna, su bloque y las dos diagonales a la vez. En el modo Diagonal ve 32 celdas (20 por fila, columna y bloque, más 12 que aportan las diagonales fuera del bloque), más que ninguna otra.",
            "detect": "Cuando el centro sigue vacío, revisalo primero: restá lo que ya hay en su fila, columna y bloque, y después en cada diagonal por separado. También probá con cada número que falte en una diagonal: si el único lugar que le queda es el centro, va ahí.",
            "why": "Como tantas casas pasan por el centro, casi siempre se queda con muy pocos candidatos. Resolverlo suele destrabar la fila, la columna, el bloque y las dos diagonales de golpe.",
            "faq": [{"q":"¿Por qué 32 celdas?","a":"Fila y columna aportan 16, el bloque agrega 4 más (las esquinas) y las diagonales suman 12 fuera del bloque: 16 + 4 + 12 = 32."},{"q":"¿Y las otras celdas de las diagonales?","a":"Cada una ve su fila, columna, bloque y su diagonal: entre 21 y 26 celdas, menos que el centro."},{"q":"¿El centro puede resolverse por Único oculto?","a":"Sí. Si un número que falta en una diagonal solo cabe en el centro, es un Único oculto en esa diagonal."}]
          },
          "example": {
            "mode": "diagonal",
            "grid": "000106002020000576049027001063070000087209003090300060004095020000702018070010045",
            "steps": [{"text":"La celda central (F5C5) está en su fila, su columna, su bloque y en las dos diagonales a la vez: en el modo Diagonal ve 32 celdas, más que ninguna otra.","hl":[40],"rel":[36,37,38,39,40,41,42,43,44,4,13,22,31,49,58,67,76,30,32,48,50,0,10,20,60,70,80,8,16,24,56,64,72]},{"text":"Con fila, columna y bloque le quedan 4, 5 y 6. Todavía son varios.","hl":[40],"rel":[36,37,38,39,40,41,42,43,44,4,13,22,31,49,58,67,76,30,32,48,50],"src":[22,31,37,38,39,41,44,48,58,76],"show":{"40":[1,2,3,4,5,6,7,8,9]},"strike":{"40":[1,2,3,7,8,9]},"keep":{"40":[4,5,6]}},{"text":"La diagonal principal (↘) ya tiene 5: los tachamos. Quedan 4 y 6.","hl":[40],"rel":[0,10,20,30,40,50,60,70,80],"src":[10,20,70,80],"show":{"40":[1,2,3,4,5,6,7,8,9]},"strike":{"40":[1,2,3,5,7,8,9]},"keep":{"40":[4,6]}},{"text":"La diagonal secundaria (↙) ya tiene 4: también los tachamos. Solo sobrevive el 6.","hl":[40],"rel":[8,16,24,32,40,48,56,64,72],"src":[8,16,48,56],"show":{"40":[1,2,3,4,5,6,7,8,9]},"strike":{"40":[1,2,3,4,5,7,8,9]},"keep":{"40":[6]}},{"text":"Colocamos el 6 en el centro. Como el centro ve tantas celdas, casi siempre se resuelve así: conviene mirarlo primero.","hl":[40],"place":{"40":6}}]
          },
          "practice": {
            "mode": "diagonal",
            "grid": "090187602520900800010206400108043000000700306609820700000400100901508004042010500",
            "solution": "493187652526934817817256493178643925254791386639825741385462179961578234742319568",
            "notes": "auto",
            "goal": {"text":"El centro (F5C5) comparte las dos diagonales. Hay un número que falta en una diagonal y que solo cabe en el centro: colocalo.","place":[[40,9]]},
            "hint": "Elegí un número que falte en la diagonal secundaria (↙) y marcá en qué celdas de la diagonal podría ir. ¿Cuál de ellos solo cabe en el centro?",
            "hintCells": [40]
          }
        },
        {
          "id": "diagonal-line-cross",
          "title": "Cruce diagonal–línea",
          "short": "Dos lugares en la diagonal, eliminaciones cruzadas",
          "theory": {
            "what": "Si un dígito solo puede ir en dos celdas de una diagonal, una de las dos lo lleva. Las celdas donde se cruzan la fila de una con la columna de la otra ven a las dos, así que ese dígito no puede estar ahí.",
            "detect": "Buscá un dígito que en una diagonal tenga exactamente dos lugares posibles, en bloques distintos. Para cada par de celdas, fijate en las dos celdas que cierran el rectángulo (misma fila que una, misma columna que la otra): si el dígito aparece como candidato, se tacha.",
            "why": "Combina la diagonal con las filas y columnas para eliminar candidatos fuera de la diagonal, en celdas que no comparten casa con ella.",
            "faq": [{"q":"¿Funciona con cualquier dígito?","a":"Sí, siempre que en la diagonal le queden exactamente dos lugares posibles."},{"q":"¿Por qué se elimina en las otras dos esquinas del rectángulo?","a":"Porque cada esquina ve a las dos celdas de la diagonal (una por fila y otra por columna). Sea cual sea la que lleve el dígito, la esquina queda bloqueada."},{"q":"¿Y si las dos celdas están en el mismo bloque?","a":"Entonces conviene usar la Intersección diagonal–caja, que elimina más."}]
          },
          "example": {
            "mode": "diagonal",
            "grid": "058107204143060000000950003305000408270083056400000032607009005030000020092046000",
            "steps": [{"text":"Miremos el 7 en la diagonal principal (↘) (celdas teñidas): solo puede ir en dos celdas, F4C4 y F9C9.","hl":[30,80],"rel":[0,10,20,30,40,50,60,70,80],"show":{"30":[7],"80":[7]}},{"text":"Una de las dos lleva el 7, sin saber cuál. Cada una \"ve\" su fila y su columna.","hl":[30,80],"rel":[27,28,29,30,31,32,33,34,35,3,12,21,39,48,57,66,75,72,73,74,76,77,78,79,80,8,17,26,44,53,62,71],"show":{"30":[7],"80":[7]}},{"text":"Las celdas F4C9 y F9C4 cierran el rectángulo: cada una está en la fila de una y la columna de la otra, así que ve a las dos celdas de la diagonal.","hl":[35,75],"src":[30,80],"rel":[35,75,30,80],"show":{"30":[7],"80":[7]}},{"text":"Sea cual sea la que lleve el 7, F9C4 queda bloqueada. Tachamos el 7 ahí: Cruce diagonal–línea.","hl":[75],"src":[30,80],"show":{"30":[7],"75":[7],"80":[7]},"strike":{"75":[7]}}]
          },
          "practice": {
            "mode": "diagonal",
            "grid": "040800900780290030205604000000916308050000016630082007379000605002063800060050000",
            "solution": "143875962786291534295634781427916358958347216631582497379128645512463879864759123",
            "notes": "auto",
            "goal": {"text":"Un dígito tiene solo dos lugares posibles en una diagonal. Tachá (modo Notas) ese candidato en una de las celdas que cierran el rectángulo con esas dos.","elimSets":[[[22,7]]]},
            "hint": "Buscá un dígito con exactamente dos celdas posibles en la diagonal. Las celdas donde se cruzan la fila de una y la columna de la otra no pueden llevarlo.",
            "hintCells": [24,40]
          }
        }
      ]
    }
  ];
  var rd = window.TUTORIAL_PATHS.diagonal;
  var pd = Array.isArray(rd) ? rd : (rd && Array.isArray(rd.chapters) ? rd.chapters : []);
  var id = {};
  dg.forEach(function (c) { id[c.id] = true; });
  window.TUTORIAL_PATHS.diagonal = { chapters: pd.filter(function (c) { return !(c && id[c.id]); }).concat(dg) };

  var ak = [
    {
      "id": "a1",
      "title": "Fundamentos del salto en L",
      "blurb": "Qué celdas bloquea el caballo y cómo ubicar el único lugar posible.",
      "lessons": [
        {
          "id": "knight-elimination",
          "title": "Bloqueo por salto de caballo (Knight-Move Elimination)",
          "short": "Los dígitos a un salto de caballo se descartan",
          "theory": {
            "what": "En Anti-Caballo, dos celdas separadas por un movimiento de caballo de ajedrez (dos casillas en una dirección y una al costado) no pueden tener el mismo dígito. Cada dígito colocado elimina ese número de hasta ocho celdas en L.",
            "detect": "Elegí una celda y, además de su fila, columna y bloque, mirá las hasta ocho celdas en L que la rodean. Todo dígito que aparezca ahí se tacha de sus candidatos. Si queda uno solo, es tuyo.",
            "why": "Es la regla que define la variante. Se olvida fácil, y sin ella muchos tableros parecen trabados.",
            "faq": [{"q":"¿Las celdas pegadas en diagonal se bloquean?","a":"No, salvo que compartan bloque. Solo cuenta el salto en L."},{"q":"¿Cuántas celdas ve el caballo?","a":"Hasta ocho. Cerca de los bordes y las esquinas, menos."},{"q":"¿Se aplica a los dígitos dados y a los colocados?","a":"A los dos por igual."}]
          },
          "example": {
            "mode": "antiknight",
            "grid": "040900052200000980913205007000000030650004290030000706028500170504301820000020500",
            "steps": [{"text":"Tomemos la celda marcada (F3C7). En Anti-Caballo, además de su fila, columna y bloque, \"ve\" las celdas a un salto de caballo: dos casillas en una dirección y una al costado, formando una L.","hl":[24],"rel":[18,19,20,21,22,23,24,25,26,6,15,33,42,51,60,69,78,7,8,16,17,5,13,31,35,41,43]},{"text":"Por fila, columna y bloque le quedan 4 y 6.","hl":[24],"rel":[18,19,20,21,22,23,24,25,26,6,15,33,42,51,60,69,78,7,8,16,17],"src":[7,8,15,16,18,19,20,21,23,26,42,51,60,69,78],"show":{"24":[1,2,3,4,5,6,7,8,9]},"strike":{"24":[1,2,3,5,7,8,9]},"keep":{"24":[4,6]}},{"text":"Ahora el caballo: el 4 en F5C6 está a un salto de caballo de F3C7, así que no pueden repetirse. Tachamos 4.","hl":[24],"rel":[5,7,13,17,31,35,41,43],"src":[41],"same":[41],"show":{"24":[1,2,3,4,5,6,7,8,9]},"strike":{"24":[1,2,3,4,5,7,8,9]},"keep":{"24":[6]}},{"text":"Solo sobrevive el 6: un Único desnudo que sin el salto de caballo no habríamos visto. Colocamos el 6.","hl":[24],"place":{"24":6}}]
          },
          "practice": {
            "mode": "antiknight",
            "grid": "008703000007008000003125078005014600102890300604200180059000060700602000400580030",
            "solution": "518743296247968513963125478895314627172896354634257189359471862781632945426589731",
            "notes": "none",
            "goal": {"text":"Hay una celda que, con las reglas del clásico, tiene varios candidatos, pero el salto de caballo deja uno solo. Encontrala y colocá el número.","place":[[13,6]]},
            "hint": "Elegí una celda con muchos vecinos llenos, descartá fila, columna y bloque y después mirá las ocho celdas en L a su alrededor.",
            "hintCells": [13]
          }
        },
        {
          "id": "antiknight-hidden-single",
          "title": "Único oculto Anti-Caballo (Anti-Knight Hidden Single)",
          "short": "El salto en L deja un solo lugar para un dígito",
          "theory": {
            "what": "Es un dígito que, en una fila, columna o bloque, parecía caber en varias celdas, pero tras aplicar los bloqueos de caballo solo queda una. Ese dígito va en esa celda aunque tenga otros candidatos.",
            "detect": "Elegí un dígito que falte en una casa y marcá dónde cabría según el clásico. Para cada una de esas celdas mirá si hay ese mismo dígito a un salto de caballo: si lo hay, la celda queda bloqueada. Si se salvan todas menos una, la encontraste.",
            "why": "Los saltos de caballo suman muchas eliminaciones. Los Únicos ocultos son frecuentes en esta variante y resuelven la mayor parte del tablero.",
            "faq": [{"q":"¿En qué se diferencia del Único oculto clásico?","a":"Se hace igual; solo suma una fuente más de bloqueos: los dígitos a salto de caballo."},{"q":"¿Solo vale en bloques?","a":"No, vale en cualquier fila, columna o bloque."},{"q":"¿Cómo reviso los saltos sin cansarme?","a":"Probá con un solo dígito a la vez: ubicá cada una de sus apariciones y marcá las ocho celdas en L que cada una bloquea."}]
          },
          "example": {
            "mode": "antiknight",
            "grid": "140070320070328401008091570001005700705130849030040000000000600654000000210687000",
            "steps": [{"text":"Busquemos dónde puede ir el 6 en la fila 5 (marcada).","rel":[36,37,38,39,40,41,42,43,44]},{"text":"Con las reglas del clásico, el 6 cabe en 2 celdas: F5C2 y F5C6.","rel":[36,37,38,39,40,41,42,43,44],"show":{"37":[6],"41":[6]}},{"text":"Pero el Anti-Caballo bloquea una: F5C6 (ve el 6 de F7C7). Un 6 a salto de caballo impide repetirlo.","rel":[36,37,38,39,40,41,42,43,44],"src":[60],"same":[60],"no":[41],"show":{"37":[6],"41":[6]},"strike":{"41":[6]}},{"text":"Solo queda F5C2 para el 6 en la fila 5: Único oculto Anti-Caballo. Lo colocamos aunque la celda tenga otros candidatos.","hl":[37],"rel":[36,37,38,39,40,41,42,43,44],"place":{"37":6}}]
          },
          "practice": {
            "mode": "antiknight",
            "grid": "790020408600080300300000720036290005002070130470000900007853601000000080813060007",
            "solution": "791326458625487319384519726136294875952678134478135962247853691569741283813962547",
            "notes": "none",
            "goal": {"text":"Hay un número que, en una fila, columna o bloque, solo tiene un lugar válido una vez aplicados los saltos de caballo. Encontralo y colocalo.","place":[[19,8]]},
            "hint": "Mirá la fila 3 y el 8: marcá dónde cabría según el clásico y quitá las celdas que ven otro 8 a salto de caballo.",
            "hintCells": [19,20]
          }
        }
      ]
    },
    {
      "id": "a2",
      "title": "Patrones avanzados Anti-Caballo",
      "blurb": "Intersecciones y pares que atacan en L.",
      "lessons": [
        {
          "id": "knight-box-locking",
          "title": "Intersección caja–caballo (Knight-Box Locking)",
          "short": "Todas las posiciones de un dígito atacan a una celda",
          "theory": {
            "what": "Si todos los lugares posibles de un dígito en un bloque quedan a un salto de caballo de una misma celda de afuera, el dígito de ese bloque estará en uno de ellos y por lo tanto esa celda no puede llevarlo.",
            "detect": "Elegí un dígito y un bloque donde todavía falte, con dos o tres lugares posibles. Para cada celda de afuera, fijate si todas esas posiciones le quedan a un salto de caballo. Si es así, tachá el dígito ahí.",
            "why": "Es el Apuntador del Anti-Caballo: elimina candidatos lejos del bloque sin pasar por ninguna fila ni columna.",
            "faq": [{"q":"¿Cuántas posiciones puede haber?","a":"Dos o tres suelen alcanzar, porque la celda de afuera tiene que estar en L de todas ellas. Con una sola posición ya es un Único oculto."},{"q":"¿Y si una de las posiciones comparte fila o columna con la celda?","a":"Entonces la eliminación ya la haría el clásico. Acá nos interesan las que vienen solo del salto en L."},{"q":"¿Tengo que probar con todas las celdas de afuera?","a":"No: solo con las que están a un salto de caballo de la primera posición. Son como mucho ocho."}]
          },
          "example": {
            "mode": "antiknight",
            "grid": "000089000602107489000003000009008000060014800000390001007000600300640000040072003",
            "steps": [{"text":"Miremos dónde puede ir el 8 en el bloque inferior central (marcado).","rel":[57,58,59,66,67,68,75,76,77],"show":{"57":[8],"75":[8]}},{"text":"Solo cabe en F7C4 y F9C4. Una de ellas lleva el 8 del bloque.","hl":[57,75],"rel":[57,58,59,66,67,68,75,76,77],"show":{"57":[8],"75":[8]}},{"text":"La celda F8C2 (de afuera) está a un salto de caballo de las dos (las celdas en L resaltadas).","hl":[64],"rel":[45,47,57,75],"src":[57,75],"show":{"57":[8],"64":[8],"75":[8]}},{"text":"Sea cual sea la que lleve el 8, F8C2 queda bloqueada por el salto. Tachamos el 8: Intersección caja–caballo.","hl":[64],"rel":[45,47,57,75],"src":[57,75],"show":{"57":[8],"64":[8],"75":[8]},"strike":{"64":[8]}}]
          },
          "practice": {
            "mode": "antiknight",
            "grid": "042600007089002401703080000070040500800170000004060109300006005050097020406015793",
            "solution": "542631987689752431713984256971243568865179342234568179397426815158397624426815793",
            "notes": "auto",
            "goal": {"text":"Todos los lugares posibles de un dígito en un bloque quedan a un salto de caballo de una misma celda de afuera. Tachá (modo Notas) el dígito en esa celda.","elimSets":[[[37,2]]]},
            "hint": "Mirá el 2 en el bloque central: tiene pocos lugares posibles. Buscá la celda de afuera que los ve a todos con un salto de caballo.",
            "hintCells": [30,48]
          }
        },
        {
          "id": "antiknight-pair",
          "title": "Par con alcance de caballo (Anti-Knight Pair)",
          "short": "Un par desnudo que también ataca en L",
          "theory": {
            "what": "Es un par desnudo: dos celdas que se ven entre sí y tienen exactamente los mismos dos candidatos. Además de eliminar esos dígitos en su casa, los elimina en las celdas que están a un salto de caballo de las dos.",
            "detect": "Encontrá un par desnudo. Después ubicá las celdas que quedan en L tanto de una como de la otra. Si alguna tiene alguno de los dos dígitos como candidato, se tacha.",
            "why": "Suma eliminaciones extra a una técnica muy conocida, usando la geometría del caballo que solo existe en esta variante.",
            "faq": [{"q":"¿Es posible que dos celdas del par tengan varias celdas en común?","a":"Sí. Dos celdas separadas por dos columnas en la misma fila comparten dos celdas en L, una arriba y otra abajo."},{"q":"¿Solo sirve con pares?","a":"No: el mismo razonamiento funciona con tríos, pero los pares son los más frecuentes."},{"q":"¿Y las celdas que ven al par por fila o columna?","a":"También se eliminan, con la técnica de Par desnudo del clásico. Este caso suma las que solo se ven por salto de caballo."}]
          },
          "example": {
            "mode": "antiknight",
            "grid": "000000200050302900000000054008401070000023681000600005083070100040206830090008500",
            "steps": [{"text":"F4C5 y F5C4 se ven entre sí y tienen exactamente los mismos dos candidatos: 5 y 9. Es un Par desnudo.","hl":[31,39],"show":{"31":[5,9],"39":[5,9]},"keep":{"31":[5,9],"39":[5,9]}},{"text":"Entre las dos celdas se reparten el 5 y el 9: ningún otro vecino de ambas puede llevarlos. En Anti-Caballo, los vecinos también son las celdas a un salto de caballo.","hl":[31,39],"rel":[12,14,20,24,38,42,48,50,22,28,32,46,56,58],"show":{"31":[5,9],"39":[5,9]},"keep":{"31":[5,9],"39":[5,9]}},{"text":"F3C3 está a un salto de caballo de F4C5 y de F5C4 a la vez (las dos L se cruzan ahí).","hl":[20],"rel":[12,14,20,24,38,42,48,50,22,28,32,46,56,58],"src":[31,39],"show":{"20":[1,2,6,7,9],"31":[5,9],"39":[5,9]}},{"text":"Por eso F3C3 no puede ser 5 ni 9: tachamos 9. Un Par con alcance de caballo.","hl":[20],"src":[31,39],"show":{"20":[1,2,6,7,9],"31":[5,9],"39":[5,9]},"strike":{"20":[9]}}]
          },
          "practice": {
            "mode": "antiknight",
            "grid": "400003020209005300037000900000000400605001000070000008006392010003708090700100043",
            "solution": "418973625269815374537264981981537462625481739374629158846392517153748296792156843",
            "notes": "auto",
            "goal": {"text":"Hay un par desnudo cuyas dos celdas atacan, con saltos de caballo, a una misma celda de afuera. Tachá (modo Notas) los dos dígitos del par en esa celda.","elimSets":[[[43,7]]]},
            "hint": "Buscá dos celdas que se vean y tengan los mismos dos candidatos. Después ubicá la celda que queda en L de las dos.",
            "hintCells": [60,62]
          }
        }
      ]
    }
  ];
  var ra = window.TUTORIAL_PATHS.antiknight;
  var pa = Array.isArray(ra) ? ra : (ra && Array.isArray(ra.chapters) ? ra.chapters : []);
  var ia = {};
  ak.forEach(function (c) { ia[c.id] = true; });
  window.TUTORIAL_PATHS.antiknight = { chapters: pa.filter(function (c) { return !(c && ia[c.id]); }).concat(ak) };
})();
