# Handback P-1 — Arrancar con el compacto y un índice; el master solo bajo demanda

- **Estado:** done
- **Rama / commit:** `v0.37-P-1` @ 62c3af7 (código; antes a721497); base `v0.37-plan` @ ab90d19
- **Quién:** implementer (sesión Opus)

## Hecho
- Check nuevo `check_startup` en `harness/checks.py` (corre en `verify.py --quick` vía `run_all`): FAIL si el arranque pasa de 10 KB (10240 bytes) y FAIL si alguna `R<nn>` del master no está definida en el arranque.
- `AGENTS.md` y `CLAUDE.md` mandan a leer `SDD-COMPACT.md`; el master queda «solo si la tarea lo pide».
- Índice «qué abrir para qué tarea» como sección `## ÍNDICE` dentro de `SDD-COMPACT.md` (y `SDD-COMPACT-EN.md`); reemplaza la línea `Ruteo:`.
- ZIP de la web (`web/paquete.js`): trae `sdd/SDD-COMPACT.md`, sus `AGENTS.md`/`CLAUDE.md` apuntan al compacto, el LEEME lo lista; barra de progreso 4→5.

## Decisiones
1. **Índice dentro del compacto, no archivo aparte.** Un solo archivo que mantener, espejar y mandar en el ZIP; el arranque queda en 2 archivos y el check no depende de un segundo nombre que alguien pueda dejar de citar. Costo: el compacto pasa de 6932 a 7816 bytes.
2. **Qué es «el arranque» para el check.** Por cada entry (`AGENTS.md` y `CLAUDE.md`, cada uno por separado; manda el más pesado) se suman, en bytes, el entry y, transitivamente, todo archivo `.md`/`.txt` existente citado (link `](x)` o `` `ruta` ``, relativo al archivo que cita o a la raíz) en una línea que tenga un verbo de lectura (leé, leer, read, cargá, obedecé…). Anti-burla: mover texto a otro archivo que el arranque manda a leer (aunque sea de segundo o tercer nivel) sigue contando; solo queda afuera lo que se cita sin verbo («abrilo solo si la tarea lo pide»). Mandar a leer el master lo mide con todo lo que él manda a leer (194016 bytes) y falla. Limitación declarada: una instrucción de lectura sin esos verbos, o con la ruta en otra línea, no se sigue.
3. **Cobertura de reglas.** Una regla cuenta solo si está *definida* (línea que empieza `R<nn> nombre:` o `**R<nn> ·`) en un archivo del arranque; citar «(R31)» en el índice no alcanza (si no, borrar la línea R31 del compacto pasaba, porque el índice la nombra). Las reglas del master salen de las líneas `**R<nn> ·` de su §4 (33).
4. Sin `AGENTS.md`/`CLAUDE.md` el check no tiene nada que medir (OK): los proyectos de prueba del arnés no los tienen. Un proyecto instalado con el AGENTS viejo («Leé sdd/SDD-MASTER.md») pasa a FAIL por tamaño al actualizar `harness/`: es lo buscado, hay que actualizar su AGENTS.md.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `harness/checks.py` | `check_startup`, `_startup_files`, constantes, llamada en `run_all` |
| `harness/tests/test_arranque.py` | 19 tests nuevos |
| `AGENTS.md`, `CLAUDE.md` | mandan al compacto |
| `SDD-COMPACT.md`, `SDD-COMPACT-EN.md` | sección ÍNDICE |
| `web/paquete.js` | compacto en el ZIP, espejos nuevos, LEEME |
| `web/tests/paquete.test.mjs` | 3 tests P-1 |

