# loops.md · Loops con contrato: que el agente itere solo y sepa cuándo frenar

**Versión:** 0.36 · 2026-10-06 · **Para agentes:** leer solo cuando la tarea es dejar al agente iterando solo hacia un objetivo, o programar un loop (R33). **Para humanos:** cómo pedir «seguí hasta que quede bien» sin que el agente gire para siempre ni declare victoria antes de tiempo.

> Nace de S39. Se apoya en [`harness.md`](harness.md) (evidencia, memoria en disco) y [`orchestration.md`](orchestration.md) (roles, grafo de tarjetas). En 2026 a esto se lo llama *loop engineering*: en vez de escribir la próxima prompt en cada paso, se diseña el loop que la escribe.

---

## 1 · Tres loops que conviven

| Loop | Quién lo corre | El humano está… | Corta cuando… |
|---|---|---|---|
| **LOOP-PROMPT** (master §7) | el agente, ciclo a ciclo | adentro: OK en cada HANDBACK | el humano dice STOP |
| **Looper** ([`orchestration.md`](orchestration.md) §6) | el rol `looper`, sobre **una** tarjeta | afuera, salvo escalamiento | verde, 3 vueltas o misma falla 2 veces |
| **Loop con contrato** (R33, este archivo) | el `leader` (o el agente solo, sin R31) sobre un objetivo más grande que una tarjeta | afuera: aprobó el contrato antes | se cumple el objetivo o salta una regla de corte |

El loop con contrato **contiene** a los otros: recorre el grafo de tarjetas (§4) y cada tarjeta tiene su looper.

---

## 2 · El archivo del loop (`sdd/loops/<nombre>.md`)

```markdown
---
loop: <nombre-corto>
estado: propuesto        # propuesto | aprobado | corriendo | cortado | cumplido
rama: <rama del loop>    # aprobar el loop = OK de R01 solo para commits acá
aprobado: <fecha + quién, o vacío>
---

# Loop <nombre>

## Disparador
<cuándo arranca o se repite: "a pedido", "cada lunes 9:00", "cuando falla CI en main">

## Objetivo (medible)
1. <condición verificable con un comando o una observación concreta>
2. <...>   — "que quede lindo" no es objetivo; "lighthouse ≥ 90 en /web/catalogo" sí

## Verificación
- `<comando>` → qué salida cuenta como cumplido
  (la misma para todas las vueltas; el reviewer independiente la re-ejecuta al final, R30)

## Reglas de corte (la primera que salte)
- Objetivo cumplido y review `APPROVED` → `cumplido`
- Tope: <N vueltas> · <M horas> · <K tarjetas>
- Misma firma de falla 2 veces seguidas → escalar
- Hace falta cambiar el objetivo, la verificación o un requisito → `DRIFT` (R25) y esperar
- Hace falta push, merge, deploy o gasto nuevo → frenar y pedir OK (R01, R32)

## Memoria
- Bitácora: `sdd/progress/<rama>/current.md` (una línea por vuelta: qué se hizo, verificación @ hash)
- Al cortar: resumen al final de este archivo + HANDBACK al humano
- Si hay Cerebro: una nota por lección del resumen (`playbooks/obsidian-cerebro.md` §B)
```

**Reglas del contrato:**
- Sin regla de corte medible, el archivo no pasa a `aprobado`: el trabajo vuelve al LOOP-PROMPT.
- El objetivo y la verificación se escriben **antes** de la primera vuelta y no se tocan durante el loop. Cambiarlos para cortar en verde es mover el arco ([`orchestration.md`](orchestration.md) §5).
- Cada vuelta deja evidencia en disco, no en el chat: si el contexto se corta, la sesión nueva sigue desde `current.md` ([`harness.md`](harness.md) §6).
- Al cumplirse, el cierre es el de siempre: reviewer independiente (R30), `status.md` al día, changelog (R13).

---

## 3 · Una vuelta

```
leer current.md + el loop ──▶ ¿se cumple el objetivo? ── sí ──▶ reviewer ──▶ cumplido
        ▲                          │ no
        │                          ▼
        │              ¿saltó una regla de corte? ── sí ──▶ cortado + HANDBACK
        │                          │ no
        │                          ▼
        │      elegir la próxima tarjeta lista del grafo (§4) y despacharla
        │                          │
        └──── bitácora en current.md + commit en la rama del loop ◀────┘
```

**Vuelta = una tarjeta cerrada o bloqueada**, no un mensaje. Así el tope de vueltas mide trabajo, no charla.

---

## 4 · Loops sobre el grafo de tarjetas

Cuando el objetivo necesita varias tarjetas, el loop no las recorre en lista: usa el grafo de [`orchestration.md`](orchestration.md) §10. Despacha en paralelo las que tienen todas sus dependencias en `done` (máximo 3, `orchestration.md` §7), y si una queda `blocked`, todo lo que depende de ella espera. Una tarjeta bloqueada **no** corta el loop si hay otras ramas del grafo que pueden avanzar; lo corta si deja al objetivo sin camino.

---

## 5 · Tipos de loop frecuentes

| Tipo | Disparador | Objetivo típico | Corte típico |
|---|---|---|---|
| **Feature** | a pedido | todas las tarjetas de la feature en `done` | 10 tarjetas o 1 día |
| **Calidad** («dejalo de 10») | a pedido | una lista de chequeos medibles (tests, deudas, drift, smoke) | lista cumplida o 3 vueltas sin avance |
| **Mantenimiento** (R19) | programado (semanal/mensual) | auditoría hecha y plan presentado | presentar el plan: actualizar dependencias siempre pide OK |
| **CI roja** | falla en la rama base | verde de nuevo | 3 vueltas; si la falla es del arnés, al `prompter` |

---

## 6 · En cada herramienta (R22)

- **Claude Code:** `/loop` para que el agente se marque el ritmo; `/schedule` para un loop programado en la nube; hooks del arnés (`harness/`) como verificación. El archivo del loop va en el primer mensaje: *«Corré el loop `sdd/loops/<nombre>.md`.»*
- **Codex, Cursor, Gemini y otros:** el mismo archivo pegado o referenciado; si la herramienta no se re-invoca sola, un script (`while` + la verificación) o un cron del CI que la lance.
- **Sin agente con archivos:** no hay loop autónomo; se usa el LOOP-PROMPT.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.36 | 2026-10-06 | La memoria del loop suma una nota al Cerebro por lección al cortar (S41). |
| 0.35 | 2026-10-06 | Primera versión (S39): contrato de cinco partes, aprobar el loop = commits solo en su rama, vuelta = tarjeta, loops sobre el grafo de tarjetas, tipos frecuentes y cómo correrlo en cada herramienta. |
