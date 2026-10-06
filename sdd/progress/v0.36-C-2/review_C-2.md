# Review C-2 @ e710850
**Veredicto:** CHANGES_REQUESTED

Base `d61f084`, diff revisado `git diff d61f084..e710850` (11 archivos, todos en `cerebro/**` salvo `sdd/progress/v0.36-C-2/current.md`; el handback entra en `53c2d25`).

## Verificación re-ejecutada
```text
$ python -m unittest discover -s cerebro/tests -v   (Python 3.14.0, tail)
test_saneado (test_notas.TestSlug.test_saneado) ... ok
----------------------------------------------------------------------
Ran 62 tests in 1.032s
OK
$ py -3.11 -m unittest discover -s cerebro/tests
Ran 62 tests in 0.948s
OK
$ python harness/verify.py --changed   (tail)
[OK]    Tarjetas válidas (13)
[OK]    Rutas citadas existen (96 revisadas)
VERDE — 0 FAIL, 0 WARN
```

## Sondas propias (CLI real, `CEREBRO_DIR` en el scratchpad, `CEREBRO_EMBEDDINGS=falso`)
- `init` dos veces: la 2.ª dice «ya existía» y no pisa un `LEEME.md` editado a mano.
- `nota` hostil: `..`, `../..`, `日本語` como proyecto → error claro (rc 2); `C:\Windows`, `a/b\c`, `CON`/`nul.txt`, `com1`/`LPT9`, `CONIN$`, 500 caracteres → todo cae en `proyectos/<slug>/<fecha>-<slug>.md` (`con-nota`, `nul-txt`, `com1-nota`, `lpt9-nota`, slug ≤ 60). `--fecha ../../x`, `2024-02-30`, dígitos arábigos → rechazadas. `--fuente "a #b"`, tags con `]`, título multilínea → rechazados. Nota duplicada → «ya existe; no se pisa», rc 2.
- Junction `proyectos/junta → afuera`: `nota --proyecto junta` rechazada, `afuera/` vacío. Junction en `proyectos/` mismo: rechazada.
- `indexar` (3 nuevas) → 2.º `indexar` (3 sin cambios) → borrar una nota → «1 borradas» → `--todo` reconstruye.
- `buscar UnboundLocalError --json`: la nota correcta primero, campos `titulo, ruta, proyecto, tipo, fuente, fragmento, puntaje`. `--proyecto` filtra; `--tipo foo` y `-k 0` → error claro. Consultas `"` y `NEAR(a b) OR *` no rompen.
- Cambio de embedder por proceso real (dim 64 → 32): `indexar` y `buscar` sin `--todo` → «el índice se armó con el modelo «falso» (dim 64)… Corré `cerebro.py indexar --todo`», rc 2, sin traceback; `--todo` lo resuelve y el viejo queda bloqueado al revés.
- Transacción: embedder que lanza en la 3.ª llamada durante `indexar --todo` → filas de `notas`, `fts` y hashes idénticos antes y después. **Funciona, pero ningún test lo cubre (M8).**
- `indice.sqlite` con basura → **traceback** `sqlite3.DatabaseError: file is not a database` en `indexar` y `buscar` (ver H4).
- Índice bloqueado por otro proceso → «el SQLite de este Python no sirve para el índice (database is locked); hace falta FTS5»: mensaje engañoso (H5).
- Junction dentro de `proyectos/` a una carpeta de afuera con un `.md`: `indexar` lo lee e indexa (`proyectos/junta/fuera.md`) (H6).

## Criterios
1. `init` crea y no pisa: [x] sonda + `test_init_crea_y_dos_veces_no_pisa`; M12 (open "w") muerto.
2. Validación §B, error con archivo y campo, `revisar` ≠ 0: [x] con hueco — sonda y `test_cada_error_dice_archivo_y_campo`; pero **M6 sobrevive**: quitar la regex `AAAA-MM-DD` deja pasar `fecha: 20261006` (en 3.11+ `date.fromisoformat` acepta el formato básico) y ningún test lo nota (H2).
3. Indexar por fragmentos, incremental contado, `--todo`, borrada sale: [x] sonda + tests; M3/M4/M14 muertos.
4. Híbrida RRF, palabra exacta y sinónimos primero, filtros, `--json`: [x] con hueco — M1/M2/M9/M10 muertos; **M11 (BM25 en orden inverso) sobrevive**: ningún test tiene dos notas que matcheen la misma palabra con distinto peso, así que el orden de la lista FTS no está probado (H3).
5. Cambio de embedder sin `--todo`: [x] sonda por proceso real + tests; M5 muerto.
6. Contención y no-pisar: [ ] — el código contiene (sondas OK), pero **la guardia de `proyectos/` como enlace no tiene test: M7 sobrevive y con M7 aplicado la nota se escribe fuera de `CEREBRO_DIR`** (verificado: `afuera2/p/2026-10-06-t.md`) (H1).
7. Suite sin red → OK: [x] 62/62 en 3.14 y 3.11.