## Evidencia
Bytes que carga el arranque (`wc -c`):
```text
antes:   AGENTS.md 627 + SDD-MASTER.md 36686 = 37313 bytes
después: AGENTS.md 755 + SDD-COMPACT.md 7816 = 8571 bytes   (tope 10240; margen 1669)
```
| Criterio | Lo demuestra |
|---|---|
| 1. ≤ 10 KB | `verify.py --quick`: `[OK] Arranque liviano: 8571 bytes de 10240`; `test_arranque.TestTamano.*` (límite inclusivo, bytes distinto de caracteres); web «P-1: el arranque del ZIP… ≤ 10 KB» |
| 2. Índice | sección `## ÍNDICE` de `SDD-COMPACT.md` (loops→loops.md, roles/tarjetas→orchestration.md, arnés→harness.md, regla completa→SDD-MASTER.md §4…) |
| 3. Check + rojo forzado | `TestTamano`, `TestReglas`, `TestCableado` y los rojos de abajo |
| 4. ZIP | 3 tests «P-1» en `web/tests/paquete.test.mjs` |
| 5. Espejo EN, verde | «Verde después» |

Rojo antes (R29), medido contra la base. Python (primero ImportError porque `STARTUP_MAX_BYTES` no existía; con el check como stub vacío):
```text
$ python -m unittest test_arranque
Ran 17 tests in 2.756s
FAILED (failures=12)
```
Web, con el `web/paquete.js` de a721497 (sin el cambio):
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 77   ℹ pass 74   ℹ fail 3
✖ P-1: el AGENTS.md y el CLAUDE.md del ZIP mandan a leer el compacto, no el master
✖ P-1: el LEEME del ZIP lista el compacto y no dice que AGENTS.md apunta al master
✖ P-1: el arranque del ZIP (espejo + compacto) pesa ≤ 10 KB y define todas las reglas del master
```
Rojo forzado del check sobre el repo real (`verify.py --quick`), cada uno revertido:
```text
# caso 1: SDD-COMPACT.md + 2000 bytes
[FAIL]  Arranque de AGENTS.md: 10571 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-COMPACT.md. …
[FAIL]  Arranque de CLAUDE.md: 10571 bytes > tope 10240 (P-1); …
ROJO — 2 FAIL, 0 WARN
# caso 2: se borra la línea R33 del compacto
[FAIL]  Arranque de AGENTS.md: no define R33 del SDD-MASTER.md (ninguna regla puede quedar fuera del compacto ni del índice)
[FAIL]  Arranque de CLAUDE.md: no define R33 del SDD-MASTER.md (…)
ROJO — 2 FAIL, 0 WARN
# caso 3: AGENTS.md viejo (Leé SDD-MASTER.md)
[FAIL]  Arranque de AGENTS.md: 194016 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-MASTER.md, CLAUDE.md, custom.md, …
```
Tabla de mutantes sobre `check_startup` (cada corrida de `test_arranque` con `timeout=120 s` vía `subprocess.run`; revertidos con `git checkout`; script en `scratchpad/p1-impl/mutantes.py`):

| Mutante | Resultado |
|---|---|
| M1 `>` a `>=` en el tope | muerto |
| M2 tope 10 a 11 KB | muerto (test que fija 10 KB) |
| M3 sin el verbo «leé» | muerto |
| M4 sin seguimiento transitivo | muerto |
| M5 caracteres en vez de bytes | muerto |
| M6 citar la regla alcanza | muerto |
| M7 solo mira AGENTS.md | muerto |
| M8 sin chequeo de reglas | muerto |
| M9 links solo desde la raíz | muerto |
| M10 no corre en `run_all` | muerto |
| M11 `missing` invertido | muerto |
| M12 sin rutas entre backticks | muerto |
| M13 sin links markdown | muerto |
| M14 sin CLAUDE.md como entry | muerto |
| M15 todo link entra, sin verbo | muerto |

15/15 muertos, ningún timeout.

Verde después:
```text
$ python harness/verify.py --quick   (cola)
[OK]    Rutas citadas existen (217 revisadas)
[OK]    Arranque liviano: 8571 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); 33 reglas definidas
VERDE — 0 FAIL, 0 WARN
$ python -m unittest discover -s harness/tests   -> Ran 197 tests … OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> ℹ tests 77  ℹ pass 77  ℹ fail 0
```

## Fuera de zona / riesgos
- `SDD-MASTER.md` §1 paso 4 y su recuadro inicial («Leé este archivo completo») siguen diciendo que `AGENTS.md` es «Leé sdd/SDD-MASTER.md»; `models.md` también describe los espejos. No los toqué (zona): el leader debería alinear ese texto (versión y changelog) en otra tarjeta. `web/prompt.js` («Pegá/adjuntá primero el SDD-MASTER») queda igual: el primer mensaje manual necesita el master para el START-PROMPT.
- El compacto del ZIP nombra docs (`loops.md`, `teams.md`, `scenarios.md`…) que el ZIP no trae; el índice lo cubre con «si el doc no vino al proyecto, pedíselo al humano».
- «El instalador» no existe aparte del ZIP de `paquete.js`; `soloMd` (MD sueltos) no genera AGENTS.md y no se tocó.
- Descuido mío, corregido: un `git checkout -- AGENTS.md` durante el rojo forzado borró cambios sin commitear; los rehíce y desde entonces commiteo antes de mutar.


---

# Vuelta 2 (review CHANGES_REQUESTED @ b7e4cd9, zona ampliada 0dcbb9a)

- **Estado:** done
- **Rama / commit:** `v0.37-P-1`, último commit de código b2cb030 (base de la vuelta: 0dcbb9a)

## Bytes del arranque, misma base (LF, `git cat-file -s`)
```text
antes  (ab90d19):  AGENTS.md 616 + SDD-MASTER.md 36300                    = 36916   (custom.md no se leía como arranque)
ahora  (HEAD):     AGENTS.md 432 + SDD-COMPACT.md 8479 + custom.md 984    =  9895   (tope 10240, margen 345)
```
`verify.py --quick`: `[OK] Arranque liviano: 9895 bytes de 10240 (AGENTS.md + SDD-COMPACT.md, custom.md); 33 reglas definidas`. El check ahora mide en LF (CRLF cuenta como 1 byte), así que un clon de Windows da lo mismo. Nada de recortar reglas ni subir el tope: se entró comprimiendo el recuadro «Este repo es el paquete» del AGENTS.md (de ~540 a ~290 bytes) y la redacción nueva.

## Pedidos 1 a 10 y zona ampliada
1. Fijas / desactivables / AUTO en el compacto (ES y EN): las 16 fijas listadas, AUTO R21 y R31, «un pedido de apagar una fija se rechaza y se explica», confirmar y registrar el toggle en §3.
2. `custom.md` en el arranque: `AGENTS.md`/`CLAUDE.md` lo nombran con verbo de lectura y el check lo suma **siempre** (`custom.md` en la raíz, en `sdd/` o junto al master), aunque nadie lo cite; cuenta en los 10 KB. Es una hoja: sus propias citas no se siguen (el de la plantilla dice «el agente lee el master primero» y no es arranque), pero sus bytes cuentan. El ZIP (`web/paquete.js`) también lo nombra y un test arma el ZIP con un `custom.md` y mide.
3. Header del compacto: «arranque de TODA sesión (FULL, LITE, FEDERADO)»; COMPACT pasa a «pegar solo esto».
4. R23: explicar lo básico, R03 se INVIERTE con NOVATO, registrar NOVATO|PRO en §3.
5. R22 («al arrancar preguntar qué agentes… y generar los espejos que falten»), R12 (N4 de seguridad.md + `playbooks/ia-en-el-producto.md`, registrar en §3) y R01 («al iniciar sesión»).
6. Índice: «identidad, modo, nivel y toggles registrados -> §3», y el master «bajo demanda».
7. Burlas del check: rutas sueltas sin backticks (`Leé sdd/SDD-MASTER.md y obedecé…`), verbos extra (seguí, seguir, respetá, consultá, follow, see, aplicá, lée), y criterio invertido para el master: cualquier nombre del master en el arranque cuenta salvo en una línea con «solo si / bajo demanda / only if / on demand». Las citas del resto de los archivos siguen exigiendo verbo. Cada una con su test, visto en rojo.
8. Tests que matan los mutantes vivos de la review: R10 (master con R10 y R33), R7 (regla a mitad de línea), R15 (`R03:` sin nombre), R2 (ancla), y además `.txt`, borde del verbo, `TestRepoReal` exige `33 reglas definidas`. **Limitación declarada: el check solo valida que cada `R<nn>` esté definida como línea `R<nn> nombre:` en el arranque; no valida el contenido de las reglas** (vaciar las 33 a `Rnn nombre:` pasa, y la review lo probó).
9. Test web: `doesNotMatch` contra el texto viejo del LEEME, `Apuntan al compacto`, y el AGENTS del ZIP nombra `sdd/custom.md` y deja el master «solo si la tarea lo pide».
10. Este apartado: mismas bases, rojos y salidas de las tres suites.

Zona ampliada:
- **L1** `harness/hooks/claude.py`: el hook de inicio dice `Leé sdd/SDD-COMPACT.md (y sdd/custom.md, que pisa) y seguí desde…` y «El master (…) se abre solo si la tarea lo pide». Sin compacto (arnés viejo), cae al master como antes. 3 tests nuevos en `test_hooks.py`.
- **L2** `SDD-MASTER.md` y `SDD-MASTER-EN.md`: recuadro inicial, §1 paso 4 y paso 5, fila «Arrancar la sesión» de §2, mapa de §5. `models.md` (líneas 9 y 13). `prompts/relevo.md`, `agents/README.md`.
- **R22: cambio de texto con OK del owner (2026-10-07).** En `SDD-MASTER.md`, `SDD-MASTER-EN.md` y la descripción `d` de R22 en `web/reglas.js`: «apunta al arranque (`SDD-COMPACT.md` con su índice; el master se abre bajo demanda)». El resto de R22 y de las demás reglas, intacto. En el compacto, la línea R22 ya no decía «apunta acá»; solo sumó la acción de arranque.
- No toqué `custom.md` (archivo del usuario): su frase «El agente lee el master primero» queda desactualizada; conviene que el leader la alinee.

## Rojo antes (R29), medido contra la base 0dcbb9a
```text
$ python -m unittest test_arranque      (tests nuevos, check sin los cambios)
Ran 35 tests in 8.285s     FAILED (failures=17)    # verbos, rutas sueltas, master sin verbo, custom.md, CRLF
$ python -m unittest test_arranque.TestCustom  (hoja)  -> FAIL test_custom_md_es_una_hoja_sus_citas_no_se_siguen
$ python -m unittest test_hooks.TestSessionStart
Ran 9 tests in 2.036s      FAILED (failures=3)     # compacto, compacto junto al master, custom.md
$ node --test "web/tests/*.test.mjs"    (web/paquete.js de la base)
ℹ tests 77  ℹ pass 76  ℹ fail 1  ✖ P-1: el AGENTS.md y el CLAUDE.md del ZIP mandan a leer el compacto… (custom.md y master bajo demanda)
```

## Rojo forzado del check sobre el repo real (`verify.py --quick`, revertido con `git checkout`, árbol commiteado antes)
```text
# R1 compacto +400 bytes
[FAIL]  Arranque de AGENTS.md: 10295 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-COMPACT.md, custom.md. …   ROJO — 2 FAIL
# R2 se borran las líneas R22 y R33 del compacto
[FAIL]  Arranque de AGENTS.md: no define R22, R33 del SDD-MASTER.md (…)                                        ROJO — 2 FAIL
# R3 burla: «Seguí SDD-MASTER.md» agregado al AGENTS.md
[FAIL]  Arranque de AGENTS.md: 199954 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-COMPACT.md, custom.md, SDD-MASTER.md, …
# R4 custom.md +400 bytes
[FAIL]  Arranque de AGENTS.md: 10295 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-COMPACT.md, custom.md. …   ROJO — 2 FAIL
```

## Tabla de mutantes (`subprocess.run(..., timeout=180)` por corrida; commit antes de mutar; revertidos; `scratchpad/p1-impl/mutantes2.py`)
Sobre `harness/checks.py` contra `test_arranque`, y sobre `harness/hooks/claude.py` contra `test_hooks`. Resultado: **31 muertos, 0 vivos, 0 timeouts.**

| Grupo | Mutantes (todos muertos) |
|---|---|
| Tamaño | tope `>`→`>=`; tope 10→11 KB; caracteres en vez de bytes; sin normalizar CRLF; solo mira AGENTS.md; sin CLAUDE.md |
| Seguimiento | sin verbo «leé»; sin verbos extra (seguí…); sin follow/see; verbo sin borde de palabra; sin transitividad; rutas solo desde la raíz; el verbo no filtra; sin quitar `#ancla`; sin `.txt` |
| Master | cuenta solo con verbo; «bajo demanda» no exime |
| custom.md | sin custom automático; custom no es hoja; custom solo en `sdd/` |
| Reglas | citar alcanza; sin `^` (mitad de línea); sin nombre define; `missing` invertido; sin chequeo; `MASTER_RULE_RE` solo `R0x`; no corre en `run_all` |
| Hook | vuelve al master; sin custom; sin nota «bajo demanda»; compacto fuera del dir del master |

