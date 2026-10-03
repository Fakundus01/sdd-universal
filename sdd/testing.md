# testing.md · SDD Hub

**Versión:** 0.31 · R07, variante front: verificación en el navegador del agente, más una suite chica sin navegador desde 0.31 (D2).

## La suite (0.31)

```
node --test "web/tests/*.test.mjs"
```

Node 22+ y nada más: sin `node_modules` (ADR-001). Corre en CI (`.github/workflows/web.yml`). Carga `zip.js` y `paquete.js` como los carga el navegador, con el `fetch` servido desde el disco, y lee el ZIP con un lector propio que verifica los CRC.

| Test | Qué atrapa |
|---|---|
| PRO con arnés trae la capa de ejecución completa | Que el master cite archivos que no vienen en el ZIP; que la barra de progreso no cierre; que `harness/` salga distinto del repo |
| El pre-commit sale ejecutable, y solo él | Un hook sin `+x` que git ignora en Linux/macOS |
| NOVATO sin `agents/` ni `harness-fix` | Que viaje lo que R31 apaga |
| El LEEME brownfield nombra lo que hay que llevarse | Instrucciones que dejan afuera `harness/` o `agents/` |
| La web tiene las mismas reglas que el master | Lo que pasó con R27 y R29–R32: `reglas.js`, el tablero y los «N reglas» contra los encabezados de la §4 |

Cada uno se vio fallar a propósito antes de darlo por bueno (R29): sin la marca de ejecutable, con el `reglas.js` de 0.29, y con R30 marcada como desactivable.

**Smoke en navegador real (sin dependencias):** Chrome headless con `--remote-debugging-port` y un script de Node que habla CDP con el `WebSocket` nativo. Carga `index.html`, junta excepciones y errores de consola, y ejercita el combinador (generar, lista de archivos, árbol, cambio de nivel, checkbox del arnés, popup de descarga rápida, vistas). Se usó para D1. Todavía no está en el repo: es el próximo paso de D2 si la suite crece.

## Por qué la suite es chica

Sin build (ADR-001), montar Vitest o Playwright significa traer `node_modules` a un proyecto que hoy no tiene ninguno. La suite cubre lo que ya se rompió una vez (las reglas de la web) y lo que no se ve en pantalla (el contenido del ZIP). Lo visual se sigue verificando en el navegador. **Lo que la haría crecer:** una regresión de UI que llegue a producción. Ahí el smoke por CDP entra al repo y a CI.

Mientras tanto la disciplina es: **todo cambio se verifica leyendo el DOM, no mirando la pantalla.** "Se ve bien" no es una verificación; `document.querySelectorAll('.c').length === 12` sí.

## Verificación de los criterios de la spec

| CV | Cómo se verifica | Estado |
|---|---|---|
| V1 · el prompt incluye todo y lista los archivos | Generar con tipo, stack, nivel, playbooks y 3 tecnologías; leer el textarea y `#filelist` | ✅ |
| V2 · sin Supabase la página funciona entera | `Sesion.activo() === false` y `#authbtn.hidden === true`; guardar y recuperar una combinación | ✅ |
| V3 · al entrar, lo local se sube | `migrarLocales()` con combinaciones en `localStorage` | ⏳ hay proyecto real, pero está pausado (ver `status.md`) |
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

Que el navegador centre un `<dialog>`, que `fetch` traiga un archivo o que Supabase respete RLS. Lo primero es del navegador, lo último **se verifica una vez de verdad** — con dos cuentas distintas, según el playbook — y después se confía en las políticas.
