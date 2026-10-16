# harness_fixes · rama `main`

Lo que falló **por culpa del entorno**, no del agente, y en qué nivel mecánico se arregló
([`harness.md`](../../../harness.md) §8: test → lint → hook → check → regla escrita).

## 2026-10-16 · El hash del grafo gritaba en falso con el fin de línea

- **Falla.** `graph/nucleo.md`, `graph/sdd.md` y `graph/web.md` salían «desactualizados respecto del
  código» con el árbol limpio y cero cambios de contenido. El pre-commit bloqueaba cualquier commit
  hasta aceptar un drift que no existía.
- **Causa.** `compute_hash` hashea `p.read_bytes()`. En Windows con `core.autocrlf=true` el mismo
  archivo convive en disco con CRLF o con LF según qué herramienta lo escribió última —hoy el repo
  tiene las dos cosas mezcladas: `SDD-MASTER.md` y `scenarios.md` en LF, `harness.md` y `README.md`
  en CRLF—, así que el hash cambiaba sin que cambiara nada. Verificado archivo por archivo
  comparando los bytes normalizados contra `HEAD`: todos iguales.
- **Arreglo · nivel 1 (un test que falla si se repite).** `graph/_meta/sync_graph.py` normaliza
  CRLF→LF antes de hashear, con dos tests: uno fija que CRLF↔LF no desincroniza, el otro (guardián)
  que la normalización no tape un cambio real con CRLF de por medio. Los 12 nodos se re-aceptaron
  una vez: cambió la función de hash, no el contenido.
- **Por qué importa más de lo que parece.** Es el peor tipo de check: el que grita en falso. Se
  calla con `--accept`, y ahí se acepta también el drift real que venga de acompañante.
- **Evidencia.** Rojo medido @ `29f9b54`:
  `AssertionError: 1 != 0 : CRLF en vez de LF no es un cambio de contenido` · `Ran 15 tests ·
  FAILED (failures=1)`. Después: `Ran 15 tests · OK`. Commit `35987ad`.

## 2026-10-16 · El verificador local no corría 239 pruebas

- **Falla.** El conteo de situaciones de `web/catalogo.js` llegó a `main` en rojo (commit `276e851`).
- **Causa.** El `test` de `harness.config.json` corría `web/tests`, `harness/tests` y
  `graph/_meta/tests`, pero no `cerebro/tests`. CI sí las corre, pero solo cuando el push toca
  `cerebro/**` (`paths:` en `cerebro.yml`), así que un cambio de otro lado que las rompiera no lo
  atrapaba nadie: ni el pre-commit, ni `verify.py --full`, ni CI.
- **Arreglo · nivel 3 (el hook ejecuta lo que faltaba).** `harness.config.json` suma
  `python -m unittest discover -s cerebro/tests`.
- **Evidencia.** Rojo forzado @ `6f089b2` con un test que falla a propósito dentro de
  `cerebro/tests`: `[FAIL] test — … salió con 1 (83.4s)` · `Ran 240 tests · FAILED (failures=1)`.
  Sin el test plantado: `[OK] test … Ran 239 tests · OK (skipped=3)`. Commit `5b63bb1`.
- **Pendiente.** `api/tests/` no entra todavía: solo existe en la rama `ia-fusion`, y su
  `harness.config.json` ya lo incluye. Al mergear hay que unir las dos listas.

## 2026-10-16 · Un conteo escrito a mano que ya falló cuatro veces

- **Falla.** «N situaciones» y «N tecnologías» viven a mano en cinco archivos de la web. El check N3
  los compara contra `scenarios.md` y `TECH` y da rojo bien, pero arreglarlos era editar a mano:
  23→37, 38→40, 42→43, 43→45.
- **Causa.** El check detecta y no arregla, y el mensaje del rojo no decía qué hacer.
- **Arreglo · nivel 1 + mensaje.** `web/sync_conteos.mjs` lee las fuentes igual que el test (texto
  normalizado, `TECH` evaluado y no parseado a ojo) y los corrige con `--accept`; sin la bandera solo
  informa y sale 1, como `sync_graph.py`. El historial (`sdd/changelog.md`, `sdd/progress/`) no se
  toca: ahí los conteos viejos están a propósito. N3 ahora dice en el mensaje del rojo cómo
  arreglarlo.
- **Evidencia.** Rojo medido contra un stub vacío que importa: `tests 6 / pass 0 / fail 6`. Dos de
  los seis pasaban contra el stub (solo asserts negativos) y se endurecieron hasta caer
  ([`harness.md`](../../../harness.md) §5). Con el módulo real: `tests 6 / pass 6`. Commit `bc5ba26`.
  Se estrenó solo: al sumar S46 y S47, `[conteos] web/catalogo.js: «45 situaciones» -> «47 situaciones»`.