Dos mutantes de la vuelta 1 (sin backticks, sin links) y el filtro de extensión pasaron a ser equivalentes porque la ruta suelta los cubre: borré ese código redundante en vez de dejar tests que no distinguen.

## Verde después (b2cb030)
```text
$ python -m unittest discover -s harness/tests   -> Ran 217 tests in 110.024s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> ℹ tests 77  ℹ pass 77  ℹ fail 0
$ python harness/verify.py --quick               -> [OK] Arranque liviano: 9895 bytes de 10240 (…); VERDE — 0 FAIL, 0 WARN
```

## Fuera de zona / pendiente
- `custom.md` (usuario) y `web/prompt.js` / `skills/sdd-arranque` (primera sesión, necesita el master) no se tocaron.
- `skill/sdd-universal.skill` sigue viejo (v0.3), ya señalado por la review.
- Un incidente mío durante la vuelta: un `git reset --soft` mal pensado sacó un commit; lo recuperé con el reflog antes de seguir y no se perdió trabajo.


---

# Vuelta 3 (review de la vuelta 2 @ 0743fb4; decisión del owner 2026-10-07)

- **Estado:** done
- **Rama / commit:** `v0.37-P-1`, código en 068751e (base de la vuelta: a5f296b)

## Bytes, misma base (LF, `git cat-file -s`)
```text
antes (ab90d19):  AGENTS.md 616 + SDD-MASTER.md 36300                 = 36916
ahora (068751e):  paquete = AGENTS.md 432 + SDD-COMPACT.md 8520       =  8952   (tope FAIL 10240, margen 1288)
                  custom.md                                           =   990   (aparte; aviso WARN > 2048)
```
`verify.py --quick`: `[OK] Arranque liviano: paquete 8952 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); custom.md 990 bytes (aparte; aviso > 2048); 33 reglas definidas`.

