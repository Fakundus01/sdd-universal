# task-card.md · Plantilla de tarjeta de tarea

Una tarjeta = una unidad de trabajo para **un** agente. Vive en `sdd/cards/<ID>.md`, la escribe solo el `leader` (o el humano sin R31) y es a la vez la cola de trabajo: el frontmatter dice en qué estado está. `status.md` enlaza las tarjetas de cada feature. Detalle: `harness.md` §6, `orchestration.md` §3.

```markdown
---
id: H-1
titulo: <verbo + objeto, ej. "Validar el stock antes de confirmar la orden">
estado: pending          # pending | in_progress | review | done | blocked
feature: <nombre de la feature en status.md>
rama: <rama, cuando pasa a in_progress>
---

# Tarjeta H-1 — <título>

- **Spec:** leé solo <spec.md §x · features-<u>.md §y> — nada más del SDD
- **Modelo / esfuerzo:** <tier MEDIO / alto> (según `models.md` §4)
- **Rol:** <implementer | infra-implementer | analytic>
- **Worktree:** <carpeta, si es una sesión aparte>

## Objetivo
<1–3 líneas: qué tiene que quedar funcionando y para qué.>

## Criterios de aceptación
1. <verificable: entrada → salida observable>
2. <verificable — al menos un caso de error>

## Zona de archivos
- **Podés tocar:** <rutas o carpetas>
- **No toques:** <rutas> — si hace falta, anotalo en el handback y no lo toques.

## Contexto a leer (y nada más)
- <ruta> — <por qué>

## Verificación requerida
- `python harness/verify.py --changed` en verde + <tests específicos>
- <TDD (R29): el test nuevo se ve fallar primero, medido contra la base con su hash>
- <si la tarjeta crea o cambia un check, hook o el reporte de un error: rojo forzado con la cola pegada>
- <si toca producción: consulta de solo lectura antes (R32)>

## Entrega
- Handback en `sdd/progress/<rama>/handback_H-1.md` (plantilla `prompts/handback.md`), commiteado.
- Respuesta: solo `done -> <ruta>` o `blocked -> <ruta>`.
```

**Reglas de la tarjeta:**
- Si un criterio no se puede verificar con un comando o una observación concreta, no es un criterio: se reescribe antes de despachar.
- Sin criterios de aceptación, la tarjeta no sale de `pending` (el check del arnés lo marca).
- Una tarjeta que toca más de ~5 archivos o dos capas se parte (`orchestration.md` §3).
- Cambiar los criterios después de despachar es cambiar un requisito: bloque `DRIFT` (R25).
