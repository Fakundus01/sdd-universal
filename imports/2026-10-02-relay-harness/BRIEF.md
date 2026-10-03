# BRIEF: integrar Relay (arnés + orquestación) en SDD Universal

> Viene de un chat de trabajo en `chat-commerce-ai` (2026-10-02), donde Relay se usó en producción durante varias
> features (H-1 a H-11). Formato de `prompts/from-another-chat.md`. Las decisiones tomadas no se re-preguntan; el
> cuestionario socrático (R04) se usa solo para lo que queda en "Pendientes".

## Proyecto
Extender SDD Universal con una capa de **ejecución verificable**: SDD + TDD + loop cerrado + ingeniería de arneses +
orquestación multi-agente. Tiene que ser universal, cargable en cualquier proyecto y en cualquier stack.

## Problema que resuelve
Hoy SDD Universal gobierna *qué* se construye (spec antes que código, MDs como memoria, R01–R28, loop con HANDBACK),
pero **no garantiza que lo que el agente dice que hizo sea cierto**. En la práctica, los agentes:
- declaran "listo" sin evidencia ejecutable;
- se autoaprueban;
- pierden el estado al cortarse el contexto;
- hacen workarounds silenciosos;
- dejan pasar drift entre la spec, el código y la producción.

Relay resolvió eso en un proyecto real con un arnés (scripts, hooks y checks) y roles separados.

## Decisiones ya tomadas (definitivas)
1. **Roles del orquestador:** `leader`, `implementer`, `reviewer`, `analytic`, `infra-implementer`, `looper`, `prompter`.
   Ver la tabla de abajo.
2. **Universal:** nada atado a un stack. Lo específico del proyecto (comandos de test, lint, deploy) se declara en
   un archivo de configuración del proyecto, nunca en el núcleo.
3. **Se integra a SDD Universal, no lo reemplaza.** El núcleo (`SDD-MASTER.md`, R01–R28) sigue siendo la fuente;
   esto entra como reglas nuevas (R29+) y/o una capa como `teams.md` (por ejemplo `harness.md` u `orchestration.md`),
   con toggles como el resto.
4. **TDD explícito:** rojo → verde → refactor. Además, **"rojo forzado medido"**: todo guard o check nuevo se prueba
   rompiéndolo a propósito y pegando la salida que lo demuestra. Fue la práctica que más bugs de los propios checks
   atrapó.
5. **Loop cerrado:** ningún cambio es `done` sin evidencia ejecutable (comando + salida literal + hash del commit), y
   sin un reviewer independiente que re-ejecute la verificación.

## Roles propuestos (partiendo de lo que funcionó en Relay)
| Rol | Hace | No hace | En Relay existía como |
|---|---|---|---|
| `leader` | Descompone, arma la tarjeta de tarea, elige modelo y esfuerzo, despacha, verifica, decide cuándo escalar al humano | Editar código de producto | orquestador (sesión principal) |
| `implementer` | Implementa UNA tarjeta con TDD, se autoverifica y escribe el handback | Autoaprobarse, salir de su zona de archivos | `implementer` + especialistas por dominio |
| `reviewer` | Aprueba o rechaza contra la tarjeta, las convenciones y los checkpoints; re-ejecuta la verificación y busca los casos borde | Editar código | `reviewer` (con un modelo fuerte) |
| `analytic` | Investiga antes de implementar: lee código, datos o logs y diagnostica; responde preguntas acotadas en un archivo | Implementar | subagentes `Explore` + diagnósticos (consultas a prod de solo lectura, logs) |
| `infra-implementer` | CI/CD, deploy, migraciones, servicios externos; sigue el RUNBOOK; separa lectura de escritura | Escribir en producción o mergear a la rama de prod sin OK humano explícito | nuevo (lo hacía el leader a mano: Railway, Supabase, GitHub) |
| `looper` | Corre el loop cerrado: lanza verificación/E2E, lee el resultado, re-despacha al implementer ante un fallo, hasta verde o hasta el límite de iteraciones | Cambiar la aceptación para que pase | nuevo (lo hacía el leader: E2E → falla → arreglo → re-corrida) |
| `prompter` | Escribe y mejora tarjetas, prompts de agentes y reglas del arnés a partir de las fallas (equivale a `/harness-fix`) | Cambiar requisitos | skill `/harness-fix` |
| (`spec-keeper`) | Único escritor de la spec y del estado de features | Cambiar requisitos o decisiones | `spec-keeper`: **decidir si queda como rol o lo absorbe el leader** |

