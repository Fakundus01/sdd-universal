# Review L-8 @ 4d6c68f
**Veredicto vigente (vuelta 1, @ 4d6c68f):** APPROVED · **mergeada a `main`** en `4afdaab` el 2026-10-19

Una vuelta. La tarjeta salió del diagnóstico del leader —el job `smoke` de CI venía rojo en `main` desde el 2026-10-16 y el rojo era del propio chequeo, no del producto—, así que el riesgo de esta review no era «¿anda?» sino el inverso del bug viejo: el assert reemplazado era un **proxy demasiado amplio**, y el peligro del nuevo es quedar **demasiado angosto** y dejar pasar lo que el viejo sí atrapaba. Eso es lo que se le pidió atacar al reviewer, y es lo que atacó: el mutante propio del archivo armado en memoria cubre una rama que el mutante del 404 del handback no toca.

El reviewer no implementó nada de esto, trabajó en un worktree propio en `4d6c68f` y re-ejecutó todo: nada de su evidencia viene copiada del handback (R30).

## Lo que re-ejecutó el reviewer (verbatim)

> Revisión L-8 @ 4d6c68f. Re-ejecuté todo y encontré cero hallazgos bloqueantes.
>
> ## Re-ejecutado
> - `python harness/verify.py` completo: VERDE, 0 FAIL, 2 WARN. Cola:
> ```
> [WARN]  el smoke del navegador NO corre en verify.py: un verde acá no lo cubre. Corrélo aparte antes de cerrar: node web/tests/smoke/smoke.mjs
> [WARN]  sin 'lint' en harness.config.json
> [OK]    test — ... (115.9s): Ran 241 tests in 9.057s · OK (skipped=3)
> VERDE — 0 FAIL, 2 WARN
> ```
> - `--quick`: no muestra el WARN (grep de "smoke" da 0). `--changed`: lo muestra.
> - `node web/tests/smoke/smoke.mjs` sobre el código real:
> ```
> ok   descarga rápida: el popup baja la carpeta del proyecto
> PASS smoke: 22 pasos, 0 errores de consola
> ```
>
> ## Mutantes del handback
> Cada uno se aplicó con `sed` sobre `web/paquete.js` y se restauró con `git checkout -- web/paquete.js`.
> - **M1**, `traer()` devuelve `""` para `harness.md`. Dio rojo y nombra el archivo:
> `FAIL smoke: descarga rápida: el popup baja la carpeta del proyecto: archivos vacíos que no son marcadores: web-app-full-stack/sdd/harness.md (21 pasos ok antes)`
> - **M2**, los `.gitkeep` con contenido `"x"`. Dio rojo y nombra los siete:
> `FAIL ... marcadores .gitkeep con contenido: web-app-full-stack/material-cliente/imgs/.gitkeep, ...logo..., ...tipografias..., ...disenos..., ...documentos..., ...flujo..., ...arquitectura.. (21 pasos ok antes)`
> - **M3**, el código real, da verde con los 22 pasos (ver arriba).
>
> ## Mutantes propios
> - **Archivo armado en memoria vacío** (`MATERIAL_CLIENTE_README = ""`): rojo con `archivos vacíos que no son marcadores: web-app-full-stack/material-cliente/README.md`. Cubre la rama "en memoria", que el mutante del 404 no toca.
> - **Un solo `.gitkeep` con texto** (`flujo`): rojo con `marcadores .gitkeep con contenido: web-app-full-stack/material-cliente/flujo/.gitkeep`. Nombra solo ese.
> - **`traer()` devuelve `undefined` para `harness.md`**: rojo, pero por otra vía (`Zip.descargar no se llamó: ... Cannot read properties of undefined (reading 'split')`). Lo atrapa el paquete antes de llegar al assert.
> - **Cada afirmación cae sola**: el assert de vacíos lo hacen caer M1 y el del README. El de marcadores lo hacen caer M2 y el de `flujo`. En ninguno de los dos casos cae el otro.
> - **WARN de `verify.py`**, tres mutantes corridos contra `test_verify.py`. Los tres hacen fallar `test_avisa_que_el_smoke_no_corre_aca_si_el_proyecto_lo_tiene`; con el código real los 14 tests pasan.
>   - `if True:` en vez de `if self.mode != "quick":` (avisaría también en quick).
>   - `(self.root / SMOKE).is_file()` reemplazado por `False` (nunca avisa).
>   - `if self.mode == "full":` (no avisaría en `--changed`).
>   - El WARN depende solo de que exista el archivo del smoke, así que no puede dar silencio falso en ese sentido. Tampoco cambia el exit code: el resultado sigue en VERDE.
>
> ## Criterio por criterio
> 1. **Cumple.** `smoke.mjs` separa marcadores (deben estar vacíos) de contenido (no puede estarlo). Un `.gitkeep` con texto da rojo (M2).
> 2. **Cumple.** Los mensajes listan los archivos culpables (M1, M2, README, `flujo`).
> 3. **Cumple.** Los tres mutantes dan lo que la tarjeta pide. El del 404 da rojo y nombra el archivo.
> 4. **Cumple.** WARN en `--full` y `--changed`, no en `--quick`, con dos tests nuevos y un párrafo en `sdd/testing.md`. El smoke no se metió en `verify.py`.
> 5. **Cumple.** Sin dependencias nuevas.
>
> ## Zona de archivos
> - El diff toca `smoke.mjs`, `verify.py`, `test_verify.py`, `sdd/testing.md` y sdd/progress/v0.37-L-8/ (sin backticks acá: el leader los sacó porque es un glob, no una ruta).
> - `graph/{harness,sdd,web}.md`: cambia solo la línea `hash:`. Lo comprobé con el diff: cero líneas distintas de `hash:`. Está justificado por el pre-commit.
> - `web/paquete.js`, `web/zip.js` y `paquete.test.mjs` quedaron sin tocar.
> - El `git status` de mi worktree solo muestra sdd/progress/detached/ (sin backticks acá: esa carpeta existe solo en la copia del reviewer, la creó `verify.py` con HEAD detached), que no viene del diff.
>
> ## No bloqueantes
> - **Contenido no-string:** el chequeo de vacíos solo mira `typeof contenido === "string"`. Hoy todo el paquete es texto, así que no hay hueco real. Si algún día se suman binarios (imágenes) como `Uint8Array`, uno de 0 bytes pasaría el smoke. El chequeo viejo tenía el mismo límite.
> - **Contenido no vacío pero inválido:** un 200 con cuerpo basura, como un HTML de error, no lo atrapa ni el viejo ni el nuevo. Está fuera del alcance de la tarjeta.
> - **Marcador ausente:** que falte un `.gitkeep` no lo ve el smoke. Eso lo cubre `paquete.test.mjs`, que la tarjeta declara como la lista que manda.
> - **Cobertura del paso:** solo se inspecciona la primera card de «Proyectos» (`web-app-full-stack`). Es igual que antes.
>
> VEREDICTO: APPROVED

