# Review dev-de-10 @ 6b82aef

**Veredicto:** APPROVED

- **Rol:** reviewer independiente (R30, R33 · `loops.md`); no implementé ninguna tarjeta del loop.
- **Rama / hash:** `v0.35-loops-grafo` @ `6b82aef` (árbol limpio antes de este review).
- **Leído:** `sdd/loops/dev-de-10.md`, `sdd/progress/v0.35-loops-grafo/current.md`, `sdd/changelog.md` §0.35.0, `sdd/status.md`, `sdd/cards/*.md`, los `review_L-*.md`.
- Los seis objetivos los re-ejecuté yo, en esta máquina (Windows, Node 24, Python, Chrome, Postgres local), @ `6b82aef`. Salida literal abajo (la línea `exit N` la agrega mi wrapper).

## Objetivo 1 · `web/tests` → fail 0 — CUMPLIDO (49/49)

```text
$ node --test "web/tests/*.test.mjs"
✔ M3: el prompt y el ZIP salen del mismo estado aunque se cambie algo después de generar (8.5299ms)
✔ M3: cambiar las reglas en el configurador también regenera (2.1877ms)
✔ W15/N4: el perfil tiene una sola fuente, y CONFIANZA del configurador apaga R01 (2.4865ms)
✔ N5: un tipo LITE lo dice en la UI aunque el modo sea FULL (2.8397ms)
✔ M6: una tecnología de afuera entra al prompt en una línea, sin control y con tope (3.4381ms)
✔ M6: el link y las guardadas pasan por el mismo filtro al cargar (0.4188ms)
✔ W16: «Sumar igual» y el chip escapan lo que escribió la persona (2.3215ms)
✔ link compartido: writeURL no borra el ?c= de /web/combinador (8.007ms)
✔ N3: los conteos del README y de la web coinciden con los archivos (6.1602ms)
✔ H24: la lección de Pydantic sobre @field_validator viaja con FastAPI (2.2341ms)
✔ RAG: pgvector y embeddings en el catálogo, con su lección (OWASP LLM) (2.0142ms)
✔ R2/H24: la lección de Pydantic describe el síntoma real (1.9182ms)
✔ IA: el prompt pide recorrer OWASP LLM01–LLM10 y separar al que lee del que actúa (3.631ms)
✔ H1: existe el stack Python back + React/TS front, también en el select (2.2903ms)
✔ H2/H10/H15: las tecnologías que faltaban están, y tecnologias.md va en sincronía (3.4156ms)
✔ H2: una tecnología pedida que no está en el catálogo se avisa, no se pierde (1.0491ms)
✔ H17 y Anthropic: las lecciones viajan con la tecnología al prompt y al MD (0.5196ms)
✔ H3: con R01 apagada el prompt no promete esperar el OK del commit (0.9345ms)
✔ H14: existe el tipo Mesa de ayuda / ticketera, con su card (0.3467ms)
✔ H14: IA en el producto suma N4, R12 y el playbook; sin IA no aparece (0.9956ms)
✔ playbooks nuevos: ia-en-el-producto y go-live en el catálogo, Manuales y el ZIP (2.6282ms)
✔ H4: el modo LITE usa la plantilla prompts/sdd-lite.md y el ZIP la trae (0.4142ms)
✔ O1, O2 y O4 se calculan contra sus metas (3.1738ms)
✔ sin datos no hay porcentaje inventado (0.2386ms)
✔ la clase de dispositivo es gruesa y nunca sale del user-agent (1.2495ms)
✔ el panel carga el reporte y usa la vista de 30 días (0.5839ms)
✔ W10: O4 no cuenta las llegadas sin clase (las de antes de 0.33) (0.1691ms)
✔ W11: la meta es «más de»: llegar justo no alcanza (0.166ms)
✔ N6: un lugar largo se corta antes de pegar la clase, así la visita no se pierde (0.3593ms)
✔ PRO con arnés: trae la capa de ejecución completa (27.9376ms)
✔ lo que trae la capa de ejecución no cita prompts/ ni agents/ que falten (14.6954ms)
✔ H4: la plantilla sdd-lite.md viaja con las otras de prompts/ (22.5449ms)
✔ H5: .gitattributes junta en el merge los historiales de sdd/, también el de LITE (12.2455ms)
✔ el pre-commit sale ejecutable y nada más lo es (12.2453ms)
✔ NOVATO: sin agents/ ni harness-fix (R31 va OFF) (5.8099ms)
✔ brownfield: el LEEME dice que hay que llevarse harness/ y agents/ (11.0296ms)
✔ la web tiene las mismas reglas que el master (6.4428ms)
✔ cada vista tiene su URL y la URL vuelve a la vista (1.5815ms)
✔ los links viejos #/x?… pasan a /web/x?… sin recargar (0.6792ms)
✔ volver: solo rutas internas bajo /web/ (sin redirección abierta) (0.7122ms)
✔ ADR-014: no hay portón en ninguna página ni en el paquete (5.2296ms)
✔ 0.34: onboarding y login son vistas con su ruta, no diálogos encima de todo (3.5726ms)
✔ ningún link de la web apunta a #/: van a la ruta (3.1358ms)
✔ cache-busting en ?v=35 (2.4926ms)
✔ vercel.json resuelve las rutas igual que dev: páginas, app y barra final (0.6405ms)
✔ /web/inicio se normaliza a /web/ (una sola URL canónica) (0.7207ms)
✔ volver a cualquier variante de login cae en /web/ (0.395ms)
✔ onboarding: «Prefiero no decir» también en el último paso (0.4692ms)
✔ dev y vercel.json resuelven las mismas páginas por nombre (0.8843ms)
ℹ tests 49
ℹ suites 0
ℹ pass 49
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 236.917
exit 0
```

