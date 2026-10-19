# Review L-9 @ 278cee7
**Veredicto vigente (vuelta 1, @ 278cee7):** APPROVED · **mergeada a `main`** en `f6eaaa6` el 2026-10-19

Una vuelta. La tarjeta salió del diagnóstico del leader: `harness.yml` venía rojo en `main` desde el 2026-10-16 en 4 de los 6 jobs (Ubuntu y Windows, las dos versiones de Python), y la causa era que el fixture de la suite depende de **estado del ambiente que nunca declaró** — la identidad de git, que `ciclo.py` toma por su cuenta cuando corre `git commit`.

Eso define el riesgo de esta review, y es un riesgo raro: **un verde en la máquina del reviewer no prueba nada**, porque cualquier máquina donde se programe tiene identidad configurada. Toda la review depende de que el entorno sin identidad sea de verdad sin identidad. Por eso lo primero que se le pidió fue construirlo y **comprobarlo**, y es lo primero que hizo: `git config user.email` vacío, un `git commit` suelto en un repo temporal fallando con `Author identity unknown`, el worktree sin identidad local, y el contraste con el entorno normal (que sí devuelve el mail del owner). Sin esos cuatro controles, los 259 tests verdes de abajo serían decorativos.

El reviewer no implementó nada de esto, trabajó en un worktree propio en `278cee7` y re-ejecutó todo: nada de su evidencia viene copiada del handback (R30).

## Lo que re-ejecutó el reviewer (verbatim)

