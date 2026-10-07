# Review P-1 @ 455e5a56a1b16b39774fd304a13f445ce6069773
**Veredicto:** APPROVED

> Vuelta 1 @ b7e4cd9 (CHANGES_REQUESTED) abajo; vuelta 2 @ 0743fb4 (CHANGES_REQUESTED) y vuelta 3 @ 455e5a5 (APPROVED) al final.

Reviewer independiente (tier ALTO). Base `ab90d19`, código `62c3af7`, handback en `b7e4cd9`. Trabajé solo en el worktree `sdd-universal-P-1-rev` (rama `v0.37-P-1-rev`). Python 3.14.0, Node v24.11.1. Mis scripts están en `scratchpad/p1-rev/`: `sondas.py`, `sondas2.py`, `mutantes.py`, `mutantes2.py`, `zip.mjs` y `check_zip.py`. Cada mutante corrió con `subprocess.run(..., timeout=120)` y lo revertí con `git checkout -- harness/checks.py`. `verify.py` creó `sdd/progress/v0.37-P-1-rev/current.md` de plantilla en cada corrida. Lo borré cada vez y no lo commiteé.

**Resumen.** El mecanismo está bien hecho: el check, el ZIP, el espejo EN, los tests en verde y el rojo reproducido. **El contrato no.** El compacto era un cheat-sheet para chat y ahora es lo único que lee el agente al arrancar. Así quedan afuera condiciones duras del master: qué reglas son fijas, la lectura de `custom.md`, la inversión de R03 con NOVATO y el registro en §3. El header del compacto le dice al agente que está en modo COMPACT. Además, el hook de inicio de Claude Code (lo resuelve el leader) sigue mandando a leer el master en cada sesión.

## 1. Zona
`git diff ab90d19..b7e4cd9 --stat` da 9 archivos: `AGENTS.md`, `CLAUDE.md`, `SDD-COMPACT.md`, `SDD-COMPACT-EN.md`, `harness/checks.py`, `harness/tests/test_arranque.py`, `web/paquete.js`, `web/tests/paquete.test.mjs` y el handback. Todos están en la zona. `SDD-MASTER.md` quedó sin tocar: blob de 36300 bytes en las dos puntas y fuera del diff. El espejo EN replica el índice ES línea por línea.

## 2. Bytes del arranque (medidos por mí)
```text
blobs (LF), git cat-file -s:
  ab90d19: AGENTS.md 616 + SDD-MASTER.md 36300 = 36916
  b7e4cd9: AGENTS.md 755 + SDD-COMPACT.md 7816 =  8571
disco (autocrlf=true, CRLF), verify.py --quick:
  [OK] Arranque liviano: 8640 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); 33 reglas definidas
ZIP generado (PRO y NOVATO): AGENTS.md 214 + sdd/SDD-COMPACT.md 7873 = 8087
```
En el «antes» del handback (627 + 36686 = 37313), los bytes son del disco con CRLF. En el «después» (8571), los bytes son del blob con LF. La comparación mezcla dos bases. No cambia la conclusión: la baja es de ~37 KB a ~8,6 KB. El check mide en disco, así que en un clon de Windows suma unos 70 bytes por los CRLF.

## 3. Contrato: el master contra el compacto, regla por regla
Leí §0 a §4 del master, más el recuadro inicial y §1, contra el compacto en `b7e4cd9`. Las pérdidas no vienen de esta tarjeta: el compacto ya era así. Pero la tarjeta lo convierte en el único arranque («sin perder ninguna regla obligatoria»), así que ahora cuentan. Marco **[DURA]** las que cambian el sentido o sacan una condición obligatoria:

| Dónde | El master dice | El compacto dice | Gravedad |
|---|---|---|---|
| §4 toggles | Cada regla es **fija** o **desactivable**, y R21/R31 son **[AUTO]**. «El agente confirma y lo registra en §3». | `Toggle: "Rxx=OFF" apaga una regla.` No distingue fijas, solo marca AUTO en R31 y no pide confirmar ni registrar. | **[DURA]** Un agente que solo lee el compacto acepta `R30=OFF` o `R17=OFF`. |
| §1.5 custom.md | «El agente lee el master y después `custom.md`, que pisa». | `Overrides personales → custom.md` y el índice lo cita solo para «adaptar el SDD». Ninguna línea lo manda a leer. | **[DURA]** El ZIP trae `sdd/custom.md` (probé con `R01=OFF`) y el arranque nuevo nunca lo lee: los overrides de la web se ignoran en silencio desde la sesión 2. |
| Header y MODO | El modo COMPACT es para agentes solo-chat y subagentes baratos. | `# Uso: pegar como primer mensaje en agentes solo-chat…` y `MODO: … COMPACT(esto)`. | **[DURA]** Un agente de un proyecto FULL que arranca por el compacto lee que está en modo COMPACT. |
| R23 NOVATO | (c) explicar terminal, npm, etc.; (e) **R03 se invierte**: el agente asume más decisiones técnicas y explica cada una; registrar NOVATO/PRO en §3. | Pensar-por-tres, lenguaje llano, un paso por vez, tests++. | **[DURA]** Falta (e). El R03 del compacto («modelo bajo ⇒ literal») queda sin la excepción NOVATO. |
| R22 | «En el arranque, preguntar qué agentes usa el equipo y generar los espejos que falten». | Lista de espejos y tiers. | Media: se pierde una acción del arranque. |
| R12 | Registrar la recomendación en §3. Si el **producto** tiene IA: nivel N4 de `seguridad.md` + `playbooks/ia-en-el-producto.md` (el tope de gasto es una reserva). | «Recomendar tier por tarea». | Media: R27 pregunta «¿IA?», pero no dice N4 ni el playbook. |
| §3 identidad | El agente la completa en el arranque: modo, nivel, perfil, toggles. | R18 dice «registrarlo», sin decir dónde. El índice no apunta a §3. | Media. |
| Recuadro 4 / R01 | «**Al iniciar sesión**, avisá que R01 está activa y es desactivable». El agente presenta el diff y espera. | `avisar que es desactivable` (no dice cuándo). | Baja-media. |
| R29 | Con un módulo nuevo, el rojo es contra un stub vacío que importa: un error de import no es rojo. | No está. | Baja: el índice manda a `harness.md` para tests. |
| R28 | Si la línea nombra una versión, verificarla contra el registro. | No está. | Baja. |
| R18 | Umbral LITE: ≤~300 líneas o ≤1 día. Plantilla en `prompts/sdd-lite.md`. El humano puede forzar el modo. | «script chico». | Baja. |
| R09 | Las actualizaciones incrementales van solo en la Fase 1. | No está. | Baja (R08 lo cubre). |

El resto (R02–R08, R10, R11, R13–R17, R19–R21, R24–R27, R30–R33) conserva sus condiciones duras en el compacto.

**¿El índice manda a abrir el master cuando hace falta?** Cubre el texto completo de una regla (§4, «nunca entero»), el ruteo (§2), el start-prompt y brownfield (§6), loop/handback (§7) y done (§10). Le faltan **§3** (registrar modo, nivel, toggles y tier) y el caso «me piden apagar una regla o hay duda sobre si es fija». Ese caso se resuelve sin abrir el master si el compacto marca las fijas (pedido 1).

## 4. El check `check_startup`: sondas
Usé el master y el compacto reales en un proyecto temporal con layout `sdd/` (`sondas.py`, `sondas2.py`):

| Sonda | Resultado |
|---|---|
| `Leé \`sdd/SDD-MASTER.md\`` solo, con link `[x](sdd/SDD-MASTER.md)`, con `./`, con `#ancla`, en mayúsculas `LEÉ`, `Leelo:`, `Leé:` | FAIL por tamaño (bien) |
| Verbos fuera de la lista (`Seguí`, `Respetá`, `Consultá`, `Follow`, `See`, `Abrí`, `Mirá`, `Aplicá`, `Usá`, `Lée`), ruta en otra línea, autolink `<…>` y el AGENTS de §1 paso 4 tal cual (`Leé sdd/SDD-MASTER.md`, sin backticks), **sin** el compacto | FAIL por reglas: no está el compacto, así que no define ninguna. La segunda red funciona. |
| **Compacto + `Seguí/Respetá/Consultá/Follow/See/Lée \`sdd/SDD-MASTER.md\`` en otra línea del AGENTS** | **OK con 7939 bytes: burla** |
| **Compacto + `Leé sdd/SDD-MASTER.md y obedecé sus reglas.`** (ruta sin backticks: el formato que prescriben el master §1 paso 4 y `models.md`) | **OK: burla** |
| Compacto + master en la línea siguiente, o `<autolink>` | OK: burla |
| El compacto manda a leer el master (segundo nivel) | FAIL con 44610 (bien, la transitividad anda) |
| Ciclo compacto ↔ AGENTS | Termina. El entry no se resuelve y se cuenta dos veces: sobrecuenta, que es el lado seguro. |
| Archivo citado que no existe | Se ignora en silencio (OK). Aceptable: lo cubre `check_cited_paths`. |
| Todas las reglas vaciadas a `Rnn nombre:` | **OK con 3091 bytes, 33 «definidas»**: el check no valida contenido. Es una limitación declarable, no se puede automatizar del todo. |
| R33 borrada del compacto / R34 nueva en el master y no en el compacto | FAIL (bien) |
| `R100` nueva en el master | No se detecta (`\d\d\b`). Caso de borde. |
| `GEMINI.md` / `.cursor/rules` mandan a leer el master | No se mide (solo AGENTS/CLAUDE son entry). Caso de borde. |

