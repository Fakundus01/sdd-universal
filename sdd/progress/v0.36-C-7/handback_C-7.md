# Handback C-7 — CI de cerebro/, guía de instalación, instalar.ps1 y deuda de reviews

- **Estado:** done
- **Rama / commit:** `v0.36-C-7` @ `9d338ad` (código; este handback entra en el commit siguiente). Base `3dd1edd`
- **Quién:** implementer (MEDIO)

## Hecho
- `.github/workflows/cerebro.yml`: `cerebro/tests` en ubuntu y windows, Python 3.10 y 3.14, `paths:` acotado a `cerebro/**` y al propio workflow; actions fijadas a las de `harness.yml` (`checkout@v5`, `setup-python@v6`). Instala `requirements.txt` (corre así también el humo del MCP y los tests de OpenAI, estos con transporte simulado) y fija `CEREBRO_SIN_MODELO=1`: la integración real de fastembed (~220 MB) se saltea con motivo. Sin cache del modelo.
- `cerebro/README.md`: instalación paso a paso (venv, `CEREBRO_DIR`, `init`, `importar-sdd`, `indexar`, `buscar`, `claude mcp add` con el Python del venv), variable nueva y nota de CI.
- `cerebro/instalar.ps1`: venv + requirements + init + importar-sdd + indexar. Parámetros `-CerebroDir`, `-Repo`, `-Embeddings`, `-Python`. `$ErrorActionPreference='Stop'` y código de salida de cada ejecutable nativo. No registra el MCP (imprime el comando). Variables de entorno solo del proceso. Idempotente.
- Deuda: humo del MCP (helper `conversar` con hilos para stdout y stderr, corta cuando el servidor muere); `notas.py` rechaza NUL, `\x0b \x0c \x1c-\x1e \x85    ` además de `\n \r` en campos de una línea; `proyecto` del frontmatter = slug de la carpeta.

## No hecho / pendiente
- La CI no corrió de verdad (no hay push). **La primera corrida real la verifica el leader después del push, con OK del owner.** Riesgo a mirar: que `fastembed`/`onnxruntime` tengan wheel para 3.14 en Linux y Windows; si no, la matriz 3.14 falla en el `pip install`.
- Se probó con Python 3.14 (venv y sistema) y 3.11; 3.10 no está instalado acá.

## Cómo
- Variable de CI propia (`CEREBRO_SIN_MODELO`) en vez de `CI=true`: es explícita y testeable (test que corre la integración en un subproceso con la variable y exige el skip con motivo).
- Cambio de `proyecto` (justificado): el frontmatter pasa a `slug(proyecto)`, igual que la carpeta. Ninguna nota ni test existente se rompió salvo uno: `test_separadores_unicode_en_titulo_y_fuente_no_cierran_el_bloque` (test_mcp_server) escribía la nota con esos separadores vía `nota`, que ahora los rechaza. Se adaptó sin debilitarlo: ahora afirma que `nota` los rechaza y escribe la nota **a mano** (como lo haría Obsidian) para seguir probando que `buscar` no deja romper el bloque (cierre único, última línea = fin) y que la nota se encontró.
- El validador del workflow: `pyyaml` instalado solo en `cerebro/.venv` y desinstalado después; el YAML parsea (`on.push.paths`, `on.pull_request.paths`, matriz, 4 pasos).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `.github/workflows/cerebro.yml` | nuevo |
| `cerebro/instalar.ps1` | nuevo |
| `cerebro/README.md` | instalación paso a paso, variable, CI |
| `cerebro/notas.py` | `_PROHIBIDOS_EN_LINEA`; `proyecto` = slug |
| `cerebro/tests/test_notas.py` | 3 tests nuevos |
| `cerebro/tests/test_mcp_server.py` | helper `conversar` + `TestConversar` (2); un test adaptado |
| `cerebro/tests/test_local.py` | `SIN_MODELO` + `TestIntegracionSeSalteaEnCI` |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. CI | YAML parseado (arriba); `CEREBRO_SIN_MODELO=1` con el venv: `Ran 208 tests ... OK (skipped=1)`; `test_con_la_variable_se_saltea_con_motivo` |
| 2. README + script | salida de las corridas de abajo |
| 3. temporal con índice que responde | `%TEMP%\c7-cerebro-falso` y `c7-cerebro-local`: `buscar` devuelve resultados; segunda corrida `0 nuevas, 71 sin cambios` |
| 4. deuda | `test_campos_de_una_linea_rechazan_nul_y_separadores_unicode`, `test_el_proyecto_del_frontmatter_es_el_slug_de_la_carpeta`, `test_buscar_por_proyecto_encuentra_lo_que_nota_escribio`, `TestConversar` (2) |

