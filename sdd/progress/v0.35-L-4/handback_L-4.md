# Handback L-4 — Smoke de la interfaz por CDP en el repo y en CI (cierra D2)

- **Estado:** done
- **Rama / commit:** `v0.35-L-4` @ `f921390` (código; este handback va en el commit siguiente, que solo suma este archivo)
- **Quién:** implementer (MEDIO) | loop dev-de-10, vuelta de L-4

## Hecho
- `web/tests/smoke/smoke.mjs`: smoke en Chrome headless por CDP con el `WebSocket` nativo de Node, sin dependencias. Comando: `node web/tests/smoke/smoke.mjs` (documentado en la cabecera del script).
- Sirve el repo con un servidor estático propio (puerto libre, `listen(0)`), con las rutas reales `/web/<vista>` (ADR-015: `/web/admin|guia|demo` → su página, el resto → `index.html`, barra final → 308) y `supabase-config.js` vacío, así la página corre entera contra `localStorage` y sin red.
- Junta `Runtime.exceptionThrown`, `console.error`/`console.assert` y `Log.entryAdded` de nivel error (recursos que no cargan incluidos): cualquiera da rojo aunque los pasos pasen.
- 22 pasos: combinador (generar → prompt, lista de archivos y árbol; nivel NOVATO→PRO; checkbox del arnés saca/pone `harness/`), primera visita (`/web/` → `/web/preferencias`, se cierra el onboarding), las 11 vistas de `Rutas.VISTAS` por su ruta, una navegación sin recargar desde el menú, `/web/admin|guia|demo`, y la descarga rápida (chip «Proyectos», popup, `#zrdl`, `Zip.descargar` interceptado: nombre `.zip`, `PROMPT-DE-ARRANQUE.txt`, `LEEME.md`, `.gitignore`, `sdd/SDD-MASTER.md`, `sdd/playbooks/env-setup.md`, ningún archivo vacío, mensaje «Listo»).
- Robustez: Chrome por `CHROME_PATH` o rutas estándar (Windows `Program Files`/`(x86)`/`LOCALAPPDATA`, macOS, Linux con `which google-chrome|google-chrome-stable|chromium|chromium-browser`); puerto de depuración libre (`--remote-debugging-port=0` + `DevToolsActivePort`); en Linux `--no-sandbox --disable-dev-shm-usage`; tope global (120 s, `SMOKE_TIMEOUT_MS`); en el `finally` siempre `Browser.close` → `kill` → cierre del servidor → borrado del perfil temporal.
- `.github/workflows/web.yml`: job nuevo `smoke` en `ubuntu-latest` (Node 24, `timeout-minutes: 10`, `google-chrome --version` para diagnóstico y `node web/tests/smoke/smoke.mjs`). El job `tests` queda igual.

## No hecho / pendiente
- La corrida en CI: queda para cuando haya push autorizado (sin push, como pide la tarjeta). El workflow se validó leyendo su sintaxis (abajo).
- `python harness/verify.py --changed` da ROJO por `falta harness.config.json` — es el objetivo 6 del loop y la zona de L-6, no de esta tarjeta (ver «Fuera de zona»).
- Tachar D2 en `status.md` y documentar el comando en `sdd/testing.md`: fuera de mi zona (`sdd/`), queda para el leader.