## 5. Mutantes propios sobre `harness/checks.py` (contra `test_arranque`)
| Mutante | Resultado |
|---|---|
| R1 sin deduplicar (ciclos) | muerto |
| R2 no quita el `#ancla` | **VIVO** |
| R3 sin filtro de extensión `.md/.txt` | **VIVO** |
| R4 sin `.txt` | **VIVO** |
| R5 sin `re.I` en los verbos | muerto |
| R6 sin borde de palabra en los verbos | **VIVO** |
| R7 `RULE_DEF_RE` sin `^` (cuenta una regla nombrada a mitad de línea) | **VIVO** |
| R8 rutas solo desde la raíz | muerto |
| R9 sin entries ⇒ FAIL | muerto |
| R10 `MASTER_RULE_RE` solo ve `R0x` | **VIVO**: los tests usan un master con R01–R03. Con este mutante, borrar R33 del compacto real queda en verde y ningún test lo nota. |
| R11 `missing` sin la primera | muerto |
| R12 tamaño solo del entry | muerto |
| R13 tamaño sin el último archivo | muerto |
| R14 `SKIP_CHARS` invertido | muerto |
| R15 `Rnn:` sin nombre cuenta como definida | **VIVO** |

8 muertos y 7 vivos, ninguno por timeout. Los 15 mutantes del implementer no se pisan con estos.

## 6. ZIP e instalación
Armé el ZIP como lo arman los tests (`vm` + `fetch` desde disco, `zip.mjs`), con PRO y NOVATO y `custom: "R01=OFF"`, y lo descomprimí:
- `AGENTS.md` y `CLAUDE.md` son idénticos: `Leé \`sdd/SDD-COMPACT.md\` (…) y obedecé sus reglas.` y `El texto completo de una regla vive en \`sdd/SDD-MASTER.md\`: abrilo solo si la tarea lo pide, no de arranque.` Ambos traen `sdd/SDD-COMPACT.md`.
- El check sobre el proyecto generado da `[OK] Arranque liviano: 8087 bytes de 10240 (AGENTS.md + sdd/SDD-COMPACT.md); 33 reglas definidas`, en PRO y en NOVATO. Además corrí `verify.py --quick` *del ZIP* después de `git init`: `VERDE — 0 FAIL, 1 WARN` (el WARN es el e2e sin corrida, ajeno a esta tarjeta).
- Docs del índice que el ZIP **no** trae: `loops.md`, `scenarios.md`, `teams.md`, `models.md`, `tecnologias.md`, `blocks.md`, `playbooks/catalog.md`, `prompts/maintenance-prompt.md` y `GUIDE.md`. Sí trae: master, compacto, `harness.md`, `orchestration.md`, `seguridad.md`, `custom.md` y `prompts/{handback,relevo,sdd-lite,task-card}.md`.
- **Otros caminos de instalación o arranque que siguen mandando al master:**
  - `harness/hooks/claude.py:66`, en SessionStart, imprime `Leé {master} y seguí desde el próximo paso…` en **cada sesión** de Claude Code con el arnés. El ZIP lo trae (`harness/hooks/claude.py`) y `test_hooks.py:61,75` fija ese texto.
  - `prompts/relevo.md:51` y `agents/README.md:8` (`Leé sdd/SDD-MASTER.md y agents/<rol>.md`).
  - `skills/sdd-arranque/SKILL.md:11`: es de la primera sesión y necesita §6, así que es razonable.
  - `skill/sdd-universal.skill` está viejo (v0.3, R01–R20) desde antes de esta tarjeta.
  - `web/prompt.js`: «leelo DESPUÉS del master», para la primera sesión.

## 7. Verde re-ejecutado @ b7e4cd9
```text
$ python -m unittest discover -s harness/tests      -> Ran 197 tests in 91.279s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"                -> ℹ tests 77  ℹ pass 77  ℹ fail 0
$ python harness/verify.py --quick                  -> [OK] Arranque liviano: 8640 bytes de 10240 …; VERDE — 0 FAIL, 0 WARN
```
Rojo reproducido contra la base (R29):
```text
web/paquete.js de ab90d19            -> ℹ tests 77 ℹ pass 74 ℹ fail 3 (los tres «P-1: …»)
AGENTS/CLAUDE/COMPACT de ab90d19     -> [FAIL] Arranque de AGENTS.md: 193825 bytes > tope 10240 … ROJO — 2 FAIL
```

