# GridLab · Sudoku

**GridLab** es una aplicación web progresiva (PWA) de Sudoku hecha con HTML, CSS y JavaScript puro, sin dependencias de build ni frameworks. Se instala como una app más, funciona sin conexión y no tiene anuncios, cuentas ni rastreo.

> Cuatro modos. Seis niveles. Una academia de técnicas. Y duelos con amigos.

## Filosofía

- **Sin anuncios, sin cuentas, sin rastreo.** Todo lo que guardás (partida en curso, estadísticas, ajustes, progreso del tutorial) vive en el `localStorage` de tu dispositivo.
- **Offline-first.** Un Service Worker precachea toda la app: una vez instalada, se juega sin internet. Solo el modo multijugador necesita conexión (ver más abajo).
- **Entrada `Digit-First`.** Además del clásico "celda primero, número después", podés elegir un número del teclado y tocar celdas para colocarlo (o anotarlo en lápiz) una tras otra. El botón `Celda→Nº` alterna entre ambos modos.
- **Validación lógica real.** Cada tablero tiene solución única verificada por un solver con backtracking, y la dificultad no se estima: se **mide** resolviendo el tablero con técnicas humanas (Únicos, Pares, Pointing, Box-Line, X-Wing). Las pistas explican el razonamiento y nunca contradicen la solución.

## Modos de juego

| Modo | Reglas |
|---|---|
| **Clásico** | Filas, columnas y bloques de 3×3 con los dígitos del 1 al 9. |
| **Killer** | Además, cada jaula punteada suma el número indicado y no repite dígitos. |
| **Diagonal** | Las dos diagonales principales también llevan del 1 al 9 sin repetir. |
| **Anti-Caballo** | Ningún número se repite a un salto de caballo de ajedrez. |
| **Sin Consecutivos** | Dos celdas que comparten lado (arriba, abajo, izquierda, derecha) no pueden llevar números consecutivos (|a − b| ≠ 1). El 9 y el 1 no cuentan como consecutivos. Tiene las 6 dificultades y Modo Zen, y las Pistas inteligentes, la detección de errores y el autolimpiado de notas también aplican la regla (al colocar un `n` se borran además `n − 1` y `n + 1` en las celdas adyacentes). |
| **Jigsaw (Irregular)** | En lugar de los bloques de 3×3 hay 9 regiones irregulares y contiguas de 9 celdas; cada una lleva del 1 al 9 sin repetir (además de filas y columnas). El mapa de regiones lo genera el motor a partir de la semilla (se deforman los bloques intercambiando celdas vecinas sin romper la contigüidad), con solución única y las 6 dificultades + Modo Zen. El tablero dibuja bordes gruesos solo entre celdas de distinta región, y el resaltado, las pistas inteligentes, la detección de errores y el autolimpiado de notas usan la región. Viaja por semilla en Duelos y como estado completo en Co-op. |

### Dificultades (6 niveles)

| Nivel | Vidas | Qué exige (modos estándar) |
|---|---|---|
| **Fácil** | ∞ | Solo *Naked Singles*. |
| **Medio** | 5 | Suma *Hidden Singles*. |
| **Difícil** | 4 | Pares desnudos y Pointing / Box-Line. |
| **Experto** | 3 | Muchos descartes avanzados. |
| **Maestro** | 2 | Además exige al menos un **X-Wing**. |
| **Extremo** | 2 | Las técnicas del motor no alcanzan; tableros con muy pocas pistas. |

En **Killer** la dificultad la dan el número de pistas iniciales y el tamaño de las jaulas (más largas = más difíciles, sin pistas desde Difícil).

- **Pistas limitadas** (3 por partida) con explicación del razonamiento.
- **Modo Zen:** interruptor en la hoja de dificultad. Sin cronómetro, sin vidas y con pistas de sobra, para jugar sin presión. Las victorias en Zen suman a las ganadas y a la racha, pero **no** a los tiempos ni a los récords.

### Supervivencia (No-Hit)

Sin pistas y sin margen de error: **un solo fallo termina la racha**. Los tableros suben de dificultad (1–2 Fácil, 3–4 Medio, 5–6 Difícil, del 7 en adelante Experto). Seis rotaciones: Clásico, Diagonal, Anti-Caballo, Killer, Mixto (rota entre Clásico, Diagonal y Anti-Caballo) y Mixto + Killer. Cada rotación guarda su récord (tableros y tiempo).

