# Review L-4 @ addc1f6
**Veredicto:** APPROVED

Diff revisado: `git diff 328c604..addc1f6` — `web/tests/smoke/smoke.mjs` (nuevo, 318 líneas), `.github/workflows/web.yml` (job `smoke`), `sdd/progress/v0.35-L-4/{current,handback_L-4}.md`. Nada fuera de la zona.

## Verificación re-ejecutada
```text
$ python harness/verify.py --changed
verify.py --changed @ addc1f6 (rama v0.35-L-4)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
$ git show 328c604:harness.config.json
fatal: path 'harness.config.json' does not exist in '328c604'
```
El FAIL es preexistente (la base tampoco tiene `harness.config.json`), del repo y no de la tarjeta; es la zona de L-6. Mismo criterio que la review de L-1.

```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ pass 49
ℹ fail 0
```

Smoke en verde, 3 corridas seguidas (flakiness), y procesos/perfiles después:
```text
run 1 exit=0 t=5s   PASS smoke: 22 pasos, 0 errores de consola
run 2 exit=0 t=6s   PASS smoke: 22 pasos, 0 errores de consola
run 3 exit=0 t=5s   PASS smoke: 22 pasos, 0 errores de consola
chrome.exe con sdd-smoke- en la línea de comandos: 0
node.exe con smoke.mjs: 0
$TEMP/sdd-smoke-*: 0
```

Rojo forzado propio A — `console.error` solo en una vista (`/web/reglas`), sin romper el DOM (agregado al final de `web/reglas-ui.js`, revertido con `git checkout web/reglas-ui.js`):
```text
$ echo 'if (location.pathname === "/web/reglas") console.error("rojo forzado reviewer: consola solo en reglas");' >> web/reglas-ui.js
$ node web/tests/smoke/smoke.mjs 2>&1 | tail -8; echo "exit=${PIPESTATUS[0]}"
ok   ruta /web/demo sirve su página
ok   descarga rápida: «Proyectos» trae cards con ZIP
ok   descarga rápida: el popup baja la carpeta del proyecto

Errores de la página (1):
  - [/web/reglas] console.error: rojo forzado reviewer: consola solo en reglas

FAIL smoke: la página tiró errores (22 pasos ok antes)
exit=1
```

Rojo forzado propio B — ruta `/web/tecnologias` rota (`Rutas.vistaDe` deja de reconocerla, `web/rutas.js:26`, revertido con `git checkout web/rutas.js`):
```text
$ sed -i '26s/.../return VISTAS.includes(resto) \&\& resto !== "tecnologias" ? resto : null;/' web/rutas.js
$ node web/tests/smoke/smoke.mjs 2>&1 | tail -6; echo "exit=${PIPESTATUS[0]}"
ok   primera visita: /web/ lleva a /web/preferencias y se puede cerrar
ok   ruta /web/inicio muestra su vista
ok   ruta /web/catalogo muestra su vista
ok   ruta /web/combinador muestra su vista

FAIL smoke: ruta /web/tecnologias muestra su vista: visibles: inicio (8 pasos ok antes)
exit=1
```

Tope a mitad de corrida (no solo al arrancar, como el handback) y limpieza:
```text
$ SMOKE_TIMEOUT_MS=1500 node web/tests/smoke/smoke.mjs
FAIL smoke: tope global de 1.5 s (10 pasos ok antes)      exit=1, 4.7 s total
$ SMOKE_TIMEOUT_MS=800 node web/tests/smoke/smoke.mjs
FAIL smoke: tope global de 0.8 s (0 pasos ok antes)       exit=1, 4.0 s total
chrome.exe colgados: 0 · perfiles sdd-smoke-* en $TEMP: 0
$ git status --short
(vacío)
```

Workflow (PyYAML 3.11): parsea; `jobs.smoke` = `ubuntu-latest`, `timeout-minutes: 10`, checkout@v5, setup-node@v5 (Node 24, `WebSocket` global estable), `google-chrome --version`, `node web/tests/smoke/smoke.mjs`; `on: [push, pull_request]`. El job `tests` no cambió y su glob `web/tests/*.test.mjs` no levanta el smoke (no es `*.test.mjs` ni está en ese nivel).

