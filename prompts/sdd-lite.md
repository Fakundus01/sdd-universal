# sdd-lite.md · Plantilla del modo LITE (R18)

Para proyectos chicos (≤~300 líneas estimadas o ≤1 día de trabajo): **todo el SDD en un solo archivo**, `sdd/sdd-lite.md`. Sin `cards/`, sin `progress/`, sin `features/`. Lo que en FULL son archivos, acá son secciones. El agente lee este archivo entero al arrancar cada sesión; por eso tiene que seguir siendo corto (si pasa de ~250 líneas o aparece una segunda feature grande, se propone pasar a FULL con el flujo brownfield).

Nace de `scenarios.md` S36: el modo existía en el master pero no había plantilla, y cada proyecto inventaba las secciones. Esta es la estructura que usó la landing de los ejemplos, que pasó cuatro vueltas de reviewer.

```markdown
# sdd-lite.md · <Proyecto> — <qué es en 3 palabras>

**Versión:** 0.1.0 · **Fecha:** <AAAA-MM-DD> · **Owner:** <nombre> · **Modo:** LITE (R18) · **Variante:** <WEB | DATA | GAME | API>

> Reglas: las del `SDD-MASTER.md` (el núcleo). Overrides de este proyecto: `custom.md` (por ejemplo `R01=OFF`).

## §3 · Identidad del proyecto
- **Problema:** <una frase: quién sufre qué>
- **Usuarios:** <quién lo usa>
- **Stack:** <lenguaje/framework, y por qué (R12)>
- **Nivel:** <NOVATO | PRO> · **Perfil:** <ESTRICTO | CONFIANZA>
- **Modelo recomendado (R12):** <por tarea>

## 1 · Cuestionario socrático (R04) — respuestas registradas
| Pregunta | Respuesta |
|---|---|
| ¿Qué pasa si no se hace? | … |
| ¿Cómo sabés que funcionó? | … (→ outcomes) |

## 2 · Outcomes (medibles)
| # | Outcome | Cómo se mide | Meta |
|---|---|---|---|
| O1 | … | … | … |

## 3 · Qué NO entra
- … (lo que se decidió dejar afuera, para que no vuelva a aparecer)

## 4 · Constraints y supuestos
- **C1** · …

## 5 · Decisiones (ADRs cortos)
**L-ADR-1 · <título>** — <fecha> · Vigente — <decisión y por qué, en 2–4 líneas>

**Dependencias (R28)** — <fecha de verificación>:
| Dependencia | Versión (verificada en el registro) | Qué resuelve | Por qué no alcanza con lo que hay |
|---|---|---|---|

## 6 · Seguridad (R27) — clasificación del <fecha>
<Las seis preguntas de `seguridad.md` §1 con su respuesta, y los niveles activos.>

**Controles activos**
| Control | Dónde | Test que lo prueba (se vio fallar, R29) |
|---|---|---|

## 7 · Contratos (API)
| Método y ruta | Entrada | Salida | Errores |
|---|---|---|---|

## 8 · Pruebas (R07, R29, R30)
- **Comando:** `python harness/verify.py` (o el que corresponda) · qué cubre cada suite.
- **Manual:** <lo que se prueba a mano, con la vista a 360 y 1280 px si es web>

## 9 · Changelog (R13)
### [0.1.0] — <fecha>
- Arranque: este archivo.

## 10 · Deuda aceptada (R25)
| ID | Deuda | Aceptada | Revisar el | Qué la dispara |
|---|---|---|---|---|
```

**Notas para el agente:**
- Rutas citadas entre comillas invertidas (`` `backend/app/main.py` ``): el arnés verifica que existan, también adentro de las tablas.
- El changelog va acá y no en `sdd/changelog.md`. `.gitattributes` tiene `sdd/sdd-lite.md merge=union` para que dos ramas no choquen.
- La evidencia de cada vuelta de review (rojo con hash, verde) va al final de la entrada del changelog de esa versión, no en `progress/`.