## Qué se hizo
- **11 (burla del «bajo demanda»):** el master queda exento solo si la línea dice «bajo demanda / solo si / only if / on demand» **y no tiene verbo de lectura** (`found == master and (reads or not on_demand)` cuenta). Un test por cada una de las 4 sondas de la review. Las líneas reales del arranque (AGENTS/CLAUDE, índice ES/EN, espejo del ZIP) no tienen verbo: verde.
- **12:** recuadro del master ES y EN: «Si lo abriste, leé solo la sección que la tarea pide (§4 una regla, §6 el start-prompt…)» / «read only the section the task needs».
- **13:** R23 recupera «lenguaje llano, cero jerga sin explicar» (ES) y «plain language, zero unexplained jargon» (EN).
- **14:** tests para N8 (otro archivo con verbo y «solo si» cuenta) y H3 (el hook encuentra `custom.md` en la raíz con el master en `sdd/`).
- **Decisión del owner (custom.md):** el FAIL de 10 KB es solo del paquete (espejo + compacto + lo que manden a leer). `custom.md` se lee siempre (se suma solo, aunque nadie lo cite) y tiene tope propio: WARN si pasa de 2048 bytes, nunca FAIL. El mensaje (OK y FAIL) muestra las dos cifras por separado. Sigue siendo hoja (lo que nombra no es arranque) y ya no cuenta como «regla definida».
- **`web/reglas-ui.js`:** el `custom.md` que genera la web dice «El agente lee el compacto al arrancar y después este archivo»; test web que lo fija.