## Cómo
- **No reutilicé `dev/servidor.mjs`:** `levantar()` arranca el clúster de Postgres antes de abrir el HTTP y `estatico()` no se exporta. El servidor del smoke copia sus reglas de ruteo (mismo patrón `/^\/web\/([a-z][a-z0-9-]*)(\/)?$/`, misma lista `PAGINAS`, mismo filtro de rutas con punto y traversal).
- **Supabase vacío en vez del real:** el `supabase-config.js` del repo apunta a la nube; con él el smoke dependería de la red y mandaría métricas. Vacío es exactamente el modo V2 («sin Supabase la página funciona entera»).
- **CDP por la conexión del browser con `Target.attachToTarget({flatten: true})`:** una sola conexión WebSocket y sesiones por `sessionId`; evita `/json/new` (que en Chrome reciente pide `PUT`).
- **Primera visita:** el perfil de Chrome es nuevo, así que `/web/` lleva al onboarding; el smoke lo verifica como comportamiento (0.34) y lo cierra antes de recorrer las vistas, en vez de sembrar `localStorage`.
- Descartado: Playwright/Puppeteer (dependencias, ADR-001).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| web/tests/smoke/smoke.mjs | nuevo: servidor estático, lanzador de Chrome, cliente CDP y los 22 pasos |
| .github/workflows/web.yml | job nuevo `smoke`; comentario de cabecera actualizado |
| sdd/progress/v0.35-L-4/current.md | plan de la tarjeta |
| sdd/progress/v0.35-L-4/handback_L-4.md | este handback |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. Script Node sin dependencias en `web/tests/smoke/` que sirve, carga y falla con excepciones o errores de consola | `smoke.mjs` (solo `node:*` y `WebSocket` global); rojos forzados por excepción y por `console.error` abajo |
| 2. Generar, archivos y árbol, nivel, arnés, vistas por `/web/<vista>`, descarga rápida con «Proyectos» e intercepción de `Zip.descargar` | pasos `combinador: …`, `ruta /web/<vista> …`, `descarga rápida: …` en la corrida verde |
| 3. Local con comando documentado y en CI con el Chrome de `ubuntu-latest` | corrida local verde; job `smoke` en `web.yml` (sintaxis validada) |
| 4. Rojo forzado con un `throw` en `combinador.js`, cola pegada | abajo |
| 5. Ninguna dependencia | `git diff --stat 328c604..HEAD`: no hay `package.json` ni `node_modules`; el script importa solo `node:http`, `node:child_process`, `node:fs`, `node:os`, `node:path`, `node:url` |

Rojo antes (R29), medido contra la base — el smoke no existía:
```text
$ git rev-parse --short HEAD
328c604
$ git show 328c604:web/tests/smoke/smoke.mjs
fatal: path 'web/tests/smoke/smoke.mjs' exists on disk, but not in '328c604'
$ git show 328c604:.github/workflows/web.yml | grep -c smoke
0
```

Rojo forzado 1 — `throw` en `combinador.js` (línea 10, sin commitear, revertido con `git checkout web/combinador.js`):
```text
$ sed -i '9a throw new Error("rojo forzado L-4");' web/combinador.js
$ node web/tests/smoke/smoke.mjs; echo "exit=$?"
ok   combinador: la vista está a la vista

Errores de la página (2):
  - [/web/combinador] excepción: Error: rojo forzado L-4
    at http://127.0.0.1:56219/web/combinador.js?v=35:10:7
  - [/web/combinador] excepción: ReferenceError: buildPrompt is not defined
    at $.onclick (http://127.0.0.1:56219/web/manuales.js?v=35:94:3)
    at <anonymous>:9:13
    at <anonymous>:17:87

FAIL smoke: combinador: generar arma prompt, lista de archivos y árbol: #out no se mostró (1 pasos ok antes)
exit=1
```

Rojo forzado 2 — solo un `console.error` al final de `inicio.js`, sin romper el DOM (los 22 pasos pasan y aun así da rojo; cola, `tail -8`):
```text
$ echo 'console.error("rojo forzado L-4: consola");' >> web/inicio.js
$ node web/tests/smoke/smoke.mjs 2>&1 | tail -8; echo "exit=${PIPESTATUS[0]}"
  - [/web/perfil] console.error: rojo forzado L-4: consola
  - [/web/preferencias] console.error: rojo forzado L-4: consola
  - [/web/configuracion] console.error: rojo forzado L-4: consola
  - [/web/comunidad] console.error: rojo forzado L-4: consola
  - [/web/login] console.error: rojo forzado L-4: consola
  - [/web/catalogo] console.error: rojo forzado L-4: consola

FAIL smoke: la página tiró errores (22 pasos ok antes)
exit=1
```

Rojos de la infraestructura (sin Chrome y tope), y que no queda nada colgado:
```text
$ CHROME_PATH=/no/existe node web/tests/smoke/smoke.mjs; echo "exit=$?"
FAIL smoke: No se pudo abrir Chrome (spawn C:/Estudio_Trabajo/Git/no/existe ENOENT); revisá CHROME_PATH. (0 pasos ok antes)
exit=1
$ SMOKE_TIMEOUT_MS=300 node web/tests/smoke/smoke.mjs; echo "exit=$?"

FAIL smoke: tope global de 0.3 s (0 pasos ok antes)
exit=1
$ powershell … (Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object CommandLine -like '*sdd-smoke-*').Count
0
$ ls "$TEMP" | grep -c sdd-smoke
0
```