Rojo antes (R29), base `3dd1edd`:
```text
$ cd cerebro/tests && python -m unittest test_notas
FAIL: test_buscar_por_proyecto_encuentra_lo_que_nota_escribio
FAIL: test_campos_de_una_linea_rechazan_nul_y_separadores_unicode (campo='proyecto', sep="'\\x00'")  ... (12 subtests más: titulo/fuente x NUL, u2028, u2029, x85)
FAIL: test_campos_de_una_linea_rechazan_nul_y_separadores_unicode
FAIL: test_el_proyecto_del_frontmatter_es_el_slug_de_la_carpeta
Ran 31 tests in 0.441s
FAILED (failures=15)
```
Humo (helper viejo, extraído sin cambios, `0c539dd`):
```text
$ python -m unittest test_mcp_server.TestConversar
OSError: [Errno 22] Invalid argument   (el servidor caído: proc.stdin.flush() sin manejar)
AssertionError: Lists differ: [] != [1, 2, 3, 4]   (servidor que inunda stderr: se bloquea, 0 respuestas)
Ran 2 tests in 35.206s
FAILED (failures=1, errors=1)
```
SIN_MODELO (antes de la variable, `4d8960c`):
```text
$ python -m unittest test_local.TestIntegracionSeSalteaEnCI
AssertionError: 'skipped' not found in 'test_mismo_sentido_... ... ok ... Ran 1 test in 2.374s OK'
FAILED (failures=1)
```

Verde después:
```text
$ cerebro/.venv/Scripts/python.exe -m unittest discover -s cerebro/tests      -> Ran 208 tests in 11.942s  OK
$ CEREBRO_SIN_MODELO=1 (venv)                                                 -> Ran 208 tests in 10.262s  OK (skipped=1)
$ python -m unittest discover -s cerebro/tests   (sistema, 3.14)              -> Ran 208 tests in 8.490s   OK (skipped=3)
$ Python 3.11 (sistema)                                                       -> Ran 208 tests in 7.478s   OK (skipped=3)
$ python harness/verify.py --quick
[OK] Memoria en disco ... [OK] Tarjetas válidas (13) ... [OK] Rutas citadas existen (163 revisadas)
VERDE — 0 FAIL, 0 WARN
```

### instalar.ps1 con `CEREBRO_EMBEDDINGS=falso` (`%TEMP%\c7-cerebro-falso`, venv del worktree ya existente)
```text
== venv ... ya existe; se reutiliza
== init: creado: ...\proyectos / ...\LEEME.md
== importar-sdd desde ...sdd-universal-C-7
importadas: 42 escenario, 26 hallazgo, 3 leccion
71 nuevas, 0 actualizadas, 0 sin cambios, 0 editadas a mano (no se pisaron), 0 huérfanas (se dejan)
== indexar (falso): 71 nuevas, 0 actualizadas, 0 sin cambios, 0 borradas      exit 0
$ cerebro.py buscar 'el agente copio un archivo para pasar un check' -k 3
1. Tarjeta con un obstáculo de diseño despachada al tier más barato [sdd-universal · escenario] ... (3 resultados)
=== segunda corrida: init "ya existía"; 0 nuevas, 0 actualizadas, 71 sin cambios; indexar 0 nuevas, 71 sin cambios; exit 0
```
### Con `local` (`%TEMP%\c7-cerebro-local`, venv borrado antes: el script lo creó y reinstaló todo; modelo ya en `~/.cache/cerebro/modelos`)
```text
== venv ... (creado) / == dependencias ... / == init: creado ... / == importar-sdd: 71 nuevas
== indexar (local): 71 nuevas, 0 actualizadas, 0 sin cambios, 0 borradas      exit 0
$ buscar 'el agente copio un archivo para pasar un check' -k 3
1. El agente lee contenido que no escribió el humano: repo ajeno (R15)... [escenario]
2. El arnés le pasa a un proceso datos que no escribió el usuario... [escenario]
3. Anonimizar con UPDATE deja los valores viejos... [hallazgo]
=== segunda corrida: 0 nuevas, 0 actualizadas, 71 sin cambios; indexar 0 nuevas, 71 sin cambios; exit 0
```
Observación: con esa consulta del playbook la nota de la lección esperada no queda primera (con `falso` es ruido, con `local` los tres resultados son afines pero no son la nota de «copió un archivo»). Es calidad de recuperación, no de instalación.