## Pedidos al implementer (dentro de su zona)
1. **Fijas, desactivables y AUTO en el compacto.** Cambiar la línea `Toggle:` para que diga que solo se apagan las desactivables, que el agente confirma y que lo registra en §3. Listar las fijas (`R02 R05 R06 R08 R09 R11 R13 R15 R16 R17 R20 R25 R26 R27 R30 R32`) y las AUTO (`R21 R31`), y que un pedido de apagar una fija se rechace y se explique.
2. **`custom.md` en el arranque.** Agregar al compacto (o al AGENTS/CLAUDE del repo y del ZIP) que, si existe `custom.md` (`sdd/custom.md` en un proyecto), se lee después del compacto y pisa. Que el check lo cuente: no vale esquivar el verbo. Hay que mirar el presupuesto: el `custom.md` de este repo pesa 1012 bytes, así que el arranque quedaría en ~9,6–10,1 KB. Si no entra, recortar lo que sobra del AGENTS.md del repo, por ejemplo el recuadro de «Este repo es el paquete», que también se paga en cada sesión. Si con eso no entra, `blocked` con el número.
3. **Header del compacto.** Que no diga que es solo para solo-chat ni que `COMPACT(esto)` es el modo de quien lo lee. Tiene que decir que es el arranque de todo modo (FULL, LITE, FEDERADO) y que el modo COMPACT es pegarlo como único contexto en agentes solo-chat o subagentes baratos.
4. **R23:** sumar (e) «R03 se invierte: el agente decide más lo técnico y explica cada decisión en 1 línea», (c) «explicar lo básico» y registrar NOVATO/PRO en §3.
5. **R22:** «en el arranque, preguntar qué agentes usa el equipo y generar los espejos que falten (apuntan al compacto)». **R12:** «producto con IA ⇒ N4 de seguridad.md + playbooks/ia-en-el-producto.md» y registrar en §3. **R01:** «al iniciar sesión».
6. **Índice:** sumar `identidad del proyecto, modo/nivel/toggles registrados -> SDD-MASTER.md §3`.
7. **Check, burlas:** en una línea con verbo de lectura, aceptar también rutas sueltas sin backticks (`Leé sdd/SDD-MASTER.md y obedecé…`, el formato literal de §1 paso 4 y de `models.md`). Sumar al menos `seguí|seguir|respetá|consultá|follow|see|aplicá`, o invertir el criterio para el master: toda cita del master desde el arranque cuenta salvo en una línea explícitamente bajo demanda («solo si la tarea lo pide»). Cada una con su test, visto en rojo.
8. **Tests que maten los mutantes vivos:**
   - R10: un master de prueba con R10+, o que `TestRepoReal` exija las 33 reglas (`R01…R33`) del master real.
   - R7: «R03 autonomia: z» a mitad de línea no define.
   - R15: `R03:` sin nombre no define.
   - R2: cita con `#ancla`.
   - Opcional: R3/R4/R6 (extensión, `.txt`, borde de palabra).
9. El test web «P-1: el LEEME … y no dice que AGENTS.md apunta al master» no asserta el «no dice». Agregar el `doesNotMatch` contra el texto viejo («Una línea para que cualquier agente encuentre el SDD solo» o similar).
10. En el handback, poner el antes y el después en la misma base (LF: 36916 → 8571; o CRLF en las dos) y pegar la salida nueva de las tres suites y del rojo forzado de cada check nuevo.

## Para el leader (fuera de la zona de la tarjeta; no se le pide al implementer)
- **L1 (bloquea el cierre de la feature):** `harness/hooks/claude.py:66` manda a leer el master en cada SessionStart. En un proyecto con el arnés instalado (lo trae el ZIP), Claude Code vuelve a cargar ~36 KB cada sesión y el criterio 1 queda anulado justo en el agente principal. Hay que cambiarlo al compacto (más `current.md`), con su test en `test_hooks.py`. Hace falta ampliar la zona de esta tarjeta o abrir una nueva.
- **L2 (bloquea el merge de la v0.37):** el master se contradice con el arranque nuevo. El recuadro dice «1. Leé este archivo completo. Es el único que se lee entero, siempre», §1 paso 4 dice `AGENTS.md → Leé sdd/SDD-MASTER.md…`, en §2 la fila «Arrancar la sesión → SDD-MASTER.md» y en §5 «espejo → apunta acá». El **texto de R22** («un espejo de una línea que apunta acá») es texto de regla: necesita OK del owner (R25). Lo mismo en `SDD-MASTER-EN.md`, `models.md:9,13` y `web/reglas.js` (R22). Un agente que abre el master bajo demanda lee «leé este archivo completo, siempre» y lo carga entero.
- **L3 (no bloquea):** alinear `prompts/relevo.md:51` y `agents/README.md:8`. `skill/sdd-universal.skill` está obsoleto (v0.3) desde antes.
- **L4 (no bloquea):** el compacto del ZIP nombra docs que no vienen. El «pedíselo al humano» del índice alcanza, y el master ya tenía el mismo hueco. Si los loops (R33) son parte de PRO, conviene sumar `loops.md` al ZIP con `conAgentes`.

## Vuelta 2 @ 0743fb4
**Veredicto:** CHANGES_REQUESTED