## Objetivo 2 · `harness/tests` → OK, con tests de `depende_de` y ciclos — CUMPLIDO
El skip es `test_posix_linter_con_ruta_relativa_y_script` («scripts POSIX»), esperable en Windows.

```text
$ python -m unittest discover -s harness/tests
............................................................................................................................................s.....................................
----------------------------------------------------------------------
Ran 178 tests in 74.664s

OK (skipped=1)
exit 0
```

Los tests del grafo existen y pasan (`harness/tests/test_checks.py`, clase `TestGrafoDeTarjetas`, salida de `-v` filtrada):
```text
test_autodependencia_es_ciclo ... ok
test_ciclo_en_cadena_larga_se_encuentra ... ok
test_ciclo_entre_dos_falla_y_lo_muestra ... ok
test_ciclo_largo_se_informa_recortado ... ok
test_dependencia_inexistente_falla ... ok
test_dependencia_repetida_falla_una_sola_vez ... ok
test_diamante_no_es_ciclo ... ok
test_done_con_dependencia_sin_done_falla ... ok
test_formas_de_la_lista_y_dependencia_done_es_valida ... ok
test_id_vacio_no_inventa_dependencia_inexistente ... ok
test_in_progress_con_dependencia_sin_done_falla ... ok
test_pending_con_dependencia_sin_done_es_valida ... ok
test_review_con_dependencia_sin_done_falla ... ok
test_sin_depende_de_o_vacio_es_valido ... ok
```
El rojo previo (R29) quedó registrado en `sdd/progress/v0.35-L-2/review_L-2.md` y en los dos CHANGES_REQUESTED de L-2 (`abcb57c`, `a0213f6`).

## Objetivo 3 · `dev/tests` → fail 0 — CUMPLIDO (17/17, con Postgres local)

