# Review del loop obsidian-cerebro @ aba801a
**Veredicto:** APPROVED

Reviewer independiente (R30, tier ALTO), worktree propio `sdd-universal-loop-rev` (rama `v0.36-loop-rev` = `aba801a`). Todo lo de abajo lo re-ejecuté yo; no copié la bitácora. Sin llamadas a OpenAI, sin leer `.env`, sin tocar `Documents\Cerebro` (medí sobre copias en el scratchpad) ni la config de Claude Code.

**APPROVED quiere decir que el loop puede cerrarse con este estado**, no que los seis objetivos se cumplan. El cierre es **`cortado`**: se llegó al tope de 10 vueltas y el objetivo 3 no se cumple. No es `cumplido`, porque `loops.md` §2 pide los seis objetivos para eso. La evidencia de la bitácora es honesta: reproduje cada número.

## Objetivos

| # | Objetivo | Estado | Evidencia re-ejecutada @ aba801a |
|---|---|---|---|
| 1 | `web/tests` en `fail 0` | **CUMPLIDO** | `node --test "web/tests/*.test.mjs"` → tests 74 · pass 74 · fail 0. `node web/tests/smoke/smoke.mjs` → `PASS smoke: 22 pasos, 0 errores de consola` |
| 2 | `cerebro/tests` en OK, sin red ni modelos, y en CI | **CUMPLIDO** | venv: `Ran 219 … OK`. venv con `CEREBRO_SIN_MODELO=1`: `OK (skipped=1)`. Python 3.14 del sistema: `OK (skipped=3)`; los 3 salteados tienen motivo (falta `fastembed`/`mcp`). GitHub: `cerebro` en 702760a es **success** (la corrida en 8021374 falló y se corrigió en 702760a, como dice la bitácora). `web` en 30caaad es **success**. De 702760a a aba801a no cambió nada en `cerebro/**`, y de 30caaad a aba801a solo cambiaron `sdd/cards` y `current.md`, así que la CI verde cubre el código revisado. El remoto está en 63719a6; aba801a no está pusheado, pero solo suma una línea de bitácora |
| 3 | Las 10 consultas fijas con MiniLM, top 5 en ≥3 de 5 por escenario | **NO CUMPLIDO** (deuda, decisión del owner) | Copia del Cerebro real (`meta`: MiniLM, 384, esquema 2) y Cerebro nuevo sembrado con `importar-sdd` del worktree (71 notas). Los dos dan lo mismo. **S39** `[1, 1, 1, 2, 2]` → 5/5 ✓. **S42** `[9, >30, 14, 12, 18]` → 0/5 ✗. Control S42: `[1, 2, >30]`. Coincide con la bitácora puesto por puesto. **No se ajustó nada para forzarlo:** `cerebro/indice.py` no existía en `4cc292e` (es todo nuevo) y no cambia desde 7d95dbf (C-7), anterior a la primera medición de C-8. De 7d95dbf a aba801a, en `cerebro/` solo cambió `tests/test_notas.py` (fix de CI de `listar`). C-9 (mpnet) quedó sin merge (`v0.36-C-9` no es ancestro de aba801a). El único cambio de contenido es la aclaración de S42 en `scenarios.md` (e654c9e). Está declarado en la bitácora, no alcanzó el objetivo y después se dejó de ajustar |
| 4 | MCP conectado y `buscar` con `fuente` | **CUMPLIDO** | `claude mcp list` → `cerebro: …\.venv\Scripts\python.exe …\cerebro\mcp_server.py - ✔ Connected`. `claude mcp get cerebro` → `Scope: User config`, `CEREBRO_DIR=…\Documents\Cerebro`, `CEREBRO_EMBEDDINGS=local`. Una sesión `claude -p … --allowedTools mcp__cerebro__buscar` desde `%TEMP%` devolvió S39, S42 y H22, cada uno con su `fuente: sdd-universal/scenarios.md#S39` (…`#S42`, `examples/hallazgos-2026-10.md#H22`) |
| 5 | OpenAI igual o mejor; sin clave, error claro y el local sigue | **CUMPLIDO** (la parte paga, por la bitácora) | La bitácora mide con OpenAI S39 `(1,1,1,1,2)` contra `(1,1,1,2,2)` local, y S42 `(7,>30,17,2,17)` contra `(9,>30,14,12,18)` local. El top 3 de OpenAI es igual o mejor en las 10 consultas (S42 entra al top 3 una vez). Ver H3 sobre el puesto 14→17. **Camino sin clave reproducido:** `git archive` de `cerebro/` a una carpeta sin `.env` (`config.ruta_env()` → no existe) y sin `OPENAI_API_KEY` en el entorno. `CEREBRO_EMBEDDINGS=openai buscar` → `error: falta la clave de OpenAI: … Sin clave podés usar CEREBRO_EMBEDDINGS=local` **rc=2**. `indexar --todo` → mismo mensaje, rc=2, y el índice queda intacto. Inmediatamente después, `CEREBRO_EMBEDDINGS=local buscar` → S39 1.º, rc=0. Código: `OpenAIEmbedder.__init__` falla sin clave antes de importar `openai` o tocar la red (`embedders.py:190-195`), y la clave se busca en el entorno y después en el `.env` (`config.py:50-64`). `.env` está ignorado (`.gitignore:16`) y no está trackeado |
| 6 | `verify --quick` verde, sin DRIFT abierto, grafo conectado | **CUMPLIDO en el núcleo** (falta el «sí» explícito del owner a la captura nueva, ver H1) | `verify.py --quick` → `VERDE — 0 FAIL, 0 WARN`. `--full` → `VERDE — 0 FAIL, 1 WARN` (sin `lint`), 178 tests OK. El único DRIFT (objetivo 3) está decidido por el owner y no queda ninguno abierto. Grafo: abajo |

