# GUIDE.md · Guía de uso del SDD Universal

**Versión:** 0.3 · 2026-08-15 · **Para humanos.** Los agentes no leen esta guía salvo que se la pidan (ej.: el onboarding-agent de teams.md).

---

## 1 · Qué es, en tres líneas

Un paquete portable de gobernanza: la especificación va antes que el código, los archivos MD son la memoria del proyecto, y un archivo conductor (`SDD-MASTER.md`) rutea a agentes y subagentes para que gasten la menor cantidad de tokens posible. Se lo das a cualquier agente de IA en el primer mensaje (o como skill) y trabaja bajo tus reglas, con tu OK en los momentos que importan.

---

## 2 · Quick start (5 minutos, tres caminos)

| Camino | Cuándo conviene | Cómo |
|---|---|---|
| **A. Skill (Claude)** | Usás Claude siempre | Instalá `sdd-universal.skill` una vez. Después solo decís "aplicá el SDD" al arrancar cualquier proyecto. |
| **B. Carpeta `sdd/`** | Proyecto con repo (cualquier agente) | Copiá la carpeta `sdd/` a la raíz, creá los espejos (`AGENTS.md`, `CLAUDE.md`… ver `models.md`) y pegá el start-prompt de `prompts/start-prompt.md`. |
| **C. Pegado** | Agente solo-chat o prueba rápida | Pegá `SDD-COMPACT.md` + tu pedido. Listo. |

En los tres casos el flujo es el mismo: elegís perfil (ESTRICTO/CONFIANZA), contestás el cuestionario socrático, das el OK a la propuesta, y el agente genera los MD y arranca el loop de HANDBACK.

---

## 3 · ¿Es fácil de usar? (respuesta honesta)

**El día 1 tiene fricción real.** Los dobles OK (primero MD, después código) se sienten lentos, y el cuestionario de arranque parece largo. Es intencional: es el precio de la trazabilidad, y es exactamente lo que evita el clásico "el agente me generó cualquier cosa y ahora no sé qué hay en el repo".

**Del proyecto 2 en adelante es fluido.** El loop HANDBACK reduce tu trabajo a leer 20 líneas y responder "OK". La mayoría de la gente tarda 1–2 proyectos en internalizar el ritmo.

**Quién lo agarra más rápido:** un junior o pasante lo aprende en un día (su trabajo es seguir el HANDBACK). El rol que más práctica necesita es el que **aprueba**: leer propuestas de MD con criterio es una habilidad.

**Dónde molesta y cuál es el antídoto:** script de una tarde → modo LITE (un solo archivo). Prototipo exploratorio → perfil CONFIANZA. Equipo entrando de cero → un proyecto piloto primero, no todos a la vez.

**El costo en tokens es asimétrico:** el arranque gasta más (genera todos los MD), pero cada ciclo posterior gasta *menos* que un chat sin SDD, porque el contexto está ruteado y nunca se re-explica la historia del proyecto. El punto de equilibrio llega en ~2–3 ciclos.

**Y una advertencia que hay que decir de frente:** el SDD no elimina la complejidad — la reubica. Las specs se vuelven código fuente, con su propia deuda técnica y su costo de mantenimiento. Por eso existen R19 (auditoría) y la regla de que los MD desactualizados son un bug, no un detalle.

---

## 4 · Cómo se actualiza, según cada proyecto

Hay **dos niveles** de actualización y no hay que mezclarlos:

### A) Los MD *del proyecto* (spec, design, contracts, changelog…)

Los actualiza **el agente**, con el workflow de 2 fases (R08/R09). Vos solo aprobás. Cadencia:

| Cuándo | Qué se actualiza |
|---|---|
| Cada ciclo (HANDBACK) | `changelog-<usuario>`, `status.md` |
| Cada feature nueva | `features`, `contracts`, `testing` |
| Cuando cambia el rumbo | `spec`, `design`, `decisions` (con OK del que corresponda) |
| Mensual, o al retomar un proyecto dormido | Auditoría completa con `prompts/maintenance-prompt.md` (R19) |

Regla de oro: **nunca edites un MD del proyecto a mano en caliente** — pedíselo al agente, que lo hace por el workflow y queda registrado.

### B) El *núcleo* del SDD (master, compact, scenarios)

**No se toca por proyecto.** Ajustes personales → `custom.md`. Mejoras universales → una fila nueva en `scenarios.md` con el problema y tu adaptación (R20). Cuando salga una versión nueva del núcleo, reemplazás esos 3 archivos y tu `custom.md` sobrevive intacto.

### Por tipo de proyecto

- **Solo / chico:** modo LITE — actualizás `sdd-lite.md` al cerrar cada sesión.
- **Equipo mediano:** FULL — un curador consolida los archivos por usuario una vez por semana.
- **Enterprise:** FULL + capa `teams.md` (R21) — aprobaciones por rol, auditoría R19 mensual fija.
- **Monorepo:** FEDERADO — cada módulo tiene su cadencia propia; el raíz solo se toca cuando aparece un módulo nuevo.

---

## 5 · Errores comunes (y su antídoto)

1. **Pegarle el paquete entero a un subagente** → solo su slice del Protocolo de Lectura (§2 del master). Es el error #1 de gasto de tokens.
2. **Editar `SDD-MASTER.md` para un gusto personal** → eso va en `custom.md`; si tocás el núcleo, perdés las actualizaciones futuras.
3. **Dejar MDs viejos conviviendo con código nuevo** → la spec manda: la discrepancia se anota en `decisions.md` y se corrige en el ciclo siguiente.
4. **Usar FULL para un script de una tarde** → LITE existe para eso.
5. **Apagar R01 "para probar" y olvidarlo** → el HANDBACK siempre muestra la línea `Git:`; si dice "R01=OFF" y no era tu intención, prendela.
6. **Saltarse el cuestionario porque "ya sé lo que quiero"** → contestalo igual: es lo que evita que el agente adivine justo lo que no dijiste.

---

## 6 · Preguntas rápidas

**¿No sé nada de código, puedo igual?** Sí: en el arranque decí que sos NOVATO (o usá el combinador de la web, que lo pone solo). El agente activa pensar-por-tres (R23): planifica, se autocritica buscando qué puede salir mal, corrige, y recién ahí ejecuta — explicándote todo en lenguaje simple y de a un paso.
**¿Sirve sin IA?** Como documentación viva, sí — pero el diseño (ruteo, slices, HANDBACK) está pensado para agentes.
**¿Y si mi agente no lee archivos?** `SDD-COMPACT.md` pegado como primer mensaje (escenario S10).
**¿Puedo mezclar agentes (Claude + Cursor + Copilot)?** Sí: un solo núcleo y un espejo de una línea por herramienta (`models.md`, R22).
**¿Cuándo NO usar SDD?** Prototipado exploratorio, investigación, o cambios mecánicos de bajo riesgo. La regla práctica: escribí spec cuando una mala interpretación sea cara de revertir; si podés revisar el output completo en menos de 5 minutos, salteala (o usá LITE).
**¿Cómo lo adopto en un equipo grande?** Leé `teams.md`: roles, aprobaciones y ceremonias ya mapeadas.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.3 | 2026-08-15 | Primera guía: quick start, evaluación honesta de la curva, cadencias de actualización por tipo de proyecto, errores comunes. |