## Lo que se reusa de Relay (fuente: `Fakundus01/chat-commerce-ai`, rama `dev`)
Leer y destilar a algo agnóstico de stack:
- **Orquestación:**
  - `docs/relay/README.md`, `orchestrator.md` y `model-routing.md`;
  - `docs/relay/templates/task-card.md` y `handback.md`;
  - `.claude/agents/implementer.md`, `reviewer.md` y `spec-keeper.md`.
- **Arnés:**
  - `init.sh` (niveles `--quick` / `--changed` / completo);
  - `scripts/harness/check_harness.py`: rutas citadas que no existen, handback sin commitear, `feature_list` sin
    aceptación, TABs;
  - `scripts/harness/hooks.py` + `.claude/settings.json`, con los hooks:
    - SessionStart: muestra el estado;
    - UserPromptSubmit: guardia de contexto con base y umbral;
    - PostToolUse: lint del archivo editado;
    - Stop: `init.sh --quick`;
  - `test_hooks.py`.
- **Memoria en disco:**
  - `progress/<rama>/current.md` con su plantilla;
  - skill `/relevo` (relevo de contexto antes de `/clear`);
  - `feature_list.json` como cola, con aceptación y evidencia.
- **Calidad:** `CHECKPOINTS.md`, `docs/verification.md` (qué cuenta como evidencia) y `docs/conventions.md`.

## Lecciones del uso real (meterlas como reglas o checks)
1. **Evidencia = comando + salida literal + hash.** "Pasó" sin pegar la salida no cuenta, y la cuenta de tests se
   explica contra una base medida (con hash).
2. **El reviewer encuentra lo que el implementer no ve:** claves de allowlist que colisionan, copias "congeladas"
   tomadas del commit equivocado, índices duplicados en una migración. Hay que revisar siempre, aunque el cambio
   "sea trivial".
3. **Los checks también se rompen:** un check que nunca vio un rojo no se sabe si funciona. Rojo forzado obligatorio.
4. **Drift silencioso:** el E2E nunca había corrido (el workflow vivía en una rama que no era la por defecto), y el
   esquema que dejan las migraciones no coincidía con los modelos. Hacen falta checks que comparen la fuente contra lo
   que corre de verdad: `compare_metadata`, E2E a demanda, consultas de solo lectura a producción.
5. **Antes de desplegar, mirar los datos de producción, no solo el código.** Un deploy iba a bloquear 14 suscripciones
   por un cambio de lógica de negocio, y un análisis de solo lectura lo atrapó antes.
6. **Infra es un rol aparte, con permisos aparte.** El clasificador de permisos bloquea, con razón, los merges sin
   review y las escrituras en producción. El diseño tiene que contemplarlo: review antes del merge, y la escritura en
   producción la ejecuta el humano o se aprueba explícitamente.
7. **Ramas:** `main` = producción y `dev` = integración; las ramas salen de `dev`, y `dev → main` es el deploy que
   aprueba el humano.
8. **Capacidad de infraestructura:** una DB en el tier más chico se colgó por memoria al reactivar los jobs
   periódicos. Un checklist de go-live con mínimos de capacidad y monitoreo de memoria y conexiones habría alertado.
9. **Anti teléfono descompuesto:** los subagentes escriben su resultado en un archivo y devuelven solo
   `done -> <ruta>` / `blocked -> <ruta>`.
10. **Una feature por agente, worktree por feature y zona de archivos explícita.** Los subagentes no pueden lanzar
    otros subagentes, así que el leader es siempre la sesión principal.

## Pendientes / dudas abiertas (para R04)
- **Forma de empaquetarlo:**
  - ¿plugin de Claude Code (agentes + skills + hooks)?
  - ¿un `npx`/script que copia el scaffold?
  - ¿solo MDs, como hoy SDD Universal?
  - ¿o las tres cosas?
- **Multi-herramienta:** cómo se ve el arnés en Codex, Cursor o Copilot, que no tienen los mismos hooks ni subagentes
  (R22, espejos).
- **Archivo de configuración del proyecto:** formato y nombre, por ejemplo `harness.config.json` con `test`, `lint`,
  `e2e`, `deploy`, `prod_readonly_query`.
- **Numeración:** R29+ en el núcleo o capa separada (`harness.md`), y qué toggles van ON por defecto en modo NOVATO.
- **Límites del `looper`:** iteraciones máximas, y cuándo escala al humano.
- **`spec-keeper`:** rol propio o responsabilidad del `leader`.
- **Web del catálogo:** cómo se muestra en el combinador y en las "skills para Claude" que ya existen.