```text
$ node --test "dev/tests/*.test.mjs"
✔ una cuenta no ve, ni edita, ni borra las combinaciones de otra (909.067ms)
✔ no se puede crear una combinación a nombre de otra cuenta (100.8513ms)
✔ un perfil solo lo lee y lo edita su dueño (206.8953ms)
✔ nadie se vuelve admin desde la aplicación, ni con su propio perfil (304.9783ms)
✔ cambiar la clave desde la CLI no le saca el admin a nadie (315.7745ms)
✔ sin sesión no se lee nada, y un token falso no pasa como anon (160.8381ms)
✔ las métricas se suman sin sesión y solo las lee el admin (212.7872ms)
✔ D3: la visita lleva solo la clase de dispositivo, y la vista de 30 días es del admin (823.4295ms)
✔ M4: un anónimo no puede meter texto identificante ni elegir el día (1410.8988ms)
✔ R1: un anónimo no elige el id ni el día de un evento (665.7666ms)
✔ los valores que genera la web pasan todos el formato de eventos (74.9249ms)
✔ la combinación guarda si hay IA en el producto (269.0102ms)
✔ guardar dos veces el mismo nombre pisa la combinación, no la duplica (150.4848ms)
✔ login, usuario, refresh de un solo uso, cambio de clave, logout y registro cerrado (688.9658ms)
✔ sirve la config local y no sale del repo (18.7999ms)
✔ rutas reales: /web/<vista> recarga con la app, y nada más se abre (26.7082ms)
✔ 0.34.1: dev sirve por nombre solo las páginas de la lista, como Vercel (6.3556ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13350.9294
exit 0
```

## Objetivo 4 · D2 cerrada — CUMPLIDO

```text
$ node web/tests/smoke/smoke.mjs
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
exit 0
```

- `.github/workflows/web.yml` tiene el job `smoke` (ubuntu-latest, Node 24, `timeout-minutes: 10`, `google-chrome --version` y `node web/tests/smoke/smoke.mjs`), aparte del job `tests`. No lo vi correr en GitHub (no hubo push, R01): lo verificado es el archivo y el verde local.
- `sdd/status.md` l.53: `~~D2~~ … — **cerrada el 2026-10-06 (0.35, tarjeta L-4)**`. Tachada y con fecha.

## Objetivo 5 · Espejos EN en 0.35 — CUMPLIDO
Comparación propia (script en scratchpad, no en el repo):
```text
SDD-MASTER.md      Versión 0.35 · reglas definidas R01..R33 (33)
SDD-MASTER-EN.md   Version 0.35 · rules defined  R01..R33 (33)
SDD-COMPACT.md     v0.35 · 53 líneas · R01..R33
SDD-COMPACT-EN.md  v0.35 · 53 líneas · R01..R33
§2  filas ES 21 · EN 21 (emparejadas fila a fila, mismo orden; la última es «Dejar al agente iterando solo…» / «Letting the agent iterate alone…»)
§11 filas ES ['Versión','0.35','0.34','0.33.2','0.33.1','0.33','0.32'] · EN ['Version','0.35','0.34','0.33.2','0.33.1','0.33','0.32']
Secciones §0..§11 presentes en los dos masters, en el mismo orden.
```

## Objetivo 6 · Cero drift — CUMPLIDO

```text
$ python harness/verify.py --quick
verify.py --quick @ 6b82aef (rama v0.35-loops-grafo)

── Arnés ──
[OK]    Memoria en disco: sdd/progress/v0.35-loops-grafo/current.md
[OK]    Tarjetas válidas (6)
[OK]    Rutas citadas existen (96 revisadas)

VERDE — 0 FAIL, 0 WARN
exit 0
```

`harness.config.json` existe con `"master": "SDD-MASTER.md"`. Busqué `DRIFT` en `sdd/`: las únicas menciones son el DRIFT de L-6, resuelto con la opción A del owner (L-7 done, L-6 done), y la regla de corte del loop. Ninguno abierto.