### Desafío Diario

Un tablero clásico por día, igual para todos (la semilla es la fecha), con calendario de los últimos 24 meses.

- **Estrellas por precisión:** cada día completado muestra una estrella según los errores cometidos: **oro** (0), **plata** (1–2) o **bronce** (3+). Los días completados antes de que existieran las estrellas cuentan como oro.
- **Copas mensuales:** al completar *todos* los días de un mes aparece una copa junto al nombre del mes y, además, una copa grande como marca de agua detrás del calendario (sin tapar los números). Su categoría sale de la peor estrella del mes: **oro** (`#d4af37`) si todas son de oro, **plata** (`#94a3b8`) si no hay ninguna de bronce, **bronce** (`#b45309`) en los demás casos.
- Estrellas y copas se adaptan a cada tema: sello editorial de relleno suave y contorno fino en **Papel**, resplandor del color del metal en **Noche**, trazo continuo de 1,5 px en **Minimalista** y geometría escalonada **pixel-art / 8-bit** en **Retro**.
- Las estadísticas del Diario incluyen completados, mejor tiempo, promedio, rachas, copas obtenidas y días sin errores.

### Multijugador P2P

Sin servidor propio ni cuentas: el tablero y el resultado viajan en el enlace o por conexión directa entre dispositivos.