Base de la vuelta: `0dcbb9a`, con la zona ampliada por el leader. El código va de `314f567` a `b2cb030`, el handback está en `636ad7a` y `0743fb4` es la frase de `custom.md` del leader. Volví a aplicar todas las sondas y todos los mutantes de la vuelta 1 y sumé otros nuevos. Los scripts están en `scratchpad/p1-rev/`: `sondas.py`, `sondas2.py`, `sondas3.py`, `mutantes_v2.py`, `zip2.mjs`, `check_zip.py`, `custom_realista.md`, `custom_15.md` y `custom_16.md`. Cada mutante corrió con `timeout=180` y lo revertí con `git checkout`. `verify.py` volvió a crear `sdd/progress/v0.37-P-1-rev/current.md`: lo borré y no lo commiteé.

### Pedidos de la vuelta 1
| # | Estado |
|---|---|
| 1 fijas, desactivables y AUTO | Hecho. Las 16 fijas y las AUTO coinciden con el `— fija` del master; el pedido se confirma, se registra en §3 y se rechaza si es fija. |
| 2 `custom.md` en el arranque | Hecho. Está en AGENTS/CLAUDE del repo y del ZIP, en el hook, en la §2 y el recuadro del master y en `relevo.md`, y el check lo suma siempre. El margen se discute abajo. |
| 3 header | Hecho («arranque de TODA sesión»; «COMPACT(solo esto)»). |
| 4 R23 | Hecho, pero **con una regresión**: se borró «lenguaje llano». El master pide (a) «mostrando el resultado en lenguaje llano» y (b) «cero jerga sin explicar», y «explicar lo básico» solo cubre (c). |
| 5 R22, R12 y R01 | Hechos. |
| 6 índice §3 | Hecho. |
| 7 burlas de la vuelta 1 | Cerradas. Las 11 burlas de la vuelta 1 que daban OK ahora dan FAIL (`sondas.py` y `sondas2.py`, con el master y el compacto reales): verbos fuera de la lista, ruta suelta sin backticks, ruta en otra línea y autolink. |
| 8 mutantes vivos de la vuelta 1 | Muertos: R2, R4, R6, R7, R10 y R15. |
| 9 test del LEEME | Hecho. |
| 10 handback en la misma base | Hecho (LF: 36916 → 9895). Yo mido 9901 con `custom.md` de `0743fb4`: 432 + 8479 + 990. |
| L1 hook | Hecho (detalle abajo). |
| L2 master y espejos | Hecho en el recuadro, §1.4–5, §2 y §5, en ES y EN, más `models.md`, `agents/README.md` y `relevo.md`. R22 cambió solo en la frase acordada con el owner, en ES, EN y `web/reglas.js`; el resto del texto de reglas de §4 está intacto (lo comprobé con el diff). |

### El master contra el compacto otra vez
Volví a comparar regla por regla. Quedan cubiertos los toggles (fijas, desactivables y AUTO), R01 «al iniciar sesión», R12 (IA en el producto, N4 y el playbook, registro en §3), R22 (acción de arranque) y R23 (c), (e) y el registro. Lo que todavía falta:
- **R23 (a)/(b), regresión de esta vuelta:** «lenguaje llano / cero jerga» ya no está en ninguna parte del arranque.
- **Recuadro del master contra el compacto:** el recuadro dice «este archivo se abre bajo demanda. **Si lo abriste, leelo completo.**» (y en EN, «If you opened it, read it in full»), mientras el índice del compacto dice «SDD-MASTER.md §4 (bajo demanda, **nunca entero**)». Un agente que abre el master para buscar una regla se encuentra con la orden de leer los 36 KB. Eso es justo lo que P-1 quiere evitar, y las dos instrucciones se contradicen.
- Siguen menores y sin cambio: el stub de R29, la versión de R28, el umbral de R18 y la Fase 1 de R09. Para R29 y R18 el índice manda a `harness.md` y a `prompts/sdd-lite.md`.

### El criterio invertido para el master (`sondas3.py`)
| Sonda | Resultado |
|---|---|
| `Leé` + master + «completo antes de trabajar; no es bajo demanda.» | **OK: burla** |
| `Leé` + master + «entero siempre, no solo si la tarea lo pide.» | **OK: burla** |
| `Read` + master + «in full at startup (on demand? no: always).» | **OK: burla** |
| `Leé` + master + «completo (solo si sos un agente de IA).» | **OK: burla** |
| Exención legítima (master + «abrilo solo si la tarea lo pide.») | OK (bien) |
| El master nombrado sin verbo y sin exención («El núcleo es …»), o con «Ver SDD-MASTER.md» en el compacto | FAIL (bien: el criterio es estricto) |
| Otro archivo con verbo y «solo si» | FAIL (bien: la exención es solo para el master) |
| Copia del master con otro nombre y con verbo | FAIL. Sin verbo queda bajo demanda: es coherente. |
| `custom.md` que dice «Leé sdd/SDD-MASTER.md entero» | **OK: el custom es hoja.** Es una limitación declarada y aceptable, porque es contenido del usuario. Pero el `custom.md` que genera la web (`web/reglas-ui.js:34`) todavía dice «El agente lee el master primero». |
| Verbo nuevo «seguir» + ruta dentro de una línea del compacto | FAIL por sobrecuenta. Hoy no pasa en el compacto real; si pasa, es del lado seguro. |

