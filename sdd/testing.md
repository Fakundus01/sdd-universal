# testing.md · SDD Hub

**Versión:** 0.31 · R07, variante front: verificación en el navegador del agente, más una suite chica sin navegador desde 0.31 (D2).

## La suite (0.31)

```
node --test "web/tests/*.test.mjs"
```

Node 22.2+ (por `zlib.crc32`) y nada más: sin `node_modules` (ADR-001). Corre en CI (`.github/workflows/web.yml`). Carga `zip.js` y `paquete.js` como los carga el navegador, con el `fetch` servido desde el disco, y lee el ZIP con un lector propio que verifica los CRC.

| Test | Qué atrapa |
|---|---|
| PRO con arnés trae la capa de ejecución completa | Que falte una pieza fija de la lista; que la barra de progreso no cierre; que `harness/` salga distinto del repo (comparando texto, así un clon con CRLF no da rojo falso) |
| La capa de ejecución no cita `prompts/` ni `agents/` que falten | Lo que encontró el reviewer en 0.31: archivos del ZIP que citan plantillas que no viajan |
| El pre-commit sale ejecutable, y solo él | Un hook sin `+x` que git ignora en Linux/macOS |
| NOVATO sin `agents/` ni `harness-fix` | Que viaje lo que R31 apaga, o que el LEEME anuncie una skill que no vino |
| El LEEME brownfield nombra lo que hay que llevarse | Instrucciones que dejan afuera `harness/` o `agents/` |
| La web tiene las mismas reglas que el master | Lo que pasó con R27 y R29–R32: `reglas.js`, el tablero, el README y todo «N reglas» de `web/*.html` y `web/*.js`, contra los encabezados de la §4 |

Cada uno se vio fallar a propósito antes de darlo por bueno (R29): sin la marca de ejecutable, con el `reglas.js` de 0.29, con R30 marcada como desactivable, con «28 reglas» en `catalogo.js`, con una cita a `prompts/nuevo.md` y con el LEEME de NOVATO anunciando `/harness-fix`.

**Smoke en navegador real (sin dependencias):** Chrome headless con `--remote-debugging-port` y un script de Node que habla CDP con el `WebSocket` nativo. Carga `index.html`, junta excepciones y errores de consola, y ejercita el combinador (generar, lista de archivos, árbol, cambio de nivel, checkbox del arnés, vistas). Para el popup de descarga rápida hay que elegir antes la categoría «Proyectos»: con la categoría por defecto no hay cards con «📦 Descargar ZIP». Desde ahí se intercepta `Zip.descargar` para ver qué baja de verdad. Se usó para D1. Todavía no está en el repo: es el próximo paso de D2 si la suite crece.

## La suite del entorno local (0.32, ADR-012)

```
node --test "dev/tests/*.test.mjs"
```

Necesita los binarios de Postgres en el PATH (`initdb`, `pg_ctl`, `psql`). Levanta un clúster temporal en otro puerto, corre `supabase/schema.sql` y `metricas.sql` tal cual, y habla con el servidor por HTTP, como la web. Es **la prueba de las dos cuentas de F5**: lo que antes se iba a hacer a mano una vez contra la nube, ahora corre cada vez.

| Test | Qué atrapa |
|---|---|
| Una cuenta no ve, ni edita, ni borra lo de otra | Una política de `combinaciones` o `perfiles` que deje pasar filas ajenas |
| No se puede crear a nombre de otro | Un `with check` que falte. Va con `return=minimal`: con `RETURNING` también frena la política de lectura y el test pasaba con el `with check` roto |
| Nadie se vuelve admin, y `guardarPerfil` puede escribir todo lo que manda | El `revoke` de `metricas.sql`, y una columna nueva de la web que falte en su `grant` (las claves se leen de `sesion.js`) |
| Cambiar la clave desde la CLI conserva el admin | Que `dev.mjs usuario` le saque el panel a quien cambia la clave |
| Sin sesión no se lee nada | Una tabla sin RLS o con la política abierta |
| Las métricas se suman sin sesión y solo las ve el admin | La asimetría de `eventos` |
| Guardar dos veces el mismo nombre pisa, no duplica | El upsert del combinador contra el índice real |
| Login, refresh, logout, cambio de contraseña y registro cerrado | Que el emulador de GoTrue se aparte de lo que espera `sesion.js` |
| El servidor sirve la config local y no sale del repo | Path traversal, `dev/.data/` expuesto (también por su alias 8.3 `DATA~1`) y un `Host` ajeno |