### Grafo (medido por mí: links markdown y de referencia, fuera de bloques de código y código inline, `git ls-files "*.md"` sin carpetas con punto; no hay `[[wikilinks]]` ni MD sin trackear en el checkout del owner)

- **Alcance de C-10** (raíz, `agents/`, `playbooks/`, `prompts/`): **50 MD, 1 componente, 0 aislados**. En `4cc292e` eran 41 componentes y 39 aislados.
- **Repo entero:** 173 MD, **99 sin ningún link de entrada ni de salida**, 213 aristas (pares únicos de archivos). Componente mayor: 60 nodos (los 50 del núcleo más 10 de `sdd/`: README, changelog, contracts, costs, decisions, design, security, spec, status, testing).

| Carpeta | Aislados / MD |
|---|---|
| (raíz) | 0 / 20 |
| agents | 0 / 8 |
| playbooks | 0 / 13 |
| prompts | 0 / 9 |
| sdd | 68 / 78 (tarjetas, loops, `progress/`) |
| skills | 16 / 16 |
| imports | 10 / 10 |
| harness | 2 / 2 |
| cerebro | 1 / 1 |
| dev | 1 / 1 |
| examples | 1 / 15 (`hallazgos-2026-10.md`) |

Además, `examples/` + `examples/turnos/` forman un **segundo grupo de 14 nodos** separado del núcleo. **Conclusión:** los puntos sueltos de la captura del owner son **solo** MD fuera del alcance de C-10 (`sdd/`, `skills/`, `imports/`, `harness/`, `cerebro/`, `dev/`, `examples/`). Dentro del alcance no queda ninguno suelto.

## Contrato del loop

- **Tarjetas:** C-1 a C-7, C-10 y C-11 están en `done`, cada una con `review_<ID>.md` en `**Veredicto:** APPROVED` (C-1 @ 2fcf6b7, C-2 @ 8965144, C-3 @ 1c795aa, C-4 @ 12b1bd1, C-5 @ 8cf57af, C-6 @ 9b71e38, C-7 @ 7d95dbf, C-10 @ 406a5c5, C-11 @ 1245f98). C-9 está `blocked` con motivo escrito (descartada por el owner, sin merge, `sdd/cards/C-9.md:18`). C-8 es trabajo del leader y no tiene tarjeta, como dice el loop. `verify` → «Tarjetas válidas (16)».
- **Tope de 10 vueltas:** C-1, C-2, C-5, C-4, C-3, C-6, C-7, C-9 (blocked, cuenta), C-10 y C-11 suman 10. No se pasó. Después de la 10.ª no se despachó ninguna tarjeta.
- **Firmas repetidas / 3 iteraciones por tarjeta** (`orchestration.md` §6): C-3 (3 CHANGES_REQUESTED) y C-11 (2) se re-despacharon con un escalón más de modelo en la vuelta 3 o 4. Esa salida está permitida («subir un escalón de modelo»), y cada vuelta trajo hallazgos distintos, no la misma firma.
- **OKs antes de actuar:** venv («OK venv») antes de C-3/C-4/C-6; «OK instalar, OK MCP» (d2ea6e9) antes de `instalar.ps1` y `claude mcp add`; «Probar con OpenAI» antes de la primera llamada paga (86b7f05 → fcdeaf2); push de la rama (8021374) antes de la primera corrida de CI en GitHub (18:24, sobre 8021374). Sin PR ni merge a `main`. **No encontré ninguna violación.**
- **DRIFT:** el de mpnet (e9b3589) y su reversión a MiniLM con el objetivo 3 nuevo (6c9a687) quedaron registrados en el loop y en la bitácora. Las consultas se fijaron en 6c9a687 y las de control en 003f4e8, las dos veces antes de editar S42.