- **Duelo con amigo:** ambos juegan **el mismo tablero** a la vez; gana el que termine antes (cada pista suma 30 s). El enlace de invitación lleva el tablero y, al terminar, un enlace de resultado con tu "fantasma" (destellos de las celdas que fue resolviendo el rival) para comparar tiempo, errores y pistas. Hay marcador histórico contra cada rival y revancha.
- **Co-op ("Resolver juntos"):** una sala compartida por **WebRTC** (con [PeerJS](https://peerjs.com/)). Los dos ven en tiempo real lo que escribe el otro, con colores distintos, y comparten **3 vidas y 3 pistas**. El anfitrión lleva el reloj y valida las jugadas.

> **Conexión:** PeerJS usa su servidor público de señalización y servidores STUN de Google para establecer la conexión. El resto de la app no necesita red.

## Academia: Tutorial interactivo

Dos secciones en la pantalla de Tutorial:

- **Cómo jugar (7 guías):** Clásico, Killer, Diagonal, Anti-Caballo, Sin Consecutivos, Jigsaw (Irregular) y Duelos / Co-op. Cada una trae las reglas, una rutina de resolución segura, los errores comunes, un ejemplo guiado paso a paso y una mini-comprobación.
- **Técnicas (58 técnicas):** rutas de aprendizaje por variante, con un mapa de capítulos: **38** de Clásico, **12** de Killer, **4** de Diagonal y **4** de Anti-Caballo. Cada técnica tiene teoría, un **ejemplo animado** (el tablero muestra candidatos, descartes y colocación paso a paso) y un **tablero de práctica** interactivo con objetivo, pista y celebración al lograrlo. Todos los tableros del tutorial tienen solución única verificada con un solver.

El progreso se guarda en tu dispositivo.

## Calidad de vida y rendimiento

- **Generación en segundo plano (Web Worker):** `worker.js` genera los tableros de todos los modos y dificultades en un hilo secundario, así que la interfaz nunca se congela. Mientras estás en el inicio o en los menús, la app **pre-genera** en momentos inactivos (`requestIdleCallback`) tableros para las combinaciones más probables (tu modo y dificultad habituales) y los guarda en memoria: al elegirlos, la partida arranca al instante. Los Desafíos Diarios, duelos y enlaces siguen generándose o reconstruyéndose por semilla. Si el navegador no soporta Workers o la página se abre por `file://`, se usa el hilo principal de forma transparente.
- **Pistas inteligentes con explicación lógica:** el botón **Pista** (o la tecla `H`) busca primero un paso deducible (*Naked Single*, *Hidden Single*, *Naked Pair*, *Pointing*, *Box-Line*, *X-Wing*; en Killer, celda única de jaula, última celda y regla del 45). Ilumina la celda objetivo y las celdas de referencia y muestra una tarjeta con el nombre de la técnica y el porqué, con **Aplicar** y **Cerrar**. Si hay errores previos lo avisa y sugiere corregirlos o usar **Rewind**; si el paso exige técnicas superiores, lo indica.
- **Rewind seguro:** el botón **Rewind** (o la tecla `R`), junto a *Deshacer*, retrocede el historial hasta el último estado sin números erróneos. Pide confirmación si va a retroceder más de un movimiento y no devuelve las vidas perdidas. No está disponible en Co-op.
- **Teclado físico:** flechas y `WASD` mueven la selección; `1`–`9` (fila superior o Numpad) colocan o anotan; `Backspace`, `Delete` o `0` borran; `N` o `Espacio` alternan Notas; `Ctrl/Cmd+Z` o `U` deshacen; `H` pide pista; `R` hace Rewind (volver al último tablero sin errores). Todo esto está resumido en **Ajustes → Controles y atajos**.
- **Vibración háptica:** pulso breve al tocar, doble pulso al errar y patrones propios al completar una fila/columna/caja o al ganar. Se activa o desactiva en **Ajustes → Vibración** (solo en dispositivos que lo soportan).
- **Controles y atajos (Ajustes):** un acordeón con el estilo del tema activo, encima del respaldo, que explica los 6 botones del tablero (Notas, Deshacer, Rewind, Borrar, Pista y el modo de entrada) y lista los atajos de teclado para PC y tablet.
- **Barra superior de la partida:** los botones **INICIO** y **Ajustes** usan el borde y la sombra sólida del tema; el engranaje cambia de diseño por tema (editorial en Papel, luminoso en Noche, trazo fino en Minimalista y pixel-art de 8 bits en Retro).
- **Respaldo de progreso (JSON):** en **Ajustes → Respaldo de progreso** podés exportar todo tu progreso (estadísticas, Diario, tutorial y preferencias) a `gridlab-backup-AAAA-MM-DD.json` e importarlo luego en otro dispositivo. El archivo se valida antes de sobrescribir nada.

## Personalización, audio y estadísticas

- **4 temas** (se guardan y se aplican antes del primer pintado, sin parpadeo):
  - **Papel:** editorial, crema cálido, tinta azul marino, serif clásica y números monoespaciados.
  - **Noche:** carbón profundo con acentos cobalto, pensado para pantallas OLED.
  - **Minimalista:** estilo suizo, blanco puro, líneas de 1 px y cero adornos.
  - **Retro:** portátil de los 90 en verde oliva, bordes rectos y trama LCD.
- **Efectos de sonido sintetizados** con la **Web Audio API** (cero archivos de audio, funcionan offline): tocar celda, anotar, acierto, error, completar fila/columna/caja, victoria y derrota. Se activan o desactivan en Ajustes.
- **Estadísticas** por modo y dificultad (Todos, Clásico, Killer, Diagonal, Anti-Caballo, Sin Consecutivos, Jigsaw): partidas iniciadas y ganadas (% de victorias), mejor tiempo, tiempo promedio, racha actual, mejor racha y victorias sin equivocarse. Vistas propias para **Supervivencia** (racha máxima, tiempo de la mejor racha, intentos y tableros superados por rotación) y **Desafíos diarios** (completados, tiempos, rachas, copas y días sin errores).

## Instalarlo como app (PWA)

La app se sirve como sitio estático (por ejemplo, desde **GitHub Pages**). Abrí la dirección donde esté publicada y:

- **Android (Chrome / Edge):** menú ⋮ → *Instalar app* (o *Añadir a pantalla de inicio*).
- **iPhone / iPad (Safari):** botón *Compartir* → *Añadir a pantalla de inicio*.
- **PC (Chrome / Edge):** icono de instalación en la barra de direcciones (o menú → *Instalar GridLab*).

Tras la primera carga, la app queda precacheada y funciona sin conexión. Si publicás una versión nueva, el Service Worker (`CACHE_NAME` en `sw.js`) renueva la caché al abrirla.

### Publicar en GitHub Pages

1. Subí el contenido de esta carpeta a un repositorio de GitHub.
2. En *Settings → Pages*, elegí la rama (por ejemplo `main`) y la carpeta raíz `/`.
3. Esperá a que se publique y abrí la URL que te indica GitHub.

Todas las rutas son relativas (`./`), por lo que funciona tanto en la raíz de un dominio como en una subcarpeta (`usuario.github.io/repositorio/`).

## Ejecutarlo en local

No hay paso de compilación. Hay que servirlo por HTTP (el Service Worker no funciona con `file://`):

```bash
# con Python
python -m http.server 8080

# o con Node
npx serve .
```

Luego abrí `http://localhost:8080`. Con `localhost` el navegador permite el Service Worker y la instalación. Para probar el multijugador en dos dispositivos hace falta una URL accesible desde ambos (por ejemplo, la versión publicada).

## Arquitectura técnica

JavaScript, HTML y CSS **vanilla**: sin frameworks, sin bundler, sin dependencias de runtime salvo `peerjs.min.js` (incluido en el repositorio).

```
index.html               Estructura: pantallas (inicio, Jugar, Estadísticas, Diario, juego, tutorial) y modales
style.css                Temas, layout de inicio y juego, tarjetas, calendario y estadísticas
app.js                   Controlador: estado de la partida, vistas, vidas, pistas, estadísticas, Diario, Supervivencia
engine.js                Motor Clásico / Diagonal / Anti-Caballo / Sin Consecutivos / Jigsaw: generador con solución única, analizador de
                         dificultad por técnicas (Únicos, Pares, Pointing, Box-Line, X-Wing) y pistas inteligentes
killer-engine.js         Motor Killer: generación de jaulas, unicidad y validación de sumas
worker.js                Web Worker: genera tableros en un hilo secundario (pre-generación en segundo plano)
duel.js                  Duelos por enlace: codificación compacta del tablero y resultado, fantasma, marcador
coop.js                  Co-op: sala WebRTC sobre PeerJS, sincronización de jugadas, reloj, vidas y pistas
peerjs.min.js            Cliente PeerJS (WebRTC)
sound.js                 Efectos de sonido con Web Audio API
tutorial.js              Motor del tutorial: guías, mapas de técnicas, visor de ejemplos y práctica
tutorial-data-*.js       Contenido del tutorial (Clásico, Killer, Diagonal y Anti-Caballo; la guía de Sin Consecutivos vive en `tutorial.js`) con tableros verificados
tutorial.css             Estilos del tutorial
sw.js                    Service Worker: precaché versionado y respuesta offline
manifest.json            Manifiesto PWA (nombre, colores, iconos)
icon-192.png / icon-512.png   Iconos de la app
```

Puntos de diseño:

- **Generación determinista:** los motores aceptan una semilla (los Desafíos Diarios usan la fecha), por lo que todos obtienen el mismo tablero.
- **Dificultad medida, no supuesta:** el generador quita celdas manteniendo solución única y sin superar la dificultad objetivo según el solver lógico; el analizador clasifica el resultado.
- **Service Worker:** precachea los archivos imprescindibles (si uno falla, la instalación falla para no dejar la app a medias) y trata como opcionales `peerjs.min.js` y los datos del tutorial. Solo atiende peticiones GET del mismo origen; el tráfico de PeerJS pasa directo.
- **Persistencia:** `localStorage` con respaldo en memoria si el almacenamiento no está disponible (modo privado o cuota).
- **Accesibilidad y móvil:** diseño pensado para móvil (objetivos táctiles de 44 px o más, áreas seguras), roles ARIA en selectores y respeto de `prefers-reduced-motion`.

## Versionado de caché

Al publicar cambios, subí `CACHE_NAME` en `sw.js` (por ejemplo `sudoku-v35`) y, si querés, los parámetros `?v=` de `index.html`, para que los dispositivos descarguen los archivos nuevos.

## Licencia y Uso

El código fuente de GridLab es **público** para que puedas aprender de él, auditarlo y usarlo de forma **personal**, bajo la licencia [**PolyForm Noncommercial 1.0.0**](https://polyformproject.org/licenses/noncommercial/1.0.0/) (texto completo en el archivo [`LICENSE`](LICENSE)).

- **Permitido:** leer y estudiar el código, auditarlo, ejecutarlo y modificarlo para uso personal, de estudio o hobby, y otros usos no comerciales que la licencia contempla.
- **No permitido sin autorización expresa de Eitan Bardella:** redistribuirlo o publicarlo como una aplicación propia, y cualquier explotación comercial o monetización (venta, anuncios, suscripciones, compras dentro de la app, etc.).

Esto es una explicación en lenguaje llano; ante cualquier diferencia, vale el texto de la licencia. © 2026 Eitan Bardella.