**Falsos positivos en el arranque real:** no hay. El master se nombra en la línea 2 de `AGENTS.md`/`CLAUDE.md` («abrilo solo si…»), en la línea 52 del compacto ES y EN («bajo demanda / on demand») y en la línea 2 del espejo del ZIP. **Ninguna de esas líneas tiene un verbo de la lista**, así que la corrección del pedido 11 no rompe nada.

### Mutantes (`mutantes_v2.py`): 23 muertos, 5 vivos, 0 timeouts
- Muertos: todos los re-aplicados de la vuelta 1 (R1, R2, R4–R13 y R15) y N1, N2, N4, N6, N7, N9, H1, H2, H4 y H5.
- Vivos:
  - N3: lookbehind de `BARE_PATH_RE`. Prácticamente equivalente.
  - N5: `master.parent` en la búsqueda de custom. Equivalente en los layouts normales.
  - N10: `entry.resolve()`. Solo cambia el doble conteo de un ciclo.
  - N8: «solo si» también exime a otros archivos. No hay test que lo fije; mi sonda lo cubre.
  - H3: el hook sin buscar `custom.md` en la raíz cuando el master está en `sdd/`.

  Ninguno de los cinco bloquea. Para N8 y H3 alcanza un test chico cada uno.

### Hook y ZIP (punto 4)
```text
ZIP PRO con sdd/custom.md:    [arnés] Rama `master`. Leé sdd/SDD-COMPACT.md (y sdd/custom.md, que pisa) y seguí desde el próximo paso de sdd/progress/master/current.md. El master (sdd/SDD-MASTER.md) se abre solo si la tarea lo pide.
sin custom.md:                [arnés] Rama `master`. Leé sdd/SDD-COMPACT.md y seguí desde … El master (sdd/SDD-MASTER.md) se abre solo si la tarea lo pide.
sin compacto (paquete viejo): [arnés] Rama `master`. Leé sdd/SDD-MASTER.md y seguí desde …
este repo:                    [arnés] Rama `v0.37-P-1-rev`. Leé SDD-COMPACT.md (y custom.md, que pisa) y seguí desde … El master (SDD-MASTER.md) se abre solo si la tarea lo pide.
```
El caso inverso, un arnés viejo con un paquete nuevo, sigue diciendo «Leé master» hasta que se actualice `harness/`. Es esperable y va al changelog.

ZIP armado como en los tests, en PRO y NOVATO. AGENTS y CLAUDE mandan a leer `sdd/SDD-COMPACT.md` y `sdd/custom.md` «si existe (pisa)», y la línea siguiente deja el master «solo si la tarea lo pide». Resultado de `check_startup` sobre el proyecto descomprimido:
```text
custom «R01=OFF» (8 B)                                           -> OK    8736 de 10240
custom realista: generador web + 12 overrides + 5 notas (1246 B) -> OK    9974 de 10240   (PRO y NOVATO)
15 overrides + 7 notas (1493 B)                                  -> OK   10221 de 10240   (19 bytes de margen)
el mismo + 1 nota de 48 B (1541 B)                               -> FAIL 10269 > 10240
```

### Margen (punto 3): un proyecto normal se queda en FAIL
La parte del paquete en un proyecto pesa ~8,7 KB (espejo + compacto). Para `custom.md` quedan **~1,5 KB**. Solo el encabezado que genera la web ya ocupa ~330 B. Con 15 overrides y un puñado de notas, el proyecto queda en rojo, y `custom.md` está pensado para crecer: tiene una sección «Notas personales». El test web usa un custom de 35 B, así que no lo ve.

**Recomendación para el owner: (a).** Que el tope de 10 KB sea del paquete (espejo + compacto + lo que manden a leer), con FAIL. `custom.md` tendría su propio tope, con WARN si pasa de 2 KB: «se paga en cada llamada; mové las notas largas a un doc bajo demanda».
- **Por qué (a):** el paquete controla sus bytes y el proyecto controla los suyos. Un FAIL que el usuario no puede arreglar sin borrar sus propias reglas enseña a ignorar el check.
- **Por qué no (b):** achicar el compacto solo posterga el problema, porque `custom.md` no tiene techo. Además obliga a sacar justo lo que se agregó en esta vuelta para cerrar contrato.
- **Alternativa (c), si el owner quiere un número solo:** un tope total más alto (p. ej. 12 KB) con WARN, y el FAIL de 10 KB solo para la parte del paquete. Es más complejo y no aporta mucho sobre (a).

