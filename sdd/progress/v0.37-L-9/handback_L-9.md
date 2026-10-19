# Handback L-9 — ciclo.py sin identidad de git

- **Estado:** done
- **Rama / commit:** `v0.37-L-9` @ `1fab5b2 (código y tests; un commit posterior solo fija este hash y el del grafo)` (base `main` @ b300044)
- **Quién:** implementer (MEDIO)

## Hecho
- `support.py`: el fixture `Project` configura `user.email`/`user.name` **local** al repo de prueba (`git config` sin `--global`); `Project.git` ya no pasa `-c user.*`, así lo que corre `ciclo.py` hereda la identidad del repo y no la del ambiente.
- `test_no_commitea_en_rojo`: ahora hay algo para commitear (sync deja `derivado.txt`) y afirma el motivo: exit 1, "no commiteo", ni siquiera intenta (`[ciclo] commiteando` ausente), no hay "el commit falló", HEAD sin cambio.
- `ciclo.py`: el mensaje pasó de «el commit falló (¿hook en rojo?)» a «el commit falló (git salió con N); esto devolvió:» + salida de git, sin proponer causa.
- Test nuevo `test_un_commit_que_falla_muestra_lo_que_dijo_git_sin_adivinar_la_causa` (pre-commit hook que rechaza con un texto marcado).

## No hecho / pendiente
- Nada. Los 6 jobs de CI se ven al pushear (el leader; no se pushó).

## Cómo
- Entorno sin identidad: `GIT_CONFIG_GLOBAL=/nonexistent/x GIT_CONFIG_SYSTEM=/nonexistent/y GIT_CONFIG_NOSYSTEM=1` (verificado: `git config user.name` vacío). Rojo, verde, mutantes y `verify.py` completo corrieron todos en ese entorno.
- Los archivos tenían CRLF en el working copy (autocrlf); los dejé con LF, git normaliza al commitear (el diff queda mínimo).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness/tests/support.py | identidad local en el repo del fixture; sin `-c user.*` |
| harness/tests/test_ciclo.py | `test_no_commitea_en_rojo` afirma el motivo; test nuevo del mensaje de fallo |
| harness/ciclo.py | mensaje de fallo de commit sin adivinar |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. identidad local, nada global | `support.py` (`git config` local); suite verde con `GIT_CONFIG_GLOBAL/SYSTEM` inexistentes |
| 2. rojo por el motivo | `test_no_commitea_en_rojo`; mutante M2 abajo |
| 3. mensaje sin adivinar | `test_un_commit_que_falla_...`; mutantes M3 y M3b abajo |
| 4. sin `--global` ni workflow | `git diff` no toca `.github/`; ningún `--global` agregado |
| 5. CI | pendiente de push (leader); local en entorno sin identidad: verde |

Rojo antes (R29), medido contra la base, entorno sin identidad:
```text
$ git rev-parse --short HEAD
b300044
$ python -m unittest discover -s harness/tests -p "test_ciclo.py"
FAIL: test_en_verde_commitea_con_la_evidencia_pegada
AssertionError: 1 != 0 : [ciclo] sync: ...
FAIL: test_nunca_ejecuta_deploy
AssertionError: 1 != 0 : [ciclo] sin 'sync' en harness.config.json: nada que sincronizar
FAIL: test_una_salida_con_caracteres_de_caja_no_revienta
AssertionError: 1 != 0 : [ciclo] sin 'sync' en harness.config.json: nada que sincronizar
Ran 9 tests in 5.471s
FAILED (failures=3)
(salida del commit: "[ciclo] el commit falló (¿hook en rojo?): Author identity unknown ... fatal: unable to auto-detect email address")
```

Verde después, mismo entorno:
```text
$ python -m unittest discover -s harness/tests -p "test_ciclo.py"
Ran 10 tests in 7.188s
OK
$ python harness/verify.py      (mismo entorno; cola)
[OK]    test — ... (136.6s): Ran 265 tests in 20.334s · OK (skipped=3)
VERDE — 0 FAIL, 2 WARN
```

Mutantes (aplicados y restaurados; `ciclo.py` vuelve a su versión del fix, probado con la suite en OK):
```text
M2 (criterio 2): `return 1` -> `pass` tras "ROJO: no commiteo"
FAIL: test_no_commitea_en_rojo
AssertionError: 0 != 1
FAILED (failures=1)

M3 (criterio 3): mensaje vuelto a «el commit falló (¿hook en rojo?):»
FAIL: test_un_commit_que_falla_muestra_lo_que_dijo_git_sin_adivinar_la_causa
AssertionError: '¿hook' unexpectedly found in '... [ciclo] el commit falló (¿hook en rojo?):\nRECHAZO-DEL-HOOK-XYZ ...' : propone una causa en vez de nombrar lo que pasó
(en esa corrida la aserción era `"¿"`, luego afinada a `"¿hook"`)

M3b (criterio 3): se quita la salida de git del mensaje
FAIL: ... AssertionError: 'RECHAZO-DEL-HOOK-XYZ' not found in '... el commit falló (git salió con 1); esto devolvió:\n\n' : no muestra lo que devolvió git
```
Nota: M2 falla con el motivo correcto: con identidad local el mutante sí commitea (exit 0); el test viejo, sin identidad, lo dejaba pasar con exit 1.

## Costo
| Rol | Modelo | Vuelta | Tokens | Costo USD | Duración |
|---|---|---|---|---|---|
| implementer | <modelo> | 1 | <tokens> | <USD> | <duración> |

## Fuera de zona / riesgos
- `graph/harness.md` y `graph/sdd.md`: solo el hash, regenerado con `python graph/_meta/sync_graph.py --update --accept` porque el pre-commit lo exige (mismo criterio que en c73735f de L-8); la prosa no se tocó.
- Ninguno tocado. Los tests que usan `Project` en otros archivos ahora heredan la identidad local; no hay dependencia de la global.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Reviewer: re-ejecutar en entorno sin identidad y pushear para ver los 6 jobs.