## Tarjetas y reviews
| Tarjeta | Estado | Review | Veredicto |
|---|---|---|---|
| L-1 | done | `sdd/progress/v0.35-L-1/review_L-1.md` @ 2ede9cc | APPROVED |
| L-2 | done | `sdd/progress/v0.35-L-2/review_L-2.md` @ d0cfe53 | APPROVED |
| L-3 | done | `sdd/progress/v0.35-L-3/review_L-3.md` @ 88edd90 | APPROVED |
| L-4 | done | `sdd/progress/v0.35-L-4/review_L-4.md` @ addc1f6 | APPROVED |
| L-6 | done | `sdd/progress/v0.35-L-6b/review_L-6.md` @ b0c8bbb | APPROVED |
| L-7 | done | `sdd/progress/v0.35-L-7/review_L-7.md` @ 2840dd0 | APPROVED |

L-5 es el cierre del leader (sin tarjeta, como dice el loop); este review es su verificación. Las seis reviews están cada una en el `sdd/progress/<rama>/` de su tarjeta (`v0.35-L-<n>`), no en el de la rama del loop; es lo que pide la tarjeta y lo que cita el changelog.

## Changelog y bitácora contra `git log`
1. «L-3: 1.er review CHANGES_REQUESTED, 2.º APPROVED @ 88edd90» → `ce5e19a Review L-3 @ 1975704: CHANGES_REQUESTED` y `a609dd8 Review L-3 @ 88edd90: APPROVED (vuelta 2)`. **Verdad.**
2. «L-2: CHANGES_REQUESTED ×2 (mutantes vivos, después UnboundLocalError), APPROVED @ d0cfe53» → `abcb57c … @ f7673be: CHANGES_REQUESTED`, `a0213f6 … @ 1c19422: CHANGES_REQUESTED (vuelta 2: UnboundLocalError en Card.parse sin frontmatter)`, `2499ef8 Review L-2 @ d0cfe53: APPROVED`. **Verdad.**
3. «L-1: 33 reglas y 40 situaciones, `og.png` regenerada, `?v=35`» → `2ede9cc L-1: R33 en la web, conteos 33 reglas / 40 situaciones, og.png y ?v=35`, con `web/og.png | Bin 50676 -> 50414 bytes`; `?v=35` está en `web/index.html`, `admin.html`, `guia.html`, `demo.html`. **Verdad.**
4. Línea de base: changelog dice `83e798f` + MD de 0.35 y la bitácora `25f9ec1`; `25f9ec1` es el commit «v0.35 (MD)», hijo directo de `83e798f`. Coherentes.
5. Vueltas: bitácora v1..v8 (L-1, L-6 blocked, L-3, L-4, L-2, L-7, L-6, L-5) = 8, en el tope y sin pasarlo; coincide con «8 de 8 vueltas».

## Copia rechazada de L-6
- `sdd/SDD-MASTER.md` no existe en el árbol.
- `git log --all -- sdd/SDD-MASTER.md` no devuelve nada: la copia nunca quedó en ningún commit de ninguna rama. No hay rama `v0.35-L-6` (solo `v0.35-L-6b`), ni worktrees colgados (`git worktree list` muestra solo el principal).
- `web/tests/` no tiene el test roto de la review de L-6 (`zz-roto-review…`): fue un rojo forzado temporal, documentado en un bloque de código.

## Hallazgos
Ninguno bloqueante. Notas para el cierre (no piden cambios para aprobar):
- **N1.** `sdd/loops/dev-de-10.md` sigue con `estado: corriendo` y «Resumen al cortar (vacío)». Es lo esperado hasta este APPROVED; el leader lo pasa a `cumplido` y completa el resumen al cortar.
- **N2.** `status.md` ya marca F26 `Complete 100%` antes de este review: se adelantó un paso, pero con este APPROVED queda cierto.
- **N3.** El job `smoke` de CI no se ejecutó todavía en GitHub (falta push, que pide OK del owner). Conviene mirar la primera corrida después del push: depende de que `google-chrome` esté en la imagen de `ubuntu-latest`.

Con los seis objetivos cumplidos y este review APPROVED, salta la primera regla de corte: el loop queda `cumplido`. Push y merge a `main` siguen pidiendo el OK del owner (R01, R32).