### Verde re-ejecutado @ 0743fb4
```text
$ python -m unittest discover -s harness/tests   -> Ran 217 tests in 116.086s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> tests 77  pass 77  fail 0
$ python harness/verify.py --quick               -> [OK] Arranque liviano: 9901 bytes de 10240 (AGENTS.md + SDD-COMPACT.md, custom.md); 33 reglas definidas · VERDE — 0 FAIL, 0 WARN
```

### Pedidos de la vuelta 2 (implementer, dentro de la zona ampliada)
11. **Cerrar la burla del «bajo demanda»:** que la línea que nombra el master quede exenta solo si dice que es bajo demanda **y no tiene verbo de lectura** (`found == master and (reads or not on_demand)`). Va con un test por cada una de las cuatro sondas de arriba, visto en rojo. Ya revisé que no rompe las líneas reales.
12. **Recuadro del master, ES y EN:** cambiar «Si lo abriste, leelo completo» / «If you opened it, read it in full» por «leé solo la sección que la tarea pide (§4 la regla, §6 el start-prompt…)», para que coincida con el «nunca entero» del índice.
13. **R23 en el compacto, ES y EN:** devolver «lenguaje llano, cero jerga sin explicar». Son ~30 bytes. Si el margen no da, esperar la decisión del owner sobre el punto 3 antes de recortar otra cosa.
14. Opcional: tests para N8 (otro archivo con verbo y «solo si» cuenta) y H3 (el hook encuentra `custom.md` en la raíz cuando el master está en `sdd/`).

### Para el leader
- **Decidir el margen con el owner** (recomiendo la opción (a), arriba). Si se elige (a), es un cambio del check y entra en esta misma tarjeta.
- `web/reglas-ui.js:34` (fuera de la zona): el `custom.md` que genera la web dice «El agente lee el master primero y después este archivo». Hay que alinearlo con la frase de `0743fb4`.
- Sin cambio desde la vuelta 1: `skill/sdd-universal.skill` está obsoleto (v0.3) y el ZIP no trae `loops.md` (L4).

## Vuelta 3 @ 455e5a5
**Veredicto:** APPROVED

Base de la vuelta: `a5f296b`, donde quedó anotada la decisión del owner: el FAIL de 10 KB aplica solo al paquete y `custom.md` tiene un aviso propio a partir de 2 KB (WARN), nunca FAIL. El código está en `068751e` y el handback en `455e5a5`.

Re-apliqué todas las sondas de las vueltas anteriores (`sondas.py`, `sondas2.py`, `sondas3.py`) y sumé `sondas4.py`, centrada en `custom.md`. También re-apliqué todos los mutantes (`mutantes_v3.py`, que incluye los de las vueltas 1 y 2 con los patrones actualizados) y sumé los de esta vuelta. Cada corrida tuvo `timeout=180` y la revertí con `git checkout`. `verify.py` volvió a crear `current.md` de plantilla: lo borré.

### Pedidos 11–14
| # | Estado |
|---|---|
| 11 burla del «bajo demanda» | **Cerrada.** Las 4 sondas de la vuelta 2 ahora dan FAIL. La exención legítima («abrilo solo si la tarea lo pide») sigue en OK. Las líneas reales del arranque no dan falsos positivos (verify en verde). |
| 12 recuadro | Hecho en ES y EN: «leé solo la sección que la tarea pide (§4 una regla, §6 el start-prompt…)». Ahora coincide con el «bajo demanda, nunca entero» del índice. |
| 13 R23 | Hecho en ES y EN: «lenguaje llano, cero jerga sin explicar» / «plain language, zero unexplained jargon», junto con lo básico, R03 invertido y el registro en §3. **Con esto, R23 queda completa en el arranque.** |
| 14 N8 y H3 | Muertos los dos (ver mutantes). |
| `web/reglas-ui.js` | El `custom.md` que genera la web ahora dice «El agente lee el compacto al arrancar». Un test web lo fija. |

Las sondas de las vueltas 1 y 2 dan el mismo resultado que en la vuelta 2. Todas las burlas siguen cerradas: verbos fuera de la lista, ruta suelta, ruta en otra línea, autolink, «bajo demanda» con verbo y el master nombrado sin exención. Las únicas que dan OK son las limitaciones ya declaradas: reglas vaciadas a `Rnn nombre:`, `R100`, espejos que no son `AGENTS.md`/`CLAUDE.md` y archivos citados que no existen.

### Tope de `custom.md` (`sondas4.py` + ZIP)
```text
custom_16.md (15 overrides + 8 notas, 1541 B)   -> OK   paquete 8595/8769 de 10240; custom.md 1541 bytes (aparte; aviso > 2048)
custom 2048 B                                   -> OK   (el límite es inclusivo)
custom 2049 B / 60 KB / master pegado (37 KB)   -> WARN «sdd/custom.md pesa N bytes (> 2048)…»; nunca FAIL
ZIP PRO y NOVATO con custom_16.md               -> OK   paquete 8769 de 10240; custom.md 1541 bytes
ZIP PRO y NOVATO con custom_3k.md (3182 B)      -> OK + WARN sdd/custom.md pesa 3182 bytes (> 2048)
custom.md que define R33 y el compacto no       -> FAIL no define R33 (custom no cuenta como regla definida)
```