> Review de L-9 @ 278cee7: **APPROVED**. Los cinco criterios cumplen, el rojo de la base se reproduce sin identidad y los mutantes caen donde deben. Hay un hallazgo no bloqueante (un camino del mensaje sin test) y un punto que no pude verificar (los 6 jobs de CI).
>
> ## Entorno sin identidad: cómo lo monté y cómo lo comprobé
> - Usé export GIT_CONFIG_GLOBAL=/nonexistent/g GIT_CONFIG_SYSTEM=/nonexistent/s en cada comando. Vos no tocaste `git config --global`; yo tampoco, y la identidad global de la máquina sigue igual.
> - `git config user.email` y `git config user.name` devuelven vacío con ese entorno.
> - Probé directamente en un repo temporal: `git init; git add; git commit -qm x` falla con `Author identity unknown / *** Please tell me who you are.`
> - El repo del worktree no trae identidad local (`git config --list --show-origin` no muestra `user.*`).
> - Con el entorno normal, `git config user.email` devuelve `facumoreno2001@gmail.com`, así que la diferencia entre los dos entornos es real.
>
> ## Rojo en la base (b300044), sin identidad
> Corrí `python -m unittest test_ciclo` desde `harness/tests`.
> ```
> FAIL: test_en_verde_commitea_con_la_evidencia_pegada
> FAIL: test_nunca_ejecuta_deploy
> FAIL: test_una_salida_con_caracteres_de_caja_no_revienta
> FAILED (failures=3)
> ```
> La cola es la de CI:
> ```
> [ciclo] el commit falló (¿hook en rojo?):
> Author identity unknown
> fatal: unable to auto-detect email address (got 'Facundo@DESKTOP-ORMQBR9.(none)')
> ```
> Este entorno reproduce el de CI.
>
> ## Verde con el fix (278cee7)
> - Sin identidad, `test_ciclo`: `Ran 10 tests ... OK`.
> - Sin identidad, `python -m unittest discover -s harness/tests`: `Ran 259 tests in 128.9s — OK (skipped=1)`.
> - Con identidad (entorno normal), la misma suite: `Ran 259 tests in 122.1s — OK (skipped=1)`.
> - `python harness/verify.py` completo (con identidad): `Ran 265 tests in 20.570s · OK (skipped=3)` y `VERDE — 0 FAIL, 2 WARN`. Los dos WARN son el smoke del navegador, que no corre en `verify.py`, y la falta de `lint` en la config. No los corrí por fuera.
> - No corrí `verify.py` sin identidad. Su suite de harness sí la corrí sin identidad (los 259 de arriba).
> - No identifiqué cuáles son los skipped (1 en harness, 3 en `verify.py`); no son tests de esta tarjeta.
>
> ## Mutantes propios (todos sin identidad, solo `test_ciclo`)
> | Mutante | Resultado |
> |---|---|
> | M1: borrar las dos líneas `config user.email` / `user.name` de `support.py` | Vuelve el rojo: `FAILED (errors=10)`. El `setUp` revienta en `git commit -q --allow-empty -m inicio`, exit 128. El fix del fixture es lo que arregla el problema. |
> | M2: `ciclo.py` commitea aunque la verificación esté en rojo (`if not paso.verde:` pasa a `if False:`) | Cae **solo** `test_no_commitea_en_rojo` (`FAILED (failures=1)`). |
> | M3: volver al mensaje viejo `(¿hook en rojo?)` | Cae **solo** `test_un_commit_que_falla_muestra_lo_que_dijo_git_sin_adivinar_la_causa`. |
> | M4: el mensaje deja de imprimir stderr | Cae **solo** ese mismo test. |
> | M5: el mensaje deja de imprimir stdout | **Sobrevive**: `OK`. |
>
> - Criterio 2: `test_no_commitea_en_rojo` ahora afirma que no aparece `[ciclo] commiteando`, que no aparece `el commit falló` y que `HEAD` no cambió. Ya no puede pasar por «no pudo commitear».
> - Criterio 3 (mensaje): el test usa un hook `pre-commit` que escribe a stderr.
> - No probé salida no-UTF8 con un mutante propio. El mensaje pasa por `decodificar` (utf-8, cp1252, cp850), que ya existía y no cambió.
> - Dos mutantes (M1 y M2) los armé reescribiendo los archivos con Python y, al principio, convirtieron los saltos de línea. Eso no afecta el resultado. Rehice M1 conservando los saltos y dio `2 deletions` y el mismo error de `setUp`.
>
> ## Criterio por criterio
> 1. **Cumple.** En `support.py`, `Project` hace `self.git("config","user.email","t@t")` y `user.name` justo después de `init`, con `git config` local. `git()` ya no pasa `-c user.*`, así que M1 demuestra que la identidad sale de ahí.
> 2. **Cumple.** Ver M2 y el detalle del test arriba.
> 3. **Cumple.** El mensaje nuevo es `el commit falló (git salió con N); esto devolvió:` más stdout y stderr, sin proponer causa. El test además verifica `assertNotIn("¿hook", salida)`.
> 4. **Cumple.** `git diff b300044..278cee7 -- harness .github` buscando `global|environ|putenv|GIT_CONFIG|HOME|.gitconfig` en las líneas agregadas devuelve un único match, el comentario «suite no depende de la config global de quien la corre (ni la toca)». No hay escrituras a la config de usuario o sistema ni variables de entorno seteadas por tests. `.github/` no aparece en el `--stat`: el workflow no cambió.
> 5. **No verificable aquí, sin evidencia en contra.** No hay dependencias nuevas, y las pruebas locales sin identidad equivalen al caso de los jobs de Ubuntu y Windows. Los 6 jobs reales de `harness.yml` no puedo correrlos desde acá.
>
> ## Zona de archivos
> Dentro de la zona: `support.py`, `test_ciclo.py` y `ciclo.py`. El resto son los esperados: `sdd/progress/v0.37-L-9/{current,handback_L-9}.md` y las dos líneas de hash. En `graph/harness.md` y `graph/sdd.md` cambió **solo** la línea `hash:`, sin prosa. `verify.py`, `checks.py` y el workflow no se tocaron.
>
> ## Hallazgos
> - **Bloqueantes:** ninguno.
> - **No bloqueante:** M5 sobrevive. Ningún test cubre que el mensaje muestre stdout de git, porque el hook de prueba escribe solo a stderr. El criterio 3 exige mostrar lo que devolvió git, y ese camino está sin cubrir. Un hook que escriba a stdout y otro a stderr lo cerraría; conviene una tarjeta chica o una nota para el leader.
> - **No bloqueante:** `verify.py` dejó sdd/progress/detached/ sin trackear en mi worktree. Es residuo mío, no del diff.
>
> VEREDICTO: APPROVED