### Mutantes (uno por vez, `subprocess.run(..., timeout=120)`, archivo restaurado en `finally`)
| # | Mutante | Resultado |
|---|---|---|
| M1 | sin ` ` en el regex | muerto (`Ran 31`, failures=4) |
| M2 | sin NUL | muerto (`Ran 31`, failures=4) |
| M3 | sin `\x85` | muerto (`Ran 31`, failures=4) |
| M4 | frontmatter con el `proyecto` crudo | muerto (`Ran 31`, failures=1 errors=2) |
| M5 | helper sin hilo que drene stderr | muerto (`Ran 2`, failures=2) |
| M6 | helper sin cortar al caer el servidor | muerto (`Ran 2`, failures=1) |
| M7 | `CEREBRO_SIN_MODELO` ignorada | muerto (`Ran 1`, failures=1) |

## Fuera de zona / riesgos
- `playbooks/obsidian-cerebro.md` §C sigue diciendo `pip install` y `claude mcp add cerebro -- python <ruta>/mcp_server.py`; con el venv el Python del MCP es el del venv (observación ya hecha por la review de C-4). El README lo aclara; el playbook lo corrige el leader.
- `buscar --proyecto` filtra por igualdad exacta con el slug (`mi-proyecto`); no normaliza lo que escribe el usuario («Mi Proyecto» no encuentra nada). No está en mi zona (`indice.py`/`cerebro.py`).
- `instalar.ps1` se probó con Windows PowerShell 5.1 (ASCII puro, sin BOM necesario).
- Un incidente mío: un heredoc vacío de `python -` dejó un REPL en segundo plano que escribía errores en bucle; lo detuve con TaskStop y borré su archivo de salida. No tocó el repo.

## Cambios de spec sugeridos
- Playbook §C pasos 1 y 5: usar el venv (ver arriba). Mencionar `instalar.ps1`.

## Variables de entorno nuevas
- `CEREBRO_SIN_MODELO` — saltea la integración con el modelo real — la fija la CI (`cerebro.yml`); opcional en local.

## Próximo paso sugerido
- Push de la rama con OK del owner y mirar la primera corrida de `cerebro` en Actions; después registrar el MCP (`claude mcp add`, comando que imprime `instalar.ps1`) contra el Cerebro real.

---

# Vuelta 2 (review `08f8155`) — `v0.36-C-7` @ `4108600` (este handback entra en el commit siguiente)

Zona ampliada por el leader: filtro `proyecto` en `cerebro.py`/`mcp_server.py` y aviso de `revisar`.

| Hallazgo | Qué se hizo |
|---|---|
| H1 ALTA | Default de `instalar.ps1` = `$env:USERPROFILE\Documents\Cerebro` (fallback `$HOME`). Verificado igual a `config.cerebro_dir()`: ambos `C:\Users\Facundo\Documents\Cerebro` (`GetFolderPath('MyDocuments')` daba `...\OneDrive\Documents`). Comentario de cabecera y README corregidos. El script se niega (exit 1, sin crear nada) si la ruta cae bajo `$env:OneDrive`, `OneDriveConsumer`, `OneDriveCommercial` o tiene un segmento `OneDrive` / `OneDrive - ...`. Probado con `$env:OneDrive` simulado (`%TEMP%\FakeOD\Cerebro`) y con segmento (`%TEMP%\OneDrive - Empresa\Cerebro`): ambos «queda dentro de OneDrive ... Elegi otra carpeta con -CerebroDir», carpeta no creada. |
| H2 | `claude mcp add -s user` en el README (3 lugares, con la explicación del alcance `local`) y en lo que imprime el script. |
| H3 | `buscar --proyecto` y `buscar(proyecto=...)` usan `notas.slug()` (`_filtro_proyecto` en la CLI). Tests `test_buscar_proyecto_normaliza_el_filtro_con_slug` (CLI, 3 variantes: «Mi Proyecto», `mi-proyecto`, «  MI proyecto ») y el del MCP. A mano: `--proyecto 'SDD Universal'` sobre el Cerebro de prueba devuelve notas de `sdd-universal`. |
| H4 | `revisar` **avisa por stderr, no falla** (decisión: la nota es válida y a mano en Obsidian se escribe como uno quiere; fallar rompería Cerebros existentes). Nombra archivo, valor del frontmatter y carpeta esperada, y suma «N aviso(s) de proyecto» al resumen. Test `test_revisar_avisa_si_el_proyecto_no_es_el_slug_de_la_carpeta` (exit 0, aviso solo en la nota rara). |
| H5 | `-Reindexar` (pasa `--todo`); si `indexar` falla, el script imprime la pista. El mensaje del modelo ya no dice «la primera vez baja» como si fuera siempre. Probado `falso` -> `local` sin `-Reindexar` (exit 1 con pista) y con `-Reindexar` (71 nuevas, exit 0). |
| H6 | Barato: mensajes propios para Python < 3.10 / inexistente y para fallo de pip («sin red? sin permiso?»). |
| H7 | `\x0b \x0c \x1c \x1d \x1e` sumados a la tupla de separadores del test. |
| H8 | `test_un_servidor_que_cierra_stdin_sin_leer_no_rompe_el_helper`: manda 5 MB a un servidor que muere sin leer, la escritura falla con `OSError` de forma determinista. |
| H9 | `exigir_respuestas()` (con su test): si el servidor no contesta el id N, el `AssertionError` trae su stderr y no un `KeyError`. |
| H10 | README: `powershell -ExecutionPolicy Bypass -File ...` (solo ese proceso). El script escapa `'` en las rutas que imprime (`Q`). |

