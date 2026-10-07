# Handback P-2 — Tokens, costo y duración por rol y vuelta en el handback

- **Estado:** done
- **Rama / commit:** `v0.37-P-2` @ `e31125d` (código y docs en `0513f37`; el handback se commitea después y no cambia el código)
- **Quién:** implementer (MEDIO)

## Hecho
- `prompts/handback.md`: sección «Costo» (tabla: rol, modelo, vuelta, tokens entrada/salida, USD, duración), con la nota de que el agente completa rol/modelo/vuelta y el leader el resto (`n/d` si la herramienta no lo da).
- Línea `Costo:` en el HANDBACK de `prompts/loop-prompt.md`, `SDD-MASTER.md` §7, `SDD-MASTER-EN.md` §7 (`Cost:`) y en los dos compactos (+33 bytes; arranque 8985 de 10240).
- `agents/leader.md`: paso nuevo «Anotar el costo» (el leader lo ve en el aviso de fin de corrida; en Claude Code `subagent_tokens`, `tool_uses`, `duration_ms`) y, al cerrar, suma las filas a `<proyecto>/sdd/metrics.md`. `teams.md` §8: formato de la tabla de `metrics.md`.
- `harness/checks.py`: `check_costo_handbacks` → WARN si una tarjeta `done` tiene handback sin «Costo» o con la tabla vacía.

## No hecho / pendiente
- El WARN actual de `verify.py --quick` es real: `sdd/progress/v0.37-P-1/handback_P-1.md` (P-1 es v0.37 y se cerró antes de esta regla). Está fuera de mi zona y no inventé datos: el leader lo completa con lo que vio (o `n/d`).

## Cómo
- Un agente no conoce sus tokens: el formato deja que el leader complete la fila; el agente solo escribe lo que sabe. Sin atarse a una herramienta (R22).
- Corte (documentado en `harness/checks.py`, constante `COSTO_DESDE = (0, 37)`): la versión sale del prefijo de la rama (`v0.37-…`); rama sin versión o anterior a 0.37 no avisa. Las tarjetas viejas no tienen fecha en el frontmatter, por eso versión y no fecha.
- «Tabla vacía» = ninguna fila de datos (tras encabezado y separador) dentro de «## Costo» hasta el próximo título, con primera celda real (no `<placeholder>`). `n/d` en las demás celdas cuenta como fila.
- Es WARN, nunca FAIL; tarjeta no `done` o sin archivo de handback no avisa.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| prompts/handback.md | sección «Costo» |
| prompts/loop-prompt.md, SDD-MASTER.md, SDD-MASTER-EN.md | línea `Costo:` / `Cost:` en HANDBACK |
| SDD-COMPACT.md, SDD-COMPACT-EN.md | costo en el HANDBACK resumido |
| agents/leader.md | paso «Anotar el costo»; cierre suma a metrics.md |
| teams.md | formato de `metrics.md` |
| harness/checks.py | `check_costo_handbacks`, `_tiene_costo`, constantes |
| harness/tests/test_checks.py | `TestCostoHandback` (12 tests) |
| sdd/progress/v0.37-P-2/current.md | memoria de la tarjeta |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. sección Costo en handback.md | plantilla; `test_con_fila_no_avisa` usa su formato |
| 2. línea Costo en HANDBACK (loop-prompt, master §7, EN, compactos) | `verify.py --quick`: rutas y arranque OK |
| 3. leader.md + teams.md | agents/leader.md paso 5 y 7; teams.md §8 |
| 4. WARN, no FAIL; corte v0.37 | `test_sin_seccion_costo_avisa`, `test_tabla_vacia_avisa`, `test_fila_con_placeholders_avisa`, `test_tabla_fuera_de_la_seccion_no_cuenta`, `test_aviso_no_es_fallo`, `test_tarjeta_anterior_a_v037_no_avisa`, `test_rama_sin_version_no_avisa`, `test_version_posterior_si_avisa`, `test_version_mayor_posterior_si_avisa`, `test_tarjeta_abierta_no_avisa`, `test_done_sin_archivo_de_handback_no_avisa` |
| 5. quick verde | abajo |

Rojo antes (R29), base `b69f873`, tests escritos antes del check:
```text
$ git rev-parse --short HEAD
b69f873
$ python -m unittest discover -s harness/tests -k TestCostoHandback
AssertionError: False is not true : esperaba un WARN con 'sección Costo'; hubo: []   (x5)
Ran 11 tests in 16.794s
FAILED (failures=5)
```
Verde después: `Ran 12 tests in 6.4s OK` (TestCostoHandback); suite completa `Ran 237 tests in 111.415s OK (skipped=1)`; `node --test "web/tests/*.test.mjs"`: 79 pass, 0 fail.

Rojo forzado del WARN en el repo real (handback de P-1, v0.37, sin «Costo»):
```text
$ python harness/verify.py --quick
[OK]    Arranque liviano: paquete 8985 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); ...
[WARN]  sdd/progress/v0.37-P-1/handback_P-1.md: sin sección Costo con al menos una fila (rol, modelo, vuelta, tokens, USD, duración; `n/d` si no se sabe): la completa el leader (prompts/handback.md)

VERDE — 0 FAIL, 1 WARN
```
Los handbacks v0.35 y v0.36 no disparan nada (corte).

Mutantes sobre `check_costo_handbacks` (cada corrida con `subprocess.run(timeout=240)`; commit antes de mutar, `git checkout --` después):
| Mutante | Resultado |
|---|---|
| M1 `<` -> `<=` en el corte | muerto (4 fallos) |
| M2 sin corte | muerto |
| M3 rama sin versión también avisa | muerto |
| M4 compara solo el minor | SOBREVIVIÓ -> agregué `test_version_mayor_posterior_si_avisa` (v1.0) -> muerto |
| M5 tarjetas abiertas también | muerto |
| M6 handback faltante avisa | muerto |
| M7 el encabezado cuenta como fila | muerto |
| M8 placeholder cuenta | muerto |
| M9 no corta en el próximo título | muerto |
| M10 el separador cuenta | muerto |
| M11 siempre False / M12 siempre True | muertos |
| M13 FAIL en vez de WARN | muerto |
| M14 el check no se llama | muerto |
Ninguno terminó por timeout.

## Fuera de zona / riesgos
- `handback_P-1.md` sin «Costo» (WARN real, ver arriba). Otros proyectos que ya tengan tarjetas `done` en v0.37+ verán el aviso hasta completar la tabla (es la intención).
- `teams-EN` no existe en el repo, así que el formato de `metrics.md` solo está en ES.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- El leader completa «Costo» en los handbacks de P-1 y P-2 con los datos de los avisos de fin de corrida.

## Costo
| Rol | Modelo | Vuelta | Tokens (entrada/salida) | Costo USD | Duración |
|---|---|---|---|---|---|
| implementer | opus 5.5 | 1 | n/d | n/d | n/d |