**¿Se puede burlar el tope del paquete a través de `custom.md`?**
- Meter contenido adentro de `custom.md` no lo burla: el aviso salta en cuanto pasa de 2 KB. Si lo cita `AGENTS.md`, `custom.md` sigue saliendo del tope de 10 KB y cae en el aviso.
- **Sí lo burla que `custom.md` mande a leer el master u otro doc** (`Leé \`sdd/SDD-MASTER.md\` entero`, `Leé \`sdd/extra.md\``): da OK sin aviso, porque las citas de `custom.md` no se siguen (es una «hoja»). Es una decisión de diseño declarada. Existe porque los `custom.md` viejos nombran al master en una línea que tiene el verbo «lee». No bloquea: `custom.md` es contenido del usuario, con OK humano, y el owner decidió que nunca da FAIL.
- **Impacto real, para el changelog (lo maneja el leader):** los proyectos que ya bajaron un `custom.md` de la web tienen la frase vieja «El agente lee el master primero y después este archivo». Ahora ese archivo se lee en cada sesión, así que un agente puede tomarla como orden y cargar el master entero. El check no lo ve, porque en el generador la ruta del master está en otra línea. Propuesta: una nota de migración («cambiá esa frase de tu custom.md») y, opcionalmente, un WARN (nunca FAIL) cuando `custom.md` nombra al master sin «bajo demanda». No hace falta otra vuelta para esto.

### Mutantes (`mutantes_v3.py` + N9 aparte): 33 muertos, 4 vivos, 0 timeouts
- **Muertos:**
  - De la vuelta 1: R1, R2, R4–R13 y R15.
  - De la vuelta 2: N1, N2, N4, N6, N7, **N8**, N9, H1, H2, **H3**, H4 y H5.
  - De esta vuelta:
    - V3-a: el «bajo demanda» exime al master aunque la línea tenga verbo.
    - V3-b: el aviso salta recién a 4 KB.
    - V3-c: el aviso usa `>=` en vez de `>`.
    - V3-d: un `custom.md` grande da FAIL en vez de WARN.
    - V3-e: `custom.md` suma al tope del paquete.
    - V3-g: no hay aviso.
    - V3-h: `custom.md` solo se lee si alguien lo cita.
- **Vivos:**
  - N3, N5 y N10: equivalentes o casi, como en la vuelta 2.
  - **V3-f**: `custom.md` cuenta como «regla definida». El handback dice que ese mutante muere, pero en mi versión (`for f in everything` en el chequeo de reglas) queda vivo. El comportamiento es correcto (mi sonda da FAIL), lo que falta es el test. No bloquea: alcanza con un test chico, el de la sonda «custom.md define R33 y el compacto no».

### Hook
En el ZIP PRO con `sdd/custom.md` imprime `[arnés] Rama … Leé sdd/SDD-COMPACT.md (y sdd/custom.md, que pisa) y seguí desde … El master (sdd/SDD-MASTER.md) se abre solo si la tarea lo pide.` Los casos sin custom y sin compacto se comportan igual que en la vuelta 2.

### Verde re-ejecutado @ 455e5a5
```text
$ python -m unittest discover -s harness/tests   -> Ran 225 tests in 117.496s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> tests 79  pass 79  fail 0
$ python harness/verify.py --quick               -> [OK] Arranque liviano: paquete 8952 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); custom.md 990 bytes (aparte; aviso > 2048); 33 reglas definidas · VERDE — 0 FAIL, 0 WARN
bytes LF (git cat-file -s HEAD): AGENTS.md 432 + SDD-COMPACT.md 8520 = 8952 (antes 36916); custom.md 990 aparte
```

### Por qué APPROVED
Se cumplen los cinco criterios de la tarjeta, con la decisión del owner sobre `custom.md` aplicada. El contrato del master está en el arranque regla por regla. Quedan como pendientes menores: los mínimos de R28/R29/R18/R09, que el índice deriva a `harness.md` y `prompts/sdd-lite.md`, y la limitación declarada de que el check no valida el contenido de las reglas. El check resiste todas las sondas que tienen impacto real en un agente. Lo que queda abierto no bloquea:

1. Test para V3-f (`custom.md` no define reglas).
2. Nota de migración en el changelog para los `custom.md` viejos con «el agente lee el master primero», con un WARN opcional.
3. Lo que viene de antes: `skill/sdd-universal.skill` obsoleto (v0.3) y el ZIP sin `loops.md` (L4).
