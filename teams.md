# teams.md · Capa Enterprise: el SDD para equipos grandes

**Versión:** 0.3 · 2026-08-15 · **Para agentes:** leer solo si la Identidad (§3 del master) dice equipo grande o la R21 está activa. **Para humanos:** cómo escala el SDD de individual a empresa.

---

## 1 · Activación

En el start-prompt: `Equipo: enterprise` (o más de ~4 personas con roles diferenciados). El agente entonces activa R21, genera un `team.md` del proyecto (quién es quién, seniority, asignaciones) y — si hay más de un ambiente — `environments.md` (dev/staging/prod, quién deploya).

---

## 2 · Roles: qué lee, qué escribe, qué aprueba

La regla base no cambia: **cada persona (y su agente) escribe solo sus archivos**. Lo que se especializa es el slice de lectura y los OK.

| Rol | Lee (su slice) | Escribe (vía su agente) | Da el OK de… |
|---|---|---|---|
| **Product Owner** | `spec` · `status` · `features` | `spec`, prioridades en `status` | cambios de alcance y spec; features nuevas |
| **Analista Funcional** | `spec` · `features` · `glossary` | `features-<af>`, `glossary`, criterios de aceptación | el detalle funcional antes de diseñar |
| **Scrum Master** | `status` · changelogs · `scenarios` | `status` (sprint), impedimentos en `decisions` | el proceso (no aprueba código) |
| **Tech Lead / Dev Sr** | `design` · `diagram` · `contracts` · `testing` | `design`, `contracts`, `decisions` | diseño y contratos; merges a main |
| **Dev SSr / Jr** | `design` · `contracts-<suyo>` · `testing` · su feature | `contracts-<user>`, `features-<user>`, `changelog-<user>` | su propia rama (Jr: con revisión de un Sr) |
| **Pasante** | `GUIDE` · `spec` · su feature asignada | `changelog-<user>` | nada en solitario: todo con mentor |
| **QA** | `testing` · `features` (criterios) · `contracts` | `testing`, casos y cobertura, bugs como features | el "tests verdes" del DoD (R16) |
| **People Lead** | `team` · `onboarding` | `team.md` (altas/bajas, seniority, asignaciones) | accesos y asignaciones de personas |
| **Manager** | `status` · `costs` · `security` | — (lee, no escribe) | presupuesto, riesgos, releases MAJOR |
| **Equipo RPA** | contracts de sistemas · `environments` | inventario de bots como features | ventanas de ejecución de bots |
| **Equipo AWS / Infra** | `costs` · `security` · `environments` · `diagram` | `environments`, IaC referenciado en `design`, `costs` | deploys a prod; cambios de infraestructura |

---

## 3 · El "OK humano" en equipos (R21)

En un proyecto individual todos los OK son de la misma persona. En equipo, **el agente pide cada OK al rol correcto** (o lo deja dirigido en el HANDBACK: "esperando OK de QA"):

- OK de spec/alcance → **PO** · OK funcional → **AF** · OK de diseño/contratos → **Tech Lead** · OK de tests → **QA** · OK de deploy → **Infra** (+ **Manager** si mueve costos).

**Regla de seniority (autonomía escalonada):**

- **Pasantes y Jr:** su agente corre SIEMPRE en perfil ESTRICTO y tier económico/medio con ejecución literal (R03). Nada de auto-commit, nunca.
- **SSr:** ESTRICTO, pero su agente puede marcar `[MEJORA PROPUESTA]`.
- **Sr / Tech Lead:** puede usar CONFIANZA (`R01=OFF`) en su rama — jamás en main.

---

## 4 · Ceremonias Scrum ↔ SDD (sin duplicar trabajo)

Las ceremonias **no generan documentos nuevos**: leen los que el SDD ya produce.

| Ceremonia | Usa del SDD | Resultado |
|---|---|---|
| Sprint Planning | `spec` + `features` + `status` | `status.md` queda como sprint backlog con % |
| Daily | los HANDBACK de ayer de cada dev | el SM los lee: son el daily por escrito |
| Sprint Review | Definition of Done (R16) + changelogs | demo + bump MINOR/PATCH |
| Retro | `decisions.md` + `scenarios.md` | mejoras de proceso → filas nuevas en la matriz (R20) |