## Nota del leader (2026-10-19)

**Merge.** `v0.37-L-8` entró a `main` en `4afdaab` con un solo conflicto: la línea `hash:` de `graph/sdd.md` y `graph/web.md`, que el commit de S49 había recalculado en `main` mientras la rama recalculaba las suyas. Resuelto **regenerando** con `python graph/_meta/sync_graph.py --update --accept`, no eligiendo un lado; `--check` después da los 13 nodos al día.

**Verificación sobre `main` ya mergeada** (no sobre la rama): `python harness/verify.py` VERDE, 0 FAIL, 2 WARN, 265 tests OK, y `node web/tests/smoke/smoke.mjs` **PASS, 22 pasos, 0 errores de consola**. Con eso el rojo que `main` arrastraba desde el 2026-10-16 queda cerrado localmente; lo de CI se confirma con el push.

**Qué se hizo con los no bloqueantes.** Ninguno se convierte en tarjeta hoy, y el motivo es distinto en cada caso. El de **contenido no-string** es el único con filo: el día que el paquete lleve un binario (una imagen, una fuente), un archivo de 0 bytes pasa el smoke. No es regresión —el chequeo viejo tenía el mismo límite— y hoy el paquete es todo texto, así que queda anotado acá para cuando eso cambie. Los otros tres son límites conocidos del alcance: el cuerpo inválido no lo atrapa ningún chequeo de los dos, el marcador ausente ya lo cubre el test sin navegador del paquete, y la cobertura de una sola card del catálogo es igual que antes de esta tarjeta.

**Lección al núcleo.** Salió antes del merge, en `9c7baa4`: `scenarios.md` S49 (0.25) y `harness.md` 0.39 (§3, §5 y la tabla de drift). Es la segunda vez en dos días que una review de este repo paga una lección de oficio, después de S48.

---

**Veredicto final (vigente): APPROVED.**