## Nota del leader (2026-10-19)

**Merge.** `v0.37-L-9` entró a `main` en `f6eaaa6` con `--no-ff` y **sin un solo conflicto**: a diferencia de L-8, acá la rama colgaba derecho de la punta de `main` (`b300044`), así que las líneas `hash:` de `graph/harness.md` y `graph/sdd.md` que la rama recalculó eran las únicas en juego. `git merge-tree --write-tree` lo había anticipado en seco antes de tocar nada.

**Verificación sobre `main` ya mergeada** (no sobre la rama): `python harness/verify.py` completo, **VERDE — 0 FAIL, 2 WARN**, `Ran 265 tests · OK (skipped=3)`. Los dos WARN son los conocidos y ninguno es de esta tarjeta: el del smoke del navegador —que lo puso L-8 justamente para que un verde acá no se lea como cobertura que no tiene— y la falta de `lint` en la config.

**Criterio 5, cerrado después del push.** Era el único que nadie había verificado —el reviewer no puede correr CI y el leader tampoco sin pushear—, así que quedó abierto hasta el push de `a8e6e1c` el 2026-10-19. Resultado: `harness` **6 de 6 jobs en verde** (corrida 39341553143), contra 2 de 6 en `ec168da`. Los cuatro que pasaron de rojo a verde son los de Ubuntu y Windows en Python 3.10 y 3.12, y los dos de macOS siguen verdes — eso también había que mirarlo, porque el arreglo toca el fixture que usa toda la suite. En la misma corrida, `web`: `smoke` y `tests` en verde. Lo que sí está probado es el equivalente local: la suite entera verde en un entorno sin identidad, que es la condición que distingue a los runners de Ubuntu y Windows de la imagen de macOS.

**Qué se hizo con el hallazgo no bloqueante (M5).** Decisión del owner, consultada antes del merge: **se mergea y queda escrito acá como límite conocido**, sin tarjeta propia hoy. El razonamiento, porque el hallazgo es más fino de lo que parece:

- No hay nada roto para quien usa el arnés. `ciclo.py` **sí** imprime los dos flujos de git. Lo que falta es el test que impida que mañana se imprima uno solo: el hook de prueba escribe a stderr nada más, así que borrar la mitad del stdout no hace caer ninguna afirmación.
- Es, en chico, **la misma forma que S48**: el criterio 3 pide «que el mensaje lleve lo que devolvió git» y está probado por mitades. La diferencia con los casos que sí frenaron una tarjeta es el daño si se rompe: se perdería el `echo` de un hook que no redirige, con el exit code y el stderr todavía en el mensaje. No tapa la causa, que era el punto del criterio.
- Lo cierra una línea: un hook de prueba que escriba a los dos flujos y un assert por cada uno. **Se hace en la próxima tarjeta que toque `harness/ciclo.py` o `harness/tests/test_ciclo.py`**, y queda anotado acá para que el que llegue no lo descubra leyendo mutantes.

El otro no bloqueante —sdd/progress/detached/ sin trackear en el worktree del reviewer— es residuo de su copia, no del diff: en `main` no existe.

**Lo que esta tarjeta deja probado y antes no.** Que la suite del arnés no depende de la configuración de quien la corre **ni la toca** (criterio 4, verificado grepeando las líneas agregadas, no leyendo el handback), y que un fallo de commit se reporta con lo que dijo git en vez de con una sospecha. El mensaje viejo —«¿hook en rojo?»— mandó al leader a buscar el hook durante el diagnóstico, cuando git decía «Author identity unknown» dos líneas más abajo. Ese costo es la razón del criterio 3.

---

**Veredicto final (vigente): APPROVED.**
