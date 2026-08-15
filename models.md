# models.md · Multi-agente y ahorro de tokens por modelo

**Versión:** 0.3 · 2026-08-15 · **Para agentes:** leer cuando la tarea sea configurar espejos (R22) o elegir tier de modelo (R03/R12). **Importante:** los nombres de modelos envejecen rápido — la auditoría R19 mantiene actualizado este archivo.

---

## 1 · Un solo núcleo, espejos por herramienta (R22)

El SDD **nunca se duplica**: cada herramienta lee su archivo de entrada, y ese archivo es una línea que apunta al master. El start-prompt pregunta qué agentes usa el equipo y genera los espejos que falten.

| Herramienta | Archivo que lee | Contenido del espejo |
|---|---|---|
| Claude Code / Cowork | `CLAUDE.md` (o la skill `sdd-universal`) | `Leé sdd/SDD-MASTER.md y obedecé sus reglas.` |
| OpenAI Codex / ChatGPT | `AGENTS.md` (estándar abierto) | ídem |
| Cursor | `.cursor/rules/sdd.mdc` con `alwaysApply: true` (también lee `AGENTS.md`) | ídem |
| GitHub Copilot | `.github/copilot-instructions.md` | ídem |
| Gemini CLI | `GEMINI.md` (versiones nuevas también leen `AGENTS.md`) | ídem |
| Windsurf | `.windsurf/rules/` | ídem |
| Meta AI y agentes solo-chat | no leen archivos del repo | pegar `SDD-COMPACT.md` como primer mensaje (S10) |

**Si solo vas a crear un espejo, que sea `AGENTS.md`:** se volvió el estándar de facto que la mayoría de las herramientas ya soporta. `CLAUDE.md` conviene tenerlo igual porque Claude lo prioriza.

---

## 2 · Tiers unificados (marca-agnóstico)

R03 (autonomía) y R12 (recomendación de modelo) hablan de **tiers**, no de marcas, para que la regla sirva con cualquier proveedor. Equivalencias orientativas — verificarlas con R19 porque cambian cada pocos meses:

| Tier | Claude | OpenAI | Google | Otros |
|---|---|---|---|---|
| **ALTO** — arquitectura, refactors grandes, review, decisiones | Opus / Fable | GPT razonador tope | Gemini Pro/Ultra | modo max de Cursor; Copilot con modelo premium |
| **MEDIO** — implementación estándar del día a día | Sonnet | GPT estándar | Gemini Flash superior | default de Cursor/Copilot |
| **ECONÓMICO** — subagentes, docs, búsquedas, tareas mecánicas | Haiku | mini / nano | Flash lite | modelos locales (Llama de Meta, etc.) |

**Regla práctica:** las **specs se escriben con ALTO** — un error en la spec se propaga a todo lo que se genere desde ella —, se implementa con MEDIO, y la verificación contra la spec puede correr en un modelo rápido con incentivo opuesto (instrucción de refutar, no de aprobar). Lo mecánico va a ECONÓMICO. Con presupuesto corto: MEDIO para todo + `SDD-COMPACT` como contexto. Y la de R03 no cambia: tier ALTO puede proponer mejoras `[MEJORA PROPUESTA]`; tiers MEDIO/ECONÓMICO ejecutan literal.

---

## 3 · Ahorro de tokens: técnicas por capa

### a) Estructural — el SDD ya lo hace solo

Ruteo del Protocolo de Lectura (nadie lee todo) · archivos ≤300 líneas (R05) · slices mínimos de subagente (R11) · `SDD-COMPACT` para tiers económicos · modo LITE para proyectos chicos · modo FEDERADO para que un monorepo no cargue módulos ajenos.

### b) De sesión — hábitos que multiplican el ahorro

1. **Prefijo estable → caché.** El master va SIEMPRE al principio de la sesión y no se edita a mitad del chat: los proveedores (Claude, OpenAI, Gemini) cachean prefijos repetidos y las relecturas cuestan una fracción. Lo volátil (`custom.md`, la tarea del día) va al final.
2. **El estado vive en archivos, no en el chat.** Podés cerrar una sesión larga sin miedo: HANDBACK + MDs reconstruyen todo. Sesión nueva = contexto limpio y barato. Nunca arrastres un chat de 200 mensajes "por las dudas".
3. **Releer solo lo que cambió.** El changelog dice qué se tocó; no se re-abre `design.md` si nadie lo modificó.
4. **Diffs, no archivos enteros.** Pedir "mostrame el diff" en vez de "mostrame el archivo".
5. **Preguntas en lote.** R04 hace todas las preguntas juntas: una ida y vuelta, no diez.
6. **Un ciclo = un objetivo.** Ciclos chicos mantienen el HANDBACK en ~20 líneas y el contexto acotado.

### c) Por tier — a quién darle qué

- **ALTO:** contexto rico (master + archivos ruteados). Desperdiciarlo en tareas mecánicas es tirar plata (R12).
- **MEDIO:** master + slice normal de la tarea.
- **ECONÓMICO:** `SDD-COMPACT` + la tarea puntual + formato de salida exacto. Nunca le pidas decidir diseño.

### d) La métrica de control

Si un ciclo típico empieza a gastar más que el anterior sin que el proyecto haya crecido, algo se está releyendo de más: revisarlo en la próxima auditoría R19.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.3 | 2026-08-15 | Primera versión: tabla de espejos por herramienta (Claude, Codex/ChatGPT, Cursor, Copilot, Gemini, Windsurf, Meta/solo-chat), tiers unificados marca-agnóstico y técnicas de ahorro por capa. |