## Rojo antes (R29), contra la base a5f296b (más la constante `CUSTOM_WARN_BYTES` como stub para poder importar)
```text
$ python -m unittest test_arranque test_hooks
Ran 65 tests in 46.083s    FAILED (failures=10)
 4 x test_bajo_demanda_con_verbo_de_lectura_no_exime_al_master (subTests de las 4 sondas)
 test_custom_grande_avisa_y_no_falla, test_custom_de_la_raiz_tambien_avisa, test_el_aviso_es_inclusivo_a_2_kb,
 test_el_paquete_no_cuenta_el_custom_en_su_tope, test_el_mensaje_muestra_las_dos_cifras_por_separado, test_el_fail_tambien_separa_las_cifras
$ node --test "web/tests/*.test.mjs"
ℹ tests 79  ℹ pass 77  ℹ fail 2
✖ P-1: el custom.md que genera la web dice que el agente lee el compacto al arrancar, no el master
✖ P-1: el recuadro del master no manda a leerlo entero y R23 conserva «lenguaje llano»
```
(El `custom.md` realista de 15 overrides + 8 notas, los tests de N8 y de H3 pasaban antes del cambio: son tests que matan mutantes, no que fallan en la base.)

## Rojo forzado sobre el repo real (`verify.py --quick`, revertido con `git checkout`, árbol commiteado)
```text
# A custom.md +1500 bytes
[WARN]  custom.md pesa 2490 bytes (> 2048): se lee en cada sesión y se paga en cada llamada; …
[OK]    Arranque liviano: paquete 8952 bytes de 10240 (…); custom.md 2490 bytes (aparte; aviso > 2048); 33 reglas definidas
VERDE — 0 FAIL, 1 WARN                       # warn, nunca fail
# B compacto +1400 bytes
[FAIL]  Arranque de AGENTS.md: paquete 10352 bytes > tope 10240 (P-1); custom.md 990 bytes (aparte; aviso > 2048); carga AGENTS.md, SDD-COMPACT.md. …   ROJO — 2 FAIL
# C burla «Leé SDD-MASTER.md completo (solo si sos un agente de IA).» en AGENTS.md
[FAIL]  Arranque de AGENTS.md: paquete 199114 bytes > tope 10240 (P-1); …   ROJO — 1 FAIL
```

## Mutantes (`subprocess.run(..., timeout=180)`; commit antes de mutar; revertidos; `scratchpad/p1-impl/mutantes3.py`)
40 mutantes (los de la vuelta 2 actualizados + nuevos), **40 muertos, 0 vivos, 0 timeouts**. Nuevos: el «bajo demanda» exime aun con verbo; aviso a 4 KB; custom grande es FAIL; custom cuenta en el tope del paquete; sin aviso; aviso exclusivo (`>=`); mensaje sin la cifra de custom; custom cuenta como regla definida; hook con `custom.md` solo junto al master. (M7 se corrió aparte porque cambió su patrón: muerto.)

## Verde después (068751e)
```text
$ python -m unittest discover -s harness/tests   -> Ran 225 tests in 115.862s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> ℹ tests 79  ℹ pass 79  ℹ fail 0
$ python harness/verify.py --quick               -> VERDE — 0 FAIL, 0 WARN
```

## Pendiente / notas
- Sin cambios fuera de zona. `skill/sdd-universal.skill` (v0.3) y `loops.md` fuera del ZIP siguen como en la review.
- El check sigue sin validar el contenido de las reglas (solo que cada `R<nn>` esté definida).