Verde después (Windows local, @ f921390):
```text
$ node web/tests/smoke/smoke.mjs; echo "exit=$?"
ok   combinador: la vista está a la vista
ok   combinador: generar arma prompt, lista de archivos y árbol
ok   combinador: el cambio de nivel regenera lista y árbol
ok   combinador: el checkbox del arnés saca y pone harness/
ok   primera visita: /web/ lleva a /web/preferencias y se puede cerrar
ok   ruta /web/inicio muestra su vista
ok   ruta /web/catalogo muestra su vista
ok   ruta /web/combinador muestra su vista
ok   ruta /web/tecnologias muestra su vista
ok   ruta /web/reglas muestra su vista
ok   ruta /web/manuales muestra su vista
ok   ruta /web/perfil muestra su vista
ok   ruta /web/preferencias muestra su vista
ok   ruta /web/configuracion muestra su vista
ok   ruta /web/comunidad muestra su vista
ok   ruta /web/login muestra su vista
ok   navegar sin recargar: el menú lleva al catálogo
ok   ruta /web/admin sirve su página
ok   ruta /web/guia sirve su página
ok   ruta /web/demo sirve su página
ok   descarga rápida: «Proyectos» trae cards con ZIP
ok   descarga rápida: el popup baja la carpeta del proyecto

PASS smoke: 22 pasos, 0 errores de consola
exit=0
```

Suite sin navegador, sin cambios (cola, `tail -8`):
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ suites 0
ℹ pass 49
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 239.5579
```

Workflow validado (sintaxis, con PyYAML de Python 3.11; no hay `actionlint` en la máquina):
```text
$ py -3.11 -c "import yaml; d=yaml.safe_load(open('.github/workflows/web.yml')); …"
tests ubuntu-latest None ['actions/checkout@v5', 'actions/setup-node@v5', 'node --test "web/tests/*.test.mjs"']
smoke ubuntu-latest 10 ['actions/checkout@v5', 'actions/setup-node@v5', 'google-chrome --version', 'node web/tests/smoke/smoke.mjs']
on: ['push', 'pull_request']
```

Arnés:
```text
$ python harness/verify.py --changed
verify.py --changed @ f921390 (rama v0.35-L-4)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
```
Probé copiar la plantilla `harness/harness.config.example.json` a la raíz (sin commitear, borrada después): no sirve para este repo (busca `sdd/SDD-MASTER.md`, corre `npm test` sin `package.json`), o sea que el config real es trabajo de L-6. No improvisé uno.

## Fuera de zona / riesgos
- **`harness.config.json` (L-6):** sin él `verify.py --changed` no puede dar verde en ninguna rama del loop. Cuando L-6 entre, conviene que el config declare también el smoke (`node web/tests/smoke/smoke.mjs`) si el arnés tiene un nivel para e2e.
- **`sdd/testing.md`:** la sección «Smoke en navegador real» dice «Todavía no está en el repo»; habría que cambiarla por el comando y el job. Y `status.md` tacharía D2 cuando el job corra verde en CI (objetivo 4 del loop). No los toqué.
- **Duplicado chico:** el ruteo del servidor del smoke copia el de `dev/servidor.mjs` (patrón y `PAGINAS`). Si cambia ADR-015, hay que tocar los dos; `web/tests/rutas.test.mjs` hoy compara dev contra `vercel.json`, no contra el smoke.
- **CI no corrido todavía:** el arranque de Chrome en `ubuntu-latest` (`--no-sandbox`, `/usr/bin/google-chrome` vía `which`) es lo único que no pude ver andar. Si falla, el error sale con el stderr de Chrome en la salida del job.

## Cambios de spec sugeridos
- `sdd/testing.md`, «Smoke en navegador real»: «Vive en `web/tests/smoke/smoke.mjs` (`node web/tests/smoke/smoke.mjs`; `CHROME_PATH` si Chrome no está en la ruta estándar) y corre en el job `smoke` de `web.yml`. Sirve el repo sin Postgres y con Supabase vacío (V2).»

## Variables de entorno nuevas
- `CHROME_PATH` — ruta del ejecutable de Chrome si no está en la ruta estándar de la plataforma — opcional, en la shell o en el job.
- `SMOKE_TIMEOUT_MS` — tope global del smoke (default 120000) — opcional.

## Próximo paso sugerido
- Con push autorizado, ver el job `smoke` verde en Actions y tachar D2 en `status.md` (L-5).