---

## 5 · Subagentes por rol (para el agente orquestador)

El patrón de orquestación es **Coordinador / Implementadores / Verificador**: el coordinador descompone la spec en sub-tareas paralelizables (elemento 5 del contrato de spec), varios implementadores trabajan en paralelo (idealmente en git worktrees aislados para no pisarse), y un verificador **independiente** chequea contra la spec antes de dar nada por terminado. La clave es el incentivo opuesto: el implementador quiere terminar, el verificador quiere encontrar fallas — esa tensión mejora la calidad. Tiering: la spec se escribe con tier ALTO (un error ahí se propaga a todo), se implementa con MEDIO, y la verificación puede correr en un modelo rápido con instrucciones de refutar.

Cada rol tiene su subagente espejo, con slice y tier fijos. **Un subagente jamás recibe el paquete completo (R11):** si necesita más contexto, vuelve al orquestador y lo pide.

| Subagente | Slice exacto | Tier | Tarea típica |
|---|---|---|---|
| `qa-agent` | `testing.md` + contracts del feature + diff | medio | generar/correr tests, reporte pass/fail |
| `review-agent` | diff + `design.md` + `contracts` | alto | pre-OK: encontrar problemas antes que el humano |
| `doc-agent` | `changelog-<user>` + `status` | económico | actualizar changelog y status tras cada ciclo |
| `infra-agent` | `costs` + `security` + `environments` | medio | auditorías R19, estimación de costos por ambiente |
| `af-agent` | `spec` + `features` + `glossary` | medio | detallar criterios de aceptación |
| `onboarding-agent` | `GUIDE` + `spec` + `team` | económico | responder preguntas de nuevos y pasantes sin interrumpir al equipo |

---

## 6 · Onboarding por rol (ruta de lectura)

Nadie lee todo: cada rol tiene su ruta y el `onboarding-agent` la acompaña.

- **Pasante / Jr:** día 1 → `GUIDE.md` + `spec.md`; día 2 → su feature asignada + primer ciclo HANDBACK junto a su mentor.
- **Dev nuevo:** lo anterior + `design.md` y los `contracts` de su módulo.
- **QA nuevo:** `testing.md` + `features` (criterios de aceptación).
- **PO / AF nuevo:** `spec` + `status` + `decisions.md` (el porqué de cada decisión ya tomada — evita re-abrir debates).

---

## 7 · Secciones especiales

### Equipo RPA

Cada bot es una **feature con contract propio**: sistema que toca (pantallas/APIs), horario y ventana de ejecución, política de reintentos, y qué pasa si el sistema destino cambia. **Credenciales jamás en `.env` plano:** vault del orquestador (extensión de R17). En `environments.md`: dónde corre cada bot (attended/unattended) y su calendario.

### Equipo AWS / Infraestructura

`environments.md` es suyo: ambientes, quién deploya, y el IaC (Terraform/CDK/CloudFormation) referenciado desde `design.md` — el estado de la infra vive en código, no en la memoria de nadie. `costs.md` también es suyo: en enterprise el free-tier no aplica; se estima **por ambiente** y el Manager lo aprueba. `security.md` suma lo básico de IAM: qué rol puede tocar qué.

---

## 8 · MDs adicionales que esta capa habilita

El agente los genera solo si aplican (no por default): `team.md` (quién es quién) · `environments.md` (ambientes y deploys) · `onboarding.md` (si el equipo rota mucho) · `incidents.md` (postmortems: qué pasó, causa raíz, acción correctiva — muy útil con RPA e infra) · `metrics.md` (velocidad del equipo + gasto de tokens por ciclo, para detectar derroche) · `api-catalog.md` (índice de APIs entre módulos, clave en modo FEDERADO).

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.3 | 2026-08-15 | Primera capa enterprise: 11 roles con RACI, OKs especializados por rol, autonomía escalonada por seniority, ceremonias Scrum mapeadas, 6 subagentes por rol, rutas de onboarding y secciones RPA/infra. |