## Hallazgos

- **H1 (media, cierre):** el objetivo 6 pide la confirmación del owner. Su último «sí» («se ve conectado») fue **anterior** a C-10, y la captura nueva quedó en «lo confirma la review del loop». Esta review confirma que los sueltos están todos fuera del alcance, pero en el repo entero quedan 99 de 173 MD aislados (57 %) y el grupo `examples/turnos` va aparte. Para dar el 6 por cumplido, el owner tiene que aceptar explícitamente que «grafo conectado» = núcleo del paquete. Si no, va como deuda.
- **H2 (media, cierre):** `sdd/loops/obsidian-cerebro.md` sigue en `estado: corriendo` y con «Resumen al cortar (vacío)». Además, `sdd/changelog.md` no tiene la 0.36 y `sdd/status.md` no tiene la feature. El cierre tiene que pasar el estado a **`cortado`** (no `cumplido`), escribir el resumen y anotar las lecciones en el Cerebro (`loops.md` §2), y sumar el changelog (R13) y el status.
- **H3 (baja):** la bitácora dice «OpenAI igual o mejor que local en las 10». Eso vale a la granularidad del top 3 que pide el objetivo. Por puesto, «copiaron un archivo para que el test pase» empeora de 14 a 17. Además, la comparación «mismo top 3» (los tres resultados) no quedó guardada en disco: solo hay puestos. No cambia el estado del objetivo 5.
- **H4 (baja):** el Cerebro real (`Documents\Cerebro`) quedó **desactualizado** respecto del repo. Después de C-10, `importar-sdd` del worktree cambia 10 notas (s15, s16, s20, s24, s28, s31, s33, s34, s39, s41) solo por el formato de links. Los puestos del objetivo 3 no cambian (medí los dos).
- **H5 (baja):** `importar-sdd` copia al Cerebro los links relativos que trae `scenarios.md` desde C-10 (p. ej. `[loops.md](loops.md)`, `[…](playbooks/obsidian-cerebro.md)`, en 10 notas). En el vault del Cerebro esos archivos no existen, así que en Obsidian salen como links rotos o nodos fantasma. Habría que reescribirlos a texto o código al importar.
- **H6 (baja, arnés):** `verify.py --full` corre `web/tests` y `harness/tests`, pero no `cerebro/tests`. El comando `test` de la config no los incluye, así que la verificación local completa no cubre `cerebro/` (solo la CI de GitHub lo hace).
- **H7 (info):** el MCP registrado apunta a `…\sdd-universal\cerebro\mcp_server.py` del checkout principal, que hoy está en `v0.36-obsidian-cerebro`. Si ese checkout pasa a `main` antes del merge, `cerebro/` desaparece y el MCP deja de conectar.

## Deudas abiertas al cerrar

1. **Objetivo 3 / S42:** 0 de 5 en top 5 con MiniLM (con OpenAI, 1 de 5). Es una deuda decidida por el owner.
2. Confirmación explícita del owner sobre el alcance del grafo (H1). Si el alcance tiene que ser el repo entero, los 99 MD aislados de `sdd/`, `skills/` e `imports/` y el grupo `examples/turnos` quedan como deuda.
3. Cierre formal (H2): `cortado`, resumen, lecciones al Cerebro, changelog 0.36 y status.
4. Re-importar el Cerebro real (H4) y limpiar los links relativos en `importar-sdd` (H5).
5. `cerebro/tests` en `verify.py --full` (H6).
6. Merge a `main` con OK (R01), para que el MCP no dependa de la rama del loop (H7).
7. Rama `v0.36-C-9` sin merge, que queda como registro: borrarla o conservarla, a decisión del owner.

## Mejoras al arnés detectadas
- Un check de `verify` que recorra los MD del alcance «paquete» y falle si alguno queda aislado. El mismo script de esta review alcanza, y evitaría que el grafo se rompa de nuevo sin que nadie lo note.
- Sumar `cerebro/tests` al comando `test` de `harness.config.json` (H6).