## Por qué la suite es chica

Sin build (ADR-001), montar Vitest o Playwright significa traer `node_modules` a un proyecto que hoy no tiene ninguno. La suite cubre lo que ya se rompió una vez (las reglas de la web) y lo que no se ve en pantalla (el contenido del ZIP). Lo visual se sigue verificando en el navegador. **Lo que la haría crecer:** una regresión de UI que llegue a producción. Ahí el smoke por CDP entra al repo y a CI.

Mientras tanto la disciplina es: **todo cambio se verifica leyendo el DOM, no mirando la pantalla.** "Se ve bien" no es una verificación; `document.querySelectorAll('.c').length === 12` sí.

## Verificación de los criterios de la spec

| CV | Cómo se verifica | Estado |
|---|---|---|
| V1 · el prompt incluye todo y lista los archivos | Generar con tipo, stack, nivel, playbooks y 3 tecnologías; leer el textarea y `#filelist` | ✅ |
| V2 · sin Supabase la página funciona entera | `Sesion.activo() === false` y `#authbtn.hidden === true`; guardar y recuperar una combinación | ✅ |
| V3 · al entrar, lo local se sube | `migrarLocales()` con combinaciones en `localStorage` | ✅ 2026-10-05, en el entorno local: dos combinaciones del navegador quedan en la cuenta y `localStorage` se vacía |
| V4 · sin scroll horizontal a 375 y 768 | `document.documentElement.scrollWidth <= innerWidth` y ningún elemento con `right > innerWidth` | ✅ |
| V5 · arranca en oscuro | `document.documentElement.dataset.theme === "dark"` con el sistema en claro | ✅ |
| V6 · las fijas no se pueden apagar | `document.querySelector('[data-regla="R08"]').disabled === true` | ✅ |
| V7 · los demos muestran diferencia observable | Los tres casos borde, en los dos iframes (abajo) | ✅ |

## El test que más vale: los tres casos del demo

Se corre sobre `demo.html` leyendo el DOM de los dos iframes:

| Caso | Sin SDD | Con SDD |
|---|---|---|
| Días cerrados | 0 días deshabilitados sobre 14 | 4 deshabilitados (domingos y lunes) |
| Color (90 min) al final del día | último slot 18:30 → termina 20:00, cerrado | último slot 17:30 → termina 19:00 justo |
| Doble reserva del mismo horario | "¡Listo!" y **dos clientas a la misma hora** en la agenda | "Ese horario se acaba de ocupar", no se crea nada |

Es el test que mejor protege el proyecto: si alguien "mejora" el demo sin SDD y lo hace correcto, la comparación entera pierde sentido y nadie se daría cuenta mirando la página.

## Verificación manual antes de cada deploy

1. Las tres páginas cargan sin errores en consola.
2. Ningún link interno da 404 (se recorren todos los `href` con `fetch`).
3. El toggle de tema va y vuelve, y sobrevive a recargar.
4. Los tres diálogos abren centrados, cierran con Escape y con clic afuera.
5. A 375 px: sin scroll horizontal en las tres páginas.

## Lo que a propósito no se testea

Que el navegador centre un `<dialog>` o que `fetch` traiga un archivo: es del navegador. RLS sí se testea desde 0.32, en cada corrida de `dev/tests/`, con las mismas políticas que van a la nube. Lo que queda afuera es el servicio de Supabase en sí: cuando se reactive, `schema.sql` y `metricas.sql` se vuelven a correr allá y la prueba de dos cuentas se repite una vez a mano.