## Criterios de aceptación
1. [x] Node puro: solo imports `node:*` y `WebSocket` global (`smoke.mjs:11-16`); sirve el repo (`servir`, `:46`), carga y junta `Runtime.exceptionThrown`, `console.error|assert` y `Log.entryAdded` error (`:161-170`). Rojo A demuestra que un `console.error` aislado da rojo aunque los 22 pasos pasen.
2. [x] Cubierto de verdad, no solo «carga»: generar (`#out` visible, prompt ≥300, archivos y árbol esperados, `:204-214`); cambio de nivel NOVATO→PRO con aserciones sobre prompt, lista y árbol (`:215-221`); checkbox del arnés saca y repone `harness/` (`:222-227`); las 11 vistas de `Rutas.VISTAS` por su ruta exigiendo exactamente una `.vista` visible y la correcta (`:238-244`, rojo B lo prueba) + navegación sin recarga + `/web/admin|guia|demo`; descarga rápida con chip «Proyectos», popup, `#zrdl` e intercepción de `Zip.descargar` validando nombre, 5 rutas, sin vacíos y «Listo» (`:257-277`).
3. [x] Comando en la cabecera del script (`:5`); job `smoke` en `web.yml` con el Chrome de la imagen (`which google-chrome` → `/usr/bin/google-chrome`), `--headless=new`, `--no-sandbox --disable-dev-shm-usage` en Linux (`:95-100`), tope 120 s del script dentro de `timeout-minutes: 10`. La corrida en Actions queda pendiente de push (lo dice la tarjeta).
4. [x] Rojo del implementer (`throw` en `combinador.js`) pegado; además mis dos rojos distintos arriba.
5. [x] Sin `package.json`, lock ni `node_modules` en el diff.

## Checkpoints
- C1: [x] Suite 49/49 y smoke verde re-ejecutados; `verify.py` rojo idéntico en la base por falta de `harness.config.json` (preexistente, fuera de zona, declarado en el handback).
- C2: [x] Cada criterio con evidencia re-ejecutada; solo `web/tests/smoke/**`, `web.yml` y los archivos de progreso permitidos.
- C3: [x] ADR-001 (sin dependencias) y ADR-015 (rutas `/web/<vista>`, páginas `admin|guia|demo`, barra final 308) respetados; Supabase vacío = modo V2.
- C4: [x] Verificación propia: 3 verdes, 2 rojos propios distintos, tope a mitad de corrida; rojo inicial medido contra `328c604` (el archivo no existía). Nada skipeado.
- C5: [x] Handback completo y commiteado, `current.md` al día, sin throwaway ni secretos; `CHROME_PATH` y `SMOKE_TIMEOUT_MS` documentadas.

## Observaciones (no bloquean)
- Puertos libres en los dos lados: HTTP con `listen(0)` (`:288`) y CDP con `--remote-debugging-port=0` + `DevToolsActivePort` (`:97,106-113`).
- El `finally` (`:298-309`) cierra Chrome (`Browser.close` con tope de 2 s, después `kill`), el servidor (`closeAllConnections` + `close`) y el perfil, también en tope; si el tope gana la carrera, las promesas tardías quedan atendidas por `Promise.race` y no hay rechazos sin manejar. Verificado sin procesos colgados.
- Si Chrome muere a mitad de corrida, los `cdp.enviar` pendientes no se rechazan (`Cdp` no escucha `onclose`): el smoke recién corta por el tope de 120 s. Aceptable con el tope; un `ws.onclose` que rechace los pendientes daría un error más rápido y claro.
- El ruteo del servidor del smoke duplica el de `dev/servidor.mjs` (ya anotado en el handback). Un test en `web/tests/rutas.test.mjs` que compare ambos evitaría que diverjan.
- `Log.entryAdded` de nivel error hace que cualquier 404 de recurso (p. ej. un ícono) dé rojo: es lo deseable, pero conviene saberlo al leer una falla en CI.

## Mejoras al arnés detectadas
- Commitear un `harness.config.json` en la raíz del paquete (L-6) que corra `node --test "web/tests/*.test.mjs"` y `node web/tests/smoke/smoke.mjs`, así C1 deja de depender de una excepción.
- `sdd/testing.md` («Smoke en navegador real») y D2 en `status.md` quedan para el leader cuando el job corra verde en Actions.
