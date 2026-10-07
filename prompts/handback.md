# handback.md · Plantilla de handback en archivo (R30)

El HANDBACK del master (§7) es el cierre de ciclo **en el chat**, en ~20 líneas. Este es el handback **en archivo** que deja un agente al terminar una tarjeta: va en `sdd/progress/<rama>/handback_<ID>.md` (con la sección «Costo»: `verify.py --quick` avisa si una tarjeta `done` de la v0.37 en adelante no la trae, y en cualquier rama, si la trae vacía o con `<…>` sin completar), se commitea con la rama antes de responder `done`, y es lo que lee el reviewer. Qué cuenta como evidencia: [`harness.md`](../harness.md) §4.

````markdown
# Handback H-1 — <título>

<!-- "Hecho", "Archivos tocados" y "Evidencia" describen SIEMPRE el último commit de la rama.
     Si la tarjeta vuelve, se reescriben esas secciones y la vuelta se suma al apéndice. -->

- **Estado:** done | partial | blocked
- **Rama / commit:** `<rama>` @ `<hash corto real, ej. a942c177 — nunca "ver git log">`
- **Quién:** <rol (tier) | sesión N>

## Hecho
- <qué quedó funcionando>

## No hecho / pendiente
- <qué faltó y por qué>

## Cómo
- <decisiones y por qué; alternativas descartadas>

## Archivos tocados
| Archivo | Cambio |
|---|---|
| <ruta con /> | <qué> |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. <criterio> | <test o check, por nombre> |

Rojo antes (R29), medido contra la base:
```text
$ git rev-parse --short HEAD
<hash de la base>
$ <comando del test>
<salida tal cual, con el FAIL>
```

Verde después:
```text
$ python harness/verify.py --changed
<salida tal cual — si recortaste con tail -N, decilo>
```

<Si tocaste un check, un hook o cómo se reporta un error: la cola del rojo forzado.>

## Costo
<!-- Una fila por rol y vuelta. El agente completa solo rol y vuelta: el modelo y los tokens, USD y duración los ve el
     LEADER en el aviso de fin de cada corrida (el agente no conoce los suyos ni su modelo con certeza) y los completa
     al recibir este handback; lo que anotes tú en `<modelo>` no vale como dato. Los `<…>` los reemplaza el leader:
     una fila con algún `<…>` sin completar dispara el WARN de `verify.py --quick`. `n/d` es una decisión explícita
     del leader («la herramienta no lo da»): no se estima ni se inventa (R22).
     Tokens: «entrada/salida» si la herramienta los separa; si da un total, el total con `(total)`. -->
| Rol | Modelo | Vuelta | Tokens | Costo USD | Duración |
|---|---|---|---|---|---|
| implementer | <modelo> | 1 | <tokens> | <USD> | <duración> |

## Fuera de zona / riesgos
- <lo que viste y no tocaste; riesgos para otras ramas>

## Cambios de spec sugeridos
- <hechos descubiertos, o propuestas de requisito → el leader decide si es DRIFT>

## Variables de entorno nuevas
- <NOMBRE — para qué — dónde se configura> | ninguna

## Próximo paso sugerido
- <qué haría la tarjeta siguiente>

## Apéndice: vueltas (solo si la tarjeta volvió)
- Vuelta <N> (<hash>): <qué pidió el review o el looper y qué se cambió>
````

**`blocked` es una entrega válida.** Si una herramienta falla de forma inesperada, o el arreglo exige salir de la zona o cambiar la aceptación, el handback dice `blocked`, explica qué se probó, y el agente para. Un workaround silencioso es peor que un bloqueo con nombre.