Rojo antes (R29), base `08f8155`, venv:
```text
$ cd cerebro/tests && python -m unittest test_cli test_mcp_server test_notas
ERROR: test_si_el_servidor_no_contesta_el_error_trae_su_stderr   (NameError: falta exigir_respuestas)
ERROR: test_initialize_tools_list_y_buscar                       (idem)
FAIL: test_buscar_proyecto_normaliza_el_filtro_con_slug (test_cli) (nombre='Mi Proyecto')
FAIL: test_buscar_proyecto_normaliza_el_filtro_con_slug (test_cli) (nombre='  MI proyecto ')
FAIL: test_revisar_avisa_si_el_proyecto_no_es_el_slug_de_la_carpeta
FAIL: test_buscar_proyecto_normaliza_el_filtro_con_slug (test_mcp_server) (nombre='Mi Proyecto')
Ran 75 tests ... FAILED (failures=4, errors=2)
```
(H7 y H8: el código ya los cumplía, faltaba el test; se demuestran con los mutantes N5 y N6.)

Verde después:
```text
venv:                          Ran 213 tests in 12.368s  OK
CEREBRO_SIN_MODELO=1 (venv):   Ran 213 tests in 10.483s  OK (skipped=1)
sistema 3.14:                  Ran 213 tests in 8.377s   OK (skipped=3)
Python 3.11:                   Ran 213 tests in 7.222s   OK (skipped=3)
verify.py --quick:             VERDE — 0 FAIL, 0 WARN
```

`instalar.ps1` de nuevo, `CEREBRO_DIR` = `%TEMP%\Cerebro prueba ñ` (espacio y ñ): `falso` exit 0 (71 nuevas); `local` sin `-Reindexar` exit 1 con pista; `local -Reindexar` exit 0 (71 nuevas, modelo ya en caché); segunda corrida `0 nuevas, 71 sin cambios` en importar e indexar, exit 0; `buscar 'R30 UnboundLocalError' --proyecto 'SDD Universal'` responde.

Mutantes (suite completa, `subprocess.run(timeout=120)`, restaurado en `finally`; todos muertos):
| # | Mutante | Resultado |
|---|---|---|
| N1 | CLI `buscar` sin normalizar | muerto (Ran 213, failures=2) |
| N2 | MCP `buscar` sin normalizar | muerto (failures=1) |
| N3 | `revisar` nunca avisa | muerto (failures=1) |
| N4 | `revisar` avisa siempre | muerto (failures=1) |
| N5 | regex sin `\x1d\x1e` | muerto (failures=7) |
| N6 | `conversar`: `except ValueError` en vez de `OSError` | muerto (errors=1) |
| N7 | humo sin `exigir_respuestas` | muerto (failures=1) |
| N8 | `revisar` falla (exit 1) con aviso | muerto (failures=1) |

Pendiente para el leader: playbook §C (venv, `-s user`, `instalar.ps1`) sigue fuera de zona. No registré el MCP ni toqué el modelo; sin llamadas a OpenAI.

---

# Vuelta 3 (review `42cf1dd`) — `v0.36-C-7` @ `7d95dbf` (este handback entra en el commit siguiente)

Zona ampliada: `cerebro/indice.py` (solo lo que guarda `proyecto` y la marca de esquema). Opción (a) del leader.

