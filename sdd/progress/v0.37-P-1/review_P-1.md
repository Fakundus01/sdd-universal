# Review P-1 @ b7e4cd9ac7ca77563c78cd1d9c52bc4342fb2b51
**Veredicto:** CHANGES_REQUESTED

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