## Mutantes (míos, uno por vez, `timeout 120`, revertidos; `git status` limpio tras cada uno)
| # | Mutante | Resultado |
|---|---|---|
| M1 | `RRF_K = 0` | muerto (`test_suma_de_rangos_reciprocos_con_k_60`) |
| M2 | filtro proyecto/tipo fuera de la consulta de coseno | muerto (`test_filtros_antes_de_puntuar`, `test_indexar_buscar_json`) |
| M3 | `fragmentar(texto)` (frontmatter indexado) | muerto (`test_el_frontmatter_no_se_indexa_como_texto` y 5 más) |
| M4 | hash solo del cuerpo (cambio de frontmatter no detectado) | muerto (`test_nota_que_se_vuelve_invalida_sale_del_indice`) |
| M5 | `buscar` sin `_verificar_modelo` | muerto (3 tests) |
| M6 | `fecha` sin la regex AAAA-MM-DD | **SOBREVIVE** |
| M7 | sin chequeo `raiz_real.parent != base.resolve()` | **SOBREVIVE** (y escapa de verdad) |
| M8 | `con.commit()` tras el borrado de `--todo` (rompe la transacción) | **SOBREVIVE** |
| M9 | sin deduplicar por nota | muerto (`test_una_nota_aparece_una_sola_vez`) |
| M10 | consulta FTS sin comillas | muerto (`test_consultas_con_sintaxis_de_fts5_no_rompen`) |
| M11 | `ORDER BY bm25(fts) DESC` | **SOBREVIVE** |
| M12 | `init` abre `LEEME.md` con `"w"` | muerto (2 tests) |
| M13 | tags inválidos sin error | muerto (`test_cada_error_dice_archivo_y_campo`) |
| M14 | nota que se vuelve inválida queda en el índice | muerto |

10/14 muertos. Los 4 vivos son justamente las propiedades que el handback afirma («contención por resolve()», «Índice transaccional», fecha AAAA-MM-DD, BM25) sin test que las ate. Era el riesgo anunciado: los módulos de la sesión cortada no tuvieron rojo medido.

## Checkpoints
- C1 (arnés sano): [x] `verify.py --changed` y `--quick` VERDE.
- C2 (cumple la tarjeta, zona respetada): [ ] criterio 6 sin evidencia que atrape la falla (H1). Zona OK: solo `cerebro/**` y `sdd/progress/v0.36-C-2/`; `cerebro/requirements.txt` no existe ni se tocó.
- C3 (diseño y convenciones): [x] solo stdlib (`sqlite3`, `struct`, `hashlib`, `math`, `re`, `unicodedata`…), FTS5 + coseno en Python puro, RRF k=60, filtros en SQL antes de puntuar, fragmentos por `#`/`##` con tope 1500, frontmatter fuera del texto, `meta(modelo, dim)`, `open(..., "x")`, mensajes en español. Salvo H4.
- C4 (verificación real): [ ] 4 mutantes vivos en lógica crítica (M6, M7, M8, M11).
- C5 (cierra limpio): [x] handback y `current.md` commiteados; `.gitignore` cubre `__pycache__`; sin secretos; `CEREBRO_DIR`/`CEREBRO_EMBEDDINGS` documentadas.

## Cambios requeridos
1. **ALTA** — `cerebro/notas.py:207` (guardia `raiz_real.parent != base.resolve()`) sin test; criterio 6. Agregar en `cerebro/tests/test_notas.py` un test con `proyectos/` mismo como symlink/junction hacia `self.afuera/...` que espere `ErrorNota` y la carpeta de destino vacía. Debe matar M7.
2. **MEDIA** — `cerebro/indice.py:201-204` («si algo falla, el índice queda como estaba», afirmado en el docstring y el handback) sin test. Agregar un test con un embedder que lance a mitad de `indexar` (normal y `--todo`) y compruebe que `notas`/`fragmentos`/`fts`/`meta` quedan iguales. Debe matar M8.
3. **MEDIA** — `cerebro/notas.py:111` (regex AAAA-MM-DD) sin test; criterio 2. Agregar casos `fecha: 20261006` (y p. ej. `2026-10-6`) en `test_notas.py` que esperen error de `fecha`. Debe matar M6.
4. **MEDIA** — `cerebro/indice.py:164-167` solo atrapa `sqlite3.OperationalError` y `cerebro/cerebro.py:134-139` no atrapa `sqlite3.DatabaseError`: un `indice.sqlite` que no es base de datos (escenario realista: conflicto de OneDrive, que el playbook lista en «Errores comunes») sale con **traceback**, contra «mensajes en español, sin traceback» del diseño. Esperado: error claro que diga que el índice está dañado y que se borre `.cerebro/indice.sqlite` o se corra `indexar --todo` (y que `--todo` pueda recuperarse), con test.
5. **MEDIA** — `cerebro/indice.py:260` el orden BM25 no está probado (M11 vive). Agregar un test con dos notas que contengan la palabra buscada con distinta relevancia, con `Constante()` como embedder, y que exija la más relevante primero.

## Observaciones menores (no bloquean por sí solas)
- H5 BAJA — `cerebro/indice.py:165-167`: cualquier `OperationalError` al abrir (p. ej. «database is locked» con el MCP indexando) se reporta como «hace falta FTS5». Distinguir «no such module: fts5» del resto.
- H6 BAJA — `cerebro/notas.py:145`: `rglob` sigue junctions en Windows; un enlace dentro de `proyectos/` hace indexar notas de afuera. No viola el criterio 6 (es lectura) pero contradice «solo dentro de CEREBRO_DIR»; considerar saltar enlaces en `listar`.
- BAJA — `cerebro/notas.py:136`: un título sin ASCII (`日本語`) da slug `nota`; un 2.º título así el mismo día choca con «ya existe». Mientras que un proyecto sin ASCII se rechaza: comportamiento inconsistente. Sugerencia: sufijo corto de hash cuando el slug cae en `nota`.
- INFO — `buscar --json` no lleva la marca R26 («dato recuperado»); la salida de texto sí. Aceptable si el MCP (C-4) la agrega; dejarlo dicho en C-4.

## Mejoras al arnés detectadas
- Para tarjetas retomadas de una sesión cortada, exigir en el handback mutantes **por cada afirmación** del «Cómo» (contención, transacción, formato), no solo por la lógica que se escribió en la sesión nueva: los 4 sobrevivientes son exactamente afirmaciones heredadas sin rojo.