- **H11:** el índice guarda `notas.slug(nota.proyecto)`. Una nota a mano con `proyecto: SDD Universal` en `proyectos/sdd-universal/` aparece con `--proyecto "SDD Universal"` y con `--proyecto sdd-universal`, por CLI y por MCP. `meta` guarda ahora `esquema` (`VERSION_ESQUEMA = "2"`; ojo: `ESQUEMA` ya era el SQL de las tablas, por eso el nombre). `buscar` e `indexar` incremental con un índice de otro esquema (o sin la marca: los armados con el código anterior) fallan con `ErrorModelo` (el mismo tipo que la guardia de modelo): «el índice se armó con otra versión del esquema (anterior; la actual es 2) ... Corré `cerebro.py indexar --todo`»; `indexar --todo` lo reconstruye. Texto del aviso de `revisar` corregido: dice con qué valor se indexa la nota y si `--proyecto <carpeta>` la alcanza (cuando `slug(proyecto) == carpeta`: «el filtro `--proyecto` la alcanza igual»; si no: «`buscar --proyecto <carpeta>` no la encuentra», con la corrección sugerida). Sigue siendo aviso, exit 0.
- **H12:** tests para `--proyecto "   "` (sin filtro) y para una nota en `proyectos/p/sub/x.md` (sin aviso).
- Tests existentes adaptados, sin debilitarlos: `test_indice.py:406` y `test_local.py:263` comparaban `meta` con un dict exacto de dos claves; ahora incluye `"esquema": "2"` (sigue siendo igualdad exacta).
- `instalar.ps1`: la pista de `-Reindexar` también menciona el índice de una versión anterior.
- README: una frase sobre el esquema en el paso 5.

Rojo antes (R29), base `42cf1dd`, venv (`python -m unittest test_cli test_mcp_server`):
```text
FAIL: test_aviso_de_revisar_dice_como_se_indexa_la_nota
FAIL: test_indice_con_otro_esquema_pide_indexar_todo (comando=('buscar', 'membrillo'))
FAIL: test_indice_con_otro_esquema_pide_indexar_todo (comando=('indexar',))
FAIL: test_nota_a_mano_con_proyecto_natural_se_alcanza_por_el_slug_y_por_el_nombre (filtro='SDD Universal')
FAIL: test_nota_a_mano_con_proyecto_natural_se_alcanza_por_el_slug_y_por_el_nombre (filtro='sdd-universal')
FAIL: test_nota_a_mano_con_proyecto_natural_se_alcanza_por_mcp (filtro='SDD Universal')
FAIL: test_nota_a_mano_con_proyecto_natural_se_alcanza_por_mcp (filtro='sdd-universal')
Ran 50 tests in 3.802s
FAILED (failures=7)
```
Los tests de H12 (`test_proyecto_en_blanco_es_sin_filtro`, `test_revisar_no_avisa_por_una_nota_en_una_subcarpeta_del_proyecto`) pasaban en el código de base, como dice la review: lo que cubren son los mutantes Q5 y Q7 (abajo, muertos).

Verde después:
```text
venv:                          Ran 219 tests in 12.500s  OK
CEREBRO_SIN_MODELO=1 (venv):   Ran 219 tests in 10.549s  OK (skipped=1)
sistema 3.14:                  Ran 219 tests in 8.526s   OK (skipped=3)
Python 3.11:                   Ran 219 tests in 7.440s   OK (skipped=3)
verify.py --quick:             VERDE — 0 FAIL, 0 WARN
```

Mutantes (suite completa, `subprocess.run(timeout=120)`, uno por vez, restaurados; todos muertos):
| # | Mutante | Resultado |
|---|---|---|
| R1 | el índice guarda el `proyecto` crudo | muerto (Ran 219, failures=4) |
| R2 | sin guardia de esquema | muerto (failures=2) |
| R3 | la marca de esquema no se escribe | muerto (failures=13, errors=45) |
| R4 | guardia solo en `buscar`, no en `indexar` incremental | muerto (failures=8, errors=2) |
| Q5 | filtro sin `.strip()` | muerto (failures=1) |
| Q7 | `carpeta = a.parent.name` | muerto (failures=1) |
| R6 | el aviso siempre dice que la alcanza | muerto (failures=1) |
| R7 | el aviso nunca dice que la alcanza | muerto (failures=1) |

`instalar.ps1` con `CEREBRO_DIR` = `%TEMP%\Cerebro v3 ñ`, `local`: corrida nueva exit 0 (71 nuevas); simulado un índice viejo (borrada la fila `esquema`): sin `-Reindexar` exit 1 con «el índice se armó con otra versión del esquema (anterior; la actual es 2)... Corré `cerebro.py indexar --todo`» y la pista de `-Reindexar`; con `-Reindexar` exit 0 (71 nuevas). Carpetas temporales borradas.

Nota para el leader: quien ya tenga un Cerebro indexado con el código anterior necesita `indexar --todo` una vez (el mensaje lo dice). Playbook §C sigue fuera de zona (venv, `-s user`, `instalar.ps1`).
